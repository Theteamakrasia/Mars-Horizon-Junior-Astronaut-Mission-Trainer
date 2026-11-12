/**
 * Resource Merge: the board, the supplies, and the slide.
 *
 * The rules are in `sim/trainingMerge.ts`; this file draws them and collects
 * the player's moves. The board answers both a swipe and the arrow keys,
 * because the game is played on a laptop and on a tablet.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import {
  MERGE_LEVEL_NAMES,
  MERGE_SIZE,
  canMerge,
  mergeBest,
  mergeDifficulty,
  mergePerformance,
  moveMerge,
  spawnMerge,
  type MergeDirection,
} from '../sim/trainingMerge';
import type { TrainingGameMount } from './trainingGame';

/** The picture on each level of supply. */
const LEVEL_ICON: readonly IconName[] = ['box', 'droplet', 'leaf', 'bolt', 'oxygen', 'home', 'flask', 'sun'];

/** How far a finger has to travel before it counts as a swipe. */
const SWIPE_DISTANCE = 24;

/**
 * The board.
 *
 * Sixteen crates. Sliding a row pushes the crates together, and two of the
 * same kind become one of the next kind. The player is trying to build the
 * colony pod, which is the top of the ladder.
 */
export const mountMerge: TrainingGameMount = (root, context) => {
  /* How hard this round is: the supply the player has to build, and - once the
     goal has grown as far as it can - the moves the round allows. */
  const difficulty = mergeDifficulty(context.level);
  const target = difficulty.target;

  let grid: number[] = Array(MERGE_SIZE * MERGE_SIZE).fill(0);
  let moves = 0;
  let finished = false;
  let stuck = false;

  const board = h('div', { class: 'trn__merge' });
  const hint = h('p', { class: 'trn__hint' });

  const up = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Slide up' }, '▲');
  const left = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Slide left' }, '◀');
  const down = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Slide down' }, '▼');
  const right = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Slide right' }, '▶');

  up.addEventListener('click', () => slide('up'));
  left.addEventListener('click', () => slide('left'));
  down.addEventListener('click', () => slide('down'));
  right.addEventListener('click', () => slide('right'));

  const pad = h('div', { class: 'trn__pad' }, up, h('div', { class: 'trn__pad-row' }, left, down, right));

  root.append(board, hint, pad);

  function paint(): void {
    board.replaceChildren(
      ...grid.map((value) => {
        const cell = h('div', { class: `trn__tile${value > 0 ? ` trn__tile--${value}` : ''}` });

        if (value > 0) cell.append(icon(LEVEL_ICON[value] ?? 'box', MERGE_LEVEL_NAMES[value] ?? ''));

        return cell;
      }),
    );

    context.setStatus(`Moves: ${moves}`);
  }

  function slide(direction: MergeDirection): void {
    if (finished || stuck) return;

    const moved = moveMerge(grid, direction);

    if (!moved.moved) return;

    grid = spawnMerge(moved.grid, context.random);
    moves += 1;
    paint();

    if (mergeBest(grid) >= target) {
      finished = true;
      hint.textContent = `${MERGE_LEVEL_NAMES[target] ?? 'The colony pod'} is built!`;

      window.setTimeout(() => context.onComplete(mergePerformance(moves, difficulty)), 400);

      return;
    }

    /* The round has a limit on it from the fourth level on: the build has to
       be finished in so many moves. Running out is not a punishment - the
       round still counts as a finished game, and the player is paid for it. */
    if (difficulty.moveLimit !== null && moves >= difficulty.moveLimit) {
      finished = true;
      hint.textContent = `Out of moves. The ${MERGE_LEVEL_NAMES[target]?.toLowerCase() ?? 'colony pod'} is not built.`;

      window.setTimeout(() => context.onComplete(mergePerformance(moves, difficulty)), 400);

      return;
    }

    if (!canMerge(grid)) {
      stuck = true;
      hint.textContent = 'No moves left. Press Restart to try again.';
    }
  }

  /* The arrow keys, for a player on a keyboard. */
  const KEYS: Readonly<Record<string, MergeDirection>> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
  };

  const onKey = (event: KeyboardEvent): void => {
    const direction = KEYS[event.key];

    if (direction === undefined) return;

    event.preventDefault();
    slide(direction);
  };

  document.addEventListener('keydown', onKey);

  /* A swipe, for a player on a tablet. */
  let startX = 0;
  let startY = 0;

  const onDown = (event: PointerEvent): void => {
    startX = event.clientX;
    startY = event.clientY;
  };

  const onUp = (event: PointerEvent): void => {
    const across = event.clientX - startX;
    const down = event.clientY - startY;

    if (Math.max(Math.abs(across), Math.abs(down)) < SWIPE_DISTANCE) return;

    if (Math.abs(across) > Math.abs(down)) slide(across > 0 ? 'right' : 'left');
    else slide(down > 0 ? 'down' : 'up');
  };

  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointerup', onUp);

  grid = spawnMerge(grid, context.random);
  grid = spawnMerge(grid, context.random);
  hint.textContent =
    difficulty.moveLimit === null
      ? `Goal: make the ${MERGE_LEVEL_NAMES[target]?.toLowerCase() ?? 'colony pod'}.`
      : `Goal: make the ${MERGE_LEVEL_NAMES[target]?.toLowerCase() ?? 'colony pod'} in ${difficulty.moveLimit} moves.`;
  paint();

  return {
    destroy(): void {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
    },
  };
};
