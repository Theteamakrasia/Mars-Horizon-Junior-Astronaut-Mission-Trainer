/**
 * STUB — not implemented. Every export here throws.
 *
 * Intentionally nearly empty. All of act's simulation belongs in src/sim/sol.ts,
 * where it is pure and gets tested like drift.ts already is.
 *
 * If you find yourself writing drain arithmetic, event resolution or loss
 * detection here, it belongs in src/sim/ instead. That is the whole reason this
 * screen can be tested at all.
 *
 * This screen runs a sol and shows what happened. It is NOT a decision screen —
 * there is deliberately no planning phase (decision D-018, confirmed by the
 * project owner). If you are asked to add a "choose your action" panel, that is
 * the plan phase and it needs a recorded decision first.
 *
 * Task: TASK-030. Blocked on TASK-015 and TASK-016.
 */

import type { RunState } from '../../sim/run';

/**
 * A presentation choice for this screen, not a simulation rule.
 *
 * Kept separate from the pure work so that advancing a sol stays one call into
 * src/sim/sol.ts rather than logic smeared across two layers.
 */
export interface ActPresentation {
  readonly title: string;
  readonly subtitle: string;
}

/** Headline copy for the active mission. */
export function missionHeadline(_run: RunState): ActPresentation {
  throw new Error('STUB: features/act/model.ts is not implemented. See ../README.md.');
}