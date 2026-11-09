/**
 * Communication delay between Mars and Earth.
 *
 * Radio travels at the speed of light, and the planets are far apart, so a
 * message takes minutes — not seconds — to arrive. The real one-way delay swings
 * between roughly 3 and 22 minutes depending on where the two planets are in
 * their orbits. This game uses a simple rising delay over the run: an
 * approximation, labelled as one in the UI.
 *
 * The lesson it teaches: when something goes wrong fast, Mission Control cannot
 * help in time. The crew has to be able to decide alone.
 *
 * Pure and deterministic.
 */

/** The real range, for the "this is an approximation" note. */
export const REAL_MIN_ONE_WAY_MINUTES = 3;
export const REAL_MAX_ONE_WAY_MINUTES = 22;

/** One-way delay on a given sol, in minutes. Simplified: it creeps up as the planets drift apart. */
export function oneWayMinutes(sol: number): number {
  return Math.min(REAL_MAX_ONE_WAY_MINUTES, 6 + Math.max(0, sol));
}

/** Ask a question and wait for the answer: there and back. */
export function roundTripMinutes(sol: number): number {
  return oneWayMinutes(sol) * 2;
}

/** Whether Earth's reply would arrive before the problem does. */
export function earthCanAnswerInTime(sol: number, windowMinutes: number): boolean {
  return roundTripMinutes(sol) <= windowMinutes;
}
