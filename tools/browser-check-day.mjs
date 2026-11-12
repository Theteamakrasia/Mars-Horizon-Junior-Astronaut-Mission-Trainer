/*
 * A headless pass over the mission-day tracker.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-day.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * What it checks:
 *
 *   - the tracker is in the header of every screen with a run in play, and it
 *     is NOT in the header of the screens that have no run;
 *   - it reads the right day on the build screen, and the day moves on when a
 *     sol is run;
 *   - the twelve pips say which days are done, which is the day in play, and
 *     which are still to come;
 *   - it is there for ALL FIVE landing regions - the tracker lives in the
 *     shared chrome, so it has to be the same for every one of them;
 *   - the plain "Sol N of 12" text in the mission bar is still there. The
 *     player chose to keep it, so a check pins that decision.
 */

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { doTheTraining } from './training-driver.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/* A clean profile, so the check always starts from a clean day: Chrome
   restores the last session in a profile it has used before, and that
   restored page still holds the run of the last session in memory. */
rmSync(process.env.TEMP + '\\day-chrome-profile', { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,1000',
  '--user-data-dir=' + process.env.TEMP + '\\day-chrome-profile',
  'about:blank',
], { stdio: 'ignore' });

let socket;
let nextId = 1;
const pending = new Map();
const consoleErrors = [];

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(expression, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    if (await evaluate(expression)) return true;
    await sleep(250);
  }
  return false;
}

async function clickIn(screenId, text) {
  const clicked = await evaluate(`(() => {
    const screen = document.getElementById(${JSON.stringify(screenId)});
    if (!screen || screen.hidden) return 'hidden';
    const el = [...screen.querySelectorAll('button')]
      .find((n) => n.textContent.trim().includes(${JSON.stringify(text)}) && !n.disabled);
    if (!el) return 'missing';
    el.click();
    return 'clicked';
  })()`);
  await sleep(700);
  return clicked;
}

/** What the header's day tracker is saying, right now. */
async function trackerIn(screenId) {
  return await evaluate(`(() => {
    const screen = document.getElementById(${JSON.stringify(screenId)});
    if (!screen) return null;
    const tracker = screen.querySelector('.gl__day');
    if (!tracker) return { present: false };
    return {
      present: true,
      word: tracker.querySelector('.gl__day-word')?.textContent ?? '',
      number: tracker.querySelector('.gl__day-number')?.textContent ?? '',
      total: tracker.querySelector('.gl__day-total')?.textContent ?? '',
      spoken: tracker.querySelector('.gl__sr-only')?.textContent ?? '',
      pips: [...tracker.querySelectorAll('.gl__day-pip')].map((p) => p.dataset.state),
    };
  })()`);
}

const results = [];
function note(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const REGIONS = ['arcadia', 'jezero', 'olympus', 'valles', 'argyre'];

try {
  let target = null;
  for (let i = 0; i < 40 && target === null; i += 1) {
    await sleep(250);
    try {
      target = (await (await fetch('http://localhost:9226/json')).json()).find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (target === null) throw new Error('Chrome never opened its debugging port');

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/#naming` });
  await waitFor(`!!document.getElementById('naming') && !document.getElementById('naming').hidden`);

  // 1. Name the astronaut, so there is a run to put a day tracker on.
  await evaluate(`(() => {
    const input = document.querySelector('[data-naming-input]');
    const submit = document.querySelector('[data-naming-submit]');
    if (!input || !submit) return;
    input.value = 'Astronaut';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);
  await clickIn('naming', 'Start Mission');

  // 2. The five landing regions. Each one must show the same tracker.
  for (const region of REGIONS) {
    await evaluate(`location.hash = '#landing-site'`);
    await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
    await sleep(500);

    await evaluate(`(() => {
      const pin = document.querySelector('[data-landing-pin=${JSON.stringify(region)}]');
      if (pin) pin.click();
    })()`);
    await sleep(500);

    const landed = await clickIn('landing-site', 'Land here');
    await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`);
    await sleep(700);

    const tracker = await trackerIn('base');

    note(
      `the day tracker is in the header at ${region}`,
      tracker?.present === true && landed === 'clicked',
      tracker?.present === true ? `day ${tracker.number}` : 'no tracker',
    );
    note(
      `the tracker at ${region} reads day 1 of 12 days`,
      tracker?.word === 'Day' && tracker?.number === '1' && tracker?.total === 'of 12 days',
      `${tracker?.word} ${tracker?.number} ${tracker?.total}`,
    );
    note(
      `the tracker at ${region} has twelve pips and the first is the day in play`,
      tracker?.pips?.length === 12 && tracker.pips[0] === 'current' && tracker.pips.slice(1).every((s) => s === 'upcoming'),
      (tracker?.pips ?? []).join(','),
    );
    note(
      `the tracker at ${region} says in words how many days are done`,
      tracker?.spoken === '0 days complete.',
      tracker?.spoken ?? '',
    );
  }

  // 3. The day moves on when a sol is run.
  await clickIn('base', 'Land & start sol 1');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(1200);

  const before = await trackerIn('act');
  note('the tracker on the desk reads day 1', before?.number === '1', before?.number ?? '');

  /* Today's work orders are locked until the crew has done two training games
     (D-075), so the check trains first - and the training is played for real,
     in the one place that knows how. */
  const training = await doTheTraining(evaluate, sleep, async (name) => {
    await evaluate(`(() => { const b = document.querySelector('#act .act-tile[data-tile="orders"]'); if (b) b.click(); })()`);
    await sleep(500);
    await evaluate(`(() => { const b = [...document.querySelectorAll('#act .trn__card')].find((c) => c.querySelector('.trn__card-name')?.textContent === ${JSON.stringify(name)}); if (b) b.querySelector('.trn__play').click(); })()`);
    await sleep(700);

    return evaluate(`!!document.querySelector('#act .trn__backdrop')`);
  });

  note('the crew trains, so the work orders open', training?.cargo === true && training?.asteroid === true, `${training?.cargo}, ${training?.asteroid}`);

  /* Run a sol. The orders live in the sheet behind their button, and a crisis
     can replace the desk, so the check opens the orders, picks one, and then
     presses the button either way. */
  await evaluate(`(() => { const b = document.querySelector('#act .act-tile[data-tile="tasks"]'); if (b) b.click(); })()`);
  await sleep(600);
  await evaluate(`(() => {
    const order = document.querySelector('#act .act-order:not([disabled])');
    if (order) { order.click(); return; }
    const choice = document.querySelector('#act .gl__choice');
    if (choice) choice.click();
  })()`);
  await sleep(600);
  await evaluate(`(() => { const b = document.querySelector('#act .sheet__done'); if (b) b.click(); })()`);
  await sleep(400);
  await clickIn('act', 'Run sol');
  await sleep(1500);

  const after = await trackerIn('act');
  note('the tracker moves on to day 2', after?.number === '2', after?.number ?? '');
  note(
    'the pip for the day just flown is done, and day 2 is the day in play',
    after?.pips?.[0] === 'done' && after?.pips?.[1] === 'current',
    (after?.pips ?? []).slice(0, 3).join(','),
  );
  note('the tracker says one day is complete', after?.spoken === '1 day complete.', after?.spoken ?? '');

  // 4. The sol count is still on the screen - in the panel's own kicker now,
  //    because the mission bar it used to live in was removed in D-070.
  const kicker = await evaluate(`(() => {
    const panel = document.querySelector('#act .gl__panel .gl__kicker');
    return panel?.textContent ?? '';
  })()`);
  note('the plain sol count is still on the desk', kicker.trim().startsWith('Sol 2'), kicker);

  // 5. The screens with no run in play keep their header as it was.
  const onMap = await evaluate(`(() => {
    location.hash = '#landing-site';
    return true;
  })()`);
  await sleep(900);
  const mapTracker = await trackerIn('landing-site');
  note('the landing-site map has no day tracker', mapTracker?.present === false, mapTracker?.present === true ? 'it has one' : '');

  await evaluate(`location.hash = '#encyclopedia'`);
  await sleep(900);
  const encyclopediaTracker = await trackerIn('encyclopedia');
  note('the encyclopedia has no day tracker', encyclopediaTracker?.present === false, encyclopediaTracker?.present === true ? 'it has one' : '');

  note('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} catch (error) {
  console.error('the browser pass failed:', error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
}
