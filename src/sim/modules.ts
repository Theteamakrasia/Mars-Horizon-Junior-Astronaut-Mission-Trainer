/**
 * The outpost's modules and what a set of them adds up to.
 *
 * Every module improves one system and loads another — that coupling is the
 * game. All the tuning numbers are in this one file so the balance is visible
 * in one place and a test can pin it.
 *
 * Pure. The `base` screen decides which modules to build; this file turns that
 * list into the numbers the sol step runs on.
 */

import { siteScore } from './regions';

export type ModuleKind =
  | 'habitat'
  | 'life-support'
  | 'solar-array'
  | 'batteries'
  | 'greenhouse'
  | 'ice-miner'
  | 'regolith-shield'
  | 'nuclear-unit';

/** The four modules every outpost lands with. The first set from the README. */
export const CORE_MODULES: readonly ModuleKind[] = [
  'habitat',
  'life-support',
  'solar-array',
  'batteries',
];

/**
 * Build points the lander can carry beyond the core modules.
 *
 * Eighteen, not fourteen. The lander brings one solar array and one battery
 * bank, and a bare outpost needs 12 kW of life support plus heating: 144 kWh
 * for one night, against 100 kWh of battery. At fourteen points no legal build
 * at any landing site could keep the lights on, and the run was lost on
 * water. `tools/balance-check.mjs` is what proved it, and what keeps it true.
 */
export const BUILD_BUDGET = 18;

/** Crew who live at the outpost. */
export const CREW_SIZE = 4;

/** Hours of daylight and of night. A sol is about 12 and 12 for this game. */
export const SUN_HOURS = 12;
export const NIGHT_HOURS = 12;

/** Per-person daily needs, in tank percent. Simplified from NASA's life-support baselines. */
export const OXYGEN_PER_CREW = 3.5;
export const WATER_PER_CREW = 2;
export const FOOD_PER_CREW = 2.5;

/** Tuning, in one place. */
export const SOLAR_KW_PER_ARRAY = 25;
export const BATTERY_KWH_PER_BANK = 100;
export const NUCLEAR_KW = 10;
export const LOAD_KW: Readonly<Record<ModuleKind, number>> = {
  habitat: 4,
  'life-support': 8,
  'solar-array': 0,
  batteries: 0,
  greenhouse: 6,
  'ice-miner': 6,
  'regolith-shield': 0,
  'nuclear-unit': 0,
};
export const HEATING_KW_PER_COLD_POINT = 1;
export const OXYGEN_GENERATED = 14;
export const WATER_RECYCLING = 0.9;
export const ELECTROLYSIS_WATER = 3;
export const GREENHOUSE_FOOD = 12;
/**
 * Water a greenhouse drinks, as a percent of a tank, every sol.
 *
 * Three, not five. At five, a greenhouse without an ice miner drank the crew
 * dry before sol twelve and the run was lost on water at every site where the
 * ice was too far away to mine.
 */
export const GREENHOUSE_WATER = 3;
export const ICE_WATER_PER_WATER_POINT = 3;
/**
 * The shielding the outpost starts with, before any regolith is piled on.
 *
 * Thirty, not twenty. The radiation goal asks for forty, so a bare outpost is
 * one shield short of safe and one regolith module is what closes the gap.
 */
export const SHIELDING_BASE = 30;
export const SHIELDING_PER_REGOLITH = 30;
/**
 * How much shielding wears away every sol.
 *
 * Half a point, not a whole one. At one point a sol the shielding was gone
 * before the crew could stack any more soil on top of it.
 */
export const SHIELDING_EROSION = 0.5;

export interface ModuleSpec {
  readonly kind: ModuleKind;
  readonly name: string;
  readonly emoji: string;
  /** Build points. Core modules cost nothing: they come with the lander. */
  readonly cost: number;
  /** How many of this module can exist in total. */
  readonly maxCount: number;
  /** What it gives, in plain words. */
  readonly gives: string;
  /** What it asks of everything else, in plain words. */
  readonly needs: string;
  /** A site axis that must score at least `min` to build it here. */
  readonly requires?: { readonly axis: 'water' | 'terrain'; readonly min: number; readonly why: string };
}

export const MODULE_CATALOGUE: readonly ModuleSpec[] = [
  {
    kind: 'habitat',
    name: 'Habitat',
    emoji: '🏠',
    cost: 0,
    maxCount: 1,
    gives: 'Shelter for the crew',
    needs: `Heating and lights: ${LOAD_KW.habitat} kW, all day and night`,
  },
  {
    kind: 'life-support',
    name: 'Life Support',
    emoji: '🫁',
    cost: 0,
    maxCount: 1,
    gives: 'Makes oxygen and recycles 90% of the water',
    needs: `${LOAD_KW['life-support']} kW, and a little water to split into oxygen`,
  },
  {
    kind: 'solar-array',
    name: 'Solar Array',
    emoji: '☀️',
    cost: 2,
    maxCount: 4,
    gives: `${SOLAR_KW_PER_ARRAY} kW while the Sun is up. Nothing at night`,
    needs: 'Dust storms bury it. Sunlight depends on the site',
  },
  {
    kind: 'batteries',
    name: 'Battery Bank',
    emoji: '🔋',
    cost: 2,
    maxCount: 4,
    gives: `Stores ${BATTERY_KWH_PER_BANK} kWh to get through the night`,
    needs: 'Nothing to run, but it only helps if the panels fill it',
  },
  {
    kind: 'greenhouse',
    name: 'Greenhouse',
    emoji: '🌱',
    cost: 3,
    maxCount: 1,
    gives: 'Grows food, so you launch less from Earth',
    needs: `${LOAD_KW.greenhouse} kW and ${GREENHOUSE_WATER}% of your water every sol`,
  },
  {
    kind: 'ice-miner',
    name: 'Ice Miner',
    emoji: '⛏️',
    cost: 3,
    maxCount: 1,
    gives: 'Digs up ice and melts it: new water from the ground',
    needs: `${LOAD_KW['ice-miner']} kW. Only works where there is ice nearby`,
    requires: { axis: 'water', min: 3, why: 'There is not enough ice near this site to mine.' },
  },
  {
    kind: 'regolith-shield',
    name: 'Regolith Shield',
    emoji: '🛡️',
    cost: 2,
    maxCount: 2,
    gives: `Piles Martian soil over the habitat: +${SHIELDING_PER_REGOLITH} shielding`,
    needs: 'Needs ground firm enough to pile soil on',
    requires: { axis: 'terrain', min: 2, why: 'The ground here is too steep to pile soil on safely.' },
  },
  {
    kind: 'nuclear-unit',
    name: 'Nuclear Power Unit',
    emoji: '☢️',
    cost: 4,
    maxCount: 1,
    gives: `${NUCLEAR_KW} kW day and night, whatever the weather`,
    needs: 'Expensive to launch. Why real rovers use it',
  },
];

/** The spec for a module. Throws on an unknown kind: that is a programming error. */
export function specOf(kind: ModuleKind): ModuleSpec {
  const spec = MODULE_CATALOGUE.find((entry) => entry.kind === kind);

  if (spec === undefined) throw new RangeError(`Unknown module kind: ${kind}`);

  return spec;
}


/** What a set of modules adds up to at one site. Everything the sol step needs. */
export interface Systems {
  /** Peak solar output, before site sunlight, dust and panel damage. */
  readonly solarKw: number;
  /** 0-1: how much of the peak this site's sun delivers. */
  readonly sunFactor: number;
  readonly batteryKwh: number;
  readonly nuclearKw: number;
  /** Constant draw, day and night, in kW. */
  readonly loadKw: number;
  /** The part of the load that is the greenhouse, so it can be switched off. */
  readonly greenhouseLoadKw: number;
  readonly heatingKw: number;
  readonly oxygenGenerated: number;
  readonly waterRecycling: number;
  readonly electrolysisWater: number;
  readonly foodGrown: number;
  readonly greenhouseWater: number;
  readonly iceWater: number;
  readonly shieldingStart: number;
  readonly shieldingErosion: number;
  readonly hasGreenhouse: boolean;
}

/** How many of one kind are in a list. */
export function countOf(modules: readonly ModuleKind[], kind: ModuleKind): number {
  return modules.filter((entry) => entry === kind).length;
}

/**
 * Total the effect of every module at this site. Pure and deterministic.
 *
 * A module that is not in the list contributes nothing, so an outpost with no
 * greenhouse really does grow no food. That absence is the first decision.
 */
export function systemsFor(modules: readonly ModuleKind[], regionId: string): Systems {
  const score = siteScore(regionId);
  const count = (kind: ModuleKind): number => countOf(modules, kind);

  const loadKw = modules.reduce((sum, kind) => sum + LOAD_KW[kind], 0);
  const heatingKw = (5 - score.temp) * HEATING_KW_PER_COLD_POINT;
  const hasLifeSupport = count('life-support') > 0;
  const greenhouses = count('greenhouse');

  return {
    solarKw: count('solar-array') * SOLAR_KW_PER_ARRAY,
    sunFactor: 0.3 + 0.14 * score.sun,
    batteryKwh: count('batteries') * BATTERY_KWH_PER_BANK,
    nuclearKw: count('nuclear-unit') * NUCLEAR_KW,
    loadKw: loadKw + heatingKw,
    greenhouseLoadKw: greenhouses * LOAD_KW.greenhouse,
    heatingKw,
    oxygenGenerated: hasLifeSupport ? OXYGEN_GENERATED : 0,
    waterRecycling: hasLifeSupport ? WATER_RECYCLING : 0,
    electrolysisWater: hasLifeSupport ? ELECTROLYSIS_WATER : 0,
    foodGrown: greenhouses * GREENHOUSE_FOOD,
    greenhouseWater: greenhouses * GREENHOUSE_WATER,
    iceWater: count('ice-miner') * ICE_WATER_PER_WATER_POINT * score.water,
    shieldingStart: SHIELDING_BASE + count('regolith-shield') * SHIELDING_PER_REGOLITH,
    shieldingErosion: SHIELDING_EROSION,
    hasGreenhouse: greenhouses > 0,
  };
}

/** The modules beyond the four the lander brings: the ones the player chose. */
export function extrasOf(modules: readonly ModuleKind[]): readonly ModuleKind[] {
  const core = [...CORE_MODULES];
  const extras: ModuleKind[] = [];

  for (const kind of modules) {
    const index = core.indexOf(kind);

    if (index >= 0) core.splice(index, 1);
    else extras.push(kind);
  }

  return extras;
}

/** Build points spent on everything that is not a core module. */
export function pointsSpent(modules: readonly ModuleKind[]): number {
  return extrasOf(modules).reduce((sum, kind) => sum + specOf(kind).cost, 0);
}

/**
 * How many extra modules a site's terrain lets the crew build: flat ground, more room.
 *
 * Four, not three. The outpost that reaches all five science goals needs
 * seven extras — panels, batteries, a greenhouse, an ice miner, a shield and a
 * nuclear unit — and at three extras per point of terrain three of the five
 * landing sites had no room for it. The rule still holds: flat ground gives
 * more room.
 */
export function extraSlots(regionId: string): number {
  return siteScore(regionId).terrain + 4;
}

/** Modules beyond the four core ones. */
export function extraModuleCount(modules: readonly ModuleKind[]): number {
  return extrasOf(modules).length;
}
