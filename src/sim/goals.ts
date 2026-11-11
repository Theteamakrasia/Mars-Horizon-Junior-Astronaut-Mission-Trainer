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

/* ------------------------------------------------------------ the objectives -- */

/**
 * What each goal asks of the outpost, and how many sols earn it.
 *
 * A goal here is not a bar to watch: it is something to *earn*. The old
 * reading was a live status — ok, watch, critical — which flickered with every
 * sol and could be lost by one bad afternoon. Seven sols of holding all five
 * goals was worth nothing, because the screen only ever showed the latest
 * sol. These counters are cumulative, so that work is visible.
 *
 * Every number here is on the screen. A child can see the target, see the
 * count, and see which goal is going wrong.
 */

/** Below this the panels are wrecked, and the goal is in trouble now. */
export const DUST_PANEL_FLOOR = 0.7;
/**
 * The panels have to be spotless for the sol to count towards the dust goal.
 *
 * Dust only settles when the crew chooses to leave the panels out in a storm,
 * so this goal is really the decision about whether to fold them away. It is
 * a trade-off, not a chore: folding them away means no power from the Sun for
 * a sol or two.
 */
export const DUST_SPOTLESS = 1;
/** The level air and water have to stay above, out of 100. */
export const LIFE_STORE_FLOOR = 40;
/** The level the radiation shield has to stay above, out of 100. */
export const SHIELDING_FLOOR = 40;
/** The level the food store has to stay above, out of 100. */
export const FOOD_FLOOR = 40;
/**
 * The share of a sol's power that may be missing and still count as "on".
 *
 * A sol can end a few percent short just because the batteries were a hair
 * too small for the night. That is not the same as running flat, and losing a
 * whole sol's credit for it would punish a build that was working.
 */
export const POWER_BLACKOUT_FLOOR = 0.05;

/**
 * How many sols each goal needs to be held for to be earned.
 *
 * A twelve-sol run, so ten of twelve is a good run and eight is a fair one.
 * The dust goal is easier because a storm costs a sol whatever the player does.
 */
export const GOAL_TARGETS: Readonly<Record<ScienceGoal, number>> = {
  'dust-storm': 12,
  'life-support': 10,
  radiation: 10,
  power: 10,
  food: 9,
};

/** What earning each goal means, in one short line. */
export const GOAL_AIMS: Readonly<Record<ScienceGoal, string>> = {
  'dust-storm': 'Keep the panels spotless',
  'life-support': 'Keep air and water safe',
  radiation: 'Keep the crew behind the shield',
  power: 'Keep the power on',
  food: 'Keep the crew fed',
};

/**
 * One goal, read as something the crew is working towards.
 *
 * `held` counts the sols that counted. `needed` is the target. `earned` is
 * what the debrief counts.
 */
export interface GoalObjective {
  readonly id: ScienceGoal;
  readonly title: string;
  /** What earning it means, in one short line. */
  readonly aim: string;
  /** Sols that counted so far. */
  readonly held: number;
  /** Sols needed to earn it. */
  readonly needed: number;
  /** True once `held` reaches `needed`. */
  readonly earned: boolean;
  /** True when it is going wrong right now. */
  readonly slipping: boolean;
  /** One short line about it right now. */
  readonly detail: string;
}

/** The one line under a goal row: short enough to read at a glance. */
function shortDetail(id: ScienceGoal, run: RunState, reading: GoalReading | undefined): string {
  const stores = run.stores;

  switch (id) {
    case 'dust-storm':
      return `Panels at ${Math.round(run.panelHealth * 100)}%`;
    case 'life-support':
      return `Air ${Math.round(stores.oxygen)}% · Water ${Math.round(stores.water)}%`;
    case 'radiation':
      return `Shield ${Math.round(stores.shielding)} of 100`;
    case 'power':
      return reading !== undefined && reading.status === 'critical' ? 'The batteries ran flat' : 'Batteries holding';
    case 'food':
      return stores.food >= FOOD_FLOOR ? `Food ${Math.round(stores.food)}%` : `Food ${Math.round(stores.food)}% and falling`;
  }
}

/**
 * How each of the five goals is doing over the run so far.
 *
 * The counters come from the log, so they are a fact about what happened and
 * not a number kept alongside the run. Replaying the same log gives the same
 * answer, which is what makes the debrief and the act screen agree.
 */
export function goalProgress(run: RunState): readonly GoalObjective[] {
  const held: Record<ScienceGoal, number> = {
    'dust-storm': 0,
    'life-support': 0,
    radiation: 0,
    power: 0,
    food: 0,
  };

  for (const record of run.log) {
    if (record.panelHealth >= DUST_SPOTLESS) held['dust-storm'] += 1;
    if (record.stores.oxygen >= LIFE_STORE_FLOOR && record.stores.water >= LIFE_STORE_FLOOR) held['life-support'] += 1;
    if (record.stores.shielding >= SHIELDING_FLOOR) held.radiation += 1;
    if (record.blackout <= POWER_BLACKOUT_FLOOR) held.power += 1;
    if (record.stores.food >= FOOD_FLOOR) held.food += 1;
  }

  const readings = goalReadings(run);

  return SCIENCE_GOALS.map((spec) => {
    const reading = readings.find((entry) => entry.spec.id === spec.id);
    const count = held[spec.id];
    const needed = GOAL_TARGETS[spec.id];

    return {
      id: spec.id,
      title: spec.title,
      aim: GOAL_AIMS[spec.id],
      held: count,
      needed,
      earned: count >= needed,
      slipping: reading !== undefined && reading.status !== 'ok',
      detail: shortDetail(spec.id, run, reading),
    };
  });
}

/** How many of the five goals the crew has earned. */
export function goalsEarned(run: RunState): number {
  return goalProgress(run).filter((objective) => objective.earned).length;
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
      return `A dust storm is on the way. The panels would make ${Math.round(panelKw * (1 - stormOpacity(site.dust)))} kW instead of ${Math.round(panelKw)}.`;
    }

    if (run.panelHealth < 1) {
      const lost = Math.round((1 - run.panelHealth) * 100);

      return `Dust has taken ${lost}% off the panels, and the damage is for good.`;
    }

    return `The panels are clean: ${Math.round(panelKw)} kW whenever the Sun is up.`;
  })();

  /* A storm on the way is a warning, not a failure. `critical` is reserved for
     the panels failing now, which is a different thing and the one that
     matters: the crew can prepare for a storm, but they cannot un-dust a
     panel. */
  const dustStatus: GoalStatus =
    run.panelHealth < DUST_PANEL_FLOOR ? 'critical' : storm !== null || run.panelHealth < 1 ? 'watch' : 'ok';

  /* -- 2. Life Support -------------------------------------------------- */
  const oxygen = percentOf('oxygen', run.stores, capacity);
  const water = percentOf('water', run.stores, capacity);
  const blackout = last?.blackout ?? 0;

  const life: GoalReading['detail'] = (() => {
    if (blackout > POWER_BLACKOUT_FLOOR) {
      return `Batteries ran flat for ${Math.round(blackout * 100)}% of the last sol, so the air and water makers slowed down. Air ${oxygen}%, water ${water}%.`;
    }

    if (oxygen < 40 || water < 40) {
      return `Air at ${oxygen}% and water at ${water}%. The crew are running the stores down.`;
    }

    return `Air at ${oxygen}% and water at ${water}%. The recycler and the oxygen maker are running.`;
  })();

  const lifeStatus: GoalStatus =
    blackout > POWER_BLACKOUT_FLOOR ? 'critical' : oxygen < 40 || water < 40 ? 'watch' : 'ok';

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
    if (blackout > POWER_BLACKOUT_FLOOR) {
      return `The batteries ran flat for ${Math.round(blackout * 100)}% of the last sol. ${stored} of ${capacity} kWh in store now.`;
    }

    if (capacity > 0 && stored < capacity * 0.35) {
      return `${stored} of ${capacity} kWh in the batteries. That is not much to get through a night.`;
    }

    return `${stored} of ${capacity} kWh in the batteries, and the arrays make ${Math.round(panelKw)} kW by day.`;
  })();

  const powerStatus: GoalStatus =
    blackout > POWER_BLACKOUT_FLOOR ? 'critical' : capacity > 0 && stored < capacity * 0.35 ? 'watch' : 'ok';

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
