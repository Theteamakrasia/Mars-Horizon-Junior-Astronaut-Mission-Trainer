/**
 * Pure rules for the base screen: what can be built, what it costs, and what a
 * set of modules adds up to.
 *
 * The catalogue and every tuning number live in `sim/modules.ts` so the sol step
 * and this screen can never disagree. Terrain reaches here as a region id on the
 * run, never by importing landing-site (R-5).
 */

import {
  BUILD_BUDGET,
  CORE_MODULES,
  LOAD_KW,
  MODULE_CATALOGUE,
  NIGHT_HOURS,
  SOLAR_KW_PER_ARRAY,
  SUN_HOURS,
  countOf,
  extraLimitOf,
  extraModuleCount,
  extraSlots,
  extrasOf,
  pointsSpent,
  siteAllows,
  specOf,
  systemsFor,
  type ModuleKind,
  type ModuleSpec,
} from '../../sim/modules';
import { LIFE_STORE_FLOOR, POWER_BLACKOUT_FLOOR, SHIELDING_FLOOR, type ScienceGoal } from '../../sim/goals';
import { visibleForecast, type ForecastEvent } from '../../sim/forecast';
import { newRun, startOutpost } from '../../sim/run';
import { projectSol, WIN_SOL } from '../../sim/sol';

export { BUILD_BUDGET, CORE_MODULES, MODULE_CATALOGUE, extraLimitOf, extraSlots, pointsSpent, specOf };
export type { ModuleKind, ModuleSpec };

/** Reminder shown beside the launch button: building nothing extra is allowed, and teaches something. */
export const BUDGET_NONE = 'You can land with nothing extra. It is allowed, and you will see why it is hard.';

/**
 * What the button does when the outpost has already landed.
 *
 * `#/base` can be reached again mid-run, and the button under the cards resets
 * the sol, the stores, the science and the log. It used to keep saying "Land &
 * start sol 1", so a player who went back to look at the build wiped the run
 * without being told (ISS-081).
 */
export const RESTART_NOTE = 'This starts the outpost over at sol 1 and clears the sols you have played.';

/** Modules a player can add, in catalogue order: everything that is not a core module. */
export const BUILDABLE: readonly ModuleSpec[] = MODULE_CATALOGUE.filter((spec) => spec.cost > 0);

/** What a module is called when the screen is naming what draws the power. */
const SHORT_MODULE_NAME: Readonly<Record<ModuleKind, string>> = {
  habitat: 'the home',
  'life-support': 'air',
  'solar-array': 'the panels',
  batteries: 'the batteries',
  greenhouse: 'the greenhouse',
  'ice-miner': 'the ice miner',
  'regolith-shield': 'the shield',
  'nuclear-unit': 'the reactor',
};

export interface Placement {
  readonly ok: boolean;
  /** Why not, in a sentence for a child. Empty when it can be built. */
  readonly reason: string;
}

/** Everything on the surface for a chosen set of extras. */
export function allModules(extras: readonly ModuleKind[]): readonly ModuleKind[] {
  return [...CORE_MODULES, ...extras];
}

/** Build points still free. */
export function pointsLeft(extras: readonly ModuleKind[]): number {
  return BUILD_BUDGET - pointsSpent(allModules(extras));
}

/**
 * Can one more of this module go here?
 *
 * Checked in the order a child would hit the limits: the site's rules first
 * (ice, ground), then the limit on how many, then room, then the budget. The
 * reason names the one that actually stopped it, in words a child can read.
 */
export function canPlace(kind: ModuleKind, extras: readonly ModuleKind[], regionId: string): Placement {
  const spec = specOf(kind);
  const modules = allModules(extras);

  if (!siteAllows(kind, regionId) && spec.requires !== undefined) {
    return { ok: false, reason: spec.requires.why };
  }

  if (countOf(modules, kind) >= spec.maxCount) {
    return { ok: false, reason: `That is the most ${spec.plural} you can have.` };
  }

  if (extraModuleCount(modules) >= extraSlots(regionId)) {
    return { ok: false, reason: 'No room left on this ground.' };
  }

  if (spec.cost > pointsLeft(extras)) {
    return { ok: false, reason: `You need ${spec.cost} points. You have ${pointsLeft(extras)}.` };
  }

  return { ok: true, reason: '' };
}

/**
 * One module card on the build screen, ready to draw.
 *
 * The count and the limit are both on the card, because a player who cannot
 * see how many they are allowed cannot tell whether the "+" is broken or
 * whether they are done.
 */
export interface BuildCard {
  readonly kind: ModuleKind;
  readonly name: string;
  readonly cost: number;
  /** How many the player has added. Drives the minus button, never the card's number. */
  readonly have: number;
  /** How many more of this module the player can add. */
  readonly limit: number;
  /** How many the outpost has, including the copy the lander brought. This is the number on the card. */
  readonly total: number;
  /** The catalogue maximum, and the denominator on the card. */
  readonly maxCount: number;
  /** 1 for the modules the lander brings, 0 otherwise. */
  readonly fromLander: number;
  /** True when no more can be added. */
  readonly atLimit: boolean;
  /** Why the "+" is dead, in one short line. Empty when it is not dead. */
  readonly blocked: string;
  /** What it gives, in one short line. */
  readonly gives: string;
  /**
   * A note about this purchase, when there is one worth saying.
   *
   * Empty for everything but the solar array, and there it says what a second
   * array would do with the sunlight it makes.
   */
  readonly note: string;
  /** What it asks of everything else, in one short line. */
  readonly needs: string;
}

/**
 * Every buildable module, with the numbers the card needs.
 *
 * `atLimit` is about the module's own limit only. A module can also be
 * blocked by the ground or the budget, and then `blocked` says which.
 */
export function buildCards(extras: readonly ModuleKind[], regionId: string): readonly BuildCard[] {
  return BUILDABLE.map((spec) => {
    const have = countOf(extras, spec.kind);
    const limit = extraLimitOf(spec.kind);
    const placement = canPlace(spec.kind, extras, regionId);
    const fromLander = CORE_MODULES.includes(spec.kind) ? 1 : 0;

    return {
      kind: spec.kind,
      name: spec.name,
      cost: spec.cost,
      have,
      limit,
      total: have + fromLander,
      maxCount: spec.maxCount,
      fromLander,
      atLimit: have >= limit,
      blocked: placement.ok ? '' : placement.reason,
      gives: spec.gives,
      needs: spec.needs,
      /* The solar array is the one card where a purchase can be pointless: the
         sunlight has nowhere to go if the batteries are full. */
      note: spec.kind === 'solar-array' ? arrayNote(extras, regionId) : '',
    };
  });
}

/**
 * What this build can do for the five goals.
 *
 * The build screen used to answer "what will I buy?" and nothing else, so a
 * player had no way to know which modules were for which goal. Now the build
 * is a plan: five ticks, and a line saying what is missing when there is no
 * tick.
 */
export interface GoalPreview {
  readonly id: ScienceGoal;
  readonly title: string;
  /** True when this build can hold the goal. */
  readonly ok: boolean;
  /** Why not, in one short line. Empty when it can. */
  readonly why: string;
}

/** Whether a build can hold each of the five goals, and what is missing. */
export function goalPreview(extras: readonly ModuleKind[], regionId: string): readonly GoalPreview[] {
  const modules = allModules(extras);
  const run = startOutpost(newRun(regionId, ''), modules);
  const calm = projectSol(run);
  const systems = systemsFor(modules, regionId);
  const upkeep = upkeepFor(extras, regionId);

  /* Where the stores end up if nothing changes for the whole run. */
  const waterAtEnd = run.stores.water + calm.net.water * WIN_SOL;
  const shieldAtEnd = run.stores.shielding + calm.net.shielding * WIN_SOL;
  const powerOk = calm.blackout <= POWER_BLACKOUT_FLOOR && upkeep.nightHoursCovered >= NIGHT_HOURS;

  /*
   * Why the water goal failed, in the words of the thing that caused it.
   *
   * A greenhouse drinks a fixed share of the tank every sol and only the ice
   * miner refills it, so a greenhouse without one drains the tank. The old
   * sentence was the fixed string "No water source": true, and useless. It
   * appeared the moment a greenhouse was built, and it named neither the
   * module that caused it nor the one that would fix it (ISS-079).
   */
  const waterDays = daysUntilEmpty(run.stores.water, calm.net.water);
  const hasMiner = countOf(modules, 'ice-miner') > 0;

  const waterWhy = ((): string => {
    /* Flat batteries slow life support, and life support is what recycles the
       water. Blame the power, not the greenhouse: a greenhouse on a lander that
       cannot carry it through the night is a power problem first. */
    if (calm.blackout > POWER_BLACKOUT_FLOOR) {
      return 'The batteries run flat, so life support stops recycling water. Add a battery bank.';
    }

    if (systems.hasGreenhouse && !hasMiner) {
      return `A greenhouse still loses some water each sol. An ice miner would refill the tank.`;
    }

    if (Number.isFinite(waterDays)) return `Water runs out in about ${waterDays} sols.`;

    return `The tank is below ${LIFE_STORE_FLOOR}% and nothing fills it.`;
  })();

  return [
    {
      id: 'dust-storm',
      title: 'Dust Storm',
      ok: true,
      why: '',
    },
    {
      id: 'life-support',
      title: 'Life Support',
      ok: waterAtEnd >= LIFE_STORE_FLOOR,
      why: waterWhy,
    },
    {
      id: 'radiation',
      title: 'Radiation',
      ok: shieldAtEnd >= SHIELDING_FLOOR,
      why: `Need ${SHIELDING_FLOOR} shielding, have ${Math.round(shieldAtEnd)}`,
    },
    {
      id: 'power',
      title: 'Power',
      ok: powerOk,
      why: 'Batteries too small for a night',
    },
    {
      id: 'food',
      title: 'Food',
      ok: systems.hasGreenhouse,
      why: 'No greenhouse',
    },
  ];
}

/** Add a module if allowed; otherwise return the list unchanged. */
export function addModule(extras: readonly ModuleKind[], kind: ModuleKind, regionId: string): readonly ModuleKind[] {
  return canPlace(kind, extras, regionId).ok ? [...extras, kind] : extras;
}

/** Remove one module of this kind, if there is one. Core modules are not in `extras`. */
export function removeModule(extras: readonly ModuleKind[], kind: ModuleKind): readonly ModuleKind[] {
  const index = extras.lastIndexOf(kind);

  if (index < 0) return extras;

  return [...extras.slice(0, index), ...extras.slice(index + 1)];
}

export interface Upkeep {
  /** Constant draw of everything built, in kW. */
  readonly powerDraw: number;
  /** kWh the panels make on a clear day. */
  readonly dayGeneration: number;
  /** kWh the outpost needs per sol, day and night. */
  readonly dailyDemand: number;
  /** kWh needed to get through the night. */
  readonly nightNeed: number;
  readonly batteryKwh: number;
  /** Hours of night the batteries can cover on their own, out of 12. */
  readonly nightHoursCovered: number;
}

/** Total power draw and storage for a set of extras at a site. */
export function upkeepFor(extras: readonly ModuleKind[], regionId: string): Upkeep {
  const systems = systemsFor(allModules(extras), regionId);
  const net = systems.loadKw - systems.nuclearKw;
  const nightNeed = Math.max(0, net) * NIGHT_HOURS;

  return {
    powerDraw: Math.round(systems.loadKw * 10) / 10,
    dayGeneration: Math.round(systems.solarKw * systems.sunFactor * SUN_HOURS),
    dailyDemand: Math.round(systems.loadKw * (SUN_HOURS + NIGHT_HOURS)),
    nightNeed: Math.round(nightNeed),
    batteryKwh: systems.batteryKwh,
    nightHoursCovered: net <= 0 ? NIGHT_HOURS : Math.min(NIGHT_HOURS, Math.round((systems.batteryKwh / net) * 10) / 10),
  };
}

/** Sols a store lasts at a steady change, or Infinity when it is holding or rising. */
function daysUntilEmpty(store: number, change: number): number {
  return change < 0 ? Math.floor(store / -change) : Number.POSITIVE_INFINITY;
}

/** The four numbers the resource cards show on the build screen. */
export interface PreviewSummary {
  /** Hours of night the batteries cover, out of 12. */
  readonly nightHours: number;
  /** Sols until food runs out; Infinity when a greenhouse keeps up. */
  readonly foodDays: number;
  /** Sols until water runs out; Infinity when something refills it. */
  readonly waterDays: number;
  /** Shielding the build starts with, out of 100. */
  readonly shielding: number;
  /**
   * kWh the panels make on a clear day.
   *
   * This is the number that moves when the player adds a solar array, which
   * is why it is on the screen: before, nothing on the build screen changed
   * when the most obvious module was added.
   */
  readonly dayKwh: number;
}

/**
 * The headline figures for a build, from the same calm sol the preview runs.
 *
 * The resource cards at the top of the screen need one number each, and they
 * must agree with the sentences underneath, so both come from one projection.
 */
export function previewSummary(extras: readonly ModuleKind[], regionId: string): PreviewSummary {
  const run = startOutpost(newRun(regionId, ''), allModules(extras));
  const calm = projectSol(run);

  return {
    nightHours: upkeepFor(extras, regionId).nightHoursCovered,
    foodDays: daysUntilEmpty(run.stores.food, calm.net.food),
    waterDays: daysUntilEmpty(run.stores.water, calm.net.water),
    shielding: Math.round(run.stores.shielding),
    dayKwh: upkeepFor(extras, regionId).dayGeneration,
  };
}

/** A line of the preview: what a calm sol will do. */
export interface PreviewLine {
  readonly label: string;
  readonly text: string;
  readonly tone: 'ok' | 'warn' | 'bad';
}

/**
 * What would happen on a calm sol with this build, in sentences.
 *
 * Uses the real sol step rather than a separate estimate, so the preview cannot
 * disagree with what the player is about to live through.
 */
export function previewFor(extras: readonly ModuleKind[], regionId: string): readonly PreviewLine[] {
  const run = startOutpost(newRun(regionId, ''), allModules(extras));
  const calm = projectSol(run);
  const lines: PreviewLine[] = [];
  const upkeep = upkeepFor(extras, regionId);

  if (calm.blackout > 0 || upkeep.dayGeneration < upkeep.dailyDemand) {
    lines.push({
      label: 'Power',
      text: `Panels make ${upkeep.dayGeneration} kWh. The outpost needs ${upkeep.dailyDemand}. It will run flat.`,
      tone: 'bad',
    });
  } else if (upkeep.nightHoursCovered < NIGHT_HOURS) {
    lines.push({
      label: 'Power',
      text: `The batteries cover ${upkeep.nightHoursCovered} of 12 night hours. Add storage or a power source for the dark.`,
      tone: 'warn',
    });
  } else {
    lines.push({ label: 'Power', text: 'The panels and batteries carry you through a whole night.', tone: 'ok' });
  }

  const foodDays = daysUntilEmpty(run.stores.food, calm.net.food);
  const waterDays = daysUntilEmpty(run.stores.water, calm.net.water);

  lines.push(
    foodDays === Number.POSITIVE_INFINITY
      ? { label: 'Food', text: 'You grow as much as the crew eats.', tone: 'ok' }
      : { label: 'Food', text: `Food runs out in about ${foodDays} sols. Only a greenhouse makes more.`, tone: foodDays < 12 ? 'bad' : 'warn' },
  );

  lines.push(
    waterDays === Number.POSITIVE_INFINITY
      ? { label: 'Water', text: 'Water is topped up as fast as it is used.', tone: 'ok' }
      : { label: 'Water', text: `Water runs out in about ${waterDays} sols. Nothing brings more.`, tone: waterDays < 12 ? 'warn' : 'ok' },
  );

  lines.push({
    label: 'Shielding',
    text: `Starts at ${Math.round(run.stores.shielding)} of 100 and wears down a little every sol.`,
    tone: run.stores.shielding < 40 ? 'warn' : 'ok',
  });

  return lines;
}

/**
 * The three dials of the power economy, with one line each.
 *
 * Make, Store and Use. The build screen used to show a day-power number and
 * a night-hours number and nothing else, so the question a child actually
 * has — "why does my power keep running out?" — had no answer on it. Each
 * dial is a thing the player can change: a solar array makes more, a battery
 * bank stores more, and every module that draws power uses more.
 */
export function powerDials(extras: readonly ModuleKind[], regionId: string): readonly PreviewLine[] {
  const modules = allModules(extras);
  const systems = systemsFor(modules, regionId);
  const upkeep = upkeepFor(extras, regionId);

  /* What draws the power, named. The greenhouse and the ice miner are the
     ones a player adds, so they are the ones worth naming. */
  const draws: string[] = [];

  for (const kind of modules) {
    if (LOAD_KW[kind] > 0) draws.push(`${SHORT_MODULE_NAME[kind]} ${LOAD_KW[kind]} kW`);
  }

  if (systems.heatingKw > 0) draws.push(`heating ${systems.heatingKw} kW`);

  const demand = Math.round(systems.loadKw * (SUN_HOURS + NIGHT_HOURS));
  const solar = Math.round(systems.solarKw * systems.sunFactor * SUN_HOURS);
  const reactor = Math.round(systems.nuclearKw * (SUN_HOURS + NIGHT_HOURS));
  const spare = Math.round(solar + reactor - demand);

  return [
    {
      label: 'Make',
      text:
        `The panels make ${solar} kWh a day${reactor > 0 ? ` and the reactor ${reactor}` : ''}. ` +
        `The outpost needs ${demand}. That is ${Math.abs(spare)} kWh ${spare < 0 ? 'short' : 'spare'} every sol.`,
      tone: spare < 0 ? 'bad' : 'ok',
    },
    {
      label: 'Store',
      text:
        `The batteries hold ${upkeep.batteryKwh} kWh, which covers ${upkeep.nightHoursCovered} of the 12 night hours. ` +
        (upkeep.nightHoursCovered < NIGHT_HOURS
          ? 'Another bank would carry you further into the dark.'
          : 'That is enough for a whole night.'),
      tone: upkeep.nightHoursCovered < NIGHT_HOURS ? 'warn' : 'ok',
    },
    {
      label: 'Use',
      text: `The outpost draws ${upkeep.powerDraw} kW, day and night: ${draws.join(', ')}.`,
      tone: 'ok',
    },
  ];
}

/**
 * What a new solar array would do, in one line, for the build card.
 *
 * The player reported that a second array "did nothing", and the reason was
 * that the sunlight had nowhere to go: the outpost was already making more
 * power than it could use, and the batteries were full. Saying so turns a
 * purchase that looks broken into a lesson about what power is for.
 *
 * Empty when another array would be used in full — there is nothing to warn
 * about, and a warning on every card is a warning nobody reads.
 */
export function arrayNote(extras: readonly ModuleKind[], regionId: string): string {
  const systems = systemsFor(allModules(extras), regionId);
  const one = SOLAR_KW_PER_ARRAY * systems.sunFactor * SUN_HOURS;
  const made = systems.solarKw * systems.sunFactor * SUN_HOURS;
  const dayNeed = systems.loadKw * SUN_HOURS;
  const nightNeed = Math.max(0, systems.loadKw - systems.nuclearKw) * NIGHT_HOURS;

  /* What the outpost can put to work in a sol: the day's draw, and the night
     the batteries have room to keep. */
  const useful = dayNeed + Math.min(nightNeed, systems.batteryKwh);

  if (made + one <= useful) return '';

  const gain = Math.min(one, Math.max(0, useful - made));

  if (gain > 0) {
    return `Another array makes ${Math.round(one)} kWh. The outpost is ${Math.round(gain)} kWh short every sol.`;
  }

  return `Another array makes ${Math.round(one)} kWh, and the outpost can only use ${Math.round(useful)} kWh a day. The extra would spill.`;
}

/**
 * What the crew can already see coming at landing, for the "read ahead" warning
 * the README asks for. Flares and distant storms are not on it: they give little
 * warning, which is exactly why the outpost needs a reserve.
 */
export function upcomingWarnings(forecast: readonly ForecastEvent[]): readonly ForecastEvent[] {
  return visibleForecast(forecast, 0);
}

/** The extras a build has, grouped for the placed-modules display. */
export function groupedExtras(extras: readonly ModuleKind[]): readonly { readonly kind: ModuleKind; readonly count: number }[] {
  const kinds = [...new Set(extrasOf(allModules(extras)))];

  return kinds.map((kind) => ({ kind, count: countOf(extras, kind) }));
}
