import { describe, expect, it } from 'vitest';

import {
  BEATS,
  beatsThrough,
  greetingFor,
} from './model';

/**
 * Every input is a literal. Nothing here reaches for Math.random or a clock, so
 * this file cannot flake â€” the defect recorded as ISS-015.
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

  it('carries no pacing field, because the reader owns the pace', () => {
    // The reveal is click-driven, so a read-time weight has nothing to do. This
    // asserts its absence so it cannot quietly come back and be trusted.
    for (const beat of BEATS) {
      expect(Object.keys(beat).sort()).toEqual(['id', 'text']);
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