import { describe, expect, it } from 'vitest';

import { createForecast } from './forecast';
import { goalById, goalReadings, SCIENCE_GOALS } from './goals';
import { CORE_MODULES, type ModuleKind } from './modules';
import { newRun, startOutpost, withState, type RunState } from './run';
import { advanceSol } from './sol';
import { SCIENCE_TOPICS } from './topics';

/*
 * The five science goals are the spine of the game, so their readings are
 * facts about the outpost and not decoration. These tests pin the numbers a
 * child would read off the screen.
 */

const FLARES = [
  { classType: 'M5.0', approximate: true, when: 'in a test' },
  { classType: 'M5.0', approximate: true, when: 'in a test' },
];

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

function outpost(region: string, extras: readonly ModuleKind[]): RunState {
  const base = withState(newRun(region, 'Tester'), { forecast: createForecast(FLARES) });

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

  it('says a dust storm is over the panels when one is', () => {
    /* The storm starts on sol 7 and lasts two sols. */
    const run = withState(outpost('jezero', CLOSED_LOOP), { sol: 6 });

    expect(readingOf(run, 'dust-storm')).toContain('dust storm is over the panels');
    expect(statusOf(run, 'dust-storm')).toBe('critical');
  });

  it('says the dust damage to the panels is for good', () => {
    const dusty = withState(outpost('jezero', CLOSED_LOOP), { panelHealth: 0.5 });

    expect(readingOf(dusty, 'dust-storm')).toContain('for good');
    expect(statusOf(dusty, 'dust-storm')).toBe('watch');
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
