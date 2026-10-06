/**
 * STUB — not implemented. Every export here throws.
 *
 * Maps a route to the screen that draws it. This is the join between ui/ and
 * features/, so it is the one file that is allowed to know about both.
 *
 * It deliberately imports NO feature yet. When it does, those features must
 * exist or `npm run check` fails them as `unresolved-import` — which is the
 * point: the registry cannot claim to route to a screen that is not built.
 *
 * Task: TASK-027. Wire the router into main.ts at the same time, and only when
 * at least one screen exists to route to.
 */

import type { Route } from './routes';

/**
 * A screen: given a mount point, draw, and return a teardown.
 *
 * Teardown is required rather than optional because screens accumulate: without
 * it, navigating back and forth leaks every listener and timer from the screen
 * left behind.
 */
export type ScreenFactory = (mount: HTMLElement, run: unknown) => () => void;

/** The screen for a route, or null if that route has nothing built yet. */
export function resolveScreen(_route: Route): ScreenFactory | null {
  throw new Error(
    'STUB: ui/registry.ts is not implemented. It gains feature imports when the first screen exists.',
  );
}