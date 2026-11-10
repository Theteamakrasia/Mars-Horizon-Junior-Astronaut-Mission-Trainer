import { describe, expect, it } from 'vitest';

import { pendingCrisis } from '../../sim/crises';
import { createForecast } from '../../sim/forecast';
import { CORE_MODULES, type ModuleKind } from '../../sim/modules';
import { newRun, startOutpost, withState, type RunState } from '../../sim/run';
import { advanceSol, decide } from '../../sim/sol';
import { blackoutSols, consumptionSummary, explainOutcome, goalOutcomes, lowestPoints, nextSteps, reviewDecisions, scienceDetail, scienceHeadline, scienceReport, scienceSentence, timeline, usedApproximateData, wentEmpty } from './model';

const FLARES = [
  { classType: 'X5.8', approximate: true, when: 'in a test' },
  { classType: 'X5.8', approximate: true, when: 'in a test' },
];

function playOut(extras: readonly ModuleKind[], picks: Record<string, string>, flares = FLARES): RunState {
  let run = startOutpost(withState(newRun('jezero', 'Test'), { forecast: createForecast(flares) }), [...CORE_MODULES, ...extras]);

  while (run.status === 'active') {
    const crisis = pendingCrisis(run);

    if (crisis !== null) run = decide(run, crisis.id, picks[crisis.kind] ?? crisis.defaultOptionId);
    run = advanceSol(run);
  }

  return run;
}

const SMART = { flare: 'shelter', storm: 'retract-save', 'supply-pod': 'water' };
const SOLAR: readonly ModuleKind[] = ['solar-array', 'solar-array', 'batteries', 'batteries', 'greenhouse', 'regolith-shield'];

describe('explainOutcome', () => {
  it('praises a win without claiming the outpost is self-sustaining when it is not', () => {
    const run = playOut(SOLAR, SMART);

    expect(run.status).toBe('won');
    expect(explainOutcome(run).headline).toContain('all 12 sols');
    expect(explainOutcome(run).detail).toContain('reserves');
  });

  it('blames the missing greenhouse for a food loss, and is confident because it is a logged fact', () => {
    const run = playOut(['solar-array', 'solar-array', 'batteries', 'batteries', 'regolith-shield'], SMART);
    const explanation = explainOutcome(run);

    expect(run.status).toBe('lost');
    expect(explanation.headline).toContain('food');
    expect(explanation.detail).toContain('greenhouse');
    expect(explanation.confident).toBe(true);
  });

  it('blames carrying on during a flare for a shielding loss, and says what was built', () => {
    const run = playOut(['solar-array', 'batteries', 'greenhouse'], { ...SMART, flare: 'carry-on' });
    const explanation = explainOutcome(run);

    expect(explanation.headline).toContain('shielding');
    expect(explanation.detail).toContain('carry on working');
    expect(explanation.detail).toContain('no regolith shield');
    expect(explanation.detail).toMatch(/shield that was at \d+ out of 100/);
    expect(explanation.confident).toBe(true);
  });

  it('says when the clock ran out and the choice was made for the player', () => {
    let run = startOutpost(withState(newRun('jezero', 'T'), { forecast: createForecast(FLARES) }), [...CORE_MODULES, 'greenhouse']);

    while (run.status === 'active') {
      const crisis = pendingCrisis(run);

      if (crisis !== null) run = decide(run, crisis.id, crisis.defaultOptionId, true);
      run = advanceSol(run);
    }

    expect(explainOutcome(run).detail).toContain('the clock ran out');
  });

  it('refuses to guess when no rule matches: not confident, and points at the timeline', () => {
    const calm = playOut(SOLAR, SMART);
    const odd = withState(calm, {
      status: 'lost',
      log: calm.log.map((record) => ({ ...record, blackout: 0 })),
      stores: { power: 50, oxygen: 0, water: 50, food: 50, shielding: 50 },
    });
    const explanation = explainOutcome(odd);

    expect(explanation.confident).toBe(false);
    expect(explanation.detail).toContain('timeline');
  });

  it('never tells a player they merely failed', () => {
    for (const run of [playOut([], SMART), playOut(SOLAR, SMART)]) {
      const text = `${explainOutcome(run).headline} ${explainOutcome(run).detail}`.toLowerCase();

      expect(text).not.toContain('you failed');
      expect(text).not.toContain('game over');
      expect(text).not.toContain('dead');
      expect(text).not.toContain('die');
    }
  });
});

describe('the rest of the debrief', () => {
  it('totals what was used and wasted over the whole log', () => {
    const run = playOut(SOLAR, SMART);
    const summary = consumptionSummary(run);

    expect(summary.sols).toBe(12);
    expect(summary.crewFood).toBe(Math.round(12 * 10));
    expect(summary.powerGenerated).toBeGreaterThan(0);
  });

  it('lists the sols with a blackout', () => {
    expect(blackoutSols(playOut([], SMART)).length).toBeGreaterThan(0);
  });

  it('reviews each decision, calling carrying on through a flare a catch and sheltering a solve', () => {
    const caught = reviewDecisions(playOut(SOLAR, { ...SMART, flare: 'carry-on' }));
    const solved = reviewDecisions(playOut(SOLAR, SMART));

    expect(caught.find((review) => review.title.includes('flare'))?.verdict).toBe('caught');
    expect(solved.find((review) => review.title.includes('flare'))?.verdict).toBe('solved');
  });

  it('gives a verdict from the choice, not from whether the run happened to be won', () => {
    const run = playOut(SOLAR, { ...SMART, flare: 'carry-on' });
    const verdicts = reviewDecisions(run).filter((review) => review.title.includes('flare')).map((review) => review.verdict);

    expect(run.status === 'won' || run.status === 'lost').toBe(true);
    expect(verdicts.every((verdict) => verdict === 'caught')).toBe(true);
  });

  it('writes one timeline row per sol played', () => {
    const run = playOut(SOLAR, SMART);

    expect(timeline(run)).toHaveLength(12);
    expect(timeline(run)[0].sol).toBe(1);
  });

  it('finds the thinnest margin for each store', () => {
    const low = lowestPoints(playOut(SOLAR, SMART));

    expect(low.shielding).toBeLessThan(50);
    expect(low.oxygen).toBeGreaterThan(0);
  });

  it('reports when flare sizes came from fallback data, so the screen can say so', () => {
    expect(usedApproximateData(playOut(SOLAR, SMART))).toBe(true);
    expect(usedApproximateData(playOut(SOLAR, SMART, [{ classType: 'M1.0', approximate: false, when: 'today' }]))).toBe(false);
  });

  it('names the store that ended the run, and nothing at all after a win', () => {
    const lost = withState(playOut(SOLAR, SMART), { status: 'lost', stores: { power: 40, oxygen: 40, water: 0, food: 40, shielding: 40 } });

    expect(wentEmpty(lost)).toBe('water');
    expect(wentEmpty(playOut(SOLAR, SMART))).toBeNull();
  });
});

describe('nextSteps', () => {
  /** A finished run with a chosen cause of death, so the tip rules can be checked in isolation. */
  function endedByWater(extras: readonly ModuleKind[] = SOLAR): RunState {
    const run = playOut(extras, SMART);

    return withState(run, { status: 'lost', stores: { ...run.stores, water: 0 } });
  }

  it('tells a water loss with no ice miner to add one, and asks for it first', () => {
    const steps = nextSteps(endedByWater());

    expect(steps[0].title).toBe('Add an ice miner');
    expect(steps[0].art).toBe('ice-miner');
    expect(steps.length).toBeLessThanOrEqual(2);
  });

  it('points at the supply pod that carried water, when the crew unpacked something else', () => {
    const run = withState(endedByWater(), { decisions: [{ crisisId: 'supply-5', sol: 5, optionId: 'spares', timedOut: false }] });
    const steps = nextSteps(run);

    expect(steps.map((step) => step.title)).toContain('Choose water from the pod');
  });

  it('tells a food loss with no greenhouse to add one', () => {
    const run = playOut(['solar-array', 'batteries'], SMART);
    const steps = nextSteps(withState(run, { status: 'lost', stores: { ...run.stores, food: 0 } }));

    expect(steps[0].title).toBe('Add a greenhouse');
    expect(steps[0].art).toBe('greenhouse');
  });

  it('falls back to a harder site when nothing in the run suggests a fix', () => {
    const strong = startOutpost(withState(newRun('jezero', 'T'), { forecast: createForecast(FLARES) }), [
      ...CORE_MODULES,
      'solar-array',
      'solar-array',
      'batteries',
      'batteries',
      'batteries',
      'batteries',
      'greenhouse',
      'ice-miner',
      'regolith-shield',
    ]);
    const steps = nextSteps(withState(strong, { status: 'won' }));

    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('Try a harsher site');
    expect(steps[0].art).toBe('site');
  });

  it('honours the limit the panel has room for', () => {
    expect(nextSteps(endedByWater(), 1)).toHaveLength(1);
  });
});

describe('the science report', () => {
  it('reports no science for a run that chose nothing', () => {
    const report = scienceReport(playOut(SOLAR, SMART));

    expect(report.points).toBe(12);
    expect(report.activities).toHaveLength(0);
    expect(report.crisisSols).toEqual([3, 5, 7, 10]);
    expect(report.quietSols).toEqual([1, 2, 4, 6, 8, 9, 11, 12]);
    expect(scienceHeadline(report)).toBe('Your rank: Explorer.');
  });

  it('lists every activity the crew chose, with what it earned', () => {
    let run = startOutpost(withState(newRun('jezero', 'Test'), { forecast: createForecast(FLARES) }), [...CORE_MODULES, ...SOLAR]);

    run = withState(run, { chosenActivity: 'experiment' });
    run = advanceSol(run);

    const report = scienceReport(run);

    expect(report.activities).toHaveLength(1);
    expect(report.activities[0]?.sol).toBe(1);
    expect(report.activities[0]?.points).toBe(6);
    expect(report.points).toBe(7);
  });

  it('puts the crisis sols apart from the activity sols', () => {
    let run = startOutpost(withState(newRun('jezero', 'Test'), { forecast: createForecast(FLARES) }), [...CORE_MODULES, ...SOLAR]);

    for (let sol = 0; sol < 3; sol += 1) {
      const crisis = pendingCrisis(run);

      if (crisis !== null) run = decide(run, crisis.id, SMART[crisis.kind] ?? crisis.defaultOptionId);
      run = advanceSol(run);
    }

    const report = scienceReport(run);

    expect(report.crisisSols).toEqual([3]);
    expect(report.quietSols).toEqual([1, 2]);
  });

  it('names the rank without getting the article wrong', () => {
    const report = scienceReport(withState(playOut(SOLAR, SMART), { science: 30 }));

    expect(scienceHeadline(report)).toBe('Your rank: Research Lead.');
    expect(scienceDetail(report)).toContain('11 more points');
  });

  it('says the top rank is the top rank', () => {
    const report = scienceReport(withState(playOut(SOLAR, SMART), { science: 52 }));

    expect(scienceDetail(report)).toContain('top rank');
    expect(report.next).toBeNull();
  });

  it('writes the score as a sentence for screen readers', () => {
    const report = scienceReport(withState(playOut(SOLAR, SMART), { science: 30 }));

    expect(scienceSentence(report)).toContain('30 science points');
    expect(scienceSentence(report)).toContain('Research Lead');
  });
});

describe('the five science goals at the end', () => {
  it('reports on all five, in order', () => {
    const outcomes = goalOutcomes(playOut(SOLAR, SMART));

    expect(outcomes).toHaveLength(5);
    expect(outcomes.map((outcome) => outcome.title)).toEqual([
      'Martian Dust Storm',
      'Life Support',
      'Radiation Exposure',
      'Power Shortage',
      'Food Production',
    ]);
  });

  it('says the dust was held when the panels stayed clean', () => {
    const dust = goalOutcomes(playOut(SOLAR, SMART)).find((outcome) => outcome.id === 'dust-storm');

    expect(dust?.verdict).toBe('held');
    expect(dust?.detail).toContain('still clean');
  });

  it('says the power took damage when the batteries ran flat', () => {
    const power = goalOutcomes(playOut([], SMART)).find((outcome) => outcome.id === 'power');

    expect(power?.verdict).toBe('hurt');
    expect(power?.detail).toContain('ran flat');
  });

  it('says the food failed when the food ran out', () => {
    const run = playOut(['solar-array', 'solar-array', 'batteries', 'batteries', 'regolith-shield'], SMART);
    const food = goalOutcomes(run).find((outcome) => outcome.id === 'food');

    expect(run.status).toBe('lost');
    expect(food?.verdict).toBe('failed');
    expect(food?.detail).toContain('food ran out');
  });

  it('says the radiation failed when the shielding ran out', () => {
    const run = playOut(
      ['solar-array', 'batteries', 'greenhouse'],
      { ...SMART, flare: 'carry-on' },
    );
    const radiation = goalOutcomes(run).find((outcome) => outcome.id === 'radiation');

    expect(radiation?.verdict).toBe('failed');
    expect(radiation?.detail).toContain('shielding ran out');
  });

  it('always gives every goal a verdict and a line', () => {
    for (const outcome of goalOutcomes(playOut(SOLAR, SMART))) {
      expect(['held', 'hurt', 'failed']).toContain(outcome.verdict);
      expect(outcome.detail.length).toBeGreaterThan(10);
    }
  });
});
