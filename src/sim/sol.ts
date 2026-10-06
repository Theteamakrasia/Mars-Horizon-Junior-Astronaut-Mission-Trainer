/**
 * STUB — not implemented. Every export here throws.
 *
 * Advancing one sol: apply the drain, fire the forecast, resolve the mission,
 * and decide whether the run has ended.
 *
 * UNDECIDED and it matters: whether a sol resolves on a button press (turn-based)
 * or on a clock (real-time). The team has not settled this. If real-time wins,
 * this file gains a clock abstraction and src/dom/ gains a ticker.
 *
 * Task: TASK-016. Get the team's answer before building — see
 * src/features/act/README.md.
 */

import type { ResourceStores } from './resources';

/**
 * Something the forecast predicted or the mission produced.
 *
 * `approximate` is required rather than optional on purpose: the project README
 * promises the player is told when a number is an estimate instead of a
 * measurement. Making it impossible to omit is cheaper than remembering to.
 */
export interface SolEvent {
  readonly sol: number;
  readonly kind: 'storm' | 'supply-pod' | 'mission' | 'anomaly';
  readonly summary: string;
  readonly approximate: boolean;
}

/** Outcome of advancing one sol. */
export interface SolResult {
  readonly stores: ResourceStores;
  readonly events: readonly SolEvent[];
  readonly ended: boolean;
}

/** Advance exactly one sol. Pure: takes state, returns new state. */
export function advanceSol(
  _stores: ResourceStores,
  _events: readonly SolEvent[],
): SolResult {
  throw new Error('STUB: sim/sol.ts is not implemented. Sol stepping is undecided — see D-018.');
}

/**
 * True when the run cannot continue.
 *
 * A run ends on depleted resources, never on death. No violence, no enemies —
 * see AGENTS.md R-20.
 */
export function isRunOver(_stores: ResourceStores): boolean {
  throw new Error('STUB: sim/sol.ts is not implemented.');
}