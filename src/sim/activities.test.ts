import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_CATALOGUE,
  activityById,
  offerFor,
  planForSol,
  SOL_PLANS,
  type ActivityOffer,
} from './activities';
import { CORE_MODULES } from './modules';
import { newRun, type RunState } from './run';
import { SCIENCE_TOPICS } from './topics';

const run = newRun('jezero', 'Tester');

/** A run with the modules an activity might be locked behind. */
function withModules(...modules: readonly string[]): ReturnType<typeof newRun> {
  return { ...run, modules: [...CORE_MODULES, ...modules] as never };
}

/** Every activity offered anywhere in the run, so a test can find any of them. */
function everyOffer(state: RunState): readonly ActivityOffer[] {
  return SOL_PLANS.flatMap((plan) => offerFor(state, plan.sol));
}

describe('activities', () => {
  it('has twelve activities with unique ids', () => {
    expect(ACTIVITY_CATALOGUE).toHaveLength(12);

    const ids = ACTIVITY_CATALOGUE.map((spec) => spec.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names every activity, gives it a topic, and awards a whole number of science points', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      expect(spec.title.length).toBeGreaterThan(0);
      expect(spec.detail.length).toBeGreaterThan(0);
      expect(spec.icon.length).toBeGreaterThan(0);
      expect(SCIENCE_TOPICS).toContain(spec.topic);
      expect(Number.isInteger(spec.science)).toBe(true);
      expect(spec.science).toBeGreaterThan(0);
    }
  });

  it('charges for every activity except resting, because a free choice is not a choice', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      if (spec.id === 'rest') continue;

      const costsSomething = spec.powerCostKwh > 0 || Object.keys(spec.storeDelta).length > 0;

      expect(costsSomething).toBe(true);
    }
  });

  it('never takes a store away, so an activity cannot quietly empty a tank', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      for (const value of Object.values(spec.storeDelta)) {
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('never spends power out of the power store, because power is load and not a delta', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      expect(Object.keys(spec.storeDelta)).not.toContain('power');
    }
  });

  it('explains itself when it is locked', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      if (spec.requires === undefined) continue;

      expect(spec.requires.why.length).toBeGreaterThan(0);
    }
  });

  it('finds an activity by id and refuses one it has never heard of', () => {
    expect(activityById('survey')?.title).toBe('Send the rover out to survey');
    expect(activityById('warp-drive')).toBeNull();
  });
});

describe('sol plans', () => {
  it('has a plan for each of the twelve sols', () => {
    expect(SOL_PLANS).toHaveLength(12);
    expect(SOL_PLANS.map((plan) => plan.sol)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gives every sol a headline and a line about it', () => {
    for (const plan of SOL_PLANS) {
      expect(plan.title).toContain(`Mission ${plan.sol}`);
      expect(plan.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('offers three real activities on every sol', () => {
    for (const plan of SOL_PLANS) {
      expect(plan.activityIds).toHaveLength(3);

      for (const id of plan.activityIds) {
        expect(activityById(id)).not.toBeNull();
      }
    }
  });

  it('always leaves the player an activity they are allowed to choose', () => {
    /* The worst outpost: no greenhouse, no ice miner, and clean panels. */
    const bare = { ...run, modules: [...CORE_MODULES], panelHealth: 1 };

    for (let sol = 1; sol <= SOL_PLANS.length; sol++) {
      const offers = offerFor(bare, sol);

      expect(offers).toHaveLength(3);
      expect(offers.some((offer) => offer.available)).toBe(true);
    }
  });

  it('returns nothing for a sol outside the run', () => {
    expect(planForSol(0)).toBeNull();
    expect(planForSol(13)).toBeNull();
    expect(planForSol(Number.NaN)).toBeNull();
    expect(offerFor(run, 0)).toHaveLength(0);
  });
});

describe('offering activities', () => {
  it('locks growing without a greenhouse, and says why', () => {
    const grow = everyOffer(run).find((offer) => offer.spec.id === 'grow-extra');

    expect(grow).toBeDefined();
    expect(grow?.available).toBe(false);
    expect(grow?.lockedReason).toContain('greenhouse');
  });

  it('unlocks growing once the greenhouse is built', () => {
    const grow = everyOffer(withModules('greenhouse')).find((offer) => offer.spec.id === 'grow-extra');

    expect(grow?.available).toBe(true);
    expect(grow?.lockedReason).toBeNull();
  });

  it('locks digging without an ice miner, and says why', () => {
    const dig = everyOffer(run).find((offer) => offer.spec.id === 'dig-ice');

    expect(dig?.available).toBe(false);
    expect(dig?.lockedReason).toContain('ice miner');
  });

  it('locks sweeping the panels when they are already clean, and unlocks them when they are dusty', () => {
    const clean = everyOffer(run).find((offer) => offer.spec.id === 'sweep-panels');
    const dusty = everyOffer({ ...run, panelHealth: 0.5 }).find((offer) => offer.spec.id === 'sweep-panels');

    expect(clean?.available).toBe(false);
    expect(clean?.lockedReason).toContain('already clean');
    expect(dusty?.available).toBe(true);
    expect(dusty?.lockedReason).toBeNull();
  });

  it('never locks an activity that has no requirement', () => {
    const free = ACTIVITY_CATALOGUE.filter((spec) => spec.requires === undefined);

    for (const spec of free) {
      expect(everyOffer(run).find((offer) => offer.spec.id === spec.id)?.available).toBe(true);
    }
  });
});
