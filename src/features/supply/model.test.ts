import { describe, expect, it } from 'vitest';

import {
  APPROX_KG_PER_ASTRONAUT_PER_DAY,
  CHOICES,
  CORRECT_ANSWER,
  DAYS_PER_MONTH,
  DAYS_PER_PACKET,
  QUESTION,
  SUPPLY_BEATS,
  approximateTotalKg,
  astronautDays,
  hintFor,
  isCorrect,
  judge,
  missionDays,
  packsFor,
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
  });
});

describe('astronautDays', () => {
  it('counts the days every astronaut needs feeding for', () => {
    expect(astronautDays(2, 4)).toBe(240);
  });

  it('is not the same as missionDays, which is the trap in the question', () => {
    // 60 is the length of the trip; 240 is the food needed. Conflating them is the
    // mistake 240-as-the-answer encouraged.
    expect(astronautDays(2, 4)).not.toBe(missionDays(2));
  });

  it('scales with the crew', () => {
    expect(astronautDays(2, 8)).toBe(480);
  });
});

describe('packsFor', () => {
  it('divides the astronaut-days by the days one packet covers', () => {
    expect(packsFor(2, 4)).toBe(80);
  });

  it('answers the question on screen: 2 months, 4 astronauts, 80 packets', () => {
    // 60 days x 4 astronauts = 240 astronaut-days. 240 / 3 = 80.
    expect(packsFor(2, 4)).toBe(80);
  });

  it('scales with the crew', () => {
    expect(packsFor(2, 8)).toBe(160);
  });

  it('scales with the mission length', () => {
    expect(packsFor(4, 4)).toBe(160);
  });

  it('needs whole packets', () => {
    // Packs cannot be fractional. If a future question could produce a fraction,
    // this fails and forces the rule to be dealt with rather than rounding quietly.
    for (let months = 1; months <= 6; months++) {
      for (let crew = 1; crew <= 6; crew++) {
        expect(Number.isInteger(packsFor(months, crew))).toBe(true);
      }
    }
  });
});

describe('the packet', () => {
  it('covers three days, because three is what makes the division matter', () => {
    expect(DAYS_PER_PACKET).toBe(3);
  });

  it('makes 240 a wrong answer rather than the right one', () => {
    // 240 is the astronaut-days. It used to be the correct answer under the old
    // "one pack per day" rule and is deliberately still on the board now.
    expect(isCorrect(240)).toBe(false);
    expect(judge(240)).toBe('tooHigh');
  });
});

describe('CORRECT_ANSWER', () => {
  it('is the answer to the question the screen actually asks', () => {
    expect(CORRECT_ANSWER).toBe(packsFor(QUESTION.months, QUESTION.crewSize));
    expect(CORRECT_ANSWER).toBe(80);
  });
});

describe('CHOICES', () => {
  it('offers four amounts, so guessing is not free', () => {
    expect(CHOICES).toHaveLength(4);
  });

  it('includes the correct answer exactly once', () => {
    expect(CHOICES.filter((value) => value === CORRECT_ANSWER)).toHaveLength(1);
  });

  it('has no duplicates', () => {
    expect(new Set(CHOICES).size).toBe(CHOICES.length);
  });

  it('only offers whole numbers', () => {
    for (const value of CHOICES) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it('offers something on each side of the answer, so both hints are reachable', () => {
    // Without a wrong amount below and one above, half the feedback would never be
    // seen by anyone.
    expect(CHOICES.some((value) => value < CORRECT_ANSWER)).toBe(true);
    expect(CHOICES.some((value) => value > CORRECT_ANSWER)).toBe(true);
  });

  it('leaves the player able to reach the answer even if every wrong one is locked', () => {
    // Locking a wrong option must never strand anybody: after three wrong picks the
    // only live button is the right one.
    const locked = CHOICES.filter((value) => value !== CORRECT_ANSWER);
    expect(locked).toHaveLength(CHOICES.length - 1);
    expect(CHOICES.filter((value) => !locked.includes(value))).toEqual([CORRECT_ANSWER]);
  });
});

describe('judge', () => {
  it('calls the right answer correct', () => {
    expect(judge(80)).toBe('correct');
  });

  it('calls anything below it too low', () => {
    expect(judge(20)).toBe('tooLow');
    expect(judge(79)).toBe('tooLow');
  });

  it('calls anything above it too high', () => {
    expect(judge(240)).toBe('tooHigh');
    expect(judge(81)).toBe('tooHigh');
  });

  it('has no partial credit band', () => {
    // Being one packet out is not "nearly right" on a four-option question, and a
    // tolerance would have to be invented by someone.
    expect(judge(79)).not.toBe('correct');
    expect(judge(81)).not.toBe('correct');
  });

  it('judges against an explicit answer when given one', () => {
    expect(judge(10, 20)).toBe('tooLow');
    expect(judge(30, 20)).toBe('tooHigh');
    expect(judge(20, 20)).toBe('correct');
  });
});

describe('hintFor', () => {
  it('says nothing when the answer was right', () => {
    expect(hintFor('correct')).toBeNull();
  });

  it('tells a low pick to think larger', () => {
    const hint = hintFor('tooLow');
    expect(hint).toContain('too low');
    expect(hint).toMatch(/larger/i);
  });

  it('tells a high pick to think smaller', () => {
    const hint = hintFor('tooHigh');
    expect(hint).toContain('too high');
    expect(hint).toMatch(/smaller/i);
  });

  it('never names the correct answer', () => {
    // The point of a directional hint is that it narrows without giving it away.
    for (const verdict of ['tooLow', 'tooHigh'] as const) {
      expect(hintFor(verdict)).not.toContain(String(CORRECT_ANSWER));
    }
  });

  it('gives every verdict on the board a hint that fits it', () => {
    for (const value of CHOICES) {
      const hint = hintFor(judge(value));
      if (judge(value) === 'correct') expect(hint).toBeNull();
      else expect(hint).not.toBeNull();
    }
  });
});

describe('SUPPLY_BEATS', () => {
  it('covers all five resources the game is about', () => {
    const covered = SUPPLY_BEATS.map((beat) => beat.resource).filter(Boolean);
    for (const key of ['power', 'oxygen', 'water', 'food', 'shielding']) {
      expect(covered).toContain(key);
    }
  });

  it('has a label and a readable line for every beat', () => {
    for (const beat of SUPPLY_BEATS) {
      expect(beat.label.length).toBeGreaterThan(0);
      expect(beat.line.length).toBeGreaterThan(20);
    }
  });

  it('gives every beat a unique id', () => {
    const ids = SUPPLY_BEATS.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('states the days per packet, which the question depends on', () => {
    const beat = SUPPLY_BEATS.find((b) => b.id === 'packet-days');
    expect(beat?.line).toContain('three days');
  });

  it('ends on the packet facts, so they are freshest when the numbers arrive', () => {
    const lastTwo = SUPPLY_BEATS.slice(-2).map((beat) => beat.id);
    expect(lastTwo).toEqual(['packet', 'packet-days']);
  });
});

describe('workingSentence', () => {
  it('shows all three steps and the total', () => {
    expect(workingSentence()).toBe(
      '2 months is 60 days. 60 days for each of 4 astronauts is 240 astronaut-days. ' +
        'Each packet covers 3 days, so 240 divided by 3 is 80 packets.',
    );
  });

  it('draws every number from the model rather than restating it', () => {
    const sentence = workingSentence();
    expect(sentence).toContain(String(missionDays(QUESTION.months)));
    expect(sentence).toContain(String(astronautDays(QUESTION.months, QUESTION.crewSize)));
    expect(sentence).toContain(String(DAYS_PER_PACKET));
    expect(sentence).toContain(String(CORRECT_ANSWER));
  });

  it('can be given other numbers', () => {
    expect(workingSentence(1, 2)).toBe(
      '1 months is 30 days. 30 days for each of 2 astronauts is 60 astronaut-days. ' +
        'Each packet covers 3 days, so 60 divided by 3 is 20 packets.',
    );
  });
});

describe('successSentence', () => {
  it('gives the total, the days it covers, and the rough mass', () => {
    const sentence = successSentence();
    expect(sentence).toContain('80 packets');
    expect(sentence).toContain('240 astronaut-days');
    expect(sentence).toContain('432 kg');
  });

  it('hedges the real-world figure rather than stating it exactly', () => {
    expect(successSentence()).toMatch(/roughly|about/);
  });

  it('agrees with the functions it is built from', () => {
    expect(successSentence()).toContain(String(approximateTotalKg(QUESTION.months, QUESTION.crewSize)));
  });
});

describe('approximateTotalKg', () => {
  it('converts astronaut-days to a rough real-world mass', () => {
    // 240 astronaut-days x 1.8 kg = 432 kg
    expect(approximateTotalKg(2, 4)).toBe(432);
  });

  it('uses a per-astronaut daily figure, not the packet count', () => {
    expect(APPROX_KG_PER_ASTRONAUT_PER_DAY).toBe(1.8);
  });

  it('stays consistent with the packet count it sits beside', () => {
    // 80 packets x 3 days x 1.8 kg = 432 kg. If either number changes, this fails,
    // which is the point: the two lines on screen must not drift apart.
    expect(approximateTotalKg(QUESTION.months, QUESTION.crewSize)).toBe(
      CORRECT_ANSWER * DAYS_PER_PACKET * APPROX_KG_PER_ASTRONAUT_PER_DAY,
    );
  });

  it('never returns a fraction', () => {
    for (let months = 1; months <= 6; months++) {
      expect(Number.isInteger(approximateTotalKg(months, 4))).toBe(true);
    }
  });
});