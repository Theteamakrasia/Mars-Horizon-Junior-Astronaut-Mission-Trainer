import { describe, expect, it } from 'vitest';

import {
  MERGE_EXCELLENT_MOVES,
  MERGE_GOOD_MOVES,
  MERGE_SIZE,
  MERGE_TARGET,
  canMerge,
  mergeBest,
  mergePerformance,
  moveMerge,
  slideMergeLine,
  spawnMerge,
} from './trainingMerge';
import { makeRandom } from './training';

/*
 * The merge board is the one game where a rule can quietly be wrong: a line
 * that merges twice, or a move that counts when nothing happened, both look
 * fine on screen and are not.
 */

describe('sliding a line', () => {
  it('pulls the crates to the front', () => {
    expect(slideMergeLine([0, 1, 0, 2])).toEqual([1, 2, 0, 0]);
  });

  it('merges two of the same', () => {
    expect(slideMergeLine([1, 1, 0, 0])).toEqual([2, 0, 0, 0]);
  });

  it('merges a pair only once', () => {
    expect(slideMergeLine([1, 1, 1, 1])).toEqual([2, 2, 0, 0]);
  });

  it('merges across a gap', () => {
    expect(slideMergeLine([0, 2, 0, 2])).toEqual([3, 0, 0, 0]);
  });

  it('leaves crates that do not match alone', () => {
    expect(slideMergeLine([1, 2, 1, 2])).toEqual([1, 2, 1, 2]);
  });

  it('always gives four back', () => {
    expect(slideMergeLine([])).toHaveLength(MERGE_SIZE);
    expect(slideMergeLine([3])).toHaveLength(MERGE_SIZE);
  });
});

describe('moving the board', () => {
  const board = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  it('merges towards the left', () => {
    const moved = moveMerge(board, 'left');

    expect(moved.moved).toBe(true);
    expect(moved.grid[0]).toBe(2);
  });

  it('merges towards the right', () => {
    const moved = moveMerge(board, 'right');

    expect(moved.moved).toBe(true);
    expect(moved.grid[3]).toBe(2);
  });

  it('merges upwards', () => {
    const column = [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const moved = moveMerge(column, 'up');

    expect(moved.moved).toBe(true);
    expect(moved.grid[0]).toBe(2);
  });

  it('merges downwards', () => {
    const column = [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const moved = moveMerge(column, 'down');

    expect(moved.moved).toBe(true);
    expect(moved.grid[12]).toBe(2);
  });

  it('says when nothing moved', () => {
    const empty = Array.from({ length: 16 }, () => 0);

    expect(moveMerge(empty, 'left').moved).toBe(false);
  });

  it('does not change the board it was given', () => {
    const original = [...board];

    moveMerge(board, 'left');

    expect(board).toEqual(original);
  });
});

describe('a new supply', () => {
  it('lands on an empty square', () => {
    const empty = Array.from({ length: 16 }, () => 0);
    const grid = spawnMerge(empty, makeRandom(7));

    expect(grid.filter((value) => value !== 0)).toHaveLength(1);
  });

  it('is never anything but water or food', () => {
    const empty = Array.from({ length: 16 }, () => 0);
    const random = makeRandom(11);

    for (let index = 0; index < 50; index += 1) {
      const grid = spawnMerge(empty, random);
      const value = grid.find((cell) => cell !== 0);

      expect(value === 1 || value === 2).toBe(true);
    }
  });

  it('leaves a full board alone', () => {
    const full = Array.from({ length: 16 }, () => 3);

    expect(spawnMerge(full, makeRandom(3))).toEqual(full);
  });
});

describe('a board with no moves left', () => {
  it('is one full of crates that cannot merge', () => {
    const stuck = [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1];

    expect(canMerge(stuck)).toBe(false);
  });

  it('is not one with a gap in it', () => {
    expect(canMerge([1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 0])).toBe(true);
  });
});

describe('the best supply on the board', () => {
  it('is the highest level there', () => {
    expect(mergeBest([0, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(3);
  });

  it('is zero on an empty board', () => {
    expect(mergeBest(Array.from({ length: 16 }, () => 0))).toBe(0);
  });
});

describe('the band a finished game falls into', () => {
  it('is excellent for a quick game', () => {
    expect(mergePerformance(MERGE_EXCELLENT_MOVES)).toBe('excellent');
  });

  it('is good for a slower one', () => {
    expect(mergePerformance(MERGE_EXCELLENT_MOVES + 1)).toBe('good');
    expect(mergePerformance(MERGE_GOOD_MOVES)).toBe('good');
  });

  it('is basic for the slowest', () => {
    expect(mergePerformance(MERGE_GOOD_MOVES + 1)).toBe('basic');
  });
});

describe('the target', () => {
  it('is the colony pod', () => {
    expect(MERGE_TARGET).toBe(5);
  });
});
