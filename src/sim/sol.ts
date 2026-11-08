/**
 * Advancing one sol: drain, forecast, events, and end-of-run detection.
 *
 * Pure: takes a `RunState`, returns a new result. No DOM, no network, no clock.
 * One sol per button press — turn-based (D-030).
 *
 * Order of operations (each step can be asserted on in tests):
 *  1. Daytime power from solar arrays × region sun.
 *  2. Subtract module draw and night drain (colder = higher drain).
 *  3. Crew oxygen, water and food use, offset by life support, extractor and
 *     greenhouse.
 *  4. That sol's events: storm solar loss and shielding damage, supply pod,
 *     solar flare.
 *  5. Clamp every store to 0-100 and cap power by battery capacity.
 *  6. Record the ledger entry.
 *  7. Decide status: lost if any store ≤ 0, won if sol ≥ target with none
 *     depleted, else active.
 */

import type { RunState } from './run';
import type { ResourceStores } from './resources';
import {
  drainForSol,
  depletedStores,
  type StoreChange,
  type DrainResult,
} from './resources';
import { extraBatteryCount, upkeepFor } from './modules';
import { REGIONS } from './regions';
import type { SolEvent } from './events';
import { eventsForSol, isStormSol } from './events';
import {
  clampStore,
  FLARE_SHIELDING_DAMAGE,
  SOLAR_POWER_PER_SUN_SCORE,
  STORM_SHIELDING_DAMAGE,
  STORM_SOLAR_FACTOR,
  stormSeverity,
  SUPPLY_POD_FOOD,
  SUPPLY_POD_POWER,
  SUPPLY_POD_WATER,
  TARGET_SOL,
  powerCap,
} from './constants';

/** One sol's entry in the run ledger. */
export interface LedgerEntry {
  readonly sol: number;
  readonly stores: ResourceStores;
  /** Per-store, per-cause deltas, in order of application. */
  readonly changes: readonly StoreChange[];
}

/** Outcome of advancing one sol. */
export interface SolResult {
  readonly stores: ResourceStores;
  readonly events: readonly SolEvent[];
  readonly ledger: readonly LedgerEntry[];
  readonly ended: boolean;
  readonly status: 'active' | 'lost' | 'won';
}

/**
 * True when the run cannot continue: any store at or below zero.
 *
 * A run ends on depleted resources, never on death (AGENTS.md R-20).
 */
export function isRunOver(stores: ResourceStores): boolean {
  return depletedStores(stores).length > 0;
}

/**
 * Advance exactly one sol. Pure: takes state, returns new state plus a ledger
 * entry. Never mutates its argument.
 */
export function advanceSol(run: RunState): SolResult {
  const sol = run.sol + 1;
  const region = REGIONS.find((r) => r.id === run.regionId);

  if (!region) {
    throw new Error(`advanceSol: unknown region "${run.regionId}"`);
  }

  // --- Steps 1-3: resource drain -----------------------------------------
  const { powerDraw, solarArrays } = upkeepFor(run.modules);
  const drain: DrainResult = drainForSol(
    run.stores,
    sol,
    powerDraw,
    solarArrays,
    run.modules,
    region.scores,
  );
  let stores = { ...drain.stores };
  const changes: StoreChange[] = [...drain.changes];

  // --- Step 4: events ----------------------------------------------------
  const events = eventsForSol(sol);

  // A storm halves solar output for two sols: the storm sol and the one
  // after. Dust makes it worse; a clear sky makes it milder.
  const stormActive = isStormSol(sol) || isStormSol(sol - 1);
  if (stormActive) {
    const generation = solarArrays * region.scores.sun * SOLAR_POWER_PER_SUN_SCORE;
    const severity = stormSeverity(region.scores.dust);
    const stormLoss = Math.round(generation * (1 - STORM_SOLAR_FACTOR) * severity);
    stores.power = clampStore(stores.power - stormLoss);
    changes.push({
      store: 'power',
      cause: isStormSol(sol) ? 'storm' : 'storm-aftermath',
      delta: -stormLoss,
    });
  }

  for (const event of events) {
    switch (event.kind) {
      case 'storm': {
        // Storm damage to shielding, halved by a radiation shelter.
        let stormDamage = STORM_SHIELDING_DAMAGE;
        if (run.modules.includes('radiation-shelter')) {
          stormDamage = Math.ceil(stormDamage / 2);
        }
        stores.shielding = clampStore(stores.shielding - stormDamage);
        changes.push({ store: 'shielding', cause: 'storm', delta: -stormDamage });
        break;
      }

      case 'supply-pod': {
        stores.power = clampStore(stores.power + SUPPLY_POD_POWER);
        stores.water = clampStore(stores.water + SUPPLY_POD_WATER);
        stores.food = clampStore(stores.food + SUPPLY_POD_FOOD);
        changes.push({ store: 'power', cause: 'supply-pod', delta: SUPPLY_POD_POWER });
        changes.push({ store: 'water', cause: 'supply-pod', delta: SUPPLY_POD_WATER });
        changes.push({ store: 'food', cause: 'supply-pod', delta: SUPPLY_POD_FOOD });
        break;
      }

      case 'solar-flare': {
        let flareDamage = FLARE_SHIELDING_DAMAGE;
        if (run.modules.includes('radiation-shelter')) {
          flareDamage = Math.ceil(flareDamage / 2);
        }
        stores.shielding = clampStore(stores.shielding - flareDamage);
        changes.push({ store: 'shielding', cause: 'solar-flare', delta: -flareDamage });
        break;
      }

      case 'storm-warning':
      case 'win-check':
        // No store change; these are informational events recorded in the log.
        break;
    }
  }

  // --- Step 5: clamp and cap power by battery capacity -------------------
  const cap = powerCap(extraBatteryCount(run.modules));
  stores.power = Math.min(stores.power, cap);
  stores.power = clampStore(stores.power);
  stores.oxygen = clampStore(stores.oxygen);
  stores.water = clampStore(stores.water);
  stores.food = clampStore(stores.food);
  stores.shielding = clampStore(stores.shielding);

  // --- Step 6: ledger entry ----------------------------------------------
  const entry: LedgerEntry = { sol, stores: { ...stores }, changes };

  // --- Step 7: status -----------------------------------------------------
  const lost = isRunOver(stores);
  const won = !lost && sol >= TARGET_SOL;

  let status: 'active' | 'lost' | 'won';
  if (lost) status = 'lost';
  else if (won) status = 'won';
  else status = 'active';

  return {
    stores,
    events,
    ledger: [...run.ledger, entry],
    ended: lost || won,
    status,
  };
}
