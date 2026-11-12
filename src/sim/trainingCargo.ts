/**
 * Cargo Sorting: the supplies that land, and the stores they belong in.
 *
 * A pod of supplies comes down and every crate has to go into the right
 * store: food with the food, oxygen with the oxygen. It is the easiest of
 * the six games on purpose — it is the one a child can win on the first try,
 * and it teaches that the colony sorts what it receives.
 *
 * Pure. The crates are a list and the stores are a list, and the round is
 * dealt from the generator the caller passes in.
 */

import type { TrainingPerformance } from './training';

/** The stores on the floor. */
export interface CargoBox {
  readonly id: string;
  readonly label: string;
}

/** The stores, in the order they are shown. */
export const CARGO_BOXES: readonly CargoBox[] = [
  { id: 'food', label: 'Food' },
  { id: 'water', label: 'Water' },
  { id: 'oxygen', label: 'Oxygen' },
  { id: 'energy', label: 'Energy' },
  { id: 'medical', label: 'Medical' },
  { id: 'building', label: 'Building' },
];

/** One crate, and the store it belongs in. */
export interface CargoItem {
  readonly id: string;
  readonly label: string;
  /** The store this crate belongs in. */
  readonly box: string;
}

/** The crates that can come down, two for every store. */
export const CARGO_ITEMS: readonly CargoItem[] = [
  { id: 'fruit', label: 'Fruit', box: 'food' },
  { id: 'rations', label: 'Rations', box: 'food' },
  { id: 'water', label: 'Water', box: 'water' },
  { id: 'tank', label: 'Water tank', box: 'water' },
  { id: 'air', label: 'Air', box: 'oxygen' },
  { id: 'oxygen-tank', label: 'Oxygen tank', box: 'oxygen' },
  { id: 'battery', label: 'Battery', box: 'energy' },
  { id: 'cable', label: 'Power cable', box: 'energy' },
  { id: 'medicine', label: 'Medicine', box: 'medical' },
  { id: 'bandage', label: 'Bandage', box: 'medical' },
  { id: 'brick', label: 'Brick', box: 'building' },
  { id: 'wrench', label: 'Wrench', box: 'building' },
];

/** How many crates land in one round. */
export const CARGO_ROUND = 8;

/** Putting every crate in the wrong store is an excellent round. */
export const CARGO_EXCELLENT_MISTAKES = 0;

/** Two wrong stores is still a good round. */
export const CARGO_GOOD_MISTAKES = 2;

/**
 * How the cargo round goes at a level.
 *
 * The goal grows for the first three levels - more supplies to store - and
 * then the allowance shrinks: from the fourth level on, a wrong store is
 * allowed only so many times before the round is over.
 *
 * The bands widen as the round gets harder, so a player is paid the same for
 * the same quality of work whatever the level is. The level is never shown:
 * the game simply asks for more crates, and then for tidier work.
 */
export interface CargoDifficulty {
  /** How many crates land. */
  readonly crates: number;
  /** How many wrong stores the round allows before it is over. */
  readonly mistakes: number;
  /** How many wrong stores still count as an excellent round. */
  readonly excellent: number;
  /** How many wrong stores still count as a good round. */
  readonly good: number;
}

/** One row per level. The first is the game as it always was. */
const CARGO_DIFFICULTY: readonly CargoDifficulty[] = [
  { crates: 8, mistakes: Infinity, excellent: 0, good: 2 },
  { crates: 9, mistakes: Infinity, excellent: 1, good: 3 },
  { crates: 10, mistakes: Infinity, excellent: 1, good: 3 },
  { crates: 10, mistakes: 3, excellent: 1, good: 2 },
  { crates: 10, mistakes: 3, excellent: 1, good: 2 },
  { crates: 10, mistakes: 2, excellent: 2, good: 3 },
  { crates: 10, mistakes: 2, excellent: 2, good: 3 },
  { crates: 10, mistakes: 1, excellent: 2, good: 3 },
  { crates: 10, mistakes: 1, excellent: 3, good: 4 },
  { crates: 10, mistakes: 1, excellent: 3, good: 4 },
  { crates: 10, mistakes: 1, excellent: 3, good: 4 },
  { crates: 10, mistakes: 1, excellent: 3, good: 4 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function cargoDifficulty(level: number): CargoDifficulty {
  const step = Math.min(CARGO_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return CARGO_DIFFICULTY[step - 1] as CargoDifficulty;
}

/** One round of supplies, dealt. */
export interface CargoRound {
  readonly items: readonly CargoItem[];
  readonly boxes: readonly CargoBox[];
}

/**
 * Deal a round.
 *
 * Every store gets at least one crate, so the player has to use all six, and
 * the rest are dealt from what is left.
 */
export function dealCargoRound(random: () => number, crates: number = CARGO_ROUND): CargoRound {
  const pool = [...CARGO_ITEMS];
  const items: CargoItem[] = [];

  /* One for every store first, so no store is left empty. */
  for (const box of CARGO_BOXES) {
    const index = pool.findIndex((item) => item.box === box.id);

    if (index < 0) continue;

    items.push(pool[index] as CargoItem);
    pool.splice(index, 1);
  }

  while (items.length < crates && pool.length > 0) {
    const index = Math.floor(random() * pool.length);

    items.push(pool[index] as CargoItem);
    pool.splice(index, 1);
  }

  /* And the order they are dealt in, so the tray is not always the same. */
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = items[index] as CargoItem;

    items[index] = items[swap] as CargoItem;
    items[swap] = held;
  }

  return { items, boxes: CARGO_BOXES };
}

/** The band a finished round falls into, from the number of wrong stores. */
export function cargoPerformance(mistakes: number, difficulty: CargoDifficulty = cargoDifficulty(1)): TrainingPerformance {
  if (mistakes <= difficulty.excellent) return 'excellent';
  if (mistakes <= difficulty.good) return 'good';

  return 'basic';
}
