/**
 * Memory Match: the deck of cards, and how the game is graded.
 *
 * Six pairs of Mars things face down on the table. Two are turned over at a
 * time; a pair stays up and anything else turns back down. The game is won
 * when every pair is up, and it is graded on the number of tries it took.
 *
 * Pure. The deck is built from the generator it is handed, so a sol always
 * deals the same cards and a test can pin them.
 */

import type { TrainingPerformance } from './training';

/** The six things on the cards. Each one appears twice. */
export const MEMORY_FACES: readonly string[] = ['helmet', 'rocket', 'rover', 'sun', 'oxygen', 'droplet'];

/** How many pairs are on the table. */
export const MEMORY_PAIRS = MEMORY_FACES.length;

/** A game won in this many tries or fewer is an excellent one. */
export const MEMORY_EXCELLENT_TRIES = 8;

/** A game won in this many tries or fewer is a good one. */
export const MEMORY_GOOD_TRIES = 12;

/** One card on the table. */
export interface MemoryCard {
  /** Which card it is, so the same face is always the same card. */
  readonly id: number;
  /** What is on it. */
  readonly face: string;
}

/**
 * Deal the cards.
 *
 * Every face appears exactly twice, and the order comes from the generator
 * the caller passes in.
 */
export function dealMemoryDeck(random: () => number): readonly MemoryCard[] {
  const deck: MemoryCard[] = [];

  MEMORY_FACES.forEach((face) => {
    deck.push({ id: deck.length, face });
    deck.push({ id: deck.length, face });
  });

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = deck[index] as MemoryCard;

    deck[index] = deck[swap] as MemoryCard;
    deck[swap] = held;
  }

  return deck;
}

/**
 * The band a finished game falls into.
 *
 * Six pairs need at least six tries, so eight is a good score and twelve is
 * a comfortable one.
 */
export function memoryPerformance(tries: number): TrainingPerformance {
  if (tries <= MEMORY_EXCELLENT_TRIES) return 'excellent';
  if (tries <= MEMORY_GOOD_TRIES) return 'good';

  return 'basic';
}
