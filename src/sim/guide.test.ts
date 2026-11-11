import { describe, expect, it } from 'vitest';

import { GUIDE_STEPS, guideStep } from './guide';

/*
 * The guide is the answer to "I do not know what I am playing", so the words
 * have to be short enough to read and specific enough to act on. A step that
 * does not say where it happens is a step nobody can follow.
 */
describe('the guide', () => {
  it('has steps to read', () => {
    expect(GUIDE_STEPS.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every step its own id', () => {
    const ids = GUIDE_STEPS.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every step short enough to read at a glance', () => {
    for (const step of GUIDE_STEPS) {
      expect(step.title.length).toBeGreaterThan(2);
      expect(step.body.length).toBeGreaterThan(20);
      expect(step.body.length).toBeLessThan(140);
    }
  });

  it('says where every step happens', () => {
    for (const step of GUIDE_STEPS) {
      expect(['desk', 'board', 'recap', 'build', 'tool']).toContain(step.where);
    }
  });

  it('covers the things a player has to work out', () => {
    const ids = GUIDE_STEPS.map((step) => step.id);

    for (const needed of ['job', 'systems', 'orders', 'checks', 'board', 'recap', 'score']) {
      expect(ids).toContain(needed);
    }
  });

  it('is found by id', () => {
    expect(guideStep('job')?.title).toBe('Your job');
    expect(guideStep('nothing-like-this')).toBeNull();
  });
});
