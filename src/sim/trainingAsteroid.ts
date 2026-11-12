/**
 * Asteroid Defender: what drifts past the colony, and how the game is graded.
 *
 * Rocks drift in from the dark and the crew has to clear them before they
 * reach the outpost. Some of what drifts past is friendly — a satellite of
 * the relay — and clearing that is a mistake. The game is won by clearing
 * twelve asteroids inside the time.
 *
 * Pure. The timing is a pair of functions of the clock, and the grade is a
 * number of hits and misses, so the whole game can be played out in a test.
 */

import type { TrainingPerformance } from './training';

/**
 * How long a round lasts, in seconds.
 *
 * Fifty. The round is a reaction game and the player is a child with a
 * mouse: half a minute was long enough to feel the clock rather than the
 * rocks, and the game was lost on the timer rather than on the aim.
 */
export const ASTEROID_SECONDS = 50;

/** How many asteroids have to be cleared to win. */
export const ASTEROID_GOAL = 12;

/** How often a friendly satellite drifts past instead of a rock. */
export const ASTEROID_DECOY_CHANCE = 0.2;

/** This accuracy or better is an excellent run. */
export const ASTEROID_EXCELLENT_ACCURACY = 0.85;

/** This accuracy or better is a good run. */
export const ASTEROID_GOOD_ACCURACY = 0.65;

/**
 * How the asteroid round goes at a level.
 *
 * The goal grows for the first three levels - more rocks to clear, less time
 * to clear them in, and more satellites drifting past to leave alone - and
 * then the allowance shrinks: from the fourth level on, the seconds the
 * player has keep dropping.
 *
 * The bands widen as the round gets harder, so the player is paid the same
 * for the same quality of work whatever the level is.
 */
export interface AsteroidDifficulty {
  /** How long the round lasts, in seconds. */
  readonly seconds: number;
  /** How many rocks have to be cleared to win. */
  readonly goal: number;
  /** How often a friendly satellite drifts past instead of a rock. */
  readonly decoys: number;
  /** The accuracy an excellent run needs. */
  readonly excellent: number;
  /** The accuracy a good run needs. */
  readonly good: number;
}

/** One row per level. The first is the game as it always was. */
const ASTEROID_DIFFICULTY: readonly AsteroidDifficulty[] = [
  { seconds: 50, goal: 12, decoys: 0.2, excellent: 0.85, good: 0.65 },
  { seconds: 46, goal: 14, decoys: 0.25, excellent: 0.8, good: 0.6 },
  { seconds: 42, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 42, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 40, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 38, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 37, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 36, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 35, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 34, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 33, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
  { seconds: 32, goal: 16, decoys: 0.3, excellent: 0.75, good: 0.55 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function asteroidDifficulty(level: number): AsteroidDifficulty {
  const step = Math.min(ASTEROID_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return ASTEROID_DIFFICULTY[step - 1] as AsteroidDifficulty;
}

/**
 * How long until the next rock appears, in milliseconds.
 *
 * The round gets faster as it goes on, so the last ten seconds are the
 * busy ones — but it starts gently, because the first rock of a round is
 * the one a player is still finding their feet on.
 */
export function asteroidDelay(elapsedSeconds: number): number {
  return Math.max(700, 1200 - elapsedSeconds * 10);
}

/**
 * How long a rock stays on the screen, in milliseconds.
 *
 * Long enough to turn round and click it, which is what a seven-year-old
 * with a mouse needs.
 */
export function asteroidLife(elapsedSeconds: number): number {
  return Math.max(1400, 2200 - elapsedSeconds * 16);
}

/** Is what just drifted past a friendly satellite? */
export function asteroidIsDecoy(random: () => number, decoys: number = ASTEROID_DECOY_CHANCE): boolean {
  return random() < decoys;
}

/**
 * How well the round went.
 *
 * A rock that drifts past without being cleared counts against the player,
 * and so does a satellite that is cleared by mistake.
 */
export function asteroidAccuracy(cleared: number, mistakes: number, missed: number): number {
  const shots = cleared + mistakes + missed;

  return shots === 0 ? 0 : cleared / shots;
}

/** The band a finished round falls into. */
export function asteroidPerformance(
  accuracy: number,
  difficulty: AsteroidDifficulty = asteroidDifficulty(1),
): TrainingPerformance {
  if (accuracy >= difficulty.excellent) return 'excellent';
  if (accuracy >= difficulty.good) return 'good';

  return 'basic';
}
