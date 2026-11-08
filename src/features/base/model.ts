/**
 * `base/` model: outpost build logic and presentation helpers.
 *
 * Pure: reads `sim/modules.ts` and `sim/run.ts` only. Never imports `act/` or
 * `debrief/` — R-5 keeps features independent, and state travels through
 * `RunState`.
 *
 * This is a thin wrapper around `sim/modules.ts`: the catalogue, costs and
 * caps live there (D-032). Everything here is for presenting the catalogue to
 * the player in the build panel.
 */

import type { ResourceStores } from '../../sim/resources';
import { REGIONS } from '../../sim/regions';
import {
  adjustedBuildCost,
  buildPreview,
  canBuild,
  MODULE_CATALOGUE,
  STARTING_MODULES,
  type ModuleKind,
  upkeepFor,
} from '../../sim/modules';
import type { RunState } from '../../sim/run';

/**
 * The starting modules as `ModuleKind` — kept here so the build panel can list
 * what is already on the outpost without importing the catalogue directly.
 */
export const STARTING_PLACED: readonly ModuleKind[] = STARTING_MODULES;

/** All buildable (non-starting) modules, in catalogue order. */
export const BUILDABLE: readonly ModuleKind[] = MODULE_CATALOGUE.filter(
  (spec) => !spec.startsBuilt,
).map((spec) => spec.kind);

/**
 * Whether the player can place one more copy of `kind` right now.
 *
 * Delegates to `sim/modules.ts` `canBuild`, defaulting to neutral terrain (3)
 * when the region is unknown. The view passes the region's terrain from
 * `RunState.regionId`.
 */
export function canPlace(kind: ModuleKind, run: RunState): boolean {
  const region = run.regionId === '' ? 3 : regionTerrain(run.regionId);
  return canBuild(kind, run.modules, run.stores, region);
}

/** Build cost after terrain adjustment, for the cost display. */
export function costOf(kind: ModuleKind, run: RunState): number {
  return adjustedBuildCost(kind, regionTerrain(run.regionId));
}

/** Total power draw and number of solar arrays across placed modules. */
export function upkeep(run: RunState): {
  readonly powerDraw: number;
  readonly solarArrays: number;
} {
  return upkeepFor(run.modules);
}

/** Modules the player cannot place because they are at cap or unaffordable. */
export function blockedKinds(run: RunState): readonly ModuleKind[] {
  return BUILDABLE.filter((kind) => !canPlace(kind, run));
}

/** Preview of a build: cost, what it gives, and why it might be disabled. */
export function previewOf(kind: ModuleKind, run: RunState) {
  return buildPreview(kind, run.modules, run.stores, regionTerrain(run.regionId));
}

/**
 * Format a store value for the resource panel: whole percent, no decimals.
 */
export function formatStore(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format a build cost as a whole power figure, e.g. "15 power".
 */
export function formatCost(value: number): string {
  return `${value} power`;
}

/** Terrain score for the run's region, or neutral 3 when unknown. */
function regionTerrain(regionId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.scores.terrain ?? 3;
}

export type { ResourceStores };
export type { ModuleKind };
