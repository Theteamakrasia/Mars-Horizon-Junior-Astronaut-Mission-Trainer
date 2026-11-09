import { describe, expect, it } from 'vitest';

import { pendingCrisis } from '../../sim/crises';
import { createForecast } from '../../sim/forecast';
import { CORE_MODULES, type ModuleKind } from '../../sim/modules';
import { newRun, startOutpost, withState, type RunState } from '../../sim/run';
import { advanceSol, decide } from '../../sim/sol';
import { blackoutSols, consumptionSummary, explainOutcome, lowestPoints, reviewDecisions, timeline, usedApproximateData } from './model';

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
});
