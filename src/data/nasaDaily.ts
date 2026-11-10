/**
 * NASA's Astronomy Picture of the Day, live.
 *
 * Decision D-050: this is an **enrichment layer on top of** the curated
 * gallery in `nasaGallery.ts`, never a replacement. D-042 rejected a runtime
 * NASA image API because a second flaky endpoint could cost the game its
 * teaching moment; that reasoning still holds, so the curated gallery stays
 * the guaranteed layer and this one only ever adds to it.
 *
 * The pattern is the one D-037 already proved for space weather: **NASA → the
 * saved gallery**, with the source always reported so the screen can be honest
 * about what the player is looking at.
 *
 * The ONLY place in the project allowed to call `fetch` (R-8). Failures —
 * throttled, slow, offline, malformed, or a quiet month — all resolve to "no
 * live facts", and the screen draws a saved NASA card instead.
 */

import { factFor } from './nasaGallery';

const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const DEFAULT_TIMEOUT_MS = 4000;
const MAX_FACTS = 12;
/** The longest explanation a child is asked to read. */
const MAX_TEXT = 240;

/** One picture and its story, ready to draw. */
export interface DailyFact {
  /** NASA's headline for the picture. */
  readonly title: string;
  /** The explanation, cut to something a child can read. */
  readonly text: string;
  /** NASA's own credit line, exactly as published. `NASA` when there is none. */
  readonly credit: string;
  /** The picture, or null when NASA sent a video and no thumbnail. */
  readonly imageUrl: string | null;
  /** The date NASA published it, e.g. `2026-11-10`. */
  readonly date: string;
  /** The APOD page for this entry. */
  readonly sourceUrl: string;
}

/** Where the facts came from, so the screen can say so. */
export type DailyFactSource = 'apod' | 'saved';

export interface FetchOptions {
  readonly signal?: AbortSignal;
  /** Injected so tests never touch the network. */
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
  /** Injected so a test can pin the key; real runs read `VITE_NASA_API_KEY`. */
  readonly apiKey?: string;
}

let source: DailyFactSource = 'saved';
let detail = 'No daily picture has been asked for yet.';
let pending: Promise<readonly DailyFact[]> | null = null;

/** Which source the last request actually used. */
export function lastDailySource(): DailyFactSource {
  return source;
}

/** A sentence about how the last request went, for the screen to show. */
export function lastDailyDetail(): string {
  return detail;
}

/** Forget the remembered result. For tests. */
export function resetDailyFacts(): void {
  pending = null;
  source = 'saved';
  detail = 'No daily picture has been asked for yet.';
}

/**
 * Cut NASA's explanation down to something a child can read.
 *
 * APOD's text is written for adults, is often several paragraphs long, and
 * ends with a teaser for tomorrow's picture. This flattens the whitespace,
 * drops the teaser, and stops on a sentence or a word — never mid-word.
 */
export function cleanExplanation(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  /* APOD ends the explanation with tomorrow's teaser. The apostrophe has been
     seen both ways round, so match either. */
  const cut = (flat.split(/Tomorrow['’]s picture/i)[0] ?? flat).trim();

  if (cut.length === 0) return '';
  if (cut.length <= MAX_TEXT) return cut;

  const chopped = cut.slice(0, MAX_TEXT);

  /* Prefer ending on a full stop, but only if that keeps most of the text. */
  const stops = ['. ', '! ', '? '].map((mark) => chopped.lastIndexOf(mark)).filter((at) => at > 0);
  const lastStop = stops.length > 0 ? Math.max(...stops) : -1;

  if (lastStop > MAX_TEXT / 2) return `${chopped.slice(0, lastStop + 1).trim()}`;

  const lastSpace = chopped.lastIndexOf(' ');

  return `${(lastSpace > 0 ? chopped.slice(0, lastSpace) : chopped).trim()}\u2026`;
}

/**
 * Turn one APOD entry into a fact, or drop it.
 *
 * Every field is checked rather than trusted: an entry without a title or
 * without an explanation is not a lesson, and a broken picture must not take
 * the words down with it.
 */
function toFact(record: Record<string, unknown>): DailyFact | null {
  const title = record.title;
  const explanation = record.explanation;
  const date = record.date;

  if (typeof title !== 'string' || title.trim().length === 0) return null;
  if (typeof explanation !== 'string' || explanation.trim().length === 0) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;

  const mediaType = typeof record.media_type === 'string' ? record.media_type : 'image';
  const url = typeof record.url === 'string' ? record.url : null;
  const hdurl = typeof record.hdurl === 'string' ? record.hdurl : null;
  const thumbnail = typeof record.thumbnail_url === 'string' ? record.thumbnail_url : null;
  const copyright = typeof record.copyright === 'string' ? record.copyright.trim() : '';

  /* A video entry's `url` is an embed page, not a picture. */
  const imageUrl = mediaType === 'image' ? (url ?? hdurl) : thumbnail;

  return {
    title: title.trim(),
    text: cleanExplanation(explanation),
    credit: copyright.length > 0 ? copyright : 'NASA',
    imageUrl,
    date: date.trim(),
    sourceUrl: `https://apod.nasa.gov/apod/ap${date.trim().replace(/-/g, '')}.html`,
  };
}

/**
 * Pull the pictures out of an APOD response.
 *
 * The `search=Mars` endpoint answers with a flat array of entries. Anything
 * that is not an object with a usable title, explanation and date is dropped,
 * and a response that is not an array at all yields nothing, which the caller
 * turns into the saved gallery.
 */
export function parseApod(json: unknown): readonly DailyFact[] {
  if (!Array.isArray(json)) return [];

  const facts: DailyFact[] = [];

  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue;

    const fact = toFact(item as Record<string, unknown>);

    if (fact !== null) facts.push(fact);
  }

  return facts;
}

/**
 * Fetch NASA's Mars pictures of the day.
 *
 * Returns parsed data, never a `Response`, so callers stay testable. Rejects
 * nothing: a failure resolves to an empty list, and the screen shows a saved
 * NASA card with an honest line saying why. The result is remembered, so the
 * act screen and the debrief cost one request between them.
 */
export function fetchDailyFacts(options: FetchOptions = {}): Promise<readonly DailyFact[]> {
  if (pending !== null) return pending;

  pending = load(options).then((facts) => {
    if (options.signal?.aborted) pending = null;
    return facts;
  });

  return pending;
}

async function load(options: FetchOptions): Promise<readonly DailyFact[]> {
  const fetchFn = options.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

  if (fetchFn === null) return useSaved('This browser cannot make the request.');

  const key = options.apiKey ?? (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? 'DEMO_KEY';
  const url = `${APOD_URL}?search=Mars&thumbs=true&api_key=${encodeURIComponent(key)}`;
  const result = await requestJson(fetchFn, url, options);

  if (!result.ok) return useSaved(describeFailure(result.reason));

  const facts = parseApod(result.json).slice(0, MAX_FACTS);

  if (facts.length === 0) return useSaved('NASA had no Mars pictures to show.');

  source = 'apod';
  detail = `Live pictures from NASA's Astronomy Picture of the Day, ${facts.length} of them.`;

  return facts;
}

/**
 * One request with its own timeout, forwarding the caller's abort signal.
 * Never throws: a failure becomes a reason the screen can explain.
 */
async function requestJson(
  fetchFn: typeof fetch,
  url: string,
  options: FetchOptions,
): Promise<{ readonly ok: true; readonly json: unknown } | { readonly ok: false; readonly reason: string }> {
  if (options.signal?.aborted) return { ok: false, reason: 'offline' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forward = (): void => controller.abort();

  options.signal?.addEventListener('abort', forward, { once: true });

  try {
    const response = await fetchFn(url, { signal: controller.signal });

    if (response.status === 429) return { ok: false, reason: 'throttled' };
    if (!response.ok) return { ok: false, reason: 'error' };

    return { ok: true, json: await response.json() };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forward);
  }
}

/** What went wrong, in the words the screen shows. */
function describeFailure(reason: string): string {
  switch (reason) {
    case 'throttled':
      return 'NASA\u2019s shared key was busy, so we used a saved NASA picture instead.';
    case 'timeout':
      return 'NASA did not answer in time, so we used a saved NASA picture instead.';
    case 'offline':
      return 'We could not reach NASA, so we used a saved NASA picture instead.';
    default:
      return 'NASA answered with an error, so we used a saved NASA picture instead.';
  }
}

function useSaved(reason: string): readonly DailyFact[] {
  source = 'saved';
  detail = reason;

  return [];
}

/**
 * A saved fact for the sol, used when the live feed is not answering.
 *
 * Kept here rather than in the view so the fallback is one call: the screen
 * asks for a fact for a sol and always gets one.
 */
export function savedFactFor(sol: number): DailyFact {
  const fact = factFor(sol);

  return {
    title: 'A NASA fact',
    text: fact.text,
    credit: fact.credit,
    imageUrl: null,
    date: '',
    sourceUrl: 'https://www.nasa.gov/',
  };
}
