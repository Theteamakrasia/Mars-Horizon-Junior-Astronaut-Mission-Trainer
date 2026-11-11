import { beforeEach, describe, expect, it } from 'vitest';

import {
  FALLBACK_FLARES,
  describeWhen,
  fetchSpaceWeather,
  lastDetail,
  lastSource,
  parseFlares,
  parseNoaaFlares,
  resetSpaceWeather,
  strongestFlares,
  type SpaceWeatherEvent,
} from './spaceweather';

/*
 * NOTE ON WHAT THESE TESTS PROVE. The DONKI fixtures follow NASA's documented
 * schema, but this project has never seen a successful DONKI response on the
 * wire. The NOAA fixtures follow a response it HAS seen, including the `null`
 * and `"Unk"` fields of a flare that is still in progress.
 *
 * What is tested here is our parsing and our fallback chain, not that NASA's
 * live format matches its documentation.
 */

const NOW = new Date('2026-11-08T00:00:00Z');

function respond(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response) as typeof fetch;
}

/** A fetch that answers by URL fragment, so the two-source chain can be tested. */
function routed(routes: Record<string, { status: number; body: unknown }>): typeof fetch {
  return (async (url: string) => {
    const fragment = Object.keys(routes).find((key) => url.includes(key));

    if (fragment === undefined) throw new TypeError(`Failed to fetch: ${url}`);

    const { status, body } = routes[fragment];

    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

const SAMPLE = [
  { flrID: 'a', classType: 'C3.0', peakTime: '2026-10-20T04:00Z' },
  { flrID: 'b', classType: 'M4.2', peakTime: '2026-10-25T09:30Z' },
  { flrID: 'c', classType: 'X1.1', peakTime: '2026-11-01T12:00Z' },
];

/** Real NOAA SWPC shape, trimmed: one calm flare, one M, one still in progress. */
const NOAA_SAMPLE = [
  {
    time_tag: '2026-11-02T20:56:00Z',
    begin_time: '2026-11-02T20:56:00Z',
    begin_class: 'B4.0',
    max_time: '2026-11-02T21:04:00Z',
    max_class: 'B5.6',
    end_time: '2026-11-02T21:11:00Z',
    end_class: 'B4.8',
  },
  {
    time_tag: '2026-11-05T08:00:00Z',
    begin_time: '2026-11-05T08:00:00Z',
    begin_class: 'C1.2',
    max_time: '2026-11-05T08:40:00Z',
    max_class: 'M1.4',
    end_time: '2026-11-05T09:10:00Z',
    end_class: 'C3.0',
  },
  {
    time_tag: '2026-11-09T16:53:00Z',
    begin_time: '2026-11-09T16:53:00Z',
    begin_class: 'C1.1',
    max_time: '2026-11-09T17:14:00Z',
    max_class: 'C5.1',
    end_time: 'Unk',
    end_class: null,
  },
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

describe('parseNoaaFlares (real wire format)', () => {
  it('keeps flares and uses the peak class and time', () => {
    const events = parseNoaaFlares(NOAA_SAMPLE);

    expect(events.map((event) => event.classType)).toEqual(['B5.6', 'M1.4', 'C5.1']);
    expect(events.every((event) => event.approximate === false)).toBe(true);
  });

  it('does not trip over the null end fields of a flare still in progress', () => {
    expect(parseNoaaFlares([NOAA_SAMPLE[2]])).toEqual([
      { kind: 'flare', classType: 'C5.1', peakTime: '2026-11-09T17:14:00Z', approximate: false },
    ]);
  });

  it('falls back to the begin class when the peak is missing', () => {
    const events = parseNoaaFlares([{ begin_class: 'C2.0', begin_time: '2026-11-05T08:00:00Z', max_class: null, max_time: null }]);

    expect(events).toEqual([
      { kind: 'flare', classType: 'C2.0', peakTime: '2026-11-05T08:00:00Z', approximate: false },
    ]);
  });

  it('drops malformed records and a response that is not a list', () => {
    expect(parseNoaaFlares([{ max_class: 'banana', max_time: '2026-11-05T08:00:00Z' }])).toEqual([]);
    expect(parseNoaaFlares([{ max_class: 'M1.0', max_time: 'Unk' }])).toEqual([]);
    expect(parseNoaaFlares({ error: 'nope' })).toEqual([]);
  });
});

describe('fetchSpaceWeather (no network: fetch is injected)', () => {
  it('returns every live flare, not just the strongest, and says the source was DONKI', async () => {
    const events = await fetchSpaceWeather({ fetchFn: respond(200, SAMPLE), now: NOW });

    expect(events.map((event) => event.classType)).toEqual(['C3.0', 'M4.2', 'X1.1']);
    expect(lastSource()).toBe('donki');
    expect(events.every((event) => event.approximate === false)).toBe(true);
  });

  it('falls back to an empty list, so the forecast draws from the long-run record instead', () => {
    expect(FALLBACK_FLARES).toEqual([]);
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

  it('falls back when throttled', async () => {
    const events = await fetchSpaceWeather({ fetchFn: respond(429, {}), now: NOW });

    expect(events).toEqual([]);
    expect(lastSource()).toBe('fallback');
    expect(lastDetail()).toContain('busy');
  });

  it('falls back on a server error', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(500, {}), now: NOW })).toEqual([]);
  });

  it('falls back when offline', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    expect(await fetchSpaceWeather({ fetchFn: offline, now: NOW })).toEqual([]);
    expect(lastDetail()).toContain('could not be reached');
  });

  it('falls back when the response is garbage', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(200, 'garbage'), now: NOW })).toEqual([]);
  });

  it('falls back, and says why, in a quiet month with no flares', async () => {
    expect(await fetchSpaceWeather({ fetchFn: respond(200, []), now: NOW })).toEqual([]);
    expect(lastDetail()).toContain('No flares');
  });

  it('gives up on a request that never answers', async () => {
    const hang = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as unknown as typeof fetch;

    expect(await fetchSpaceWeather({ fetchFn: hang, now: NOW, timeoutMs: 5 })).toEqual([]);
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

  it('prefers NASA when NASA answers', async () => {
    const seen: string[] = [];
    const routing = routed({
      'api.nasa.gov': { status: 200, body: SAMPLE },
      'services.swpc.noaa.gov': { status: 200, body: NOAA_SAMPLE },
    });
    const spy = (async (url: string, init?: RequestInit) => {
      seen.push(url);
      return routing(url, init);
    }) as unknown as typeof fetch;

    const events = await fetchSpaceWeather({ fetchFn: spy, now: NOW });

    expect(events.map((event) => event.classType)).toEqual(['C3.0', 'M4.2', 'X1.1']);
    expect(lastSource()).toBe('donki');
    expect(lastDetail()).toContain('DONKI');
    expect(seen).toHaveLength(1);
  });

  it('falls through to NOAA when NASA is throttled, and says so', async () => {
    const spy = routed({
      'api.nasa.gov': { status: 429, body: { error: 'OVER_RATE_LIMIT' } },
      'services.swpc.noaa.gov': { status: 200, body: NOAA_SAMPLE },
    });

    const events = await fetchSpaceWeather({ fetchFn: spy, now: NOW });

    expect(events.map((event) => event.classType)).toEqual(['B5.6', 'M1.4', 'C5.1']);
    expect(events.every((event) => event.approximate === false)).toBe(true);
    expect(lastSource()).toBe('noaa');
    expect(lastDetail()).toContain('NOAA');
  });

  it('falls through to NOAA when NASA times out', async () => {
    const slowNasa = (async (url: string, init?: RequestInit) => {
      if (url.includes('api.nasa.gov')) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      }

      return { ok: true, status: 200, json: async () => NOAA_SAMPLE } as Response;
    }) as unknown as typeof fetch;

    const events = await fetchSpaceWeather({ fetchFn: slowNasa, now: NOW, timeoutMs: 5 });

    expect(events.map((event) => event.classType)).toEqual(['B5.6', 'M1.4', 'C5.1']);
    expect(lastSource()).toBe('noaa');
  });

  it('names both failed sources when neither answers', async () => {
    await fetchSpaceWeather({ fetchFn: respond(503, {}), now: NOW });

    expect(lastDetail()).toContain('NASA answered with an error (503)');
    expect(lastDetail()).toContain('NOAA answered with an error (503)');
  });

  it('does not remember an answer the caller abandoned', async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE } as Response;
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    controller.abort();
    await fetchSpaceWeather({ fetchFn: counting, now: NOW, signal: controller.signal });

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

describe('strongestFlares', () => {
  const flare = (classType: string, peakTime = '2024-05-11T01:23:00Z'): SpaceWeatherEvent => ({
    kind: 'flare',
    classType,
    peakTime,
    approximate: false,
  });

  it('puts the biggest class first, and the letters count', () => {
    const strongest = strongestFlares([flare('C1.0'), flare('X1.0'), flare('M4.2')]);

    expect(strongest.map((event) => event.classType)).toEqual(['X1.0', 'M4.2', 'C1.0']);
  });

  it('counts the number inside a letter', () => {
    const strongest = strongestFlares([flare('M1.0'), flare('M4.2')]);

    expect(strongest.map((event) => event.classType)).toEqual(['M4.2', 'M1.0']);
  });

  it('keeps only the few that were asked for', () => {
    const strongest = strongestFlares([flare('B1.0'), flare('C1.0'), flare('M1.0'), flare('X1.0'), flare('A1.0')], 2);

    expect(strongest).toHaveLength(2);
    expect(strongest.map((event) => event.classType)).toEqual(['X1.0', 'M1.0']);
  });

  it('sorts an unreadable class last instead of throwing', () => {
    const strongest = strongestFlares([flare('nonsense'), flare('B2.0')]);

    expect(strongest.map((event) => event.classType)).toEqual(['B2.0', 'nonsense']);
  });

  it('does not touch the list it was given', () => {
    const flares = [flare('C1.0'), flare('X1.0')];

    strongestFlares(flares);

    expect(flares.map((event) => event.classType)).toEqual(['C1.0', 'X1.0']);
  });

  it('answers nothing for nothing', () => {
    expect(strongestFlares([])).toEqual([]);
  });
});
