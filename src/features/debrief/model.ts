/**
 * STUB — not implemented. Every export here throws.
 *
 * Attribution: given a finished run, work out which decision caused the loss.
 *
 * This is the hardest pure function in the game and the one most worth testing.
 * Because there is no planning phase (D-018), this screen is the ONLY place a
 * player learns why they ran out — so a confident wrong answer is worse than no
 * answer at all. The project README's whole argument is that faking precision
 * teaches kids to trust data that is not real.
 *
 * If honest attribution proves too hard, show the timeline and let the player
 * draw the conclusion. A correct timeline beats a confident wrong explanation.
 *
 * Task: TASK-031. Blocked on TASK-016 (src/sim/sol.ts).
 */

import type { RunState } from '../../sim/run';
import type { SolEvent } from '../../sim/sol';

/** What the player is told, and how confident we are about it. */
export interface Explanation {
  readonly headline: string;
  readonly detail: string;
  /**
   * False when the cause is genuinely established from the event history.
   *
   * When true the UI must say the game is not sure — which is also the moment to
   * point at the timeline and let the player conclude it themselves.
   */
  readonly confident: boolean;
}

/** Attribute the run's outcome to the decision that caused it. */
export function explainOutcome(
  _run: RunState,
  _history: readonly SolEvent[],
): Explanation {
  throw new Error('STUB: features/debrief/model.ts is not implemented. See ../README.md.');
}

/**
 * What was used and what was wasted.
 *
 * Not the same question as explainOutcome: this one is arithmetic over the run,
 * that one is causal. Both belong on the screen.
 */
export function consumptionSummary(
  _run: RunState,
  _history: readonly SolEvent[],
): { readonly used: number; readonly wasted: number } {
  throw new Error('STUB: features/debrief/model.ts is not implemented.');
}