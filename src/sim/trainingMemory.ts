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

/** The things on the cards. Each one appears twice. */
export const MEMORY_FACES: readonly string[] = [
  'helmet',
  'rocket',
  'rover',
  'sun',
  'oxygen',
  'droplet',
  'flask',
  'book',
];

/** How many pairs are on the table. */
export const MEMORY_PAIRS = 6;

/** A game won in this many tries or fewer is an excellent one. */
export const MEMORY_EXCELLENT_TRIES = 8;

/** A game won in this many tries or fewer is a good one. */
export const MEMORY_GOOD_TRIES = 12;

/**
 * How the memory round goes at a level.
 *
 * The goal grows for the first three levels - more pairs on the table - and
 * then the allowance shrinks: from the fourth level on, the tries the player
 * is allowed are fewer and fewer.
 *
 * The bands widen as the round gets harder, so the player is paid the same
 * for the same quality of work whatever the level is.
 */
export interface MemoryDifficulty {
  /** How many pairs are on the table. */
  readonly pairs: number;
  /** The tries the round allows. */
  readonly tries: number;
  /** The tries an excellent round allows. */
  readonly excellent: number;
  /** The tries a good round allows. */
  readonly good: number;
}

/** One row per level. The first is the game as it always was. */
const MEMORY_DIFFICULTY: readonly MemoryDifficulty[] = [
  { pairs: 6, tries: Infinity, excellent: 8, good: 12 },
  { pairs: 7, tries: Infinity, excellent: 9, good: 14 },
  { pairs: 8, tries: Infinity, excellent: 10, good: 16 },
  { pairs: 8, tries: 18, excellent: 10, good: 16 },
  { pairs: 8, tries: 17, excellent: 10, good: 16 },
  { pairs: 8, tries: 16, excellent: 11, good: 17 },
  { pairs: 8, tries: 15, excellent: 11, good: 17 },
  { pairs: 8, tries: 14, excellent: 12, good: 18 },
  { pairs: 8, tries: 13, excellent: 12, good: 18 },
  { pairs: 8, tries: 12, excellent: 13, good: 19 },
  { pairs: 8, tries: 11, excellent: 13, good: 19 },
  { pairs: 8, tries: 10, excellent: 14, good: 20 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function memoryDifficulty(level: number): MemoryDifficulty {
  const step = Math.min(MEMORY_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return MEMORY_DIFFICULTY[step - 1] as MemoryDifficulty;
}

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
export function dealMemoryDeck(random: () => number, pairs: number = MEMORY_PAIRS): readonly MemoryCard[] {
  const faces: string[] = [];

  for (const face of MEMORY_FACES.slice(0, pairs)) faces.push(face, face);

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
export function memoryPerformance(
  tries: number,
  difficulty: MemoryDifficulty = memoryDifficulty(1),
): TrainingPerformance {
  if (tries <= difficulty.excellent) return 'excellent';
  if (tries <= difficulty.good) return 'good';

  return 'basic';
}
