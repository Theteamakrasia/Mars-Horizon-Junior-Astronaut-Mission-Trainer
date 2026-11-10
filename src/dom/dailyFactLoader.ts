/**
 * The join between NASA's live daily pictures and the screens that show them.
 *
 * It lives in `dom/` for the same reason `forecastLoader.ts` does: two screens
 * want this feed — `act` and `debrief` — and a feature may never import
 * another feature (R-5), so the shared part cannot live in either one.
 *
 * Like the space-weather loader, it never rejects. A failed request resolves
 * to the saved gallery, and the loader says so, so the screen can be honest
 * about what the player is looking at.
 */

import { fetchDailyFacts, lastDailyDetail, lastDailySource, type DailyFact, type DailyFactSource } from '../data/nasaDaily';

export interface LoadedDailyFacts {
  /** The live facts, newest first. Empty when NASA did not answer. */
  readonly facts: readonly DailyFact[];
  /** Where they came from. */
  readonly source: DailyFactSource;
  /** One sentence about how that was decided. */
  readonly detail: string;
}

/**
 * Fetch NASA's daily pictures.
 *
 * One request per session: the result is remembered inside `data/nasaDaily.ts`,
 * so the act screen and the debrief cost one request between them.
 */
export async function loadDailyFacts(signal?: AbortSignal): Promise<LoadedDailyFacts> {
  const facts = await fetchDailyFacts({ signal });

  return { facts, source: lastDailySource(), detail: lastDailyDetail() };
}
