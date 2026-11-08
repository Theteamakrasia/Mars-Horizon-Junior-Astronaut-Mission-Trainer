import { describe, expect, it } from 'vitest';

import { newRun } from '../../sim/run';
import {
  canPlace,
  costOf,
  formatCost,
  formatStore,
  previewOf,
  upkeep,
} from './model';

const RUN = newRun('jezero', 'Riley');

describe('canPlace', () => {
  it('refuses a starting module that is already at its cap', () => {
    expect(canPlace('habitat', RUN)).toBe(false);
    expect(canPlace('batteries', RUN)).toBe(false);
  });

  it('allows a buildable module when affordable and under cap', () => {
    expect(canPlace('greenhouse', RUN)).toBe(true);
  });

  it('refuses when not affordable', () => {
    const broke = {
      ...RUN,
      stores: { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
    };
    expect(canPlace('greenhouse', broke)).toBe(false);
  });

  it('uses terrain from the region', () => {
    // Arcadia terrain 5 -> greenhouse cost 16, affordable at 50 power
    expect(canPlace('greenhouse', newRun('arcadia'))).toBe(true);
    // Olympus terrain 2 -> greenhouse cost 22, still affordable at 50
    expect(canPlace('greenhouse', newRun('olympus'))).toBe(true);
  });
});

describe('costOf', () => {
  it('returns the terrain-adjusted build cost', () => {
    expect(costOf('greenhouse', newRun('jezero'))).toBe(20);
    expect(costOf('greenhouse', newRun('arcadia'))).toBe(16);
    expect(costOf('greenhouse', newRun('olympus'))).toBe(22);
    expect(costOf('extra-batteries', newRun('jezero'))).toBe(10);
  });
});

describe('formatStore / formatCost', () => {
  it('formats stores as whole percents', () => {
    expect(formatStore(46)).toBe('46%');
    expect(formatStore(0)).toBe('0%');
    expect(formatStore(100)).toBe('100%');
  });

  it('formats costs as power figures', () => {
    expect(formatCost(20)).toBe('20 power');
    expect(formatCost(10)).toBe('10 power');
  });
});

describe('upkeep', () => {
  it('sums power draw and solar arrays', () => {
    expect(upkeep(RUN)).toEqual({ powerDraw: 5, solarArrays: 1 });
  });

  it('reflects added modules', () => {
    const run = {
      ...RUN,
      modules: ['habitat', 'life-support', 'solar-array', 'batteries', 'greenhouse'] as const,
    };
    expect(upkeep(run)).toEqual({ powerDraw: 8, solarArrays: 1 });
  });
});

describe('previewOf', () => {
  it('reports cost, provides, affordable and under cap', () => {
    const preview = previewOf('greenhouse', RUN);
    expect(preview).not.toBeNull();
    expect(preview!.kind).toBe('greenhouse');
    expect(preview!.buildCost).toBe(20);
    expect(preview!.provides).toContain('Food');
    expect(preview!.affordable).toBe(true);
    expect(preview!.underCap).toBe(true);
  });

  it('reports not affordable when broke', () => {
    const broke = {
      ...RUN,
      stores: { power: 0, oxygen: 100, water: 100, food: 100, shielding: 100 },
    };
    expect(previewOf('greenhouse', broke)!.affordable).toBe(false);
  });
});
