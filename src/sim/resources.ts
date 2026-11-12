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

/**
 * The line a store has to stay above.
 *
 * Thirty percent. Below it the store is in the danger zone, and two sols in a
 * row down there is what ends a mission. It is a warning line rather than a
 * cliff: one bad sol is a lesson the crew can come back from, two in a row is
 * the point where the stores can no longer be relied on.
 */
export const RESOURCE_FLOOR = 30;

/**
 * How many sols in a row below the floor ends the run.
 *
 * Two, and two *in a row*: a store that comes back above the line has been
 * dealt with, and the count starts again. That is the kinder rule for a child,
 * and the easier one to say out loud — "two days in a row is the limit" is a
 * sentence a nine-year-old can repeat.
 */
export const FLOOR_STRIKES = 2;

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

/**
 * The stores the floor rule watches.
 *
 * The same four as `LIFE_STORES`, and deliberately so: they are the stores a
 * crew cannot do without, so they are both the ones that end a run at zero and
 * the ones that carry a warning line. Aliased rather than written out twice,
 * because two lists that must agree eventually stop agreeing.
 *
 * Power is absent for a different reason. An empty battery is not the end by
 * itself — it switches life support off, and *that* is what runs these four
 * down. Power is kept honest by the gate in `sim/activities.ts` instead: a job
 * the batteries cannot pay for cannot be started.
 */
export const FLOORED_STORES: readonly ResourceName[] = LIFE_STORES;

/**
 * How many sols in a row this store has ended below the floor.
 *
 * Read off the end of the log, so it needs no state of its own and cannot
 * drift from the numbers the player was shown. A store at zero counts as
 * `FLOOR_STRIKES` at once: the tank is empty, and there is nothing left to
 * save, which is why an empty store still ends a run on the sol it empties.
 */
export function floorStreak(
  log: readonly { readonly stores: ResourceStores }[],
  name: ResourceName,
): number {
  if (!FLOORED_STORES.includes(name)) return 0;

  let streak = 0;

  for (let index = log.length - 1; index >= 0; index -= 1) {
    const stores = log[index]?.stores;

    if (stores === undefined) break;
    /* Empty is the whole warning spent: the crew had nothing left. */
    if (stores[name] <= 0) return FLOOR_STRIKES;
    if (stores[name] >= RESOURCE_FLOOR) break;

    streak += 1;
  }

  return streak;
}

/**
 * The stores that have been below the floor too long.
 *
 * In the canonical order, so a debrief always names the same store first when
 * two of them went at once.
 */
export function scrubbedStores(log: readonly { readonly stores: ResourceStores }[]): readonly ResourceName[] {
  return FLOORED_STORES.filter((name) => floorStreak(log, name) >= FLOOR_STRIKES);
}

/** Which stores are at or below zero, i.e. how a run can end. */
export function depletedStores(stores: ResourceStores): readonly ResourceName[] {
  return RESOURCE_NAMES.filter((name) => stores[name] <= 0);
}

/** A store as a whole percentage of its tank, for meters. */
export function percentOf(name: ResourceName, stores: ResourceStores, powerCapacity: number): number {
  const capacity = name === 'power' ? Math.max(1, powerCapacity) : STORE_CAPACITY;
  return Math.round(Math.min(100, Math.max(0, (stores[name] / capacity) * 100)));
}
