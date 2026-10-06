import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROUTE,
  nextRoute,
  parseRoute,
  previousRoute,
  ROUTE_ORDER,
  routeToHash,
} from './routes';

/**
 * Every input is literal. Nothing here reaches for Math.random or the clock, so
 * these tests cannot flake — the defect recorded as ISS-015 in
 * docs/team/issues.md is exactly what this file is written to avoid repeating.
 */

describe('parseRoute', () => {
  it('reads a canonical hash', () => {
    expect(parseRoute('#/base')).toBe('base');
  });

  it('accepts a hash with no leading slash', () => {
    expect(parseRoute('#base')).toBe('base');
  });

  it('accepts a bare route name with no hash at all', () => {
    // Someone typing a URL by hand, or a relative link written without the '#'.
    expect(parseRoute('debrief')).toBe('debrief');
  });

  it('tolerates repeated and trailing separators', () => {
    expect(parseRoute('##/act/')).toBe('act');
    expect(parseRoute('///landing-site')).toBe('landing-site');
  });

  it('tolerates surrounding whitespace and mixed case', () => {
    expect(parseRoute('  #/Act  ')).toBe('act');
  });

  it('keeps the route name ahead of a query string', () => {
    // So a future ?debug=1 cannot break navigation.
    expect(parseRoute('#/base?debug=1')).toBe('base');
  });

  it('returns null for an unknown screen rather than guessing', () => {
    // A bad hash is a navigation mistake, not a programming error: the caller
    // falls back to DEFAULT_ROUTE instead of the router throwing.
    expect(parseRoute('#/nowhere')).toBeNull();
    expect(parseRoute('#/../etc/passwd')).toBeNull();
  });

  it('returns null for an empty or separator-only hash', () => {
    expect(parseRoute('')).toBeNull();
    expect(parseRoute('#')).toBeNull();
    expect(parseRoute('#/')).toBeNull();
  });
});

describe('routeToHash', () => {
  it('round-trips every route', () => {
    for (const route of ROUTE_ORDER) {
      expect(parseRoute(routeToHash(route))).toBe(route);
    }
  });

  it('emits a leading slash so the hash is a path-like route', () => {
    expect(routeToHash('base')).toBe('#/base');
  });
});

describe('progression', () => {
  it('walks forward through play order', () => {
    expect(nextRoute('landing')).toBe('landing-site');
    expect(nextRoute('landing-site')).toBe('base');
    expect(nextRoute('base')).toBe('act');
  });

  it('has nothing after the last screen', () => {
    expect(nextRoute('debrief')).toBeNull();
  });

  it('walks backward through play order', () => {
    expect(previousRoute('debrief')).toBe('act');
    expect(previousRoute('landing')).toBeNull();
  });

  it('keeps the landing page in the sequence, not outside it', () => {
    // The landing page ships until the game is 30% built (decision D-008), so it
    // is a real step rather than a dead end.
    expect(ROUTE_ORDER[0]).toBe('landing');
    expect(DEFAULT_ROUTE).toBe('landing');
  });

  it('agrees with itself in both directions', () => {
    for (const route of ROUTE_ORDER) {
      const forward = nextRoute(route);
      if (forward !== null) expect(previousRoute(forward)).toBe(route);
    }
  });
});