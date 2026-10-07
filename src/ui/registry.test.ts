import { describe, expect, it } from 'vitest';

import { nextStop, resolveScreen, screenMount } from './registry';
import type { Route } from './routes';

/**
 * These tests need no DOM. `registry.ts` only holds plain lookup tables, so
 * asking it what exists and where it goes is pure data — which is the whole
 * reason the interstitial rule lives here rather than in a screen.
 */

/** Every route, including ones with nothing built. */
const ALL: readonly Route[] = [
  'naming',
  'briefing',
  'supply',
  'landing',
  'landing-site',
  'base',
  'act',
  'debrief',
];

describe('screenMount', () => {
  it('has a mount point for every route it has a screen for', () => {
    for (const route of ALL) {
      if (resolveScreen(route) !== null) {
        expect(screenMount(route)).not.toBeNull();
      }
    }
  });

  it('returns null for routes with nothing built', () => {
    expect(screenMount('base')).toBeNull();
  });
});

describe('nextStop', () => {
  it('goes straight between two built screens', () => {
    // naming and briefing are both built, so nothing sits between them.
    expect(nextStop('naming')).toBe('briefing');
  });

  it('walks the built supply screen straight after the briefing', () => {
    // Adding a built scene needed no change here. That is the property the
    // computed-interstitial rule exists for.
    expect(nextStop('briefing')).toBe('supply');
  });

  it('inserts the interstitial before a screen that is not built', () => {
    // landing-site is a stub, so the player sees the placeholder after supply.
    expect(nextStop('supply')).toBe('landing');
  });

  it('skips the interstitial entirely once the next screen is built', () => {
    // This is what happens to every placeholder as the scenes get built: the
    // route drops out of the journey without anyone editing the interstitial.
    expect(resolveScreen('naming')).not.toBeNull();
    expect(nextStop('naming')).not.toBe('landing');
  });

  it('returns null at the end of the journey', () => {
    expect(nextStop('debrief')).toBeNull();
  });

  it('never returns the interstitial when the next screen is built', () => {
    // Guards the one case that would look broken to a player: being sent to the
    // placeholder when there was something real to go to.
    for (const route of ALL) {
      const next = nextStop(route);
      if (next === 'landing') expect(resolveScreen(nextRouteOf(route))).toBeNull();
    }
  });

  it('always returns somewhere until the journey ends', () => {
    for (const route of ALL) {
      const next = nextStop(route);
      expect(next === null || ALL.includes(next)).toBe(true);
    }
  });
});

/** The raw next route, used by the invariant test above. */
function nextRouteOf(route: Route): Route {
  const order: readonly Route[] = [
    'naming',
    'briefing',
    'supply',
    'landing-site',
    'base',
    'act',
    'debrief',
  ];
  const index = order.indexOf(route);
  return order[index + 1];
}