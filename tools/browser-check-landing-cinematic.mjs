/*
 * A headless pass over the landing cinematic.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-landing-cinematic.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * What it checks:
 *
 *   - "Land here" starts the film for ALL FIVE landing regions, and the film
 *     says which region the player chose;
 *   - the frames come in the order they were supplied - 02, then the black
 *     beat, then 03, 04, 05 and 06 - with no cut in the wrong direction;
 *   - the stage is exactly the size of the screen it is mounted in, at five
 *     window shapes, with no bars and no scrollbars;
 *   - the Skip button is in the top right corner at every one of those
 *     shapes, the corner the launch reel's Skip is in, and clear of the
 *     caption panel;
 *   - the Skip button, Escape and Enter all cut the film and land on the
 *     outpost, and the outpost is the one that was waiting;
 *   - the how-to-play guide still opens by itself the first time the outpost
 *     is reached, because the film did not change that;
 *   - reduced motion takes the movement away and leaves the film alone.
 *
 * The film is watched once, in full, and the rest of the checks take the Skip
 * button - the same path a player takes, and the reason the check finishes in
 * a minute rather than in four.
 */

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/* A clean profile, so the check always starts from a clean run: Chrome
   restores the last session in a profile it has used before, and that
   restored page still holds the run of the last session in memory. */
rmSync(process.env.TEMP + '\\cinematic-chrome-profile', { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,1000',
  '--user-data-dir=' + process.env.TEMP + '\\cinematic-chrome-profile',
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

async function waitFor(expression, tries = 80) {
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
  await sleep(600);
  return clicked;
}

const results = [];
function note(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const REGIONS = ['jezero', 'olympus', 'valles', 'arcadia', 'argyre'];

/** The region names the game knows, so the check can read them off the screen. */
const REGION_NAMES = {
  jezero: 'Jezero Crater',
  olympus: 'Olympus Mons',
  valles: 'Valles Marineris',
  arcadia: 'Arcadia Planitia',
  argyre: 'Argyre Basin',
};

/**
 * What is on the screen right now: the beat that is showing, the words, and
 * how opaque each frame is.
 */
const SCREEN_STATE = `(() => {
  const screen = document.getElementById('landing-cinematic');
  if (!screen || screen.hidden) return { up: false };
  const scenes = [...screen.querySelectorAll('.landing-cinematic__scene')];
  const visible = scenes
    .map((s) => ({ beat: s.dataset.landingScene, opacity: Number(s.style.opacity || 0) }))
    .filter((s) => s.opacity > 0.05);
  const caption = screen.querySelector('.landing-cinematic__caption');
  const spoken = screen.querySelector('.landing-cinematic__visually-hidden');
  return {
    up: true,
    time: Number(screen.dataset.landingTime ?? -1),
    visible: visible.map((v) => v.beat),
    opacities: scenes.map((s) => Number(s.style.opacity || 0)),
    caption: {
      label: caption?.querySelector('.landing-cinematic__caption-label')?.textContent ?? '',
      headline: caption?.querySelector('.landing-cinematic__caption-headline')?.textContent ?? '',
      title: caption?.querySelector('.landing-cinematic__caption-title')?.textContent ?? '',
      fact: [...(caption?.querySelectorAll('.landing-cinematic__caption-fact') ?? [])]
        .map((f) => f.textContent ?? '').filter((t) => t !== '').join(' | '),
      source: caption?.querySelector('.landing-cinematic__caption-source')?.textContent ?? '',
      opacity: Number(caption?.style.opacity || 0),
    },
    spoken: spoken?.textContent ?? '',
    camera: screen.querySelector('.landing-cinematic__frame')?.style.transform ?? '',
  };
})()`;

/** The film is up and at least one frame is showing. */
const FILM_IS_UP = `(() => {
  const screen = document.getElementById('landing-cinematic');
  return !!screen && !screen.hidden && !!screen.querySelector('.landing-cinematic__scene');
})()`;

try {
  let target = null;
  for (let i = 0; i < 40 && target === null; i += 1) {
    await sleep(250);
    try {
      target = (await (await fetch('http://localhost:9227/json')).json()).find((t) => t.type === 'page');
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

  // 1. Name the astronaut, so there is a run with a region in it.
  await evaluate(`(() => {
    const input = document.querySelector('[data-naming-input]');
    const submit = document.querySelector('[data-naming-submit]');
    if (!input || !submit) return;
    input.value = 'Astronaut';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);
  await clickIn('naming', 'Start Mission');

  /* ---------------------------------------------------------------------
     2. The film, watched once from beginning to end.
     --------------------------------------------------------------------- */

  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
  await sleep(700);

  await evaluate(`(() => {
    const pin = document.querySelector('[data-landing-pin="jezero"]');
    if (pin) pin.click();
  })()`);
  await sleep(600);

  const landed = await clickIn('landing-site', 'Land here');
  const filmUp = await waitFor(FILM_IS_UP, 40);

  note('pressing Land here starts the film', landed === 'clicked' && filmUp === true);

  /* Watch it. A sample is taken whenever the beat changes OR the words
     change: the caption for a beat fades in after the beat has started, so
     the first sample of a beat can catch it before it has any words on it. */
  const samples = [];

  while (true) {
    const state = await evaluate(SCREEN_STATE);

    if (state.up) {
      const top = state.visible.length > 0 ? state.visible[state.visible.length - 1] : 'black';
      const last = samples[samples.length - 1];
      const key = `${top}|${state.caption.title}|${state.caption.fact}`;

      if (last?.key !== key) {
        samples.push({
          key,
          beat: top,
          at: state.time,
          title: state.caption.title,
          headline: state.caption.headline,
          fact: state.caption.fact,
          source: state.caption.source,
          label: state.caption.label,
          spoken: state.spoken,
        });
      }

      if (state.time >= 17500) break;
    }

    const onBase = await evaluate(`!!document.getElementById('base') && !document.getElementById('base').hidden`);

    if (onBase) break;

    await sleep(60);
  }

  /*
    One entry per beat: the last sample of each run of samples.

    The film opens on black and closes on black - the fade in from nothing and
    the fade out to the outpost - and neither of those is the black beat in
    the middle. So the first run of black and the last run of black are the
    film's own edges, and the black beat is the one between two pictures.
  */
  const groups = [];

  for (const sample of samples) {
    const last = groups[groups.length - 1];

    if (last !== undefined && last.beat === sample.beat) {
      groups[groups.length - 1] = sample;
      continue;
    }

    groups.push(sample);
  }

  if (groups[0]?.beat === 'black') groups.shift();
  if (groups[groups.length - 1]?.beat === 'black') groups.pop();

  const byBeat = new Map();

  for (const group of groups) byBeat.set(group.beat, group);

  const order = groups.map((group) => group.beat);

  note(
    'the frames come in the order they were supplied',
    JSON.stringify(order) === JSON.stringify(['approach', 'black', 'chuteFar', 'chuteMid', 'chuteNear', 'landing']),
    order.join(' > '),
  );

  const approach = byBeat.get('approach');
  note('the approach names the region the player chose', approach?.title === 'Jezero Crater', approach?.title ?? '');
  note('the approach carries a NASA fact', (approach?.fact ?? '').length > 20, approach?.fact ?? '');
  note('the approach says where the fact came from', (approach?.source ?? '').startsWith('Source: NASA'), approach?.source ?? '');

  const black = byBeat.get('black');
  note('the black beat says what is happening', black?.headline === 'ENTRY · DESCENT · LANDING', black?.headline ?? '');

  const landing = byBeat.get('landing');
  note('the landing names the region again', landing?.title === 'Landing at Jezero Crater', landing?.title ?? '');
  note('the landing carries the fact about the region', (landing?.fact ?? '').includes('45 kilometers'), landing?.fact ?? '');

  note('the words are read out as well as shown', (approach?.spoken ?? '').includes('140 million miles'), approach?.spoken ?? '');

  /* The hand-off: the outpost, with the region the player chose on it. */
  const atBase = await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`, 60);
  await sleep(900);

  note('the film ends on the outpost screen', atBase === true);

  const world = await evaluate(`(() => {
    const screen = document.getElementById('base');
    return {
      title: screen?.querySelector('.gl__title')?.textContent ?? '',
      location: screen?.querySelector('.gl__location')?.textContent ?? '',
      guide: !!document.querySelector('.guide__backdrop'),
    };
  })()`);

  note('the outpost says what will you bring', world.title === 'What will you bring?', world.title);
  note('the outpost is at the region the player chose', world.location === 'Jezero Crater', world.location);
  note('the how-to-play guide still opens by itself the first time', world.guide === true);

  /* ---------------------------------------------------------------------
     3. The stage is the size of the screen, at every shape.
     --------------------------------------------------------------------- */

  const SIZES = [
    [1483, 787],
    [1920, 1080],
    [1366, 768],
    [2560, 1080],
    [1024, 768],
  ];

  for (const [width, height] of SIZES) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate(`location.hash = '#landing-site'`);
    await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
    await sleep(500);

    await evaluate(`(() => {
      const pin = document.querySelector('[data-landing-pin="olympus"]');
      if (pin) pin.click();
    })()`);
    await sleep(400);
    await clickIn('landing-site', 'Land here');
    await waitFor(FILM_IS_UP, 40);
    await sleep(400);

    const box = await evaluate(`(() => {
      const screen = document.getElementById('landing-cinematic');
      const stage = screen?.querySelector('.landing-cinematic__stage');
      if (!screen || !stage) return null;
      const a = screen.getBoundingClientRect();
      const b = stage.getBoundingClientRect();
      const image = screen.querySelector('.landing-cinematic__image');
      const c = image?.getBoundingClientRect();
      const skip = screen.querySelector('.landing-cinematic__skip');
      const s = skip?.getBoundingClientRect();
      const caption = screen.querySelector('.landing-cinematic__caption');
      const k = caption?.getBoundingClientRect();
      return {
        screen: [a.width, a.height],
        origin: [a.left, a.top],
        stage: [b.width, b.height],
        image: c ? [c.width, c.height] : null,
        fits: image ? getComputedStyle(image).objectFit : '',
        scrollX: document.documentElement.scrollWidth <= window.innerWidth,
        scrollY: document.documentElement.scrollHeight <= window.innerHeight,
        overflow: getComputedStyle(screen).overflow,
        skip: s ? { top: s.top, right: s.right, left: s.left, bottom: s.bottom } : null,
        caption: k ? { top: k.top, right: k.right, left: k.left, bottom: k.bottom } : null,
      };
    })()`);

    note(
      `the stage is the size of the screen at ${width}x${height}`,
      box !== null &&
        box.stage[0] === box.screen[0] &&
        box.stage[1] === box.screen[1] &&
        box.scrollX &&
        box.scrollY,
      box === null ? 'no stage' : `stage ${box.stage.join('x')} in ${box.screen.join('x')}`,
    );

    note(
      `the picture covers the stage at ${width}x${height}`,
      box?.fits === 'cover' &&
        box.image !== null &&
        box.image[0] >= box.stage[0] &&
        box.image[1] >= box.stage[1],
      box === null ? '' : `${box.fits}, ${box.image?.join('x') ?? 'no image'}`,
    );

    /* The Skip button is in the top right, which is where the launch reel's
       Skip is: the game has two films and the one control that ends a film
       does not move between them. The quarters are generous on purpose - the
       rule is which corner the button is in, not how many pixels it is from
       the edge. The old bottom-right placement fails this, which is the
       point of the check. */
    const skipBox = box?.skip ?? null;

    note(
      `the Skip button is in the top right at ${width}x${height}`,
      skipBox !== null &&
        box !== null &&
        skipBox.top - box.origin[1] <= box.screen[1] * 0.2 &&
        box.origin[0] + box.screen[0] - skipBox.right <= box.screen[0] * 0.2,
      skipBox === null
        ? 'no skip button'
        : `top ${Math.round(skipBox.top - (box?.origin[1] ?? 0))}, right inset ${Math.round((box?.origin[0] ?? 0) + (box?.screen[0] ?? 0) - skipBox.right)}`,
    );

    /* And it must not land on the words. The caption panel is bottom left on
       purpose, so this is a guard rather than a hope. */
    const captionBox = box?.caption ?? null;

    note(
      `the Skip button is clear of the caption at ${width}x${height}`,
      skipBox !== null &&
        captionBox !== null &&
        (skipBox.right < captionBox.left ||
          skipBox.left > captionBox.right ||
          skipBox.bottom < captionBox.top ||
          skipBox.top > captionBox.bottom),
    );

    await evaluate(`(() => {
      const b = document.querySelector('#landing-cinematic .landing-cinematic__skip');
      if (b) b.click();
    })()`);
    await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`, 60);
    await sleep(400);
  }

  await send('Emulation.clearDeviceMetricsOverride');

  /* ---------------------------------------------------------------------
     4. The other four regions, and the three ways out.
     --------------------------------------------------------------------- */

  for (const region of REGIONS) {
    await evaluate(`location.hash = '#landing-site'`);
    await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
    await sleep(500);

    await evaluate(`(() => {
      const pin = document.querySelector('[data-landing-pin=${JSON.stringify(region)}]');
      if (pin) pin.click();
    })()`);
    await sleep(500);

    await clickIn('landing-site', 'Land here');
    const up = await waitFor(FILM_IS_UP, 40);
    await sleep(1500);

    const state = await evaluate(SCREEN_STATE);

    note(
      `the film starts at ${region}`,
      up === true && state.caption.title.includes(REGION_NAMES[region]),
      state.caption.title,
    );

    await evaluate(`(() => {
      const b = document.querySelector('#landing-cinematic .landing-cinematic__skip');
      if (b) b.click();
    })()`);
    await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`, 60);
    await sleep(700);

    const where = await evaluate(`(() => {
      const screen = document.getElementById('base');
      return screen?.querySelector('.gl__location')?.textContent ?? '';
    })()`);

    note(`the outpost is at ${region} after the film`, where === REGION_NAMES[region], where);
  }

  /* Escape and Enter cut the film too.
     Escape is answered by the screen. Enter is answered by the screen when the
     focus is elsewhere, and by the browser itself when the Skip button has
     the focus - a focused button deals with Enter on its own, and the screen
     stays out of it. Both paths are checked, because both are how a player
     leaves the film. */
  const CASES = [
    { name: 'Escape', blur: false },
    { name: 'Enter on the Skip button', blur: false, enter: true },
    { name: 'Enter with the focus elsewhere', blur: true, enter: true },
  ];

  for (const testCase of CASES) {
    await evaluate(`location.hash = '#landing-site'`);
    await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
    await sleep(500);

    await evaluate(`(() => {
      const pin = document.querySelector('[data-landing-pin="argyre"]');
      if (pin) pin.click();
    })()`);
    await sleep(400);
    await clickIn('landing-site', 'Land here');
    await waitFor(FILM_IS_UP, 40);
    await sleep(800);

    if (testCase.blur) {
      /* Take the focus off the Skip button, so the screen's own Enter
         handler is the one that answers. */
      await evaluate(`(() => { const a = document.activeElement; if (a && a.blur) a.blur(); })()`);
    }

    if (testCase.enter) {
      /* The full key event, so the browser runs its own default action: a
         focused button is activated by Enter. */
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Enter',
        code: 'Enter',
        text: '\r',
        unmodifiedText: '\r',
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
    } else {
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
        nativeVirtualKeyCode: 27,
      });
    }

    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: testCase.enter ? 'Enter' : 'Escape',
      code: testCase.enter ? 'Enter' : 'Escape',
      windowsVirtualKeyCode: testCase.enter ? 13 : 27,
      nativeVirtualKeyCode: testCase.enter ? 13 : 27,
    });

    const arrived = await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`, 60);

    note(`${testCase.name} cuts the film and lands on the outpost`, arrived === true);
  }

  /* ---------------------------------------------------------------------
     5. Reduced motion: the same film, without the movement.
     --------------------------------------------------------------------- */

  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
  await sleep(600);

  await evaluate(`(() => {
    const pin = document.querySelector('[data-landing-pin="valles"]');
    if (pin) pin.click();
  })()`);
  await sleep(400);
  await clickIn('landing-site', 'Land here');
  await waitFor(FILM_IS_UP, 40);
  await sleep(2500);

  const reduced = await evaluate(SCREEN_STATE);

  note(
    'reduced motion still plays the film and still says the fact',
    reduced.up === true && (reduced.caption.fact ?? '').length > 20,
    reduced.caption.fact,
  );
  note('reduced motion leaves the camera at rest', reduced.camera === '' || reduced.camera === 'none', reduced.camera);

  await send('Emulation.setEmulatedMedia', { features: [] });

  /* ---------------------------------------------------------------------
     6. A second run: the film plays again, with nothing left over.
     --------------------------------------------------------------------- */

  await evaluate(`location.hash = '#landing-site'`);
  await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
  await sleep(500);
  await evaluate(`(() => {
    const pin = document.querySelector('[data-landing-pin="jezero"]');
    if (pin) pin.click();
  })()`);
  await sleep(400);
  await clickIn('landing-site', 'Land here');
  await waitFor(FILM_IS_UP, 40);
  await sleep(800);

  const again = await evaluate(SCREEN_STATE);

  note('the film plays again on a second run', again.up === true && again.visible.length > 0, again.visible.join(','));

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
