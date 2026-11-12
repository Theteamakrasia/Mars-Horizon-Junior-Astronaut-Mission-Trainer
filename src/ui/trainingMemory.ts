/**
 * Memory Match: the cards on the table.
 *
 * The deck is dealt by `sim/trainingMemory.ts`; this file turns cards over
 * and counts the tries. It is the easiest of the six games on purpose: it is
 * the one a child can win on the first go.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import { dealMemoryDeck, memoryDifficulty, memoryMatch, memoryPerformance } from '../sim/trainingMemory';
import type { TrainingGameMount } from './trainingGame';

/** How long a pair that does not match stays face up. */
const FLIP_BACK_MS = 800;

/**
 * How long a pair that matches is shown before it is taken off the table.
 *
 * Long enough for the player to see that it matched — the two cards light up
 * and the line under the table says so — and then they go.
 */
const TAKE_AWAY_MS = 450;

/**
 * The table.
 *
 * Twelve cards, face down. Two are turned over at a time: a pair is taken off
 * the table the moment it is found, and anything else turns back down. The
 * clock runs beside the tries.
 */
export const mountMemory: TrainingGameMount = (root, context) => {
  /* How hard this round is: more pairs on the table, and - once the goal has
     grown as far as it can - fewer tries to find them in. */
  const difficulty = memoryDifficulty(context.level);
  const pairs = difficulty.pairs;

  const deck = dealMemoryDeck(context.random, pairs);
  const open = new Set<number>();
  /** The pair that has just been found, still on the table. */
  const matched = new Set<number>();
  /** The pairs that have been taken off the table. */
  const gone = new Set<number>();

  let first: number | null = null;
  let busy = false;
  let tries = 0;
  /** How many pairs have been found. The pairs leave the table, so this is the count, not the set. */
  let found = 0;
  let finished = false;

  const startedAt = Date.now();
  const timers = new Set<number>();

  const board = h('div', { class: 'trn__memory' });
  const hint = h('p', { class: 'trn__hint', text: 'Turn two cards over. Find every pair.' });

  root.append(board, hint);

  const later = (fn: () => void, ms: number): void => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);

    timers.add(timer);
  };

  function status(): void {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);

    context.setStatus(`Pairs: ${found}/${pairs} · Tries: ${tries} · Time: ${seconds}s`);
  }

  /**
   * The cards still on the table.
   *
   * A pair that has been found is taken away, so the table closes up as the
   * player works: what is left is the memory they still have to do.
   */
  function paint(): void {
    board.replaceChildren(
      ...deck
        .filter((card) => !gone.has(card.id))
        .map((card) => {
          const showing = open.has(card.id) || matched.has(card.id);
          /* The face is the picture's name, so a face that is added to the
             list later brings its own picture with it. */
          const name = (card.face as IconName) ?? 'box';
          const node = h(
            'button',
            {
              class: `trn__face${showing ? ' trn__face--open' : ''}${matched.has(card.id) ? ' trn__face--matched' : ''}`,
              type: 'button',
              'aria-label': showing ? card.face : 'A card face down',
            },
            icon(showing ? name : 'question', showing ? card.face : undefined),
          );

          node.addEventListener('click', () => turn(card.id));

          return node;
        }),
    );

    status();
  }

  function turn(id: number): void {
    if (busy || finished || gone.has(id) || open.has(id) || matched.has(id)) return;

    open.add(id);

    if (first === null) {
      first = id;
      paint();

      return;
    }

    tries += 1;

    const other = first;

    first = null;

    if (memoryMatch(deck, other, id)) {
      /* A pair. The two cards light up so the player sees that they matched,
         and then they are taken off the table. */
      found += 1;
      matched.add(other);
      matched.add(id);
      open.delete(other);
      open.delete(id);
      hint.textContent = found === pairs ? 'Every pair found!' : `That is a pair! ${found} of ${pairs} found.`;
      paint();

      later(() => {
        gone.add(other);
        gone.add(id);
        matched.delete(other);
        matched.delete(id);
        paint();
      }, TAKE_AWAY_MS);

      if (found === pairs) {
        finished = true;

        later(() => context.onComplete(memoryPerformance(tries, difficulty)), 600);
      }

      return;
    }

    /* The round has a limit on it from the fourth level on: the pairs have to
       be found in so many tries. Running out is not a punishment - the round
       still counts as a finished game. */
    if (Number.isFinite(difficulty.tries) && tries >= difficulty.tries) {
      finished = true;
      hint.textContent = 'Out of tries. Press Restart to try again.';

      later(() => context.onComplete(memoryPerformance(tries, difficulty)), 600);

      return;
    }

    busy = true;
    paint();

    later(() => {
      open.delete(other);
      open.delete(id);
      busy = false;
      hint.textContent = 'Turn two cards over. Find every pair.';
      paint();
    }, FLIP_BACK_MS);
  }

  const clock = window.setInterval(status, 1000);

  paint();

  return {
    destroy(): void {
      window.clearInterval(clock);
      timers.forEach((timer) => window.clearTimeout(timer));
      root.replaceChildren();
    },
  };
};
