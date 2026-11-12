/**
 * Memory Match: the cards on the table.
 *
 * The deck is dealt by `sim/trainingMemory.ts`; this file turns cards over
 * and counts the tries. It is the easiest of the six games on purpose: it is
 * the one a child can win on the first go.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import { MEMORY_FACES, dealMemoryDeck, memoryPerformance } from '../sim/trainingMemory';
import type { TrainingGameMount } from './trainingGame';

/** How long a pair that does not match stays face up. */
const FLIP_BACK_MS = 800;

/**
 * The table.
 *
 * Twelve cards, face down. Two are turned over at a time: a pair stays up,
 * anything else turns back down. The clock runs beside the tries.
 */
export const mountMemory: TrainingGameMount = (root, context) => {
  const deck = dealMemoryDeck(context.random);
  const open = new Set<number>();
  const matched = new Set<number>();

  let first: number | null = null;
  let busy = false;
  let tries = 0;
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

    context.setStatus(`Tries: ${tries} · Time: ${seconds}s`);
  }

  function paint(): void {
    board.replaceChildren(
      ...deck.map((card) => {
        const showing = open.has(card.id) || matched.has(card.id);
        const face = MEMORY_FACES.indexOf(card.face);
        const name = (face >= 0 ? (['helmet', 'rocket', 'rover', 'sun', 'oxygen', 'droplet'] as readonly IconName[])[face] : 'box') ?? 'box';
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
    if (busy || finished || open.has(id) || matched.has(id)) return;

    open.add(id);

    if (first === null) {
      first = id;
      paint();

      return;
    }

    tries += 1;

    const other = first;

    first = null;

    if (deck[other]?.face === deck[id]?.face) {
      matched.add(other);
      matched.add(id);
      open.delete(other);
      open.delete(id);
      paint();

      if (matched.size === deck.length) {
        finished = true;
        hint.textContent = 'Every pair found!';

        later(() => context.onComplete(memoryPerformance(tries)), 400);
      }

      return;
    }

    busy = true;
    paint();

    later(() => {
      open.delete(other);
      open.delete(id);
      busy = false;
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
