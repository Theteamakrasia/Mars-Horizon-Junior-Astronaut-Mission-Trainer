/**
 * STUB — not implemented. Every export here throws.
 *
 * The map, the five selectable regions, and the Site Analysis panel showing the
 * selected region's five scores.
 *
 * When built, this imports its own `./model` and nothing else. `npm run check`
 * fails an import of any other feature as `cross-feature` — shared state comes
 * from the `run` argument instead.
 *
 * Accessibility is a requirement, not a polish item: five regions reachable by
 * keyboard, and the panel announcing the selection. A screen only a mouse can
 * operate is not shippable for an ages 8-16 audience.
 *
 * Styles go in ./landing-site.css, imported here. Do not add a line to
 * src/style.css — that is the landing page's stylesheet and it is a merge magnet.
 *
 * Task: TASK-028.
 */

import type { RunState } from '../../sim/run';

/**
 * Draw the screen into `mount` and return a teardown.
 *
 * Teardown is required: main.ts routes between screens, and without one every
 * listener and timer from the previous screen leaks.
 */
export function mountLandingSite(_mount: HTMLElement, _run: RunState | null): () => void {
  throw new Error(
    'STUB: features/landing-site/view.ts is not implemented. See ./README.md for the contract.',
  );
}