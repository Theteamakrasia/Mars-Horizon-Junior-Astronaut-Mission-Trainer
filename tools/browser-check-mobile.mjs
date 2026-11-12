/*
 * A pass over the game on a phone.
 *
 * The game is drawn at a fixed 1024x576 and scaled to fit the phone, so it
 * looks the same as it does on a computer. This check drives that:
 *
 *   1. a phone sent to the game is sent to the shell, and the shell holds a
 *      16:9 frame;
 *   2. the game inside that frame believes it is 1024 pixels wide, which is
 *      what makes the layout the computer's layout;
 *   3. a finger works where a mouse works - a real touch event, not a
 *      synthesised click;
 *   4. the game that can only be played with the arrow keys has a pad to play
 *      it with.
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-mobile.mjs
 */

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/* The size the game is drawn at, and the size of the phone it is drawn on. */
const FRAME_W = 1024;
const FRAME_H = 576;
const PHONE_W = 390;
const PHONE_H = 844;

rmSync(process.env.TEMP + '\\mobile-chrome-profile', { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9253',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + process.env.TEMP + '\\mobile-chrome-profile',
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

async function ev(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });

  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);

  return result.result.value;
}

async function waitFor(expression, tries = 80) {
  for (let index = 0; index < tries; index += 1) {
    if (await ev(expression)) return true;

    await sleep(250);
  }

  return false;
}

/** Click something with a finger, not a mouse. */
async function touchAt(x, y) {
  const point = [{ x: Math.round(x), y: Math.round(y), radiusX: 6, radiusY: 6, force: 1, id: 1 }];

  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point });
  await sleep(60);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(400);
}

/**
 * Touch an element in the frame, by its selector.
 *
 * The frame is scaled, so the element's place inside the frame has to be
 * mapped to the phone's place before the finger goes down.
 */
async function touchInFrame(selector) {
  const spot = await ev(`(() => {
    const frame = document.getElementById('frame');
    const inner = frame.contentDocument.querySelector(${JSON.stringify(selector)});
    if (!inner) return null;
    const box = inner.getBoundingClientRect();
    const outer = frame.getBoundingClientRect();
    const scale = outer.width / ${FRAME_W};
    return {
      x: outer.left + (box.left + box.width / 2) * scale,
      y: outer.top + (box.top + box.height / 2) * scale,
    };
  })()`);

  if (!spot) return 'missing';

  await touchAt(spot.x, spot.y);

  return 'clicked';
}

const results = [];

function note(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Click something with a mouse, for the parts of the journey that are not the point. */
async function tap(selector) {
  const outcome = await ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b) return "missing"; if (b.disabled) return "disabled"; b.click(); return "clicked"; })()`);
  await sleep(400);

  return outcome;
}

/** Walk the journey to the outpost. */
async function toAct() {
  await waitFor(`!!document.getElementById("naming") && !document.getElementById("naming").hidden`);
  await waitFor(`(() => { const i = document.querySelector("[data-naming-input]"); const s = document.querySelector("[data-naming-submit]"); if (!i || !s) return false; i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); return !s.disabled; })()`);
  await tap("[data-naming-submit]");
  for (let index = 0; index < 10; index += 1) { if ((await tap("#briefing [data-briefing-next]")) !== "clicked") break; }
  await sleep(3400);
  for (let index = 0; index < 6; index += 1) { if ((await tap("#supply [data-supply-next]")) !== "clicked") break; }
  await ev(`(() => { const b = document.querySelector("#supply .supply__choice-button:not([disabled])"); if (b) b.click(); })()`);
  await sleep(500);
  await tap("#supply [data-supply-next]");
  await tap("#supply [data-supply-continue]");
  await waitFor(`(() => { const e = document.getElementById("launch"); return !!e && !e.hidden; })()`);
  await sleep(400);
  await waitFor(`(() => { const b = document.querySelector("#launch [data-launch-skip]"); return !!b && !b.hidden; })()`, 80);
  await tap("#launch [data-launch-skip]");
  await waitFor(`(() => { const p = document.querySelector("#launch [data-launch-parts-panel]"); return !!p && !p.hidden; })()`, 20);
  await tap("#launch [data-launch-parts-continue]");
  await sleep(2000);
  for (let index = 0; index < 8; index += 1) { if ((await tap("#interior [data-interior-next]")) !== "clicked") break; }
  await sleep(1200);
  await tap("#interior [data-interior-landing-go]");
  await sleep(1500);
  await ev(`(() => { const p = document.querySelector("#landing-site .landing-site__pin"); if (p) p.click(); })()`);
  await sleep(800);
  await tap("#landing-site [data-landing-land]");
  await sleep(1500);
  await ev(`(() => { const b = [...document.querySelectorAll("#base button")].find((n) => n.textContent.includes("Land & start sol 1")); if (b) b.click(); })()`);
  await waitFor(`!!document.getElementById("act") && !document.getElementById("act").hidden`);
  await sleep(1200);
}

/** Open one of the training games from the card. */
async function playCard(name) {
  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(600);
  await ev(`(() => { const b = [...document.querySelectorAll("#act .trn__card")].find((c) => c.querySelector(".trn__card-name")?.textContent === ${JSON.stringify(name)}); if (b) b.querySelector(".trn__play").click(); })()`);
  await sleep(700);

  return await ev(`!!document.querySelector("#act .trn__backdrop")`);
}

try {
  let target = null;

  for (let index = 0; index < 40 && target === null; index += 1) {
    await sleep(250);

    try {
      target = (await (await fetch('http://localhost:9253/json')).json()).find((t) => t.type === 'page');
    } catch {
      /* Chrome is not up yet. */
    }
  }

  if (target === null) throw new Error('Chrome never opened its debugging port');

  socket = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve) => socket.addEventListener('open', resolve));
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data.toString());

    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((a) => a.value ?? a.description).join(' '));
    }

    const entry = pending.get(message.id);

    if (entry) {
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  /* A phone: a coarse pointer and a narrow screen. */
  await send('Emulation.setDeviceMetricsOverride', {
    width: PHONE_W,
    height: PHONE_H,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  /* ---- 1. The phone is sent to the shell. */
  await send('Page.navigate', { url: `${BASE}/index.html` });
  await sleep(2500);

  const landed = await ev(`window.location.pathname`);
  note('a phone is sent to the shell', landed.endsWith('mobile.html'), landed);

  /* ---- 2. The shell holds a 16:9 frame, scaled to fit. */
  const shell = await ev(`(() => {
    const frame = document.getElementById('frame');
    if (!frame) return null;
    const box = frame.getBoundingClientRect();
    return {
      width: frame.clientWidth,
      height: frame.clientHeight,
      rendered: box.width,
      renderedHeight: box.height,
      scale: Number(getComputedStyle(document.documentElement).getPropertyValue('--scale')),
    };
  })()`);

  note('the frame is 16:9', shell?.width === FRAME_W && shell?.height === FRAME_H, `${shell?.width}x${shell?.height}`);
  note(
    'the frame is scaled to fit the phone',
    Math.abs((shell?.rendered ?? 0) / (shell?.renderedHeight ?? 1) - FRAME_W / FRAME_H) < 0.02,
    `${Math.round(shell?.rendered ?? 0)}x${Math.round(shell?.renderedHeight ?? 0)} on the phone`,
  );
  note(
    'and it is not bigger than the phone',
    (shell?.rendered ?? 0) <= PHONE_W + 1 && (shell?.renderedHeight ?? 0) <= PHONE_H + 1,
    `scale ${(shell?.scale ?? 0).toFixed(3)}`,
  );

  /* ---- 3. The game inside believes it is 1024 wide: the computer's layout. */
  const inside = await ev(`(() => {
    const frame = document.getElementById('frame');
    const win = frame.contentWindow;
    return win ? { width: win.innerWidth, height: win.innerHeight, framed: frame.contentDocument.documentElement.classList.contains('is-frame') } : null;
  })()`);

  note('the game inside is drawn at the computer size', inside?.width === FRAME_W && inside?.height === FRAME_H, `${inside?.width}x${inside?.height}`);
  note('and it knows it is in a frame', inside?.framed === true);

  /* ---- 3b. Turn the phone sideways: the window still fits, and it is still
     16:9. A scale worked out from a stale viewport hangs off the edge of the
     screen, which is the one thing this check has to catch. */
  await send('Emulation.setDeviceMetricsOverride', {
    width: PHONE_H,
    height: PHONE_W,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await sleep(1200);

  const turned = await ev(`(() => {
    const frame = document.getElementById('frame');
    const box = frame.getBoundingClientRect();
    return {
      rendered: box.width,
      renderedHeight: box.height,
      left: box.left,
      top: box.top,
      scale: Number(getComputedStyle(document.documentElement).getPropertyValue('--scale')),
    };
  })()`);

  note(
    'the window still fits when the phone is turned',
    (turned?.rendered ?? 0) <= PHONE_H + 1 && (turned?.renderedHeight ?? 0) <= PHONE_W + 1,
    `${Math.round(turned?.rendered ?? 0)}x${Math.round(turned?.renderedHeight ?? 0)} on a ${PHONE_H}x${PHONE_W} phone`,
  );
  note(
    'and it is still 16:9',
    Math.abs((turned?.rendered ?? 0) / (turned?.renderedHeight ?? 1) - FRAME_W / FRAME_H) < 0.02,
    `${(turned?.scale ?? 0).toFixed(3)}`,
  );

  /* Back to upright for the touch tests. */
  await send('Emulation.setDeviceMetricsOverride', {
    width: PHONE_W,
    height: PHONE_H,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await sleep(1000);

  /* ---- 4. A finger works where a mouse works. */
  const touched = await touchInFrame('[data-naming-input]');
  note('a finger can reach the name field', touched === 'clicked', touched);

  /* The finger's job is to put the caret in the field; what the player types
     then comes from the phone's own keyboard, which this check cannot press.
     So the check asks for the focus, and types the name itself. */
  const focused = await ev(`(() => {
    const frame = document.getElementById('frame');
    const doc = frame.contentDocument;
    const input = doc.querySelector('[data-naming-input]');
    return doc.activeElement === input;
  })()`);

  note('and the field takes the focus', focused === true);

  await ev(`(() => {
    const frame = document.getElementById('frame');
    const input = frame.contentDocument.querySelector('[data-naming-input]');
    input.value = 'Alex';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);

  const named = await ev(`(() => {
    const frame = document.getElementById('frame');
    const submit = frame.contentDocument.querySelector('[data-naming-submit]');
    return { value: frame.contentDocument.querySelector('[data-naming-input]')?.value ?? '', ready: submit ? !submit.disabled : false };
  })()`);

  note('and the name is accepted', named?.ready === true, named?.value);

  const started = await touchInFrame('[data-naming-submit]');
  await sleep(1200);

  const moved = await ev(`(() => {
    const frame = document.getElementById('frame');
    const briefing = frame.contentDocument.getElementById('briefing');
    return !!briefing && !briefing.hidden;
  })()`);

  note('and a finger can start the mission', started === 'clicked' && moved === true, started);

  /* ---- 5. The arrow pad, for the game that needs a keyboard. */
  await send('Page.navigate', { url: `${BASE}/index.html?frame=1` });
  await sleep(2000);
  await toAct();

  /* ---- 5. The desk does not draw over itself.
     The panel is inside a page that scrolls, and it used to be stretched to
     the height of the screen instead of being as tall as its own content: the
     callout and the labels then spilled out of it and painted over the Run sol
     button underneath. */
  const desk = await ev(`(() => {
    const scroll = document.querySelector('#act .gl__scroll');
    const callout = document.querySelector('#act .gl__callout');
    const foot = document.querySelector('#act .gl__panel-foot');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    return {
      scrollHeight: scroll ? scroll.clientHeight : 0,
      callout: box(callout),
      foot: box(foot),
    };
})()`);

  note('the panel is as tall as its content', (desk?.scrollHeight ?? 0) > 0, `${desk?.scrollHeight}px`);

  if (desk?.callout !== null && desk?.callout !== undefined) {
    note(
      'and nothing paints over the Run sol button',
      desk.foot !== null && desk.foot !== undefined && desk.callout.bottom <= desk.foot.top + 1,
      `callout ends at ${Math.round(desk.callout.bottom)}, button starts at ${Math.round(desk.foot?.top ?? 0)}`,
    );
  } else {
    note('and the callout is clear of the Run sol button', true, 'no callout on the desk');
  }

  /* ---- 6. The arrow pad, for the game that needs a keyboard. */
  const opened = await playCard('Rover Parking');
  note('the rover game opens', opened === true);

  const pad = await ev(`(() => {
    const el = document.querySelector('#act .pad');
    if (!el) return null;
    return { buttons: el.querySelectorAll('.pad__btn').length, visible: getComputedStyle(el).display !== 'none' };
  })()`);

  note('it has an arrow pad', pad !== null && pad.buttons === 4, pad ? `${pad.buttons} buttons` : 'no pad');
  note('the pad is on screen', pad?.visible === true);

  const before = await ev(`document.querySelector('#act .trn__status')?.textContent ?? ''`);

  await ev(`(() => { const b = document.querySelector('#act .pad__btn--down'); if (b) b.click(); })()`);
  await sleep(300);

  /* A click does not make a key event, so the pad is pressed the way a finger
     presses it. */
  const afterClick = await ev(`document.querySelector('#act .trn__status')?.textContent ?? ''`);

  const box = await ev(`(() => {
    const b = document.querySelector('#act .pad__btn--down');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);

  if (box !== null) await touchAt(box.x, box.y);

  const after = await ev(`document.querySelector('#act .trn__status')?.textContent ?? ''`);

  note('the pad drives the rover', after !== before, `${before} then ${after}`);
  note('and only the pad moves it', afterClick === before, `${afterClick}`);

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
