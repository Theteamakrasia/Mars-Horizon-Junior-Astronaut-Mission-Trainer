/**
 * STUB — not implemented. Every export here throws.
 *
 * The five resources that drain every sol. The shape below is real and taken from
 * the project README; the arithmetic is not written.
 *
 * Contract when built:
 *   - pure. No DOM, no network, no Math.random.
 *   - every test input literal, never a random seed (see ISS-015 for why).
 *   - values are absolute stores, not percentages, so a UI can render either.
 *
 * Task: TASK-015. Blocked on nothing — this is the first thing to build.
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

/**
 * Absolute amounts. Undefined scale is deliberate: decide units here, once.
 * Power in kW, water and oxygen in litres, food in rations, shielding in a 0-1
 * coverage figure — or change this, but change it before any UI reads it.
 */
export interface ResourceStores {
  readonly power: number;
  readonly oxygen: number;
  readonly water: number;
  readonly food: number;
  readonly shielding: number;
}

/** Starting stores for a fresh run, before any module is built. */
export function createInitialStores(_overrides?: Partial<ResourceStores>): ResourceStores {
  throw new Error(
    'STUB: sim/resources.ts is not implemented. See src/features/README.md for the contract.',
  );
}

/** Apply one sol's drain. Must never mutate its argument. */
export function drainForSol(
  _stores: ResourceStores,
  _sol: number,
): ResourceStores {
  throw new Error('STUB: sim/resources.ts is not implemented.');
}

/** Which stores are at or below zero — i.e. how a run can end. */
export function depletedStores(_stores: ResourceStores): readonly ResourceName[] {
  throw new Error('STUB: sim/resources.ts is not implemented.');
}