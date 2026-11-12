import { describe, expect, it } from 'vitest';

import {
  entries,
  entryFor,
  everyEntryHasFactIndex,
  everyKindHasEntry,
} from './model';

describe('encyclopedia model', () => {
  it('has one entry for every module kind', () => {
    expect(everyKindHasEntry()).toBe(true);
    expect(entries().length).toBeGreaterThan(0);
  });

  it('returns the entry for a known kind', () => {
    const solar = entryFor('solar-array');
    expect(solar?.kind).toBe('solar-array');
    expect(solar?.name).toBe('Solar Array');
  });

  it('resolves every known kind back to itself', () => {
    for (const entry of entries()) {
      expect(entryFor(entry.kind)?.kind).toBe(entry.kind);
    }
  });

  it('keeps the one-line summary short', () => {
    for (const entry of entries()) {
      expect(entry.oneLine.length).toBeGreaterThan(0);
      expect(entry.oneLine.split('.').length).toBeLessThanOrEqual(3);
    }
  });

  it('gives every entry a fact index to resolve at render time', () => {
    expect(everyEntryHasFactIndex()).toBe(true);
  });

  it('matches cost to the module spec', () => {
    const greenhouse = entryFor('greenhouse');
    expect(greenhouse?.cost).toBe(3);
    const habitat = entryFor('habitat');
    expect(habitat?.cost).toBe(0);
  });
});
