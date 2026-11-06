import { describe, expect, it } from 'vitest';

import {
  REGIONS,
  SITE_AXES,
  scoreRegion,
  strengthAndWeakness,
  totalScore,
  tradeoffSummary,
  type SiteScore,
} from './model';

describe('REGIONS', () => {
  it('has five regions', () => {
    expect(REGIONS).toHaveLength(5);
  });

  it('every region has all five axes, each an integer in 0-5', () => {
    for (const region of REGIONS) {
      for (const axis of SITE_AXES) {
        const value = region.scores[axis];
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });

  it('totals stay within ±1 of 17/25, with no perfect site', () => {
    for (const region of REGIONS) {
      const total = totalScore(region.scores);
      expect(total).toBeGreaterThanOrEqual(16);
      expect(total).toBeLessThanOrEqual(18);
      expect(total).toBeLessThan(25);
    }
  });

  it('every pin position is inside 0-100', () => {
    for (const region of REGIONS) {
      expect(region.pin.x).toBeGreaterThanOrEqual(0);
      expect(region.pin.x).toBeLessThanOrEqual(100);
      expect(region.pin.y).toBeGreaterThanOrEqual(0);
      expect(region.pin.y).toBeLessThanOrEqual(100);
    }
  });
});

describe('scoreRegion', () => {
  it('returns the authored scores for each region', () => {
    const byId: Record<string, SiteScore> = {};

    for (const region of REGIONS) {
      byId[region.id] = region.scores;
    }

    expect(scoreRegion('arcadia')).toEqual(byId.arcadia);
    expect(scoreRegion('jezero')).toEqual(byId.jezero);
    expect(scoreRegion('olympus')).toEqual(byId.olympus);
    expect(scoreRegion('valles')).toEqual(byId.valles);
    expect(scoreRegion('argyre')).toEqual(byId.argyre);
  });

  it('returns a safe all-zero score for an unknown id instead of throwing', () => {
    expect(() => scoreRegion('nowhere')).not.toThrow();
    expect(scoreRegion('nowhere')).toEqual({
      water: 0,
      sun: 0,
      terrain: 0,
      dust: 0,
      temp: 0,
    });
  });
});

describe('totalScore', () => {
  it('sums all five axes', () => {
    const score: SiteScore = { water: 5, sun: 3, terrain: 5, dust: 3, temp: 2 };
    expect(totalScore(score)).toBe(18);
  });
});

describe('strengthAndWeakness', () => {
  it('names the strongest and weakest axis deterministically', () => {
    const score: SiteScore = { water: 5, sun: 1, terrain: 3, dust: 4, temp: 2 };
    expect(strengthAndWeakness(score)).toEqual({ strength: 'water', weakness: 'sun' });
  });

  it('breaks ties in SITE_AXES order', () => {
    const score: SiteScore = { water: 5, sun: 5, terrain: 3, dust: 3, temp: 3 };
    expect(strengthAndWeakness(score)).toEqual({ strength: 'water', weakness: 'terrain' });
  });
});

describe('tradeoffSummary', () => {
  it('names the strongest and weakest axis', () => {
    const score: SiteScore = { water: 5, sun: 1, terrain: 3, dust: 4, temp: 2 };
    expect(tradeoffSummary(score)).toBe('Strong on water, weak on sun.');
  });

  it('never contains "best" or "recommended"', () => {
    for (const region of REGIONS) {
      const summary = tradeoffSummary(region.scores);
      expect(summary.toLowerCase()).not.toContain('best');
      expect(summary.toLowerCase()).not.toContain('recommended');
    }
  });
});
