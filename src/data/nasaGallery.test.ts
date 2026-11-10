import { describe, expect, it } from 'vitest';

import { NASA_CARDS, NEXT_HORIZON_CARD, REGION_CARDS, cardForSol, factFor, factForTopic, FACTS, regionCard } from './nasaGallery';
import { SCIENCE_TOPICS } from '../sim/topics';

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
    for (const card of [...NASA_CARDS, NEXT_HORIZON_CARD]) {
      expect(card.title.length).toBeLessThanOrEqual(45);
      expect(card.alt.length).toBeLessThanOrEqual(140);
      expect(card.caption.length).toBeLessThanOrEqual(200);
      expect(card.fact.length).toBeLessThanOrEqual(130);
    }
  });

  it('ends on a card that says the picture is an artist idea, not a photo', () => {
    // The closing card is the one place a child could mistake a drawing for a
    // real mission photo, so the caption has to say so.
    expect(NEXT_HORIZON_CARD.caption.toLowerCase()).toContain('artist');
    expect(NEXT_HORIZON_CARD.caption.toLowerCase()).toContain('not a photograph');
    expect(NEXT_HORIZON_CARD.nasaId).toBe('PIA23302');
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

describe('REGION_CARDS', () => {
  const REGION_IDS = ['arcadia', 'jezero', 'olympus', 'valles', 'argyre'];

  it('has exactly one card for each landing region', () => {
    expect(Object.keys(REGION_CARDS).sort()).toEqual([...REGION_IDS].sort());
  });

  it('uses a unique NASA image on every card', () => {
    const ids = Object.values(REGION_CARDS).map((card) => card.nasaId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('serves every image and source over https, on the same id', () => {
    for (const card of Object.values(REGION_CARDS)) {
      expect(card.imageUrl.startsWith('https://images-assets.nasa.gov/image/')).toBe(true);
      expect(card.imageUrl.endsWith('.jpg')).toBe(true);
      expect(card.imageUrl).toContain(`/${card.nasaId}/`);
      expect(card.sourceUrl).toBe(`https://images.nasa.gov/details/${card.nasaId}`);
    }
  });

  it('gives every card words a child can read and a credit NASA requires', () => {
    for (const card of Object.values(REGION_CARDS)) {
      expect(card.title.trim().length).toBeGreaterThan(0);
      expect(card.alt.trim().length).toBeGreaterThan(0);
      expect(card.caption.trim().length).toBeGreaterThan(0);
      expect(card.fact.trim().length).toBeGreaterThan(0);
      expect(card.credit.trim().length).toBeGreaterThan(0);
      expect(card.title.length).toBeLessThanOrEqual(45);
      expect(card.alt.length).toBeLessThanOrEqual(140);
      expect(card.caption.length).toBeLessThanOrEqual(200);
      expect(card.fact.length).toBeLessThanOrEqual(130);
    }
  });

  it('says plainly when a region picture is an artist idea, not a photo', () => {
    // Jezero's card is the one artist concept in the set; a child must not read
    // it as a photograph of a real lake.
    expect(REGION_CARDS.jezero?.caption.toLowerCase()).toContain('artist');
    expect(REGION_CARDS.jezero?.caption.toLowerCase()).toContain('not a photograph');
  });
});

describe('regionCard', () => {
  it('returns the card for a known region', () => {
    expect(regionCard('arcadia')).toBe(REGION_CARDS.arcadia);
    expect(regionCard('valles')).toBe(REGION_CARDS.valles);
  });

  it('returns null for an unknown region', () => {
    expect(regionCard('')).toBeNull();
    expect(regionCard('atlantis')).toBeNull();
  });
});

describe('facts', () => {
  it('has more facts than one screen, each credited', () => {
    expect(FACTS.length).toBeGreaterThan(10);

    for (const fact of FACTS) {
      expect(fact.text.trim().length).toBeGreaterThan(0);
      expect(fact.credit.trim().length).toBeGreaterThan(0);
    }
  });

  it('picks the same fact for the same seed', () => {
    expect(factFor(3)).toBe(factFor(3));
  });

  it('wraps negative and huge seeds instead of throwing', () => {
    expect(factFor(-1)).toBe(FACTS[FACTS.length - 1]);
    expect(factFor(FACTS.length)).toBe(FACTS[0]);
    expect(factFor(Number.NaN)).toBe(FACTS[0]);
    expect(factFor(Number.POSITIVE_INFINITY)).toBe(FACTS[0]);
  });

  it('has at least two facts for every topic, so a screen never runs dry', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(40);

    for (const topic of SCIENCE_TOPICS) {
      const matching = FACTS.filter((fact) => fact.topic === topic);

      expect(matching.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every fact a topic it recognises', () => {
    for (const fact of FACTS) {
      expect(SCIENCE_TOPICS).toContain(fact.topic);
    }
  });

  it('picks a fact about the topic it was asked for', () => {
    for (const topic of SCIENCE_TOPICS) {
      expect(factForTopic(topic, 0).topic).toBe(topic);
      expect(factForTopic(topic, 1).topic).toBe(topic);
    }
  });

  it('picks the same topic fact for the same seed', () => {
    expect(factForTopic('water', 2)).toBe(factForTopic('water', 2));
  });

  it('wraps negative and huge topic seeds instead of throwing', () => {
    expect(factForTopic('power', -1).topic).toBe('power');
    expect(factForTopic('food', 9999).topic).toBe('food');
    expect(factForTopic('power', Number.NaN).topic).toBe('power');
  });
});
