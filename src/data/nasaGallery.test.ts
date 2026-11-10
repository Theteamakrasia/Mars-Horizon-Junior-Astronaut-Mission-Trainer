import { describe, expect, it } from 'vitest';

import { NASA_CARDS, cardForSol } from './nasaGallery';

/**
 * The gallery is data, so every input here is fixed. No clock, no network and no
 * `Math.random`, which keeps this file out of ISS-015's flake risk.
 */

describe('NASA_CARDS', () => {
  it('has one card for every sol of a winning run', () => {
    expect(NASA_CARDS).toHaveLength(12);
    expect(NASA_CARDS.map((card) => card.sol)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('uses a unique NASA image on every card', () => {
    const ids = NASA_CARDS.map((card) => card.nasaId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('serves every image and source over https', () => {
    for (const card of NASA_CARDS) {
      expect(card.imageUrl.startsWith('https://images-assets.nasa.gov/image/')).toBe(true);
      expect(card.imageUrl.endsWith('.jpg')).toBe(true);
      expect(card.sourceUrl).toBe(`https://images.nasa.gov/details/${card.nasaId}`);
    }
  });

  it('keeps the image URL and the source URL on the same NASA id', () => {
    // A copy-paste that changed one but not the other would show one picture and
    // send the reader to a different one.
    for (const card of NASA_CARDS) {
      expect(card.imageUrl).toContain(`/${card.nasaId}/`);
    }
  });

  it('gives every card words a child can read and a credit NASA requires', () => {
    for (const card of NASA_CARDS) {
      expect(card.title.trim().length).toBeGreaterThan(0);
      expect(card.alt.trim().length).toBeGreaterThan(0);
      expect(card.caption.trim().length).toBeGreaterThan(0);
      expect(card.fact.trim().length).toBeGreaterThan(0);
      expect(card.credit.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps each line short enough to read on one card', () => {
    for (const card of NASA_CARDS) {
      expect(card.title.length).toBeLessThanOrEqual(45);
      expect(card.alt.length).toBeLessThanOrEqual(140);
      expect(card.caption.length).toBeLessThanOrEqual(200);
      expect(card.fact.length).toBeLessThanOrEqual(130);
    }
  });
});

describe('cardForSol', () => {
  it('returns the card for that sol', () => {
    expect(cardForSol(1)).toBe(NASA_CARDS[0]);
    expect(cardForSol(7)).toBe(NASA_CARDS[6]);
    expect(cardForSol(12)).toBe(NASA_CARDS[11]);
  });

  it('floors a fractional sol rather than guessing a different day', () => {
    expect(cardForSol(3.9)?.sol).toBe(3);
  });

  it('returns null outside the run, so no lesson lands on the wrong day', () => {
    expect(cardForSol(0)).toBeNull();
    expect(cardForSol(-1)).toBeNull();
    expect(cardForSol(13)).toBeNull();
    expect(cardForSol(Number.NaN)).toBeNull();
    expect(cardForSol(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
