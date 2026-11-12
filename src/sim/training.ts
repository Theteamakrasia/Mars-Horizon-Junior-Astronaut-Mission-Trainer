/**
 * Astronaut training: the six mini-games the crew works through each sol.
 *
 * The rule is short: finish any two of the six games and today's work orders
 * unlock. It is the same shape as the rest of the game — a rule book the
 * player works to — so the training sits inside the Standing orders sheet
 * rather than on a screen of its own.
 *
 * Three things live here and nowhere else:
 *
 *  - the daily rule: two games a sol, the same game twice if the crew wants to
 *    practise it, and what a finished game is worth;
 *  - the six games' words: name, difficulty, how to play, and the line the
 *    completion screen says;
 *  - the shape of a finished day, so a screen never has to invent one.
 *
 * Pure. No DOM, no timers, no storage, no `Math.random`: the games are handed
 * a generator instead (see `makeRandom`), so every rule here can be asserted
 * on exactly. The storage lives in `ui/training.ts`, which is the only layer
 * that is allowed to know a browser exists.
 */

import { systemsFor } from './modules';
import { clampStores, type ResourceName, type ResourceStores } from './resources';
import type { RunState } from './run';

/** The six games, by id. The id is what a finished day is recorded against. */
export type TrainingGameId =
  | 'resource-merge'
  | 'memory-match'
  | 'rover-parking'
  | 'solar-power-up'
  | 'cargo-sorting'
  | 'asteroid-defender';

/** How well a game was done. The band decides the points. */
export type TrainingPerformance = 'basic' | 'good' | 'excellent';

/** One training game, and everything the screen says about it. */
export interface TrainingGame {
  readonly id: TrainingGameId;
  readonly name: string;
  /** What the game trains: Strategy, Memory, Logic and so on. */
  readonly category: string;
  /** How hard it is, in one word. */
  readonly difficulty: string;
  /** One line for the card on the sheet. */
  readonly description: string;
  /** How to play, for the game screen. */
  readonly instructions: string;
  /** The line the completion screen says when it is won. */
  readonly winMessage: string;
}

/** The six games, in the order they are shown. */
export const TRAINING_GAMES: readonly TrainingGame[] = [
  {
    id: 'resource-merge',
    name: 'Resource Merge',
    category: 'Strategy',
    difficulty: 'Easy',
    description: 'Slide supplies together and merge them into a colony pod.',
    instructions:
      'Swipe the board or use the arrow keys. Two matching supplies slide together and become one better supply. Build the colony pod!',
    winMessage: 'You built a colony pod out of loose supplies.',
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    category: 'Memory',
    difficulty: 'Very Easy',
    description: 'Turn cards over and find every matching pair.',
    instructions:
      'Tap two cards. If they match they are taken off the table. Find all six pairs with as few tries as you can!',
    winMessage: 'Your memory is sharp, astronaut.',
  },
  {
    id: 'rover-parking',
    name: 'Rover Parking',
    category: 'Problem-solving',
    difficulty: 'Easy',
    description: 'Drive the rover around the rocks and park it at the outpost.',
    instructions:
      'Use the arrows to drive the rover to the outpost. Rocks block the way, and you only have a few moves to do it in.',
    winMessage: 'The rover is parked safely at the outpost.',
  },
  {
    id: 'solar-power-up',
    name: 'Solar Panel Power-Up',
    category: 'Logic',
    difficulty: 'Easy',
    description: 'Turn the power lines so the panels reach the battery.',
    instructions:
      'Tap a tile to turn it. Join the solar panel to the battery with one unbroken line of power.',
    winMessage: "You restored the colony's power network.",
  },
  {
    id: 'cargo-sorting',
    name: 'Cargo Sorting',
    category: 'Organization',
    difficulty: 'Very Easy',
    description: 'Put every incoming supply into the store it belongs to.',
    instructions: 'Drag each supply into the right store. You can also tap a supply and then tap the store.',
    winMessage: 'Every supply is stored where it belongs.',
  },
  {
    id: 'asteroid-defender',
    name: 'Asteroid Defender',
    category: 'Reaction',
    difficulty: 'Easy',
    description: 'Tap the asteroids before they reach the colony.',
    instructions: 'Tap the asteroids. Leave the friendly satellites alone. Clear twelve asteroids before the timer runs out!',
    winMessage: 'The colony is safe from the asteroids.',
  },
];

/**
 * How many games a sol allows.
 *
 * Two, because a sol is already a child's day: two games is a reward, not a
 * chore. It is also the number that makes the rule teachable — a third game
 * would be a bonus, and a bonus is a thing players ask for.
 *
 * The count is of games finished, not of different games: the same game can
 * be played twice, and the second time is the day's other play and pays
 * again. The crew did the work twice, so it is paid twice.
 */
export const TRAINING_DAILY_LIMIT = 2;

/**
 * What a finished game is worth, in science points.
 *
 * Small on purpose. The science score is a rank ladder set for a twelve-sol
 * run, and a training game is a warm-up rather than science: at ten points a
 * game the ladder would be climbed by playing rather than by working.
 */
export const TRAINING_REWARDS: Readonly<Record<TrainingPerformance, number>> = {
  basic: 2,
  good: 3,
  excellent: 4,
};

/**
 * What a finished game puts in the stores.
 *
 * The science is the warm-up; this is the point. Each game is tied to the
 * system it trains, so the crew's practice shows up in that store and nowhere
 * else — which makes the daily "which two of the six games" a real choice
 * rather than a formality: play the two the outpost needs today.
 *
 * Amounts are in each store's own unit, because the stores are: a percent of a
 * hundred-point tank for the four life stores, and kWh for power, whose tank
 * is as big as the batteries the crew built. Fifteen kWh is a tenth of a
 * single battery bank, so a game is a top-up and never a refill.
 *
 * The bands were tuned against `npm run balance`, not chosen for looking
 * round: two points a game of a life store is what keeps a competent player
 * between thirty and sixty percent of builds winning, and one point more
 * pushed every site past eighty. Two games a sol is the whole economy's lever,
 * so it is a small one.
 */
export interface TrainingYield {
  /** The store it fills. */
  readonly store: ResourceName;
  /** What it adds at each band, in that store's own unit. */
  readonly basic: number;
  readonly good: number;
  readonly excellent: number;
}

/**
 * The six games, and the store each one fills.
 *
 * Two games pay power, because the outpost has two jobs that teach it — and
 * because power is the one store with no floor line of its own, so it needs
 * the most ways to be topped up. The other four map one to one.
 */
export const TRAINING_YIELDS: Readonly<Record<TrainingGameId, TrainingYield>> = {
  'solar-power-up': { store: 'power', basic: 10, good: 15, excellent: 20 },
  'rover-parking': { store: 'power', basic: 10, good: 15, excellent: 20 },
  'cargo-sorting': { store: 'food', basic: 1, good: 2, excellent: 3 },
  'resource-merge': { store: 'water', basic: 1, good: 2, excellent: 3 },
  'memory-match': { store: 'oxygen', basic: 1, good: 2, excellent: 3 },
  'asteroid-defender': { store: 'shielding', basic: 1, good: 2, excellent: 3 },
};

/** What one finished game is worth, in the store it fills. */
export function trainingYield(
  gameId: TrainingGameId,
  performance: TrainingPerformance,
): { readonly store: ResourceName; readonly amount: number } {
  const spec = TRAINING_YIELDS[gameId];

  return { store: spec.store, amount: spec[trainingTier(performance)] };
}

/**
 * The stores after a day's training has been paid for.
 *
 * Takes the day in the order the games were played, so a tank that fills
 * part-way through a day keeps the overflow honest: the last game to hit a
 * full tank is the one that finds nothing to top up.
 */
export function withTrainingYields(
  stores: ResourceStores,
  capacity: number,
  completed: readonly TrainingCompletion[],
): ResourceStores {
  return completed.reduce((current, entry) => {
    const payout = trainingYield(entry.gameId, entry.performance);

    return clampStores(
      { ...current, [payout.store]: current[payout.store] + payout.amount },
      capacity,
    );
  }, stores);
}

/** One finished game. */
export interface TrainingCompletion {
  readonly gameId: TrainingGameId;
  readonly points: number;
  readonly performance: TrainingPerformance;
}

/**
 * What the crew has done in training today.
 *
 * `sol` is the sol this record belongs to. A new sol means a new record:
 * the day's games are available again, and the day's points start at zero.
 */
export interface TrainingState {
  /** The sol this record belongs to. */
  readonly sol: number;
  readonly completed: readonly TrainingCompletion[];
  /** The points training has earned on this sol. */
  readonly pointsToday: number;
}

/** A record for a sol with nothing done in it yet. */
export function emptyTraining(sol: number): TrainingState {
  return { sol, completed: [], pointsToday: 0 };
}

/** What a game is to the player right now. */
export type TrainingGameStatus = 'available' | 'completed' | 'locked';

/** One game, and where it stands today. */
export interface TrainingGameRow {
  readonly id: TrainingGameId;
  readonly status: TrainingGameStatus;
  /** The points it earned, or null when it has not been finished today. */
  readonly points: number | null;
  /**
   * How many times it has been finished today.
   *
   * More than one is normal: the same game can be played again for practice,
   * and it counts as another of the day's two plays and pays again. The rule
   * is about how many games are finished in a sol, not about how many
   * different ones.
   */
  readonly plays: number;
}

/** The whole of today's training, in one object. */
export interface TrainingDay {
  /** The sol being played. */
  readonly sol: number;
  /** How many games are finished today. */
  readonly completedCount: number;
  /** How many a sol allows. */
  readonly dailyLimit: number;
  /** How many are still to play today. */
  readonly remaining: number;
  /** The points training has earned today. */
  readonly pointsToday: number;
  /** True when today's work orders are open. */
  readonly tasksUnlocked: boolean;
  /** The six games, and where each one stands. */
  readonly games: readonly TrainingGameRow[];
}

/** The sol being played: the one the day's orders belong to. */
export function trainingSol(run: RunState): number {
  return run.sol + 1;
}

/**
 * Today's training, read off the run.
 *
 * The record on the run belongs to one sol. When the sol has moved on, the
 * record is stale and the day starts again: nothing is completed, no points
 * are counted, and all six games are available. That is the daily reset, and
 * it happens exactly once per sol because it is derived from the sol rather
 * than from a timer.
 */
export function trainingDay(run: RunState): TrainingDay {
  const sol = trainingSol(run);
  const current = run.training.sol === sol ? run.training : emptyTraining(sol);
  const completedCount = current.completed.length;
  const finished = completedCount >= TRAINING_DAILY_LIMIT;

  const games = TRAINING_GAMES.map((game): TrainingGameRow => {
    const plays = current.completed.filter((entry) => entry.gameId === game.id);
    const points = plays.length === 0 ? null : plays.reduce((sum, entry) => sum + entry.points, 0);

    /* A game that has been played can be played again while there is a slot
       left, so it stays 'available' until the day is full. Once the day is
       full it is 'completed' if it was played and 'locked' if it was not. */
    if (finished) return { id: game.id, status: plays.length > 0 ? 'completed' : 'locked', points, plays: plays.length };

    return { id: game.id, status: 'available', points, plays: plays.length };
  });

  return {
    sol,
    completedCount,
    dailyLimit: TRAINING_DAILY_LIMIT,
    remaining: Math.max(0, TRAINING_DAILY_LIMIT - completedCount),
    pointsToday: current.pointsToday,
    tasksUnlocked: finished,
    games,
  };
}

/** True when today's work orders are open. */
export function trainingUnlocked(run: RunState): boolean {
  return trainingDay(run).tasksUnlocked;
}

/** The points a band is worth, and the band itself for a stray value. */
export function trainingTier(performance: string): TrainingPerformance {
  return performance === 'excellent' || performance === 'good' ? performance : 'basic';
}

/** Why a game cannot be started, or that it can. */
export type TrainingStart =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'unknown' | 'limit';
      /** The sentence the player reads. */
      readonly message: string;
    };

/**
 * May this game be played right now?
 *
 * The rule is enforced here rather than by hiding a button: the sheet may
 * show six playable cards while only two of them can actually be finished,
 * and a player who finds a way past the button must not be paid for it.
 *
 * A game that was already finished today can be played again — practice is
 * free, and the second time counts as the day's other play and pays again.
 * The only thing that stops it is the day's limit: two finishes a sol, of
 * whichever games they like.
 */
export function canStartTraining(run: RunState, gameId: string): TrainingStart {
  const game = TRAINING_GAMES.find((entry) => entry.id === gameId);

  if (game === undefined) {
    return { ok: false, reason: 'unknown', message: 'That is not one of the training games.' };
  }

  const day = trainingDay(run);
  const row = day.games.find((entry) => entry.id === game.id);

  if (row?.status === 'locked') {
    return {
      ok: false,
      reason: 'limit',
      message: `You have finished ${day.dailyLimit} training games today. Come back next sol.`,
    };
  }

  return { ok: true };
}

/** What finishing a game did. */
export type TrainingOutcome =
  | {
      readonly ok: true;
      /** The run with the points and the stores on it. */
      readonly run: RunState;
      readonly points: number;
      readonly performance: TrainingPerformance;
      /**
       * What the game put in the stores.
       *
       * `stored` is what actually landed: the tank may have been nearly full,
       * and a child who is told "the batteries are full" learns more than one
       * whose reward silently evaporates.
       */
      readonly payout: {
        readonly store: ResourceName;
        readonly amount: number;
        readonly stored: number;
      };
      readonly completedCount: number;
      readonly dailyLimit: number;
      readonly tasksUnlocked: boolean;
      readonly pointsToday: number;
    }
  | {
      readonly ok: false;
      readonly run: RunState;
      readonly reason: 'unknown' | 'limit';
      readonly message: string;
    };

/**
 * Finish a game: record it, and pay for it.
 *
 * The points go onto the science score, which is the one balance the game
 * already has, so the header and the debrief count them without knowing that
 * training exists. A game can be finished twice in a sol — the second time is
 * the day's other play — and it pays twice, because the crew did the work
 * twice.
 */
export function completeTraining(
  run: RunState,
  gameId: TrainingGameId,
  performance: TrainingPerformance,
): TrainingOutcome {
  const start = canStartTraining(run, gameId);

  if (!start.ok) return { ok: false, run, reason: start.reason, message: start.message };

  const sol = trainingSol(run);
  const current = run.training.sol === sol ? run.training : emptyTraining(sol);

  const tier = trainingTier(performance);
  const points = TRAINING_REWARDS[tier];

  const training: TrainingState = {
    sol,
    completed: [...current.completed, { gameId, points, performance: tier }],
    pointsToday: current.pointsToday + points,
  };

  /* Practice pays twice: the science goes on the score, and the store the
     game trains gets topped up. Both are clamped, so a full tank quietly keeps
     the surplus and the payout reports what actually landed. */
  const capacity = systemsFor(run.modules, run.regionId).batteryKwh;
  const payout = trainingYield(gameId, tier);
  const stores = withTrainingYields(run.stores, capacity, training.completed.slice(-1));
  const stored = stores[payout.store] - run.stores[payout.store];

  const next: RunState = { ...run, science: run.science + points, training, stores };
  const day = trainingDay(next);

  return {
    ok: true,
    run: next,
    points,
    performance: tier,
    payout: { store: payout.store, amount: payout.amount, stored },
    completedCount: day.completedCount,
    dailyLimit: day.dailyLimit,
    tasksUnlocked: day.tasksUnlocked,
    pointsToday: day.pointsToday,
  };
}

/**
 * A small deterministic generator.
 *
 * The games need randomness, and a test that cannot pin its input is a test
 * that fails for reasons nobody can read. Every game is handed one of these
 * instead of `Math.random`, seeded from the sol, so the same sol always deals
 * the same cards and a demo repeats itself exactly.
 */
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed for one game on one sol: the same sol always deals the same cards. */
export function trainingSeed(sol: number, gameId: string): number {
  let hash = 2166136261;
  const text = `${sol}:${gameId}`;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * A day's training, as it is written down.
 *
 * The record is kept outside the run so it survives a refresh: the run
 * itself is in memory only, and a training game the player finished should
 * not be offered again simply because the page was reloaded.
 */
export interface TrainingDayRecord {
  readonly completed: readonly TrainingCompletion[];
  readonly pointsToday: number;
}

/** Every sol's training, as it is written down. */
export interface TrainingRecord {
  readonly days: Readonly<Record<string, TrainingDayRecord>>;
}

/** A record with nothing in it. */
export const EMPTY_TRAINING_RECORD: TrainingRecord = { days: {} };

/** One sol's record, or null when that sol has none. */
export function trainingDayFor(record: TrainingRecord, sol: number): TrainingDayRecord | null {
  return record.days[String(sol)] ?? null;
}

/** A record with one sol's training written into it. */
export function withTrainingDay(
  record: TrainingRecord,
  sol: number,
  day: TrainingDayRecord,
): TrainingRecord {
  return { days: { ...record.days, [String(sol)]: day } };
}

/** A run's training as it is written down. */
export function trainingDayRecord(state: TrainingState): TrainingDayRecord {
  return { completed: state.completed, pointsToday: state.pointsToday };
}
