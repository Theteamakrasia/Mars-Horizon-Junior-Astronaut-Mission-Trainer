/**
 * STUB — not implemented. Every export here throws.
 *
 * RunState is the only thing shared between screens. main.ts owns it and passes
 * it down; features must never import each other to get it (npm run check fails
 * that as `cross-feature`).
 *
 * There is no persistence in this project, so a RunState lives only as long as
 * the page does. Supabase is deferred — see decision D-003.
 */

import type { ResourceStores } from './resources';

/** A run is active, or ended one way or the other. No third state. */
export type RunStatus = 'active' | 'lost' | 'won';

/**
 * Everything a screen needs, and nothing it does not.
 *
 * `region` is the id chosen in landing-site, not the whole region object: a
 * screen that needs the axis scores should be handed them, not left to re-derive.
 */
export interface RunState {
  readonly sol: number;
  readonly regionId: string;
  readonly stores: ResourceStores;
  readonly status: RunStatus;
}

/** Begin a run in the chosen region. Called once, from main.ts. */
export function newRun(_regionId: string): RunState {
  throw new Error('STUB: sim/run.ts is not implemented.');
}

/**
 * Replace one field, returning new state.
 *
 * Deliberately shallow rather than a merge helper: a store or a sol changes at a
 * time, and a merge hides which field a caller thought it was changing.
 */
export function withState(_state: RunState, _change: Partial<RunState>): RunState {
  throw new Error('STUB: sim/run.ts is not implemented.');
}