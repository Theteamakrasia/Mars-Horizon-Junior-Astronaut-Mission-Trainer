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

import { activityById, canAfford, type ActivitySpec } from './activities';
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
  floorStreak,
  FLOORED_STORES,
  LIFE_STORES,
  scrubbedStores,
  type ResourceName,
  type ResourceStores,
} from './resources';
import { inspectionStars, type DecisionRecord, type RunState, type SolActivity, type SolEvent, type SolRecord } from './run';
import { deployRover, discover, pickForSol, remainingFinds, ROVER_FINDS } from './rover';
import { siteScore } from './regions';
import { crisisForEvent, canAffordOption, fallbackOption, optionOf } from './crises';
import { powerBudget } from './powerBudget';
import { SOL_LOG_POINTS } from './science';

export type { SolEvent } from './run';

/** The run is won by living through this many sols. */
export const WIN_SOL = 12;

/** Radiation damage to the shielding by flare size, before any choice reduces it. */
export const FLARE_DRAIN: Readonly<Record<number, number>> = { 1: 6, 2: 12, 3: 20 };
export const SHELTER_FACTOR = 0.4;
export const SHIELD_UP_FACTOR = 0.6;
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
  const option = optionOf(crisis, optionId);

  if (option === null) {
    throw new RangeError(`Crisis ${crisisId} has no option ${optionId}`);
  }

  /* The desk greys out an option the day cannot pay for, and this is where
     that becomes a rule: a stale screen cannot spend power the run does not
     have. */
  if (!canAffordOption(run, option)) {
    throw new RangeError(
      `Crisis ${crisisId} option ${optionId} costs ${option.powerKwh ?? 0} kWh and you can spend ${Math.round(powerBudget(run).spendableKwh)} kWh today`,
    );
  }

  const record: DecisionRecord = { sol: event.sol, crisisId, optionId, timedOut };

  return {
    ...run,
    decisions: [...run.decisions.filter((entry) => entry.crisisId !== crisisId), record],
  };
}

/**
 * The option chosen for a crisis, or the fallback when none was recorded.
 *
 * The fallback is the crisis's default (what a countdown uses) unless the
 * batteries cannot pay for it, in which case the first affordable option
 * stands in — so a timeout can never charge for a choice it forbade.
 */
function chosen(run: RunState, crisisId: string): string {
  const recorded = run.decisions.find((entry) => entry.crisisId === crisisId);

  if (recorded !== undefined) return recorded.optionId;

  const event = run.forecast.find((entry) => entry.id === crisisId);

  return event === undefined ? '' : fallbackOption(run, crisisForEvent(event)).id;
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
 * The stores that have sat below the floor for two sols in a row.
 *
 * This is the second way a run ends, and the one the player is warned about:
 * a store can be emptied on a single sol (`isRunOver`), or it can be left
 * under thirty percent for two sols, at which point the outpost is no longer
 * worth resupplying and Mission Control brings the crew home.
 */
export function scrubbedBy(run: RunState): readonly ResourceName[] {
  return scrubbedStores(run.log);
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
export function advanceSol(run: RunState, roverRoll?: number): RunState {
  if (run.status !== 'active') return run;

  const sol = run.sol + 1;
  const systems = systemsFor(run.modules, run.regionId);
  const score = siteScore(run.regionId);
  const events: SolEvent[] = [];
  const notes: string[] = [];

  let panelHealth = run.panelHealth;
  let shieldingChange = -systems.shieldingErosion;
  /* The erosion is always a loss; everything else is split by sign at the end. */
  let shieldingGain = 0;
  let shieldingLoss = systems.shieldingErosion;
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
        shieldingGain += SPARES_SHIELDING;
        panelHealth = Math.min(1, panelHealth + SPARES_PANEL_REPAIR);
      }
      notes.push(`The supply pod brought ${choice === 'spares' ? 'spare parts' : choice}.`);
    }

    if (event.kind === 'flare') {
      const base = FLARE_DRAIN[event.intensity] ?? FLARE_DRAIN[1];
      const factor =
        choice === 'shelter' ? SHELTER_FACTOR : choice === 'shield-up' ? SHIELD_UP_FACTOR : 1;

      shieldingChange -= base * factor;
      shieldingLoss += base * factor;
      if (choice === 'shelter') greenhousePaused = true;
      /* The digger's cost is the option's, not a number repeated here: the card
         that offers it and the sim that charges for it read the same field. */
      extraPowerCost += optionOf(crisisForEvent(event), choice)?.powerKwh ?? 0;
      notes.push(
        `The flare hit the shielding for ${Math.round(base * factor)} points` +
          (choice === 'carry-on' ? ' because nobody took cover.' : '.'),
      );
    }

    if (event.kind === 'storm' && choice === 'expose') {
      panelHealth = Math.max(MIN_PANEL_HEALTH, panelHealth - EXPOSED_PANEL_DAMAGE);
      notes.push('Dust settled on the panels. It never washes off.');
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
  // spend 50 kWh on a rover survey with a flat battery and the sol runs in a
  // blackout. That is the trade-off the whole game is built around, and it
  // comes free from the model that was already here.
  //
  // A sol with a forecast event has no activity: the crisis is the day's work
  // (D-040), and running an experiment while sheltering from a flare would
  // be a story nobody could follow.
  const picked = starting.length > 0 ? null : chosenActivity(run);
  /*
   * A job the batteries cannot pay for cannot be started. The desk already
   * greys the card for the same reason; checking it again here is what makes
   * it a rule rather than a disabled button. `rest` costs nothing, so there is
   * always something the crew can do with the day.
   *
   * The price is checked against the same budget the card shows — what the
   * batteries will hold at the end of the day — so a job that the desk offers
   * is a job the sol can run (ISS-083).
   */
  const activity = picked !== null && !canAfford(picked, run) ? null : picked;
  let scienceEarned = SOL_LOG_POINTS;

  if (picked !== null && activity === null) {
    notes.push(
      `There was not enough power for ${picked.title} today, so that job was not done.`,
    );
  }

  if (activity !== null) {
    extraPowerCost += activity.powerCostKwh;
    foodChange += activity.storeDelta.food ?? 0;
    waterChange += activity.storeDelta.water ?? 0;
    oxygenChange += activity.storeDelta.oxygen ?? 0;
    shieldingChange += activity.storeDelta.shielding ?? 0;
    shieldingGain += Math.max(0, activity.storeDelta.shielding ?? 0);
    shieldingLoss += Math.max(0, -(activity.storeDelta.shielding ?? 0));

    if (activity.panelRepair !== undefined) {
      panelHealth = Math.min(1, panelHealth + activity.panelRepair);
    }

    /* The stars an inspection won multiply the science the order is worth.
       That is the whole effect: an inspection never touches a store, so the
       balance of a run does not depend on how well the player did it. */
    scienceEarned += activity.science * inspectionStars(run, sol, activity.id);
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

  /*
   * The Sun comes up, the outpost draws all day, and the day's work is paid
   * for out of what is left — before the batteries fill.
   *
   * The order matters, and it was wrong (ISS-084). The job used to be charged
   * *after* the batteries had filled, so the surplus had already spilled and
   * every kWh the crew spent came straight out of the night's reserve: the
   * bank fell a little further every sol and ended up at zero, with a small
   * blackout every sol after that. The player was right - the electricity was
   * going nowhere.
   *
   * The job runs while the Sun is up, so it is paid for by the daylight. What
   * the batteries keep is the night's reserve, and the surplus that does not
   * fit is what spills.
   */
  let level = run.stores.power + generatedDay + (generatedNuclear / 2) - dayDraw - extraPowerCost;
  let wasted = Math.max(0, level - capacity);

  level = Math.min(capacity, level);

  if (level < 0) {
    unmet += -level;
    level = 0;
  }

  level += generatedNuclear / 2 - nightDraw;
  if (level < 0) {
    unmet += -level;
    level = 0;
  }

  /* Night power from a nuclear unit has nowhere to go when the batteries are
     already full. It used to vanish without a word, so the review showed a gain
     that never reached the battery. It is counted as wasted like the sunlight. */
  if (level > capacity) {
    wasted += level - capacity;
    level = capacity;
  }

  const demand = loadKw * (SUN_HOURS + NIGHT_HOURS) + extraPowerCost;
  const blackout = demand > 0 ? Math.min(1, unmet / demand) : 0;
  const powered = 1 - blackout;

  if (blackout > 0) {
    notes.push(
      `Batteries ran flat for ${Math.round(blackout * 100)}% of the sol, so life support slowed down.`,
    );
  }
  if (wasted > 0) {
    notes.push(`${Math.round(wasted)} kWh of sunlight wasted: the batteries were already full.`);
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

  /* The same sol, as what was made and what was used. Each pair sums to the
     net above, so the review can show both without the two disagreeing. */
  const positive = (value: number): number => Math.max(0, value);
  const generated = generatedDay + generatedNuclear;
  const powerDrawn = demand - unmet;
  const recycled = crewWater * systems.waterRecycling * powered;
  const greenhouseDrink = greenhousePaused ? 0 : systems.greenhouseWater * powered;

  const produced: ResourceStores = {
    power: generated,
    oxygen: systems.oxygenGenerated * powered + positive(oxygenChange),
    water: recycled + systems.iceWater * powered + positive(waterChange),
    food: (greenhousePaused ? 0 : systems.foodGrown * powered) + positive(foodChange),
    shielding: shieldingGain,
  };

  const consumed: ResourceStores = {
    power: powerDrawn,
    oxygen: crewOxygen + positive(-oxygenChange),
    water: crewWater + systems.electrolysisWater * powered + greenhouseDrink + positive(-waterChange),
    food: crewFood + positive(-foodChange),
    shielding: shieldingLoss,
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
    produced,
    consumed,
    powerGenerated: generatedDay + generatedNuclear,
    powerUsed: demand,
    powerWasted: wasted,
    powerNight: nightDraw,
    powerExtra: extraPowerCost,
    blackout,
    panelHealth,
    greenhousePaused,
    used: { oxygen: crewOxygen, water: crewWater, food: crewFood },
    activity: done,
    events,
    notes,
  };

  const depleted = isRunOver(after);
  const scrubbed = scrubbedStores([...run.log, record]);
  const status = depleted || scrubbed.length > 0 ? 'lost' : sol >= WIN_SOL ? 'won' : 'active';

  /* The rover. It goes out on a work order like any other, and it comes back
     with a document on the desk the next sol — so the find is found at the
     end of the sol that sent it, and the desk shows it from the next one. */
  let rover = run.rover;

  if (activity !== null && activity.sendsRover === true) {
    rover = deployRover(rover, sol);
    const pick =
      roverRoll === undefined
        ? pickForSol(sol, remainingFinds(rover, ROVER_FINDS).length)
        : Math.min(0.999, Math.max(0, roverRoll));

    rover = discover(rover, ROVER_FINDS, pick);
  }

  return {
    ...run,
    sol,
    stores: after,
    status,
    panelHealth,
    science: run.science + scienceEarned,
    chosenActivity: null,
    rover,
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

/**
 * Which stores ended the run, in the canonical order. Empty while it is still going.
 *
 * Two ways to end, so two answers: a store that ran dry is named first, because
 * "the tank emptied" is the sharper lesson. Failing that, the stores that sat
 * below the floor for two sols are named — the run that was warned and did not
 * come back.
 */
export function endedBy(run: RunState): readonly ResourceName[] {
  if (run.status !== 'lost') return [];

  const empty = lostStores(run.stores);

  if (empty.length > 0) return empty;

  return scrubbedStores(run.log);
}

/** True when the run ended by the floor rule rather than by a store emptying. */
export function wasScrubbed(run: RunState): boolean {
  return run.status === 'lost' && lostStores(run.stores).length === 0 && scrubbedBy(run).length > 0;
}

/** The sol a store first fell below the floor in its final run of low sols, or null. */
export function floorSince(run: RunState, name: ResourceName): number | null {
  if (!FLOORED_STORES.includes(name)) return null;

  const streak = floorStreak(run.log, name);

  if (streak <= 0) return null;

  return run.log[Math.max(0, run.log.length - streak)]?.sol ?? null;
}

export { ZERO as ZERO_STORES };
