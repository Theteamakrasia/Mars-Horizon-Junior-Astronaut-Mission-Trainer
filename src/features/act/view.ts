/**
 * The act screen: the sol-by-sol simulation.
 *
 * Turn-based. The player presses one button to run a sol; the only clock in the
 * game is the countdown on a crisis, and a "take your time" switch turns that off.
 * All rules are in `src/sim/`, so this file only draws state and forwards choices.
 *
 * **The desk is a hub, not a scroll** (D-070). Six buttons, each a label and one
 * line of state, and each opens its section over the desk. The panel used to be
 * one column of everything: the orders, the board, the notes, the rover, the
 * diagram, NASA's picture, and the button that runs the day at the bottom. A
 * child looking for one thing read past all the others to find it, and the
 * panel grew a longer scroll every sol. Nothing was removed — the sections are
 * all still here, one button away.
 *
 * Crisis choices (D-029) are a deliberate exception to D-018's "no mid-sol
 * choices": three forecast events stop the clock and ask. A crisis replaces the
 * hub, because it *is* that day's work order.
 */

import { cardForSol, factFor, factForTopic, regionCard, type NasaCard } from '../../data/nasaGallery';
import type { DailyFact } from '../../data/nasaDaily';
import { describeWhen, strongestFlares } from '../../data/spaceweather';
import { loadDailyFacts } from '../../dom/dailyFactLoader';
import { loadForecast, type LoadedForecast } from '../../dom/forecastLoader';
import { h } from '../../dom/h';
import { canAffordOption, earthAdvice, earthIsInTime, fallbackOption, optionOf, pendingCrisis, type Crisis } from '../../sim/crises';
import { oneWayMinutes, roundTripMinutes } from '../../sim/comms';
import { answerRoverFind, hasReachedOutpost, recordInspection, withState, type RunState } from '../../sim/run';
import { makeInspection, type Inspection } from '../../ui/activityPlayer';
import { guideButton, guidePanel } from '../../ui/guide';
import { playSfx, stopSfx } from '../../ui/sfx';
import { ENGINE_NAME, engineUnlocked, type EngineKind } from '../../sim/minigames';
import { visibleForecast } from '../../sim/forecast';
import { siteScore } from '../../sim/regions';
import { scienceSummary as scienceSummaryNow } from './model';
import { advanceSol, decide, powerPicture, WIN_SOL } from '../../sim/sol';
import { gamePanel, gameScreen, gameSection, gameWorld, keepScroll, moduleArt, moduleFigures, type HudStat, type SignalCard } from '../../ui/gameLoop';
import { dayModel } from '../../ui/dayTracker';
import { icon, RANK_ICON, RESOURCE_ICON, type IconName } from '../../ui/icons';
import { nasaCard } from '../../ui/nasaCard';
import { nasaFeedCard } from '../../ui/nasaFeedCard';
import { readButton } from '../../ui/readButton';
import { stopReading } from '../../ui/readAloud';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import { sheet, sheetCloseButton } from '../../ui/sheet';
import { applyTrainingRecord, openTrainingGame, trainingSection, type TrainingGameScreen } from '../../ui/training';
import { TRAINING_DAILY_LIMIT, canStartTraining, trainingUnlocked, type TrainingGameId } from '../../sim/training';

import { activityRows, boardRows, changeRows, deskNote, floorWarning, hubTiles, ledgerRows, meterRows, missionHeadline, orderChecks, powerReceipt, powerToday, roverDocument, scienceSummary, secondsLeft, type HubSection, type HubTile } from './model';

import '../../styles/game-loop.css';
import './act.css';


/** What the crew calls each forecast event. */
const EVENT_NAME: Readonly<Record<Crisis['kind'], string>> = {
  flare: 'Solar flare',
  storm: 'Dust storm',
  'supply-pod': 'Supply pod',
};

const EVENT_ICON: Readonly<Record<Crisis['kind'], IconName>> = {
  flare: 'sun',
  storm: 'storm',
  'supply-pod': 'box',
};

/** The one-line picture on the crisis card, and what the crew says about it. */
const CRISIS_BRIEF: Readonly<Record<Crisis['kind'], { readonly signal: string; readonly crew: string }>> = {
  flare: { signal: 'Radiation is coming. Shield your crew.', crew: "The Sun is sending a burst of radiation. What's our plan?" },
  storm: { signal: 'Dust is coming. Protect the panels.', crew: 'Dust is rolling in fast. The panels are wide open.' },
  'supply-pod': { signal: 'It landed nearby. Choose what to unpack.', crew: 'A pod from Earth touched down. What do we need most?' },
};

/** The artwork for each option, in order: two pictures, then a tool pictogram. */
const CRISIS_ART: Readonly<Record<Crisis['kind'], readonly { readonly src?: string; readonly icon?: IconName }[]>> = {
  flare: [{ src: moduleArt('habitat') }, { src: moduleArt('regolith-shield') }, { icon: 'pick' }],
  storm: [{ src: moduleArt('solar-array') }, { src: moduleArt('greenhouse') }, { icon: 'sparkle' }],
  'supply-pod': [{ src: moduleArt('habitat') }, { icon: 'box' }, { icon: 'pick' }],
};

/**
 * How long the day tracker keeps flashing the sol that has just been flown.
 *
 * Longer than the flash itself (700ms) so a click straight after the sol ran
 * does not cut it off halfway.
 */
const ADVANCE_FLASH_MS = 1500;

/** The pictogram on each hub button. */
const TILE_ICON: Readonly<Record<HubSection, IconName>> = {
  tasks: 'clipboard',
  desk: 'tray',
  orders: 'book',
  stats: 'chart',
  data: 'dish',
  review: 'history',
};

/** The pictogram for a work order, by activity id. */
const ORDER_ICON: Readonly<Record<string, IconName>> = {
  rest: 'rest',
  survey: 'survey',
  experiment: 'flask',
  'map-site': 'map',
  'sweep-panels': 'sparkle',
  'grow-extra': 'food',
  'sample-rock': 'rock',
  'dig-ice': 'pick',
  'recycle-tune': 'recycle',
  'stack-shielding': 'shielding',
  'mend-suits': 'helmet',
  'air-check': 'oxygen',
};

/** The pictogram for an order the catalogue does not name. */
const ORDER_ICON_FALLBACK: IconName = 'clipboard';

/**
 * The order the day's tasks are shown in.
 *
 * Kept outside the screen so leaving the desk and coming back during the same
 * sol does not deal the tasks again; a new sol (or a new run) draws a new order.
 */
let taskOrderSol = -1;
let taskOrderIds: string[] = [];

function shuffleForSol<T extends { readonly id: string }>(rows: readonly T[], sol: number): readonly T[] {
  const same = taskOrderSol === sol && taskOrderIds.length === rows.length && rows.every((row) => taskOrderIds.includes(row.id));

  if (!same) {
    const ids = rows.map((row) => row.id);

    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    }

    taskOrderSol = sol;
    taskOrderIds = ids;
  }

  return [...rows].sort((a, b) => taskOrderIds.indexOf(a.id) - taskOrderIds.indexOf(b.id));
}

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
  /** The tool open on the desk, if any. */
  let openTool: { activityId: string; tool: Inspection } | null = null;
  /** Which section is open over the desk, if any. */
  let openSheet: HubSection | null = null;
  /** Where the open sheet was scrolled to, so a redraw does not jump to the top. */
  let sheetScroll = 0;
  /** The same, for the mini game's own sheet, which sits over the section. */
  let toolScroll = 0;
  /** What to focus after the next render, because the thing they were on is replaced. */
  let focusSheet = false;
  let focusTile: HubSection | null = null;
  /** The order whose inspect button to focus when the mini game closes. */
  let focusToolButton: string | null = null;
  /** Whether the how-to-play guide is open. */
  let guideOpen = false;
  /**
   * The mounted popup. It lives on `document.body`, not inside the screen, so
   * the forecast and the clock can redraw the desk without resetting the page
   * the child is reading or replaying its entrance.
   */
  let guideEl: HTMLElement | null = null;
  /** The training game that is open over the desk, if any. */
  let trainingGame: TrainingGameScreen | null = null;
  /** What the training section says when a game cannot be played. */
  let trainingNotice = '';
  let clockNodes: { readonly bar: HTMLElement; readonly text: HTMLElement } | null = null;
  let pendingFocus: HTMLElement | null = null;
  /** The sol that has just been flown, so the day tracker can flash it. */
  let advancedSol = 0;
  /** The timer that forgets it again. */
  let advanceTimer: number | null = null;
  /* NASA's live daily pictures. Empty when NASA did not answer, and the screen
     says so rather than showing a broken card. */
  let dailyFacts: readonly DailyFact[] = [];
  let dailyDetail = '';
  /* The live space weather, kept whole: the forecast is the game's reading of
     it, but the data sheet shows NASA's own readings (D-071). */
  let loaded: LoadedForecast | null = null;
  const controller = new AbortController();

  /* The training record is written down, so a refresh does not hand the
     player the same two games again. It goes onto the run before the first
     draw, so the desk shows what has really been done today. */
  if (run !== null) {
    const recorded = applyTrainingRecord(run);

    if (recorded !== run) {
      run = recorded;
      setRun(run);
    }
  }

  /** The last state we reacted to, so sounds follow transitions and not redraws. */
  let seenRank = run === null ? '' : scienceSummaryNow(run).rank.id;
  let seenCrisisId: string | null = null;
  let seenBoardCount = run === null ? 0 : boardRows(run).length;
  let seenNoteSol = -1;
  const seenLowStores = new Set<string>();
  const seenCriticalStores = new Set<string>();
  let seenBlackout = false;
  let countdownStartedFor: string | null = null;
  let lastTickSecond = -1;

  function crisisSfxFor(id: string): 'crisis-flare' | 'crisis-storm' | 'crisis-supply' {
    if (id.includes('flare')) return 'crisis-flare';
    if (id.includes('storm')) return 'crisis-storm';
    return 'crisis-supply';
  }

  function syncTransitionSfx(next: RunState, previous: RunState | null): void {
    const crisis = pendingCrisis(next);
    if (crisis === null) {
      seenCrisisId = null;
      countdownStartedFor = null;
      lastTickSecond = -1;
    } else if (crisis.id !== seenCrisisId) {
      seenCrisisId = crisis.id;
      playSfx(crisisSfxFor(crisis.id));
    }

    const note = deskNote(next.sol + 1);
    if (note !== null && next.sol !== seenNoteSol) {
      seenNoteSol = next.sol;
      if (previous !== null) playSfx('note-arrive');
    }

    const boardCount = boardRows(next).length;
    if (boardCount > seenBoardCount) {
      if (previous !== null && seenBoardCount > 0) playSfx('standing-order-new');
      seenBoardCount = boardCount;
    } else {
      seenBoardCount = boardCount;
    }

    const unlocked = trainingUnlocked(next);
    if (unlocked && !seenTrainingUnlocked && previous !== null) playSfx('training-unlock');
    seenTrainingUnlocked = unlocked;

    if (previous !== null) {
      if (next.sol > previous.sol) playSfx('sol-advance');
      if (next.science > previous.science) playSfx('science-up');
      const rank = scienceSummaryNow(next).rank.id;
      if (rank !== seenRank) {
        if (seenRank !== '') playSfx('rank-up');
        seenRank = rank;
      }

      if (previous.rover.phase !== 'exploring' && next.rover.phase === 'exploring') playSfx('rover-deploy');
      if (previous.rover.phase === 'exploring' && next.rover.phase !== 'exploring') playSfx('rover-return');
    } else {
      seenRank = scienceSummaryNow(next).rank.id;
    }

    for (const meter of meterRows(next)) {
      if (meter.name === 'power') continue;
      if (meter.tone === 'critical') {
        if (!seenCriticalStores.has(meter.name)) {
          seenCriticalStores.add(meter.name);
          if (previous !== null) playSfx('store-critical');
        }
        seenLowStores.add(meter.name);
      } else if (meter.tone === 'low') {
        seenCriticalStores.delete(meter.name);
        if (!seenLowStores.has(meter.name)) {
          seenLowStores.add(meter.name);
          if (previous !== null) playSfx('store-low');
        }
      } else {
        seenLowStores.delete(meter.name);
        seenCriticalStores.delete(meter.name);
      }
    }

    const blackout = powerToday(next).reserve < 0 || (powerToday(next).spendable <= 0 && powerToday(next).generated === 0);
    if (blackout !== seenBlackout) {
      if (blackout) {
        if (previous !== null) playSfx('power-blackout');
      } else if (previous !== null) {
        playSfx('power-restore');
      }
      seenBlackout = blackout;
    }

    // State snapshot for one-shot transitions is handled by lastSeenState/seen* flags above.
  }

  let lastSeenState: RunState | null = run;
  let seenTrainingUnlocked = run === null ? false : trainingUnlocked(run);

  function stopTimer(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    stopSfx('countdown-tick');
  }

  function step(): void {
    if (run === null) return;

    /* The day is being committed, so whatever was open is about to be about
       the wrong sol. */
    openSheet = null;
    openTool?.tool.destroy?.();
    openTool = null;
    toolScroll = 0;
    sheetScroll = 0;
    /* A new sol is a new day of training: the record for it is put back on
       the run, so the two games are available again and the points of the
       day before are left alone. */
    run = applyTrainingRecord(advanceSol(run, Math.random()));
    setRun(run);

    /* The sol that has just been flown, so the header's day tracker can flash
       that one pip. The screen rebuilds its whole DOM on every render, so an
       animation on its own would replay every time the player picked an
       activity. Marking the pip is what makes the flash happen on the advance
       and not on the other renders. */
    advancedSol = run.sol;
    scheduleAdvanceClear();

    if (run.status !== 'active') {
      navigate(nextStop('act') ?? 'debrief');

      return;
    }

    render();
  }

  /**
   * Forget the sol that was just flown, after the flash has had time to play.
   *
   * Held rather than cleared on the next render, so a click a moment after the
   * sol ran does not cut the flash in half.
   */
  function scheduleAdvanceClear(): void {
    if (advanceTimer !== null) window.clearTimeout(advanceTimer);

    advanceTimer = window.setTimeout(() => {
      advanceTimer = null;
      advancedSol = 0;
    }, ADVANCE_FLASH_MS);
  }

  function choose(crisis: Crisis, optionId: string, timedOut: boolean): void {
    if (run === null) return;

    stopTimer();
    stopSfx('countdown-tick');
    if (timedOut) playSfx('countdown-expire');
    else playSfx('shelter-confirm');
    run = decide(run, crisis.id, optionId, timedOut);
    setRun(run);
    step();
  }

  function startClock(crisis: Crisis): void {
    stopTimer();

    if (crisis.countdownSeconds === null || calmMode || clockNodes === null) return;

    const total = crisis.countdownSeconds;
    const began = performance.now();

    if (countdownStartedFor !== crisis.id) {
      countdownStartedFor = crisis.id;
      lastTickSecond = -1;
      playSfx('countdown-start');
    }

    timer = window.setInterval(() => {
      if (clockNodes === null || run === null) return;

      const elapsed = performance.now() - began;
      const left = secondsLeft(total, elapsed);

      clockNodes.bar.style.width = `${Math.max(0, 100 - (elapsed / (total * 1000)) * 100)}%`;
      clockNodes.text.textContent = `${left} seconds left. If the clock runs out, nothing is done.`;

      if (left !== lastTickSecond) {
        lastTickSecond = left;
        if (left > 0 && left <= total) playSfx('countdown-tick');
      }

      if (elapsed >= total * 1000) choose(crisis, fallbackOption(run, crisis).id, true);
    }, 100);
  }

  function onRunSol(): void {
    if (run === null) return;

    const crisis = pendingCrisis(run);

    /* A crisis is the day's work, so it runs the sol by itself. */
    if (crisis !== null) {
      render();

      return;
    }

    /* The day cannot be skipped.
     *
     * The button is disabled when the crew has not trained or has not stamped
     * an order, but the rule belongs here too: a sol is a day of work, and the
     * sim must never be handed a sol that skipped one.
     */
    const orders = activityRows(run, run.sol + 1);

    if (!trainingUnlocked(run) || (orders.length > 0 && !orders.some((row) => row.chosen))) {
      trainingNotice = !trainingUnlocked(run)
        ? `Complete ${TRAINING_DAILY_LIMIT} training games to unlock today's colony tasks.`
        : "Choose today's activity before running the sol.";
      playSfx('order-locked');
      render();

      return;
    }

    step();
  }

  /**
   * Take the day's activity (D-051).
   *
   * The choice is kept on the run so the sim can apply it when the sol runs,
   * and the screen redraws so the picked card can show itself. The sheet stays
   * open across the redraw: choosing is not the same as confirming.
   */
  function pickActivity(id: string): void {
    if (run === null) return;

    const row = activityRows(run, run.sol + 1).find((offer) => offer.id === id);

    if (row === undefined || !row.available) return;

    const wasChosen = run.chosenActivity === id;
    run = withState(run, { chosenActivity: id });
    setRun(run);
    if (!wasChosen) playSfx('order-stamp');
    render();
  }

  /**
   * Play a training game.
   *
   * The game is opened over the desk, and the rule engine decides whether it
   * can be played at all: two games a sol, and a game that cannot be paid for
   * says so rather than opening.
   */
  function playTraining(gameId: TrainingGameId): void {
    if (run === null) return;

    const start = canStartTraining(run, gameId);

    if (!start.ok) {
      trainingNotice = start.message;
      render();

      return;
    }

    trainingNotice = '';

    const screen = openTrainingGame(gameId, {
      run,
      onFinished: (next) => {
        run = next;
        setRun(run);
      },
      onClose: () => {
        trainingGame = null;
        render();
      },
    });

    if (screen === null) {
      trainingNotice = 'That training is not available today.';
      render();

      return;
    }

    trainingGame = screen;
    mount.append(screen.element);
    screen.focus();
  }

  function openSection(section: HubSection): void {
    /* Today's tasks are locked until the crew has trained. The tile is locked
       too, but a sheet that opens and does nothing is worse than a sheet
       that does not open. */
    if (section === 'tasks' && run !== null && !trainingUnlocked(run)) {
      trainingNotice = `Complete ${TRAINING_DAILY_LIMIT} training games to unlock today's colony tasks.`;
      playSfx('order-locked');
      render();

      return;
    }

    openSheet = section;
    guideOpen = false;
    focusSheet = true;
    playSfx('desk-tile-open');
    render();
  }

  /** Close the guide, and take the popup off the document. */
  function closeGuide(): void {
    guideOpen = false;
    guideEl?.remove();
    guideEl = null;
    render();
  }

  function closeSection(): void {
    const closed = openSheet;

    openSheet = null;
    sheetScroll = 0;
    focusTile = closed;
    /* A mini game belongs to the section it was opened from. Closing that
       section closes the tool with it, or it would still be there next time
       the player opened the section (ISS-093). */
    openTool?.tool.destroy?.();
    openTool = null;
    toolScroll = 0;
    render();
  }

  /**
   * Close the mini game's sheet and put the player back on the order.
   *
   * The section sheet underneath is never closed: the player was working an
   * order, and closing the tool puts them back on that order with it stamped.
   */
  function closeTool(): void {
    const worked = openTool?.activityId ?? null;

    openTool?.tool.destroy?.();
    openTool = null;
    toolScroll = 0;
    focusToolButton = worked;
    render();
  }

  /** The score card in the world panel: how much science, and what rank. */
  function scienceSignal(state: RunState): SignalCard {
    const summary = scienceSummary(state);

    return {
      icon: RANK_ICON[summary.rank.id] ?? 'star',
      kicker: 'Science',
      text: `${summary.points} points · ${summary.rank.title}`,
      detail:
        summary.next === null
          ? 'The top rank. Nothing left to climb.'
          : `${summary.toNext} more points to reach ${summary.next.title}.`,
      tone: 'good',
    };
  }

  /** The five resource cards, from the same rows the meters use. */
  function hudFor(state: RunState): readonly HudStat[] {
    const toneOf = (tone: string): HudStat['tone'] => (tone === 'critical' ? 'bad' : tone === 'low' ? 'warn' : 'ok');

    const meters = meterRows(state);
    const power = powerToday(state);

    /*
     * The power card is the odd one out, and it used to be the one card that
     * lied. The batteries are drained overnight and refilled by the Sun, so
     * the level in the bank is at its lowest at dawn: a card that showed it
     * read "18 of 150 kWh, 12%" every single morning of the run, and the
     * player was right to say the electricity was always nearly gone (ISS-084).
     *
     * So the card shows the day instead: what the Sun makes, and what is
     * spare over what the outpost needs. The level in the bank is in the
     * stats sheet, where it belongs.
     */
    const rows: HudStat[] = [
      {
        icon: RESOURCE_ICON.power,
        label: `Power · ${power.generated} kWh today`,
        value: power.spare >= 0 ? `+${power.spare} kWh spare` : `${Math.abs(power.spare)} kWh short`,
        percent:
          power.demand > 0 ? Math.min(100, Math.round((power.generated / power.demand) * 100)) : 0,
        tone: power.spare < 0 ? 'bad' : power.nightCovered ? 'ok' : 'warn',
      },
      ...meters.slice(1).map((row) => ({
        icon: RESOURCE_ICON[row.name],
        label: row.label,
        value: `${row.percent}%`,
        percent: row.percent,
        tone: toneOf(row.tone),
      })),
    ];

    return rows;
  }

  /** The science points, in the panel head's top right. The kicker owns the left. */
  function pointsCorner(state: RunState): HTMLElement {
    const summary = scienceSummary(state);

    return h(
      'p',
      {
        class: 'act-points',
        'aria-label': `${summary.points} science points, rank ${summary.rank.title}`,
      },
      icon('star'),
      h('span', { 'aria-hidden': 'true', text: `${summary.points} points` }),
    );
  }

  function forecastSection(state: RunState): HTMLElement {
    const upcoming = visibleForecast(state.forecast, state.sol);
    const triple = h('div', { class: 'gl__triple' });

    for (const event of upcoming) {
      triple.append(
        h(
          'div',
          { class: 'gl__mini' },
          h(
            'span',
            { class: 'gl__mini-label' },
            icon(EVENT_ICON[event.kind]),
            `Sol ${event.sol}`,
          ),
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

  /* ------------------------------------------------------------- sections -- */

  /** Today's work orders in a random order that stays put for the whole sol. */
  function shuffledRows(state: RunState): ReturnType<typeof activityRows> {
    return shuffleForSol(activityRows(state, state.sol + 1), state.sol + 1);
  }

  /**
   * The work orders for today.
   *
   * A document, not a menu: what is asked, what it costs, and the two things
   * to check before it can be stamped. The player approves or denies knowing
   * what they are approving — which is the whole difference between this and
   * a menu with three buttons on it.
   */
  function orderList(state: RunState): HTMLElement {
    const rows = shuffledRows(state);
    const list = h('div', { class: 'act-orders' });

    for (const row of rows) {
      const checks = orderChecks(state, row);
      const failing = checks.find((check) => !check.ok);

      const button = h(
        'button',
        {
          class: 'act-order',
          type: 'button',
          'data-activity': row.id,
          'aria-pressed': String(row.chosen),
          disabled: !row.available,
        },
        h('span', { class: 'act-order__icon', 'aria-hidden': 'true' }, icon(ORDER_ICON[row.id] ?? ORDER_ICON_FALLBACK)),
        h(
          'span',
          { class: 'act-order__body' },
          h(
            'span',
            { class: 'act-order__head' },
            h('span', { class: 'act-order__title', text: row.title }),
            h(
              'span',
              { class: 'act-order__tags' },
              ...row.costs.map((text) => h('span', { class: 'act-tag act-tag--cost', text })),
              ...row.gains.map((text) => h('span', { class: 'act-tag act-tag--gain', text })),
            ),
          ),
          h('span', {
            class: 'act-order__detail',
            text: row.available ? row.detail : (row.lockedReason ?? row.detail),
          }),
          h(
            'span',
            { class: 'act-order__checks' },
            ...checks.map((check) =>
              h(
                'span',
                { class: 'act-check', 'data-ok': String(check.ok) },
                h('span', { class: 'act-check__label', text: check.label }),
                h('span', { class: 'act-check__value', text: check.value }),
              ),
            ),
          ),
          failing === undefined ? null : h('span', { class: 'act-order__warn', text: failing.why }),
          row.nightWarning === null
            ? null
            : h('span', { class: 'act-order__warn act-order__warn--night', text: row.nightWarning }),
        ),
        h('span', { class: 'act-order__mark', 'aria-hidden': 'true' }, row.chosen ? icon('check') : null),
      );

      if (row.available) button.addEventListener('click', () => pickActivity(row.id));

      list.append(button);

      /* The tool this order can be worked with, if it has unlocked yet. */
      if (row.available && row.engine !== null && engineUnlocked(row.engine, state.sol + 1)) {
        const worked = state.inspections.some((entry) => entry.sol === state.sol + 1 && entry.activityId === row.id);

        const inspect = h(
          'button',
          { class: 'insp__open', type: 'button' },
          worked ? 'Worked' : `${ENGINE_NAME[row.engine]} · inspect`,
        );

        inspect.addEventListener('click', () => {
          /* The mini game opens in its OWN sheet, over this one (ISS-093). It
             used to switch the player to the desk sheet and hang the tool off
             the desk, which merged two unrelated things and left the tool
             there after it was closed. */
          openTool?.tool.destroy?.();
          openTool = { activityId: row.id, tool: makeInspection(row.engine as EngineKind, state.sol + 1) };
          focusSheet = true;
          playSfx('tool-start');
          render();
        });

        list.append(h('div', { class: 'insp__slot', 'data-activity': row.id }, inspect));
      }
    }

    if (rows.length === 0) list.append(h('p', { class: 'gl__note', text: 'There is nothing to choose today.' }));

    return list;
  }

  /** What today's tasks say under the orders, and the fact behind the subject. */
  function tasksBody(state: RunState): readonly (Node | false)[] {
    const rows = shuffledRows(state);
    const picked = rows.some((row) => row.chosen);

    const note =
      rows.length === 0
        ? 'There is nothing to choose today.'
        : picked
          ? 'You can change your mind until you run the sol.'
          : 'Check the two readings, then stamp one order.';

    /* The fact about the day's own subject, tucked under the orders. */
    const chosen = rows.find((row) => row.chosen) ?? rows.find((row) => row.available) ?? rows[0];
    const fact = chosen === undefined ? null : factForTopic(chosen.topic, state.sol + 1);

    /* The orders are the day's decision, so they are worth hearing as well as
       reading: the cheapest kind of access for a player who cannot read yet. */
    const read = readButton(
      () =>
        rows
          .map((row) => {
            const locked = row.available ? '' : ` ${row.lockedReason ?? ''}`;

            return `${row.title}. ${row.detail}${locked} Costs ${row.costs.join(' and ') || 'nothing'}. Gives ${row.gains.join(' and ')}.`;
          })
          .join(' '),
      { ariaLabel: "Read today's work orders aloud" },
    );

    return [
      orderList(state),
      h('p', { class: 'gl__note', text: note }),
      fact === null ? false : h('p', { class: 'gl__note', text: `NASA fact · ${fact.text} (${fact.credit})` }),
      read ?? false,
    ];
  }

  /**
   * The tool on the desk, and the order it works.
   *
   * The stars it wins are the only thing an inspection changes: they
   * multiply the science the order is worth. Nothing else about the outpost
   * moves, so the balance of a run does not depend on how well the player
   * did it.
   */
  function inspectionSection(state: RunState): HTMLElement | false {
    if (openTool === null) return false;

    const { tool, activityId } = openTool;
    const stars = state.inspections.find((entry) => entry.sol === state.sol + 1 && entry.activityId === activityId)?.stars ?? null;

    const finish = h('button', { class: 'gl__btn gl__btn--primary insp__finish', type: 'button' }, stars === null ? 'Finish' : 'Done');

    finish.addEventListener('click', () => {
      if (run === null) return;

      /* The first press scores the work and keeps the tool open so the player
         can see the stars; the second closes it. Closing on the first press
         meant the player finished the tool and was shown nothing at all. */
      if (stars === null) {
        const grade = tool.result();

        run = recordInspection(run, state.sol + 1, activityId, grade.stars);
        setRun(run);
        playSfx('tool-finish');
        if (grade.stars <= 0) playSfx('stars-zero');
        else playSfx(`star-${grade.stars}` as 'star-1' | 'star-2' | 'star-3');
        render();

        return;
      }

      /* Closing goes through closeTool, so the player lands back on the order
         they were working however they left the tool. */
      closeTool();
    });

    const result =
      stars === null
        ? null
        : h(
            'p',
            { class: 'insp__result', 'data-stars': String(stars), 'aria-label': `${stars} of 3 stars. ${tool.result().message}` },
            h(
              'span',
              { class: 'insp__stars', 'aria-hidden': 'true' },
              ...[0, 1, 2].map((index) => {
                const star = icon('star');

                if (index >= stars) star.classList.add('insp__star--empty');

                return star;
              }),
            ),
            ` ${tool.result().message}`,
          );

    return gameSection(`Working the order · ${tool.name}`, h('div', { class: 'insp' }, tool.element, result, finish));
  }

  /**
   * A note that landed on the desk.
   *
   * The warm part of the game. Some sols have one and some do not, which is
   * what keeps twelve days from being twelve of the same day.
   */
  function deskNoteCard(state: RunState): HTMLElement | false {
    const note = deskNote(state.sol + 1);

    if (note === null) return false;

    return h(
      'article',
      { class: 'act-note', 'data-from': note.from },
      h('span', { class: 'act-note__mark', 'aria-hidden': 'true' }, icon(note.from === 'home' ? 'letter' : 'helmet')),
      h(
        'div',
        { class: 'act-note__body' },
        h('p', { class: 'act-note__who', text: note.from === 'home' ? `A message from ${note.who}` : `${note.who}, from the crew` }),
        h('p', { class: 'act-note__text', text: note.text }),
        h('p', { class: 'act-note__delay', text: `It took ${note.minutes} minutes to arrive. Nothing ever does.` }),
      ),
    );
  }

  /**
   * The rover's find, on the desk.
   *
   * The nearest thing in the game to a Papers Please traveller: a picture, a
   * place, a year, a story, and a stamp to give it. The player is not
   * reading a fact about the rover; they are answering a document it brought
   * back.
   */
  function roverCard(state: RunState): HTMLElement | false {
    const document = roverDocument(state);

    if (document === null) return false;

    return h(
      'article',
      { class: 'act-find' },
      h('img', { class: 'act-find__image', src: document.imageUrl, alt: document.alt }),
      h(
        'div',
        { class: 'act-find__body' },
        h('p', { class: 'act-find__kicker', text: `The rover came back · ${document.where} · ${document.when}` }),
        h('h3', { class: 'act-find__title', text: document.title }),
        h('p', { class: 'act-find__story', text: document.story }),
        h('p', { class: 'act-find__fact', text: `NASA fact · ${document.fact} (${document.credit})` }),
        h(
          'div',
          { class: 'act-find__answers' },
          ...document.answers.map((answer) => {
            const button = h('button', { class: 'gl__btn gl__btn--navy act-find__answer', type: 'button' }, answer.label);

            button.addEventListener('click', () => {
              if (run === null) return;

              const answered = answerRoverFind(run, answer.id);

              if (answered === run) return;

              if (answer.id === 'log') playSfx('find-site-log');
              else if (answer.id === 'collect') playSfx('find-rock-collect');
              else if (answer.id === 'leave') playSfx('find-rock-leave');

              run = answered;
              setRun(run);
              render();
            });

            return button;
          }),
        ),
      ),
    );
  }

  /**
   * Everything waiting on the desk, in the order a duty officer would pick it up.
   *
   * The desk is the desk: a note from home and the rover's find. The mini game
   * is NOT here — it is worked on an order, so it opens in its own sheet over
   * the orders (ISS-093).
   */
  function deskBody(state: RunState): readonly (Node | false)[] {
    const note = deskNoteCard(state);
    const find = roverCard(state);
    const nothing = note === false && find === false;

    return [
      nothing ? h('p', { class: 'gl__note', text: 'The desk is clear. Nothing new landed today.' }) : false,
      note,
      find,
    ];
  }

  /**
   * The standing orders on the board.
   *
   * The rule book, growing two rules a sol. This is where the science is
   * taught: every order is a real operating rule, and the player works to the
   * whole set rather than to the two that are newest.
   *
   * The training is at the top of it, because the training is part of the
   * rule book now: two games a sol, and the day's work orders open when they
   * are done.
   */
  function ordersBody(state: RunState): readonly (Node | false)[] {
    const rows = boardRows(state);
    const list = h('ol', { class: 'act-board' });

    for (const [index, row] of rows.entries()) {
      /* The fact behind a new order, shown the day it arrives: that is the
         teaching moment, and it does not last. */
      const fact = row.isNew ? factForTopic(row.topic, index) : null;

      list.append(
        h(
          'li',
          { class: 'act-board__row', 'data-new': String(row.isNew) },
          h('span', { class: 'act-board__text', text: row.text }),
          row.isNew ? h('span', { class: 'act-board__new', text: 'NEW' }) : null,
          fact === null ? null : h('span', { class: 'act-board__fact', text: `NASA fact · ${fact.text}` }),
        ),
      );
    }

    const fresh = rows.filter((row) => row.isNew).length;

    return [
      trainingSection(state, { notice: trainingNotice, onPlay: playTraining }),
      list,
      h('p', { class: 'gl__note', text: `${rows.length} orders so far, ${fresh} new today. These are the rules you work to.` }),
    ];
  }

  /**
   * The day's power budget, as rows the player can add up.
   *
   * Five numbers and a night: what the panels make, what the outpost needs,
   * what is left over every sol, what is in the bank, what an order may cost
   * today, and what the night will take. The night is on every one of them,
   * because it is where the power goes and it was the number nobody was shown
   * (ISS-083).
   */
  function powerBudgetBlock(state: RunState): HTMLElement {
    const power = powerToday(state);

    const row = (label: string, value: string, tone: 'ok' | 'warn' | 'bad' = 'ok'): HTMLElement =>
      h(
        'div',
        { class: 'act-power__row', 'data-tone': tone },
        h('span', { class: 'act-power__label', text: label }),
        h('span', { class: 'act-power__value', text: value }),
      );

    return h(
      'div',
      { class: 'act-power' },
      row('Panels make', `${power.generated} kWh`),
      row('Outpost needs', `${power.demand} kWh`),
      row(
        'Spare each sol',
        `${power.spare > 0 ? '+' : ''}${power.spare} kWh`,
        power.spare < 0 ? 'bad' : 'ok',
      ),
      row('In the bank', `${power.stored} of ${power.capacity} kWh`),
      row('Your orders can use', `${power.spendable} kWh today`),
      row(
        'Night tonight',
        power.nightCovered
          ? `${power.nightNeed} kWh · ${power.reserve} kWh spare`
          : `${power.nightNeed} kWh · the bank is short`,
        power.nightCovered ? 'ok' : 'warn',
      ),
      h('p', {
        class: 'act-power__note',
        text: `Your orders can use the power in the bank (${power.stored} kWh) plus the sunlight the outpost does not need (${Math.max(
          0,
          Math.round(power.spendable - power.stored),
        )} kWh).`,
      }),
    );
  }

  /** The day's power, in three small cards, as the build screen draws it. */
  function dayNightStrip(state: RunState): HTMLElement {
    const power = powerPicture(state);
    const today = powerToday(state);

    return h(
      'div',
      { class: 'gl__triple' },
      h(
        'div',
        { class: 'gl__mini' },
        h('span', { class: 'gl__mini-label' }, icon('sun'), 'Daytime'),
        h('span', { class: 'gl__mini-value', text: `+${power.generatedKw} kW` }),
        h('span', { class: 'gl__mini-detail', text: 'panels in sunlight' }),
      ),
      h(
        'div',
        { class: 'gl__mini' },
        h('span', { class: 'gl__mini-label' }, icon(RESOURCE_ICON.power), 'For today'),
        h('span', { class: 'gl__mini-value', text: `${today.spendable} kWh` }),
        h('span', { class: 'gl__mini-detail', text: 'what an order may cost' }),
      ),
      h(
        'div',
        { class: 'gl__mini' },
        h('span', { class: 'gl__mini-label' }, icon('moon'), 'Night use'),
        h('span', { class: 'gl__mini-value', text: `−${today.nightNeed} kWh` }),
        h('span', { class: 'gl__mini-detail', text: today.nightCovered ? 'the batteries cover it' : 'the batteries will not cover it' }),
      ),
    );
  }

  /** The five systems, with the number behind each meter. */
  function statsBody(state: RunState): readonly (Node | false)[] {
    const meters = meterRows(state);
    const summary = scienceSummary(state);

    const rows = h(
      'div',
      { class: 'act-meter' },
      ...meters.map((row) =>
        h(
          'div',
          { class: 'act-meter__row', 'data-tone': row.tone },
          h('span', { class: 'act-meter__icon', 'aria-hidden': 'true' }, icon(RESOURCE_ICON[row.name])),
          h('span', { class: 'act-meter__label', text: row.label }),
          h('span', { class: 'act-meter__value', text: `${row.percent}%` }),
          h(
            'span',
            {
              class: 'act-meter__bar',
              role: 'meter',
              'aria-label': row.label,
              'aria-valuemin': '0',
              'aria-valuemax': '100',
              'aria-valuenow': String(row.percent),
            },
            h('span', { style: `width:${Math.max(0, Math.min(100, row.percent))}%` }),
          ),
        ),
      ),
    );

    const science = h(
      'p',
      { class: 'act-stats__science' },
      icon(RANK_ICON[summary.rank.id] ?? 'star'),
      h(
        'span',
        null,
        h('strong', { text: `${summary.points} science points` }),
        ` · ${summary.rank.title}`,
        summary.next === null ? ' · the top rank' : ` · ${summary.toNext} to ${summary.next.title}`,
      ),
    );

    return [
      powerBudgetBlock(state),
      dayNightStrip(state),
      powerReceipt(state) === '' ? false : h('p', { class: 'gl__note', text: powerReceipt(state) }),
      rows,
      science,
    ];
  }

  /**
   * The saved NASA card for the sol being played.
   *
   * The card follows the sol: sol 1 is the planet you land on, sol 7 is the
   * dust storm. Before the first sol there is nothing to follow, so the sol
   * being played is the one that counts — otherwise the section opens on a
   * picture-less first day.
   */
  function learningCard(state: RunState): NasaCard | null {
    return cardForSol(state.sol + 1);
  }

  /**
   * How many NASA pictures are behind the data tile.
   *
   * The tile says what is behind it, so it needs the count — and the count has
   * to agree with what the sheet actually shows.
   */
  function picturesBehind(state: RunState): number {
    return (
      (dailyFacts.length > 0 ? 1 : 0) +
      (learningCard(state) === null ? 0 : 1) +
      (regionCard(state.regionId) === null ? 0 : 1)
    );
  }

  /**
   * The whole NASA layer, in one sheet (D-071).
   *
   * The game owns a lot of real data — NASA's picture of the sol, the picture of
   * the region the player landed in, the live daily picture, the live flare
   * readings, and forty tagged facts — and until now the section behind the
   * "Real data" button showed one card. This is all of it, in the order a
   * child would ask for it: what NASA is doing today, what this sol is about,
   * where the crew landed, what the Sun is doing, and a fact to take away.
   *
   * The live feed is enrichment (D-053): when NASA did not answer, the screen
   * says so rather than pretending.
   */
  function dataBody(state: RunState): readonly (Node | false)[] {
    const learning = learningCard(state);
    const region = regionCard(state.regionId);

    return [
      livePicture(state),
      learning === null ? false : nasaCard(learning),
      region === null ? false : nasaCard(region, 'Your landing site'),
      spaceWeather(),
      nasaFacts(state),
    ];
  }

  /** NASA's live daily picture, or the honest reason there is not one. */
  function livePicture(state: RunState): HTMLElement {
    if (dailyFacts.length === 0) {
      return h('p', {
        class: 'gl__note',
        text: dailyDetail.length > 0 ? dailyDetail : 'NASA is not answering right now, so the saved NASA picture below is the one on screen.',
      });
    }

    return h(
      'div',
      { class: 'act-data__live' },
      gameSection('From NASA today', nasaFeedCard(dailyFacts[state.sol % dailyFacts.length] as DailyFact)),
      h('p', { class: 'gl__note', text: dailyDetail }),
    );
  }

  /**
   * NASA's own space-weather readings, and where they came from.
   *
   * The forecast on the panel is the game's reading of these readings — a
   * timetable, one event per sol. This is the real thing: the class of each
   * flare and the day it peaked, strongest first, with the source underneath so
   * the player knows whether they are looking at a live reading or at the
   * game's long-run record.
   */
  function spaceWeather(): HTMLElement {
    const readings = loaded?.flares ?? [];
    const strongest = strongestFlares(readings);
    const list = h('div', { class: 'act-weather' });

    for (const flare of strongest) {
      list.append(
        h(
          'div',
          { class: 'act-weather__row' },
          h('span', { class: 'act-weather__class', text: flare.classType }),
          h('span', { class: 'act-weather__when', text: describeWhen(flare.peakTime) }),
        ),
      );
    }

    const source = loaded?.detail ?? 'The live reading has not come back yet.';

    /* Nothing live: say so once, and say where the forecast on the desk came
       from instead. Two sentences saying the same thing is noise. */
    if (strongest.length === 0) {
      list.append(
        h('p', {
          class: 'gl__note',
          text: `No live flare readings came back, so the forecast on the desk is the game’s own record of how often these happen. ${source}`,
        }),
      );

      return gameSection('Real space weather', list);
    }

    const count = readings.length === 1 ? '1 reading' : `${readings.length} readings`;

    return gameSection('Real space weather', list, h('p', { class: 'gl__note', text: `${count}, biggest first. ${source}` }));
  }

  /** Two NASA facts to take away, one for the sol and one for the run. */
  function nasaFacts(state: RunState): HTMLElement {
    const today = factFor(state.sol + 5);
    const later = factFor(state.sol + 12);

    return gameSection(
      'NASA facts',
      h('p', { class: 'act-fact', text: `NASA fact · ${today.text} (${today.credit})` }),
      h('p', { class: 'act-fact', text: `NASA fact · ${later.text} (${later.credit})` }),
    );
  }

  /**
   * What the last sol did, and what it changed.
   *
   * The answer to "what just happened". It is behind a button now, so the net
   * change is printed on the hub's own button as well (see `hubTiles`) and the
   * sheet is where the explanation lives.
   */
  function reviewBody(state: RunState): readonly (Node | false)[] {
    const last = state.log[state.log.length - 1];

    if (last === undefined) return [h('p', { class: 'gl__note', text: 'No sol has run yet. Run one and its review lands here.' })];

    const items = [...last.events.map((event) => event.summary), ...last.notes];
    const list = h('ul', { class: 'gl__list' });

    /* What the crew chose comes first: it is the decision this sol was
       about, and the science it earned is why the score moved. */
    if (last.activity !== null) {
      list.append(h('li', { text: `You chose: ${last.activity.title}. (+${last.activity.science} science)` }));
    }

    for (const item of items.length > 0 ? items : ['A quiet sol. Everything ran as expected.']) {
      list.append(h('li', { text: item }));
    }

    const changes = h('div', { class: 'act-changes' });

    for (const row of changeRows(last.net)) {
      changes.append(
        h(
          'div',
          { class: 'act-change', 'data-tone': row.tone },
          h('span', { class: 'act-change__label' }, icon(RESOURCE_ICON[row.name]), row.label),
          h('strong', { class: 'act-change__value', text: row.text }),
        ),
      );
    }

    /* The books for the day: what each store made and what it used. The change
       strip above says where each store went; this says why. */
    const ledger = h(
      'table',
      { class: 'act-ledger' },
      h('caption', { class: 'gl__label', text: `Sol ${last.sol}: made and used` }),
      h(
        'thead',
        null,
        h('tr', null, h('th', { scope: 'col', text: 'Resource' }), h('th', { scope: 'col', text: 'Made' }), h('th', { scope: 'col', text: 'Used' }), h('th', { scope: 'col', text: 'Change' })),
      ),
    );
    const body = h('tbody');
    const notes: string[] = [];

    for (const row of ledgerRows(last)) {
      body.append(
        h(
          'tr',
          { 'data-tone': row.tone },
          h('th', { scope: 'row' }, h('span', { class: 'act-change__label' }, icon(RESOURCE_ICON[row.name]), row.label)),
          h('td', { class: 'act-ledger__made', text: row.made }),
          h('td', { class: 'act-ledger__used', text: row.used }),
          h('td', { class: 'act-ledger__change', text: row.change }),
        ),
      );

      if (row.note !== '') notes.push(row.note);
    }

    ledger.append(body);

    const jobPower = Math.round(last.powerExtra);

    if (jobPower > 0 && last.blackout <= 0.01) {
      notes.unshift(
        last.powerWasted > 0
          ? `The day’s work used ${jobPower} kWh from today’s sunlight instead of the battery, so less power was wasted. The battery can end the same.`
          : `The day’s work used ${jobPower} kWh of today’s power.`,
      );
    }

    return [list, changes, ledger, ...notes.map((note) => h('p', { class: 'gl__note', text: note }))];
  }

  /* ---------------------------------------------------------------- the hub -- */

  /** One button on the hub: a pictogram, a label, and one line of state. */
  function tileButton(tile: HubTile): HTMLButtonElement {
    const locked = tile.locked === true;

    const button = h(
      'button',
      {
        class: 'act-tile',
        type: 'button',
        'data-tile': tile.id,
        'data-attention': String(tile.attention),
        'data-locked': String(locked),
        'aria-haspopup': 'dialog',
        'aria-disabled': locked ? 'true' : 'false',
      },
      h('span', { class: 'act-tile__icon', 'aria-hidden': 'true' }, icon(locked ? 'lock' : TILE_ICON[tile.id])),
      h(
        'span',
        { class: 'act-tile__body' },
        h('span', { class: 'act-tile__label', text: tile.label }),
        h('span', { class: 'act-tile__status', text: tile.status }),
        tile.chips.length === 0
          ? null
          : h(
              'span',
              { class: 'act-tile__chips' },
              ...tile.chips.map((chip) =>
                h(
                  'span',
                  { class: 'act-chip', 'data-tone': chip.tone },
                  icon(RESOURCE_ICON[chip.name]),
                  h('span', { text: chip.text }),
                ),
              ),
            ),
      ),
      h('span', { class: 'act-tile__chevron', 'aria-hidden': 'true' }, icon(locked ? 'lock' : 'chevron')),
    );

    button.addEventListener('click', () => {
      if (locked) {
        /* The orders are behind the training, and the tile says why rather
           than opening a sheet the player cannot use. */
        trainingNotice = `Complete ${TRAINING_DAILY_LIMIT} training games to unlock today's colony tasks.`;
        playSfx('order-locked');
        render();

        return;
      }

      openSection(tile.id);
    });

    return button;
  }

  /** The day, as five or six buttons and a control. */
  function hubPanel(state: RunState, tiles: readonly HubTile[]): HTMLElement {
    const mission = missionHeadline(state);
    const loading = loadingForecast && state.forecast.length === 0;
    const orders = activityRows(state, state.sol + 1);
    const trained = trainingUnlocked(state);
    /* The day cannot be skipped.
     *
     * Two things have to be true before the crew can run the sol: the work
     * orders have to be open (so the crew has trained), and one of them has to
     * be stamped. The second was checked; the first was only checked by
     * accident, because a locked day happens to have no stamped order either.
     * Both are checked here, and the button says which one is missing.
     */
    const mustChoose = orders.length > 0 && !orders.some((row) => row.chosen);
    const mustTrain = !trained;

    const grid = h('div', { class: 'act-hub' }, ...tiles.map(tileButton));

    /* The lock, said out loud on the desk itself: the orders are behind the
       training, and a player who cannot find out why is stuck. */
    const lock =
      trained
        ? false
        : h(
            'div',
            { class: 'gl__callout', 'data-tone': 'warn' },
            h('span', { class: 'gl__callout-icon', 'aria-hidden': 'true' }, icon('lock')),
            h(
              'div',
              null,
              h('p', { class: 'gl__callout-title', text: "Today's tasks are locked" }),
              h('p', {
                class: 'gl__callout-detail',
                text: `Do ${TRAINING_DAILY_LIMIT} training games in the standing orders to open today's work orders.`,
              }),
            ),
          );

    /* The other callout the desk can carry: a store already under the floor.
       One sol there is survivable, two is the end of the run, and the sign has
       to say which of the two the crew is on. */
    const warned = floorWarning(state);
    const floor =
      warned === null
        ? false
        : h(
            'div',
            { class: 'gl__callout', 'data-tone': 'bad' },
            h('span', { class: 'gl__callout-icon', 'aria-hidden': 'true' }, icon(RESOURCE_ICON[warned.name])),
            h(
              'div',
              null,
              h('p', { class: 'gl__callout-title', text: `${warned.label} is at ${warned.percent}%` }),
              h('p', { class: 'gl__callout-detail', text: warned.text }),
            ),
          );

    const go = h(
      'button',
      {
        class: 'gl__btn gl__btn--primary gl__btn--start',
        type: 'button',
        disabled: loading || mustChoose || mustTrain,
      },
      loading ? 'Reading space weather…' : `Run sol ${state.sol + 1}`,
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true' }, icon('chevron')),
    );

    go.addEventListener('click', onRunSol);

    /* The note says which of the two is missing, so the player is never left
       with a button that will not press and no idea why. */
    const note = mustTrain
      ? h('p', {
          class: 'gl__note',
          text: `Do ${TRAINING_DAILY_LIMIT} training games to open today's work orders first.`,
        })
      : mustChoose
        ? h('p', { class: 'gl__note', text: "Choose today's activity to run the sol." })
        : false;

    return gamePanel({
      kicker: `Sol ${state.sol + 1} of ${WIN_SOL}`,
      title: mission.title,
      sub: mission.subtitle,
      corner: pointsCorner(state),
      body: [
        lock,
        floor,
        gameSection('Today for the outpost', grid),
        forecastSection(state),
      ],
      footer: [go, note],
    });
  }

  /** The section that is open, if any, as a sheet over the desk. */
  function sheetFor(state: RunState, tiles: readonly HubTile[]): HTMLElement | null {
    const section = openSheet;

    if (section === null) return null;

    const bodies: Record<HubSection, () => readonly (Node | false)[]> = {
      tasks: () => tasksBody(state),
      desk: () => deskBody(state),
      orders: () => ordersBody(state),
      stats: () => statsBody(state),
      data: () => dataBody(state),
      review: () => reviewBody(state),
    };

    const tile = tiles.find((entry) => entry.id === section);

    return sheet({
      icon: TILE_ICON[section],
      kicker: `Sol ${state.sol + 1} of ${WIN_SOL}`,
      title: tile?.label ?? 'The desk',
      body: bodies[section](),
      doneLabel: section === 'tasks' ? 'Back to the desk' : 'Got it',
      onClose: closeSection,
    });
  }

  /**
   * The mini game's own sheet, over the section it was opened from.
   *
   * It is a sheet of its own rather than a part of one: the tool belongs to an
   * order, not to the desk, and a tool that hangs off the desk is a tool that
   * outlives the order it was for (ISS-093). The section sheet stays behind
   * it, so closing the tool puts the player back on the order.
   */
  function toolSheetFor(state: RunState): HTMLElement | null {
    if (openTool === null) return null;

    return sheet({
      icon: 'pick',
      kicker: `Sol ${state.sol + 1} of ${WIN_SOL}`,
      title: openTool.tool.name,
      body: [inspectionSection(state)],
      doneLabel: 'Back to the orders',
      layer: 'tool',
      onClose: closeTool,
    });
  }

  /** A crisis: the same shell, with the decision where the hub was. */
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
      const art = CRISIS_ART[crisis.kind][index] ?? { icon: 'chevron' };
      const picture =
        art.src === undefined
          ? h('span', { class: 'gl__choice-icon', 'aria-hidden': 'true' }, icon(art.icon ?? 'chevron'))
          : h('span', { class: 'gl__choice-icon' }, h('img', { class: 'gl__choice-img', src: art.src, alt: '' }));

      /*
       * An option the batteries cannot pay for is shown, greyed and priced:
       * hiding it would leave the player wondering why the digger was never
       * offered, and offering it would spend power the run does not have. The
       * price is the option's own `powerKwh`, so the card and the charge agree.
       */
      const affordable = canAffordOption(state, option);
      const budget = powerToday(state);
      const detail = affordable
        ? option.detail
        : `${option.detail} You can spend ${budget.spendable} kWh today, and tonight needs ${budget.nightNeed} kWh.`;

      const button = h(
        'button',
        {
          class: affordable ? 'gl__choice' : 'gl__choice gl__choice--locked',
          type: 'button',
          'data-choice': option.id,
          disabled: !affordable,
        },
        picture,
        h('span', null, h('span', { class: 'gl__choice-title', text: option.label }), h('span', { class: 'gl__choice-detail', text: detail })),
        h('span', { class: 'gl__choice-arrow', 'aria-hidden': 'true' }, icon('chevron')),
      );

      if (affordable) button.addEventListener('click', () => choose(crisis, option.id, false));
      choices.append(button);
      firstChoice ??= affordable ? button : firstChoice;
    }

    const ask = h(
      'button',
      { class: 'gl__btn gl__btn--navy', type: 'button' },
      h('span', null, icon('dish'), ' Ask Mission Control'),
      h('span', { 'aria-hidden': 'true', text: '?' }),
    );

    ask.addEventListener('click', () => {
      earthBox.hidden = false;

      if (!inTime) {
        playSfx('earth-too-late');
        earthBox.textContent = `Earth is ${oneWayMinutes(sol)} minutes away each way. A reply would take ${roundTripMinutes(sol)} minutes, and this problem arrives in ${crisis.windowMinutes}. You are on your own: the crew has to decide.`;

        return;
      }

      playSfx('earth-reply');
      const advice = earthAdvice(state, crisis);
      const label = optionOf(crisis, advice.optionId)?.label ?? advice.optionId;

      earthBox.textContent = `Mission Control, ${roundTripMinutes(sol)} minutes later: ${advice.text} (They suggest: ${label}.)`;
    });

    const calm = h('button', { class: 'gl__calm', type: 'button', 'aria-pressed': String(calmMode), 'data-sfx-hover': 'off' });

    calm.textContent = 'Take your time · no countdown';
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

    /* The desk is still the desk. A crisis lands on it; it does not replace
       it, so a find the rover brought back waits there until it is answered. */
    const find = roverCard(state);

    const body: (Node | false)[] = [
      crisis.urgent ? h('div', { class: 'gl__clock' }, h('span', { class: 'gl__clock-bar' }, clockBar), clockText) : false,
      choices,
      earthBox,
      find === false ? false : gameSection('The rover found something', find),
    ];

    /* The alert is the one screen where a struggling reader loses the most:
       the clock is running and the choices matter. Reading it does not pause
       anything, but "take your time" is right below. */
    const read = readButton(
      () =>
        [crisis.title, crisis.prompt, ...crisis.options.map((option) => `${option.label}. ${option.detail}`)].join(
          ' ',
        ),
      { ariaLabel: 'Read this alert and the choices aloud' },
    );

    const panel = gamePanel({
      kicker: `Sol ${sol} · ${EVENT_NAME[crisis.kind]}`,
      title: crisis.title,
      sub: crisis.prompt,
      body,
      footer: [ask, crisis.urgent ? calm : false, read ?? false],
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
    /* The panel is about to be replaced. Any card being read aloud belongs to
       the old panel, so stop it before its DOM disappears. */
    stopReading();

    if (run === null || run.regionId === '') {
      notice('Pick a landing site first.', 'Choose a landing site', 'landing-site');

      return;
    }

    if (run.modules.length === 0) {
      notice('Build your outpost before the first sol.', 'Build the outpost', 'base');

      return;
    }

    syncTransitionSfx(run, lastSeenState);
    lastSeenState = run;
    const state = run;
    const crisis = pendingCrisis(state);
    const last = state.log[state.log.length - 1];

    /* Keep the open sheet where the player left it: choosing an order or
       answering a find redraws the screen, and a sheet that jumped to the top
       would lose the row they were reading. */
    const scrolled = mount.querySelector<HTMLElement>('.sheet__body');

    if (scrolled !== null) sheetScroll = scrolled.scrollTop;

    /* The panel scrolls too, and `replaceChildren` below destroys that
       container. Recording the offset here and putting it back at the end of
       the redraw is what stops the desk jumping to the top on every press,
       toast and late-arriving forecast (ISS-080). */
    const restoreScroll = keepScroll(mount);

    clockNodes = null;

    /* The site's own scores, on the picture where there is room for them.
       They used to be a line of text under the decision, where they read as
       one more paragraph. */

    const world =
      crisis === null
        ? gameWorld({
            label: 'Your outpost',
            weather: 'Clear skies',
            crew: last === undefined ? 'A sol is one Mars day. Ready for our first one?' : `Sol ${last.sol} is done. Ready for the next one?`,
            figures: moduleFigures(state.modules),
            showAstronaut: false,
            signals: [scienceSignal(state)],
          })
        : gameWorld({
            label: 'Crew alert',
            weather: `${EVENT_NAME[crisis.kind]} incoming`,
            weatherIcon: EVENT_ICON[crisis.kind],
            crew: CRISIS_BRIEF[crisis.kind].crew,
            figures: moduleFigures(state.modules),
            showAstronaut: false,
            hint: earthIsInTime(state, crisis)
              ? `Mission Control can answer in ${roundTripMinutes(crisis.sol)} minutes.`
              : `Earth cannot reply before this ${EVENT_NAME[crisis.kind].toLowerCase()} arrives.`,
            signals: [
              { icon: EVENT_ICON[crisis.kind], tone: 'warn', kicker: EVENT_NAME[crisis.kind], text: CRISIS_BRIEF[crisis.kind].signal },
              scienceSignal(state),
            ],
          });

    const tiles = hubTiles(state, {
      nasaToday: dailyFacts.length > 0,
      pictures: picturesBehind(state),
      liveFlares: loaded?.flares.length ?? 0,
    });
    const panel = crisis === null ? hubPanel(state, tiles) : crisisPanel(state, crisis);

    const screen = gameScreen({
      hud: hudFor(state),
      world,
      panel,
      variant: 'gl--act',
      headerSub: 'RUNNING THE DAY',
      onLeave: () => navigate('naming'),
      day: dayModel(state, advancedSol),
      showEncyclopedia: hasReachedOutpost(run),
      help: guideButton(() => {
        guideOpen = true;
        openSheet = null;
        /* The guide is over everything, so the mini game goes with it: a tool
           that is still open behind the guide would be waiting when it closed
           (ISS-093). */
        openTool?.tool.destroy?.();
        openTool = null;
        toolScroll = 0;
        render();
      }),
    });

    /* The guide sits over the whole screen, as a dialog: it is read once and
       dismissed, and the day behind it is untouched. It is mounted on the
       document so a redraw of the desk cannot reset the page being read. */
    if (guideOpen && guideEl === null) {
      guideEl = guidePanel(closeGuide);
      document.body.append(guideEl);
    }

    if (!guideOpen && guideEl !== null) {
      guideEl.remove();
      guideEl = null;
    }

    const open = guideOpen || crisis !== null ? null : sheetFor(state, tiles);

    if (open !== null) screen.append(open);

    /* The mini game's sheet goes on top of the section sheet, and only while
       the section sheet is there to be on top of. */
    const tool = open === null ? null : toolSheetFor(state);

    if (tool !== null) screen.append(tool);

    mount.replaceChildren(screen);

    /* A training game is open over the desk, so it has to survive the
       redraw: a redraw replaces the screen, and the game would go with it
       while its clock kept running. */
    if (trainingGame !== null) mount.append(trainingGame.element);

    if (open !== null) {
      const body = open.querySelector<HTMLElement>('.sheet__body');

      if (body !== null) body.scrollTop = sheetScroll;
    }

    if (tool !== null) {
      const body = tool.querySelector<HTMLElement>('.sheet__body');

      if (body !== null) body.scrollTop = toolScroll;
    }

    /* Focus follows the thing that was replaced: into the sheet when it opens,
       back to its button when it closes. */
    if (focusSheet) {
      focusSheet = false;

      const close = tool !== null ? sheetCloseButton(tool) : open === null ? null : sheetCloseButton(open);

      if (close !== null) close.focus();
      /* A sheet can only be open on a calm sol; if one is not, the tiles are
         the next best place to land. */
      else pendingFocus = mount.querySelector<HTMLElement>('.act-tile');
    } else if (focusTile !== null) {
      const target = focusTile;

      focusTile = null;
      mount.querySelector<HTMLElement>(`.act-tile[data-tile="${target}"]`)?.focus();
    } else if (focusToolButton !== null) {
      /* The mini game closed: the player goes back to the order they were
         working, not to the hub and not to the top of a list. */
      const target = focusToolButton;

      focusToolButton = null;
      mount
        .querySelector<HTMLElement>(`.insp__slot[data-activity="${target}"] .insp__open`)
        ?.focus();
    }

    if (pendingFocus !== null) {
      pendingFocus.focus();
      pendingFocus = null;
    }

    /* Last, so the focus calls above cannot drag the panel somewhere else. */
    restoreScroll();
  }

  function notice(text: string, label: string, route: 'landing-site' | 'base'): void {
    const button = h('button', { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' }, label, h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true' }, icon('chevron')));

    button.addEventListener('click', () => navigate(route));

    mount.replaceChildren(
      gameScreen({
        hud: [],
        world: gameWorld({ label: 'Not ready yet', weather: 'Waiting', crew: 'We need a site and an outpost first.', figures: [] }),
        panel: gamePanel({ kicker: 'Not ready yet', title: label, sub: text, footer: [button] }),
        variant: 'gl--act',
        headerSub: 'RUNNING THE DAY',
        onLeave: () => navigate('naming'),
      }),
    );
  }

  render();

  if (run !== null && run.modules.length > 0 && run.forecast.length === 0) {
    loadingForecast = true;
    render();

    void loadForecast(controller.signal, Date.now(), siteScore(run.regionId).dust).then((result) => {
      if (disposed || run === null) return;

      loadingForecast = false;
      loaded = result;
      run = withState(run, { forecast: result.forecast });
      setRun(run);
      render();
    });
  }

  /* NASA's daily pictures. Fetched once for the whole session: the loader
     remembers the answer, so the debrief costs no second request. */
  void loadDailyFacts(controller.signal).then((result) => {
    if (disposed) return;

    dailyFacts = result.facts;
    dailyDetail = result.detail;
    render();
  });

  return () => {
    disposed = true;
    controller.abort();
    stopTimer();
    openTool?.tool.destroy?.();
    openTool = null;

    if (advanceTimer !== null) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }

    clockNodes = null;
    guideEl?.remove();
    guideEl = null;
    mount.replaceChildren();
  };
}
