/*
 * A headless pass over the rover: drive the real game in Chrome, walk to the
 * outpost, send the rover out on a work order, and check that it comes back
 * with a document on the desk.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-rover.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * The rover used to be a floating button with its own clock: you clicked it,
 * waited fifteen seconds, and read a fact. It is now part of the run — sent
 * out by a work order like any other, moving on sol time — so what this
 * checks is that the find arrives as a document and that answering it works.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9225',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '\\rover-chrome-profile-2',
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
      target = (await (await fetch('http://localhost:9225/json')).json()).find((t) => t.type === 'page');
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
    input.value = 'Rover Tester';
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
  await sleep(600);

  // 2. There is no floating rover button any more: the rover is a work order.
  note('the rover is not a floating button', (await evaluate(`!!document.querySelector('.rover__fab')`)) === false);

  await clickIn('base', 'Land & start sol 1');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(900);

  // 3. Send the rover out on the exploring order. It is offered on some sols
  //    and not others, so the check plays on until it comes up.
  let sent = 'missing';

  for (let sol = 0; sol < 5 && sent !== 'clicked'; sol += 1) {
    const crisis = await evaluate(`!!document.querySelector('#act .gl__choices')`);

    if (crisis) {
      await evaluate(`(() => { const c = document.querySelector('#act .gl__choice'); if (c) c.click(); })()`);
      await sleep(900);
      continue;
    }

    sent = await evaluate(`(() => {
      const order = [...document.querySelectorAll('#act .act-order')]
        .find((n) => (n.querySelector('.act-order__title')?.textContent ?? '').toLowerCase().includes('rover'));
      if (!order) return 'missing';
      order.click();
      return 'clicked';
    })()`);

    if (sent !== 'clicked') {
      /* Another order today: stamp something else and run the sol on. */
      await evaluate(`(() => { const b = document.querySelector('#act .act-order:not([disabled])'); if (b) b.click(); })()`);
      await sleep(350);
      await clickIn('act', 'Run sol');
      await sleep(1100);
    }
  }

  note('the exploring order can be stamped', sent === 'clicked', sent);

  if (sent === 'clicked') {
    await clickIn('act', 'Run sol');
    await sleep(1300);
  }

  // 4. The find is on the desk.
  const find = await evaluate(`(() => {
    const card = document.querySelector('#act .act-find');
    if (!card) return null;
    const image = card.querySelector('.act-find__image');
    return {
      title: card.querySelector('.act-find__title')?.textContent ?? '',
      kicker: card.querySelector('.act-find__kicker')?.textContent ?? '',
      answers: [...card.querySelectorAll('.act-find__answer')].map((n) => n.textContent.trim()),
      imageOk: !!image && image.complete && image.naturalWidth > 0,
      src: image ? (image.currentSrc || image.src) : '',
    };
  })()`);

  note('the rover comes back with a document', find !== null, find?.title ?? 'no document');
  note('the document has a NASA picture', find?.imageOk === true, (find?.src ?? '').split('?')[0].split('/').pop());
  note(
    'and the player can answer it',
    (find?.answers ?? []).length > 0,
    (find?.answers ?? []).join(' | '),
  );

  // 5. Answering it clears the document and pays the science.
  const scienceBefore = await evaluate(`(() => {
    const signal = [...document.querySelectorAll('#act .gl__signal')]
      .find((s) => s.querySelector('.gl__signal-kicker')?.textContent === 'Science');
    return signal?.querySelector('.gl__signal-text')?.textContent ?? '';
  })()`);

  await evaluate(`(() => { const b = document.querySelector('#act .act-find__answer'); if (b) b.click(); })()`);
  await sleep(900);

  const after = await evaluate(`(() => ({
    stillThere: !!document.querySelector('#act .act-find'),
    science: (() => {
      const signal = [...document.querySelectorAll('#act .gl__signal')]
        .find((s) => s.querySelector('.gl__signal-kicker')?.textContent === 'Science');
      return signal?.querySelector('.gl__signal-text')?.textContent ?? '';
    })(),
  }))()`);

  note('answering the find clears the document', after.stillThere === false);
  note('and the science goes up', after.science !== scienceBefore, `${scienceBefore} then ${after.science}`);

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
