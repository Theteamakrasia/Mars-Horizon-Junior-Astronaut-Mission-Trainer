/**
 * Where CONTINUE goes, and which screens are worth resuming on.
 *
 * The storage half of `ui/save.ts` cannot be tested here because there is no
 * `localStorage` in the test environment (ISS-013); it is checked in a real
 * browser by `tools/browser-check-save.mjs`. Everything above the storage call
 * is pure, and that is what this file covers.
 */

import { describe, expect, it } from 'vitest';

import { newRun, withState, type RunState } from '../sim/run';
import { ROUTE_ORDER, type Route } from './routes';
import { isSaveableScreen, resumeScreen, type SavedGame } from './save';

/** A run on Mars, on the given sol. */
function landed(sol: number): RunState {
  return withState(newRun('arcadia', 'Tester'), { sol });
}

/** A save of that run, left on a screen. */
function savedOn(run: RunState, screen: Route): SavedGame {
  return { run, screen };
}

describe('isSaveableScreen', () => {
  it('is true for every stop in the journey except the menu', () => {
    for (const route of ROUTE_ORDER) {
      if (route === 'naming') continue;

      expect(isSaveableScreen(route)).toBe(true);
    }
  });

  it('is false for the menu itself', () => {
    /* A save taken on the menu would make CONTINUE point at the screen that is
       offering it. */
    expect(isSaveableScreen('naming')).toBe(false);
  });

  it('is false for the two screens that are not stops', () => {
    expect(isSaveableScreen('landing')).toBe(false);
    expect(isSaveableScreen('encyclopedia')).toBe(false);
  });
});

describe('resumeScreen', () => {
  it('goes back to the screen the player left', () => {
    expect(resumeScreen(savedOn(landed(4), 'act'))).toBe('act');
    expect(resumeScreen(savedOn(landed(4), 'briefing'))).toBe('briefing');
    expect(resumeScreen(savedOn(newRun('', 'Tester'), 'supply'))).toBe('supply');
  });

  it('never sends the player back to the menu', () => {
    expect(resumeScreen(savedOn(landed(4), 'naming'))).not.toBe('naming');
  });

  it('falls back to the report when the mission is over', () => {
    const over = withState(landed(12), { status: 'won' });

    expect(resumeScreen(savedOn(over, 'encyclopedia'))).toBe('debrief');
  });

  it('falls back to the desk when there is an outpost', () => {
    expect(resumeScreen(savedOn(landed(0), 'landing'))).toBe('act');
  });

  it('falls back to the briefing when there is not', () => {
    expect(resumeScreen(savedOn(newRun('', 'Tester'), 'landing'))).toBe('briefing');
  });
});
