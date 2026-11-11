import { describe, expect, it } from 'vitest';

import {
  ENGINE_ORDER,
  ENGINE_UNLOCK_SOL,
  engineUnlocked,
  gradeMatch,
  gradePack,
  gradeRadar,
  gradeSequence,
  gradeSort,
  gradeTiming,
  type PackItem,
} from './minigames';

/*
 * The stars are the only thing an inspection changes: they multiply the
 * science an order is worth, and they never touch a store. These tests hold
 * that the grading is fair, and that no tool is worth more than another.
 */
describe('the checklist', () => {
  const TARGET = ['Power', 'Air', 'Water'];

  it('gives three stars for the right order', () => {
    const grade = gradeSequence(TARGET, TARGET);

    expect(grade.stars).toBe(3);
    expect(grade.correct).toBe(true);
  });

  it('gives two for the right order with a step left out', () => {
    expect(gradeSequence(['Power', 'Air'], TARGET).stars).toBe(2);
  });

  it('gives one for the right steps in the wrong order', () => {
    expect(gradeSequence(['Air', 'Power'], TARGET).stars).toBe(1);
  });

  it('gives one for partly right and none for wrong', () => {
    expect(gradeSequence(['Power', 'Shield'], TARGET).stars).toBe(1);
    expect(gradeSequence(['Shield'], TARGET).stars).toBe(0);
  });

  it('says something every time', () => {
    for (const grade of [gradeSequence([], TARGET), gradeSequence(TARGET, TARGET)]) {
      expect(grade.message.length).toBeGreaterThan(3);
    }
  });
});

describe('the radar', () => {
  it('gives three stars for finding it first', () => {
    const grade = gradeRadar([7], 7);

    expect(grade.stars).toBe(3);
    expect(grade.correct).toBe(true);
  });

  it('gives fewer the longer it takes', () => {
    expect(gradeRadar([1, 2, 7], 7).stars).toBe(2);
    expect(gradeRadar([1, 2, 3, 4, 7], 7).stars).toBe(1);
  });

  it('gives nothing when it was never found', () => {
    const grade = gradeRadar([1, 2, 3], 7);

    expect(grade.stars).toBe(0);
    expect(grade.correct).toBe(false);
  });
});

describe('the timing', () => {
  it('gives three stars dead centre', () => {
    expect(gradeTiming(0.5, 0.4, 0.6).stars).toBe(3);
  });

  it('gives two inside the band but off centre', () => {
    expect(gradeTiming(0.42, 0.4, 0.6).stars).toBe(2);
  });

  it('gives one just outside and none a long way off', () => {
    expect(gradeTiming(0.7, 0.4, 0.6).stars).toBe(1);
    expect(gradeTiming(0.95, 0.4, 0.6).stars).toBe(0);
  });
});

describe('the sorting', () => {
  it('gives three stars for all the good ones and no mistakes', () => {
    expect(gradeSort(['a', 'b'], ['a', 'b']).stars).toBe(3);
  });

  it('gives two for keeping the good ones and no mistakes', () => {
    expect(gradeSort(['a'], ['a', 'b']).stars).toBe(2);
  });

  it('takes a wrong answer off the score', () => {
    expect(gradeSort(['a', 'z'], ['a', 'b']).stars).toBe(1);
    expect(gradeSort(['z'], ['a', 'b']).stars).toBe(0);
  });
});

describe('the packing', () => {
  const items: readonly PackItem[] = [
    { id: 'food', label: 'Food', mass: 4, value: 5 },
    { id: 'parts', label: 'Parts', mass: 3, value: 6 },
    { id: 'rock', label: 'Rock', mass: 9, value: 8 },
  ];

  it('gives three stars for the best pod that will launch', () => {
    /* Parts and rock are worth more than food and parts, and they fit. */
    expect(gradePack(['parts', 'rock'], items, 12).stars).toBe(3);
  });

  it('gives two for a pod that leaves value on the table', () => {
    expect(gradePack(['food', 'parts'], items, 12).stars).toBe(2);
  });

  it('gives nothing for a pod that is too heavy', () => {
    const grade = gradePack(['rock'], items, 8);

    expect(grade.stars).toBe(0);
    expect(grade.message).toContain('launch');
  });

  it('gives something for a light pod and nothing for an empty one', () => {
    expect(gradePack(['food'], items, 12).stars).toBeGreaterThan(0);
    expect(gradePack([], items, 12).stars).toBe(0);
  });
});

describe('the matching', () => {
  it('gives three stars for every pair', () => {
    const pairs = [['a', 'x'], ['b', 'y']] as const;

    expect(gradeMatch(pairs, { a: 'x', b: 'y' }).stars).toBe(3);
  });

  it('gives fewer the more that are wrong', () => {
    const pairs = [['a', 'x'], ['b', 'y']] as const;

    expect(gradeMatch(pairs, { a: 'x', b: 'z' }).stars).toBe(2);
    expect(gradeMatch(pairs, { a: 'z', b: 'z' }).stars).toBe(0);
  });
});

describe('the tools', () => {
  it('are six of them, each unlocking on its own sol', () => {
    expect(ENGINE_ORDER).toHaveLength(6);
    expect(new Set(ENGINE_ORDER).size).toBe(6);
  });

  it('unlock one at a time, and the first is there on sol one', () => {
    const sols = ENGINE_ORDER.map((engine) => ENGINE_UNLOCK_SOL[engine]);

    expect(Math.min(...sols)).toBe(1);
    expect([...sols].sort((a, b) => a - b)).toEqual(sols);
  });

  it('are locked before their sol', () => {
    expect(engineUnlocked('sequence', 1)).toBe(true);
    expect(engineUnlocked('radar', 4)).toBe(false);
    expect(engineUnlocked('radar', 5)).toBe(true);
  });
});
