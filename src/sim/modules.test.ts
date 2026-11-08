import { describe, expect, it } from 'vitest';

import {
  adjustedBuildCost,
  buildCost,
  canBuild,
  buildPreview,
  extraBatteryCount,
  MODULE_CATALOGUE,
  solarArrayCount,
  STARTING_MODULES,
  upkeepFor,
  type ModuleKind,
} from './modules';

describe('MODULE_CATALOGUE', () => {
  it('contains all nine module kinds', () => {
    const kinds = new Set(MODULE_CATALOGUE.map((m) => m.kind));
    expect(kinds.size).toBe(9);
    for (const kind of [
      'habitat',
      'life-support',
      'solar-array',
      'batteries',
      'greenhouse',
      'water-extractor',
      'radiation-shelter',
      'extra-solar-array',
      'extra-batteries',
    ] as const) {
      expect(kinds.has(kind)).toBe(true);
    }
  });

  it('every entry has a name, provides and requires', () => {
    for (const spec of MODULE_CATALOGUE) {
      expect(typeof spec.name).toBe('string');
      expect(spec.name.length).toBeGreaterThan(0);
      expect(Array.isArray(spec.provides)).toBe(true);
      expect(Array.isArray(spec.requires)).toBe(true);
    }
  });

  it('starting modules have zero cost and cap 1', () => {
    for (const kind of STARTING_MODULES) {
      const spec = MODULE_CATALOGUE.find((m) => m.kind === kind);
      expect(spec).toBeDefined();
      expect(spec!.startsBuilt).toBe(true);
      expect(spec!.buildCost).toBe(0);
      expect(spec!.cap).toBe(1);
    }
  });

  it('buildable modules have positive cost and cap 3', () => {
    const buildable = MODULE_CATALOGUE.filter((m) => !m.startsBuilt);
    expect(buildable.length).toBe(5);
    for (const spec of buildable) {
      expect(spec.buildCost).toBeGreaterThan(0);
      expect(spec.cap).toBe(3);
    }
  });
});

describe('adjustedBuildCost', () => {
  it('uses the base cost on neutral terrain', () => {
    expect(adjustedBuildCost('greenhouse', 3)).toBe(20);
    expect(adjustedBuildCost('extra-batteries', 3)).toBe(10);
  });

  it('is cheaper on good terrain', () => {
    expect(adjustedBuildCost('greenhouse', 5)).toBe(16);
    expect(adjustedBuildCost('extra-batteries', 5)).toBe(8);
  });

  it('is dearer on poor terrain', () => {
    expect(adjustedBuildCost('greenhouse', 2)).toBe(22);
    expect(adjustedBuildCost('extra-batteries', 2)).toBe(11);
  });

  it('never charges less than a whole unit', () => {
    for (const kind of MODULE_CATALOGUE) {
      for (const terrain of [2, 3, 4, 5]) {
        expect(Number.isInteger(adjustedBuildCost(kind.kind, terrain))).toBe(true);
      }
    }
  });
});

describe('buildCost', () => {
  it('returns zero for starting modules', () => {
    expect(buildCost('habitat')).toBe(0);
    expect(buildCost('life-support')).toBe(0);
    expect(buildCost('solar-array')).toBe(0);
    expect(buildCost('batteries')).toBe(0);
  });

  it('returns positive cost for buildable modules', () => {
    expect(buildCost('greenhouse')).toBe(20);
    expect(buildCost('water-extractor')).toBe(20);
    expect(buildCost('radiation-shelter')).toBe(15);
    expect(buildCost('extra-solar-array')).toBe(15);
    expect(buildCost('extra-batteries')).toBe(10);
  });
});

describe('upkeepFor', () => {
  it('returns zero draw and zero arrays for empty modules', () => {
    expect(upkeepFor([])).toEqual({ powerDraw: 0, solarArrays: 0 });
  });

  it('sums power draw across modules', () => {
    // habitat 2 + life-support 3 = 5
    expect(upkeepFor(['habitat', 'life-support']).powerDraw).toBe(5);
  });

  it('counts solar arrays including extra', () => {
    expect(upkeepFor(['solar-array']).solarArrays).toBe(1);
    expect(upkeepFor(['solar-array', 'extra-solar-array']).solarArrays).toBe(2);
    expect(upkeepFor(['greenhouse']).solarArrays).toBe(0);
  });

  it('greenhouse and extractor add draw, shelter does not', () => {
    expect(upkeepFor(['greenhouse']).powerDraw).toBe(3);
    expect(upkeepFor(['water-extractor']).powerDraw).toBe(3);
    expect(upkeepFor(['radiation-shelter']).powerDraw).toBe(0);
  });
});

describe('solarArrayCount / extraBatteryCount', () => {
  it('counts solar arrays', () => {
    expect(solarArrayCount([])).toBe(0);
    expect(solarArrayCount(['solar-array'])).toBe(1);
    expect(solarArrayCount(['extra-solar-array'])).toBe(1);
    expect(solarArrayCount(['solar-array', 'extra-solar-array'])).toBe(2);
  });

  it('counts extra batteries only', () => {
    expect(extraBatteryCount([])).toBe(0);
    expect(extraBatteryCount(['batteries'])).toBe(0);
    expect(extraBatteryCount(['extra-batteries'])).toBe(1);
    expect(extraBatteryCount(['extra-batteries', 'extra-batteries'])).toBe(2);
  });
});

describe('canBuild', () => {
  const stores = { power: 100, oxygen: 100, water: 100, food: 100, shielding: 100 };

  it('allows a starting module at zero cost', () => {
    expect(canBuild('habitat', [], stores)).toBe(true);
  });

  it('allows a buildable module when affordable and under cap', () => {
    expect(canBuild('greenhouse', [], stores)).toBe(true);
  });

  it('refuses when at cap', () => {
    expect(canBuild('habitat', ['habitat'], stores)).toBe(false);
    expect(canBuild('batteries', ['batteries'], stores)).toBe(false);
  });

  it('refuses when not affordable', () => {
    const broke = { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 };
    expect(canBuild('greenhouse', [], broke)).toBe(false);
    expect(canBuild('extra-batteries', [], broke)).toBe(false); // cost 10 > 0
  });

  it('refuses an unknown kind', () => {
    expect(canBuild('not-a-module' as ModuleKind, [], stores)).toBe(false);
  });
});

describe('buildPreview', () => {
  const stores = { power: 100, oxygen: 100, water: 100, food: 100, shielding: 100 };

  it('returns null for an unknown kind', () => {
    expect(buildPreview('not-a-module' as ModuleKind, [], stores)).toBeNull();
  });

  it('reports affordable and under cap', () => {
    const preview = buildPreview('greenhouse', [], stores)!;
    expect(preview.kind).toBe('greenhouse');
    expect(preview.buildCost).toBe(20);
    expect(preview.affordable).toBe(true);
    expect(preview.underCap).toBe(true);
    expect(preview.provides).toContain('Food');
  });

  it('reports not affordable when broke', () => {
    const broke = { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 };
    const preview = buildPreview('greenhouse', [], broke)!;
    expect(preview.affordable).toBe(false);
  });

  it('reports over cap', () => {
    const preview = buildPreview('habitat', ['habitat'], stores)!;
    expect(preview.underCap).toBe(false);
  });
});
