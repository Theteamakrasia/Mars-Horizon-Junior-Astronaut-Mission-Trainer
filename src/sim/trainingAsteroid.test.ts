import { describe, expect, it } from 'vitest';

import { makeRandom } from './training';
import {
  ASTEROID_DECOY_CHANCE,
  ASTEROID_EXCELLENT_ACCURACY,
  ASTEROID_GOOD_ACCURACY,
  ASTEROID_GOAL,
  ASTEROID_SECONDS,
  asteroidAccuracy,
  asteroidDelay,
  asteroidIsDecoy,
  asteroidLife,
  asteroidPerformance,
} from './trainingAsteroid';

/*
 * The round gets faster as it goes on, but never so fast that a child cannot
 * hit anything, and the grade rewards the satellites that were left alone.
 */

describe('the clock', () => {
  it('is long enough for a child with a mouse', () => {
    expect(ASTEROID_SECONDS).toBe(50);
    expect(ASTEROID_GOAL).toBe(12);
  });
});

describe('the rocks', () => {
  it('come faster as the round goes on', () => {
    expect(asteroidDelay(40)).toBeLessThan(asteroidDelay(0));
  });

  it('never come faster than a child can hit', () => {
    for (let second = 0; second < ASTEROID_SECONDS; second += 1) {
      expect(asteroidDelay(second)).toBeGreaterThanOrEqual(700);
    }
  });

  it('stay on the screen long enough to be clicked', () => {
    for (let second = 0; second < ASTEROID_SECONDS; second += 1) {
      expect(asteroidLife(second)).toBeGreaterThanOrEqual(1400);
    }
  });
});

describe('the satellites', () => {
  it('are the fifth of what drifts past', () => {
    expect(ASTEROID_DECOY_CHANCE).toBe(0.2);
  });

  it('do turn up now and then', () => {
    const random = makeRandom(12);
    let decoys = 0;

    for (let index = 0; index < 400; index += 1) {
      if (asteroidIsDecoy(random)) decoys += 1;
    }

    expect(decoys).toBeGreaterThan(40);
    expect(decoys).toBeLessThan(140);
  });
});

describe('the accuracy', () => {
  it('is every hit over every shot', () => {
    expect(asteroidAccuracy(9, 1, 0)).toBe(0.9);
  });

  it('counts a rock that drifted past as a miss', () => {
    expect(asteroidAccuracy(8, 0, 2)).toBe(0.8);
  });

  it('is nothing when nothing was shot at', () => {
    expect(asteroidAccuracy(0, 0, 0)).toBe(0);
  });
});

describe('the band a finished round falls into', () => {
  it('is excellent for a sharp round', () => {
    expect(asteroidPerformance(ASTEROID_EXCELLENT_ACCURACY)).toBe('excellent');
  });

  it('is good for a fair one', () => {
    expect(asteroidPerformance(ASTEROID_GOOD_ACCURACY)).toBe('good');
  });

  it('is basic for a wild one', () => {
    expect(asteroidPerformance(ASTEROID_GOOD_ACCURACY - 0.01)).toBe('basic');
  });
});
