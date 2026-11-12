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
export function dealCargoRound(random: () => number): CargoRound {
  const pool = [...CARGO_ITEMS];
  const items: CargoItem[] = [];

  /* One for every store first, so no store is left empty. */
  for (const box of CARGO_BOXES) {
    const index = pool.findIndex((item) => item.box === box.id);

    if (index < 0) continue;

    items.push(pool[index] as CargoItem);
    pool.splice(index, 1);
  }

  while (items.length < CARGO_ROUND && pool.length > 0) {
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
export function cargoPerformance(mistakes: number): TrainingPerformance {
  if (mistakes <= CARGO_EXCELLENT_MISTAKES) return 'excellent';
  if (mistakes <= CARGO_GOOD_MISTAKES) return 'good';

  return 'basic';
}
