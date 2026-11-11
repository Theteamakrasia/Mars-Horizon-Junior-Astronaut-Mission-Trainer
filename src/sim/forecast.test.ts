import { describe, expect, it } from 'vitest';

import {
  createForecast,
  createSeededRandom,
  eventsStartingOn,
  FIRST_EVENT_SOL,
  flareIntensity,
  forecastIsSpaced,
  LAST_EVENT_SOL,
  MIN_CLEAR_SOLS,
  planEvents,
  randomSolBetween,
  stormOn,
  stormOpacity,
  visibleForecast,
  WARNING_SOLS,
} from './forecast';

/*
 * The forecast is the game's calendar, and one rule about it matters more than
 * the rest: **two events never happen back to back.** A crisis on the sol after
 * a crisis is a pile-up, not a story — the player has no sol to put things
 * right in. The timetable is rolled per run, so the rule cannot live in a
 * comment: it has to hold for every seed.
 */

const FLARES = [
  { classType: 'M5.0', approximate: true, when: 'in a test' },
  { classType: 'X1.0', approximate: false, when: 'today' },
];

/** Every seed a player might roll, so a rule has to hold for all of them. */
const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

describe('the timetable', () => {
  it('is the same for the same seed', () => {
    const first = createForecast(FLARES, 42);
    const second = createForecast(FLARES, 42);

    expect(first.map((event) => `${event.kind}@${event.sol}`)).toEqual(
      second.map((event) => `${event.kind}@${event.sol}`),
    );
  });

  it('is different for a different seed', () => {
    const timetables = new Set(
      SEEDS.slice(0, 30).map((seed) => createForecast(FLARES, seed).map((event) => `${event.kind}@${event.sol}`).join()),
    );

    expect(timetables.size).toBeGreaterThan(1);
  });

  it('never lets two events happen back to back', () => {
    for (const seed of SEEDS) {
      expect(forecastIsSpaced(createForecast(FLARES, seed))).toBe(true);
    }
  });

  it('leaves at least one quiet sol between every pair of events', () => {
    for (const seed of SEEDS) {
      const forecast = createForecast(FLARES, seed);

      for (let index = 1; index < forecast.length; index += 1) {
        const previous = forecast[index - 1];
        const current = forecast[index];

        if (previous === undefined || current === undefined) continue;

        const previousEnds = previous.sol + previous.durationSols - 1;

        expect(current.sol - previousEnds).toBeGreaterThanOrEqual(MIN_CLEAR_SOLS + 1);
      }
    }
  });

  it('keeps the storm clear of whatever comes next', () => {
    for (const seed of SEEDS) {
      const forecast = createForecast(FLARES, seed);
      const storm = forecast.find((event) => event.kind === 'storm');

      if (storm === undefined) continue;

      const next = forecast.find((event) => event.sol > storm.sol);

      if (next === undefined) continue;

      /* The storm lasts two sols, so it is still dusting the panels when the
         next event arrives. One clear sol has to fit in between. */
      expect(next.sol).toBeGreaterThanOrEqual(storm.sol + storm.durationSols + MIN_CLEAR_SOLS);
    }
  });

  it('keeps every event inside the range it may start on', () => {
    for (const seed of SEEDS) {
      for (const event of createForecast(FLARES, seed)) {
        expect(event.sol).toBeGreaterThanOrEqual(FIRST_EVENT_SOL);
        expect(event.sol).toBeLessThanOrEqual(LAST_EVENT_SOL);
      }
    }
  });

  it('always faces at least one flare, because radiation is the lesson', () => {
    for (const seed of SEEDS) {
      const flares = createForecast(FLARES, seed).filter((event) => event.kind === 'flare');

      expect(flares.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('spots a forecast that does touch, so the rule can be tested', () => {
    const first = createForecast(FLARES, 7)[0];
    const second = createForecast(FLARES, 7)[1];

    if (first === undefined || second === undefined) throw new Error('the forecast lost an event');

    expect(forecastIsSpaced([first, { ...second, sol: first.sol + 1 }])).toBe(false);
  });
});

describe('the planner', () => {
  it('draws a storm more often at a dusty site', () => {
    const dusty = SEEDS.filter((seed) => planEvents(createSeededRandom(seed), 1).stormSol !== null).length;
    const calm = SEEDS.filter((seed) => planEvents(createSeededRandom(seed), 5).stormSol !== null).length;

    expect(dusty).toBeGreaterThan(calm);
  });

  it('picks a sol inside the range it is given', () => {
    const random = createSeededRandom(3);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const sol = randomSolBetween(random, 2, 10);

      expect(sol).toBeGreaterThanOrEqual(2);
      expect(sol).toBeLessThanOrEqual(10);
    }
  });
});

describe('the events themselves', () => {
  it('maps NASA flare letters onto three intensities', () => {
    expect(flareIntensity('C2.1')).toBe(1);
    expect(flareIntensity('M4.2')).toBe(2);
    expect(flareIntensity('X5.8')).toBe(3);
    expect(flareIntensity('x1.0')).toBe(3);
  });

  it('carries the approximate flag from the data to the event the player sees', () => {
    const live = createForecast([{ classType: 'X1.0', approximate: false, when: 'today' }], 5);
    const saved = createForecast([], 5);

    expect(live.find((event) => event.kind === 'flare')?.approximate).toBe(false);
    expect(saved.find((event) => event.kind === 'flare')?.approximate).toBe(true);
  });

  it('keeps the storm over two sols and blocks less sun at a calmer site', () => {
    const forecast = createForecast(FLARES, 6);
    const storm = forecast.find((event) => event.kind === 'storm');

    if (storm === undefined) throw new Error('this seed has no storm');

    expect(stormOn(forecast, storm.sol)?.kind).toBe('storm');
    expect(stormOn(forecast, storm.sol + 1)?.kind).toBe('storm');
    expect(stormOn(forecast, storm.sol + 2)).toBeNull();
    expect(stormOpacity(4)).toBeLessThan(stormOpacity(2));
  });

  it('finds the events that begin on a sol', () => {
    const forecast = createForecast(FLARES, 11);
    const sol = forecast[0]?.sol ?? 0;

    expect(eventsStartingOn(forecast, sol)).toHaveLength(1);
    expect(eventsStartingOn(forecast, sol + 1)).toHaveLength(0);
  });

  it('only shows the crew what they could realistically see coming', () => {
    const forecast = createForecast(FLARES, 13);

    for (const event of visibleForecast(forecast, 1)) {
      expect(event.sol - 1).toBeLessThanOrEqual(WARNING_SOLS[event.kind]);
    }
  });
});
