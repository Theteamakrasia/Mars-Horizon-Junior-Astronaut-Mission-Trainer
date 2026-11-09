/**
 * The act screen: the sol-by-sol simulation.
 *
 * Turn-based. The player presses one button to run a sol; the only clock in the
 * game is the countdown on a crisis, and a "take your time" switch turns that off.
 * All rules are in `src/sim/`, so this file only draws state and forwards choices.
 *
 * Crisis choices (D-029) are a deliberate exception to D-018's "no mid-sol
 * choices": three forecast events stop the clock and ask. Every option costs
 * something, and Earth's reply is delayed in proportion to the sol.
 */

import { loadForecast } from '../../dom/forecastLoader';
import { clear, h } from '../../dom/h';
import { earthAdvice, earthIsInTime, optionOf, pendingCrisis, type Crisis } from '../../sim/crises';
import { oneWayMinutes, roundTripMinutes } from '../../sim/comms';
import { withState, type RunState } from '../../sim/run';
import { siteScore, regionById, SITE_AXES } from '../../sim/regions';
import { advanceSol, decide, powerPicture, WIN_SOL } from '../../sim/sol';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import '../../styles/game.css';
import './act.css';

import bgDayUrl from '../../../Assets/images/game-loop/bg-day.png';
import batteryUrl from '../../../Assets/images/game-loop/battery-bank.png';
import habitatUrl from '../../../Assets/images/game-loop/habitat.png';
import solarUrl from '../../../Assets/images/game-loop/solar.png';
import iceMinerUrl from '../../../Assets/images/game-loop/ice-miner.png';
import greenhouseUrl from '../../../Assets/images/game-loop/green-house.png';
import regolithUrl from '../../../Assets/images/game-loop/regolith-sheild.png';
import lifeSupportUrl from '../../../Assets/images/game-loop/life-support.png';

import { meterRows, missionHeadline, powerSentence, progressPercent, secondsLeft } from './model';

const AXIS_NAMES: Readonly<Record<string, string>> = { water: 'Water', sun: 'Sun', terrain: 'Terrain', dust: 'Dust', temp: 'Warmth' };

/** The artwork shown beside each resource meter. */
const RESOURCE_IMAGE: Readonly<Record<string, string>> = {
  power: batteryUrl,
  oxygen: lifeSupportUrl,
  water: iceMinerUrl,
  food: greenhouseUrl,
  shielding: regolithUrl,
};

/** The artwork shown at the top of a crisis dialog, by crisis kind. */
const CRISIS_IMAGE: Readonly<Record<string, string>> = {
  flare: solarUrl,
  storm: regolithUrl,
  'supply-pod': habitatUrl,
};

export function mountAct(
  mount: HTMLElement,
  initial: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  let run = initial;
  let disposed = false;
  let timer: number | null = null;
  let overlay: HTMLElement | null = null;
  let loadingForecast = false;
  let calmMode = false;
  const controller = new AbortController();

  mount.classList.add('gx', 'act');
  mount.style.background = `linear-gradient(rgba(7, 14, 18, 0.86), rgba(7, 14, 18, 0.94)), url(${bgDayUrl}) center / cover no-repeat`;

  function stopTimer(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function closeOverlay(): void {
    stopTimer();
    overlay?.remove();
    overlay = null;
  }

  function step(): void {
    if (run === null) return;

    run = advanceSol(run);
    setRun(run);

    if (run.status !== 'active') {
      navigate(nextStop('act') ?? 'debrief');

      return;
    }

    render();
  }

  function choose(crisis: Crisis, optionId: string, timedOut: boolean): void {
    if (run === null) return;

    closeOverlay();
    run = decide(run, crisis.id, optionId, timedOut);
    setRun(run);
    step();
  }

  function openCrisis(crisis: Crisis): void {
    if (run === null) return;

    const current = run;
    const sol = current.sol + 1;
    const inTime = earthIsInTime(current, crisis);
    const clockBar = h('span');
    const clockText = h('p', { class: 'gx__note', 'aria-hidden': 'true' });
    const earthBox = h('div', { class: 'act__earth', 'aria-live': 'polite', hidden: true });
    const options = h('div', { class: 'act__options' });

    for (const option of crisis.options) {
      const button = h('button', { class: 'gx__btn act__option', type: 'button', 'data-choice': option.id }, h('strong', { text: option.label }), h('span', { text: option.detail }));

      button.addEventListener('click', () => choose(crisis, option.id, false));
      options.append(button);
    }

    const ask = h('button', { class: 'gx__btn gx__btn--ghost', type: 'button' }, 'Ask Mission Control');

    ask.addEventListener('click', () => {
      earthBox.hidden = false;

      if (!inTime) {
        earthBox.textContent = `Earth is ${oneWayMinutes(sol)} minutes away each way. A reply would take ${roundTripMinutes(sol)} minutes, and this problem arrives in ${crisis.windowMinutes}. You are on your own: the crew has to decide.`;

        return;
      }

      const advice = earthAdvice(current, crisis);
      const label = optionOf(crisis, advice.optionId)?.label ?? advice.optionId;

      earthBox.textContent = `Mission Control, ${roundTripMinutes(sol)} minutes later: ${advice.text} (They suggest: ${label}.)`;
    });

    const calm = h('input', { type: 'checkbox', id: 'act-calm' });

    calm.checked = calmMode;
    calm.addEventListener('change', () => {
      calmMode = calm.checked;
      if (calmMode) {
        stopTimer();
        clockBar.style.width = '100%';
        clockText.textContent = 'Take your time.';
      } else {
        startClock();
      }
    });

    function startClock(): void {
      if (crisis.countdownSeconds === null || calmMode) return;

      const total = crisis.countdownSeconds;
      const began = performance.now();

      stopTimer();
      timer = window.setInterval(() => {
        const elapsed = performance.now() - began;

        clockBar.style.width = `${Math.max(0, 100 - (elapsed / (total * 1000)) * 100)}%`;
        clockText.textContent = `${secondsLeft(total, elapsed)} seconds left. If the clock runs out, nothing is done.`;

        if (elapsed >= total * 1000) choose(crisis, crisis.defaultOptionId, true);
      }, 100);
    }

    overlay = h(
      'div',
      { class: 'act__overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': crisis.title },
      h(
        'div',
        { class: 'act__dialog' },
        h('img', { class: 'act__crisis-img', src: CRISIS_IMAGE[crisis.kind], alt: '' }),
        h('p', { class: 'gx__kicker', text: crisis.urgent ? `Sol ${sol}: decide now` : `Sol ${sol}: decide` }),
        h('h2', { class: 'gx__title', text: crisis.title }),
        h('p', { text: crisis.prompt }),
        crisis.urgent ? h('div', { class: 'act__clock' }, clockBar) : null,
        crisis.urgent ? clockText : null,
        options,
        h('div', { class: 'act__go' }, ask, crisis.urgent ? h('label', null, calm, ' Take your time (no countdown)') : null),
        earthBox,
      ),
    );

    mount.append(overlay);
    overlay.querySelector<HTMLElement>('.act__option')?.focus();
    startClock();
  }

  function onRunSol(): void {
    if (run === null) return;

    const crisis = pendingCrisis(run);

    if (crisis === null) step();
    else openCrisis(crisis);
  }

  function notice(text: string, label: string, route: 'landing-site' | 'base'): void {
    const button = h('button', { class: 'gx__btn gx__btn--primary', type: 'button' }, label);

    button.addEventListener('click', () => navigate(route));
    mount.replaceChildren(h('header', { class: 'gx__top' }, h('h1', { class: 'gx__title', text: 'Not ready yet' })), h('p', { text }), h('div', null, button));
  }

  function render(): void {
    if (run === null || run.regionId === '') {
      notice('Pick a landing site first.', 'Choose a landing site', 'landing-site');

      return;
    }

    if (run.modules.length === 0) {
      notice('Build your outpost before the first sol.', 'Build the outpost', 'base');

      return;
    }

    const state = run;
    const mission = missionHeadline(state);
    const region = regionById(state.regionId);
    const score = siteScore(state.regionId);
    const power = powerPicture(state);
    const last = state.log[state.log.length - 1];

    // ---- Resource meters.
    const meters = h('section', { class: 'gx__panel', 'aria-label': 'Resources' }, h('h2', { class: 'gx__h', text: 'Resources' }));

    for (const row of meterRows(state)) {
      meters.append(
        h(
          'div',
          { class: 'gx__meter', 'data-tone': row.tone, role: 'meter', 'aria-label': row.label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(row.percent) },
          h('span', { class: 'gx__meter-label' }, h('img', { class: 'gx__meter-icon', src: RESOURCE_IMAGE[row.name], alt: '' }), row.label),
          h('span', { class: 'gx__meter-bar' }, h('span', { class: 'gx__meter-fill', style: `width:${row.percent}%` })),
          h('span', { class: 'gx__meter-val', text: `${row.percent}%` }),
        ),
      );
    }

    // ---- The trade-off picture: the README's sun, arrays, battery, night.
    const picture = h(
      'section',
      { class: 'gx__panel' },
      h('h2', { class: 'gx__h', text: 'Power: day against night' }),
      h(
        'div',
        { class: 'act__picture', 'aria-hidden': 'true' },
        h('div', null, '☀️', h('strong', { text: `+${power.generatedKw} kW` }), 'panels, daytime'),
        h('div', null, '🔋', h('strong', { text: `${power.storedKwh}` }), `of ${power.capacityKwh} kWh stored`),
        h('div', null, '🌙', h('strong', { text: `−${power.nightDrainKw} kW` }), 'drain at night'),
        h('div', null, '🧑‍🚀', h('strong', { text: `${state.panelHealth < 1 ? Math.round(state.panelHealth * 100) : 100}%` }), 'panel health'),
      ),
      h('p', { class: 'gx__note', text: powerSentence(power.generatedKw, power.storedKwh, power.nightDrainKw) }),
    );

    // ---- Conditions and forecast.
    const conditions = h(
      'section',
      { class: 'gx__panel' },
      h('h2', { class: 'gx__h', text: `Conditions at ${region?.name ?? 'your site'}` }),
      h('p', { text: SITE_AXES.map((axis) => `${AXIS_NAMES[axis]} ${score[axis]}/5`).join(' · ') }),
    );

    const forecastList = h('ul', { class: 'act__list' });

    for (const event of state.forecast.filter((entry) => entry.sol > state.sol)) {
      forecastList.append(h('li', null, `Sol ${event.sol}: `, event.summary, event.approximate ? ' ' : null, event.approximate ? h('span', { class: 'gx__tag', text: 'approximate' }) : null));
    }

    const forecast = h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'Forecast' }), forecastList.childElementCount > 0 ? forecastList : h('p', { text: 'Nothing else is coming. Keep the numbers steady.' }));

    // ---- What happened last sol.
    const happened = h('section', { class: 'gx__panel', 'aria-live': 'polite' }, h('h2', { class: 'gx__h', text: last ? `What happened on sol ${last.sol}` : 'Before the first sol' }));

    if (last === undefined) {
      happened.append(h('p', { text: 'Your outpost has landed. Read the forecast, then run the first sol.' }));
    } else {
      const list = h('ul', { class: 'act__list' });

      for (const event of last.events) list.append(h('li', { text: event.summary }));
      for (const note of last.notes) list.append(h('li', { text: note }));
      if (list.childElementCount === 0) list.append(h('li', { text: 'A quiet sol. Everything ran as expected.' }));
      happened.append(list);
    }

    const waiting = loadingForecast && state.forecast.length === 0;
    const go = h('button', { class: 'gx__btn gx__btn--primary', type: 'button', disabled: waiting }, waiting ? 'Reading space weather…' : `Run sol ${state.sol + 1}`);

    go.addEventListener('click', onRunSol);

    clear(mount);
    mount.append(
      h(
        'header',
        { class: 'gx__top' },
        h('div', null, h('p', { class: 'gx__kicker', text: `Sol ${state.sol} of ${WIN_SOL}` }), h('h1', { class: 'gx__title', text: mission.title }), h('p', { class: 'gx__sub', text: mission.subtitle })),
        h('div', { class: 'act__go' }, go),
      ),
      h('div', { class: 'act__progress', role: 'progressbar', 'aria-label': 'Mission progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(progressPercent(state)) }, h('span', { style: `width:${progressPercent(state)}%` })),
      h('div', { class: 'act__body' }, h('div', { class: 'act__col' }, meters, picture, conditions), h('div', { class: 'act__col' }, happened, forecast)),
    );

    if (overlay !== null) mount.append(overlay);
  }

  render();

  if (run !== null && run.modules.length > 0 && run.forecast.length === 0) {
    loadingForecast = true;
    render();

    void loadForecast(controller.signal).then((result) => {
      if (disposed || run === null) return;

      loadingForecast = false;
      run = withState(run, { forecast: result.forecast });
      setRun(run);
      render();
    });
  }

  return () => {
    disposed = true;
    controller.abort();
    closeOverlay();
    mount.classList.remove('gx', 'act');
    mount.replaceChildren();
  };
}
