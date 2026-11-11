/**
 * The activity player: the tool you work an order with.
 *
 * In Papers, Please the inspector reads a traveller's papers against the day's
 * rules and stamps them. The tools — the magnifier, the lamp, the scanner —
 * are how you see what a document is hiding, and they unlock one at a time.
 *
 * Here each order on the desk carries a tool. Working it tells the player
 * something about the order before they stamp it, and the stars are how well
 * they did. The stars are the only thing it changes: an inspection never
 * touches a store, so the balance of a run does not depend on it.
 *
 * DOM only. The rules are in `sim/minigames.ts`; this file collects the
 * player's input and draws what came back.
 */

import { h } from '../dom/h';
import {
  ENGINE_NAME,
  gradeMatch,
  gradePack,
  gradeRadar,
  gradeSequence,
  gradeSort,
  gradeTiming,
  type EngineKind,
  type Grade,
  type PackItem,
} from '../sim/minigames';

/** What the player is told after an inspection. */
export interface InspectionResult {
  readonly stars: number;
  readonly message: string;
}

/** A tool that can be worked. */
export interface Inspection {
  /** The tool's name. */
  readonly name: string;
  /** The element to put on the screen. */
  readonly element: HTMLElement;
  /** True once the player has finished and the result is known. */
  readonly done: () => boolean;
  /** The result, once it is done. */
  readonly result: () => Grade;
}

/** The steps of the checklist, in the order they happen. */
const CHECKLIST: readonly string[] = ['Power', 'Air', 'Water', 'Food', 'Shield'];

/** One thing the player can sort. */
interface SortItem {
  readonly id: string;
  readonly label: string;
  readonly good: boolean;
}

/** One pair the player has to match. */
interface MatchPair {
  readonly left: string;
  readonly right: string;
}

/** The items on the packing list, and how heavy they are. */
function packItems(sol: number): readonly PackItem[] {
  return [
    { id: 'food', label: 'Food', mass: 4, value: 5 },
    { id: 'water', label: 'Water', mass: 6, value: 4 },
    { id: 'parts', label: 'Spare parts', mass: 3, value: 6 },
    { id: 'samples', label: 'Rock samples', mass: 7, value: 7 },
    { id: 'seed', label: 'Seeds', mass: 1, value: 3 },
    { id: 'letters', label: 'Letters home', mass: 1, value: 2 + (sol % 3) },
  ];
}

/** The things to sort, half good and half poor. */
function sortItems(): readonly SortItem[] {
  return [
    { id: 'dust', label: 'Fine dust on the panels', good: false },
    { id: 'water', label: 'Ice under the soil', good: true },
    { id: 'rock', label: 'A round pebble', good: false },
    { id: 'shield', label: 'Piled regolith', good: true },
    { id: 'sample', label: 'A sealed rock core', good: true },
    { id: 'sand', label: 'A heap of sand', good: false },
  ];
}

/** The pairs to match: each tool with its job. */
function matchPairs(): readonly MatchPair[] {
  return [
    { left: 'Radar', right: 'Finds ice under the ground' },
    { left: 'Drill', right: 'Digs samples out of rock' },
    { left: 'Generator', right: 'Makes electricity for the base' },
    { left: 'Greenhouse', right: 'Grows the food' },
  ];
}

/**
 * The checklist: press the steps in the right order.
 *
 * The rover's own start-up, or an airlock procedure. The order is the five
 * systems, because that is what the outpost is, and it is worth knowing by
 * heart before anything goes wrong.
 */
function sequenceInspection(): Inspection {
  const pressed: string[] = [];
  const list = h('div', { class: 'insp__steps' });

  const paint = (): void => {
    list.replaceChildren(
      ...CHECKLIST.map((step) => {
        const at = pressed.indexOf(step);
        const button = h('button', { class: 'insp__step', type: 'button', 'data-done': String(at >= 0) }, step);

        button.addEventListener('click', () => {
          if (pressed.includes(step)) return;

          pressed.push(step);
          paint();
        });

        return button;
      }),
    );
  };

  paint();

  return {
    name: ENGINE_NAME.sequence,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: 'In what order do the five systems have to be checked?' }), list),
    done: () => pressed.length === CHECKLIST.length,
    result: () => gradeSequence(pressed, CHECKLIST),
  };
}

/**
 * The timing: stop the marker in the safe band.
 *
 * The marker sweeps back and forth and the band moves with it, so it is a
 * judgement and not a reflex.
 */
function timingInspection(sol: number): Inspection {
  const bandStart = 0.35 + ((sol * 7) % 20) / 100;
  const bandEnd = bandStart + 0.18;
  let position = 0;
  let stopped: number | null = null;
  let direction = 1;

  const marker = h('span', { class: 'insp__marker' });
  const band = h('span', { class: 'insp__band', style: `left:${bandStart * 100}%;width:${(bandEnd - bandStart) * 100}%` });
  const track = h('div', { class: 'insp__track' }, band, marker);
  const button = h('button', { class: 'gl__btn gl__btn--navy insp__stop', type: 'button' }, 'Stop it');

  button.addEventListener('click', () => {
    if (stopped !== null) return;

    stopped = position;
    button.disabled = true;
    marker.style.left = `${position * 100}%`;
  });

  /* The sweep. A timer in the view, because the game is turn-based but this
     one moment needs a clock; nothing else about the run is timed. */
  const timer = window.setInterval(() => {
    if (stopped !== null) return;

    position += direction * 0.02;

    if (position >= 1) {
      position = 1;
      direction = -1;
    } else if (position <= 0) {
      position = 0;
      direction = 1;
    }

    marker.style.left = `${position * 100}%`;
  }, 40);

  const finish = (): void => window.clearInterval(timer);

  return {
    name: ENGINE_NAME.timing,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: 'Stop the marker in the safe band.' }), track, button),
    done: () => stopped !== null,
    result: () => {
      finish();

      return gradeTiming(stopped ?? 0, bandStart, bandEnd);
    },
  };
}

/**
 * The radar: ping squares until the reading is hot.
 *
 * Every ping says whether it is warmer or colder than the last, so the player
 * is narrowing it down rather than guessing.
 */
function radarInspection(sol: number): Inspection {
  const size = 4;
  const cells = size * size;
  const target = (sol * 5) % cells;
  const pings: number[] = [];
  let hint = 'Ping a square.';
  const grid = h('div', { class: 'insp__grid', style: `grid-template-columns:repeat(${size},1fr)` });

  const paint = (): void => {
    grid.replaceChildren(
      ...Array.from({ length: cells }, (_, index) => {
        const button = h('button', { class: 'insp__cell', type: 'button', 'data-pinged': String(pings.includes(index)) }, String(index + 1));

        button.addEventListener('click', () => {
          if (pings.includes(index)) return;

          pings.push(index);
          const distance = Math.abs(index - target);
          hint = distance === 0 ? 'Hot. That is the one.' : distance <= 2 ? 'Warm. Closer.' : 'Cold. Further away.';
          button.textContent = distance === 0 ? '★' : distance <= 2 ? '▲' : '·';
          button.dataset.pinged = 'true';
        });

        return button;
      }),
    );
  };

  paint();

  return {
    name: ENGINE_NAME.radar,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: 'Find the ice under the ground.' }), h('p', { class: 'insp__hint', text: hint }), grid),
    done: () => pings.includes(target),
    result: () => gradeRadar(pings, target),
  };
}

/** The sorting: put the good ones in the good pile. */
function sortInspection(): Inspection {
  const items = sortItems();
  const chosen: string[] = [];
  const list = h('div', { class: 'insp__items' });

  const paint = (): void => {
    list.replaceChildren(
      ...items.map((item) => {
        const button = h('button', { class: 'insp__item', type: 'button', 'data-chosen': String(chosen.includes(item.id)) }, item.label);

        button.addEventListener('click', () => {
          const at = chosen.indexOf(item.id);

          if (at >= 0) chosen.splice(at, 1);
          else chosen.push(item.id);

          paint();
        });

        return button;
      }),
    );
  };

  paint();

  const good = items.filter((item) => item.good).map((item) => item.id);

  return {
    name: ENGINE_NAME.sort,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: 'Pick the ones worth keeping.' }), list),
    done: () => chosen.length === items.length,
    result: () => gradeSort(chosen, good),
  };
}

/** The matching: pair each thing with its job. */
function matchInspection(): Inspection {
  const pairs = matchPairs();
  const answers: Record<string, string> = {};
  const list = h('div', { class: 'insp__pairs' });

  const paint = (): void => {
    list.replaceChildren(
      ...pairs.map((pair) => {
        const select = h('select', { class: 'insp__select' },
          h('option', { value: '', text: '—' }),
          ...pairs.map((option) => h('option', { value: option.right, text: option.right })),
        );

        select.value = answers[pair.left] ?? '';
        select.addEventListener('change', () => {
          answers[pair.left] = select.value;
        });

        return h('div', { class: 'insp__pair' }, h('span', { class: 'insp__pair-left', text: pair.left }), select);
      }),
    );
  };

  paint();

  return {
    name: ENGINE_NAME.match,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: 'Match each tool to its job.' }), list),
    done: () => pairs.every((pair) => (answers[pair.left] ?? '') !== ''),
    result: () => gradeMatch(pairs.map((pair) => [pair.left, pair.right] as const), answers),
  };
}

/** The packing: choose what fits in the pod. */
function packInspection(sol: number): Inspection {
  const items = packItems(sol);
  const budget = 12;
  const chosen: string[] = [];
  const list = h('div', { class: 'insp__items' });

  const paint = (): void => {
    list.replaceChildren(
      ...items.map((item) => {
        const button = h('button', { class: 'insp__item', type: 'button', 'data-chosen': String(chosen.includes(item.id)) }, `${item.label} · ${item.mass} kg`);

        button.addEventListener('click', () => {
          const at = chosen.indexOf(item.id);

          if (at >= 0) chosen.splice(at, 1);
          else chosen.push(item.id);

          paint();
        });

        return button;
      }),
    );
  };

  paint();

  return {
    name: ENGINE_NAME.pack,
    element: h('div', { class: 'insp__body' }, h('p', { class: 'insp__ask', text: `Fill the pod. It can carry ${budget} kg.` }), list),
    done: () => chosen.length > 0,
    result: () => gradePack(chosen, items, budget),
  };
}

/**
 * Build the tool for an order.
 *
 * The sol decides the numbers, so the same tool on two different sols is not
 * the same task.
 */
export function makeInspection(engine: EngineKind, sol: number): Inspection {
  switch (engine) {
    case 'sequence':
      return sequenceInspection();
    case 'timing':
      return timingInspection(sol);
    case 'radar':
      return radarInspection(sol);
    case 'sort':
      return sortInspection();
    case 'match':
      return matchInspection();
    case 'pack':
      return packInspection(sol);
  }
}
