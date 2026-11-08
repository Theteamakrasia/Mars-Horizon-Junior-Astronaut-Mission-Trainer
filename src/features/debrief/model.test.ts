import { describe, expect, it } from 'vitest';

import { explainOutcome, consumptionSummary } from './model';
import { newRun } from '../../sim/run';
import type { ModuleKind } from '../../sim/modules';
import type { StoreChange } from '../../sim/resources';
import type { ResourceStores } from '../../sim/resources';

interface Change {
  readonly sol: number;
  readonly store: StoreChange['store'];
  readonly cause: string;
  readonly delta: number;
}

function runWith(
  status: 'active' | 'lost' | 'won',
  stores: ResourceStores,
  modules: readonly ModuleKind[] = [],
  changes: readonly Change[] = [],
) {
  const ledger = Array.from({ length: 3 }, (_, i) => {
    const sol = i + 1;
    const atSol = changes.filter((c) => c.sol === sol);
    return {
      sol,
      stores,
      changes: atSol.map<StoreChange>((c) => ({
        store: c.store,
        cause: c.cause,
        delta: c.delta,
      })),
    };
  });

  return {
    ...newRun('jezero', 'Riley'),
    sol: 10,
    status,
    stores,
    modules,
    ledger,
  };
}

describe('explainOutcome', () => {
  it('reports a win confidently', () => {
    const run = runWith('won', {
      power: 40,
      oxygen: 90,
      water: 80,
      food: 70,
      shielding: 30,
    });
    const out = explainOutcome(run, []);
    expect(out.headline).toBe('Mission complete.');
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('reached sol 10');
  });

  it('attributes power loss to the storm when storm damage is in the ledger', () => {
    const run = runWith(
      'lost',
      { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
      [],
      [{ sol: 3, store: 'power', cause: 'storm', delta: -20 }],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('storm');
  });

  it('attributes power loss to night drain when no storm hit', () => {
    const run = runWith(
      'lost',
      { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
      [],
      [{ sol: 3, store: 'power', cause: 'night-drain', delta: -10 }],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('Night');
  });

  it('attributes shielding loss to storms/flares', () => {
    const run = runWith(
      'lost',
      { power: 50, oxygen: 100, water: 100, food: 100, shielding: 0 },
      [],
      [{ sol: 3, store: 'shielding', cause: 'storm', delta: -8 }],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('radiation shelter');
  });

  it('attributes water loss to no extractor', () => {
    const run = runWith(
      'lost',
      { power: 50, oxygen: 100, water: 0, food: 100, shielding: 100 },
      [],
      [{ sol: 3, store: 'water', cause: 'crew', delta: -12 }],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('extractor');
  });

  it('attributes food loss to no greenhouse', () => {
    const run = runWith('lost', {
      power: 50,
      oxygen: 100,
      water: 100,
      food: 0,
      shielding: 100,
    });
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('greenhouse');
  });

  it('attributes oxygen loss to no life support', () => {
    const run = runWith('lost', {
      power: 50,
      oxygen: 0,
      water: 100,
      food: 100,
      shielding: 100,
    });
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('life support');
  });

  it('is not confident when no store reached zero', () => {
    const run = runWith('lost', {
      power: 1,
      oxygen: 1,
      water: 1,
      food: 1,
      shielding: 1,
    });
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(false);
  });

  it('is not confident when two causes split the loss evenly', () => {
    const run = runWith(
      'lost',
      { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
      [],
      [
        { sol: 3, store: 'power', cause: 'night-drain', delta: -10 },
        { sol: 3, store: 'power', cause: 'storm', delta: -10 },
      ],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(false);
  });

  it('is confident when one cause is more than half the loss', () => {
    const run = runWith(
      'lost',
      { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
      [],
      [
        { sol: 3, store: 'power', cause: 'night-drain', delta: -18 },
        { sol: 3, store: 'power', cause: 'storm', delta: -4 },
      ],
    );
    const out = explainOutcome(run, []);
    expect(out.confident).toBe(true);
    expect(out.detail).toContain('Night');
  });
});

describe('consumptionSummary', () => {
  it('sums negative deltas from the ledger', () => {
    const run = runWith(
      'lost',
      { power: 40, oxygen: 90, water: 80, food: 70, shielding: 30 },
      [],
      [
        { sol: 1, store: 'power', cause: 'night-drain', delta: -10 },
        { sol: 2, store: 'food', cause: 'crew', delta: -6 },
      ],
    );
    const out = consumptionSummary(run, []);
    expect(out.used).toBe(16);
  });

  it('returns zero when nothing was drained', () => {
    const run = runWith('lost', {
      power: 50,
      oxygen: 100,
      water: 90,
      food: 80,
      shielding: 20,
    });
    const out = consumptionSummary(run, []);
    expect(out.used).toBe(0);
  });
});
