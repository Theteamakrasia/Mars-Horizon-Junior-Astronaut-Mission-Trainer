import { describe, expect, it } from 'vitest';

import {
  BEATS,
  beatDuration,
  beatsThrough,
  CHARS_PER_SECOND,
  MAX_BEAT_MS,
  totalWeight,
  greetingFor,
} from './model';

/**
 * Every input is a literal. Nothing here reaches for Math.random or a clock, so
 * this file cannot flake — the defect recorded as ISS-015.
 */

describe('BEATS', () => {
  it('is not empty and has stable unique ids', () => {
    expect(BEATS.length).toBeGreaterThan(0);

    const ids = BEATS.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every beat non-empty copy', () => {
    // An empty beat would render as a pause with nothing said.
    for (const beat of BEATS) {
      expect(beat.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('gives every beat a positive weight', () => {
    for (const beat of BEATS) {
      expect(beat.weight).toBeGreaterThan(0);
    }
  });

  it('reads as short sentences an eight-year-old could read alone', () => {
    // The README promises no unexplained jargon and a child who can follow it
    // without a manual. A very long line is the most likely way to break that,
    // so the ceiling is asserted rather than trusted.
    for (const beat of BEATS) {
      expect(beat.text.length).toBeLessThanOrEqual(120);
    }
  });

  it('ends by asking the player whether they are ready', () => {
    // The last beat is the hand-off into the game, so it has to address the
    // player rather than trail off.
    const last = BEATS[BEATS.length - 1];
    expect(last.id).toBe('ready');
    expect(last.text).toContain('?');
  });

  it('states that the crew has more than one member', () => {
    // "Along with other experienced team members" is the premise of the scene, so
    // a rewrite that dropped it would silently change the game's framing.
    const all = BEATS.map((beat) => beat.text).join(' ');
    expect(all).toContain('Two others');
  });

  it('says the job is to build an outpost on Mars', () => {
    const all = BEATS.map((beat) => beat.text).join(' ');
    expect(all).toContain('Mars');
    expect(all.toLowerCase()).toContain('outpost');
  });
});

describe('totalWeight', () => {
  it('sums every beat', () => {
    const expected = BEATS.reduce((sum, beat) => sum + beat.weight, 0);
    expect(totalWeight()).toBe(expected);
  });

  it('is zero for no beats', () => {
    expect(totalWeight([])).toBe(0);
  });
});

describe('beatsThrough', () => {
  it('returns everything up to and including the named beat', () => {
    const result = beatsThrough('crew');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('crew');
  });

  it('includes every beat for the last id', () => {
    expect(beatsThrough('ready')).toHaveLength(BEATS.length);
  });

  it('returns nothing for an unknown id rather than everything', () => {
    // Returning everything here would silently reveal the whole briefing on a
    // typo.
    expect(beatsThrough('nope')).toHaveLength(0);
  });

  it('preserves order', () => {
    const ids = beatsThrough('task').map((beat) => beat.id);
    expect(ids).toEqual(BEATS.slice(0, ids.length).map((beat) => beat.id));
  });
});

describe('beatDuration', () => {
  it('is proportional to length for equal weights', () => {
    const short = { id: 's', text: 'a'.repeat(20), weight: 1 };
    const long = { id: 'l', text: 'a'.repeat(60), weight: 1 };

    expect(beatDuration(long)).toBeGreaterThan(beatDuration(short));
  });

  it('scales with weight', () => {
    const beat = { id: 'x', text: 'a'.repeat(50), weight: 1 };
    expect(beatDuration({ ...beat, weight: 2 })).toBeGreaterThan(beatDuration(beat));
  });

  it('never exceeds the cap, however long the line', () => {
    // Otherwise a long beat reads as a hang.
    const huge = { id: 'h', text: 'a'.repeat(2000), weight: 3 };
    expect(beatDuration(huge)).toBeLessThanOrEqual(MAX_BEAT_MS);
  });

  it('is positive for any real beat', () => {
    for (const beat of BEATS) {
      expect(beatDuration(beat)).toBeGreaterThan(0);
    }
  });

  it('honours a custom characters-per-second', () => {
    // Slower means longer: at 20 chars/s a 50-character line takes 2500ms, at
    // 50 chars/s it takes 1000ms. Both sit under MAX_BEAT_MS (2600), so neither
    // result is clipped and the comparison is testing the rate rather than the
    // cap. Weight is 0.5 to halve both and keep them clear of the ceiling.
    const beat = { id: 'x', text: 'a'.repeat(50), weight: 0.5 };
    expect(beatDuration(beat, 20)).toBeGreaterThan(beatDuration(beat, 50));
  });

  it('paces slowly enough to be readable', () => {
    // This is an eight-year-old's briefing.
    expect(CHARS_PER_SECOND).toBeLessThan(40);
  });
});

describe('greetingFor', () => {
  it('includes the player name', () => {
    expect(greetingFor('Riley')).toBe('Welcome aboard, Riley.');
  });

  it('trims surrounding whitespace', () => {
    expect(greetingFor('  Riley  ')).toBe('Welcome aboard, Riley.');
  });

  it('falls back gracefully with no name', () => {
    expect(greetingFor('')).toBe('Welcome aboard.');
    expect(greetingFor('   ')).toBe('Welcome aboard.');
  });

  it('never returns markup from an angle bracket', () => {
    // The view sets this through textContent, so this is belt and braces: it
    // documents that the string is data, not markup.
    expect(greetingFor('<img src=x>')).toBe('Welcome aboard, <img src=x>.');
  });
});