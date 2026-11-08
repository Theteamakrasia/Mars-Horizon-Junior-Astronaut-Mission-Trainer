/**
 * `act/` model: presentation helpers only.
 *
 * All simulation rules live in `src/sim/sol.ts` (advanceSol, isRunOver) and
 * `src/sim/modules.ts` (upkeepFor). This file formats what `act/view.ts`
 * needs to show — nothing more.
 *
 * Pure: imports only `sim/`. Never imports `base/` or `debrief/` (R-5).
 */

import type { SolEvent } from '../../sim/events';
import { eventsForSol } from '../../sim/events';

/** Format a whole number with a sign. */
export function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Format a store as a whole percent. */
export function formatStore(value: number): string {
  return `${Math.round(value)}%`;
}

/** The events on a given sol, each carrying its `approximate` flag (D-033). */
export function eventsOn(sol: number): readonly SolEvent[] {
  return eventsForSol(sol);
}
