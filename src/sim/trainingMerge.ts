/**
 * Resource Merge: the supplies on the board, and how they merge.
 *
 * A 4×4 board of supply crates. Sliding a row pushes the crates together,
 * and two of the same kind become one of the next kind: water, food, energy,
 * oxygen, and at the top of the ladder the colony pod itself. The player wins
 * by building the pod.
 *
 * Pure. The board is sixteen numbers and every move returns a new board, so
 * the whole game can be played in a test without a browser.
 */

import type { TrainingPerformance } from './training';

/** The board is 4×4. */
export const MERGE_SIZE = 4;

/** The level the player is trying to build: the colony pod. */
export const MERGE_TARGET = 5;

/** What each level is, in the order they climb. Index 0 is the empty board. */
export const MERGE_LEVEL_NAMES: readonly string[] = [
  '',
  'Water',
  'Food pack',
  'Energy cell',
  'Oxygen tank',
  'Colony pod',
  'Habitat',
  'Dome',
];

/** A game finished in this many moves or fewer is an excellent one. */
export const MERGE_EXCELLENT_MOVES = 90;

/** A game finished in this many moves or fewer is a good one. */
export const MERGE_GOOD_MOVES = 170;

/**
 * How the merge round goes at a level.
 *
 * The goal grows for the first three levels: the Colony pod, then the Habitat
 * that holds it, then the Dome over that. From the fourth level on the goal
 * stays and the allowance shrinks - the moves the round allows - so each level
 * is the same build with less room to shuffle.
 *
 * The goal cannot keep growing: every step up doubles the amount of supply it
 * takes, so the move limit is what has to move from then on.
 */
export interface MergeDifficulty {
  /** The supply the player has to build. */
  readonly target: number;
  /** The moves the round allows, or null when it allows as many as it takes. */
  readonly moveLimit: number | null;
  /** The moves an excellent round allows. */
  readonly excellent: number;
  /** The moves a good round allows. */
  readonly good: number;
}

/**
 * One row per level. The first is the game as it always was.
 *
 * The move limits are measured, not guessed: a player who keeps the biggest
 * supply in a corner needs about 30 moves for the Colony pod, 55 for the
 * Habitat and 100 for the Dome, and a human needs rather more than that. The
 * limit at level 4 is therefore generous, and each level after it takes a few
 * moves away.
 */
const MERGE_DIFFICULTY: readonly MergeDifficulty[] = [
  { target: 5, moveLimit: null, excellent: 90, good: 170 },
  { target: 6, moveLimit: null, excellent: 200, good: 380 },
  { target: 7, moveLimit: null, excellent: 300, good: 560 },
  { target: 7, moveLimit: 300, excellent: 300, good: 560 },
  { target: 7, moveLimit: 280, excellent: 300, good: 560 },
  { target: 7, moveLimit: 260, excellent: 300, good: 560 },
  { target: 7, moveLimit: 240, excellent: 300, good: 560 },
  { target: 7, moveLimit: 225, excellent: 300, good: 560 },
  { target: 7, moveLimit: 210, excellent: 300, good: 560 },
  { target: 7, moveLimit: 195, excellent: 300, good: 560 },
  { target: 7, moveLimit: 180, excellent: 300, good: 560 },
  { target: 7, moveLimit: 170, excellent: 300, good: 560 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function mergeDifficulty(level: number): MergeDifficulty {
  const step = Math.min(MERGE_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return MERGE_DIFFICULTY[step - 1] as MergeDifficulty;
}

/** Which way the board slides. */
export type MergeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Slide one line of four towards the front.
 *
 * The crates that are not there are dropped, equal neighbours merge once, and
 * the line is padded back out to four. A line of 1,1,1,1 becomes 2,2 — not
 * 4 — because each crate merges once per move.
 */
export function slideMergeLine(line: readonly number[]): number[] {
  const kept = line.filter((value) => value !== 0);
  const out: number[] = [];

  for (let index = 0; index < kept.length; index += 1) {
    const value = kept[index] as number;
    const next = kept[index + 1];

    if (next !== undefined && next === value) {
      out.push(value + 1);
      index += 1;
    } else {
      out.push(value);
    }
  }

  while (out.length < MERGE_SIZE) out.push(0);

  return out;
}

/** The four lines a direction slides, each already turned to face the front. */
function mergeLines(direction: MergeDirection): number[][] {
  const lines: number[][] = [];

  for (let index = 0; index < MERGE_SIZE; index += 1) {
    const row = [0, 1, 2, 3].map((column) => index * MERGE_SIZE + column);
    const column = [0, 1, 2, 3].map((row) => row * MERGE_SIZE + index);

    if (direction === 'left') lines.push(row);
    else if (direction === 'right') lines.push([...row].reverse());
    else if (direction === 'up') lines.push(column);
    else lines.push([...column].reverse());
  }

  return lines;
}

/** Slide the whole board, and say whether anything moved. */
export function moveMerge(
  grid: readonly number[],
  direction: MergeDirection,
): { readonly grid: number[]; readonly moved: boolean } {
  const next = [...grid];
  let moved = false;

  for (const line of mergeLines(direction)) {
    const slid = slideMergeLine(line.map((index) => grid[index] as number));

    line.forEach((index, position) => {
      const value = slid[position] as number;

      if (grid[index] !== value) moved = true;
      next[index] = value;
    });
  }

  return { grid: next, moved };
}

/**
 * Put a new supply on the board.
 *
 * Mostly a level 1 supply, and now and then a level 2, so the board is not
 * always the same easy climb.
 */
export function spawnMerge(grid: readonly number[], random: () => number): number[] {
  const empty = grid.map((value, index) => (value === 0 ? index : -1)).filter((index) => index >= 0);

  if (empty.length === 0) return [...grid];

  const next = [...grid];
  const spot = empty[Math.floor(random() * empty.length)] as number;

  next[spot] = random() < 0.85 ? 1 : 2;

  return next;
}

/** Is there still a move to make? */
export function canMerge(grid: readonly number[]): boolean {
  if (grid.includes(0)) return true;

  for (let row = 0; row < MERGE_SIZE; row += 1) {
    for (let column = 0; column < MERGE_SIZE; column += 1) {
      const value = grid[row * MERGE_SIZE + column];

      if (column < MERGE_SIZE - 1 && value === grid[row * MERGE_SIZE + column + 1]) return true;
      if (row < MERGE_SIZE - 1 && value === grid[(row + 1) * MERGE_SIZE + column]) return true;
    }
  }

  return false;
}

/** The best supply on the board. Zero is an empty board. */
export function mergeBest(grid: readonly number[]): number {
  return grid.reduce((best, value) => (value > best ? value : best), 0);
}

/**
 * The band a finished game falls into.
 *
 * Fewer moves is better, but there is no move limit: a player who cannot
 * finish quickly can still finish, and a slow win is still a win.
 */
export function mergePerformance(moves: number, difficulty: MergeDifficulty = mergeDifficulty(1)): TrainingPerformance {
  if (moves <= difficulty.excellent) return 'excellent';
  if (moves <= difficulty.good) return 'good';

  return 'basic';
}
