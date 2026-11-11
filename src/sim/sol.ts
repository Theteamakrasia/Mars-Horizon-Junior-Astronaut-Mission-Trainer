/**
 * Advancing one sol: power day and night, the crew's needs, the forecast events,
 * the player's crisis choices, and whether the run has ended.
 *
 * Turn-based (decision D-029): a sol resolves when the player presses the button,
 * never on a clock. The only timer in the game is a crisis countdown, and that
 * lives in the view.
 *
 * Pure. Takes state, returns new state. No DOM, no network, no Math.random.
 */

import { activityById, type ActivitySpec } from './activities';
import { stormOn, eventsStartingOn, stormOpacity } from './forecast';
import {
  CREW_SIZE,
  FOOD_PER_CREW,
  NIGHT_HOURS,
  OXYGEN_PER_CREW,
  SUN_HOURS,
  WATER_PER_CREW,
  systemsFor,
} from './modules';
import {
  clampStores,
  depletedStores,
  drainForSol,
  LIFE_STORES,
  type ResourceName,
  type ResourceStores,
} from './resources';
import type { DecisionRecord, RunState, SolActivity, SolEvent, SolRecord } from './run';
import { siteScore } from './regions';
import { crisisForEvent, optionOf } from './crises';
import { SOL_LOG_POINTS } from './science';

export type { SolEvent } from './run';

/** The run is won by living through this many sols. */
export const WIN_SOL = 12;

/** Radiation damage to the shielding by flare size, before any choice reduces it. */
export const FLARE_DRAIN: Readonly<Record<number, number>> = { 1: 6, 2: 12, 3: 20 };
export const SHELTER_FACTOR = 0.4;
export const SHIELD_UP_FACTOR = 0.6;
export const SHIELD_UP_POWER_KWH = 60;
export const EXPOSED_PANEL_DAMAGE = 0.25;
export const MIN_PANEL_HEALTH = 0.25;
export const SUPPLY_AMOUNT = 30;
export const SPARES_SHIELDING = 20;
export const SPARES_PANEL_REPAIR = 0.2;

/** Outcome of advancing one sol. */
export interface SolResult {
  readonly stores: ResourceStores;
  readonly events: readonly SolEvent[];
  readonly ended: boolean;
}

/**
 * Record the player's choice for a crisis.
 *
 * Throws on an unknown crisis or option: the view offers only real ones, so a bad
 * id is a bug, and failing loudly is cheaper than silently applying the default.
 */
export function decide(
  run: RunState,
  crisisId: string,
  optionId: string,
  timedOut = false,
): RunState {
  const event = run.forecast.find((entry) => entry.id === crisisId);

  if (event === undefined) throw new RangeError(`No such crisis: ${crisisId}`);

  const crisis = crisisForEvent(event);

  if (optionOf(crisis, optionId) === null) {
    throw new RangeError(`Crisis ${crisisId} has no option ${optionId}`);
  }

  const record: DecisionRecord = { sol: event.sol, crisisId, optionId, timedOut };

  return {
    ...run,
    decisions: [...run.decisions.filter((entry) => entry.crisisId !== crisisId), record],
  };
}

/** The option chosen for a crisis, or its default when none was recorded. */
function chosen(run: RunState, crisisId: string): string {
  const recorded = run.decisions.find((entry) => entry.crisisId === crisisId);

  if (recorded !== undefined) return recorded.optionId;

  const event = run.forecast.find((entry) => entry.id === crisisId);

  return event === undefined ? '' : crisisForEvent(event).defaultOptionId;
}

/**
 * The main activity the player picked for this sol, or null when there is none.
 *
 * Throws on an unknown id, the same way `decide` does: the view only offers
 * real activities, so a bad id is a bug, and failing loudly is cheaper than
 * silently running a sol the player never chose.
 */
function chosenActivity(run: RunState): ActivitySpec | null {
  const id = run.chosenActivity;

  if (id === null) return null;

  const spec = activityById(id);

  if (spec === null) throw new RangeError(`No such activity: ${id}`);

  return spec;
}

/** True when the run cannot continue. Ends on depleted resources, never on death (R-20). */
export function isRunOver(stores: ResourceStores): boolean {
  return lostStores(stores).length > 0;
}

/**
 * The stores whose emptiness ends a run: air, water, food, shielding.
 *
 * Power is left out on purpose. A flat battery is not the end by itself; it
 * switches life support off, and *that* is what runs the other four down. Showing
 * the chain is the lesson, so the loss is attributed to the thing that ran out.
 */
export function lostStores(stores: ResourceStores): readonly ResourceName[] {
  return depletedStores(stores).filter((name) => LIFE_STORES.includes(name));
}

const ZERO: ResourceStores = { power: 0, oxygen: 0, water: 0, food: 0, shielding: 0 };

/**
 * Advance exactly one sol.
 *
 * Order matters and is the whole model: cargo arrives, then the Sun comes up and
 * the batteries fill, then night drains them, and whatever power could not be
 * found slows life support. Everything else follows from how much of the sol the
 * lights stayed on.
 */
export function advanceSol(run: RunState): RunState {
  if (run.status !== 'active') return run;

  const sol = run.sol + 1;
  const systems = systemsFor(run.modules, run.regionId);
  const score = siteScore(run.regionId);
  const events: SolEvent[] = [];
  const notes: string[] = [];

  let panelHealth = run.panelHealth;
  let shieldingChange = -systems.shieldingErosion;
  let foodChange = 0;
  let waterChange = 0;
  let oxygenChange = 0;
  let extraPowerCost = 0;
  let greenhousePaused = false;
  let stormFactor = 1;

  /* The forecast events starting on this sol. A crisis is that sol's main
     activity: the event replaces the activity panel (D-040), so an activity
     chosen for a crisis sol is put aside rather than run alongside it. */
  const starting = eventsStartingOn(run.forecast, sol);

  for (const event of starting) {
    const choice = chosen(run, event.id);

    events.push({ sol, kind: event.kind, summary: event.summary, approximate: event.approximate });

    if (event.kind === 'supply-pod') {
      if (choice === 'food') foodChange += SUPPLY_AMOUNT;
      if (choice === 'water') waterChange += SUPPLY_AMOUNT;
      if (choice === 'spares') {
        shieldingChange += SPARES_SHIELDING;
        panelHealth = Math.min(1, panelHealth + SPARES_PANEL_REPAIR);
      }
      notes.push(`The supply pod brought ${choice === 'spares' ? 'spare parts' : choice}.`);
    }

    if (event.kind === 'flare') {
      const base = FLARE_DRAIN[event.intensity] ?? FLARE_DRAIN[1];
      const factor =
        choice === 'shelter' ? SHELTER_FACTOR : choice === 'shield-up' ? SHIELD_UP_FACTOR : 1;

      shieldingChange -= base * factor;
      if (choice === 'shelter') greenhousePaused = true;
      if (choice === 'shield-up') extraPowerCost += SHIELD_UP_POWER_KWH;
      notes.push(
        `The flare hit the shielding for ${Math.round(base * factor)} points` +
          (choice === 'carry-on' ? ' because nobody took cover.' : '.'),
      );
    }

    if (event.kind === 'storm' && choice === 'expose') {
      panelHealth = Math.max(MIN_PANEL_HEALTH, panelHealth - EXPOSED_PANEL_DAMAGE);
      notes.push('Dust settled on the panels and they will never be as clean again.');
    }
  }

  const storm = stormOn(run.forecast, sol);

  if (storm !== null) {
    const choice = chosen(run, storm.id);

    if (choice === 'expose') stormFactor = 1 - stormOpacity(score.dust);
    else stormFactor = 0;
    if (choice === 'retract-save') greenhousePaused = true;
  }

  // ---- The main activity for this sol (D-048).
  //
  // Its power draw joins the same `extraPowerCost` the flare's shielding
  // digger uses, so an activity competes with life support for the same kWh:
  // spend 25 kWh on a rover survey with a flat battery and the sol runs in a
  // blackout. That is the trade-off the whole game is built around, and it
  // comes free from the model that was already here.
  //
  // A sol with a forecast event has no activity: the crisis is the day's work
  // (D-040), and running an experiment while sheltering from a flare would
  // be a story nobody could follow.
  const activity = starting.length > 0 ? null : chosenActivity(run);
  let scienceEarned = SOL_LOG_POINTS;

  if (activity !== null) {
    extraPowerCost += activity.powerCostKwh;
    foodChange += activity.storeDelta.food ?? 0;
    waterChange += activity.storeDelta.water ?? 0;
    oxygenChange += activity.storeDelta.oxygen ?? 0;
    shieldingChange += activity.storeDelta.shielding ?? 0;

    if (activity.panelRepair !== undefined) {
      panelHealth = Math.min(1, panelHealth + activity.panelRepair);
    }

    scienceEarned += activity.science;
    notes.push(`Today's activity: ${activity.title}.`);
  }

  // ---- Power: the Sun comes up, then the night.
  const loadKw = systems.loadKw - (greenhousePaused ? systems.greenhouseLoadKw : 0);
  const solarKw = systems.solarKw * systems.sunFactor * panelHealth * stormFactor;
  const generatedDay = solarKw * SUN_HOURS;
  const generatedNuclear = systems.nuclearKw * (SUN_HOURS + NIGHT_HOURS);
  const dayDraw = loadKw * SUN_HOURS;
  const nightDraw = loadKw * NIGHT_HOURS;
  const capacity = systems.batteryKwh;

  let unmet = 0;

  let level = run.stores.power + generatedDay + (generatedNuclear / 2) - dayDraw;
  const wasted = Math.max(0, level - capacity);

  level = Math.min(capacity, level);

  if (level < 0) {
    unmet += -level;
    level = 0;
  }

  level -= extraPowerCost;
  if (level < 0) {
    unmet += -level;
    level = 0;
  }

  level += generatedNuclear / 2 - nightDraw;
  if (level < 0) {
    unmet += -level;
    level = 0;
  }

  const demand = loadKw * (SUN_HOURS + NIGHT_HOURS) + extraPowerCost;
  const blackout = demand > 0 ? Math.min(1, unmet / demand) : 0;
  const powered = 1 - blackout;

  if (blackout > 0) {
    notes.push(
      `The batteries ran flat for part of the sol (${Math.round(blackout * 100)}% of the power needed was missing), so life support and the greenhouse slowed down.`,
    );
  }
  if (wasted > 0) {
    notes.push(`${Math.round(wasted)} kWh of sunshine was wasted because the batteries were already full.`);
  }

  // ---- The crew and the plants.
  const crewOxygen = OXYGEN_PER_CREW * CREW_SIZE;
  const crewWater = WATER_PER_CREW * CREW_SIZE;
  const crewFood = FOOD_PER_CREW * CREW_SIZE;

  const net: ResourceStores = {
    power: level - run.stores.power,
    oxygen: systems.oxygenGenerated * powered - crewOxygen + oxygenChange,
    water:
      -crewWater * (1 - systems.waterRecycling * powered) -
      systems.electrolysisWater * powered -
      (greenhousePaused ? 0 : systems.greenhouseWater * powered) +
      systems.iceWater * powered +
      waterChange,
    food: (greenhousePaused ? 0 : systems.foodGrown * powered) - crewFood + foodChange,
    shielding: shieldingChange,
  };

  const stores = drainForSol(run.stores, net, capacity);
  const settled: ResourceStores = { ...stores, power: Math.max(0, Math.min(capacity, level)) };
  const after = clampStores(settled, capacity);

  const done: SolActivity | null =
    activity === null ? null : { id: activity.id, title: activity.title, science: activity.science };

  const record: SolRecord = {
    sol,
    stores: after,
    net,
    powerGenerated: generatedDay + generatedNuclear,
    powerUsed: demand,
    powerWasted: wasted,
    blackout,
    panelHealth,
    greenhousePaused,
    used: { oxygen: crewOxygen, water: crewWater, food: crewFood },
    activity: done,
    events,
    notes,
  };

  const depleted = isRunOver(after);
  const status = depleted ? 'lost' : sol >= WIN_SOL ? 'won' : 'active';

  return {
    ...run,
    sol,
    stores: after,
    status,
    panelHealth,
    science: run.science + scienceEarned,
    chosenActivity: null,
    log: [...run.log, record],
  };
}

/**
 * What a normal sol would do to the outpost as it stands: no forecast event, no
 * choice. Used for the trade-off picture, for Mission Control's advice, and to
 * tell a self-sustaining outpost from one living on its reserves.
 */
export function projectSol(run: RunState): SolRecord {
  const calm: RunState = { ...run, status: 'active', forecast: [], decisions: [], log: [] };
  const result = advanceSol(calm);
  const record = result.log[0];

  if (record === undefined) throw new Error('projectSol: advanceSol produced no record');

  return record;
}

/** The kWh the arrays make on a clear day, and what the night costs: the README's picture. */
export function powerPicture(run: RunState): {
  readonly generatedKw: number;
  readonly storedKwh: number;
  readonly nightDrainKw: number;
  readonly capacityKwh: number;
} {
  const systems = systemsFor(run.modules, run.regionId);

  return {
    generatedKw: Math.round(systems.solarKw * systems.sunFactor * run.panelHealth),
    storedKwh: Math.round(run.stores.power),
    nightDrainKw: Math.round(systems.loadKw - systems.nuclearKw),
    capacityKwh: systems.batteryKwh,
  };
}

/** A run is self-sustaining when a calm sol leaves air, water and food level or better. */
export function isSelfSustaining(run: RunState): boolean {
  const calm = projectSol(run);
  const { net } = calm;
  const slack = 0.5;
  // Power is judged over the whole sol, not by where the battery ends the night: a
  // battery that dips overnight and refills by noon is exactly what balanced looks like.
  const powerBalanced = calm.blackout === 0 && calm.powerGenerated >= calm.powerUsed;

  return powerBalanced && net.oxygen >= -slack && net.water >= -slack && net.food >= -slack;
}

/** Which stores ended the run, in the canonical order. Empty while it is still going. */
export function endedBy(run: RunState): readonly ResourceName[] {
  return run.status === 'lost' ? lostStores(run.stores) : [];
}

export { ZERO as ZERO_STORES };
