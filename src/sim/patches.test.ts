import { describe, expect, it } from 'vitest';

import { CORE_MODULES } from './modules';
import { PATCH_COUNT, patchesFor } from './patches';
import { newRun, startOutpost, withState, type RunState } from './run';
import { advanceSol } from './sol';

/*
 * The patches are the thing a child wants to collect, so every one of them has
 * to be earned by something the log can show. A patch that comes free is a
 * sticker with no story behind it.
 */
function outpost(): RunState {
  /* No forecast events, so no crisis sol interrupts: every sol had an order
     worked on it, which is what the no-skip patch is about. */
  return startOutpost(withState(newRun('jezero', 'Tester'), { forecast: [] }), [...CORE_MODULES]);
}

/** Play some sols, choosing the given activity each time. */
function play(sols: number, activity: string): RunState {
  let run = outpost();

  for (let sol = 0; sol < sols; sol += 1) {
    run = advanceSol(withState(run, { chosenActivity: activity }));
  }

  return run;
}

describe('the patches', () => {
  it('gives none for a run that never happened', () => {
    expect(patchesFor(outpost())).toEqual([]);
  });

  it('pays out for a clean run', () => {
    const patches = patchesFor(play(3, 'rest'));

    expect(patches.length).toBeGreaterThan(0);
    /* Every sol had an order worked on it, so the no-skip patch is earned.
       The night-watch patch is not: a bare outpost runs in the dark, which is
       the thing the patch is meant to notice. */
    expect(patches.some((patch) => patch.id === 'no-skip')).toBe(true);
    expect(patches.some((patch) => patch.id === 'night-watch')).toBe(false);
  });

  it('gives every patch an id, a name, a line and a picture', () => {
    for (const patch of patchesFor(play(3, 'rest'))) {
      expect(patch.id.length).toBeGreaterThan(2);
      expect(patch.title.length).toBeGreaterThan(2);
      expect(patch.detail.length).toBeGreaterThan(5);
      expect(patch.icon.length).toBeGreaterThan(0);
    }
  });

  it('never gives the same patch twice', () => {
    const ids = patchesFor(play(6, 'rest')).map((patch) => patch.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not pay out for a patch the run did not earn', () => {
    /* A run with no greenhouse cannot have kept the food up. */
    const run = play(4, 'rest');
    const food = patchesFor(run).find((patch) => patch.id === 'green-thumb');

    expect(food).toBeUndefined();
  });

  it('counts how many there are to find', () => {
    expect(PATCH_COUNT).toBe(10);
  });

  it('does not pay out the full-crew patch for a run that ended early', () => {
    const run = play(2, 'rest');

    expect(patchesFor(run).some((patch) => patch.id === 'full-crew')).toBe(false);
  });
});
