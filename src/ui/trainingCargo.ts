/**
 * Cargo Sorting: the crates that land, and the stores they go into.
 *
 * The round is dealt by `sim/trainingCargo.ts`; this file draws the tray and
 * the stores, and takes the crates. A crate can be dragged into a store or
 * tapped and then tapped into one, because a tablet and a laptop are both
 * being used to play this.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import { cargoDifficulty, cargoPerformance, dealCargoRound } from '../sim/trainingCargo';
import type { TrainingGameMount } from './trainingGame';

/** The picture on each crate. */
const ITEM_ICON: Readonly<Record<string, IconName>> = {
  fruit: 'leaf',
  rations: 'book',
  water: 'droplet',
  tank: 'flask',
  air: 'oxygen',
  'oxygen-tank': 'rocket',
  battery: 'bolt',
  cable: 'sparkle',
  medicine: 'star',
  bandage: 'moon',
  brick: 'box',
  wrench: 'pick',
};

/** The picture on each store. */
const BOX_ICON: Readonly<Record<string, IconName>> = {
  food: 'leaf',
  water: 'droplet',
  oxygen: 'oxygen',
  energy: 'bolt',
  medical: 'star',
  building: 'pick',
};

/** How far a finger has to travel before a crate is being dragged. */
const DRAG_DISTANCE = 8;

/**
 * The stores.
 *
 * Six crates come down and every one of them has to go into the right store.
 * A crate in the wrong store is not the end of the world: the game says so
 * and lets the player try again.
 */
export const mountCargo: TrainingGameMount = (root, context) => {
  /* How hard this round is: more supplies to store, and - once the goal has
     grown as far as it can - fewer wrong stores to get away with. */
  const difficulty = cargoDifficulty(context.level);
  const round = dealCargoRound(context.random, difficulty.crates);

  /** Where each crate is drawn, so it can be moved or taken away. */
  const crates = new Map<string, HTMLElement>();
  const stores = new Map<string, HTMLElement>();

  let placed = 0;
  let mistakes = 0;
  let finished = false;
  let selected: string | null = null;

  const tray = h('div', { class: 'trn__tray' });
  const shelf = h('div', { class: 'trn__stores' });
  const hint = h('p', {
    class: 'trn__hint',
    text: Number.isFinite(difficulty.mistakes)
      ? `Put every crate in the store it belongs to. ${difficulty.mistakes} wrong ${difficulty.mistakes === 1 ? 'store' : 'stores'} and the round is over.`
      : 'Put each crate in the store it belongs to.',
  });

  for (const box of round.boxes) {
    const content = h('div', { class: 'trn__store-items' });
    const node = h(
      'button',
      { class: 'trn__store', type: 'button', 'data-store': box.id, 'aria-label': `The ${box.label} store` },
      h('span', { class: 'trn__store-title' }, icon(BOX_ICON[box.id] ?? 'box'), box.label),
      content,
    );

    node.addEventListener('click', () => {
      if (selected === null) return;

      place(selected, box.id);
    });

    stores.set(box.id, content);
    shelf.append(node);
  }

  root.append(hint, tray, shelf);

  function status(): void {
    context.setStatus(`Sorted: ${placed}/${round.items.length} · Mistakes: ${mistakes}`);
  }

  function paint(): void {
    for (const [id, node] of crates) node.classList.toggle('trn__crate--selected', selected === id);

    status();
  }

  function place(id: string, boxId: string): void {
    if (finished) return;

    const item = round.items.find((entry) => entry.id === id);

    if (item === undefined) return;

    const node = crates.get(id);

    if (node === undefined) return;

    if (item.box !== boxId) {
      mistakes += 1;

      /* Read the layout again so the shake starts from the beginning. */
      node.classList.remove('trn__crate--wrong');
      void node.offsetWidth;
      node.classList.add('trn__crate--wrong');

      /* Too many wrong stores and the round is over. It still counts as a
         finished game - the player is paid for the attempt, not punished for
         it. */
      if (mistakes > difficulty.mistakes) {
        finished = true;
        hint.textContent = 'Too many wrong stores. That is the round.';

        window.setTimeout(() => context.onComplete(cargoPerformance(mistakes, difficulty)), 500);

        return;
      }

      hint.textContent = Number.isFinite(difficulty.mistakes)
        ? `Not that store. ${difficulty.mistakes - mistakes} wrong ${difficulty.mistakes - mistakes === 1 ? 'store' : 'stores'} left.`
        : 'Not that store. Try another one!';

      status();

      return;
    }

    node.remove();
    crates.delete(id);
    placed += 1;
    selected = null;
    stores.get(boxId)?.append(h('span', { class: 'trn__stored', 'aria-hidden': 'true' }, icon(ITEM_ICON[item.id] ?? 'box')));
    hint.textContent = 'That is the right store. ✅';
    status();

    if (placed >= round.items.length) {
      finished = true;
      hint.textContent = 'Every crate is stored!';

      window.setTimeout(() => context.onComplete(cargoPerformance(mistakes, difficulty)), 500);
    }
  }

  /* The tray of crates, and the drag. */
  let drag: { readonly id: string; readonly x: number; readonly y: number; moved: boolean; ghost: HTMLElement | null } | null = null;
  /** When the last crate was let go of, so a drag is not also a tap. */
  let droppedAt = 0;

  const onDown = (event: PointerEvent, id: string): void => {
    if (finished) return;

    if (!round.items.some((entry) => entry.id === id)) return;

    drag = { id, x: event.clientX, y: event.clientY, moved: false, ghost: null };

    /* The move and release listeners belong to THIS drag.
     *
     * They used to be registered once, when the round was dealt, and the first
     * drag took them away with it when it ended - so the first crate could be
     * dragged and every crate after it could not (ISS-086). */
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const onMove = (event: PointerEvent): void => {
    if (drag === null) return;

    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > DRAG_DISTANCE) {
      drag.moved = true;

      const ghost = h('span', { class: 'trn__ghost' }, icon(ITEM_ICON[drag.id] ?? 'box'));

      document.body.append(ghost);
      drag.ghost = ghost;
      crates.get(drag.id)?.classList.add('trn__crate--dragging');
    }

    if (drag.ghost !== null) {
      drag.ghost.style.left = `${event.clientX}px`;
      drag.ghost.style.top = `${event.clientY}px`;
    }
  };

  const onUp = (event: PointerEvent): void => {
    stopListening();

    const held = drag;

    drag = null;

    if (held === null) return;

    crates.get(held.id)?.classList.remove('trn__crate--dragging');
    held.ghost?.remove();

    if (held.moved) {
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const store = under?.closest('[data-store]');

      droppedAt = Date.now();

      if (store instanceof HTMLElement) place(held.id, store.dataset.store ?? '');
    }
  };

  /*
    A drag that was cancelled - a finger that slid into a scroll, a call
    arriving - puts the crate back where it was. It is not a drop, so nothing
    is stored.
  */
  const onCancel = (): void => {
    stopListening();

    const held = drag;

    drag = null;

    if (held === null) return;

    crates.get(held.id)?.classList.remove('trn__crate--dragging');
    held.ghost?.remove();
  };

  const stopListening = (): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };

  for (const item of round.items) {
    const node = h(
      'button',
      { class: 'trn__crate', type: 'button', 'aria-label': item.label },
      icon(ITEM_ICON[item.id] ?? 'box'),
      h('span', { class: 'trn__crate-name', text: item.label }),
    );

    node.addEventListener('pointerdown', (event) => onDown(event, item.id));

    /* The tap. A plain click picks the crate up, and the next click on a
       store puts it down — which is also how a keyboard player does it,
       because a keypress is a click and not a drag. */
    node.addEventListener('click', () => {
      if (finished) return;

      /* A crate that was just dragged is not also a tap. */
      if (Date.now() - droppedAt < 400) return;

      selected = selected === item.id ? null : item.id;
      hint.textContent = selected === null ? 'Put each crate in the store it belongs to.' : 'Now tap the store for it.';
      paint();
    });

    crates.set(item.id, node);
    tray.append(node);
  }

  status();

  return {
    destroy(): void {
      stopListening();
      drag?.ghost?.remove();
      root.replaceChildren();
    },
  };
};
