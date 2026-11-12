import { describe, expect, it } from 'vitest';

import {
  clampStores,
  createInitialStores,
  depletedStores,
  drainForSol,
  floorStreak,
  FLOOR_STRIKES,
  percentOf,
  RESOURCE_FLOOR,
  RESOURCE_NAMES,
  scrubbedStores,
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

/** A log that only carries what the floor rule reads. */
function logOf(...food: readonly number[]): readonly { readonly stores: ReturnType<typeof createInitialStores> }[] {
  return food.map((value) => ({ stores: createInitialStores({ food: value, shielding: 60 }) }));
}

describe('the floor rule', () => {
  it('counts consecutive sols under the line, and stops at the first one back above', () => {
    expect(floorStreak(logOf(50, 25, 20), 'food')).toBe(2);
    expect(floorStreak(logOf(50, 25, RESOURCE_FLOOR), 'food')).toBe(0);
    expect(floorStreak(logOf(20, 50, 20), 'food')).toBe(1);
  });

  it('treats a store at the line as safe, and a store at zero as both strikes at once', () => {
    expect(floorStreak(logOf(RESOURCE_FLOOR), 'food')).toBe(0);
    expect(floorStreak(logOf(80, 0), 'food')).toBe(FLOOR_STRIKES);
  });

  it('watches the four life stores and lets power alone', () => {
    expect(floorStreak(logOf(10, 10), 'power')).toBe(0);
  });

  it('names the stores that have been under the line for two sols, in canonical order', () => {
    const records = [
      { stores: createInitialStores({ oxygen: 25, water: 25, food: 60, shielding: 60 }) },
      { stores: createInitialStores({ oxygen: 20, water: 20, food: 55, shielding: 60 }) },
    ];

    expect(scrubbedStores(records)).toEqual(['oxygen', 'water']);
    expect(scrubbedStores(logOf(50, 25))).toEqual([]);
  });
});
