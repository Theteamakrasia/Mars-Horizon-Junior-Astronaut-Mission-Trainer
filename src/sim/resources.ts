/**
 * The five resources that drain every sol.
 *
 * Pure. No DOM, no network, no Math.random. Every test input is a literal.
 *
 * Units, decided once, here:
 *   power      kWh stored in the batteries. Capacity depends on how many batteries
 *              the player built, so it is passed in rather than baked in.
 *   oxygen     0-100, percent of the tank
 *   water      0-100, percent of the tank
 *   food       0-100, percent of the store room
 *   shielding  0-100, percent of the radiation shielding still intact
 *
 * Absolute stores rather than percentages for power so a UI can render either;
 * the other four are already on a 0-100 scale because their tanks are fixed.
 */

/** The five stores that never stop draining. */
export type ResourceName = 'power' | 'oxygen' | 'water' | 'food' | 'shielding';

/** Iteration order, for rendering and for tests. */
export const RESOURCE_NAMES: readonly ResourceName[] = [
  'power',
  'oxygen',
  'water',
  'food',
  'shielding',
];

/** Full tank for every store except power. */
export const STORE_CAPACITY = 100;

export interface ResourceStores {
  readonly power: number;
  readonly oxygen: number;
  readonly water: number;
  readonly food: number;
  readonly shielding: number;
}

/**
 * The stores a run starts with, before anything is built.
 *
 * Deliberately a starting point rather than a full loadout: the player builds the
 * outpost on the `base` screen, which then sets power to a full battery and
 * shielding from the modules chosen.
 */
export function createInitialStores(overrides?: Partial<ResourceStores>): ResourceStores {
  return {
    power: 40,
    oxygen: 100,
    water: 90,
    food: 80,
    shielding: 20,
    ...overrides,
  };
}

/** Keep every store inside its tank. Power is capped by the batteries built. */
export function clampStores(stores: ResourceStores, powerCapacity: number): ResourceStores {
  const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value));

  return {
    power: clamp(stores.power, powerCapacity),
    oxygen: clamp(stores.oxygen, STORE_CAPACITY),
    water: clamp(stores.water, STORE_CAPACITY),
    food: clamp(stores.food, STORE_CAPACITY),
    shielding: clamp(stores.shielding, STORE_CAPACITY),
  };
}

/**
 * Apply one sol's net change and keep the result inside its tank.
 *
 * Never mutates its argument. `net` is the change, positive or negative, so the
 * same function covers a drain and a refill.
 */
export function drainForSol(
  stores: ResourceStores,
  net: Partial<ResourceStores>,
  powerCapacity: number,
): ResourceStores {
  return clampStores(
    {
      power: stores.power + (net.power ?? 0),
      oxygen: stores.oxygen + (net.oxygen ?? 0),
      water: stores.water + (net.water ?? 0),
      food: stores.food + (net.food ?? 0),
      shielding: stores.shielding + (net.shielding ?? 0),
    },
    powerCapacity,
  );
}

/** The stores that keep people alive. Power is not one: an empty battery causes a blackout, and the blackout is what hurts. */
export const LIFE_STORES: readonly ResourceName[] = ['oxygen', 'water', 'food', 'shielding'];

/** Which stores are at or below zero, i.e. how a run can end. */
export function depletedStores(stores: ResourceStores): readonly ResourceName[] {
  return RESOURCE_NAMES.filter((name) => stores[name] <= 0);
}

/** A store as a whole percentage of its tank, for meters. */
export function percentOf(name: ResourceName, stores: ResourceStores, powerCapacity: number): number {
  const capacity = name === 'power' ? Math.max(1, powerCapacity) : STORE_CAPACITY;
  return Math.round(Math.min(100, Math.max(0, (stores[name] / capacity) * 100)));
}
