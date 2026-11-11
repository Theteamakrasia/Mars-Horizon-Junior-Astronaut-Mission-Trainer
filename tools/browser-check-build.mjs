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

/**
 * Play whichever tool the desk gave us.
 *
 * There are six of them and they are six different tasks, so the check has
 * to work the one it was handed rather than assume the first: the checklist
 * (press the steps in order), the timing (stop the marker in the safe band),
 * the radar (ping until one square is hot), the sorting (keep the good
 * ones), the matching (give every tool its job) and the packing (fill the
 * pod).
 *
 * Each is played as well as it can be, so the check proves the whole loop -
 * open, work, finish, stars - and not only the first step of it.
 */
async function workTheTool() {
  /* The checklist: press the steps in the order they are shown. */
  const steps = await evaluate(`[...document.querySelectorAll('#act .insp__step')].map((n) => n.textContent)`);

  if (steps.length > 0) {
    for (const step of steps) {
      await evaluate(`(() => { const b = [...document.querySelectorAll('#act .insp__step')].find((n) => n.textContent === ${JSON.stringify(step)}); if (b) b.click(); })()`);
      await sleep(120);
    }

    return 'checklist';
  }

  /* The radar: ping squares until one of them is hot. */
  const cells = await evaluate(`document.querySelectorAll('#act .insp__cell').length`);

  if (cells > 0) {
    for (let index = 0; index < cells; index += 1) {
      const hot = await evaluate(`(() => {
        const cell = document.querySelectorAll('#act .insp__cell')[${index}];
        if (!cell) return true;
        cell.click();
        return cell.textContent === '★';
      })()`);

      await sleep(90);

      if (hot) break;
    }

    return 'radar';
  }

  /* The timing: stop the marker while it is inside the safe band. */
  const hasStop = await evaluate(`!!document.querySelector('#act .insp__stop')`);

  if (hasStop) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const inBand = await evaluate(`(() => {
        const marker = document.querySelector('#act .insp__marker');
        const band = document.querySelector('#act .insp__band');
        const stop = document.querySelector('#act .insp__stop');
        if (!marker || !band || !stop) return true;
        const at = parseFloat(marker.style.left);
        const from = parseFloat(band.style.left);
        const wide = parseFloat(band.style.width);
        if (!Number.isNaN(at) && at >= from && at <= from + wide) {
          stop.click();
          return true;
        }
        return false;
      })()`);

      if (inBand) break;

      await sleep(30);
    }

    return 'timing';
  }

  /* The matching: give every tool its job. */
  const selects = await evaluate(`document.querySelectorAll('#act .insp__select').length`);

  if (selects > 0) {
    await evaluate(`(() => {
      const wanted = { Radar: 'ice', Drill: 'samples', Generator: 'electricity', Greenhouse: 'food' };
      for (const select of document.querySelectorAll('#act .insp__select')) {
        const row = select.closest('.insp__pair');
        const left = row?.querySelector('.insp__pair-left')?.textContent ?? '';
        const key = Object.keys(wanted).find((name) => left.includes(name));
        if (key === undefined) continue;
        const option = [...select.options].find((o) => o.value !== '' && o.value.toLowerCase().includes(wanted[key]));
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    })()`);
    await sleep(200);

    return 'matching';
  }

  /* The sorting and the packing both use a list of items, so the question
     on screen is what tells them apart. */
  const items = await evaluate(`[...document.querySelectorAll('#act .insp__item')].map((n) => n.textContent)`);

  if (items.length > 0) {
    const ask = await evaluate(`document.querySelector('#act .insp__ask')?.textContent ?? ''`);

    if (ask.includes('pod')) {
      /* The packing: one light, useful thing. The pod can take 12 kg and the
         best possible load is worth about 20, so one seed is a light pod -
         enough to prove the tool was worked and graded. */
      await evaluate(`(() => { const b = [...document.querySelectorAll('#act .insp__item')].find((n) => n.textContent.includes('Seeds')); if (b) b.click(); })()`);
      await sleep(150);

      return 'packing';
    }

    /* The sorting: keep the three worth keeping and leave the rest. */
    const keep = ['Ice under the soil', 'Piled regolith', 'sealed rock core'];

    for (const label of keep) {
      await evaluate(`(() => { const b = [...document.querySelectorAll('#act .insp__item')].find((n) => n.textContent.includes(${JSON.stringify(label)})); if (b) b.click(); })()`);
      await sleep(100);
    }

    return 'sorting';
  }

  return 'none';
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
  //    build screen, and the help button in the header brings it back.
  const guide = await evaluate(`(() => {
    const panel = document.querySelector('#base .gl__guide');
    return {
      open: !!panel,
      steps: panel ? panel.querySelectorAll('.gl__guide-step').length : 0,
      button: !!document.querySelector('#base .gl__icon-button[aria-label="How to play"]'),
      book: !!document.querySelector('#base .gl__icon-button[aria-label="Encyclopedia"]'),
    };
  })()`);

  note('the guide is open on the first build screen', guide.open === true);
  note('and it has steps in it', guide.steps >= 8, `${guide.steps} steps`);
  note('the header has a button to bring it back', guide.button === true);
  note('and the encyclopedia is one click away in the header', guide.book === true);

  await evaluate(`(() => { const b = document.querySelector('#base .gl__guide-close'); if (b) b.click(); })()`);
  await sleep(400);
  note('and it can be closed', (await evaluate(`!document.querySelector('#base .gl__guide')`)) === true);

  await evaluate(`(() => { const b = document.querySelector('#base .gl__icon-button[aria-label="How to play"]'); if (b) b.click(); })()`);
  await sleep(400);
  note('and opened again', (await evaluate(`!!document.querySelector('#base .gl__guide')`)) === true);

  await evaluate(`(() => { const b = document.querySelector('#base .gl__guide-close'); if (b) b.click(); })()`);
  await sleep(300);

  // 8. The desk is a hub: six buttons, each a label and one line of state.
  await clickIn('base', 'Land & start sol 1');
  await waitFor(`!!document.getElementById('act') && !document.getElementById('act').hidden`);
  await sleep(1200);

  /** Open one of the hub's sections, and wait for its sheet. */
  const openTile = async (id) => {
    await evaluate(`(() => { const b = document.querySelector('#act .act-tile[data-tile="${id}"]'); if (b) b.click(); })()`);
    await sleep(500);

    return evaluate(`!!document.querySelector('#act .sheet__card')`);
  };

  /** Close whatever sheet is open. */
  const closeSheet = async () => {
    await evaluate(`(() => { const b = document.querySelector('#act .sheet__done'); if (b) b.click(); })()`);
    await sleep(400);
  };

  const hub = await evaluate(`(() => {
    const tiles = [...document.querySelectorAll('#act .act-tile')];
    return {
      count: tiles.length,
      ids: tiles.map((tile) => tile.dataset.tile),
      silent: tiles.filter((tile) => (tile.querySelector('.act-tile__status')?.textContent ?? '').trim() === '').length,
      points: document.querySelector('#act .act-points')?.textContent ?? '',
      kicker: document.querySelector('#act .gl__panel .gl__kicker')?.textContent ?? '',
      bar: !!document.querySelector('#act .gl__mission'),
    };
  })()`);

  /* Five on the first sol: the review has nothing to review until a sol runs,
     and a button that says "nothing yet" is a fifth thing to read for nothing. */
  note('the desk is five buttons before the first sol', hub?.count === 5, `${hub?.count} buttons`);
  note(
    'the five are the day, the desk, the rules, the stats and the data',
    ['tasks', 'desk', 'orders', 'stats', 'data'].every((id) => (hub?.ids ?? []).includes(id)),
    (hub?.ids ?? []).join(', '),
  );
  note(
    'every button says what is behind it',
    hub?.silent === 0,
    `${hub?.silent ?? '?'} with no state`,
  );
  note('the mission bar is gone', hub?.bar === false);
  note('the sol count is the panel kicker', (hub?.kicker ?? '').startsWith('Sol '), hub?.kicker ?? '');
  note('and the science points are in its corner', /\d+\s*points/.test(hub?.points ?? ''), hub?.points ?? '');

  // 9. The work orders, behind their button.
  const tasksOpen = await openTile('tasks');
  const desk = await evaluate(`(() => ({
    orders: document.querySelectorAll('#act .act-order').length,
    checks: document.querySelectorAll('#act .act-check').length,
  }))()`);

  note('the tasks button opens the work orders', tasksOpen === true);
  note('there are three work orders on the desk', desk?.orders === 3, `${desk?.orders} orders`);
  note('every work order carries two checks', desk?.checks === 6, `${desk?.checks} checks`);

  // 10. Pick one, then work it with the tool it carries.
  const picked = await evaluate(`(() => {
    const b = document.querySelector('#act .act-order:not([disabled])');
    if (!b) return 'missing';
    b.click();
    return 'clicked';
  })()`);
  note('an order can be stamped', picked === 'clicked', picked);
  await sleep(500);

  const opened = await evaluate(`(() => {
    const b = document.querySelector('#act .insp__open:not([disabled])');
    if (!b) return 'missing';
    b.click();
    return 'clicked';
  })()`);
  note('an order can be worked with a tool', opened === 'clicked', opened);

  if (opened === 'clicked') {
    await sleep(600);

    const tool = await workTheTool();

    await evaluate(`(() => { const b = document.querySelector('#act .insp__finish'); if (b) b.click(); })()`);
    await sleep(700);

    const stars = await evaluate(`(() => {
      const result = document.querySelector('#act .insp__result');
      if (!result) return null;
      return {
        count: result.dataset.stars ?? '',
        label: result.getAttribute('aria-label') ?? '',
        lit: result.querySelectorAll('.insp__stars .ico:not(.insp__star--empty)').length,
        empty: result.querySelectorAll('.insp__stars .insp__star--empty').length,
      };
    })()`);

    note('working the tool shows the stars', stars !== null && stars.lit + stars.empty === 3, `${tool}: ${stars?.label ?? 'nothing'}`);
    note('and the stars are counted', ['0', '1', '2', '3'].includes(stars?.count ?? ''), stars?.count ?? '');
  }

  await closeSheet();

  // 11. The standing orders, behind their button.
  const ordersOpen = await openTile('orders');
  const board = await evaluate(`(() => ({
    rows: document.querySelectorAll('#act .act-board__row').length,
    fresh: document.querySelectorAll('#act .act-board__row[data-new="true"]').length,
  }))()`);

  note('the orders button opens the rule book', ordersOpen === true);
  note('the standing orders are on the board', (board?.rows ?? 0) > 0, `${board?.rows} rules`);
  note("and today's are marked new", board?.fresh === 2, `${board?.fresh} new`);

  await closeSheet();

  // 12. The colony stats, behind their button.
  await openTile('stats');
  const meters = await evaluate(`document.querySelectorAll('#act .act-meter__row').length`);
  note('the stats button opens the five systems', meters === 5, `${meters} meters`);
  await closeSheet();

  // 12b. The real NASA data, behind its button. It used to show one picture
  //      while the game owned a region's photo, the live flare readings and
  //      forty facts (ISS-070).
  await openTile('data');
  const realData = await evaluate(`(() => ({
    cards: document.querySelectorAll('#act .nasa-card').length,
    kickers: [...document.querySelectorAll('#act .nasa-card__kicker')].map((n) => n.textContent),
    weather: document.querySelectorAll('#act .act-weather__row').length,
    facts: document.querySelectorAll('#act .act-fact').length,
    sections: [...document.querySelectorAll('#act .sheet__body .gl__label')].map((n) => n.textContent),
    tile: document.querySelector('#act .act-tile[data-tile="data"] .act-tile__status')?.textContent ?? '',
  }))()`);

  note('the data button opens the NASA layer', (realData?.cards ?? 0) > 0, `${realData?.cards ?? 0} cards`);
  note('and it shows more than one picture', (realData?.cards ?? 0) > 1, `${realData?.cards ?? 0} pictures`);
  note("including the landing site's own photo", (realData?.kickers ?? []).some((label) => label.includes('landing site')), (realData?.kickers ?? []).join(' | '));
  note('the real space weather is in there', (realData?.sections ?? []).some((label) => label.includes('space weather')), (realData?.sections ?? []).join(' | '));
  note('and there are NASA facts to read', (realData?.facts ?? 0) >= 2, `${realData?.facts ?? 0} facts`);
  note('the button says what is behind it', /\d+\s*picture/.test(realData?.tile ?? ''), realData?.tile ?? '');

  await closeSheet();

  // 13. Run a sol, and the review lands on the hub.
  await clickIn('act', 'Run sol');
  await sleep(1400);

  /* A crisis replaces the hub on the next sol, so the check asks for the hub
     only when the hub is actually there. */
  const crisis = await evaluate(`!!document.querySelector('#act .gl__choices')`);
  note('the sol ran', crisis || (await evaluate(`!!document.querySelector('#act .act-tile')`)));

  /* The forecast's timetable is rolled per page load (D-048), so a crisis
     lands on the next sol some of the time and the hub is not there. The
     player resolves the crisis and the hub comes back, so the check does the
     same rather than failing on the runs that had one. */
  if (crisis) {
    await evaluate(`(() => { const b = document.querySelector('#act .gl__choice'); if (b) b.click(); })()`);
    await sleep(900);
  }

  if (!crisis) {
    const review = await evaluate(`(() => {
      const tile = document.querySelector('#act .act-tile[data-tile="review"]');
      return {
        tiles: document.querySelectorAll('#act .act-tile').length,
        label: tile?.querySelector('.act-tile__label')?.textContent ?? '',
        chips: tile ? tile.querySelectorAll('.act-chip').length : 0,
      };
    })()`);

    note('a sol adds the review button, so the desk is six', review?.tiles === 6, `${review?.tiles} buttons`);
    note('the review button names the sol it reviews', (review?.label ?? '').includes('in review'), review?.label ?? '');
    note('and the net change is printed on the button itself', (review?.chips ?? 0) > 0, `${review?.chips} chips`);

    await openTile('review');
    const change = await evaluate(`document.querySelectorAll('#act .act-change').length`);
    note('the review opens onto what the sol changed', change > 0, `${change} changes`);
    await closeSheet();
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
