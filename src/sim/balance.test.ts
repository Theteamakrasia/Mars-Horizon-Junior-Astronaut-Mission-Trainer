import { describe, expect, it } from 'vitest';

import { activityById, offerFor, SOL_PLANS } from './activities';
import { createForecast } from './forecast';
import { CORE_MODULES, type ModuleKind } from './modules';
import { REGIONS } from './regions';
import { newRun, startOutpost, withState, type RunState } from './run';
import { advanceSol, decide, WIN_SOL } from './sol';
import { pendingCrisis } from './crises';
import { rankFor } from './science';

/*
 * Acceptance tests for the whole run, not for one function.
 *
 * These are the tests that say the game is *playable*: a good build survives
 * twelve sols, a careless one does not, and the daily activity loop does not
 * quietly make the game unwinnable. Every input is a literal and no test
 * depends on `Math.random()`, so the suite cannot flake.
 *
 * TASK-046 named this file and it did not exist. It exists now because the
 * activity loop changed the resource maths, and the maths needs a guard.
 */

const SMART: Record<string, string> = { flare: 'shelter', storm: 'retract-save', 'supply-pod': 'water' };
const CARELESS: Record<string, string> = { flare: 'carry-on', storm: 'expose', 'supply-pod': 'food' };

/** A build that closes the loop: power, storage, food, water and shielding. */
const GOOD_BUILD: readonly ModuleKind[] = [
  'solar-array',
  'solar-array',
  'solar-array',
  'batteries',
  'batteries',
  'batteries',
  'greenhouse',
  'ice-miner',
  'regolith-shield',
];

/** A build that makes something but leaves a hole in it. */
const NO_FOOD_BUILD: readonly ModuleKind[] = [
  'solar-array',
  'solar-array',
  'batteries',
  'batteries',
  'regolith-shield',
];

/** A build with nothing between the crew and a flare. */
const NO_SHIELD_BUILD: readonly ModuleKind[] = [
  'solar-array',
  'solar-array',
  'batteries',
  'batteries',
  'greenhouse',
];

/**
 * Play a whole run.
 *
 * `pick` chooses the day's activity. `null` means the player chose nothing,
 * which is what the sim does when there is no activity to choose.
 */
function play(
  regionId: string,
  extras: readonly ModuleKind[],
  picks: Record<string, string>,
  pick: 'first-available' | 'best' | 'none' = 'first-available',
  flares: readonly { readonly classType: string; readonly approximate: boolean; readonly when: string }[] = [],
): RunState {
  let run = startOutpost(
    withState(newRun(regionId, 'Tester'), { forecast: createForecast(flares) }),
    [...CORE_MODULES, ...extras],
  );

  while (run.status === 'active') {
    const crisis = pendingCrisis(run);

    if (crisis !== null) run = decide(run, crisis.id, picks[crisis.kind] ?? crisis.defaultOptionId);

    const offers = offerFor(run, run.sol + 1).filter((offer) => offer.available);

    if (pick === 'none' || offers.length === 0) {
      /* Nothing chosen: the sol runs as it is. */
    } else if (pick === 'best') {
      const best = offers.reduce((a, b) => (b.spec.science > a.spec.science ? b : a));
      run = withState(run, { chosenActivity: best.spec.id });
    } else {
      run = withState(run, { chosenActivity: offers[0]?.spec.id ?? null });
    }

    run = advanceSol(run);
  }

  return run;
}

describe('a whole run', () => {
  it('is winnable with a build that closes the loop', () => {
    const run = play('jezero', GOOD_BUILD, SMART);

    expect(run.status).toBe('won');
    expect(run.sol).toBe(WIN_SOL);
  });

  it('is still winnable when the player never chooses an activity', () => {
    const run = play('jezero', GOOD_BUILD, SMART, 'none');

    expect(run.status).toBe('won');
  });

  it('is losable when the build grows no food', () => {
    const run = play('jezero', NO_FOOD_BUILD, SMART);

    expect(run.status).toBe('lost');
  });

  it('is losable when the player takes no cover from a flare', () => {
    /* A real X-class flare, the kind DONKI actually reports: the only flare
       big enough to take the shielding from the lander's own 30 down to
       nothing. A typical flare no longer does it, and pretending otherwise
       would pin the balance back where it was. */
    const run = play('jezero', NO_SHIELD_BUILD, CARELESS, 'first-available', [
      { classType: 'X9.3', approximate: true, when: 'in 2017' },
    ]);

    expect(run.status).toBe('lost');
  });

  it('leaves almost no shielding when the player takes no cover', () => {
    const run = play('jezero', NO_SHIELD_BUILD, CARELESS);

    expect(run.stores.shielding).toBeLessThan(20);
  });

  it('can be played on more than one region', () => {
    const wins = REGIONS.filter((region) => play(region.id, GOOD_BUILD, SMART).status === 'won');

    expect(wins.length).toBeGreaterThanOrEqual(3);
  });

  it('scores science points, and a run that chose nothing scores less', () => {
    const busy = play('jezero', GOOD_BUILD, SMART, 'best');
    const idle = play('jezero', GOOD_BUILD, SMART, 'none');

    expect(busy.science).toBeGreaterThan(idle.science);
    expect(rankFor(busy.science).id).not.toBe('explorer');
  });

  it('never offers an activity that does not exist', () => {
    for (const plan of SOL_PLANS) {
      for (const id of plan.activityIds) {
        expect(activityById(id)).not.toBeNull();
      }
    }
  });
});
