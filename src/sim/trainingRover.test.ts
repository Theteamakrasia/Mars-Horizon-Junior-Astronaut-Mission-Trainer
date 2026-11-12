import { describe, expect, it } from 'vitest';

import {
  ROVER_EXTRA_MOVES,
  ROVER_EXCELLENT_WASTED,
  ROVER_GOOD_WASTED,
  ROVER_MAPS,
  ROVER_SIZE,
  roverCell,
  roverDeliveryRoute,
  roverMovesAllowed,
  roverOpen,
  roverPerformance,
  roverRoute,
} from './trainingRover';

/*
 * A map the player cannot finish is worse than no map at all: the game would
 * look broken. Every map is proved solvable here, and the move budget is
 * built from the shortest route so it always is.
 */

describe('the maps', () => {
  it('are all six by six', () => {
    for (const map of ROVER_MAPS) {
      expect(map).toHaveLength(ROVER_SIZE);

      for (const row of map) {
        expect(row).toHaveLength(ROVER_SIZE);
      }
    }
  });

  it('all have a rover and an outpost', () => {
    for (const map of ROVER_MAPS) {
      expect(roverCell(map, 'R')).not.toBeNull();
      expect(roverCell(map, 'P')).not.toBeNull();
    }
  });

  it('all have a sample, and a way to bring it home', () => {
    /* From the second level on, the rover has to pick the sample up and take
       it to the outpost, so every map has to have one and a route that covers
       both. */
    for (const map of ROVER_MAPS) {
      expect(roverCell(map, 'S')).not.toBeNull();
      expect(roverDeliveryRoute(map)).toBeGreaterThan(0);
    }
  });

  it('all have a way through', () => {
    for (const map of ROVER_MAPS) {
      expect(roverRoute(map)).toBeGreaterThan(0);
    }
  });

  it('all have some rocks on them', () => {
    for (const map of ROVER_MAPS) {
      expect(map.join('')).toContain('#');
    }
  });

  it('all start and end in different places', () => {
    for (const map of ROVER_MAPS) {
      const start = roverCell(map, 'R') as readonly [number, number];
      const goal = roverCell(map, 'P') as readonly [number, number];

      expect(start).not.toEqual(goal);
    }
  });
});

describe('the ground', () => {
  it('is open where there is no rock', () => {
    expect(roverOpen(['R...'], 0, 0)).toBe(true);
  });

  it('is shut where there is a rock', () => {
    expect(roverOpen(['#..'], 0, 0)).toBe(false);
  });

  it('is shut outside the map', () => {
    expect(roverOpen(['R...'], 3, 0)).toBe(false);
    expect(roverOpen(['R...'], 0, 9)).toBe(false);
  });
});

describe('the shortest route', () => {
  it('is the length of the straight way', () => {
    const map = ['R...', '....', '....', '...P'];

    expect(roverRoute(map)).toBe(6);
  });

  it('is never shorter than the straight way', () => {
    for (const map of ROVER_MAPS) {
      const start = roverCell(map, 'R') as readonly [number, number];
      const goal = roverCell(map, 'P') as readonly [number, number];
      const straight = Math.abs(goal[0] - start[0]) + Math.abs(goal[1] - start[1]);

      expect(roverRoute(map)).toBeGreaterThanOrEqual(straight);
    }
  });

  it('is nothing when there is no way at all', () => {
    expect(roverRoute(['R#..', '.###', '###.', '...P'])).toBe(-1);
  });
});

describe('the moves the player gets', () => {
  it('is the shortest route and a few more', () => {
    for (const map of ROVER_MAPS) {
      expect(roverMovesAllowed(map)).toBe(roverRoute(map) + ROVER_EXTRA_MOVES);
    }
  });

  it('is none at all on a map with no way through', () => {
    expect(roverMovesAllowed(['R#..', '.###', '###.', '...P'])).toBe(0);
  });
});

describe('the band a finished game falls into', () => {
  const route = 10;

  it('is excellent when hardly a move was wasted', () => {
    expect(roverPerformance(route + ROVER_EXTRA_MOVES - ROVER_EXCELLENT_WASTED, route)).toBe('excellent');
  });

  it('is good when a couple were', () => {
    expect(roverPerformance(route + ROVER_EXTRA_MOVES - ROVER_EXCELLENT_WASTED - 1, route)).toBe('good');
    expect(roverPerformance(route + ROVER_EXTRA_MOVES - ROVER_GOOD_WASTED, route)).toBe('good');
  });

  it('is basic when a lot were', () => {
    expect(roverPerformance(route + ROVER_EXTRA_MOVES - ROVER_GOOD_WASTED - 1, route)).toBe('basic');
    expect(roverPerformance(0, route)).toBe('basic');
  });
});
