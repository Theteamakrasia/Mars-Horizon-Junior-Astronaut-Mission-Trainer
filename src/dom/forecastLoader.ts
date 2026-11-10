/**
 * Turns real space-weather data into the run's forecast.
 *
 * Sits in `dom/` because it is the join between `data/` (the network) and `sim/`
 * (the rules), and two different screens need it: neither may import the other.
 */

import {
  describeWhen,
  fetchSpaceWeather,
  lastDetail,
  lastSource,
  type SpaceWeatherSource,
} from '../data/spaceweather';
import { createForecast, type ForecastEvent } from '../sim/forecast';
import { NEUTRAL_SCORE } from '../sim/regions';

export interface LoadedForecast {
  readonly forecast: readonly ForecastEvent[];
  /** `donki` for live NASA flares, `noaa` for live NOAA flares, `fallback` when neither answered. */
  readonly source: SpaceWeatherSource;
  /** One sentence about how the numbers were found. */
  readonly detail: string;
}

/**
 * Fetch the flares and build the forecast. Never rejects.
 *
 * `seed` picks the mission's timetable. Leave it out and the run is given the
 * current time, so every new mission plays out differently. A test can pin a
 * number instead and get exactly one timetable back. `dustScore` is the landing
 * site's, because a dustier site gets more dust storms.
 */
export async function loadForecast(
  signal?: AbortSignal,
  seed: number = Date.now(),
  dustScore: number = NEUTRAL_SCORE.dust,
): Promise<LoadedForecast> {
  const flares = await fetchSpaceWeather({ signal });
  const forecast = createForecast(
    flares.map((flare) => ({
      classType: flare.classType,
      approximate: flare.approximate,
      when: `on ${describeWhen(flare.peakTime)}`,
    })),
    seed,
    dustScore,
  );

  return { forecast, source: lastSource(), detail: lastDetail() };
}
