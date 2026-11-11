/**
 * Real solar flares, live from space-weather services.
 *
 * The ONLY place in the project allowed to call `fetch`. `npm run check` fails
 * the build on network access anywhere else, so failures and fallbacks are
 * handled in one file rather than scattered.
 *
 * Two live sources, tried in order:
 *
 *   1. NASA's DONKI database, through `api.nasa.gov/DONKI/FLR`. This is the
 *      source the project promises, and the NASA API portal is the host the repo
 *      verified as browser-callable (it answers with a correct CORS header),
 *      which sidesteps the unverified `ccmc.gsfc.nasa.gov` path (ISS-008).
 *   2. NOAA SWPC's GOES X-ray flare feed, `services.swpc.noaa.gov`. It sends
 *      `Access-Control-Allow-Origin: *` and is what the measurements behind
 *      DONKI actually come from. It is here because DONKI has been returning
 *      503 and rate-limiting the shared `DEMO_KEY` (ISS-008, ISS-009) — without
 *      a second source the game would show baked-in history on demo night.
 *
 * What the player is promised: the screen is told where the numbers came from.
 * Every failure — slow, throttled, offline, malformed, or a quiet month with no
 * flares — resolves to an empty list, and `sim/forecast.ts` then draws typical
 * flares from the long-run NOAA record, marked `approximate`.
 *
 * The DONKI success shape is written from NASA's published schema and has NOT
 * been seen on the wire from this project. The NOAA shape HAS been seen and is
 * covered by tests. Both are validated field by field rather than trusted.
 */

/** One flare, as the game uses it. */
export interface SpaceWeatherEvent {
  readonly kind: 'flare';
  /** The flare class: a letter (B, C, M, X) and a number, e.g. `M4.2`. */
  readonly classType: string;
  /** ISO 8601 time of the flare's peak. */
  readonly peakTime: string;
  /** True when this came from baked-in history rather than a live reading. */
  readonly approximate: boolean;
}

/** Where the data came from, so the UI can be honest about it. */
export type SpaceWeatherSource = 'donki' | 'noaa' | 'fallback';

/**
 * What the live call returns when it cannot supply any flares.
 *
 * Empty on purpose. A short baked-in list would hand every offline player the same
 * two flares. An empty list makes the forecast draw from the long-run record of
 * how often M and X flares really happen, and mark them approximate.
 */
export const FALLBACK_FLARES: readonly SpaceWeatherEvent[] = [];

const DONKI_FLARES_URL = 'https://api.nasa.gov/DONKI/FLR';
const NOAA_FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json';
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

/** Why one source had nothing useful. Text is built by `describeFailure`. */
type FailReason = 'throttled' | 'error' | 'offline' | 'timeout' | 'empty';

interface Fail {
  readonly ok: false;
  readonly reason: FailReason;
  readonly status?: number;
}

interface SourceAnswer {
  readonly ok: true;
  readonly events: readonly SpaceWeatherEvent[];
}

type Attempt = SourceAnswer | Fail;

interface RequestOk {
  readonly ok: true;
  readonly json: unknown;
}

type RequestResult = RequestOk | Fail;

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

/**
 * Validate one flare record and turn it into an event, or drop it.
 *
 * Shared by both parsers so neither can drift into trusting a bare field.
 */
function toEvent(classType: unknown, peakTime: unknown): SpaceWeatherEvent | null {
  if (typeof classType !== 'string' || !/^[A-Za-z]\d+(\.\d+)?$/.test(classType.trim())) return null;
  if (typeof peakTime !== 'string' || Number.isNaN(Date.parse(peakTime))) return null;

  return { kind: 'flare', classType: classType.trim().toUpperCase(), peakTime, approximate: false };
}

/**
 * Pull flares out of a DONKI response.
 *
 * Anything that is not an array of objects with a usable `classType` and
 * `peakTime` is dropped, and a response that is not an array at all yields
 * nothing, which the caller turns into the next source or the fallback.
 */
export function parseFlares(json: unknown): readonly SpaceWeatherEvent[] {
  if (!Array.isArray(json)) return [];

  const events: SpaceWeatherEvent[] = [];

  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    const event = toEvent(record.classType, record.peakTime ?? record.beginTime);

    if (event !== null) events.push(event);
  }

  return events;
}

/**
 * Pull flares out of a NOAA SWPC GOES X-ray flare feed.
 *
 * The feed is one flat array of flare records. `max_class` and `max_time` are
 * the peak reading; a flare still in progress has `end_class: null` and an
 * `end_time` of `"Unk"`, both of which are dropped by validation. The feed
 * covers about seven days, which is why the detail sentence says seven.
 */
export function parseNoaaFlares(json: unknown): readonly SpaceWeatherEvent[] {
  if (!Array.isArray(json)) return [];

  const events: SpaceWeatherEvent[] = [];

  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    const classType = record.max_class ?? record.begin_class ?? record.end_class;
    const peakTime = record.max_time ?? record.begin_time ?? record.time_tag;
    const event = toEvent(classType, peakTime);

    if (event !== null) events.push(event);
  }

  return events;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fetch every flare from the last 30 days.
 *
 * Returns parsed data, never a `Response`, so callers stay testable. Rejects
 * nothing: NASA, then NOAA, then the (empty) fallback. The result is remembered
 * so two screens asking cost one request — unless the caller aborted, in which
 * case nothing is remembered and the next screen gets a real answer.
 *
 * All of them are kept, not just the strongest: the forecast draws each mission's
 * flares from this list, so an active month gives harder missions and a quiet one
 * gives gentler missions, which is what the real Sun is doing.
 */
export function fetchSpaceWeather(options: FetchOptions = {}): Promise<readonly SpaceWeatherEvent[]> {
  if (pending !== null) return pending;

  pending = load(options).then((events) => {
    if (options.signal?.aborted) pending = null;
    return events;
  });

  return pending;
}

async function load(options: FetchOptions): Promise<readonly SpaceWeatherEvent[]> {
  const fetchFn = options.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

  if (fetchFn === null) return useFallback('This browser cannot make the request.');

  const now = options.now ?? new Date();
  const start = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const key = options.apiKey ?? (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? 'DEMO_KEY';
  const donkiUrl = `${DONKI_FLARES_URL}?startDate=${isoDate(start)}&endDate=${isoDate(now)}&api_key=${encodeURIComponent(key)}`;

  const nasa = await trySource(fetchFn, donkiUrl, options, parseFlares);

  if (nasa.ok) {
    source = 'donki';
    detail = 'Live flares from NASA\u2019s DONKI space-weather database, last 30 days.';

    return nasa.events;
  }

  const noaa = await trySource(fetchFn, NOAA_FLARES_URL, options, parseNoaaFlares);

  if (noaa.ok) {
    source = 'noaa';
    detail = 'Live flares from NOAA\u2019s space-weather centre, last 7 days.';

    return noaa.events;
  }

  return useFallback(explain(nasa, noaa));
}

/** Ask one source, parse what comes back, and keep every flare it reported. */
async function trySource(
  fetchFn: typeof fetch,
  url: string,
  options: FetchOptions,
  parse: (json: unknown) => readonly SpaceWeatherEvent[],
): Promise<Attempt> {
  const result = await requestJson(fetchFn, url, options);

  if (!result.ok) return result;

  const events = parse(result.json);

  if (events.length === 0) return { ok: false, reason: 'empty' };

  return { ok: true, events };
}

/**
 * One request with its own timeout, forwarding the caller's abort signal.
 * Never throws: a failure becomes a reason the debrief can explain.
 */
async function requestJson(
  fetchFn: typeof fetch,
  url: string,
  options: FetchOptions,
): Promise<RequestResult> {
  if (options.signal?.aborted) return { ok: false, reason: 'offline' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forward = (): void => controller.abort();

  options.signal?.addEventListener('abort', forward, { once: true });

  try {
    const response = await fetchFn(url, { signal: controller.signal });

    if (response.status === 429) return { ok: false, reason: 'throttled' };
    if (!response.ok) return { ok: false, reason: 'error', status: response.status };

    return { ok: true, json: await response.json() };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forward);
  }
}

/** Turn two failed sources into one child-readable sentence. */
function explain(nasa: Fail, noaa: Fail): string {
  if (nasa.reason === 'empty' && noaa.reason === 'empty') {
    return 'No flares were reported by NASA or NOAA, so we used the long-run flare record.';
  }

  return `${describeFailure('NASA', nasa)}, and ${describeFailure('NOAA', noaa)}, so we used the long-run flare record.`;
}

/** What went wrong, in the words the debrief shows. */
function describeFailure(name: string, failure: Fail): string {
  switch (failure.reason) {
    case 'throttled':
      return name === 'NASA' ? 'NASA\u2019s shared key was busy' : `${name} asked us to slow down`;
    case 'error':
      return `${name} answered with an error (${failure.status})`;
    case 'timeout':
      return `${name} did not answer in time`;
    case 'empty':
      return `${name} reported no flares`;
    default:
      return `${name} could not be reached`;
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

/**
 * How strong a flare class is, so the readings can be ordered.
 *
 * NASA classes run A, B, C, M, X — each letter ten times stronger than the one
 * before it — and the number after the letter is the strength inside the band:
 * `M4.2` is stronger than `M1.0`. A class that cannot be read scores zero, so
 * an unreadable record sorts last rather than throwing.
 */
function classStrength(classType: string): number {
  const match = /^([A-Za-z])(\d+(?:\.\d+)?)$/.exec(classType.trim());

  if (match === null) return 0;

  const letters = ['A', 'B', 'C', 'M', 'X'];
  const band = letters.indexOf(match[1]?.toUpperCase() ?? '');

  if (band < 0) return 0;

  return (band + 1) * 10 + Number(match[2]);
}

/**
 * The strongest readings, biggest first.
 *
 * A live feed can carry dozens of flares from the last month, and a screen that
 * lists all of them is a screen nobody reads. This takes the few that matter
 * and leaves the order alone for everything else.
 */
export function strongestFlares(flares: readonly SpaceWeatherEvent[], count = 4): readonly SpaceWeatherEvent[] {
  return [...flares].sort((a, b) => classStrength(b.classType) - classStrength(a.classType)).slice(0, Math.max(0, count));
}
