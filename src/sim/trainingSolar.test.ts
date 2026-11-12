import { describe, expect, it } from 'vitest';

import { makeRandom } from './training';
import {
  SOLAR_EXCELLENT_EXTRA,
  SOLAR_GOOD_EXTRA,
  SOLAR_SIZE,
  generateSolarPuzzle,
  rotateSolarTile,
  solarFlow,
  solarOpens,
  solarPerformance,
  solarTapsNeeded,
} from './trainingSolar';

/*
 * The power board is generated, so it has to be proved rather than trusted:
 * every board must be solvable, and no board may arrive already solved.
 */

describe('a generated board', () => {
  it('is four by four', () => {
    const puzzle = generateSolarPuzzle(makeRandom(1));

    expect(puzzle.tiles).toHaveLength(SOLAR_SIZE);

    for (const row of puzzle.tiles) {
      expect(row).toHaveLength(SOLAR_SIZE);
    }
  });

  it('is never already solved', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const puzzle = generateSolarPuzzle(makeRandom(seed));

      expect(solarFlow(puzzle.tiles).win).toBe(false);
    }
  });

  it('always has something to do', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const puzzle = generateSolarPuzzle(makeRandom(seed));

      expect(puzzle.needed).toBeGreaterThan(0);
    }
  });

  it('is the same board for the same seed', () => {
    const first = generateSolarPuzzle(makeRandom(9));
    const second = generateSolarPuzzle(makeRandom(9));

    expect(solarTapsNeeded(first)).toBe(solarTapsNeeded(second));
    expect(first.route).toEqual(second.route);
  });

  it('runs from the panel to the battery', () => {
    const puzzle = generateSolarPuzzle(makeRandom(4));

    expect(puzzle.route[0]).toEqual([0, 0]);
    expect(puzzle.route[puzzle.route.length - 1]).toEqual([SOLAR_SIZE - 1, SOLAR_SIZE - 1]);
  });
});

describe('solving a board', () => {
  it('is possible with the turns it says it needs', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const puzzle = generateSolarPuzzle(makeRandom(seed));
      let tiles = puzzle.tiles;

      for (const [row, column] of puzzle.route) {
        const tile = tiles[row]?.[column] as { rotation: number; good: readonly number[] };
        const taps = Math.min(...tile.good.map((rotation) => (rotation - tile.rotation + 4) % 4));

        for (let turn = 0; turn < taps; turn += 1) {
          tiles = rotateSolarTile(tiles, row, column);
        }
      }

      expect(solarFlow(tiles).win).toBe(true);
    }
  });

  it('lights the tiles the power runs through', () => {
    const puzzle = generateSolarPuzzle(makeRandom(5));
    const flow = solarFlow(puzzle.tiles);

    expect(flow.lit.size).toBeGreaterThan(0);
  });
});

describe('turning a tile', () => {
  it('turns it a quarter', () => {
    const puzzle = generateSolarPuzzle(makeRandom(6));
    const before = puzzle.tiles[0]?.[0] as { rotation: number };
    const turned = rotateSolarTile(puzzle.tiles, 0, 0);
    const after = turned[0]?.[0] as { rotation: number };

    expect(after.rotation).toBe((before.rotation + 1) % 4);
  });

  it('leaves the other tiles alone', () => {
    const puzzle = generateSolarPuzzle(makeRandom(6));
    const turned = rotateSolarTile(puzzle.tiles, 0, 0);

    expect(turned[1]).toEqual(puzzle.tiles[1]);
  });

  it('keeps the answer on the tile', () => {
    const puzzle = generateSolarPuzzle(makeRandom(6));
    const before = puzzle.tiles[0]?.[0] as { good: readonly number[] };
    const after = rotateSolarTile(puzzle.tiles, 0, 0)[0]?.[0] as { good: readonly number[] };

    expect(after.good).toEqual(before.good);
  });
});

describe('the sides a tile is open on', () => {
  it('are opposite each other on a straight line', () => {
    const opened = solarOpens({ type: 'straight', rotation: 0, good: [] });

    expect(opened).toHaveLength(2);
    expect((opened[0] as number) + 2).toBe(opened[1] % 4);
  });

  it('are next to each other on a corner', () => {
    const opened = solarOpens({ type: 'corner', rotation: 0, good: [] });

    expect(opened).toHaveLength(2);
    expect(Math.abs((opened[0] as number) - (opened[1] as number))).toBe(1);
  });

  it('are none at all on an empty tile', () => {
    expect(solarOpens({ type: 'empty', rotation: 0, good: [] })).toHaveLength(0);
  });
});

describe('the band a finished game falls into', () => {
  it('is excellent when it is solved in a few turns over', () => {
    expect(solarPerformance(10, 10)).toBe('excellent');
    expect(solarPerformance(10 + SOLAR_EXCELLENT_EXTRA, 10)).toBe('excellent');
  });

  it('is good for a few more', () => {
    expect(solarPerformance(10 + SOLAR_EXCELLENT_EXTRA + 1, 10)).toBe('good');
    expect(solarPerformance(10 + SOLAR_GOOD_EXTRA, 10)).toBe('good');
  });

  it('is basic for a lot of them', () => {
    expect(solarPerformance(10 + SOLAR_GOOD_EXTRA + 1, 10)).toBe('basic');
  });
});
