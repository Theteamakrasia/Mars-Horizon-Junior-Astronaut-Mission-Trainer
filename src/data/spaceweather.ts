/**
 * Real solar flares from NASA's DONKI space-weather database.
 *
 * The ONLY place in the project allowed to call `fetch`. `npm run check` fails
 * the build on network access anywhere else, so failures and fallbacks are
 * handled in one file rather than scattered.
 *
 * How it reaches DONKI: through `api.nasa.gov/DONKI/FLR`, the NASA API portal's
 * front for the same database. That host is the one the repo already verified as
 * browser-callable (it answers with a correct CORS header), which sidesteps the
 * unverified `ccmc.gsfc.nasa.gov` path (ISS-008). The response SHAPE below is
 * written from NASA's published schema and a sample in a third-party repo, and
 * has NOT been seen on the wire from this project — the tests say so.
 *
 * What the player is promised: the screen is told where the numbers came from.
 * Every failure — slow, throttled, offline, malformed, or a quiet month with no
 * flares — resolves to famous flares from the record, marked `approximate`.
 */

/** One flare, as the game uses it. */
export interface SpaceWeatherEvent {
  readonly kind: 'flare';
  /** NASA's class: a letter (C, M, X) and a number, e.g. `M4.2`. */
  readonly classType: string;
  /** ISO 8601 peak time. */
  readonly peakTime: string;
  /** True when this came from baked-in history rather than a live reading. */
  readonly approximate: boolean;
}

/** Where the data came from, so the UI can be honest about it. */
export type SpaceWeatherSource = 'donki' | 'fallback';

/**
 * Famous flares, from the public record. Used when the live call cannot supply
 * any, and marked approximate so the debrief says so.
 */
export const FALLBACK_FLARES: readonly SpaceWeatherEvent[] = [
  { kind: 'flare', classType: 'X5.8', peakTime: '2024-05-11T01:23:00Z', approximate: true },
  { kind: 'flare', classType: 'X9.3', peakTime: '2017-09-06T12:02:00Z', approximate: true },
];

const DONKI_FLARES_URL = 'https://api.nasa.gov/DONKI/FLR';
const DEFAULT_TIMEOUT_MS = 4000;
const LOOKBACK_DAYS = 30;

export interface FetchOptions {
  readonly signal?: AbortSignal;
  /** Injected so tests never touch the network. */
  readonly fetchFn?: typeof fetch;
  readonly now?: Date;
  readonly timeoutMs?: number;
  /** Injected so a test can pin the key; real runs read `VITE_NASA_API_KEY`. */
  readonly apiKey?: string;
}

let source: SpaceWeatherSource = 'fallback';
let detail = 'No space-weather request has been made yet.';
let pending: Promise<readonly SpaceWeatherEvent[]> | null = null;

/** Which source the last fetch actually used. Drives the "approximate" label. */
export function lastSource(): SpaceWeatherSource {
  return source;
}

/** A sentence about how the last fetch went, for the debrief to show. */
export function lastDetail(): string {
  return detail;
}

/** Forget the remembered result. For tests. */
export function resetSpaceWeather(): void {
  pending = null;
  source = 'fallback';
  detail = 'No space-weather request has been made yet.';
}

/** The rank of a flare class, so the strongest can be picked. X beats M beats C. */
export function flareRank(classType: string): number {
  const letters = 'ABCMX';
  const letter = classType.trim().charAt(0).toUpperCase();
  const index = letters.indexOf(letter);
  const magnitude = Number.parseFloat(classType.trim().slice(1));

  return (index < 0 ? -1 : index) * 1000 + (Number.isFinite(magnitude) ? magnitude : 0);
}

/**
 * Pull flares out of a DONKI response.
 *
 * Validates every field rather than trusting the wire format. Anything that is
 * not an array of objects with a usable `classType` and `peakTime` is dropped,
 * and a response that is not an array at all yields nothing, which the caller
 * turns into the fallback.
 */
export function parseFlares(json: unknown): readonly SpaceWeatherEvent[] {
  if (!Array.isArray(json)) return [];

  const events: SpaceWeatherEvent[] = [];

  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    const classType = record.classType;
    const peakTime = record.peakTime ?? record.beginTime;

    if (typeof classType !== 'string' || !/^[A-Za-z]\d+(\.\d+)?$/.test(classType.trim())) continue;
    if (typeof peakTime !== 'string' || Number.isNaN(Date.parse(peakTime))) continue;

    events.push({ kind: 'flare', classType: classType.trim().toUpperCase(), peakTime, approximate: false });
  }

  return events;
}

/** The strongest `count` flares, strongest first. */
export function strongest(events: readonly SpaceWeatherEvent[], count: number): readonly SpaceWeatherEvent[] {
  return [...events].sort((a, b) => flareRank(b.classType) - flareRank(a.classType)).slice(0, count);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fetch the strongest recent flares.
 *
 * Returns parsed data, never a `Response`, so callers stay testable. Rejects
 * nothing: any failure resolves to the fallback flares, marked approximate. The
 * result is remembered so two screens asking cost one request.
 */
export function fetchSpaceWeather(options: FetchOptions = {}): Promise<readonly SpaceWeatherEvent[]> {
  if (pending !== null) return pending;

  pending = load(options);

  return pending;
}

async function load(options: FetchOptions): Promise<readonly SpaceWeatherEvent[]> {
  const fetchFn = options.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

  if (fetchFn === null) return useFallback('This browser cannot make the request.');

  const now = options.now ?? new Date();
  const start = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const key = options.apiKey ?? (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? 'DEMO_KEY';
  const url = `${DONKI_FLARES_URL}?startDate=${isoDate(start)}&endDate=${isoDate(now)}&api_key=${encodeURIComponent(key)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forward = (): void => controller.abort();

  options.signal?.addEventListener('abort', forward, { once: true });

  try {
    const response = await fetchFn(url, { signal: controller.signal });

    if (response.status === 429) return useFallback('NASA\u2019s shared key was busy, so we used famous past flares.');
    if (!response.ok) return useFallback(`NASA answered with an error (${response.status}).`);

    const events = strongest(parseFlares(await response.json()), 2);

    if (events.length === 0) {
      return useFallback('No flares were reported in the last 30 days, so we used famous past flares.');
    }

    source = 'donki';
    detail = 'Live flares from NASA\u2019s DONKI space-weather database, last 30 days.';

    return events;
  } catch {
    return useFallback('NASA could not be reached, so we used famous past flares.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forward);
  }
}

function useFallback(reason: string): readonly SpaceWeatherEvent[] {
  source = 'fallback';
  detail = reason;

  return FALLBACK_FLARES;
}

/** A flare's date as a child can read it, e.g. `11 May 2024`. */
export function describeWhen(peakTime: string): string {
  const date = new Date(peakTime);

  if (Number.isNaN(date.getTime())) return 'recently';

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
