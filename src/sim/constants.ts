/**
 * All tuning numbers for the simulation, in one file.
 *
 * Every number here is provisional and is owned by the balance tests in
 * `sim/balance.test.ts`. Change a number here, then re-run the balance tests
 * to confirm the slice is still fair.
 *
 * Stores are kept as 0-100 percentages so the base panel and the debrief
 * timeline render without conversion.
 */

import type { ResourceStores } from './resources';
import type { SiteScore } from './regions';

/** How many astronauts are in the crew. Scales oxygen, water and food use. */
export const CREW = 3;

/** The sol at which a run wins, provided no store is depleted. */
export const TARGET_SOL = 20;

/** The stores a run starts with, before region adjustment. */
export const BASE_STORES: ResourceStores = {
  power: 50,
  oxygen: 100,
  water: 90,
  food: 80,
  shielding: 20,
};

/** Per-sol crew consumption, total for all crew. */
export const CREW_OXYGEN_PER_SOL = 6;
export const CREW_WATER_PER_SOL = 6;
export const CREW_FOOD_PER_SOL = 6;

/** Life support recycling offsets crew consumption. */
export const LIFE_SUPPORT_OXYGEN_PER_SOL = 4;
export const LIFE_SUPPORT_WATER_PER_SOL = 3;

/** Greenhouse production and cost. */
export const GREENHOUSE_FOOD_PER_SOL = 6;
export const GREENHOUSE_WATER_USE_PER_SOL = 3;

/** Water extractor output scales with the region's water score. */
export const EXTRACTOR_WATER_PER_WATER_SCORE = 4;

/** Solar array generation per sun score point, per array. */
export const SOLAR_POWER_PER_SUN_SCORE = 6;

/** Night power drain, reduced by mild temperatures: nightDrain = 10 - temp. */
export const NIGHT_DRAIN_BASE = 10;

/** Storm: solar output is halved for two sols. */
export const STORM_SOLAR_FACTOR = 0.5;
export const STORM_SOLS = 2;

/**
 * Storm severity scales with dust: dust 3 is the baseline, dust 5 is a mild
 * storm (one third), dust 2 is a severe one (four thirds).
 */
export function stormSeverity(dust: number): number {
  return (6 - dust) / 3;
}

/** Storm damage to shielding, reduced by the radiation shelter's coverage. */
export const STORM_SHIELDING_DAMAGE = 8;

/** Solar flare damage to shielding. */
export const FLARE_SHIELDING_DAMAGE = 6;

/** Supply pod bundle. */
export const SUPPLY_POD_WATER = 15;
export const SUPPLY_POD_FOOD = 15;
export const SUPPLY_POD_POWER = 15;

/** Base power capacity. Extra batteries raise it. */
export const BASE_POWER_CAP = 100;
export const EXTRA_BATTERY_CAP = 20;

/** Extra batteries arrive charged: building one adds this much power. */
export const EXTRA_BATTERY_CHARGE = 10;

/** Maximum number of any one buildable module. */
export const MODULE_BUILD_CAP = 3;

/**
 * Region-adjusted starting stores.
 *
 * Water score shifts starting water; the other axes affect per-sol rates rather
 * than the starting stores (sun → solar generation, dust → storms, temp → night
 * drain, terrain → build cost). Keeping only water here means a dry region
 * starts thirsty no matter what the player builds.
 */
export function regionAdjustedStores(region: SiteScore): ResourceStores {
  return {
    ...BASE_STORES,
    // Each point of water score is worth 5 starting water.
    water: clampStore(BASE_STORES.water + (region.water - 3) * 5),
  };
}

/** Clamp a store to the 0-100 range. */
export function clampStore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Power capacity for a run, given how many extra batteries are built. */
export function powerCap(extraBatteries: number): number {
  return BASE_POWER_CAP + extraBatteries * EXTRA_BATTERY_CAP;
}
