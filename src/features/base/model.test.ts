import { describe, expect, it } from 'vitest';

import { createForecast } from '../../sim/forecast';

import {
  addModule,
  allModules,
  canPlace,
  pointsLeft,
  previewFor,
  previewSummary,
  removeModule,
  upcomingWarnings,
  upkeepFor,
  BUILD_BUDGET,
  CORE_MODULES,
  specOf,
  type ModuleKind,
} from './model';

describe('base model', () => {
  it('lands with the four core modules and the whole budget free', () => {
    expect(allModules([])).toEqual(CORE_MODULES);
    expect(pointsLeft([])).toBe(BUILD_BUDGET);
  });

  it('spends build points as modules are added and gives them back on removal', () => {
    const one = addModule([], 'greenhouse', 'jezero');

    expect(pointsLeft(one)).toBe(BUILD_BUDGET - specOf('greenhouse').cost);
    expect(pointsLeft(removeModule(one, 'greenhouse'))).toBe(BUILD_BUDGET);
  });

  it('refuses an ice miner where there is no ice, and says why', () => {
    const check = canPlace('ice-miner', [], 'olympus');

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('ice');
    expect(canPlace('ice-miner', [], 'arcadia').ok).toBe(true);
  });

  it('refuses a regolith shield on ground that is too steep', () => {
    expect(canPlace('regolith-shield', [], 'valles').ok).toBe(true);
    expect(canPlace('regolith-shield', [], 'olympus').ok).toBe(true);
  });

  it('refuses a second greenhouse, and anything past the limit', () => {
    const one = addModule([], 'greenhouse', 'arcadia');

    expect(canPlace('greenhouse', one, 'arcadia').ok).toBe(false);
    expect(addModule(one, 'greenhouse', 'arcadia')).toEqual(one);
  });

  it('refuses what the budget cannot pay for', () => {
    let extras: readonly ModuleKind[] = [];

    extras = addModule(extras, 'nuclear-unit', 'arcadia');
    extras = addModule(extras, 'greenhouse', 'arcadia');
    extras = addModule(extras, 'ice-miner', 'arcadia');
    extras = addModule(extras, 'solar-array', 'arcadia');

    const check = canPlace('nuclear-unit', extras, 'arcadia');

    expect(check.ok).toBe(false);
    expect(pointsLeft(extras)).toBeLessThanOrEqual(BUILD_BUDGET);
  });

  it('runs out of room sooner on steep ground than on a plain', () => {
    const fill = (region: string): number => {
      let extras: readonly ModuleKind[] = [];

      for (const kind of ['solar-array', 'batteries', 'solar-array', 'batteries', 'solar-array', 'batteries'] as const) {
        extras = addModule(extras, kind, region);
      }

      return extras.length;
    };

    expect(fill('olympus')).toBeLessThan(fill('arcadia'));
  });

  it('shows that a bare outpost cannot cover a night, and an expanded one can', () => {
    const bare = upkeepFor([], 'jezero');
    const bigger = upkeepFor(['batteries', 'batteries', 'solar-array', 'solar-array'], 'jezero');

    expect(bare.nightHoursCovered).toBeLessThan(12);
    expect(bigger.nightHoursCovered).toBeGreaterThan(bare.nightHoursCovered);
    expect(bigger.dayGeneration).toBeGreaterThan(bare.dayGeneration);
  });

  it('counts a nuclear unit as covering the whole night by itself', () => {
    const upkeep = upkeepFor(['nuclear-unit', 'nuclear-unit' as ModuleKind], 'jezero');

    expect(upkeep.nightHoursCovered).toBeGreaterThan(upkeepFor([], 'jezero').nightHoursCovered);
  });

  it('warns about power and food on a bare outpost', () => {
    const lines = previewFor([], 'jezero');

    expect(lines.find((line) => line.label === 'Power')?.tone).toBe('bad');
    expect(lines.find((line) => line.label === 'Food')?.tone).toBe('bad');
  });

  it('is happy about food once there is a greenhouse', () => {
    const lines = previewFor(['solar-array', 'solar-array', 'batteries', 'batteries', 'greenhouse'], 'jezero');

    expect(lines.find((line) => line.label === 'Food')?.tone).toBe('ok');
  });

  it('shows nothing before the forecast has loaded', () => {
    expect(upcomingWarnings([])).toEqual([]);
  });

  it('never shows a flare at landing: flares give almost no warning', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const warnings = upcomingWarnings(createForecast([], seed));

      expect(warnings.some((event) => event.kind === 'flare')).toBe(false);
    }
  });

  it('summarises a build in the four numbers the resource cards show', () => {
    const bare = previewSummary([], 'jezero');
    const built = previewSummary(['solar-array', 'solar-array', 'batteries', 'batteries', 'greenhouse'], 'jezero');

    expect(bare.nightHours).toBe(upkeepFor([], 'jezero').nightHoursCovered);
    expect(bare.foodDays).toBeLessThan(20);
    expect(built.foodDays).toBe(Number.POSITIVE_INFINITY);
    expect(built.nightHours).toBeGreaterThanOrEqual(bare.nightHours);
    expect(built.shielding).toBeGreaterThan(0);
  });

  it('reports a steady water supply as Infinity rather than a made-up number of sols', () => {
    const summary = previewSummary(['ice-miner'], 'arcadia');

    expect(Number.isFinite(summary.waterDays)).toBe(false);
  });
});
