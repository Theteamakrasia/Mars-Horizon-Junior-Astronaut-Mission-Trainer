/**
 * The module catalogue and build rules.
 *
 * Pure: no DOM, no network, no randomness. Imports only `sim/`.
 *
 * The catalogue is the single source of truth for what each module costs and
 * what it demands of every other system. `act` reads module effects from here
 * and cannot import `features/base/` (R-5), so this table lives in `sim/`.
 */

import type { ResourceStores } from './resources';
import { MODULE_BUILD_CAP } from './constants';

/** Every kind of module the player can place. */
export type ModuleKind =
  | 'habitat'
  | 'life-support'
  | 'solar-array'
  | 'batteries'
  | 'greenhouse'
  | 'water-extractor'
  | 'radiation-shelter'
  | 'extra-solar-array'
  | 'extra-batteries';

/** What a module needs to build, what it provides, and how many may be placed. */
export interface ModuleSpec {
  readonly kind: ModuleKind;
  /** Human-readable name for the build panel. */
  readonly name: string;
  /** What the module provides, for the preview panel. */
  readonly provides: readonly string[];
  /** What the module consumes, for the preview panel. */
  readonly requires: readonly string[];
  /** Build cost in power, before the region terrain multiplier. */
  readonly buildCost: number;
  /** Whether this kind starts built on every run. */
  readonly startsBuilt: boolean;
  /** Maximum copies that may be placed. */
  readonly cap: number;
}

/** The full catalogue. Order is the build-panel order. */
export const MODULE_CATALOGUE: readonly ModuleSpec[] = [
  {
    kind: 'habitat',
    name: 'Habitat',
    provides: ['Shelter', 'Crew capacity (3)'],
    requires: ['Power'],
    buildCost: 0,
    startsBuilt: true,
    cap: 1,
  },
  {
    kind: 'life-support',
    name: 'Life Support',
    provides: ['Oxygen', 'Water recycling'],
    requires: ['Power', 'Water'],
    buildCost: 0,
    startsBuilt: true,
    cap: 1,
  },
  {
    kind: 'solar-array',
    name: 'Solar Array',
    provides: ['Daytime power'],
    requires: ['Terrain'],
    buildCost: 0,
    startsBuilt: true,
    cap: 1,
  },
  {
    kind: 'batteries',
    name: 'Batteries',
    provides: ['Night power storage'],
    requires: [],
    buildCost: 0,
    startsBuilt: true,
    cap: 1,
  },
  {
    kind: 'greenhouse',
    name: 'Greenhouse',
    provides: ['Food'],
    requires: ['Water', 'Power'],
    buildCost: 20,
    startsBuilt: false,
    cap: MODULE_BUILD_CAP,
  },
  {
    kind: 'water-extractor',
    name: 'Water Extractor',
    provides: ['Water'],
    requires: ['Power'],
    buildCost: 20,
    startsBuilt: false,
    cap: MODULE_BUILD_CAP,
  },
  {
    kind: 'radiation-shelter',
    name: 'Radiation Shelter',
    provides: ['Shielding'],
    requires: [],
    buildCost: 15,
    startsBuilt: false,
    cap: MODULE_BUILD_CAP,
  },
  {
    kind: 'extra-solar-array',
    name: 'Extra Solar Array',
    provides: ['More daytime power'],
    requires: ['Terrain'],
    buildCost: 15,
    startsBuilt: false,
    cap: MODULE_BUILD_CAP,
  },
  {
    kind: 'extra-batteries',
    name: 'Extra Batteries',
    provides: ['Higher power cap', 'Charged storage'],
    requires: [],
    buildCost: 10,
    startsBuilt: false,
    cap: MODULE_BUILD_CAP,
  },
] as const;

/** The four modules every run starts with. */
export const STARTING_MODULES: readonly ModuleKind[] = [
  'habitat',
  'life-support',
  'solar-array',
  'batteries',
];

/**
 * Power draw per sol for each module. Modules that generate power (solar
 * arrays) have zero draw here; generation is computed separately in `sol.ts`.
 */
export const MODULE_POWER_DRAW: Readonly<Record<ModuleKind, number>> = {
  habitat: 2,
  'life-support': 3,
  'solar-array': 0,
  batteries: 0,
  greenhouse: 3,
  'water-extractor': 3,
  'radiation-shelter': 0,
  'extra-solar-array': 0,
  'extra-batteries': 0,
};

/** Number of solar arrays (base + extra) in a module list. */
export function solarArrayCount(modules: readonly ModuleKind[]): number {
  let count = 0;
  for (const kind of modules) {
    if (kind === 'solar-array' || kind === 'extra-solar-array') count += 1;
  }
  return count;
}

/** Number of extra battery sets beyond the first. */
export function extraBatteryCount(modules: readonly ModuleKind[]): number {
  let count = 0;
  for (const kind of modules) {
    if (kind === 'extra-batteries') count += 1;
  }
  return count;
}

/**
 * Total power draw and generation inputs across every placed module.
 *
 * Returns the power drawn per sol and the number of solar arrays, which the
 * sol step combines with region sun to compute daytime generation.
 */
export function upkeepFor(modules: readonly ModuleKind[]): {
  readonly powerDraw: number;
  readonly solarArrays: number;
} {
  let powerDraw = 0;
  let solarArrays = 0;

  for (const kind of modules) {
    powerDraw += MODULE_POWER_DRAW[kind];
    if (kind === 'solar-array' || kind === 'extra-solar-array') {
      solarArrays += 1;
    }
  }

  return { powerDraw, solarArrays };
}

/**
 * The base build cost of a module, in power, before the terrain multiplier.
 *
 * The first solar array and first battery set are free (they start built);
 * every copy after that, and every other buildable module, costs power paid
 * immediately from the stores.
 */
export function buildCost(kind: ModuleKind): number {
  const spec = MODULE_CATALOGUE.find((s) => s.kind === kind);
  if (!spec) return 0;
  return spec.buildCost;
}

/**
 * Build cost after the region's terrain multiplier.
 *
 * Good terrain (5) is 20% cheaper, poor terrain (2) is 10% dearer. Rounded up
 * so a cost is never less than the base cost in the worst case.
 */
export function adjustedBuildCost(kind: ModuleKind, terrain: number): number {
  const base = buildCost(kind);
  const multiplier = 1 + (3 - terrain) * 0.1;
  return Math.ceil(base * multiplier);
}

/** How many copies of a kind are already placed. */
function ownedCount(kind: ModuleKind, modules: readonly ModuleKind[]): number {
  let owned = 0;
  for (const m of modules) {
    if (m === kind) owned += 1;
  }
  return owned;
}

/**
 * Can this module be placed right now?
 *
 * Checks the build cap, whether it is already at cap, and whether the run can
 * afford the immediate power cost after the region terrain multiplier.
 */
export function canBuild(
  kind: ModuleKind,
  modules: readonly ModuleKind[],
  stores: ResourceStores,
  terrain = 3,
): boolean {
  const spec = MODULE_CATALOGUE.find((s) => s.kind === kind);
  if (!spec) return false;

  if (ownedCount(kind, modules) >= spec.cap) return false;
  if (stores.power < adjustedBuildCost(kind, terrain)) return false;

  return true;
}

/**
 * A preview of what building a module costs and what it changes, for the UI.
 *
 * Returns null when the module is unknown. `affordable` and `underCap` are
 * reported separately so the panel can say exactly why a button is disabled.
 */
export function buildPreview(
  kind: ModuleKind,
  modules: readonly ModuleKind[],
  stores: ResourceStores,
  terrain = 3,
): {
  readonly kind: ModuleKind;
  readonly name: string;
  readonly buildCost: number;
  readonly provides: readonly string[];
  readonly requires: readonly string[];
  readonly affordable: boolean;
  readonly underCap: boolean;
} | null {
  const spec = MODULE_CATALOGUE.find((s) => s.kind === kind);
  if (!spec) return null;

  const underCap = ownedCount(kind, modules) < spec.cap;
  const buildCostValue = adjustedBuildCost(kind, terrain);
  const affordable = stores.power >= buildCostValue;

  return {
    kind: spec.kind,
    name: spec.name,
    buildCost: buildCostValue,
    provides: spec.provides,
    requires: spec.requires,
    affordable,
    underCap,
  };
}
