/*
 * A headless pass over the rover: drive the real game in Chrome, walk the
 * journey to the outpost, deploy the rover, and check that the NASA picture
 * actually loads.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-rover.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  '--user-data-dir=' + process.env.TEMP + '\\rover-chrome-profile',
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

/** Click a button inside a screen, by the words on it. Returns false if there was none. */
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

/** Click a button anywhere on the page, by the words on it. */
async function clickAny(text) {
  const clicked = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button')]
      .find((n) => n.offsetParent !== null && n.textContent.trim().includes(${JSON.stringify(text)}) && !n.disabled);
    if (!el) return 'missing';
    el.click();
    return 'clicked';
  })()`);
  await sleep(650);
  return clicked;
}

async function waitFor(expression, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    if (await evaluate(expression)) return true;
    await sleep(250);
  }
  return false;
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
      target = (await (await fetch('http://localhost:9222/json')).json()).find((t) => t.type === 'page');
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

  // 1. Name the astronaut. The naming screen only listens once it is mounted,
  //    so the value is set again until the button wakes up.
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

  // 2. On to the outpost. The hash router is used to skip the launch reel,
  //    which is a film and takes its own time; the run already exists by now.
  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
  await evaluate(`(() => {
    const pin = document.querySelector('#landing-site .landing-site__pin');
    if (pin) pin.click();
  })()`);
  await sleep(600);
  await clickIn('landing-site', 'Land here');

  note(
    'the rover button is on the outpost screen',
    await waitFor(`!!document.querySelector('#base .rover__fab')`, 40),
  );
  note(
    'the rover starts at base',
    (await evaluate(`document.querySelector('.rover__status')?.textContent ?? ''`)) === 'Rover',
  );

  // 3. Deploy it.
  await evaluate(`document.querySelector('.rover__fab').click()`);
  await sleep(500);
  note('the deploy question opens', await waitFor(`!!document.querySelector('.rover__window--small')`));
  await clickAny('Deploy rover');
  await sleep(600);
  note(
    'the rover is exploring',
    (await evaluate(`document.querySelector('.rover__status')?.textContent ?? ''`)) === 'Exploring',
  );

  // 4. Wait for the first find (15-25 s) and open it.
  note('the rover finds something', await waitFor(`document.querySelector('.rover')?.dataset.waiting === 'true'`, 160));
  await evaluate(`document.querySelector('.rover__fab').click()`);
  await sleep(900);
  note('the find window opens', await waitFor(`!!document.querySelector('.rover__window--large')`));

  // 5. The picture is a real NASA picture, not the placeholder.
  await waitFor(`(() => {
    const img = document.querySelector('.rover__photo');
    return !img || (img.complete && img.naturalWidth > 0);
  })()`, 60);
  const picture = await evaluate(`(() => {
    const img = document.querySelector('.rover__photo');
    if (!img) return { found: false };
    return {
      found: true,
      width: img.naturalWidth,
      height: img.naturalHeight,
      src: img.currentSrc || img.src,
      placeholder: !!document.querySelector('.rover__figure--empty'),
    };
  })()`);
  note(
    'the NASA picture loads',
    picture.found && picture.width > 0 && !picture.placeholder,
    picture.found ? `${picture.width}x${picture.height} ${picture.src.split('?')[0].split('/').pop()}` : 'no picture element',
  );

  // 6. Answer the find.
  await clickAny('Got it, save to my log');
  await sleep(700);
  note(
    'the find is answered',
    (await evaluate(`document.querySelector('.rover__status')?.textContent ?? ''`)) !== 'Found something!',
  );

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
