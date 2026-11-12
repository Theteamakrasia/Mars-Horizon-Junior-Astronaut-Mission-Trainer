/**
 * Astronaut training: the section on the Standing orders sheet, the screen a
 * training game is played on, and the record of what has been done.
 *
 * The rules live in `sim/training.ts` and the games are in `ui/training*.ts`.
 * This file draws the two things the player sees — the six cards and the game
 * screen — and keeps the one thing the browser is good at: the record of the
 * day's training, which survives a refresh.
 *
 * The record is the only thing in the game that is written down. The run
 * itself is in memory (D-003), so a refresh still loses the outpost — but a
 * training game the player finished is not offered again, and the points it
 * earned are still on the score.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import {
  TRAINING_GAMES,
  TRAINING_REWARDS,
  canStartTraining,
  completeTraining,
  emptyTraining,
  makeRandom,
  trainingDay,
  trainingDayFor,
  trainingDayRecord,
  trainingSol,
  withTrainingDay,
  EMPTY_TRAINING_RECORD,
  type TrainingDayRecord,
  type TrainingGame,
  type TrainingGameId,
  type TrainingPerformance,
  type TrainingRecord,
  type TrainingState,
} from '../sim/training';
import type { RunState } from '../sim/run';

import { mountAsteroid } from './trainingAsteroid';
import { mountCargo } from './trainingCargo';
import { mountMerge } from './trainingMerge';
import { mountMemory } from './trainingMemory';
import { mountRover } from './trainingRover';
import { mountSolar } from './trainingSolar';
import type { TrainingGameHandle, TrainingGameMount } from './trainingGame';

import './training.css';

/** The picture on each training card. */
const GAME_ICON: Readonly<Record<TrainingGameId, IconName>> = {
  'resource-merge': 'box',
  'memory-match': 'sparkle',
  'rover-parking': 'rover',
  'solar-power-up': 'sun',
  'cargo-sorting': 'tray',
  'asteroid-defender': 'rock',
};

/** The six games, and how each one is mounted. */
const GAME_MOUNT: Readonly<Record<TrainingGameId, TrainingGameMount>> = {
  'resource-merge': mountMerge,
  'memory-match': mountMemory,
  'rover-parking': mountRover,
  'solar-power-up': mountSolar,
  'cargo-sorting': mountCargo,
  'asteroid-defender': mountAsteroid,
};

/** What each band is called on the completion screen. */
const PERFORMANCE_LABEL: Readonly<Record<TrainingPerformance, string>> = {
  excellent: 'Excellent! ⭐⭐⭐',
  good: 'Good work! ⭐⭐',
  basic: 'Done ⭐',
};

/** Where the record of the day's training is written. */
const STORAGE_KEY = 'mars-horizon.training.v1';

/* ------------------------------------------------------------------ storage -- */

/** The browser's storage, if it has any and it will let us near it. */
function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** One day's record, if it is one we wrote. */
function readDay(value: unknown): TrainingDayRecord | null {
  if (typeof value !== 'object' || value === null) return null;

  const day = value as { completed?: unknown; pointsToday?: unknown };

  if (!Array.isArray(day.completed)) return null;
  if (typeof day.pointsToday !== 'number' || !Number.isFinite(day.pointsToday)) return null;

  const completed = day.completed.filter(
    (entry): entry is TrainingDayRecord['completed'][number] =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { gameId?: unknown }).gameId === 'string' &&
      typeof (entry as { points?: unknown }).points === 'number',
  );

  return { completed, pointsToday: Math.max(0, day.pointsToday) };
}

/** Everything that has been trained, as it was written down. */
export function readTrainingRecord(): TrainingRecord {
  try {
    const raw = store()?.getItem(STORAGE_KEY);

    if (raw === null || raw === undefined) return EMPTY_TRAINING_RECORD;

    const parsed = JSON.parse(raw) as { days?: unknown };

    if (typeof parsed !== 'object' || parsed === null || typeof parsed.days !== 'object' || parsed.days === null) {
      return EMPTY_TRAINING_RECORD;
    }

    const days: Record<string, TrainingDayRecord> = {};

    for (const [sol, value] of Object.entries(parsed.days as Record<string, unknown>)) {
      const day = readDay(value);

      if (day !== null) days[sol] = day;
    }

    return { days };
  } catch {
    return EMPTY_TRAINING_RECORD;
  }
}

/** Write down what has been trained today. */
export function writeTrainingDay(sol: number, state: TrainingState): void {
  try {
    const record = withTrainingDay(readTrainingRecord(), sol, trainingDayRecord(state));

    store()?.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* A browser that will not let us write is a browser that loses the record. */
  }
}

/**
 * Forget every written-down training day.
 *
 * The record is keyed by sol, not by run, so without this a new run on sol 1
 * would inherit the games a previous run finished (and their points). It is
 * called whenever a new run begins.
 */
export function clearTrainingRecord(): void {
  try {
    store()?.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear if the browser will not let us near it. */
  }
}

/**
 * Put the written-down training back onto a run.
 *
 * A run that has not done any training yet today takes the record for the
 * sol it is on: the games it finished and the points they earned. A run that
 * has already trained today keeps what it did — the session is the truer
 * record, and a browser that refused to write must not take points away.
 */
export function applyTrainingRecord(run: RunState): RunState {
  const sol = trainingSol(run);
  const done = run.training.sol === sol ? run.training : emptyTraining(sol);

  if (done.completed.length > 0) return run;

  const day = trainingDayFor(readTrainingRecord(), sol);

  if (day === null || day.completed.length === 0) return run;

  return {
    ...run,
    science: run.science + day.pointsToday,
    training: { sol, completed: day.completed, pointsToday: day.pointsToday },
  };
}

/* ------------------------------------------------------------------ section -- */

/** What the Play button on a card says. */
function buttonText(status: 'available' | 'completed' | 'locked'): string {
  if (status === 'completed') return 'Play again';
  if (status === 'locked') return 'Locked';

  return 'Play';
}

/**
 * The ASTRONAUT TRAINING section.
 *
 * It goes at the top of the Standing orders sheet: the day's progress, and
 * the six games. Every card says what the game is, how hard it is and what
 * it is worth, and says whether it can be played at all today.
 */
export function trainingSection(
  run: RunState,
  options: { readonly notice: string; readonly onPlay: (gameId: TrainingGameId) => void },
): HTMLElement {
  const day = trainingDay(run);
  const percent = Math.round((day.completedCount / day.dailyLimit) * 100);

  const progress = h(
    'div',
    { class: 'trn__progress' },
    h('p', { class: 'trn__progress-label', text: 'DAILY TRAINING PROGRESS' }),
    h('p', { class: 'trn__progress-count', text: `${day.completedCount}/${day.dailyLimit} GAMES COMPLETED` }),
    h(
      'div',
      { class: 'trn__bar', role: 'meter', 'aria-label': 'Training completed today', 'aria-valuemin': '0', 'aria-valuemax': String(day.dailyLimit), 'aria-valuenow': String(day.completedCount) },
      h('span', { class: 'trn__bar-fill', style: `width:${percent}%` }),
    ),
    h(
      'div',
      { class: 'trn__progress-meta' },
      h('span', { text: `Sol ${day.sol}` }),
      h('span', { text: `Points today: ${day.pointsToday}` }),
      h('span', { text: `Games left today: ${day.remaining}` }),
    ),
  );

  const cards = h(
    'div',
    { class: 'trn__cards' },
    ...TRAINING_GAMES.map((game: TrainingGame) => {
      const row = day.games.find((entry) => entry.id === game.id);
      const status = row?.status ?? 'available';
      const button = h('button', { class: 'trn__play', type: 'button', text: buttonText(status) });

      button.addEventListener('click', () => options.onPlay(game.id));

      return h(
        'article',
        { class: `trn__card trn__card--${status}` },
        h('span', { class: 'trn__card-icon', 'aria-hidden': 'true' }, icon(GAME_ICON[game.id])),
        h('h3', { class: 'trn__card-name', text: game.name }),
        h('p', { class: 'trn__card-text', text: game.description }),
        h(
          'p',
          { class: 'trn__card-tags' },
          h('span', { class: 'trn__tag', text: game.category }),
          h('span', { class: 'trn__tag', text: game.difficulty }),
          h('span', {
            class: 'trn__tag',
            text: status === 'completed' ? `+${row?.points ?? 0} points` : `${TRAINING_REWARDS.basic}–${TRAINING_REWARDS.excellent} points`,
          }),
        ),
        status === 'completed'
          ? h('p', { class: 'trn__card-done', text: `Completed ✓ · ${row?.points ?? 0} points earned` })
          : status === 'locked'
            ? h('p', { class: 'trn__card-locked', text: '🔒 Locked — two games are done today' })
            : null,
        button,
      );
    }),
  );

  return h(
    'section',
    { class: 'trn' },
    h('h2', { class: 'trn__title', text: 'ASTRONAUT TRAINING' }),
    h('p', {
      class: 'trn__sub',
      text: "Complete two training activities to prepare your colony for today's mission.",
    }),
    progress,
    options.notice === '' ? null : h('p', { class: 'trn__notice', role: 'status', text: options.notice }),
    cards,
  );
}

/* -------------------------------------------------------------------- modal -- */

/** A training game that is open on the screen. */
export interface TrainingGameScreen {
  /** The element to put on the screen. */
  readonly element: HTMLElement;
  /** Move the keyboard to the game. */
  readonly focus: () => void;
  /** Stop the game and take it off the screen. */
  readonly close: () => void;
}

/**
 * Open a training game.
 *
 * The game is played in a dialog over the sheet it was opened from: the
 * Standing orders are still behind it, and closing the game puts the player
 * back where they were. It is refused outright when the day's two games are
 * already done, and the reason is given rather than hidden.
 */
export function openTrainingGame(
  gameId: TrainingGameId,
  options: {
    readonly run: RunState;
    /** Called when the game is finished, with the run that has the points on it. */
    readonly onFinished: (run: RunState) => void;
    /** Called when the player closes the game. */
    readonly onClose: () => void;
  },
): TrainingGameScreen | null {
  const meta = TRAINING_GAMES.find((game) => game.id === gameId);

  if (meta === undefined) return null;

  const start = canStartTraining(options.run, gameId);

  if (!start.ok) return null;

  /* The words are copied out of the catalogue so the closures below do not
     have to look the game up again. */
  const gameName = meta.name;
  const winMessage = meta.winMessage;
  const instructions = meta.instructions;

  let handle: TrainingGameHandle | null = null;
  let finished = false;
  let round = 0;

  const status = h('span', { class: 'trn__status' });
  const area = h('div', { class: 'trn__area' });
  const body = h('div', { class: 'trn__body' });
  const close = h('button', { class: 'trn__close', type: 'button', 'aria-label': 'Close' }, icon('close'));

  const title = h('h2', { class: 'trn__head-title' }, icon(GAME_ICON[gameId]), gameName);
  const head = h('header', { class: 'trn__head' }, title, status, close);

  const restart = h('button', { class: 'trn__btn', type: 'button' }, '↻ Restart');
  const leave = h('button', { class: 'trn__btn', type: 'button' }, '✕ Exit');

  const panel = h('div', { class: 'trn__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': gameName });
  const backdrop = h('div', { class: 'trn__backdrop' }, panel);

  function shut(): void {
    handle?.destroy();
    handle = null;
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
    options.onClose();
  }

  function play(): void {
    handle?.destroy();
    area.replaceChildren();

    /* A fresh seed every time a game opens, so the cards, crates, rocks and
       asteroids are never dealt the same way twice. */
    const random = makeRandom((Math.random() * 0xffffffff) >>> 0);

    handle = GAME_MOUNT[gameId](area, {
      setStatus: (text) => {
        status.textContent = text;
      },
      random,
      onComplete: (performance) => {
        if (finished) return;

        finished = true;

        const outcome = completeTraining(options.run, gameId, performance);

        if (!outcome.ok) {
          /* It was finished earlier today, so there is nothing to pay for. */
          showDone(null, outcome.message);

          return;
        }

        writeTrainingDay(trainingSol(outcome.run), outcome.run.training);
        options.onFinished(outcome.run);
        showDone(outcome, null);
      },
    });
  }

  /** The screen the player sees when the game is over. */
  function showDone(
    outcome: { points: number; performance: TrainingPerformance; completedCount: number; dailyLimit: number; tasksUnlocked: boolean } | null,
    refusal: string | null,
  ): void {
    const again = h('button', { class: 'trn__btn trn__btn--primary', type: 'button', text: 'Continue' });

    again.addEventListener('click', shut);

    if (outcome === null) {
      body.replaceChildren(
        h('h3', { class: 'trn__done-title', text: 'Training finished' }),
        h('p', { class: 'trn__done-text', text: refusal ?? 'No points today.' }),
        h('div', { class: 'trn__foot' }, again),
      );

      return;
    }

    const done: HTMLElement[] = [
      h('div', { class: 'trn__done-icon', 'aria-hidden': 'true' }, icon('star')),
      h('h3', { class: 'trn__done-title', text: 'TRAINING COMPLETED!' }),
      h('p', { class: 'trn__done-text', text: winMessage }),
      h('p', { class: 'trn__done-perf', text: PERFORMANCE_LABEL[outcome.performance] }),
      h('p', { class: 'trn__done-points', text: `+${outcome.points} POINTS` }),
      h('p', { class: 'trn__done-progress', text: `Daily progress: ${outcome.completedCount}/${outcome.dailyLimit} games completed` }),
    ];

    if (outcome.tasksUnlocked) {
      done.push(h('p', { class: 'trn__done-unlocked', text: "Today's colony tasks are unlocked!" }));
    }

    done.push(h('div', { class: 'trn__foot' }, again));

    body.replaceChildren(...done);
  }

  restart.addEventListener('click', () => {
    round += 1;
    finished = false;
    body.replaceChildren(
      h('p', { class: 'trn__instructions', text: instructions }),
      area,
      h('div', { class: 'trn__foot' }, restart, leave),
    );
    play();
  });

  leave.addEventListener('click', shut);
  close.addEventListener('click', shut);

  /* Escape closes the game, and the keyboard stays inside the dialog. */
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      shut();

      return;
    }

    if (event.key !== 'Tab') return;

    const stops = [...panel.querySelectorAll<HTMLElement>('button:not([disabled])')];

    if (stops.length === 0) return;

    const first = stops[0] as HTMLElement;
    const last = stops[stops.length - 1] as HTMLElement;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  body.append(h('p', { class: 'trn__instructions', text: instructions }), area, h('div', { class: 'trn__foot' }, restart, leave));
  panel.append(head, body);
  document.addEventListener('keydown', onKey, true);
  play();

  return {
    element: backdrop,
    focus: () => close.focus(),
    close: shut,
  };
}
