import { beforeEach, describe, expect, it } from 'vitest';

import {
  cleanExplanation,
  fetchDailyFacts,
  lastDailyDetail,
  lastDailySource,
  parseApod,
  resetDailyFacts,
  savedFactFor,
} from './nasaDaily';

/*
 * NOTE ON WHAT THESE TESTS PROVE. The APOD fixtures follow the shape NASA's
 * Astronomy Picture of the Day endpoint documents, and the plain (non-search)
 * endpoint HAS been seen answering with that shape. The `search=Mars` variant
 * this project actually calls has NOT been seen answering successfully — the
 * shared key returned 429 on every attempt while this was written.
 *
 * What is tested here is our parsing, our cleaning and our fallback chain, not
 * that NASA's search filter returns exactly this list.
 */

function respond(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response) as typeof fetch;
}

/** The APOD shape, as documented and as seen from the plain endpoint. */
const APOD_SAMPLE = [
  {
    date: '2026-11-10',
    explanation:
      'Sometimes Saturn disappears. It does not really go away, of course -- it just disappears from our view when the Earth Moon moves in front of it.',
    media_type: 'image',
    service_version: 'v1',
    title: 'A Saturnian eclipse',
    url: 'https://apod.nasa.gov/apod/image/2611/mars_rover.jpg',
    hdurl: 'https://apod.nasa.gov/apod/image/2611/mars_rover_hd.jpg',
    copyright: 'NASA/JPL-Caltech',
  },
  {
    date: '2026-11-08',
    explanation: 'A dust devil on the Martian surface.\n\nIt is about 20 metres tall.',
    media_type: 'image',
    title: 'Dust devil on Mars',
    url: 'https://apod.nasa.gov/apod/image/2611/dust_devil.jpg',
  },
  {
    date: '2026-11-05',
    explanation: 'A video of the Martian surface.',
    media_type: 'video',
    title: 'A day on Mars',
    url: 'https://apod.nasa.gov/apod/v/2611/mars_day.html',
    thumbnail_url: 'https://apod.nasa.gov/apod/image/2611/mars_day.jpg',
    copyright: 'Someone Else',
  },
];

describe('parsing APOD', () => {
  it('keeps a well-formed entry', () => {
    const facts = parseApod(APOD_SAMPLE);

    expect(facts).toHaveLength(3);
    expect(facts[0]?.title).toBe('A Saturnian eclipse');
    expect(facts[0]?.date).toBe('2026-11-10');
    expect(facts[0]?.credit).toBe('NASA/JPL-Caltech');
    expect(facts[0]?.imageUrl).toContain('mars_rover.jpg');
  });

  it('credits NASA when the entry has no copyright line', () => {
    expect(parseApod(APOD_SAMPLE)[1]?.credit).toBe('NASA');
  });

  it('uses the thumbnail for a video, because a video url is not a picture', () => {
    const video = parseApod(APOD_SAMPLE)[2];

    expect(video?.imageUrl).toContain('mars_day.jpg');
    expect(video?.imageUrl).not.toContain('mars_day.html');
  });

  it('drops an entry with no title, no explanation or no date', () => {
    const broken = [
      { title: '', explanation: 'text', date: '2026-11-10' },
      { title: 'Title', explanation: '   ', date: '2026-11-10' },
      { title: 'Title', explanation: 'text', date: '10 November 2026' },
      { title: 'Title', explanation: 'text' },
      'not an object',
      null,
    ];

    expect(parseApod(broken)).toHaveLength(0);
  });

  it('yields nothing for a response that is not an array', () => {
    expect(parseApod({ message: 'API_KEY_INVALID' })).toHaveLength(0);
    expect(parseApod(null)).toHaveLength(0);
    expect(parseApod('nope')).toHaveLength(0);
  });
});

describe('cleaning the explanation', () => {
  it('flattens the whitespace APOD uses for its paragraph breaks', () => {
    expect(cleanExplanation('A dust devil.\n\nIt is tall.')).toBe('A dust devil. It is tall.');
  });

  it('drops the teaser for tomorrow picture', () => {
    const cleaned = cleanExplanation('Mars is red. Tomorrow’s picture:\t\t\t\t\t\t');

    expect(cleaned).toBe('Mars is red.');
  });

  it('keeps a short explanation whole', () => {
    expect(cleanExplanation('Mars is red.')).toBe('Mars is red.');
  });

  it('cuts a long explanation on a word, never mid-word', () => {
    const long = `${'The rover found something interesting. '.repeat(20)}`;

    const cleaned = cleanExplanation(long);

    expect(cleaned.length).toBeLessThanOrEqual(241);
    expect(cleaned.endsWith('interesting.')).toBe(true);
  });

  it('never returns an empty string for an empty explanation', () => {
    expect(cleanExplanation('')).toBe('');
  });
});

describe('fetching the daily pictures', () => {
  beforeEach(() => {
    resetDailyFacts();
  });

  it('reports the live source when NASA answers', async () => {
    const facts = await fetchDailyFacts({ fetchFn: respond(200, APOD_SAMPLE) });

    expect(facts).toHaveLength(3);
    expect(lastDailySource()).toBe('apod');
    expect(lastDailyDetail()).toContain('Astronomy Picture of the Day');
  });

  it('falls back to the saved gallery when NASA is throttled', async () => {
    const facts = await fetchDailyFacts({ fetchFn: respond(429, { error: 'OVER_RATE_LIMIT' }) });

    expect(facts).toHaveLength(0);
    expect(lastDailySource()).toBe('saved');
    expect(lastDailyDetail()).toContain('shared key was busy');
  });

  it('falls back to the saved gallery when NASA answers with an error', async () => {
    await fetchDailyFacts({ fetchFn: respond(500, {}) });

    expect(lastDailySource()).toBe('saved');
    expect(lastDailyDetail()).toContain('answered with an error');
  });

  it('falls back to the saved gallery when the browser cannot reach NASA', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    await fetchDailyFacts({ fetchFn: offline });

    expect(lastDailySource()).toBe('saved');
    expect(lastDailyDetail()).toContain('could not reach NASA');
  });

  it('falls back to the saved gallery when NASA sends nothing usable', async () => {
    await fetchDailyFacts({ fetchFn: respond(200, [{ title: 'No date here', explanation: 'text' }]) });

    expect(lastDailySource()).toBe('saved');
    expect(lastDailyDetail()).toContain('no Mars pictures');
  });

  it('asks NASA only once, so two screens cost one request', async () => {
    let calls = 0;

    const counting = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => APOD_SAMPLE } as Response;
    }) as unknown as typeof fetch;

    await fetchDailyFacts({ fetchFn: counting });
    await fetchDailyFacts({ fetchFn: counting });

    expect(calls).toBe(1);
  });

  it('always has a saved fact to fall back on', () => {
    const saved = savedFactFor(3);

    expect(saved.text.length).toBeGreaterThan(0);
    expect(saved.credit.length).toBeGreaterThan(0);
    expect(saved.imageUrl).toBeNull();
  });
});
