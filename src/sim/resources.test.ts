import { describe, expect, it } from 'vitest';

import {
  clampStores,
  createInitialStores,
  depletedStores,
  drainForSol,
  percentOf,
  RESOURCE_NAMES,
  STORE_CAPACITY,
} from './resources';

describe('resources', () => {
  it('lists the five stores the README names, in a stable order', () => {
    expect(RESOURCE_NAMES).toEqual(['power', 'oxygen', 'water', 'food', 'shielding']);
  });

  it('starts with the README\u2019s opening amounts and lets a caller override one', () => {
    expect(createInitialStores()).toEqual({ power: 40, oxygen: 100, water: 90, food: 80, shielding: 20 });
    expect(createInitialStores({ food: 5 }).food).toBe(5);
  });

  it('applies a net change without mutating its argument', () => {
    const before = createInitialStores();
    const after = drainForSol(before, { water: -10, food: -5 }, 100);

    expect(after.water).toBe(80);
    expect(after.food).toBe(75);
    expect(before.water).toBe(90);
  });

  it('never lets a store go below empty or above its tank', () => {
    const stores = { power: 10, oxygen: 98, water: 3, food: 50, shielding: 50 };
    const after = drainForSol(stores, { power: 500, oxygen: 20, water: -20 }, 120);

    expect(after.power).toBe(120);
    expect(after.oxygen).toBe(STORE_CAPACITY);
    expect(after.water).toBe(0);
  });

  it('clamps power to the batteries that were actually built', () => {
    expect(clampStores(createInitialStores({ power: 300 }), 100).power).toBe(100);
  });

  it('reports stores at or below zero, in canonical order', () => {
    expect(depletedStores({ power: 0, oxygen: 5, water: 0, food: 1, shielding: 0 })).toEqual([
      'power',
      'water',
      'shielding',
    ]);
    expect(depletedStores(createInitialStores())).toEqual([]);
  });

  it('turns a store into a whole percentage, using battery size for power', () => {
    const stores = createInitialStores({ power: 50, oxygen: 33.4 });

    expect(percentOf('power', stores, 200)).toBe(25);
    expect(percentOf('oxygen', stores, 200)).toBe(33);
    expect(percentOf('power', stores, 0)).toBe(100);
  });
});
