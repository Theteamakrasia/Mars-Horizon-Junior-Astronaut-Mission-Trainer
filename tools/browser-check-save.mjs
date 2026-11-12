/*
 * A headless pass over the save: does a closed tab really come back?
 *
 *   npm run dev            (or: npm run build && npm run preview)
 *   node tools/browser-check-save.mjs
 *
 * It needs a served game and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser, and the save format itself is
 * covered there by `src/sim/save.test.ts` and `src/ui/save.test.ts`. What
 * only a browser can prove is that storage really is written and really is
 * read again on the next visit.
 *
 * The pass plays a short game on purpose. The save is written on every mount,
 * so a name and a walk to the outpost is the whole of it - no sols are run,
 * and the training record is cleared so a leftover from an earlier pass
 * cannot hide the lock (the run itself is what this check is about).
 */

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SAVE_KEY = 'mars-horizon.save.v1';
const TRAINING_KEY = 'marsHorizon.training.v1';

/* A clean profile, so the pass always starts with nothing saved. A profile
   left over from an earlier run is not fatal - the pass clears the storage
   itself - so a locked directory is ignored rather than fatal. */
try {
  rmSync(process.env.TEMP + '\\save-chrome-profile', { recursive: true, force: true });
} catch {
  /* Chrome has not let go of it yet. */
}

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9253',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '\\save-chrome-profile',
  'about:blank',
], { stdio: 'ignore' });

let socket;
let nextId = 1;
const pending = new Map();
const consoleErrors = [];
let pageLoaded = false;

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

/** What is in the save key, parsed, or null when it is not there. */
const readKey = () => evaluate(`(() => {
  try {
    const raw = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return { version: parsed.version, screen: parsed.screen, name: parsed.run?.astronautName ?? null, sol: parsed.run?.sol ?? null };
  } catch (e) {
    return { unreadable: true };
  }
})()`);

/** What the menu is showing: the name it greeted, the note, and which half. */
const menu = () => evaluate(`(() => {
  const resume = document.querySelector('[data-naming-resume]');
  const form = document.querySelector('[data-naming-form]');
  return {
    greeting: document.querySelector('[data-naming-greeting]')?.textContent ?? '',
    note: document.querySelector('[data-naming-resume-note]')?.textContent ?? '',
    resume: !!resume && !resume.hidden,
    form: !!form && !form.hidden,
  };
})()`);

/** Which routed screen is on show. */
const where = () => evaluate(`(() => {
  const ids = ['naming','briefing','supply','launch','interior','landing-site','base','act','debrief'];
  const on = ids.find((i) => { const e = document.getElementById(i); return e && !e.hidden; });
  return on ?? 'none';
})()`);

/** The state of the desk, when it is the screen on show. */
const desk = () => evaluate(`(() => ({
  kicker: document.querySelector('#act .gl__panel .gl__kicker')?.textContent ?? '',
  points: document.querySelector('#act .act-points')?.textContent ?? '',
  tiles: document.querySelectorAll('#act .act-tile').length,
}))()`);

/**
 * Reload, and wait for the page that comes back.
 *
 * Waiting for "the naming screen is visible" is not enough on its own: for a
 * moment after a reload, CDP still evaluates against the document we are
 * leaving, and that document has a visible naming screen too. The poll then
 * answers from the old page and every read below is a read of the wrong one.
 * The new document's load event is the signal that cannot be faked.
 */
async function freshReload() {
  pageLoaded = false;
  await send('Page.reload', {});
  for (let i = 0; i < 40 && !pageLoaded; i += 1) await sleep(250);
  await waitFor(`!!document.getElementById('naming') && !document.getElementById('naming').hidden`);
  await sleep(400);
}

/** Navigate to a URL, and wait for the page that comes back. */
async function freshLoad(url) {
  pageLoaded = false;
  await send('Page.navigate', { url });
  for (let i = 0; i < 40 && !pageLoaded; i += 1) await sleep(250);
  await waitFor(`!!document.getElementById('naming') && !document.getElementById('naming').hidden`);
  await sleep(400);
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
      target = (await (await fetch('http://localhost:9253/json')).json()).find((t) => t.type === 'page');
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
    if (message.method === 'Page.loadEventFired') pageLoaded = true;
  });

  await send('Runtime.enable');
  await send('Page.enable');

  /* A clean slate: no saved run, and no training record from an earlier pass. */
  await freshLoad(`${BASE}/#naming`);
  await evaluate(`(() => { try { localStorage.removeItem(${JSON.stringify(SAVE_KEY)}); localStorage.removeItem(${JSON.stringify(TRAINING_KEY)}); } catch (e) { /* no storage */ } })()`);
  await freshReload();

  // 1. A first visit is asked for a name, and there is no CONTINUE to press.
  const first = await menu();
  note('a first visit asks for a name', first.form === true && first.resume === false, JSON.stringify(first));
  const submitDisabled = await evaluate(`document.querySelector('[data-naming-submit]')?.disabled`);
  note('START MISSION waits for a name', submitDisabled === true);

  // 2. Naming the astronaut and starting writes the run down.
  await waitFor(`(() => {
    const input = document.querySelector('[data-naming-input]');
    const submit = document.querySelector('[data-naming-submit]');
    if (!input || !submit) return false;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return !submit.disabled;
  })()`, 40);
  await clickIn('naming', 'Start Mission');
  await waitFor(`!!document.getElementById('briefing') && !document.getElementById('briefing').hidden`);

  const firstSave = await readKey();
  note(
    'starting a mission writes the run down',
    firstSave !== null && firstSave.unreadable !== true,
    JSON.stringify(firstSave),
  );
  note(
    'with the version, the screen and the name in it',
    firstSave?.version === 1 && firstSave?.screen === 'briefing' && firstSave?.name === 'Ada',
    JSON.stringify(firstSave),
  );

  // 3. The save follows the player: a later screen replaces the earlier one.
  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`!!document.getElementById('landing-site') && !document.getElementById('landing-site').hidden`);
  await evaluate(`(() => {
    const pin = document.querySelector('#landing-site .landing-site__pin');
    if (pin) pin.click();
  })()`);
  await sleep(600);
  await clickIn('landing-site', 'Land here');
  await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`);
  await sleep(900);

  await clickIn('base', 'Land & start sol 1');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(1200);

  const onAct = await readKey();
  note('the save now points at the desk', onAct?.screen === 'act', JSON.stringify(onAct));

  // 4. Going back to the menu must not overwrite the resume point with the
  //    menu itself: a save that says `naming` would make CONTINUE circular.
  await evaluate(`location.hash = '#naming'`);
  await waitFor(`!!document.getElementById('naming') && !document.getElementById('naming').hidden`);
  const afterMenu = await readKey();
  note('coming back to the menu keeps the resume point', afterMenu?.screen === 'act', JSON.stringify(afterMenu));

  // 5. A fresh visit: the browser reloads, the memory is empty, the save is not.
  await freshReload();

  const returning = await menu();
  note('the menu greets the astronaut by name', returning.greeting === 'Welcome back, Ada.', returning.greeting);
  note('and shows CONTINUE instead of the form', returning.resume === true && returning.form === false);
  note('and says where they stopped', /outpost|sol \d|launch pad/i.test(returning.note), returning.note);

  // 6. CONTINUE goes to the screen they left, not to the start of the day.
  await clickIn('naming', 'Continue');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(1200);

  const deskNow = await desk();
  note(
    'CONTINUE lands on the desk they left',
    (await where()) === 'act' && (deskNow?.tiles ?? 0) > 0,
    `${deskNow?.kicker ?? 'no kicker'}, ${deskNow?.tiles ?? 0} buttons`,
  );

  // 7. START OVER forgets the run and asks for a name again.
  await freshLoad(`${BASE}/#naming`);
  await clickIn('naming', 'Start over');
  await sleep(700);

  const restarted = await menu();
  const gone = await readKey();
  note('START OVER takes the save away', gone === null, JSON.stringify(gone));
  note('and puts the form back', restarted.form === true && restarted.resume === false, JSON.stringify(restarted));
  note('and greets nobody', restarted.greeting === '', restarted.greeting);

  // 8. A save this build cannot read is ignored, not half-loaded.
  await evaluate(`(() => {
    try { localStorage.setItem(${JSON.stringify(SAVE_KEY)}, JSON.stringify({ version: 1, screen: 'act', run: { sol: 4 } })); } catch (e) { /* no storage */ }
  })()`);
  await freshReload();

  const broken = await menu();
  note(
    'a broken save is ignored and the form is shown',
    broken.form === true && broken.resume === false,
    JSON.stringify(broken),
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
