/**
 * RunState is the only thing shared between screens. main.ts owns it and
 * passes it down; features must never import each other to get it (R-5).
 *
 * There is no persistence in this project, so a RunState lives only as long as
 * the page does. Supabase is deferred — see decision D-003.
 */

import type { ResourceStores } from './resources';
import type { ModuleKind } from './modules';
import { adjustedBuildCost, canBuild, STARTING_MODULES } from './modules';
import type { LedgerEntry } from './sol';
import { clampStore, EXTRA_BATTERY_CHARGE, regionAdjustedStores } from './constants';
import { REGIONS } from './regions';

/** A run is active, or ended one way or the other. No third state. */
export type RunStatus = 'active' | 'lost' | 'won';

/**
 * Everything a screen needs, and nothing it does not.
 *
 * `regionId` is set by the `landing-site` screen via `landAt`. `astronautName`
 * is set by the `naming` menu — in memory only, so a refresh loses it (D-003,
 * no persistence).
 *
 * `modules` are the placed outpost modules; `ledger` is the per-sol history
 * the debrief reasons over.
 */
export interface RunState {
  readonly sol: number;
  readonly regionId: string;
  readonly astronautName: string;
  readonly stores: ResourceStores;
  readonly status: RunStatus;
  readonly modules: readonly ModuleKind[];
  readonly ledger: readonly LedgerEntry[];
}

/** Scores for an unknown region — neutral defaults. */
const UNKNOWN_REGION_SCORES = {
  water: 3,
  sun: 3,
  terrain: 3,
  dust: 3,
  temp: 3,
};

function regionScores(regionId: string) {
  const region = REGIONS.find((r) => r.id === regionId);
  return region ? region.scores : UNKNOWN_REGION_SCORES;
}

/**
 * Begin a run in the chosen region. Called once, from main.ts or from
 * `landAt` when the player picks a site.
 *
 * Sol starts at 0, meaning "arrived, nothing done yet", so the first advance
 * is sol 1. Starting stores are adjusted by the region's water score.
 */
export function newRun(regionId: string, astronautName = ''): RunState {
  return {
    sol: 0,
    regionId,
    astronautName,
    stores: regionAdjustedStores(regionScores(regionId)),
    status: 'active',
    modules: [...STARTING_MODULES],
    ledger: [],
  };
}

/**
 * Commit a landing: set the region and apply region-adjusted starting stores,
 * then reset the run to sol 0 with the starting modules.
 *
 * Replaces `withState(run, { regionId })`, which set the region but never
 * adjusted the stores (ISS-040).
 */
export function landAt(run: RunState, regionId: string): RunState {
  return {
    ...run,
    regionId,
    sol: 0,
    stores: regionAdjustedStores(regionScores(regionId)),
    status: 'active',
    modules: [...STARTING_MODULES],
    ledger: [],
  };
}

/**
 * Replace some fields, returning new state.
 *
 * Shallow rather than a merge helper: stores and sol change one at a time, and
 * a general merge hides which field a caller thought it was changing.
 */
export function withState(state: RunState, change: Partial<RunState>): RunState {
  return { ...state, ...change };
}

/** Terrain score for the run's region, or the neutral 3 for an unknown id. */
function terrainFor(regionId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.scores.terrain ?? 3;
}

/**
 * Build one module, paying its terrain-adjusted cost from power.
 *
 * Returns null when the build is not allowed (at cap, or unaffordable), so the
 * caller cannot silently spend power it does not have. Extra batteries arrive
 * charged, which is what makes them useful in the early game.
 *
 * Pure: returns new state, never mutates the argument.
 */
export function applyBuild(run: RunState, kind: ModuleKind): RunState | null {
  const terrain = terrainFor(run.regionId);
  if (!canBuild(kind, run.modules, run.stores, terrain)) return null;

  const cost = adjustedBuildCost(kind, terrain);
  const charge = kind === 'extra-batteries' ? EXTRA_BATTERY_CHARGE : 0;

  return {
    ...run,
    modules: [...run.modules, kind],
    stores: {
      ...run.stores,
      power: clampStore(run.stores.power - cost + charge),
    },
  };
}
