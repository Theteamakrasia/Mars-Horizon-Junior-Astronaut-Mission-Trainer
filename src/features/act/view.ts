/**
 * STUB — not implemented. Every export here throws.
 *
 * The active mission, its trade-off visualiser, and the control that commits the
 * sol.
 *
 * The trade-off is shown as a picture, not a paragraph:
 *
 *     sun -> arrays -> +45 kW/h -> storing 12 kW/h -> night drain -30 kW/h
 *
 * Excellent sunlight and you still cannot win, because Mars night lasts about 12
 * hours and the panels make nothing the whole time. That is why real NASA
 * rovers lean on nuclear power rather than solar alone.
 *
 * On committing a sol, call advanceSol from src/sim/sol.ts and route to debrief
 * when the run ends — use nextRoute from src/ui/routes.ts rather than a
 * hand-written path, so the order lives in one place.
 *
 * SOL STEPPING IS UNDECIDED. Turn-based or real-time has not been settled. If
 * real-time wins, this screen gains a ticker and the pure tests gain a fake
 * clock. Get the answer before building.
 *
 * Styles go in ./act.css, imported here. Never add a line to src/style.css.
 *
 * Task: TASK-030.
 */

import type { RunState } from '../../sim/run';

/** Draw the screen into `mount` and return a teardown. */
export function mountAct(_mount: HTMLElement, _run: RunState): () => void {
  throw new Error(
    'STUB: features/act/view.ts is not implemented. Sol stepping is undecided — see ./README.md.',
  );
}