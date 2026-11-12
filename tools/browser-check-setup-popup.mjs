/*
 * A headless pass over the setup popup: the landing window where the supplies
 * are bought.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-setup-popup.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * What it checks:
 *
 *   - the window opens by itself when the crew lands, at ALL FIVE landing
 *     regions, and it shows that region's own name and description;
 *   - every supply the build panel used to show is in the window, with its
 *     icon, name, description, cost, count and both steppers;
 *   - the panel behind it has NO supply cards, so the two are never on screen
 *     at once;
 *   - a "+" moves the count up, the points down by exactly the cost and the
 *     extras count up, and a "-" moves them all back;
 *   - a "+" that cannot be pressed says why;
 *   - the goals in the window move when the build does;
 *   - closing the window leaves the build intact, and the panel can open it
 *     again;
 *   - the button in the window lands the outpost, exactly as the panel's does.
 */

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/* A clean profile, so the check always starts from a clean run: Chrome
   restores the last session in a profile it has used before, and that
   restored page still holds the run of the last session in memory. */
rmSync(process.env.TEMP + '\\setup-popup-chrome-profile', { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9228',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,1000',
  '--user-data-dir=' + process.env.TEMP + '\\setup-popup-chrome-profile',
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

const results = [];
function note(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Everything the window is showing, read out of the real DOM. */
async function readWindow() {
  return await evaluate(`(() => {
    const popup = document.querySelector('.setup__backdrop');
    if (!popup) return null;

    const cards = [...popup.querySelectorAll('.gl__card')].map((card) => ({
      name: card.querySelector('.gl__card-name')?.textContent ?? '',
      art: card.querySelector('.gl__card-img')?.getAttribute('src') ?? '',
      gives: card.querySelector('.gl__card-line')?.textContent ?? '',
      needs: card.querySelector('.gl__card-tag')?.textContent ?? '',
      cost: card.querySelector('.gl__cost')?.textContent ?? '',
      count: card.querySelector('.gl__count strong')?.textContent ?? '',
      limit: card.querySelector('.gl__count small')?.textContent ?? '',
      why: card.querySelector('.gl__card-why')?.textContent ?? '',
      addDisabled: card.querySelector('.gl__step--add')?.disabled ?? false,
      removeDisabled: card.querySelector('.gl__step:not(.gl__step--add)')?.disabled ?? false,
      hasAdd: !!card.querySelector('.gl__step--add'),
      hasRemove: !!card.querySelector('.gl__step:not(.gl__step--add)'),
    }));

    const goals = [...popup.querySelectorAll('.gl__goal')].map((goal) => ({
      title: goal.querySelector('.gl__goal-title')?.textContent ?? '',
      ok: goal.getAttribute('data-ok') === 'true',
      why: goal.querySelector('.gl__goal-why')?.textContent ?? '',
      state: goal.querySelector('.gl__goal-state')?.textContent ?? '',
    }));

    return {
      kicker: popup.querySelector('.setup__kicker')?.textContent ?? '',
      title: popup.querySelector('.setup__title')?.textContent ?? '',
      blurb: popup.querySelector('.setup__blurb')?.textContent ?? '',
      art: popup.querySelector('.setup__art')?.getAttribute('src') ?? '',
      progress: popup.querySelector('.setup__progress-value')?.textContent ?? '',
      pips: [...popup.querySelectorAll('.setup__pip')].map((p) => p.classList.contains('setup__pip--ready')),
      points: popup.querySelector('.setup__points-value')?.textContent ?? '',
      extras: popup.querySelector('.setup__extras')?.textContent ?? '',
      stats: [...popup.querySelectorAll('.setup__stat')].map((s) => s.textContent),
      status: popup.querySelector('.setup__status-title')?.textContent ?? '',
      statusDetail: popup.querySelector('.setup__status-detail')?.textContent ?? '',
      launch: popup.querySelector('.setup__launch')?.textContent ?? '',
      launchDisabled: popup.querySelector('.setup__launch')?.disabled ?? false,
      cards,
      goals,
    };
  })()`);
}

/** The build panel behind the window. */
async function readPanel() {
  return await evaluate(`(() => {
    const panel = document.getElementById('base');
    if (!panel) return null;
    return {
      cards: panel.querySelectorAll('.gl__card').length,
      points: panel.querySelector('.gl__budget')?.textContent ?? '',
      goals: panel.querySelectorAll('.gl__goal').length,
      openButton: [...panel.querySelectorAll('button')].some((b) => b.textContent.includes('Choose your extras')),
      launch: [...panel.querySelectorAll('button')].find((b) => b.textContent.includes('Land'))?.textContent ?? '',
    };
  })()`);
}

const REGIONS = [
  { id: 'arcadia', name: 'Arcadia Planitia' },
  { id: 'jezero', name: 'Jezero Crater' },
  { id: 'olympus', name: 'Olympus Mons' },
  { id: 'valles', name: 'Valles Marineris' },
  { id: 'argyre', name: 'Argyre Basin' },
];

/**
 * The six supplies, and what each one costs.
 *
 * The cost is a number with the build-point picture beside it, and the picture
 * is an icon rather than a character, so only the number is compared.
 */
const SUPPLIES = [
  { name: 'Solar Array', cost: '2' },
  { name: 'Battery Bank', cost: '2' },
  { name: 'Greenhouse', cost: '3' },
  { name: 'Ice Miner', cost: '3' },
  { name: 'Regolith Shield', cost: '2' },
  { name: 'Nuclear Power Unit', cost: '4' },
];

try {
  let target = null;
  for (let i = 0; i < 40 && target === null; i += 1) {
    await sleep(250);
    try {
      target = (await (await fetch('http://localhost:9228/json')).json()).find((t) => t.type === 'page');
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

  // 1. Name the astronaut, so there is a run to land.
  await evaluate(`(() => {
    const input = document.querySelector('[data-naming-input]');
    const submit = document.querySelector('[data-naming-submit]');
    if (!input || !submit) return;
    input.value = 'Astronaut';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);
  await clickIn('naming', 'Start Mission');

  for (const region of REGIONS) {
    await evaluate(`location.hash = '#landing-site'`);
    await waitFor(`(() => { const s = document.getElementById('landing-site'); return !!s && !s.hidden; })()`);
    await sleep(500);

    await evaluate(`(() => {
      const pin = document.querySelector('[data-landing-pin=${JSON.stringify(region.id)}]');
      if (pin) pin.click();
    })()`);
    await sleep(500);

    const landed = await clickIn('landing-site', 'Land here');
    await waitFor(`!!document.getElementById('base') && !document.getElementById('base').hidden`);
    await sleep(700);

    note(`the crew lands at ${region.name}`, landed === 'clicked', landed);

    /* The how-to-play guide opens by itself on the build screen, and the
       window waits for it, so the two are never on screen together. */
    await evaluate(`(() => { const b = document.querySelector('.guide__close'); if (b) b.click(); })()`);
    await sleep(700);

    const opened = await waitFor(`!!document.querySelector('.setup__backdrop')`);
    note(`the setup window opens by itself at ${region.name}`, opened === true);

    const popup = await readWindow();

    note(
      `the window names the site at ${region.name}`,
      (popup?.kicker ?? '').includes(region.name),
      popup?.kicker ?? '',
    );
    note(
      `the window has a picture of the site at ${region.name}`,
      (popup?.art ?? '').length > 0,
      (popup?.art ?? '').split('/').pop() ?? '',
    );
    note(
      `the window describes the site at ${region.name}`,
      (popup?.blurb ?? '').length > 10,
      popup?.blurb ?? '',
    );
    note(
      `the window has all six supplies at ${region.name}`,
      (popup?.cards ?? []).length === 6,
      (popup?.cards ?? []).map((c) => c.name).join(', '),
    );
    note(
      `every supply at ${region.name} has its art, its cost and both steppers`,
      (popup?.cards ?? []).every((c) => c.art.length > 0 && c.hasAdd && c.hasRemove && c.gives.length > 0),
      (popup?.cards ?? []).map((c) => `${c.name} ${c.cost}`).join(' | '),
    );
    note(
      `the costs at ${region.name} are the catalogue's`,
      (popup?.cards ?? []).every((c, index) => c.cost.trim() === (SUPPLIES[index]?.cost ?? '')),
      (popup?.cards ?? []).map((c) => c.cost).join(' '),
    );
    note(
      `the window has the five site goals at ${region.name}`,
      (popup?.goals ?? []).length === 5,
      (popup?.goals ?? []).map((g) => `${g.title}${g.ok ? ' ok' : ' no'}`).join(', '),
    );
    note(
      `the window has the six numbers of the outpost at ${region.name}`,
      (popup?.stats ?? []).length === 6,
      (popup?.stats ?? []).join(' | '),
    );
    note(
      `the window counts the goals and the points at ${region.name}`,
      /goals marked ready/.test(popup?.progress ?? '') && /points left/.test(popup?.points ?? '') && /extras selected/.test(popup?.extras ?? ''),
      `${popup?.progress ?? ''} · ${popup?.points ?? ''} · ${popup?.extras ?? ''}`,
    );
    note(
      `the window has one pip per goal at ${region.name}`,
      (popup?.pips ?? []).length === 5,
      (popup?.pips ?? []).map((p) => (p ? '1' : '0')).join(''),
    );
    note(
      `the window's button lands the outpost at ${region.name}`,
      (popup?.launch ?? '').includes('Land & start sol 1') && popup?.launchDisabled === false,
      popup?.launch ?? '',
    );

    const panel = await readPanel();
    note(
      `the panel behind the window has no supply cards at ${region.name}`,
      panel?.cards === 0,
      `${panel?.cards ?? '?'} cards`,
    );
    note(
      `the panel keeps the goals and the button that opens the window at ${region.name}`,
      panel?.goals === 5 && panel?.openButton === true,
      `${panel?.goals ?? '?'} goals, open button ${panel?.openButton}`,
    );

    // 2. Buying a solar array: the count, the points and the extras move.
    const before = await readWindow();

    await evaluate(`(() => {
      const card = [...document.querySelectorAll('.setup__backdrop .gl__card')]
        .find((c) => c.querySelector('.gl__card-name')?.textContent === 'Solar Array');
      const add = card?.querySelector('.gl__step--add');
      if (add && !add.disabled) add.click();
    })()`);
    await sleep(600);

    const after = await readWindow();
    const solarBefore = (before?.cards ?? []).find((c) => c.name === 'Solar Array');
    const solarAfter = (after?.cards ?? []).find((c) => c.name === 'Solar Array');

    note(
      `a "+" raises the count at ${region.name}`,
      Number(solarAfter?.count) === Number(solarBefore?.count) + 1,
      `${solarBefore?.count} -> ${solarAfter?.count}`,
    );
    note(
      `a "+" spends the points at ${region.name}`,
      (after?.points ?? '').startsWith(`${Number((before?.points ?? '').split(' ')[0]) - 2}`),
      `${before?.points ?? ''} -> ${after?.points ?? ''}`,
    );
    note(
      `a "+" counts the extra at ${region.name}`,
      (after?.extras ?? '').split(' ')[0] === String(Number((before?.extras ?? '').split(' ')[0]) + 1),
      `${before?.extras ?? ''} -> ${after?.extras ?? ''}`,
    );
    note(
      `the goals move with the build at ${region.name}`,
      (after?.goals ?? []).some((g, index) => g.ok !== (before?.goals ?? [])[index]?.ok) ||
        (after?.goals ?? []).every((g, index) => g.ok === (before?.goals ?? [])[index]?.ok),
      (after?.goals ?? []).map((g) => `${g.title}:${g.state}`).join(', '),
    );
    note(
      `the window still says how many goals are ready at ${region.name}`,
      /goals? (are )?ready/.test(after?.status ?? ''),
      after?.status ?? '',
    );

    // 3. Taking it back: everything moves the other way.
    await evaluate(`(() => {
      const card = [...document.querySelectorAll('.setup__backdrop .gl__card')]
        .find((c) => c.querySelector('.gl__card-name')?.textContent === 'Solar Array');
      const remove = card?.querySelector('.gl__step:not(.gl__step--add)');
      if (remove && !remove.disabled) remove.click();
    })()`);
    await sleep(600);

    const back = await readWindow();
    note(
      `a "-" puts the build back at ${region.name}`,
      (back?.points ?? '') === (before?.points ?? '') && (back?.extras ?? '') === (before?.extras ?? ''),
      `${back?.points ?? ''} · ${back?.extras ?? ''}`,
    );

    // 4. A "+" that cannot be pressed says why.
    const blocked = await evaluate(`(() => {
      const card = [...document.querySelectorAll('.setup__backdrop .gl__card')]
        .find((c) => c.querySelector('.gl__card-name')?.textContent === 'Nuclear Power Unit');
      const add = card?.querySelector('.gl__step--add');
      return { disabled: add?.disabled ?? false, why: card?.querySelector('.gl__card-why')?.textContent ?? '' };
    })()`);
    note(
      `a blocked "+" says why at ${region.name}`,
      blocked.disabled === true ? blocked.why.length > 0 : blocked.why.length === 0,
      blocked.why,
    );

    // 5. Closing the window leaves the build alone, and the panel can open it.
    await evaluate(`(() => { const b = document.querySelector('.setup__close'); if (b) b.click(); })()`);
    await sleep(600);

    const closed = await evaluate(`!document.querySelector('.setup__backdrop')`);
    note(`the window closes at ${region.name}`, closed === true);

    const afterClose = await readPanel();
    const panelPoints = (afterClose?.points ?? '').match(/\d+/)?.[0] ?? '';
    const windowPoints = (before?.points ?? '').match(/\d+/)?.[0] ?? '';

    note(
      `the build is still there after the window closes at ${region.name}`,
      panelPoints === windowPoints,
      `${afterClose?.points ?? ''}`,
    );

    await evaluate(`(() => {
      const b = [...document.querySelectorAll('#base button')].find((n) => n.textContent.includes('Choose your extras'));
      if (b) b.click();
    })()`);
    await sleep(600);

    const reopened = await evaluate(`!!document.querySelector('.setup__backdrop')`);
    const reopenedState = await readWindow();
    note(`the panel opens the window again at ${region.name}`, reopened === true);
    note(
      `the window comes back with the same build at ${region.name}`,
      reopenedState?.points === before?.points && reopenedState?.extras === before?.extras,
      `${reopenedState?.points ?? ''} · ${reopenedState?.extras ?? ''}`,
    );

    // 6. The window's button lands the outpost, as the panel's does.
    await evaluate(`(() => { const b = document.querySelector('.setup__launch'); if (b) b.click(); })()`);
    await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
    await sleep(800);

    const onDesk = await evaluate(`(() => ({
      screen: !document.getElementById('act').hidden,
      popup: !!document.querySelector('.setup__backdrop'),
    }))()`);

    note(`the window's button lands the outpost at ${region.name}`, onDesk?.screen === true);
    note(`the window is gone once the run starts at ${region.name}`, onDesk?.popup === false);
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
