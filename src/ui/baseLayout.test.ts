import { describe, it, expect } from 'vitest';
import { MODULE_CATALOGUE } from '../sim/modules';
import raw from './baseLayout.json';
import {
  DEFAULT_SPOTS,
  LAYOUT_PROBLEMS,
  MODULE_SPOT,
  SPOT_BAND,
  buildLayoutJson,
  clamp,
  clampSpot,
  describeLayoutProblems,
  pointToPercent,
  resolveSpots,
} from './baseLayout';

describe('SPOT_BAND', () => {
  it('keeps every band ordered', () => {
    expect(SPOT_BAND.left.min).toBeLessThan(SPOT_BAND.left.max);
    expect(SPOT_BAND.bottom.min).toBeLessThan(SPOT_BAND.bottom.max);
    expect(SPOT_BAND.width.min).toBeLessThan(SPOT_BAND.width.max);
  });

  it('matches the CSS clamp in styles/game-loop.css', () => {
    // Rule 11 of check-imports.mjs compares the same numbers. This test is the
    // other half: it fails here too, so a change is noticed even if the
    // checker is not run.
    expect(SPOT_BAND.left).toEqual({ min: 2, max: 92 });
    expect(SPOT_BAND.bottom).toEqual({ min: 2, max: 32 });
    expect(SPOT_BAND.width).toEqual({ min: 6, max: 24 });
  });
});

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(5, 2, 92)).toBe(5);
    expect(clamp(-4, 2, 92)).toBe(2);
    expect(clamp(400, 2, 92)).toBe(92);
  });

  it('turns a number that is not a number into the minimum', () => {
    expect(clamp(Number.NaN, 2, 92)).toBe(2);
    expect(clamp(Number.POSITIVE_INFINITY, 2, 92)).toBe(2);
  });
});

describe('clampSpot', () => {
  it('pulls every number into the band', () => {
    const spot = clampSpot({ left: 400, bottom: -20, width: 2, z: 3 });

    expect(spot.left).toBe(SPOT_BAND.left.max);
    expect(spot.bottom).toBe(SPOT_BAND.bottom.min);
    expect(spot.width).toBe(SPOT_BAND.width.min);
    expect(spot.z).toBe(3);
  });

  it('leaves a legal spot alone', () => {
    const spot = { left: 28, bottom: 30, width: 20, z: 4 };

    expect(clampSpot(spot)).toEqual(spot);
  });
});

describe('resolveSpots', () => {
  it('reads a complete layout', () => {
    const spots = resolveSpots({ habitat: { left: 10, bottom: 20, width: 15, z: 2 } });

    expect(spots.habitat).toEqual({ left: 10, bottom: 20, width: 15, z: 2 });
  });

  it('gives every catalogue kind a spot even from nothing', () => {
    const spots = resolveSpots({});

    for (const spec of MODULE_CATALOGUE) {
      expect(spots[spec.kind]).toBeDefined();
    }

    expect(spots.habitat).toEqual(DEFAULT_SPOTS.habitat);
  });

  it('falls back to the default for a kind that is missing', () => {
    const spots = resolveSpots({ habitat: { left: 10, bottom: 20, width: 15, z: 2 } });

    expect(spots.batteries).toEqual(DEFAULT_SPOTS.batteries);
  });

  it('falls back to the default for an entry that is not a spot', () => {
    const spots = resolveSpots({ habitat: 'over there' });

    expect(spots.habitat).toEqual(DEFAULT_SPOTS.habitat);
  });

  it('falls back to the default for an entry with a missing number', () => {
    const spots = resolveSpots({ habitat: { left: 10, bottom: 20, z: 2 } });

    expect(spots.habitat).toEqual(DEFAULT_SPOTS.habitat);
  });

  it('falls back to the default for an entry that is not finite', () => {
    const spots = resolveSpots({ habitat: { left: Number.NaN, bottom: 20, width: 15, z: 2 } });

    expect(spots.habitat).toEqual(DEFAULT_SPOTS.habitat);
  });

  it('clamps an out-of-range number rather than discarding the spot', () => {
    const spots = resolveSpots({ habitat: { left: 400, bottom: 20, width: 15, z: 2 } });

    expect(spots.habitat.left).toBe(SPOT_BAND.left.max);
    expect(spots.habitat.bottom).toBe(20);
  });

  it('survives a source that is not an object at all', () => {
    const spots = resolveSpots('nonsense');

    expect(spots.habitat).toEqual(DEFAULT_SPOTS.habitat);
  });
});

describe('describeLayoutProblems', () => {
  /** A layout with an entry for every kind, so only the thing under test is wrong. */
  function complete(): Record<string, { left: number; bottom: number; width: number; z: number }> {
    const layout: Record<string, { left: number; bottom: number; width: number; z: number }> = {};

    for (const spec of MODULE_CATALOGUE) layout[spec.kind] = { left: 10, bottom: 20, width: 15, z: 2 };

    return layout;
  }

  it('says nothing about a good layout', () => {
    expect(describeLayoutProblems(complete())).toEqual([]);
  });

  it('names a missing kind', () => {
    const layout = complete();

    delete layout.habitat;

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat') && line.includes('missing'))).toBe(true);
  });

  it('names a number that had to be clamped', () => {
    const layout = complete();

    layout.habitat = { left: 400, bottom: 20, width: 15, z: 2 };

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat.left') && line.includes('clamped'))).toBe(true);
  });

  it('names a kind that is not in the catalogue', () => {
    const layout = complete();

    layout['rocket-chair'] = { left: 1, bottom: 1, width: 1, z: 1 };

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('rocket-chair'))).toBe(true);
  });

  it('reports a source that is not an object', () => {
    expect(describeLayoutProblems('nonsense')).toHaveLength(1);
  });
});

describe('pointToPercent', () => {
  const panel = { x: 100, y: 50, width: 400, height: 200 };

  it('reads the bottom-left corner', () => {
    expect(pointToPercent({ x: 100, y: 250 }, panel)).toEqual({ left: 0, bottom: 0 });
  });

  it('reads the top-right corner', () => {
    expect(pointToPercent({ x: 500, y: 50 }, panel)).toEqual({ left: 100, bottom: 100 });
  });

  it('reads the middle', () => {
    expect(pointToPercent({ x: 300, y: 150 }, panel)).toEqual({ left: 50, bottom: 50 });
  });

  it('returns zero for a panel with no size', () => {
    expect(pointToPercent({ x: 10, y: 10 }, { x: 0, y: 0, width: 0, height: 0 })).toEqual({ left: 0, bottom: 0 });
  });
});

describe('buildLayoutJson', () => {
  it('writes one entry per catalogue kind, in catalogue order', () => {
    const json = buildLayoutJson(MODULE_SPOT);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(Object.keys(parsed)).toEqual(MODULE_CATALOGUE.map((spec) => spec.kind));
  });

  it('rounds a position to one decimal', () => {
    const json = buildLayoutJson({ ...MODULE_SPOT, habitat: { left: 28.12345, bottom: 30, width: 20, z: 4 } });
    const parsed = JSON.parse(json) as { habitat: { left: number } };

    expect(parsed.habitat.left).toBe(28.1);
  });

  it('ends with a newline, so the file is well formed', () => {
    expect(buildLayoutJson(MODULE_SPOT).endsWith('}\n')).toBe(true);
  });
});

describe('the layout file that ships with the game', () => {
  it('has no problems', () => {
    expect(LAYOUT_PROBLEMS).toEqual([]);
    expect(describeLayoutProblems(raw)).toEqual([]);
  });

  it('has an entry for every module kind', () => {
    for (const spec of MODULE_CATALOGUE) {
      expect((raw as Record<string, unknown>)[spec.kind]).toBeDefined();
    }
  });

  it('puts every module inside the band', () => {
    for (const spec of MODULE_CATALOGUE) {
      const spot = MODULE_SPOT[spec.kind];

      expect(spot.left).toBeGreaterThanOrEqual(SPOT_BAND.left.min);
      expect(spot.left).toBeLessThanOrEqual(SPOT_BAND.left.max);
      expect(spot.bottom).toBeGreaterThanOrEqual(SPOT_BAND.bottom.min);
      expect(spot.bottom).toBeLessThanOrEqual(SPOT_BAND.bottom.max);
      expect(spot.width).toBeGreaterThanOrEqual(SPOT_BAND.width.min);
      expect(spot.width).toBeLessThanOrEqual(SPOT_BAND.width.max);
    }
  });
});
