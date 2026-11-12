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
 *
 * The numbers are handed out **after** the shuffle, so a card's number is
 * the place it sits in the deck. That is the whole point of numbering them:
 * the screen turns a card over by its number and has to be able to find it
 * again, and a number that is not its place is a number that finds the wrong
 * card.
 */
export function dealMemoryDeck(random: () => number): readonly MemoryCard[] {
  const faces: string[] = [];

  for (const face of MEMORY_FACES) faces.push(face, face);

  for (let index = faces.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = faces[index] as string;

    faces[index] = faces[swap] as string;
    faces[swap] = held;
  }

  return faces.map((face, id) => ({ id, face }));
}

/**
 * Do these two cards match?
 *
 * The rule the game is made of, and it lives here so it can be tested on its
 * own: two cards match when they carry the same face.
 */
export function memoryMatch(deck: readonly MemoryCard[], first: number, second: number): boolean {
  const one = deck[first];
  const other = deck[second];

  if (one === undefined || other === undefined) return false;

  return one.face === other.face;
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
