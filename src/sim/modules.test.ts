import { describe, expect, it } from 'vitest';

import {
  BATTERY_KWH_PER_BANK,
  BUILD_BUDGET,
  CORE_MODULES,
  extraModuleCount,
  extraSlots,
  MODULE_CATALOGUE,
  pointsSpent,
  SHIELDING_BASE,
  SHIELDING_PER_REGOLITH,
  SOLAR_KW_PER_ARRAY,
  specOf,
  systemsFor,
} from './modules';
import { REGIONS, SITE_AXES, siteScore } from './regions';

describe('sites', () => {
  it('has the five regions the README names', () => {
    expect(REGIONS.map((region) => region.name)).toEqual([
      'Arcadia Planitia',
      'Jezero Crater',
      'Olympus Mons',
      'Valles Marineris',
      'Argyre Basin',
    ]);
  });

  it('scores every region on every axis from 0 to 5, with no perfect site', () => {
    for (const region of REGIONS) {
      const score = siteScore(region.id);
      const values = SITE_AXES.map((axis) => score[axis]);

      expect(values.every((value) => Number.isInteger(value) && value >= 0 && value <= 5)).toBe(true);
      expect(values.some((value) => value <= 3)).toBe(true);
      expect(values.every((value) => value === 5)).toBe(false);
    }
  });

  it('gives an unknown region the neutral score instead of throwing', () => {
    expect(siteScore('')).toEqual({ water: 3, sun: 3, terrain: 3, dust: 3, temp: 3 });
  });
});

describe('modules', () => {
  it('starts every outpost with habitat, life support, one array and one battery bank', () => {
    expect(CORE_MODULES).toEqual(['habitat', 'life-support', 'solar-array', 'batteries']);
  });

  it('charges nothing for the core modules the lander brings', () => {
    expect(specOf('habitat').cost).toBe(0);
    expect(specOf('life-support').cost).toBe(0);
  });

  it('cannot afford everything: the budget is smaller than the whole catalogue', () => {
    const everything = MODULE_CATALOGUE.reduce((sum, spec) => sum + spec.cost * spec.maxCount, 0);

    expect(BUILD_BUDGET).toBeLessThan(everything);
  });

  it('adds what a module gives and what it demands', () => {
    const core = systemsFor(CORE_MODULES, 'jezero');
    const bigger = systemsFor([...CORE_MODULES, 'solar-array', 'batteries', 'greenhouse'], 'jezero');

    expect(bigger.solarKw - core.solarKw).toBe(SOLAR_KW_PER_ARRAY);
    expect(bigger.batteryKwh - core.batteryKwh).toBe(BATTERY_KWH_PER_BANK);
    expect(bigger.foodGrown).toBeGreaterThan(core.foodGrown);
    expect(bigger.loadKw).toBeGreaterThan(core.loadKw);
  });

  it('grows no food without a greenhouse', () => {
    expect(systemsFor(CORE_MODULES, 'jezero').foodGrown).toBe(0);
    expect(systemsFor(CORE_MODULES, 'jezero').hasGreenhouse).toBe(false);
  });

  it('scales ice mining by how much ice the site has', () => {
    const miner = [...CORE_MODULES, 'ice-miner' as const];

    expect(systemsFor(miner, 'arcadia').iceWater).toBeGreaterThan(systemsFor(miner, 'olympus').iceWater);
    expect(systemsFor(CORE_MODULES, 'arcadia').iceWater).toBe(0);
  });

  it('makes a sunnier site yield more from the same panels, and a colder one need more heating', () => {
    expect(systemsFor(CORE_MODULES, 'olympus').sunFactor).toBeGreaterThan(systemsFor(CORE_MODULES, 'argyre').sunFactor);
    expect(systemsFor(CORE_MODULES, 'arcadia').heatingKw).toBeGreaterThan(systemsFor(CORE_MODULES, 'argyre').heatingKw);
  });

  it('adds shielding for each regolith shield on top of the base', () => {
    expect(systemsFor(CORE_MODULES, 'jezero').shieldingStart).toBe(SHIELDING_BASE);
    expect(systemsFor([...CORE_MODULES, 'regolith-shield'], 'jezero').shieldingStart).toBe(
      SHIELDING_BASE + SHIELDING_PER_REGOLITH,
    );
  });

  it('counts only the build points of what was added, and only modules beyond the core', () => {
    const list = [...CORE_MODULES, 'greenhouse' as const, 'solar-array' as const];

    expect(pointsSpent(list)).toBe(specOf('greenhouse').cost + specOf('solar-array').cost);
    expect(extraModuleCount(list)).toBe(2);
    expect(extraModuleCount(CORE_MODULES)).toBe(0);
  });

  it('lets flat ground hold more modules than steep ground', () => {
    expect(extraSlots('arcadia')).toBeGreaterThan(extraSlots('olympus'));
  });

  it('throws on a module it has never heard of', () => {
    expect(() => specOf('warp-drive' as never)).toThrow(RangeError);
  });
});
