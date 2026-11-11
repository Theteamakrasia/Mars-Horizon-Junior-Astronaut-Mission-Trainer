import { describe, expect, it } from 'vitest';

import { makeRandom } from './training';
import {
  MEMORY_EXCELLENT_TRIES,
  MEMORY_FACES,
  MEMORY_GOOD_TRIES,
  MEMORY_PAIRS,
  dealMemoryDeck,
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
