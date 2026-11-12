import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_CATALOGUE,
  activityById,
  canAfford,
  nightWarning,
  offerFor,
  offerForSpec,
  planForSol,
  SOL_PLANS,
  type ActivityOffer,
} from './activities';
import { CORE_MODULES } from './modules';
import { newRun, startOutpost, withState, type RunState } from './run';
import { SCIENCE_TOPICS } from './topics';

/** A run with the lander's outpost built and the batteries full. */
const run = startOutpost(newRun('jezero', 'Tester'), CORE_MODULES);

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

  it('may cost a store, but never takes more than half of it', () => {
    for (const spec of ACTIVITY_CATALOGUE) {
      for (const value of Object.values(spec.storeDelta)) {
        expect(value).toBeGreaterThanOrEqual(-50);
        expect(value).toBeLessThanOrEqual(50);
      }
    }
  });

  it('costs water to grow food, because that is the trade-off', () => {
    const grow = activityById('grow-extra');

    expect(grow?.storeDelta.water).toBeLessThan(0);
    expect(grow?.storeDelta.food).toBeGreaterThan(0);
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

describe('the power gate', () => {
  /* A run with nothing on the surface: no panels to make power and no
     batteries to hold it, so there is none to spend today. */
  const dark: RunState = {
    ...run,
    modules: [],
    stores: { ...run.stores, power: 0 },
  };

  it('locks a job the day cannot pay for, and says the price and the charge', () => {
    const survey = everyOffer(dark).find((offer) => offer.spec.id === 'survey');

    expect(survey?.available).toBe(false);
    expect(survey?.lockedReason).toContain('25 kWh');
    expect(survey?.lockedReason).toContain('You can spend 0 kWh today');
  });

  it('unlocks the same job the moment there is power for it', () => {
    const charged = offerForSpec(activityById('survey')!, { ...run, stores: { ...run.stores, power: 25 } });

    expect(charged.available).toBe(true);
    expect(charged.lockedReason).toBeNull();
  });

  it('never locks resting, however empty the batteries are', () => {
    const rest = offerForSpec(activityById('rest')!, dark);

    expect(rest.available).toBe(true);
    expect(rest.lockedReason).toBeNull();
  });

  it('counts the panels as well as the bank, so an empty bank is not a no', () => {
    /* The rule the player reported: the bank is empty at dawn because the
       night took it, and the job was refused even though the Sun was about to
       make 258 kWh. The job is paid for out of the day, not out of the dark. */
    const survey = activityById('survey')!;
    const empty = withState(run, { stores: { ...run.stores, power: 0 } });

    expect(canAfford(survey, empty)).toBe(true);
    expect(canAfford(survey, dark)).toBe(false);
  });

  it('warns when paying for a job would leave the night short, but still allows it', () => {
    /* The night is a warning and never a lock: the player may spend the
       reserve, but the card says what the reserve will be afterwards. Arcadia
       is the poor site: its panels make less than the outpost needs, so the
       night is already tight. */
    const dusty = startOutpost(newRun('arcadia', 'Tester'), CORE_MODULES);
    const survey = activityById('survey')!;

    expect(canAfford(survey, dusty)).toBe(true);
    expect(nightWarning(survey, dusty)).toContain('tonight needs');
    expect(nightWarning(activityById('rest')!, dusty)).toBeNull();
  });
});
