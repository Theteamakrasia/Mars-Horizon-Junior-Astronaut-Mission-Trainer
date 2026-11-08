import { describe, expect, it } from 'vitest';

import {
  createInitialStores,
  drainForSol,
  depletedStores,
  type ResourceStores,
} from './resources';

const FULL_STORES: ResourceStores = {
  power: 100,
  oxygen: 100,
  water: 100,
  food: 100,
  shielding: 100,
};

const REGION = { water: 3, sun: 3, terrain: 3, dust: 3, temp: 3 };

describe('createInitialStores', () => {
  it('returns the baseline stores', () => {
    expect(createInitialStores()).toEqual({
      power: 40,
      oxygen: 100,
      water: 90,
      food: 80,
      shielding: 20,
    });
  });

  it('applies overrides', () => {
    expect(createInitialStores({ power: 10 })).toEqual({
      power: 10,
      oxygen: 100,
      water: 90,
      food: 80,
      shielding: 20,
    });
  });

  it('never mutates the overrides argument', () => {
    const overrides = { power: 5 };
    createInitialStores(overrides);
    expect(overrides).toEqual({ power: 5 });
  });
});

describe('drainForSol', () => {
  it('never mutates its stores argument', () => {
    const before = { ...FULL_STORES };
    drainForSol(FULL_STORES, 1, 0, 0, [], REGION);
    expect(FULL_STORES).toEqual(before);
  });

  it('never mutates its modules argument', () => {
    const modules = ['habitat', 'life-support'];
    const before = [...modules];
    drainForSol(FULL_STORES, 1, 7, 1, modules, REGION);
    expect(modules).toEqual(before);
  });

  it('solar generation adds power', () => {
    const result = drainForSol(FULL_STORES, 1, 0, 1, [], { ...REGION, sun: 5 });
    // generation = 1 * 5 * 6 = 30
    expect(result.stores.power).toBe(100); // clamped at 100
    const genChange = result.changes.find(
      (c) => c.store === 'power' && c.cause === 'solar-generation',
    );
    expect(genChange?.delta).toBe(30);
  });

  it('module draw subtracts power', () => {
    const result = drainForSol(FULL_STORES, 1, 7, 0, [], REGION);
    // no generation, draw 7, night drain 7 (10 - 3 temp)
    expect(result.stores.power).toBe(86); // 100 - 7 - 7 = 86
    const drawChange = result.changes.find(
      (c) => c.store === 'power' && c.cause === 'module-draw',
    );
    expect(drawChange?.delta).toBe(-7);
  });

  it('night drain is higher when temp is low', () => {
    const cold = drainForSol(FULL_STORES, 1, 0, 0, [], { ...REGION, temp: 2 });
    const mild = drainForSol(FULL_STORES, 1, 0, 0, [], { ...REGION, temp: 5 });
    // cold: night drain 10-2=8, mild: 10-5=5
    expect(cold.stores.power).toBe(100 - 8);
    expect(mild.stores.power).toBe(100 - 5);
  });

  it('crew use reduces oxygen, water and food without modules', () => {
    const result = drainForSol(FULL_STORES, 1, 0, 0, [], REGION);
    expect(result.stores.oxygen).toBe(94); // 100 - 6
    expect(result.stores.water).toBe(94); // 100 - 6
    expect(result.stores.food).toBe(94); // 100 - 6
  });

  it('life support offsets oxygen and water use', () => {
    const result = drainForSol(FULL_STORES, 1, 0, 0, ['life-support'], REGION);
    // oxygen: 100 - 6 + 4 = 98
    expect(result.stores.oxygen).toBe(98);
    // water: 100 - 6 + 3 = 97
    expect(result.stores.water).toBe(97);
    // food unchanged: 94
    expect(result.stores.food).toBe(94);
  });

  it('greenhouse produces food and uses water', () => {
    const result = drainForSol(FULL_STORES, 1, 0, 0, ['greenhouse'], REGION);
    // food: 100 - 6 + 6 = 100 (clamped)
    expect(result.stores.food).toBe(100);
    // water: 100 - 6 - 3 = 91
    expect(result.stores.water).toBe(91);
  });

  it('water extractor produces water scaled by region water', () => {
    const dry = drainForSol(FULL_STORES, 1, 0, 0, ['water-extractor'], {
      ...REGION,
      water: 2,
    });
    // extractor: 2 * 4 = 8; water: 100 - 6 + 8 = 102 -> clamped 100
    expect(dry.stores.water).toBe(100);

    const rich = drainForSol(FULL_STORES, 1, 0, 0, ['water-extractor'], {
      ...REGION,
      water: 5,
    });
    // extractor: 5 * 4 = 20; water: 100 - 6 + 20 = 114 -> clamped 100
    expect(rich.stores.water).toBe(100);
  });

  it('power clamps at zero', () => {
    // No generation, high draw: 100 - 50 - 5 = 45 but we use huge draw
    const result = drainForSol(FULL_STORES, 1, 200, 0, [], REGION);
    expect(result.stores.power).toBe(0);
  });

  it('stores never go below zero or above 100', () => {
    const result = drainForSol(
      { power: 0, oxygen: 0, water: 0, food: 0, shielding: 0 },
      1,
      0,
      0,
      ['life-support', 'greenhouse', 'water-extractor'],
      { ...REGION, water: 5 },
    );
    for (const value of Object.values(result.stores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('records a change per store per cause', () => {
    const result = drainForSol(FULL_STORES, 1, 7, 1, ['life-support'], REGION);
    const causes = result.changes.map((c) => `${c.store}:${c.cause}`);
    expect(causes).toContain('power:solar-generation');
    expect(causes).toContain('power:module-draw');
    expect(causes).toContain('power:night-drain');
    expect(causes).toContain('oxygen:life-support');
    expect(causes).toContain('oxygen:crew');
    expect(causes).toContain('water:life-support');
    expect(causes).toContain('water:crew');
    expect(causes).toContain('food:crew');
  });
});

describe('depletedStores', () => {
  it('returns empty when no store is depleted', () => {
    expect(depletedStores(FULL_STORES)).toEqual([]);
  });

  it('returns stores at or below zero', () => {
    expect(
      depletedStores({ power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 }),
    ).toEqual(['power']);
    expect(
      depletedStores({ power: 100, oxygen: -5, water: 100, food: 100, shielding: 100 }),
    ).toEqual(['oxygen']);
    expect(
      depletedStores({ power: 0, oxygen: 0, water: 100, food: 100, shielding: 100 }),
    ).toEqual(['power', 'oxygen']);
  });

  it('returns all five when all are depleted', () => {
    expect(
      depletedStores({ power: 0, oxygen: 0, water: 0, food: 0, shielding: 0 }),
    ).toEqual(['power', 'oxygen', 'water', 'food', 'shielding']);
  });
});
