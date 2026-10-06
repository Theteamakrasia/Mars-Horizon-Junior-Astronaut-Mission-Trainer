/**
 * STUB — not implemented. Every export here throws.
 *
 * The outcome, resources consumed, completed tasks, the lessons, and a way back
 * to replay.
 *
 * THE ONE RULE THIS SCREEN MUST NOT BREAK: no game-over screen that just says
 * "you failed." A losing run gets a debrief explaining the actual cause. There is
 * no life to lose and no enemy — failures cost resources and time, never a life
 * (AGENTS.md R-20, and the README rules out a dead end explicitly).
 *
 * Load-bearing, not polish: with no planning phase, this is the only place a
 * player learns why they lost. It carries the README's central teaching promise.
 *
 * Where a value was an approximation rather than a measurement — baked-in storm
 * data because api.nasa.gov was throttled, say — the UI must say so. See
 * src/data/README.md and ISS-009.
 *
 * Styles go in ./debrief.css, imported here. Never add a line to src/style.css.
 *
 * Task: TASK-031.
 */

import type { RunState } from '../../sim/run';

/** Draw the screen into `mount` and return a teardown. */
export function mountDebrief(_mount: HTMLElement, _run: RunState): () => void {
  throw new Error(
    'STUB: features/debrief/view.ts is not implemented. See ./README.md — this screen is load-bearing.',
  );
}