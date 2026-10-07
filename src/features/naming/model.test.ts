import { describe, expect, it } from 'vitest';

import { checkName, displayName, MAX_NAME_LENGTH, normaliseName } from './model';

/**
 * Every input here is a literal string. Nothing reaches for Math.random or the
 * clock, so this file cannot flake â which is the defect recorded as ISS-015.
 *
 * Non-printable and emoji characters are written as escape sequences rather than
 * literal bytes. A literal control character in source is invisible, survives
 * copy-paste unpredictably, and is exactly the kind of thing a strict UTF-8 check
 * should catch rather than hide.
 */

/** U+1F680 ROCKET. Children will type emoji; they must survive. */
const ROCKET = '\u{1F680}';

describe('normaliseName', () => {
  it('trims the ends', () => {
    expect(normaliseName('  Riley  ')).toBe('Riley');
  });

  it('collapses runs of whitespace to one space', () => {
    // Without this a pasted name renders on two lines and breaks the greeting.
    expect(normaliseName('Riley   Okonkwo')).toBe('Riley Okonkwo');
    expect(normaliseName('a\t\tb')).toBe('a b');
  });

  it('collapses newlines', () => {
    expect(normaliseName('Riley\nOkonkwo')).toBe('Riley Okonkwo');
  });

  it('leaves a clean name untouched', () => {
    expect(normaliseName('Riley')).toBe('Riley');
  });

  it('reduces whitespace-only input to empty', () => {
    expect(normaliseName('   \t\n  ')).toBe('');
  });

  it('keeps emoji', () => {
    expect(normaliseName(`Riley ${ROCKET}`)).toBe(`Riley ${ROCKET}`);
  });
});

describe('checkName', () => {
  it('accepts an ordinary name', () => {
    expect(checkName('Riley')).toEqual({ ok: true, value: 'Riley', problem: null });
  });

  it('accepts a name that only needed trimming', () => {
    expect(checkName('  Riley  ')).toEqual({ ok: true, value: 'Riley', problem: null });
  });

  it('rejects an empty field', () => {
    expect(checkName('')).toEqual({ ok: false, value: '', problem: 'empty' });
  });

  it('rejects whitespace typed into an otherwise empty field', () => {
    // Otherwise the button would enable on a field containing only spaces.
    expect(checkName('    ')).toEqual({ ok: false, value: '', problem: 'empty' });
  });

  it('accepts exactly the maximum length', () => {
    expect(checkName('x'.repeat(MAX_NAME_LENGTH)).ok).toBe(true);
  });

  it('rejects one character over the maximum', () => {
    const name = 'x'.repeat(MAX_NAME_LENGTH + 1);
    expect(checkName(name)).toEqual({ ok: false, value: name, problem: 'too-long' });
  });

  it('measures the limit after normalising, not before', () => {
    // 24 characters plus surrounding spaces is still a valid 24-character name.
    expect(checkName(`  ${'x'.repeat(MAX_NAME_LENGTH)}  `).ok).toBe(true);
  });

  it('counts an emoji as one character, not two', () => {
    // Code points, so an emoji does not eat two of the budget.
    expect(checkName(ROCKET.repeat(MAX_NAME_LENGTH)).ok).toBe(true);
  });

  it('rejects a mixed name that is genuinely over the limit', () => {
    expect(checkName(`${'x'.repeat(MAX_NAME_LENGTH)}${ROCKET}`).problem).toBe('too-long');
  });

  it('always returns the normalised value, even when invalid', () => {
    // So a form can echo back exactly what it decided on, without normalising
    // twice and disagreeing with itself.
    expect(checkName('  too   long  ').value).toBe('too long');
  });

  it('reports empty in preference to too-long', () => {
    // An all-spaces name is empty first; calling it too-long would be wrong.
    expect(checkName(' '.repeat(MAX_NAME_LENGTH + 10)).problem).toBe('empty');
  });
});

describe('displayName', () => {
  it('normalises on the way through', () => {
    expect(displayName('  Riley  ')).toBe('Riley');
  });

  it('strips control characters', () => {
    // The one string interpolated into markup, so it must not carry anything
    // that would not survive being rendered.
    expect(displayName('Riley\u0007Okonkwo')).toBe('RileyOkonkwo');
    expect(displayName('Riley\u0000')).toBe('Riley');
    expect(displayName('\u0000Riley')).toBe('Riley');
  });

  it('caps the result at the maximum length', () => {
    expect(displayName('x'.repeat(MAX_NAME_LENGTH + 20)).length).toBe(MAX_NAME_LENGTH);
  });

  it('keeps emoji intact', () => {
    expect(displayName(`Riley ${ROCKET}`)).toBe(`Riley ${ROCKET}`);
  });
});