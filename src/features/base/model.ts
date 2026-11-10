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
  MODULE_CATALOGUE,
  NIGHT_HOURS,
  SUN_HOURS,
  countOf,
  extraModuleCount,
  extraSlots,
  extrasOf,
  pointsSpent,
  specOf,
  systemsFor,
  type ModuleKind,
  type ModuleSpec,
} from '../../sim/modules';
import { visibleForecast, type ForecastEvent } from '../../sim/forecast';
import { newRun, startOutpost } from '../../sim/run';
import { projectSol } from '../../sim/sol';
import { siteScore } from '../../sim/regions';

export { BUILD_BUDGET, CORE_MODULES, MODULE_CATALOGUE, extraSlots, pointsSpent, specOf };
export type { ModuleKind, ModuleSpec };

/** Reminder shown beside the launch button: building nothing extra is allowed, and teaches something. */
export const BUDGET_NONE = 'You can land with nothing extra. It is allowed, and you will see why it is hard.';

/** Modules a player can add, in catalogue order: everything that is not a core module. */
export const BUILDABLE: readonly ModuleSpec[] = MODULE_CATALOGUE.filter((spec) => spec.cost > 0);

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
 * (ice, ground), then room, then the budget. The reason names the one that
 * actually stopped it.
 */
export function canPlace(kind: ModuleKind, extras: readonly ModuleKind[], regionId: string): Placement {
  const spec = specOf(kind);
  const score = siteScore(regionId);
  const modules = allModules(extras);

  if (spec.requires !== undefined && score[spec.requires.axis] < spec.requires.min) {
    return { ok: false, reason: spec.requires.why };
  }

  if (countOf(modules, kind) >= spec.maxCount) {
    return { ok: false, reason: `You already have the most ${spec.name} units allowed.` };
  }

  if (extraModuleCount(modules) >= extraSlots(regionId)) {
    return { ok: false, reason: 'There is no room left on this ground. Flatter sites have more room.' };
  }

  if (spec.cost > pointsLeft(extras)) {
    return { ok: false, reason: `Not enough build points. It costs ${spec.cost} and you have ${pointsLeft(extras)}.` };
  }

  return { ok: true, reason: '' };
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
      text: `The panels make ${upkeep.dayGeneration} kWh a day but the outpost needs ${upkeep.dailyDemand}. The batteries will run flat and life support will slow down.`,
      tone: 'bad',
    });
  } else if (upkeep.nightHoursCovered < NIGHT_HOURS) {
    lines.push({
      label: 'Power',
      text: `The batteries only cover ${upkeep.nightHoursCovered} of the 12 night hours. Add storage or a power source that works in the dark.`,
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
      : { label: 'Water', text: `Water runs out in about ${waterDays} sols unless something brings more.`, tone: waterDays < 12 ? 'warn' : 'ok' },
  );

  lines.push({
    label: 'Shielding',
    text: `Starts at ${Math.round(run.stores.shielding)} out of 100 and wears down a little every sol.`,
    tone: run.stores.shielding < 40 ? 'warn' : 'ok',
  });

  return lines;
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
