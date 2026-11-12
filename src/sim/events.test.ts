import { describe, expect, it } from 'vitest';

import {
  EVENT_SCHEDULE,
  eventsForSol,
  forecastFrom,
  isFlareSol,
  isStormSol,
  isSupplyPodSol,
  stormSol,
} from './events';

describe('EVENT_SCHEDULE', () => {
  it('is sorted by sol ascending', () => {
    const sols = EVENT_SCHEDULE.map((e) => e.sol);
    const sorted = [...sols].sort((a, b) => a - b);
    expect(sols).toEqual(sorted);
  });

  it('every event is approximate', () => {
    for (const event of EVENT_SCHEDULE) {
      expect(event.approximate).toBe(true);
    }
  });

  it('every event has a non-empty summary', () => {
    for (const event of EVENT_SCHEDULE) {
      expect(typeof event.summary).toBe('string');
      expect(event.summary.length).toBeGreaterThan(0);
    }
  });

  it('has the five scheduled events', () => {
    expect(EVENT_SCHEDULE).toHaveLength(5);
    const bySol = new Map(EVENT_SCHEDULE.map((e) => [e.sol, e.kind]));
    expect(bySol.get(2)).toBe('storm-warning');
    expect(bySol.get(5)).toBe('storm');
    expect(bySol.get(10)).toBe('supply-pod');
    expect(bySol.get(14)).toBe('solar-flare');
    expect(bySol.get(20)).toBe('win-check');
  });
});

describe('eventsForSol', () => {
  it('returns the event on its scheduled sol', () => {
    expect(eventsForSol(5)).toHaveLength(1);
    expect(eventsForSol(5)[0].kind).toBe('storm');
  });

  it('returns an empty array for a sol with no events', () => {
    expect(eventsForSol(1)).toEqual([]);
    expect(eventsForSol(3)).toEqual([]);
  });

  it('returns an empty array for sol 0', () => {
    expect(eventsForSol(0)).toEqual([]);
  });

  it('does not leak events to other sols', () => {
    const storm = eventsForSol(5);
    expect(storm).toHaveLength(1);
    expect(eventsForSol(6)).toEqual([]);
  });
});

describe('forecastFrom', () => {
  it('returns events in (sol, sol + horizon]', () => {
    // From sol 2, horizon 4 covers sols 3, 4, 5, 6 -> storm on sol 5
    const forecast = forecastFrom(2, 4);
    expect(forecast.map((e) => e.sol)).toEqual([5]);
  });

  it('excludes the starting sol itself', () => {
    const forecast = forecastFrom(5, 1);
    expect(forecast.map((e) => e.sol)).toEqual([]);
  });

  it('includes the end of the horizon', () => {
    const forecast = forecastFrom(4, 1);
    expect(forecast.map((e) => e.sol)).toEqual([5]);
  });

  it('returns an empty array beyond the schedule', () => {
    expect(forecastFrom(20, 10)).toEqual([]);
  });
});

describe('stormSol', () => {
  it('returns the storm sol three sols after the warning', () => {
    expect(stormSol(2)).toBe(5);
  });
});

describe('isStormSol / isSupplyPodSol / isFlareSol', () => {
  it('detects storm sols', () => {
    expect(isStormSol(5)).toBe(true);
    expect(isStormSol(2)).toBe(false);
    expect(isStormSol(20)).toBe(false);
  });

  it('detects supply pod sols', () => {
    expect(isSupplyPodSol(10)).toBe(true);
    expect(isSupplyPodSol(5)).toBe(false);
  });

  it('detects solar flare sols', () => {
    expect(isFlareSol(14)).toBe(true);
    expect(isFlareSol(5)).toBe(false);
  });
});
