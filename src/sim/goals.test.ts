import { describe, expect, it } from 'vitest';

import { goalById, goalProgress, goalReadings, goalsEarned, GOAL_TARGETS, SCIENCE_GOALS } from './goals';
import { CORE_MODULES, type ModuleKind } from './modules';
import { newRun, startOutpost, withState, type RunState } from './run';
import { advanceSol, WIN_SOL } from './sol';
import { SCIENCE_TOPICS } from './topics';
import type { ForecastEvent } from './forecast';

/*
 * The five science goals are the spine of the game, so their readings are
 * facts about the outpost and not decoration. These tests pin the numbers a
 * child would read off the screen.
 */

const SOLAR: readonly ModuleKind[] = ['solar-array', 'solar-array', 'batteries', 'batteries'];
const CLOSED_LOOP: readonly ModuleKind[] = [
  'solar-array',
  'solar-array',
  'batteries',
  'batteries',
  'greenhouse',
  'ice-miner',
  'regolith-shield',
];

/**
 * A timetable with the events on known sols, so a test can point at one.
 *
 * The forecast is rolled per run, so a test cannot assume a storm is on sol 7
 * or a flare on sol 3. This one puts them there.
 */
function fixedForecast(): readonly ForecastEvent[] {
  return [
    { id: 'flare-3', sol: 3, kind: 'flare', durationSols: 1, intensity: 2, summary: 'A flare.', approximate: true },
    { id: 'supply-5', sol: 5, kind: 'supply-pod', durationSols: 1, intensity: 0, summary: 'A pod.', approximate: false },
    { id: 'storm-7', sol: 7, kind: 'storm', durationSols: 2, intensity: 0, summary: 'A storm.', approximate: false },
    { id: 'flare-10', sol: 10, kind: 'flare', durationSols: 1, intensity: 2, summary: 'A flare.', approximate: true },
  ];
}

function outpost(region: string, extras: readonly ModuleKind[]): RunState {
  const base = withState(newRun(region, 'Tester'), { forecast: fixedForecast() });

  return startOutpost(base, [...CORE_MODULES, ...extras]);
}

function readingOf(run: RunState, id: string): string {
  return goalReadings(run).find((reading) => reading.spec.id === id)?.detail ?? '';
}

function statusOf(run: RunState, id: string): string {
  return goalReadings(run).find((reading) => reading.spec.id === id)?.status ?? '';
}

describe('the five science goals', () => {
  it('are the five the mission is about, in the order they are shown', () => {
    expect(SCIENCE_GOALS.map((goal) => goal.title)).toEqual([
      'Martian Dust Storm',
      'Life Support',
      'Radiation Exposure',
      'Power Shortage',
      'Food Production',
    ]);
  });

  it('each file its NASA fact under a topic of its own', () => {
    for (const goal of SCIENCE_GOALS) {
      expect(SCIENCE_TOPICS).toContain(goal.topic);
    }

    /* No two goals share a topic, or the dust storm and the power shortage
       would show the same fact on the same screen. */
    const topics = SCIENCE_GOALS.map((goal) => goal.topic);

    expect(new Set(topics).size).toBe(topics.length);
  });

  it('each say what the goal is really about', () => {
    for (const goal of SCIENCE_GOALS) {
      expect(goal.question.length).toBeGreaterThan(10);
    }
  });

  it('are found by id', () => {
    expect(goalById('power')?.title).toBe('Power Shortage');
  });
});

describe('reading the goals off a run', () => {
  it('gives one reading per goal, in order', () => {
    const readings = goalReadings(outpost('jezero', CLOSED_LOOP));

    expect(readings).toHaveLength(SCIENCE_GOALS.length);
    expect(readings.map((reading) => reading.spec.id)).toEqual([
      'dust-storm',
      'life-support',
      'radiation',
      'power',
      'food',
    ]);
  });

  it('says the panels are clean when they are clean', () => {
    expect(readingOf(outpost('jezero', CLOSED_LOOP), 'dust-storm')).toContain('panels are clean');
  });

  it('warns when a dust storm is on the way, without saying the panels have failed', () => {
    /* The storm starts on sol 7 and lasts two sols. A storm the crew can see
       coming is a warning, not a failure: `critical` is kept for the panels
       failing now, which is the one they cannot prepare for. */
    const run = withState(outpost('jezero', CLOSED_LOOP), { sol: 6 });

    expect(readingOf(run, 'dust-storm')).toContain('dust storm is on the way');
    expect(statusOf(run, 'dust-storm')).toBe('watch');
  });

  it('says the dust damage to the panels is for good', () => {
    const dusty = withState(outpost('jezero', CLOSED_LOOP), { panelHealth: 0.5 });

    expect(readingOf(dusty, 'dust-storm')).toContain('for good');
    expect(statusOf(dusty, 'dust-storm')).toBe('critical');
  });

  it('says what the crew have to breathe and drink', () => {
    const detail = readingOf(outpost('jezero', CLOSED_LOOP), 'life-support');

    expect(detail).toContain('Air at');
    expect(detail).toContain('water at');
  });

  it('blames the flat batteries when the air and water makers slow down', () => {
    let run = outpost('jezero', []);

    run = advanceSol(run);

    expect(readingOf(run, 'life-support')).toContain('ran flat');
    expect(statusOf(run, 'life-support')).toBe('critical');
  });

  it('says how much shielding is left, because that is all there is', () => {
    const detail = readingOf(outpost('jezero', CLOSED_LOOP), 'radiation');

    expect(detail).toContain('Shielding at');
  });

  it('warns about a flare that is on the way', () => {
    const run = withState(outpost('jezero', CLOSED_LOOP), { sol: 2 });

    expect(readingOf(run, 'radiation')).toContain('flare is on the way');
    expect(statusOf(run, 'radiation')).toBe('watch');
  });

  it('says how much power is in the batteries', () => {
    const detail = readingOf(outpost('jezero', CLOSED_LOOP), 'power');

    expect(detail).toContain('kWh in the batteries');
    expect(detail).toContain('kW by day');
  });

  it('warns when the batteries are too low for a night', () => {
    const run = withState(outpost('jezero', CLOSED_LOOP), { stores: { ...outpost('jezero', CLOSED_LOOP).stores, power: 20 } });

    expect(statusOf(run, 'power')).toBe('watch');
  });

  it('says the greenhouse grows more than the crew eat, when it does', () => {
    expect(readingOf(outpost('jezero', CLOSED_LOOP), 'food')).toContain('Food is not the problem');
    expect(statusOf(outpost('jezero', CLOSED_LOOP), 'food')).toBe('ok');
  });

  it('says there is no greenhouse when there is not one', () => {
    const run = outpost('jezero', SOLAR);

    expect(readingOf(run, 'food')).toContain('No greenhouse');
    expect(statusOf(run, 'food')).toBe('critical');
  });

  it('every line says something', () => {
    for (const reading of goalReadings(outpost('jezero', CLOSED_LOOP))) {
      expect(reading.detail.length).toBeGreaterThan(10);
      expect(['ok', 'watch', 'critical']).toContain(reading.status);
    }
  });
});

/*
 * The objectives are what a goal became: something to earn, with a count the
 * player can see. The counters are cumulative on purpose, so a sol of good
 * work is never lost to one bad afternoon.
 */
describe('the goals as objectives', () => {
  it('gives one objective per goal, in the same order', () => {
    const objectives = goalProgress(outpost('jezero', CLOSED_LOOP));

    expect(objectives).toHaveLength(5);
    expect(objectives.map((objective) => objective.id)).toEqual([
      'dust-storm',
      'life-support',
      'radiation',
      'power',
      'food',
    ]);
  });

  it('starts every objective at zero, with the target in plain sight', () => {
    for (const objective of goalProgress(outpost('jezero', CLOSED_LOOP))) {
      expect(objective.held).toBe(0);
      expect(objective.needed).toBeGreaterThan(0);
      expect(objective.needed).toBeLessThanOrEqual(WIN_SOL);
      expect(objective.earned).toBe(false);
      expect(objective.aim.length).toBeGreaterThan(5);
      expect(objective.detail.length).toBeGreaterThan(3);
    }
  });

  it('counts a good sol towards every goal the outpost is holding', () => {
    let run = outpost('jezero', CLOSED_LOOP);

    run = advanceSol(run);

    const held = goalProgress(run).map((objective) => objective.held);

    expect(held).toEqual([1, 1, 1, 1, 1]);
  });

  it('does not count a sol with a blackout towards the power goal', () => {
    /* No solar and no batteries: the batteries are flat from the first sol. */
    let run = outpost('jezero', []);

    run = advanceSol(run);

    const power = goalProgress(run).find((objective) => objective.id === 'power');

    expect(power?.held).toBe(0);
    expect(power?.slipping).toBe(true);
  });

  it('keeps counting a sol towards the goals it did hold', () => {
    /* The same bad sol: the power goal is lost, the food goal is not. */
    let run = outpost('jezero', []);

    run = advanceSol(run);

    const objectives = goalProgress(run);
    const food = objectives.find((objective) => objective.id === 'food');
    const power = objectives.find((objective) => objective.id === 'power');

    expect(food?.held).toBe(1);
    expect(power?.held).toBe(0);
  });

  it('earns a goal once enough sols have counted', () => {
    let run = outpost('jezero', CLOSED_LOOP);

    for (let sol = 0; sol < GOAL_TARGETS.food; sol += 1) run = advanceSol(run);

    const food = goalProgress(run).find((objective) => objective.id === 'food');

    expect(food?.held).toBe(GOAL_TARGETS.food);
    expect(food?.earned).toBe(true);
    expect(goalsEarned(run)).toBeGreaterThanOrEqual(1);
  });
});
