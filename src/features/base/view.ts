/**
 * STUB — not implemented. Every export here throws.
 *
 * The outpost overview: placed modules, the Life Support and Resources panel
 * showing the five stores as percentages, the incoming-weather warning, and the
 * Build New Module control.
 *
 * That warning — "solar storm approaching in sol 2" — belongs on this screen, not
 * only at the debrief. The player has just landed and already has a problem, and
 * the warning is the game teaching them to read ahead.
 *
 * Styles go in ./base.css, imported here. Never add a line to src/style.css.
 *
 * Task: TASK-029. Blocked on TASK-015.
 */

import type { RunState } from '../../sim/run';

/** Draw the screen into `mount` and return a teardown. */
export function mountBase(_mount: HTMLElement, _run: RunState): () => void {
  throw new Error(
    'STUB: features/base/view.ts is not implemented. See ./README.md for the contract.',
  );
}