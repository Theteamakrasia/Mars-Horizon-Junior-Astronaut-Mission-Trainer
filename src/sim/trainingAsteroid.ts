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

/** How long a round lasts, in seconds. */
export const ASTEROID_SECONDS = 30;

/** How many asteroids have to be cleared to win. */
export const ASTEROID_GOAL = 12;

/** How often a friendly satellite drifts past instead of a rock. */
export const ASTEROID_DECOY_CHANCE = 0.2;

/** This accuracy or better is an excellent run. */
export const ASTEROID_EXCELLENT_ACCURACY = 0.85;

/** This accuracy or better is a good run. */
export const ASTEROID_GOOD_ACCURACY = 0.65;

/**
 * How long until the next rock appears, in milliseconds.
 *
 * The round gets faster as it goes on, so the last ten seconds are the
 * busy ones.
 */
export function asteroidDelay(elapsedSeconds: number): number {
  return Math.max(550, 1100 - elapsedSeconds * 14);
}

/** How long a rock stays on the screen, in milliseconds. */
export function asteroidLife(elapsedSeconds: number): number {
  return Math.max(1100, 2000 - elapsedSeconds * 22);
}

/** Is what just drifted past a friendly satellite? */
export function asteroidIsDecoy(random: () => number): boolean {
  return random() < ASTEROID_DECOY_CHANCE;
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
export function asteroidPerformance(accuracy: number): TrainingPerformance {
  if (accuracy >= ASTEROID_EXCELLENT_ACCURACY) return 'excellent';
  if (accuracy >= ASTEROID_GOOD_ACCURACY) return 'good';

  return 'basic';
}
