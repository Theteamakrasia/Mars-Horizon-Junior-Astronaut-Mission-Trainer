/**
 * STUB — not implemented. Every export here throws.
 *
 * Pure rules for the base screen: the module catalogue, what each module costs,
 * and what it demands of every other system.
 *
 * That coupling is the game. Build New Module is the core of the strategy layer —
 * every module improves one system and increases what the others must support.
 * Keep it pure and testable, because the arithmetic is the part that must be
 * correct; the presentation is not.
 *
 * Tuning constants belong in ./constants.ts so the numbers live in one file.
 *
 * Task: TASK-029. Blocked on TASK-015 (src/sim/resources.ts).
 */

import type { RunState } from '../../sim/run';

/** The four modules a run starts with, from the project README. */
export type ModuleKind = 'habitat' | 'life-support' | 'solar-array' | 'batteries';

/** What a placed module needs, and what it gives. */
export interface ModuleSpec {
  readonly kind: ModuleKind;
  readonly provides: readonly string[];
  readonly requires: readonly string[];
}

/** The catalogue. Empty until built. */
export const MODULE_CATALOGUE: readonly ModuleSpec[] = [];

/**
 * Can this module be placed given the chosen region?
 *
 * Terrain from landing-site arrives on the `RunState`, not by importing that
 * feature — `npm run check` enforces that as `cross-feature`.
 */
export function canPlace(_module: ModuleKind, _run: RunState): boolean {
  throw new Error('STUB: features/base/model.ts is not implemented. See ../README.md.');
}

/** Total power draw and support load across every placed module. */
export function upkeepFor(_modules: readonly ModuleKind[]): {
  readonly powerDraw: number;
  readonly supportLoad: number;
} {
  throw new Error('STUB: features/base/model.ts is not implemented.');
}