import { describe, expect, it } from 'vitest';

import { newRun, landAt, withState, applyBuild } from './run';
import { REGIONS } from './regions';
import { STARTING_MODULES } from './modules';

describe('newRun', () => {
  it('starts at sol 0, active, with starting modules and an empty ledger', () => {
    const run = newRun('jezero', 'Riley');
    expect(run.sol).toBe(0);
    expect(run.status).toBe('active');
    expect(run.regionId).toBe('jezero');
    expect(run.astronautName).toBe('Riley');
    expect(run.modules).toEqual(['habitat', 'life-support', 'solar-array', 'batteries']);
    expect(run.ledger).toEqual([]);
  });

  it('defaults the astronaut name to empty', () => {
    expect(newRun('jezero').astronautName).toBe('');
  });

  it('adjusts starting water by the region water score', () => {
    // Jezero water 4 -> 90 + (4-3)*5 = 95
    expect(newRun('jezero').stores.water).toBe(95);
    // Olympus water 2 -> 90 + (2-3)*5 = 85
    expect(newRun('olympus').stores.water).toBe(85);
    // Arcadia water 5 -> 90 + (5-3)*5 = 100
    expect(newRun('arcadia').stores.water).toBe(100);
  });

  it('keeps the other starting stores at the baseline', () => {
    const run = newRun('jezero');
    expect(run.stores.power).toBe(50);
    expect(run.stores.oxygen).toBe(100);
    expect(run.stores.food).toBe(80);
    expect(run.stores.shielding).toBe(20);
  });

  it('falls back to neutral scores for an unknown region', () => {
    const run = newRun('unknown');
    expect(run.stores.water).toBe(90);
  });
});

describe('landAt', () => {
  it('sets the region and region-adjusted stores', () => {
    const base = newRun('jezero', 'Riley');
    const landed = landAt(base, 'arcadia');
    expect(landed.regionId).toBe('arcadia');
    expect(landed.stores.water).toBe(100); // water 5
  });

  it('resets sol, status, modules and ledger', () => {
    const advanced = {
      ...newRun('jezero', 'Riley'),
      sol: 7,
      status: 'lost' as const,
      modules: ['habitat', 'life-support', 'solar-array', 'batteries', 'greenhouse'] as const,
      ledger: [
        {
          sol: 1,
          stores: { power: 40, oxygen: 100, water: 90, food: 80, shielding: 20 },
          changes: [],
        },
      ],
    };
    const landed = landAt(advanced, 'olympus');
    expect(landed.sol).toBe(0);
    expect(landed.status).toBe('active');
    expect(landed.modules).toEqual(['habitat', 'life-support', 'solar-array', 'batteries']);
    expect(landed.ledger).toEqual([]);
  });

  it('preserves the astronaut name', () => {
    const base = newRun('jezero', 'Riley');
    expect(landAt(base, 'arcadia').astronautName).toBe('Riley');
  });

  it('does not mutate the input run', () => {
    const base = newRun('jezero', 'Riley');
    const before = { ...base };
    landAt(base, 'arcadia');
    expect(base).toEqual(before);
  });

  it('covers every region', () => {
    for (const region of REGIONS) {
      const landed = landAt(newRun('jezero'), region.id);
      expect(landed.regionId).toBe(region.id);
      // Water score 2-5 -> 85-100
      expect(landed.stores.water).toBeGreaterThanOrEqual(85);
      expect(landed.stores.water).toBeLessThanOrEqual(100);
    }
  });
});

describe('withState', () => {
  it('returns new state with the change applied', () => {
    const run = newRun('jezero', 'Riley');
    const next = withState(run, { sol: 3 });
    expect(next.sol).toBe(3);
    expect(next.regionId).toBe('jezero');
  });

  it('does not mutate the input', () => {
    const run = newRun('jezero', 'Riley');
    withState(run, { sol: 3 });
    expect(run.sol).toBe(0);
  });

  it('can replace the whole stores object', () => {
    const run = newRun('jezero');
    const next = withState(run, {
      stores: { power: 1, oxygen: 2, water: 3, food: 4, shielding: 5 },
    });
    expect(next.stores).toEqual({ power: 1, oxygen: 2, water: 3, food: 4, shielding: 5 });
  });
});

describe('applyBuild', () => {
  it('adds the module and pays the terrain-adjusted cost', () => {
    // Jezero terrain 3 -> greenhouse costs 20
    const run = newRun('jezero');
    const built = applyBuild(run, 'greenhouse')!;
    expect(built.modules).toContain('greenhouse');
    expect(built.stores.power).toBe(30); // 50 - 20
  });

  it('charges extra batteries on build', () => {
    const run = newRun('jezero');
    const built = applyBuild(run, 'extra-batteries')!;
    // Cost 10, charge 10 -> net zero
    expect(built.stores.power).toBe(50);
    expect(built.modules).toContain('extra-batteries');
  });

  it('uses the region terrain multiplier', () => {
    // Arcadia terrain 5 -> greenhouse costs 16
    const arcadia = applyBuild(newRun('arcadia'), 'greenhouse')!;
    expect(arcadia.stores.power).toBe(34);
    // Olympus terrain 2 -> greenhouse costs 22
    const olympus = applyBuild(newRun('olympus'), 'greenhouse')!;
    expect(olympus.stores.power).toBe(28);
  });

  it('returns null when unaffordable', () => {
    const broke = {
      ...newRun('jezero'),
      stores: { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
    };
    expect(applyBuild(broke, 'greenhouse')).toBeNull();
  });

  it('returns null at the build cap', () => {
    const run = {
      ...newRun('jezero'),
      modules: [...STARTING_MODULES, 'greenhouse', 'greenhouse', 'greenhouse'] as const,
    };
    expect(applyBuild(run, 'greenhouse')).toBeNull();
  });

  it('does not mutate the input run', () => {
    const run = newRun('jezero');
    const before = { ...run.stores };
    applyBuild(run, 'greenhouse');
    expect(run.stores).toEqual(before);
    expect(run.modules).toEqual(STARTING_MODULES);
  });
});
