import { beforeEach, describe, expect, it } from 'vitest';

import {
  FALLBACK_FLARES,
  describeWhen,
  fetchSpaceWeather,
  flareRank,
  lastDetail,
  lastSource,
  parseFlares,
  resetSpaceWeather,
  strongest,
} from './spaceweather';

/*
 * NOTE ON WHAT THESE TESTS PROVE. The fixtures below follow NASA's documented
 * DONKI flare schema, but this project has never seen a real response on the
 * wire. They test our parsing and our fallbacks, not that the live format
 * matches. "Wire format unverified" is the honest status.
 */

const NOW = new Date('2026-11-08T00:00:00Z');

function respond(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response) as typeof fetch;
}

const SAMPLE = [
  { flrID: 'a', classType: 'C3.0', peakTime: '2026-10-20T04:00Z' },
  { flrID: 'b', classType: 'M4.2', peakTime: '2026-10-25T09:30Z' },
  { flrID: 'c', classType: 'X1.1', peakTime: '2026-11-01T12:00Z' },
];

beforeEach(() => {
  resetSpaceWeather();
});

describe('parseFlares (wire format unverified)', () => {
  it('keeps flares with a valid class and time, and marks them as live', () => {
    const events = parseFlares(SAMPLE);

    expect(events).toHaveLength(3);
    expect(events.every((event) => event.approximate === false)).toBe(true);
  });

  it('drops anything malformed rather than trusting it', () => {
    expect(parseFlares([{ classType: 'banana', peakTime: '2026-10-20T04:00Z' }])).toEqual([]);
    expect(parseFlares([{ classType: 'M1.0', peakTime: 'not a date' }])).toEqual([]);
    expect(parseFlares([null, 7, 'x'])).toEqual([]);
  });

  it('turns a response that is not a list into nothing', () => {
    expect(parseFlares({ error: 'nope' })).toEqual([]);
    expect(parseFlares(null)).toEqual([]);
  });

  it('falls back to the begin time when no peak time is given', () => {
    expect(parseFlares([{ classType: 'M1.0', beginTime: '2026-10-20T04:00Z' }])).toHaveLength(1);
  });
});

describe('ranking', () => {
  it('ranks X above M above C, and a bigger number above a smaller one', () => {
    expect(flareRank('X1.0')).toBeGreaterThan(flareRank('M9.9'));
    expect(flareRank('M9.9')).toBeGreaterThan(flareRank('C9.9'));
    expect(flareRank('M5.0')).toBeGreaterThan(flareRank('M4.2'));
  });

  it('picks the strongest two, strongest first', () => {
    expect(strongest(parseFlares(SAMPLE), 2).map((event) => event.classType)).toEqual(['X1.1', 'M4.2']);
  });
});

describe('fetchSpaceWeather (no network: fetch is injected)', () => {
  it('returns the strongest live flares and says the source was DONKI', async () => {
    const events = await fetchSpaceWeather({ fetchFn: respond(200, SAMPLE), now: NOW });

    expect(events.map((event) => event.classType)).toEqual(['X1.1', 'M4.2']);
    expect(lastSource()).toBe('donki');
    expect(events[0].approximate).toBe(false);
  });

  it('asks for the 30 days before now, with the key in the URL', async () => {
    let seen = '';
    const spy = (async (url: string) => {
      seen = url;
      return { ok: true, status: 200, json: async () => SAMPLE } as Response;
    }) as unknown as typeof fetch;

    await fetchSpaceWeather({ fetchFn: spy, now: NOW, apiKey: 'TESTKEY' });

    expect(seen).toContain('startDate=2026-10-09');
    expect(seen).toContain('endDate=2026-11-08');
    expect(seen).toContain('api_key=TESTKEY');
  });

  it('falls back, marked approximate, when throttled', async () => {
    const events = await fetchSpaceWeather({ fetchFn: respond(429, {}), now: NOW });

    expect(events).toEqual(FALLBACK_FLARES);
    expect(events.every((event) => event.approximate)).toBe(true);
    expect(lastSource()).toBe('fallback');
    expect(lastDetail()).toContain('busy');
  });

  it('falls back on a server error', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(500, {}), now: NOW })).toEqual(FALLBACK_FLARES);
  });

  it('falls back when offline', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    expect(await fetchSpaceWeather({ fetchFn: offline, now: NOW })).toEqual(FALLBACK_FLARES);
    expect(lastDetail()).toContain('could not be reached');
  });

  it('falls back when the response is garbage', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(200, 'garbage'), now: NOW })).toEqual(FALLBACK_FLARES);
  });

  it('falls back, and says why, in a quiet month with no flares', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(200, []), now: NOW })).toEqual(FALLBACK_FLARES);
    expect(lastDetail()).toContain('No flares');
  });

  it('gives up on a request that never answers', async () => {
    const hang = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as unknown as typeof fetch;

    expect(await fetchSpaceWeather({ fetchFn: hang, now: NOW, timeoutMs: 5 })).toEqual(FALLBACK_FLARES);
  });

  it('remembers its answer so two screens cost one request', async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE } as Response;
    }) as unknown as typeof fetch;

    await fetchSpaceWeather({ fetchFn: counting, now: NOW });
    await fetchSpaceWeather({ fetchFn: counting, now: NOW });

    expect(calls).toBe(1);
  });
});

describe('describeWhen', () => {
  it('writes a date a child can read', () => {
    expect(describeWhen('2024-05-11T01:23:00Z')).toBe('11 May 2024');
  });

  it('does not crash on a bad date', () => {
    expect(describeWhen('nonsense')).toBe('recently');
  });
});
