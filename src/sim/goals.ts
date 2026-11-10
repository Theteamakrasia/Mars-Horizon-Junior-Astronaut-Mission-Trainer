/**
 * The five science goals the whole game is about.
 *
 * Every number in the game belongs to one of these:
 *
 *   1. Martian Dust Storm  - dust cuts the sunlight reaching the solar panels
 *                             and can affect the equipment
 *   2. Life Support        - keeping oxygen, water and a safe living environment
 *   3. Radiation Exposure  - protecting the crew from harmful space radiation
 *   4. Power Shortage      - keeping enough electricity for the systems that matter
 *   5. Food Production     - making sure the crew has food they can count on
 *
 * Naming them is the point. Without it the game is five numbers falling and a
 * player has to work out for themselves that the dust is what is blocking the
 * Sun. With it, every screen can say which goal a choice is serving and every
 * status can be read as a fact about the science rather than as a bar going
 * down.
 *
 * Pure. No DOM, no network, no randomness: the same run always reads the same
 * way, so a demo repeats and a test can pin it.
 */

import { stormOn, stormOpacity } from './forecast';
import { CREW_SIZE, FOOD_PER_CREW, systemsFor } from './modules';
import { percentOf } from './resources';
import { siteScore } from './regions';
import type { RunState } from './run';
import type { ScienceTopic } from './topics';

/** The five goals. */
export type ScienceGoal = 'dust-storm' | 'life-support' | 'radiation' | 'power' | 'food';

/** One of the five goals, and the science it is about. */
export interface GoalSpec {
  readonly id: ScienceGoal;
  /** The name the science goes by. */
  readonly title: string;
  /** What the goal is really about, in the game's words. */
  readonly question: string;
  /** The topic its NASA fact is filed under. */
  readonly topic: ScienceTopic;
}

/**
 * The five goals, in the order they are shown.
 *
 * The order is the order a reader meets them in the briefing: the weather, the
 * air, the radiation, the power, the food. It is also the order they bite in —
 * dust blocks the power, the power runs the life support, and the food runs
 * out last.
 */
export const SCIENCE_GOALS: readonly GoalSpec[] = [
  {
    id: 'dust-storm',
    title: 'Martian Dust Storm',
    question: 'Dust cuts the sunlight reaching the solar panels and can affect the equipment.',
    topic: 'dust',
  },
  {
    id: 'life-support',
    title: 'Life Support',
    question: 'Keeping oxygen, water and a safe living environment.',
    topic: 'water',
  },
  {
    id: 'radiation',
    title: 'Radiation Exposure',
    question: 'Protecting the crew from harmful space radiation.',
    topic: 'radiation',
  },
  {
    id: 'power',
    title: 'Power Shortage',
    question: 'Keeping enough electricity for the systems that matter.',
    topic: 'power',
  },
  {
    id: 'food',
    title: 'Food Production',
    question: 'Making sure the crew has food they can count on.',
    topic: 'food',
  },
];

/** How a goal is doing. */
export type GoalStatus = 'ok' | 'watch' | 'critical';

/** One goal, read against the run as it stands. */
export interface GoalReading {
  readonly spec: GoalSpec;
  readonly status: GoalStatus;
  /** One line about this goal right now, in plain words. */
  readonly detail: string;
}

/** The goal with this id, or null. */
export function goalById(id: ScienceGoal): GoalSpec | null {
  return SCIENCE_GOALS.find((goal) => goal.id === id) ?? null;
}

/**
 * How each of the five goals is doing.
 *
 * Every line is worked out from the sim — the storm that is actually running,
 * the panels' real output, the stores as they stand, the last sol's blackout —
 * so the reading is a fact about the outpost and not a decoration. A child who
 * reads "the greenhouse grows 12 food a sol and the crew eat 10" has learned
 * something true about the machine they are running.
 */
export function goalReadings(run: RunState): readonly GoalReading[] {
  const systems = systemsFor(run.modules, run.regionId);
  const capacity = systems.batteryKwh;
  const last = run.log[run.log.length - 1];
  const site = siteScore(run.regionId);

  /* -- 1. Martian Dust Storm ------------------------------------------- */
  const storm = stormOn(run.forecast, run.sol + 1);
  const panelKw = systems.solarKw * systems.sunFactor * run.panelHealth;

  const dust: GoalReading['detail'] = (() => {
    if (storm !== null) {
      const blocked = stormOpacity(site.dust);

      return `A dust storm is over the panels. They are making ${Math.round(panelKw * (1 - blocked))} kW instead of ${Math.round(panelKw)}.`;
    }

    if (run.panelHealth < 1) {
      return `Dust has settled on the panels. They make ${Math.round(panelKw)} kW — ${Math.round(run.panelHealth * 100)}% of what they should — and the damage is for good.`;
    }

    return `The panels are clean: ${Math.round(panelKw)} kW whenever the Sun is up.`;
  })();

  const dustStatus: GoalStatus = storm !== null ? 'critical' : run.panelHealth < 1 ? 'watch' : 'ok';

  /* -- 2. Life Support -------------------------------------------------- */
  const oxygen = percentOf('oxygen', run.stores, capacity);
  const water = percentOf('water', run.stores, capacity);
  const blackout = last?.blackout ?? 0;

  const life: GoalReading['detail'] = (() => {
    if (blackout > 0) {
      return `The batteries ran flat for ${Math.round(blackout * 100)}% of the last sol, so the air and water makers slowed down. Air ${oxygen}%, water ${water}%.`;
    }

    if (oxygen < 40 || water < 40) {
      return `Air at ${oxygen}% and water at ${water}%. The crew are running the stores down.`;
    }

    return `Air at ${oxygen}% and water at ${water}%. The recycler and the oxygen maker are running.`;
  })();

  const lifeStatus: GoalStatus = blackout > 0 ? 'critical' : oxygen < 40 || water < 40 ? 'watch' : 'ok';

  /* -- 3. Radiation Exposure ------------------------------------------- */
  const shielding = Math.round(run.stores.shielding);
  const flareAhead = run.forecast.find((event) => event.kind === 'flare' && event.sol > run.sol);

  const radiation: GoalReading['detail'] = (() => {
    if (flareAhead !== undefined) {
      return `Shielding at ${shielding} of 100. A flare is on the way, and Mars has no magnetic field to turn the particles aside.`;
    }

    if (shielding < 40) {
      return `Shielding at ${shielding} of 100. There is not much between the crew and the radiation.`;
    }

    return `Shielding at ${shielding} of 100. The crew are behind it.`;
  })();

  const radiationStatus: GoalStatus = shielding < 40 ? 'critical' : flareAhead !== undefined ? 'watch' : 'ok';

  /* -- 4. Power Shortage ------------------------------------------------ */
  const stored = Math.round(run.stores.power);

  const power: GoalReading['detail'] = (() => {
    if (blackout > 0.05) {
      return `The batteries ran flat for ${Math.round(blackout * 100)}% of the last sol. ${stored} of ${capacity} kWh in store now.`;
    }

    if (capacity > 0 && stored < capacity * 0.35) {
      return `${stored} of ${capacity} kWh in the batteries. That is not much to get through a night.`;
    }

    return `${stored} of ${capacity} kWh in the batteries, and the arrays make ${Math.round(panelKw)} kW by day.`;
  })();

  const powerStatus: GoalStatus = blackout > 0.05 ? 'critical' : capacity > 0 && stored < capacity * 0.35 ? 'watch' : 'ok';

  /* -- 5. Food Production ---------------------------------------------- */
  const eaten = FOOD_PER_CREW * CREW_SIZE;

  const food: GoalReading['detail'] = (() => {
    if (!systems.hasGreenhouse) {
      return `No greenhouse. The ${CREW_SIZE} astronauts eat ${eaten} food a sol and nothing replaces it.`;
    }

    if (last?.greenhousePaused === true) {
      return `The greenhouse is not growing at the moment: ${systems.foodGrown} food a sol against ${eaten} eaten.`;
    }

    if (systems.foodGrown < eaten) {
      return `The greenhouse grows ${systems.foodGrown} food a sol and the crew eat ${eaten}. The stores are going down.`;
    }

    return `The greenhouse grows ${systems.foodGrown} food a sol and the crew eat ${eaten}. Food is not the problem.`;
  })();

  const foodStatus: GoalStatus = !systems.hasGreenhouse ? 'critical' : systems.foodGrown < eaten ? 'watch' : 'ok';

  const readings: readonly [GoalSpec, GoalStatus, string][] = [
    [SCIENCE_GOALS[0] as GoalSpec, dustStatus, dust],
    [SCIENCE_GOALS[1] as GoalSpec, lifeStatus, life],
    [SCIENCE_GOALS[2] as GoalSpec, radiationStatus, radiation],
    [SCIENCE_GOALS[3] as GoalSpec, powerStatus, power],
    [SCIENCE_GOALS[4] as GoalSpec, foodStatus, food],
  ];

  return readings.map(([spec, status, detail]) => ({ spec, status, detail }));
}
