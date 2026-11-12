import { describe, expect, it } from 'vitest';

import { nextStop, resolveScreen, screenMount } from './registry';
import type { Route } from './routes';

/**
 * These tests need no DOM. `registry.ts` only holds plain lookup tables, so
 * asking it what exists and where it goes is pure data â€” which is the whole
 * reason the interstitial rule lives here rather than in a screen.
 */

/** Every route, including ones with nothing built. */
const ALL: readonly Route[] = [
  'naming',
  'briefing',
  'supply',
  'launch',
  'interior',
  'landing',
  'landing-site',
  'landing-cinematic',
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
    // `landing` is the landing page, not a journey screen, so it has no mount.
    expect(screenMount('landing')).toBeNull();
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

  it('walks into the launch cinematic, which is built and plays itself', () => {
    // The cinematic hands itself off, so nothing has to press anything to get past
    // it. It still had to be registered or the placeholder would have taken its
    // place.
    expect(resolveScreen('launch')).not.toBeNull();
    expect(nextStop('supply')).toBe('launch');
  });

  it('walks into the spacecraft interior, which is built', () => {
    // The interior is registered, so the launch hands straight into it rather
    // than through the placeholder.
    expect(resolveScreen('interior')).not.toBeNull();
    expect(nextStop('launch')).toBe('interior');
  });

  it('walks into the landing-site choice, which is now built', () => {
    // The landing-site screen is registered, so the interior tour hands
    // straight into it rather than through the placeholder.
    expect(resolveScreen('landing-site')).not.toBeNull();
    expect(nextStop('interior')).toBe('landing-site');
  });

  it('walks from the landing site into the landing film, which is built', () => {
    // The film is registered, so choosing a landing site plays the landing
    // sequence rather than falling back to the placeholder.
    expect(resolveScreen('landing-cinematic')).not.toBeNull();
    expect(nextStop('landing-site')).toBe('landing-cinematic');
  });

  it('walks out of the landing film into the outpost, which is now built', () => {
    // base is registered, so the film hands straight into the outpost rather
    // than falling back to the placeholder.
    expect(resolveScreen('base')).not.toBeNull();
    expect(nextStop('landing-cinematic')).toBe('base');
  });

  it('walks the outpost into sol control and then the debrief', () => {
    expect(resolveScreen('act')).not.toBeNull();
    expect(resolveScreen('debrief')).not.toBeNull();
    expect(nextStop('base')).toBe('act');
    expect(nextStop('act')).toBe('debrief');
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
    'launch',
    'interior',
    'landing-site',
    'landing-cinematic',
    'base',
    'act',
    'debrief',
  ];
  const index = order.indexOf(route);
  return order[index + 1];
}