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
    expect(nextRoute('naming')).toBe('landing');
    expect(nextRoute('landing')).toBe('landing-site');
    expect(nextRoute('landing-site')).toBe('base');
    expect(nextRoute('base')).toBe('act');
  });

  it('has nothing after the last screen', () => {
    expect(nextRoute('debrief')).toBeNull();
  });

  it('walks backward through play order', () => {
    expect(previousRoute('debrief')).toBe('act');
    expect(previousRoute('naming')).toBeNull();
  });

  it('opens on the naming menu, because that is the entry screen', () => {
    // The player names their astronaut and starts the journey from here. A login
    // page is meant to sit in front of this later; it is not built (D-003).
    expect(ROUTE_ORDER[0]).toBe('naming');
    expect(DEFAULT_ROUTE).toBe('naming');
  });

  it('keeps the landing page in the sequence, not outside it', () => {
    // It stays reachable as the "main menu" target until the game is 30% built
    // (D-008), rather than being deleted from the routes.
    expect(ROUTE_ORDER).toContain('landing');
  });

  it('agrees with itself in both directions', () => {
    for (const route of ROUTE_ORDER) {
      const forward = nextRoute(route);
      if (forward !== null) expect(previousRoute(forward)).toBe(route);
    }
  });
});