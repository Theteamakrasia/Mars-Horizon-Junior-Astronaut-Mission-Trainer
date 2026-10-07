import { describe, expect, it } from 'vitest';

import {
  APPROX_KG_PER_ASTRONAUT_PER_DAY,
  CHOICES,
  CORRECT_ANSWER,
  DAYS_PER_MONTH,
  QUESTION,
  RATIONS_PER_ASTRONAUT_PER_DAY,
  RESOURCE_FACTS,
  approximateTotalKg,
  explainChoice,
  isCorrect,
  missionDays,
  rationsFor,
  successSentence,
  workingSentence,
} from './model';

/**
 * Every input is a literal number. Nothing here reads the clock or Math.random,
 * so this file cannot flake, which is the defect recorded as ISS-015.
 */

describe('missionDays', () => {
  it('turns months into days', () => {
    expect(missionDays(2)).toBe(60);
  });

  it('treats a month as 30 days', () => {
    expect(DAYS_PER_MONTH).toBe(30);
    expect(missionDays(1)).toBe(30);
    expect(missionDays(6)).toBe(180);
  });

  it('returns 0 for no months', () => {
    expect(missionDays(0)).toBe(0);
  });
});

describe('rationsFor', () => {
  it('answers the question on screen: 2 months, 4 astronauts, 240 packs', () => {
    expect(rationsFor(2, 4)).toBe(240);
  });

  it('counts one pack per astronaut per day', () => {
    expect(RATIONS_PER_ASTRONAUT_PER_DAY).toBe(1);
  });

  it('scales with the crew', () => {
    // Doubling the crew doubles the packs, which is the step the arithmetic
    // actually turns on.
    expect(rationsFor(2, 8)).toBe(240 * 2);
  });

  it('scales with the mission length', () => {
    expect(rationsFor(4, 4)).toBe(240 * 2);
  });

  it('needs no packs for no crew', () => {
    expect(rationsFor(2, 0)).toBe(0);
  });

  it('needs no packs for no mission', () => {
    expect(rationsFor(0, 4)).toBe(0);
  });
});

describe('CORRECT_ANSWER', () => {
  it('is the answer to the question the screen actually asks', () => {
    expect(CORRECT_ANSWER).toBe(rationsFor(QUESTION.months, QUESTION.crewSize));
    expect(CORRECT_ANSWER).toBe(240);
  });
});

describe('CHOICES', () => {
  it('includes the correct answer exactly once', () => {
    expect(CHOICES.filter((choice) => choice.value === CORRECT_ANSWER)).toHaveLength(1);
  });

  it('offers four answers, so a guess has a one in four chance', () => {
    expect(CHOICES).toHaveLength(4);
  });

  it('has no duplicate values', () => {
    const values = CHOICES.map((choice) => choice.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('marks only the correct answer with no mistake text', () => {
    for (const choice of CHOICES) {
      if (choice.value === CORRECT_ANSWER) expect(choice.mistake).toBeNull();
      else expect(choice.mistake).not.toBeNull();
    }
  });

  it('gives every wrong answer an explanation a child can read', () => {
    for (const choice of CHOICES) {
      if (choice.mistake === null) continue;
      expect(choice.mistake.length).toBeGreaterThan(20);
    }
  });

  it('only offers whole numbers', () => {
    // A decimal pack count would be nonsense; ration packs are countable.
    for (const choice of CHOICES) {
      expect(Number.isInteger(choice.value)).toBe(true);
      expect(choice.value).toBeGreaterThan(0);
    }
  });
});

describe('isCorrect', () => {
  it('accepts the right answer', () => {
    expect(isCorrect(240)).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(isCorrect(120)).toBe(false);
  });

  it('can be given an explicit answer to check against', () => {
    expect(isCorrect(4, 4)).toBe(true);
    expect(isCorrect(4, 240)).toBe(false);
  });

  it('does not accept a near miss', () => {
    // Guards against a loose comparison turning 239 into a pass.
    expect(isCorrect(239)).toBe(false);
    expect(isCorrect(241)).toBe(false);
  });
});

describe('explainChoice', () => {
  it('returns null for the right answer, which has nothing to explain', () => {
    expect(explainChoice(240)).toBeNull();
  });

  it('explains a wrong answer', () => {
    expect(explainChoice(120)).toContain('30 days');
  });

  it('returns null for a number that is not on the board', () => {
    // A stale DOM could pass anything; unknown values must not throw.
    expect(explainChoice(9999)).toBeNull();
  });
});

describe('RESOURCE_FACTS', () => {
  it('covers all five resources the game is about', () => {
    expect(RESOURCE_FACTS.map((fact) => fact.key)).toEqual([
      'power',
      'oxygen',
      'water',
      'food',
      'shielding',
    ]);
  });

  it('has one line per resource, so the list stays scannable', () => {
    for (const fact of RESOURCE_FACTS) {
      expect(fact.label.length).toBeGreaterThan(0);
      expect(fact.line.length).toBeGreaterThan(20);
    }
  });

  it('never repeats a resource', () => {
    const keys = RESOURCE_FACTS.map((fact) => fact.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('states the ration pack rule, which the question depends on', () => {
    const food = RESOURCE_FACTS.find((fact) => fact.key === 'food');
    expect(food?.line).toContain('one pack per astronaut per day');
  });
});

describe('workingSentence', () => {
  it('shows the two steps and the total, for the question actually asked', () => {
    // "60 days" then "240 packs" is the whole lesson. A child who reads this can
    // see which of the two steps they did.
    expect(workingSentence()).toBe(
      '2 months is 60 days, and 60 days for each of 4 astronauts is 240 packs.',
    );
  });

  it('defaults to the question on screen, so the two cannot drift apart', () => {
    // An earlier version hardcoded the prose while the arithmetic lived elsewhere,
    // which is how a screen ends up asking about 3 months beside a 60-day working.
    expect(workingSentence()).toContain(`${missionDays(QUESTION.months)} days`);
    expect(workingSentence()).toContain(String(rationsFor(QUESTION.months, QUESTION.crewSize)));
  });

  it('can be given other numbers', () => {
    expect(workingSentence(1, 2)).toBe('1 months is 30 days, and 30 days for each of 2 astronauts is 60 packs.');
  });
});

describe('successSentence', () => {
  it('gives the total and the rough mass, and never a bare approximation', () => {
    const sentence = successSentence();
    expect(sentence).toContain('240 packs');
    expect(sentence).toContain('432 kg');
    // "about" or "roughly", so the real-world figure is not read as exact.
    expect(sentence).toMatch(/roughly|about/);
  });

  it('agrees with the functions it is built from', () => {
    expect(successSentence()).toContain(String(approximateTotalKg(QUESTION.months, QUESTION.crewSize)));
  });
});

describe('approximateTotalKg', () => {
  it('converts the pack count to a rough real-world mass', () => {
    // 60 days x 4 astronauts x 1.8 kg = 432 kg
    expect(approximateTotalKg(2, 4)).toBe(432);
  });

  it('uses a per-astronaut daily figure, not the pack count', () => {
    expect(APPROX_KG_PER_ASTRONAUT_PER_DAY).toBe(1.8);
  });

  it('rounds to whole kilograms', () => {
    // An earlier version of this test expected 2, from forgetting that a month is
    // 30 days. It also claimed the rounding mattered, which it does not: days are
    // always a multiple of 30 and 1.8 x 30 = 54 exactly, so the result is always
    // whole for any whole number of months and astronauts. Kept as one assertion
    // so that a future change to the figure cannot start printing decimals.
    expect(Number.isInteger(approximateTotalKg(2, 4))).toBe(true);
    expect(Number.isInteger(approximateTotalKg(1, 1))).toBe(true);
    expect(Number.isInteger(approximateTotalKg(6, 3))).toBe(true);
  });

  it('stays consistent with the pack count it sits beside', () => {
    // 240 packs at 1.8 kg per pack-day is 432 kg. If either number changes, this
    // fails, which is the point: the two lines on screen must not drift apart.
    expect(approximateTotalKg(QUESTION.months, QUESTION.crewSize)).toBe(
      CORRECT_ANSWER * APPROX_KG_PER_ASTRONAUT_PER_DAY,
    );
  });
});