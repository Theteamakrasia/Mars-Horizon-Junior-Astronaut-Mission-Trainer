import { describe, expect, it } from 'vitest';

import { advanceSol, isRunOver, type SolResult } from './sol';
import { newRun, type RunState } from './run';
import type { ModuleKind } from './modules';
import type { ResourceStores } from './resources';

const DEFAULT_MODULES: readonly ModuleKind[] = [
  'habitat',
  'life-support',
  'solar-array',
  'batteries',
];

/** Build a run for a given region, module set and optional stores. */
function makeRun(
  regionId: string = 'jezero',
  modules: readonly ModuleKind[] = DEFAULT_MODULES,
  stores?: ResourceStores,
): RunState {
  const run = newRun(regionId, 'Test Astronaut');
  return { ...run, modules: [...modules], stores: stores ?? run.stores };
}

/** Merge a sol result back into the run, as the screens do. */
function applyResult(run: RunState, result: SolResult): RunState {
  return {
    ...run,
    sol: result.ledger[result.ledger.length - 1].sol,
    stores: result.stores,
    status: result.status,
    ledger: result.ledger,
  };
}

/** Advance a run `n` sols, or until it ends. */
function advance(run: RunState, n: number): RunState {
  let current = run;
  for (let i = 0; i < n; i += 1) {
    if (current.status !== 'active') break;
    current = applyResult(current, advanceSol(current));
  }
  return current;
}

describe('advanceSol order of operations', () => {
  it('applies daytime generation, module draw, night drain and crew use on sol 1', () => {
    const run = makeRun('jezero');
    // Jezero water 4 -> starting water 90 + (4-3)*5 = 95
    expect(run.stores.water).toBe(95);

    const result = advanceSol(run);

    // generation: 1 array * 4 sun * 6 = 24
    // draw: habitat 2 + life-support 3 = 5
    // night drain: 10 - 3 temp = 7
    // power: 50 + 24 - 5 - 7 = 62
    expect(result.stores.power).toBe(62);
    // oxygen: 100 - 6 + 4 = 98
    expect(result.stores.oxygen).toBe(98);
    // water: 95 - 6 + 3 = 92
    expect(result.stores.water).toBe(92);
    // food: 80 - 6 = 74
    expect(result.stores.food).toBe(74);
    expect(result.events.length).toBe(0);
    expect(result.status).toBe('active');
  });

  it('never mutates the input run', () => {
    const run = makeRun();
    const before = { ...run.stores };
    advanceSol(run);
    expect(run.stores).toEqual(before);
    expect(run.modules).toEqual(DEFAULT_MODULES);
  });
});

describe('ledger', () => {
  it('records one entry per sol with store values and changes', () => {
    const run = makeRun();
    const result = advanceSol(run);

    expect(result.ledger).toHaveLength(1);
    const entry = result.ledger[0];
    expect(entry.sol).toBe(1);
    expect(entry.stores.power).toBe(62);
    expect(Array.isArray(entry.changes)).toBe(true);
    expect(entry.changes.length).toBeGreaterThan(0);

    for (const change of entry.changes) {
      expect(typeof change.store).toBe('string');
      expect(typeof change.cause).toBe('string');
      expect(typeof change.delta).toBe('number');
    }
  });

  it('accumulates ledger entries across sols', () => {
    const run = advance(makeRun(), 2);
    expect(run.ledger).toHaveLength(2);
    expect(run.ledger[0].sol).toBe(1);
    expect(run.ledger[1].sol).toBe(2);
  });

  it('records storm damage in the ledger', () => {
    const run = advance(makeRun(), 5);
    const stormEntry = run.ledger[run.ledger.length - 1];
    const stormChanges = stormEntry.changes.filter((c) => c.cause === 'storm');

    expect(stormEntry.sol).toBe(5);
    expect(stormChanges.length).toBeGreaterThan(0);
    // No shelter -> 8 shielding damage.
    const shieldingChange = stormChanges.find((c) => c.store === 'shielding');
    expect(shieldingChange?.delta).toBe(-8);
  });

  it('records supply pod restoration', () => {
    const run = advance(makeRun(), 10);
    const podEntry = run.ledger[run.ledger.length - 1];
    const podChanges = podEntry.changes.filter((c) => c.cause === 'supply-pod');

    expect(podEntry.sol).toBe(10);
    expect(podChanges.some((c) => c.store === 'water' && c.delta > 0)).toBe(true);
    expect(podChanges.some((c) => c.store === 'food' && c.delta > 0)).toBe(true);
  });
});

describe('status', () => {
  it('is lost when any store is already at zero', () => {
    const run = makeRun('jezero', [], {
      power: 0,
      oxygen: 100,
      water: 100,
      food: 100,
      shielding: 100,
    });
    const result = advanceSol(run);
    expect(result.status).toBe('lost');
    expect(result.ended).toBe(true);
  });

  it('is lost when a store drops to zero during a sol', () => {
    // Power at 1, night drain 7 -> drops to zero.
    const run = makeRun('jezero', [], {
      power: 1,
      oxygen: 100,
      water: 100,
      food: 100,
      shielding: 100,
    });
    const result = advanceSol(run);
    expect(result.status).toBe('lost');
    expect(result.stores.power).toBe(0);
  });

  it('is never a death state', () => {
    let current = makeRun();
    for (let s = 1; s <= 20; s += 1) {
      const result = advanceSol(current);
      expect(['active', 'lost', 'won']).toContain(result.status);
      if (result.ended) break;
      current = applyResult(current, result);
    }
  });

  it('is won at the target sol with no store depleted', () => {
    // Greenhouse keeps food stable and the extractor keeps water up.
    const run = makeRun('jezero', [
      'habitat',
      'life-support',
      'solar-array',
      'batteries',
      'greenhouse',
      'water-extractor',
    ]);
    const finished = advance(run, 20);

    expect(finished.status).toBe('won');
    expect(finished.sol).toBe(20);
    expect(finished.ledger).toHaveLength(20);
  });
});

describe('isRunOver', () => {
  it('returns true when any store is at or below zero', () => {
    expect(isRunOver({ power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 })).toBe(true);
    expect(
      isRunOver({ power: 100, oxygen: -1, water: 100, food: 100, shielding: 100 }),
    ).toBe(true);
  });

  it('returns false when all stores are above zero', () => {
    expect(isRunOver({ power: 1, oxygen: 100, water: 100, food: 100, shielding: 100 })).toBe(false);
  });
});
