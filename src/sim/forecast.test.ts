import { describe, expect, it } from 'vitest';

import {
  createForecast,
  eventsStartingOn,
  FIRST_FLARE_SOL,
  flareIntensity,
  forecastIsSpaced,
  MIN_CLEAR_SOLS,
  SECOND_FLARE_SOL,
  stormOn,
  stormOpacity,
  STORM_SOL,
  type ForecastEvent,
} from './forecast';

/*
 * The forecast is the game's calendar, and one rule about it matters more than
 * the rest: **two events never happen back to back.** A crisis on the sol after
 * a crisis is a pile-up, not a story — the player has no sol to put things
 * right in. These tests are what say so.
 */

const FLARES = [
  { classType: 'M5.0', approximate: true, when: 'in a test' },
  { classType: 'X1.0', approximate: false, when: 'today' },
];

describe('the forecast schedule', () => {
  it('puts a flare, a pod, a storm and a second flare on the calendar', () => {
    const forecast = createForecast(FLARES);

    expect(forecast.map((event) => `${event.kind}@${event.sol}`)).toEqual([
      'flare@3',
      'supply-pod@5',
      'storm@7',
      'flare@10',
    ]);
  });

  it('never lets two events happen back to back', () => {
    expect(forecastIsSpaced(createForecast(FLARES))).toBe(true);
    expect(forecastIsSpaced(createForecast([]))).toBe(true);
  });

  it('leaves at least one quiet sol between every pair of events', () => {
    const forecast = createForecast(FLARES);

    for (let index = 1; index < forecast.length; index += 1) {
      const previous = forecast[index - 1];
      const current = forecast[index];

      if (previous === undefined || current === undefined) continue;

      const previousEnds = previous.sol + previous.durationSols - 1;

      /* The sol after an event ends is still too soon. */
      expect(current.sol - previousEnds).toBeGreaterThanOrEqual(MIN_CLEAR_SOLS + 1);
    }
  });

  it('keeps the storm clear of the flare that follows it', () => {
    const forecast = createForecast(FLARES);
    const storm = forecast.find((event) => event.kind === 'storm');
    const secondFlare = forecast.find((event) => event.kind === 'flare' && event.sol === SECOND_FLARE_SOL);

    if (storm === undefined || secondFlare === undefined) throw new Error('the forecast lost an event');

    /* The storm lasts two sols, so it is still dusting the panels when the
       next event arrives. One clear sol has to fit in between. */
    expect(secondFlare.sol).toBeGreaterThanOrEqual(storm.sol + storm.durationSols + MIN_CLEAR_SOLS);
  });

  it('reports the same sols through the constants and the events', () => {
    const forecast = createForecast(FLARES);

    expect(forecast.find((event) => event.kind === 'flare')?.sol).toBe(FIRST_FLARE_SOL);
    expect(forecast.find((event) => event.kind === 'storm')?.sol).toBe(STORM_SOL);
  });

  it('spots a forecast that does touch, so the rule can be tested', () => {
    const first = createForecast(FLARES)[0];
    const second = createForecast(FLARES)[1];

    if (first === undefined || second === undefined) throw new Error('the forecast lost an event');

    const touching: readonly ForecastEvent[] = [first, { ...second, sol: first.sol + 1 }];

    expect(forecastIsSpaced(touching)).toBe(false);
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
    const live = createForecast([{ classType: 'X1.0', approximate: false, when: 'today' }]);
    const saved = createForecast([]);

    expect(live.find((event) => event.kind === 'flare')?.approximate).toBe(false);
    expect(saved.find((event) => event.kind === 'flare')?.approximate).toBe(true);
  });

  it('keeps the storm over two sols and blocks less sun at a calmer site', () => {
    const forecast = createForecast(FLARES);

    expect(stormOn(forecast, 7)?.kind).toBe('storm');
    expect(stormOn(forecast, 8)?.kind).toBe('storm');
    expect(stormOn(forecast, 9)).toBeNull();
    expect(stormOpacity(4)).toBeLessThan(stormOpacity(2));
  });

  it('finds the events that begin on a sol', () => {
    const forecast = createForecast(FLARES);

    expect(eventsStartingOn(forecast, 3)).toHaveLength(1);
    expect(eventsStartingOn(forecast, 4)).toHaveLength(0);
  });
});
