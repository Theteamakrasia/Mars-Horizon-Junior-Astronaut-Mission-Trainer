/**
 * The day tracker's model: which day the player is on, and which pips are lit.
 *
 * The model is pure, so these tests need no browser. The DOM half of the
 * tracker cannot be tested here because there is no jsdom yet (ISS-013); it is
 * checked in a real browser by `tools/browser-check-day.mjs`.
 */

import { describe, it, expect } from 'vitest';
import { dayModel } from './dayTracker';
import { WIN_SOL } from '../sim/sol';
import { newRun, withState, type RunState } from '../sim/run';

/** A run on a given sol, still in play. */
function onSol(sol: number): RunState {
  return withState(newRun('arcadia', 'Tester'), { sol });
}

/** A run that has ended, one way or the other. */
function ended(sol: number, status: 'won' | 'lost'): RunState {
  return withState(onSol(sol), { status });
}

describe('dayModel', () => {
  it('counts the whole mission', () => {
    const model = dayModel(onSol(0));

    expect(model.total).toBe(WIN_SOL);
    expect(model.states).toHaveLength(WIN_SOL);
  });

  it('takes the total from the game, not from a number typed here', () => {
    /* If WIN_SOL ever moves, the tracker moves with it. A hard-coded 12 would
       quietly disagree with the simulation. */
    expect(dayModel(onSol(0)).total).toBe(WIN_SOL);
    expect(dayModel(onSol(0)).states).toHaveLength(WIN_SOL);
  });

  it('puts the player on day one before the first sol', () => {
    const model = dayModel(onSol(0));

    expect(model.day).toBe(1);
    expect(model.done).toBe(0);
    expect(model.states[0]).toBe('current');
    expect(model.states.slice(1).every((state) => state === 'upcoming')).toBe(true);
  });

  it('moves the day on when a sol has been flown', () => {
    const model = dayModel(onSol(1));

    expect(model.day).toBe(2);
    expect(model.done).toBe(1);
    expect(model.states[0]).toBe('done');
    expect(model.states[1]).toBe('current');
    expect(model.states.slice(2).every((state) => state === 'upcoming')).toBe(true);
  });

  it('holds the last day for the last sol', () => {
    const model = dayModel(onSol(WIN_SOL - 1));

    expect(model.day).toBe(WIN_SOL);
    expect(model.states[WIN_SOL - 1]).toBe('current');
    expect(model.states.slice(0, WIN_SOL - 1).every((state) => state === 'done')).toBe(true);
  });

  it('has no day in play once the run is won', () => {
    const model = dayModel(ended(WIN_SOL, 'won'));

    expect(model.day).toBe(WIN_SOL);
    expect(model.done).toBe(WIN_SOL);
    expect(model.states.every((state) => state === 'done')).toBe(true);
    expect(model.states).not.toContain('current');
  });

  it('has no day in play once the run is lost', () => {
    const model = dayModel(ended(4, 'lost'));

    expect(model.day).toBe(4);
    expect(model.done).toBe(4);
    expect(model.states.slice(0, 4).every((state) => state === 'done')).toBe(true);
    expect(model.states).not.toContain('current');
    expect(model.states.slice(4).every((state) => state === 'upcoming')).toBe(true);
  });

  it('reads a missing run as the first day', () => {
    const model = dayModel(null);

    expect(model.day).toBe(1);
    expect(model.done).toBe(0);
    expect(model.states[0]).toBe('current');
  });

  it('clamps a sol that is past the end of the mission', () => {
    const model = dayModel(onSol(WIN_SOL + 5));

    expect(model.done).toBe(WIN_SOL);
    expect(model.day).toBe(WIN_SOL);
    expect(model.states).toHaveLength(WIN_SOL);
  });

  it('carries the sol that was just flown, for the flash', () => {
    expect(dayModel(onSol(3), 3).advanced).toBe(3);
    expect(dayModel(onSol(3)).advanced).toBe(0);
  });
});
