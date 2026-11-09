/**
 * Turns real space-weather data into the run's forecast.
 *
 * Sits in `dom/` because it is the join between `data/` (the network) and `sim/`
 * (the rules), and two different screens need it: neither may import the other.
 */

import { describeWhen, fetchSpaceWeather, lastDetail, lastSource } from '../data/spaceweather';
import { createForecast, type ForecastEvent } from '../sim/forecast';

export interface LoadedForecast {
  readonly forecast: readonly ForecastEvent[];
  /** `donki` for live NASA flares, `fallback` for famous past ones. */
  readonly source: 'donki' | 'fallback';
  /** One sentence about how the numbers were found. */
  readonly detail: string;
}

/** Fetch the flares and build the forecast. Never rejects. */
export async function loadForecast(signal?: AbortSignal): Promise<LoadedForecast> {
  const flares = await fetchSpaceWeather({ signal });
  const forecast = createForecast(
    flares.map((flare) => ({
      classType: flare.classType,
      approximate: flare.approximate,
      when: describeWhen(flare.peakTime),
    })),
  );

  return { forecast, source: lastSource(), detail: lastDetail() };
}
