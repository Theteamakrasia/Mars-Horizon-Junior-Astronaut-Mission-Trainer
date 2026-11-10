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
 *
 * The steps follow the game-loop frames: `66:20` for a normal sol, `66:26` for a
 * crisis, where the decision replaces the mission panel instead of covering the
 * whole screen.
 */

import { loadForecast } from '../../dom/forecastLoader';
import { h } from '../../dom/h';
import { earthAdvice, earthIsInTime, optionOf, pendingCrisis, type Crisis } from '../../sim/crises';
import { oneWayMinutes, roundTripMinutes } from '../../sim/comms';
import { withState, type RunState } from '../../sim/run';
import { siteScore, regionById, SITE_AXES } from '../../sim/regions';
import { advanceSol, decide, powerPicture, WIN_SOL } from '../../sim/sol';
import { gamePanel, gameScreen, gameSection, gameWorld, moduleArt, moduleFigures, type HudStat } from '../../ui/gameLoop';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import { meterRows, missionHeadline, powerSentence, secondsLeft } from './model';

import '../../styles/game-loop.css';
import './act.css';

const AXIS_NAMES: Readonly<Record<string, string>> = { water: 'Water', sun: 'Sun', terrain: 'Terrain', dust: 'Dust', temp: 'Warmth' };

/** What the crew calls each forecast event. */
const EVENT_NAME: Readonly<Record<Crisis['kind'], string>> = {
  flare: 'Solar flare',
  storm: 'Dust storm',
  'supply-pod': 'Supply pod',
};

const EVENT_ICON: Readonly<Record<Crisis['kind'], string>> = {
  flare: '☀',
  storm: '🌪',
  'supply-pod': '📦',
};

/** The one-line picture on the crisis card, and what the crew says about it. */
const CRISIS_BRIEF: Readonly<Record<Crisis['kind'], { readonly signal: string; readonly crew: string }>> = {
  flare: { signal: 'Radiation is coming. Shield your crew.', crew: "The Sun is sending a burst of radiation. What's our plan?" },
  storm: { signal: 'Dust is coming. Protect the panels.', crew: 'Dust is rolling in fast. The panels are wide open.' },
  'supply-pod': { signal: 'It landed nearby. Choose what to unpack.', crew: 'A pod from Earth touched down. What do we need most?' },
};

/** The artwork for each option, in order: two pictures, then a tool glyph. */
const CRISIS_ART: Readonly<Record<Crisis['kind'], readonly { readonly src?: string; readonly glyph?: string }[]>> = {
  flare: [{ src: moduleArt('habitat') }, { src: moduleArt('regolith-shield') }, { glyph: '🛠' }],
  storm: [{ src: moduleArt('solar-array') }, { src: moduleArt('greenhouse') }, { glyph: '🛠' }],
  'supply-pod': [{ src: moduleArt('habitat') }, { glyph: '📦' }, { glyph: '🛠' }],
};

export function mountAct(
  mount: HTMLElement,
  initial: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  let run = initial;
  let disposed = false;
  let timer: number | null = null;
  let calmMode = false;
  let loadingForecast = false;
  let focusedCrisis: string | null = null;
  let clockNodes: { readonly bar: HTMLElement; readonly text: HTMLElement } | null = null;
  let pendingFocus: HTMLElement | null = null;
  const controller = new AbortController();

  function stopTimer(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
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

    stopTimer();
    run = decide(run, crisis.id, optionId, timedOut);
    setRun(run);
    step();
  }

  function startClock(crisis: Crisis): void {
    stopTimer();

    if (crisis.countdownSeconds === null || calmMode || clockNodes === null) return;

    const total = crisis.countdownSeconds;
    const began = performance.now();

    timer = window.setInterval(() => {
      if (clockNodes === null) return;

      const elapsed = performance.now() - began;

      clockNodes.bar.style.width = `${Math.max(0, 100 - (elapsed / (total * 1000)) * 100)}%`;
      clockNodes.text.textContent = `${secondsLeft(total, elapsed)} seconds left. If the clock runs out, nothing is done.`;

      if (elapsed >= total * 1000) choose(crisis, crisis.defaultOptionId, true);
    }, 100);
  }

  function onRunSol(): void {
    if (run === null) return;

    const crisis = pendingCrisis(run);

    if (crisis === null) step();
    else render();
  }

  /** The five resource cards, from the same rows the old meters used. */
  function hudFor(state: RunState): readonly HudStat[] {
    const toneOf = (tone: string): HudStat['tone'] => (tone === 'critical' ? 'bad' : tone === 'low' ? 'warn' : 'ok');

    return meterRows(state).map((row) => ({
      icon: row.emoji,
      label: row.label,
      value: `${row.percent}%`,
      percent: row.percent,
      tone: toneOf(row.tone),
    }));
  }

  function forecastSection(state: RunState): HTMLElement {
    const upcoming = state.forecast.filter((event) => event.sol > state.sol).slice(0, 3);
    const triple = h('div', { class: 'gl__triple' });

    for (const event of upcoming) {
      triple.append(
        h(
          'div',
          { class: 'gl__mini' },
          h('span', { class: 'gl__mini-label' }, h('span', { 'aria-hidden': 'true', text: EVENT_ICON[event.kind] }), `Sol ${event.sol}`),
          h('span', { class: 'gl__mini-value', text: EVENT_NAME[event.kind] }),
          h('span', { class: 'gl__mini-detail', text: event.approximate ? `${event.summary} (approximate)` : event.summary }),
        ),
      );
    }

    if (upcoming.length === 0) {
      triple.append(h('p', { class: 'gl__note', text: 'Nothing else is coming. Keep the numbers steady.' }));
    }

    return gameSection('Coming up', triple);
  }

  /** A normal sol: what the day costs, what is coming, what happened last. */
  function missionPanel(state: RunState): HTMLElement {
    const mission = missionHeadline(state);
    const region = regionById(state.regionId);
    const score = siteScore(state.regionId);
    const power = powerPicture(state);
    const last = state.log[state.log.length - 1];
    const waiting = loadingForecast && state.forecast.length === 0;

    const callout = h(
      'div',
      { class: 'gl__callout' },
      h('span', { class: 'gl__callout-icon', 'aria-hidden': 'true', text: '🏠' }),
      h(
        'div',
        null,
        h('p', { class: 'gl__callout-title', text: `Sol ${state.sol + 1} at ${region ? region.name : 'your site'}` }),
        h('p', { class: 'gl__callout-detail', text: powerSentence(power.generatedKw, power.storedKwh, power.nightDrainKw) }),
      ),
    );

    const dayNight = h(
      'div',
      { class: 'gl__triple', 'aria-hidden': 'true' },
      h('div', { class: 'gl__mini' }, h('span', { class: 'gl__mini-label', text: '☀ Daytime' }), h('span', { class: 'gl__mini-value', text: `+${power.generatedKw} kW` }), h('span', { class: 'gl__mini-detail', text: 'panels in sunlight' })),
      h('div', { class: 'gl__mini' }, h('span', { class: 'gl__mini-label', text: '🔋 Stored' }), h('span', { class: 'gl__mini-value', text: `${power.storedKwh} kWh` }), h('span', { class: 'gl__mini-detail', text: `of ${power.capacityKwh}` })),
      h('div', { class: 'gl__mini' }, h('span', { class: 'gl__mini-label', text: '🌙 Night use' }), h('span', { class: 'gl__mini-value', text: `−${power.nightDrainKw} kW` }), h('span', { class: 'gl__mini-detail', text: 'from the batteries' })),
    );

    const body: (Node | false)[] = [
      callout,
      gameSection('Day → Night', dayNight),
      h('p', { class: 'gl__note', text: `${region ? region.name : 'Your site'}: ${SITE_AXES.map((axis) => `${AXIS_NAMES[axis]} ${score[axis]}/5`).join(' · ')}` }),
      forecastSection(state),
    ];

    if (last !== undefined) {
      const items = [...last.events.map((event) => event.summary), ...last.notes];
      const list = h('ul', { class: 'gl__list' });

      for (const item of items.length > 0 ? items : ['A quiet sol. Everything ran as expected.']) list.append(h('li', { text: item }));

      body.push(gameSection(`What happened on sol ${last.sol}`, list));
    }

    body.push(h('p', { class: 'gl__note', text: 'Sol = one Mars day. You control when it runs.' }));

    const go = h(
      'button',
      { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button', disabled: waiting },
      waiting ? 'Reading space weather…' : `Run sol ${state.sol + 1}`,
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );

    go.addEventListener('click', onRunSol);

    return gamePanel({
      kicker: `Sol ${state.sol} of ${WIN_SOL}`,
      title: mission.title,
      sub: mission.subtitle,
      body,
      footer: [go],
    });
  }

  /** A crisis: the same shell, with the decision where the mission panel was. */
  function crisisPanel(state: RunState, crisis: Crisis): HTMLElement {
    const sol = state.sol + 1;
    const inTime = earthIsInTime(state, crisis);
    const clockBar = h('span');
    const clockText = h('p', { class: 'gl__clock-text', 'aria-live': 'polite' });
    const earthBox = h('p', { class: 'gl__earth', 'aria-live': 'polite', hidden: true });
    const choices = h('div', { class: 'gl__choices' });
    let firstChoice: HTMLElement | null = null;

    clockNodes = { bar: clockBar, text: clockText };

    for (const [index, option] of crisis.options.entries()) {
      const art = CRISIS_ART[crisis.kind][index] ?? { glyph: '›' };
      const icon =
        art.src === undefined
          ? h('span', { class: 'gl__choice-icon', 'aria-hidden': 'true', text: art.glyph })
          : h('span', { class: 'gl__choice-icon' }, h('img', { class: 'gl__choice-img', src: art.src, alt: '' }));

      const button = h(
        'button',
        { class: 'gl__choice', type: 'button', 'data-choice': option.id },
        icon,
        h('span', null, h('span', { class: 'gl__choice-title', text: option.label }), h('span', { class: 'gl__choice-detail', text: option.detail })),
        h('span', { class: 'gl__choice-arrow', 'aria-hidden': 'true', text: '›' }),
      );

      button.addEventListener('click', () => choose(crisis, option.id, false));
      choices.append(button);
      firstChoice ??= button;
    }

    const ask = h(
      'button',
      { class: 'gl__btn gl__btn--navy', type: 'button' },
      h('span', null, h('span', { 'aria-hidden': 'true', text: '🛰 ' }), 'Ask Mission Control'),
      h('span', { 'aria-hidden': 'true', text: '?' }),
    );

    ask.addEventListener('click', () => {
      earthBox.hidden = false;

      if (!inTime) {
        earthBox.textContent = `Earth is ${oneWayMinutes(sol)} minutes away each way. A reply would take ${roundTripMinutes(sol)} minutes, and this problem arrives in ${crisis.windowMinutes}. You are on your own: the crew has to decide.`;

        return;
      }

      const advice = earthAdvice(state, crisis);
      const label = optionOf(crisis, advice.optionId)?.label ?? advice.optionId;

      earthBox.textContent = `Mission Control, ${roundTripMinutes(sol)} minutes later: ${advice.text} (They suggest: ${label}.)`;
    });

    const calm = h('button', { class: 'gl__calm', type: 'button', 'aria-pressed': String(calmMode) });

    calm.textContent = '✓ Take your time · no countdown';
    calm.addEventListener('click', () => {
      calmMode = !calmMode;
      calm.setAttribute('aria-pressed', String(calmMode));

      if (calmMode) {
        stopTimer();
        clockBar.style.width = '100%';
        clockText.textContent = 'Take your time — the clock is off.';
      } else {
        startClock(crisis);
      }
    });

    const body: (Node | false)[] = [
      crisis.urgent ? h('div', { class: 'gl__clock' }, h('span', { class: 'gl__clock-bar' }, clockBar), clockText) : false,
      choices,
      earthBox,
    ];

    const panel = gamePanel({
      kicker: `Sol ${sol} · ${EVENT_NAME[crisis.kind]}`,
      title: crisis.title,
      sub: crisis.prompt,
      body,
      footer: [ask, crisis.urgent ? calm : false],
    });

    // The clock nodes belong to this render; a new one replaces them.
    startClock(crisis);

    if (focusedCrisis !== crisis.id) {
      focusedCrisis = crisis.id;
      pendingFocus = firstChoice;
    }

    return panel;
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
    const crisis = pendingCrisis(state);
    const last = state.log[state.log.length - 1];

    clockNodes = null;

    const world =
      crisis === null
        ? gameWorld({
            label: 'Your outpost',
            weather: 'Clear skies',
            crew: last === undefined ? 'A sol is one Mars day. Ready for our first one?' : `Sol ${last.sol} is done. Ready for the next one?`,
            figures: moduleFigures(state.modules),
          })
        : gameWorld({
            label: 'Crew alert',
            weather: `${EVENT_NAME[crisis.kind]} incoming`,
            crew: CRISIS_BRIEF[crisis.kind].crew,
            figures: moduleFigures(state.modules),
            hint: earthIsInTime(state, crisis)
              ? `Mission Control can answer in ${roundTripMinutes(crisis.sol)} minutes.`
              : `Earth cannot reply before this ${EVENT_NAME[crisis.kind].toLowerCase()} arrives.`,
            signals: [{ icon: EVENT_ICON[crisis.kind], tone: 'warn', kicker: EVENT_NAME[crisis.kind], text: CRISIS_BRIEF[crisis.kind].signal }],
          });

    const panel = crisis === null ? missionPanel(state) : crisisPanel(state, crisis);

    mount.replaceChildren(gameScreen({ hud: hudFor(state), world, panel, variant: 'gl--act', headerSub: 'RUNNING THE DAY' }));

    if (pendingFocus !== null) {
      pendingFocus.focus();
      pendingFocus = null;
    }
  }

  function notice(text: string, label: string, route: 'landing-site' | 'base'): void {
    const button = h('button', { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' }, label, h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }));

    button.addEventListener('click', () => navigate(route));

    mount.replaceChildren(
      gameScreen({
        hud: [],
        world: gameWorld({ label: 'Not ready yet', weather: 'Waiting', crew: 'We need a site and an outpost first.', figures: [] }),
        panel: gamePanel({ kicker: 'Not ready yet', title: label, sub: text, footer: [button] }),
        variant: 'gl--act',
        headerSub: 'RUNNING THE DAY',
      }),
    );
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
    stopTimer();
    clockNodes = null;
    mount.replaceChildren();
  };
}
