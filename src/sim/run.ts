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

import { createInitialStores, type ResourceStores } from './resources';

/** A run is active, or ended one way or the other. No third state. */
export type RunStatus = 'active' | 'lost' | 'won';

/**
 * Everything a screen needs, and nothing it does not.
 *
 * `regionId` is set by the `landing-site` screen. `astronautName` is set by the
 * `naming` menu — in memory only, so a refresh loses it (D-003, no persistence).
 */
export interface RunState {
  readonly sol: number;
  readonly regionId: string;
  readonly astronautName: string;
  readonly stores: ResourceStores;
  readonly status: RunStatus;
}

/**
 * Begin a run in the chosen region. Called once, from main.ts.
 *
 * Sol starts at 0, meaning "arrived, nothing done yet", so the first advance is
 * sol 1.
 */
export function newRun(_regionId: string, _astronautName = ''): RunState {
  return {
    sol: 0,
    regionId: _regionId,
    astronautName: _astronautName,
    stores: createInitialStores(),
    status: 'active',
  };
}

/**
 * Replace some fields, returning new state.
 *
 * Shallow rather than a merge helper: stores and sol change one at a time, and a
 * general merge hides which field a caller thought it was changing.
 */
export function withState(state: RunState, change: Partial<RunState>): RunState {
  return { ...state, ...change };
}