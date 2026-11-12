import { describe, expect, it } from 'vitest';

import { CORE_MODULES, systemsFor } from './modules';
import { canAffordKwh, CRISIS_CHOICE, CRISIS_DEFAULT, keepsTheNight, powerBudget } from './powerBudget';
import { newRun, startOutpost, withState, type RunState } from './run';

/**
 * The power picture for the sol about to be played.
 *
 * The numbers here are the ones a player reads: what the panels make, what
 * the outpost needs, what is in the bank, what a job may cost and what the
 * night will take. They are the numbers the screen shows, so they are pinned
 * exactly — a build screen that says one thing and a sol step that does
 * another is how a player ends up spending 15 kWh and finding out later that
 * the bank was already empty (ISS-083).
 */

/** A run with the lander's outpost, at a site. */
function outpost(regionId: string, extras: readonly ('solar-array' | 'batteries' | 'greenhouse')[] = []): RunState {
  return startOutpost(newRun(regionId, 'Test'), [...CORE_MODULES, ...extras]);
}

describe('the power budget', () => {
  it('says what the panels make, what the outpost needs, and the difference', () => {
    const budget = powerBudget(outpost('jezero'));

    /* Jezero: one array in the sunlight, 10 kW of load. */
    expect(Math.round(budget.solarKwh)).toBe(258);
    expect(Math.round(budget.demandKwh)).toBe(240);
    expect(Math.round(budget.spareKwh)).toBe(18);
  });

  it('makes more power at a sunny site than at a dim one', () => {
    const bright = powerBudget(outpost('olympus'));
    const dim = powerBudget(outpost('arcadia'));

    expect(bright.solarKwh).toBeGreaterThan(dim.solarKwh);
  });

  it('scales with the number of arrays', () => {
    const one = powerBudget(outpost('jezero'));
    const two = powerBudget(outpost('jezero', ['solar-array']));

    expect(Math.round(two.solarKwh)).toBe(Math.round(one.solarKwh * 2));
  });

  it('scales with the number of battery banks', () => {
    const one = powerBudget(outpost('jezero'));
    const two = powerBudget(outpost('jezero', ['batteries']));

    expect(two.capacityKwh).toBe(one.capacityKwh * 2);
  });

  it('is short at a dim site and in credit at a bright one', () => {
    /* The five sites are the map's whole economy: three of them cannot pay
       for themselves on the lander's one array. */
    expect(powerBudget(outpost('arcadia')).spareKwh).toBeLessThan(0);
    expect(powerBudget(outpost('olympus')).spareKwh).toBeGreaterThan(0);
  });

  it('counts the reactor as power made, day and night', () => {
    const budget = powerBudget(outpost('jezero', ['greenhouse']));

    expect(budget.nuclearKwh).toBe(0);
  });

  it('takes the night out of the batteries, not out of the day', () => {
    const budget = powerBudget(outpost('jezero'));

    /* 10 kW of load, 12 hours of dark, and no reactor. */
    expect(Math.round(budget.nightNeedKwh)).toBe(120);
    expect(budget.nightCovered).toBe(true);
  });

  it('says the night is not covered when the batteries cannot hold it', () => {
    const budget = powerBudget(outpost('jezero', ['greenhouse', 'batteries']));

    /* A greenhouse is 6 kW more: the night needs 192 of a 300 kWh bank. */
    expect(Math.round(budget.nightNeedKwh)).toBe(192);
    expect(budget.nightCovered).toBe(true);
  });

  it('makes nothing when the crew folds the panels against a storm', () => {
    const storming = withState(outpost('jezero'), {
      sol: 1,
      forecast: [
        {
          id: 'storm-2',
          sol: 2,
          kind: 'storm',
          durationSols: 2,
          intensity: 0,
          summary: 'A storm.',
          approximate: false,
        },
      ],
      decisions: [{ sol: 2, crisisId: 'storm-2', optionId: CRISIS_CHOICE.retract, timedOut: false }],
    });

    expect(powerBudget(storming).solarKwh).toBe(0);
  });

  it('makes less than a clear day when the crew leaves the panels out in the dust', () => {
    const clear = powerBudget(outpost('jezero'));

    const storming = withState(outpost('jezero'), {
      sol: 1,
      forecast: [
        {
          id: 'storm-2',
          sol: 2,
          kind: 'storm',
          durationSols: 2,
          intensity: 0,
          summary: 'A storm.',
          approximate: false,
        },
      ],
      decisions: [{ sol: 2, crisisId: 'storm-2', optionId: CRISIS_CHOICE.expose, timedOut: false }],
    });

    expect(powerBudget(storming).solarKwh).toBeGreaterThan(0);
    expect(powerBudget(storming).solarKwh).toBeLessThan(clear.solarKwh);
  });

  it('pauses the greenhouse when the crew shelters from a flare', () => {
    const flare = withState(outpost('jezero', ['greenhouse']), {
      sol: 1,
      forecast: [
        {
          id: 'flare-2',
          sol: 2,
          kind: 'flare',
          durationSols: 1,
          intensity: 2,
          summary: 'A flare.',
          approximate: false,
        },
      ],
      decisions: [{ sol: 2, crisisId: 'flare-2', optionId: CRISIS_CHOICE.shelter, timedOut: false }],
    });

    const budget = powerBudget(flare);

    expect(budget.greenhousePaused).toBe(true);
    expect(budget.loadKw).toBeLessThan(systemsFor([...CORE_MODULES, 'greenhouse'], 'jezero').loadKw);
  });

  it('agrees with the crisis catalogue about what happens when nothing is chosen', () => {
    /* The power picture reads the crisis's own default, so the two cannot
       disagree about an unanswered crisis. */
    expect(CRISIS_DEFAULT.storm).toBe(CRISIS_CHOICE.expose);
    expect(CRISIS_DEFAULT.flare).toBe(CRISIS_CHOICE.carryOn);
  });
});

describe('what a job may cost', () => {
  it('is the level the batteries will hold at dusk', () => {
    const run = outpost('jezero');
    const budget = powerBudget(run);

    expect(budget.spendableKwh).toBe(150);
    expect(canAffordKwh(run, 25)).toBe(true);
  });

  it('is what the panels will add on top of the bank', () => {
    /* The bank is empty at dawn because the night took it, and the Sun was
       about to make 258 kWh. The job is paid for out of the day. */
    const empty = withState(outpost('jezero'), { stores: { ...outpost('jezero').stores, power: 0 } });

    expect(canAffordKwh(empty, 25)).toBe(true);
  });

  it('is nothing at all when there are no panels and no batteries', () => {
    const dark = withState(outpost('jezero'), { modules: [], stores: { ...outpost('jezero').stores, power: 0 } });

    expect(canAffordKwh(dark, 1)).toBe(false);
    expect(canAffordKwh(dark, 0)).toBe(true);
  });

  it('never offers more than the batteries can hold', () => {
    const run = outpost('jezero');
    const budget = powerBudget(run);

    expect(budget.spendableKwh).toBeLessThanOrEqual(budget.capacityKwh);
  });

  it('says whether the night survives the job', () => {
    const run = outpost('jezero');
    const budget = powerBudget(run);

    /* 150 in the bank, 120 for the night: a 25 kWh job leaves 125. */
    expect(keepsTheNight(budget, 25)).toBe(true);
    expect(keepsTheNight(budget, 140)).toBe(false);
  });
});
