import { describe, expect, it } from 'vitest';

import { makeRandom } from './training';
import {
  MEMORY_EXCELLENT_TRIES,
  MEMORY_FACES,
  MEMORY_GOOD_TRIES,
  MEMORY_PAIRS,
  dealMemoryDeck,
  memoryMatch,
  memoryPerformance,
} from './trainingMemory';

/*
 * The deck has to be fair: every face twice, and the same sol dealing the
 * same cards, so a player who retries the same sol is not being given a
 * harder deal than the one before.
 */

describe('the deck', () => {
  it('has two cards for every face', () => {
    const deck = dealMemoryDeck(makeRandom(1));

    expect(deck).toHaveLength(MEMORY_FACES.length * 2);

    for (const face of MEMORY_FACES) {
      expect(deck.filter((card) => card.face === face)).toHaveLength(2);
    }
  });

  it('gives every card its own number', () => {
    const deck = dealMemoryDeck(makeRandom(2));
    const ids = deck.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The rule that matters: a card's number is the place it sits in the deck.
   *
   * The screen turns a card over by its number and looks it up by that
   * number, so a number that is not its place finds the wrong card — and the
   * game then decides whether two cards match by comparing two cards the
   * player never touched.
   */
  it('numbers each card by the place it sits in the deck', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const deck = dealMemoryDeck(makeRandom(seed));

      deck.forEach((card, place) => {
        expect(card.id, `seed ${seed}`).toBe(place);
      });
    }
  });

  it('deals the same cards for the same seed', () => {
    const first = dealMemoryDeck(makeRandom(42));
    const second = dealMemoryDeck(makeRandom(42));

    expect(first.map((card) => card.face)).toEqual(second.map((card) => card.face));
  });

  it('deals different cards for different seeds', () => {
    const first = dealMemoryDeck(makeRandom(1));
    const second = dealMemoryDeck(makeRandom(2));

    expect(first.map((card) => card.face)).not.toEqual(second.map((card) => card.face));
  });

  it('leaves the list it was given alone', () => {
    const deck = dealMemoryDeck(makeRandom(3));

    expect(deck).toHaveLength(MEMORY_PAIRS * 2);
  });
});

describe('whether two cards match', () => {
  it('says yes when they carry the same face', () => {
    const deck = dealMemoryDeck(makeRandom(5));
    const first = deck[0] as { id: number; face: string };
    const twin = deck.find((card) => card.face === first.face && card.id !== first.id);

    expect(twin).toBeDefined();
    expect(memoryMatch(deck, first.id, (twin as { id: number }).id)).toBe(true);
  });

  it('says no when they do not', () => {
    const deck = dealMemoryDeck(makeRandom(6));

    for (let one = 0; one < deck.length; one += 1) {
      for (let other = 0; other < deck.length; other += 1) {
        if (deck[one]?.face === deck[other]?.face) continue;

        expect(memoryMatch(deck, one, other), `${one} and ${other}`).toBe(false);
      }
    }
  });

  it('says no for a card that is not there', () => {
    const deck = dealMemoryDeck(makeRandom(7));

    expect(memoryMatch(deck, 0, 99)).toBe(false);
  });

  /**
   * The whole game in one assertion.
   *
   * Every face in the deck appears exactly twice, so the pairs the game can
   * find are exactly the six pairs of the deck — and no card is ever in two
   * of them. A game that compared the wrong cards would pair the deck up
   * wrongly, and the pairs would not be the pairs.
   */
  it('pairs the deck up into its six real pairs', () => {
    const deck = dealMemoryDeck(makeRandom(8));
    const pairs: number[][] = [];

    for (let one = 0; one < deck.length; one += 1) {
      for (let other = one + 1; other < deck.length; other += 1) {
        if (memoryMatch(deck, one, other)) pairs.push([one, other]);
      }
    }

    expect(pairs).toHaveLength(MEMORY_PAIRS);

    /* Six pairs, twelve cards, and no card in two of them. */
    const cards = pairs.flat();

    expect(cards).toHaveLength(MEMORY_FACES.length * 2);
    expect(new Set(cards).size).toBe(cards.length);
  });
});

describe('the band a finished game falls into', () => {
  it('is excellent for few tries', () => {
    expect(memoryPerformance(MEMORY_EXCELLENT_TRIES)).toBe('excellent');
  });

  it('is good for a few more', () => {
    expect(memoryPerformance(MEMORY_EXCELLENT_TRIES + 1)).toBe('good');
    expect(memoryPerformance(MEMORY_GOOD_TRIES)).toBe('good');
  });

  it('is basic for a lot of them', () => {
    expect(memoryPerformance(MEMORY_GOOD_TRIES + 1)).toBe('basic');
  });

  it('cannot be worse than six tries, because six pairs need six', () => {
    expect(memoryPerformance(6)).toBe('excellent');
  });
});
