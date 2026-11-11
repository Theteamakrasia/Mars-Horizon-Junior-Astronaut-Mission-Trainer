/*
 * A headless pass over the build screen: drive the real game in Chrome, walk
 * to the outpost, and check that the screen actually answers the questions a
 * player asks of it.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-build.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * What it checks is the set of things that were wrong for a long time and
 * were not caught: a card that counted the wrong thing, a button that went
 * dead without saying why, a click that did nothing, a number that never
 * moved, and a recap that was below the fold.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '\\build-chrome-profile',
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
  await sleep(650);
  return clicked;
}

const results = [];
function note(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

try {
  let target = null;
  for (let i = 0; i < 40 && target === null; i += 1) {
    await sleep(250);
    try {
      target = (await (await fetch('http://localhost:9224/json')).json()).find((t) => t.type === 'page');
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
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/#naming` });
  await waitFor(`!!document.getElementById('naming') && !document.getElementById('naming').hidden`);

  // 1. Name the astronaut and get to the outpost.
  const named = await waitFor(`(() => {
    const input = document.querySelector('[data-naming-input]');
    const submit = document.querySelector('[data-naming-submit]');
    if (!input || !submit) return false;
    input.value = 'Builder';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return !submit.disabled;
  })()`, 40);
  note('the name is accepted', named);
  await clickIn('naming', 'Start Mission');

  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
  await evaluate(`(() => {
    const pin = document.querySelector('#landing-site .landing-site__pin');
    if (pin) pin.click();
  })()`);
  await sleep(600);
  await clickIn('landing-site', 'Land here');
  await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`);
  await sleep(900);

  // 2. Every card shows its count and its limit.
  const counts = await evaluate(`(() => {
    return [...document.querySelectorAll('#base .gl__card')].map((card) => {
      const name = card.querySelector('.gl__card-name')?.textContent ?? '';
      const count = card.querySelector('.gl__count')?.textContent ?? '';
      return name + ' = ' + count;
    });
  })()`);
  note(
    'every card shows a count and a limit',
    counts.length > 0 && counts.every((entry) => /\d+\/\d+/.test(entry)),
    counts.join(', '),
  );

  // 3. The day-power card, before anything is built.
  const dayPowerBefore = await evaluate(`(() => {
    const stat = [...document.querySelectorAll('#base .gl__stat')]
      .find((s) => s.querySelector('.gl__stat-label')?.textContent === 'Day power');
    return stat?.querySelector('.gl__stat-value')?.textContent ?? '';
  })()`);

  // 4. Add three solar arrays: the limit is three, because the lander brings one.
  await evaluate(`(() => {
    const card = [...document.querySelectorAll('#base .gl__card')]
      .find((c) => (c.querySelector('.gl__card-name')?.textContent ?? '') === 'Solar Array');
    const add = card?.querySelector('.gl__step--add');
    if (!add) return false;
    add.click();
    return true;
  })()`);
  await sleep(400);
  await evaluate(`(() => {
    const card = [...document.querySelectorAll('#base .gl__card')]
      .find((c) => (c.querySelector('.gl__card-name')?.textContent ?? '') === 'Solar Array');
    const add = card?.querySelector('.gl__step--add');
    if (!add) return false;
    add.click();
    return true;
  })()`);
  await sleep(400);
  await evaluate(`(() => {
    const card = [...document.querySelectorAll('#base .gl__card')]
      .find((c) => (c.querySelector('.gl__card-name')?.textContent ?? '') === 'Solar Array');
    const add = card?.querySelector('.gl__step--add');
    if (!add) return false;
    add.click();
    return true;
  })()`);
  await sleep(500);

  const solar = await evaluate(`(() => {
    const card = [...document.querySelectorAll('#base .gl__card')]
      .find((c) => (c.querySelector('.gl__card-name')?.textContent ?? '') === 'Solar Array');
    if (!card) return null;
    const add = card.querySelector('.gl__step--add');
    return {
      count: card.querySelector('.gl__count')?.textContent ?? '',
      addDisabled: add ? add.disabled : null,
      why: card.querySelector('.gl__card-why')?.textContent ?? '',
      max: card.querySelector('.gl__card-max')?.textContent ?? '',
    };
  })()`);

  note('the solar card reads 3/3', solar?.count.replace(/\s+/g, '') === '3/3', solar?.count ?? 'no card');
  note('the add button is dead at the limit', solar?.addDisabled === true);
  note('the card says why the button is dead', (solar?.why ?? '').length > 0, solar?.why ?? '');
  note('the card is marked as at its limit', solar?.max === 'MAX');

  // 5. The click was announced, and a number moved.
  const toast = await evaluate(`document.querySelector('#base .gl__toast')?.textContent ?? ''`);
  note('the screen says what was just built', toast.includes('Solar Array'), toast);

  const dayPowerAfter = await evaluate(`(() => {
    const stat = [...document.querySelectorAll('#base .gl__stat')]
      .find((s) => s.querySelector('.gl__stat-label')?.textContent === 'Day power');
    return stat?.querySelector('.gl__stat-value')?.textContent ?? '';
  })()`);
  note(
    'the day power moved when the panels went in',
    dayPowerBefore !== dayPowerAfter,
    `${dayPowerBefore} then ${dayPowerAfter}`,
  );

  // 6. The build screen says what the build is for.
  const goals = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('#base .gl__goal')];
    return {
      count: rows.length,
      missing: rows.filter((r) => r.dataset.ok === 'false').map((r) => r.textContent.trim()),
    };
  })()`);
  note('the build screen plans for five goals', goals.count === 5, `${goals.count} goals`);
  note(
    'and says what is missing',
    goals.missing.length > 0 && goals.missing.every((text) => text.length > 3),
    goals.missing.join(' | '),
  );

  // 7. The guide. It opens by itself the first time the player reaches the
  //    build screen, and the button in the mission bar brings it back.
  const guide = await evaluate(`(() => {
    const panel = document.querySelector('#base .gl__guide');
    return {
      open: !!panel,
      steps: panel ? panel.querySelectorAll('.gl__guide-step').length : 0,
      button: !!document.querySelector('#base .gl__guide-button'),
    };
  })()`);

  note('the guide is open on the first build screen', guide.open === true);
  note('and it has steps in it', guide.steps >= 8, `${guide.steps} steps`);
  note('the mission bar has a button to bring it back', guide.button === true);

  await evaluate(`(() => { const b = document.querySelector('#base .gl__guide-close'); if (b) b.click(); })()`);
  await sleep(400);
  note('and it can be closed', (await evaluate(`!document.querySelector('#base .gl__guide')`)) === true);

  await evaluate(`(() => { const b = document.querySelector('#base .gl__guide-button'); if (b) b.click(); })()`);
  await sleep(400);
  note('and opened again', (await evaluate(`!!document.querySelector('#base .gl__guide')`)) === true);

  // 7. The desk: the work orders and the standing orders.
  await clickIn('base', 'Land & start sol 1');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(1200);

  const desk = await evaluate(`(() => {
    const body = document.querySelector('#act .gl__scroll');
    if (!body) return null;
    return {
      orders: document.querySelectorAll('#act .act-order').length,
      checks: document.querySelectorAll('#act .act-check').length,
      board: document.querySelectorAll('#act .act-board__row').length,
      fresh: document.querySelectorAll('#act .act-board__row[data-new="true"]').length,
      mission: document.querySelector('#act .gl__mission-job')?.textContent ?? '',
    };
  })()`);

  note('there are three work orders on the desk', desk?.orders === 3, `${desk?.orders} orders`);
  note('every work order carries two checks', desk?.checks === 6, `${desk?.checks} checks`);
  note('the standing orders are on the board', (desk?.board ?? 0) > 0, `${desk?.board} orders`);
  note("and today's are marked new", desk?.fresh === 2, `${desk?.fresh} new`);
  note(
    'the mission bar says what the player is playing',
    (desk?.mission ?? '').includes('survive'),
    desk?.mission ?? '',
  );

  // 8. Run a sol, and check the recap comes first on the next screen.
  await evaluate(`(() => { const b = document.querySelector('#act .act-order:not([disabled])'); if (b) b.click(); })()`);
  await sleep(500);
  await clickIn('act', 'Run sol');
  await sleep(1400);

  /* A crisis replaces the orders on the next sol, so the check asks for the
     desk only when the desk is actually there. */
  const crisis = await evaluate(`!!document.querySelector('#act .gl__choices')`);
  note('the sol ran', crisis || (await evaluate(`!!document.querySelector('#act .act-order')`)));

  if (!crisis) {
    const after = await evaluate(`(() => {
      const body = document.querySelector('#act .gl__scroll');
      if (!body) return null;
      const first = body.querySelector('.gl__label');
      return { first: first?.textContent ?? '' };
    })()`);

    note('the recap is the first thing on the act panel', (after?.first ?? '').includes('in review'), after?.first ?? '');
  }

  // 9. The tool on the order: work it, and the stars are the reward.
  const opened = await evaluate(`(() => {
    const b = document.querySelector('#act .insp__open');
    if (!b) return 'missing';
    b.click();
    return 'clicked';
  })()`);
  note('an order can be worked with a tool', opened === 'clicked', opened);

  if (opened === 'clicked') {
    await sleep(500);

    const steps = await evaluate(`[...document.querySelectorAll('#act .insp__step')].map((n) => n.textContent)`);

    for (const step of steps) {
      await evaluate(`(() => { const b = [...document.querySelectorAll('#act .insp__step')].find((n) => n.textContent === ${JSON.stringify(step)}); if (b) b.click(); })()`);
      await sleep(150);
    }

    await evaluate(`(() => { const b = document.querySelector('#act .insp__finish'); if (b) b.click(); })()`);
    await sleep(700);

    const stars = await evaluate(`document.querySelector('#act .insp__result')?.textContent ?? ''`);

    note('working the tool shows the stars', stars.includes('★'), stars);
  }

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
