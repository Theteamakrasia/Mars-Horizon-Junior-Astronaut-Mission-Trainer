/**
 * STUB — not implemented. Every export here throws.
 *
 * The ONLY place in the project allowed to call `fetch` or open a socket.
 * `npm run check` fails the build on network access anywhere else, so failures
 * and fallbacks are handled in one file rather than scattered.
 *
 * BLOCKED — do not build the live client yet:
 *   ISS-008  DONKI's CORS behaviour is unverified. ccmc.gsfc.nasa.gov could not
 *            be reached from the development environment, so no
 *            Access-Control-Allow-Origin header has ever been observed. If DONKI
 *            sends no ACAO header a direct browser fetch fails at runtime — in
 *            front of judges, on Nov 14.
 *            One person opening DONKI in a real browser with devtools answers
 *            this in two minutes. Until then baked-in data is the correct
 *            choice, not a fallback.
 *   ISS-006  .gitignore does not ignore .env*. Do not create a .env.local in
 *            this public repository until that is fixed.
 *
 * api.nasa.gov IS verified: DEMO_KEY returned 200 with a correct CORS header.
 * But it is shared and rate-limited (ISS-009), so it must degrade rather than
 * show an empty screen.
 */

/** One piece of space weather, as the game uses it. */
export interface SpaceWeatherEvent {
  readonly sol: number;
  readonly kind: 'flare' | 'cme' | 'none';
  readonly summary: string;
  /**
   * True when this came from baked-in fallback data rather than a live source.
   * Must reach the player. The README promises approximations are labelled.
   */
  readonly approximate: boolean;
}

/** Where the data came from, so the UI can be honest about it. */
export type SpaceWeatherSource = 'donki' | 'nasa-api' | 'fallback';

/**
 * Fetch space weather for the coming sols.
 *
 * Returns parsed data, never a `Response` — callers stay testable that way.
 * Rejects nothing: a failure resolves to fallback data marked `approximate`.
 */
export async function fetchSpaceWeather(
  _signal?: AbortSignal,
): Promise<readonly SpaceWeatherEvent[]> {
  throw new Error(
    'STUB: data/spaceweather.ts is not implemented, and the DONKI path is blocked on ISS-008.',
  );
}

/** Which source the last fetch actually used. Drives the "approximate" label. */
export function lastSource(): SpaceWeatherSource {
  throw new Error('STUB: data/spaceweather.ts is not implemented.');
}