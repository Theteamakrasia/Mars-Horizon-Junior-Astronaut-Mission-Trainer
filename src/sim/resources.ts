/**
 * Per-sol resource drain: pure arithmetic over the five stores.
 *
 * No DOM, no network, no `Math.random`, no clock. Every input is a literal in
 * the tests (ISS-015). This module never mutates its arguments.
 *
 * `drainForSol` performs steps 1-3 of the sol order of operations (daytime
 * generation, module draw and night drain, crew use offset by modules). Step 4
 * (events) and the clamp/ledger/status live in `sim/sol.ts`.
 *
 * `drainForSol` deliberately takes the pre-computed `powerDraw` and
 * `solarArrays` rather than the module list, so that `resources/` never needs
 * to import from `modules/` and the two can stay in separate layers.
 */

import type { SiteScore } from './regions';
import {
  clampStore,
  CREW_FOOD_PER_SOL,
  CREW_OXYGEN_PER_SOL,
  CREW_WATER_PER_SOL,
  EXTRACTOR_WATER_PER_WATER_SCORE,
  GREENHOUSE_FOOD_PER_SOL,
  GREENHOUSE_WATER_USE_PER_SOL,
  LIFE_SUPPORT_OXYGEN_PER_SOL,
  LIFE_SUPPORT_WATER_PER_SOL,
  NIGHT_DRAIN_BASE,
  SOLAR_POWER_PER_SUN_SCORE,
} from './constants';

/** The five stores that never stop draining. */
export type ResourceName = 'power' | 'oxygen' | 'water' | 'food' | 'shielding';

/** Absolute amounts kept as 0-100 percentages. */
export interface ResourceStores {
  readonly power: number;
  readonly oxygen: number;
  readonly water: number;
  readonly food: number;
  readonly shielding: number;
}

/**
 * The stores a run starts with, before anything is built.
 *
 * Provisional numbers; region adjustment happens in `sim/constants.ts`
 * (`regionAdjustedStores`) and `sim/run.ts` (`newRun` / `landAt`).
 */
export function createInitialStores(_overrides?: Partial<ResourceStores>): ResourceStores {
  return {
    power: 40,
    oxygen: 100,
    water: 90,
    food: 80,
    shielding: 20,
    ..._overrides,
  };
}

/** A single store's delta for one cause, for the sol ledger. */
export interface StoreChange {
  readonly store: ResourceName;
  readonly cause: string;
  readonly delta: number;
}

/** The result of draining one sol: the new stores and what changed them. */
export interface DrainResult {
  readonly stores: ResourceStores;
  readonly changes: readonly StoreChange[];
}

/** Which stores are at or below zero, i.e. how a run can end. */
export function depletedStores(stores: ResourceStores): readonly ResourceName[] {
  const out: ResourceName[] = [];
  for (const name of ['power', 'oxygen', 'water', 'food', 'shielding'] as const) {
    if (stores[name] <= 0) out.push(name);
  }
  return out;
}

/**
 * Apply one sol's resource drain, steps 1-3 of the sol order of operations.
 *
 * Returns the stores after the drain plus a per-store, per-cause ledger of
 * changes. Never mutates its argument.
 *
 * @param stores - the stores at the start of the sol
 * @param sol - the sol number (1-based), reserved for event-aware tuning
 * @param powerDraw - total module power draw per sol (from `sim/modules.ts`)
 * @param solarArrays - number of solar arrays placed (from `sim/modules.ts`)
 * @param modules - the placed module kind names, for `includes` checks
 * @param region - the chosen landing region's scores
 */
export function drainForSol(
  stores: ResourceStores,
  _sol: number,
  powerDraw: number,
  solarArrays: number,
  modules: readonly string[],
  region: SiteScore,
): DrainResult {
  const changes: StoreChange[] = [];
  // Mutable working copy; `ResourceStores` is readonly but we build it up here.
  let next = { ...stores };

  // --- 1. Daytime power generation ---------------------------------------
  const generation = solarArrays * region.sun * SOLAR_POWER_PER_SUN_SCORE;
  // Storm reduction is applied as an event in sim/sol.ts, not here.

  // --- 2. Module draw and night drain ------------------------------------
  // Colder nights drain more power: temp 5 (mild) -> 5, temp 2 (cold) -> 8.
  const nightDrain = Math.max(1, NIGHT_DRAIN_BASE - region.temp);

  const powerDelta = generation - powerDraw - nightDrain;
  next.power = clampStore(next.power + powerDelta);

  changes.push({ store: 'power', cause: 'solar-generation', delta: generation });
  changes.push({ store: 'power', cause: 'module-draw', delta: -powerDraw });
  changes.push({ store: 'power', cause: 'night-drain', delta: -nightDrain });

  // --- 3. Crew use, offset by modules ------------------------------------
  let oxygenDelta = -CREW_OXYGEN_PER_SOL;
  let waterDelta = -CREW_WATER_PER_SOL;
  let foodDelta = -CREW_FOOD_PER_SOL;

  if (modules.includes('life-support')) {
    oxygenDelta += LIFE_SUPPORT_OXYGEN_PER_SOL;
    waterDelta += LIFE_SUPPORT_WATER_PER_SOL;
    changes.push({ store: 'oxygen', cause: 'life-support', delta: LIFE_SUPPORT_OXYGEN_PER_SOL });
    changes.push({ store: 'water', cause: 'life-support', delta: LIFE_SUPPORT_WATER_PER_SOL });
  }
  if (modules.includes('greenhouse')) {
    foodDelta += GREENHOUSE_FOOD_PER_SOL;
    waterDelta -= GREENHOUSE_WATER_USE_PER_SOL;
    changes.push({ store: 'food', cause: 'greenhouse', delta: GREENHOUSE_FOOD_PER_SOL });
    changes.push({
      store: 'water',
      cause: 'greenhouse',
      delta: -GREENHOUSE_WATER_USE_PER_SOL,
    });
  }
  if (modules.includes('water-extractor')) {
    const extractorOutput = region.water * EXTRACTOR_WATER_PER_WATER_SCORE;
    waterDelta += extractorOutput;
    changes.push({ store: 'water', cause: 'water-extractor', delta: extractorOutput });
  }

  next.oxygen = clampStore(next.oxygen + oxygenDelta);
  next.water = clampStore(next.water + waterDelta);
  next.food = clampStore(next.food + foodDelta);

  changes.push({ store: 'oxygen', cause: 'crew', delta: oxygenDelta });
  changes.push({ store: 'water', cause: 'crew', delta: waterDelta });
  changes.push({ store: 'food', cause: 'crew', delta: foodDelta });

  return { stores: next, changes };
}
