/**
 * Maps a route to the screen that draws it.
 *
 * The one file allowed to know about both `ui/` and `features/`. Every feature
 * is imported by name here, which is what keeps features from importing each
 * other: a screen can reach its own model, and the router hands it the run.
 */

import { mountNaming } from '../features/naming/view';
import type { RunState } from '../sim/run';

import type { Route } from './routes';

/**
 * A screen: given a mount point and the current run, draw, and return a teardown.
 *
 * Teardown is required rather than optional because screens accumulate. Without
 * it, navigating back and forth leaks every listener from the screen left behind.
 */
export type ScreenFactory = (mount: HTMLElement, run: RunState | null) => () => void;

/** Mount points live in index.html, keyed by route. */
const SCREEN_MOUNTS: Readonly<Partial<Record<Route, string>>> = {
  naming: '#naming',
};

const SCREENS: Readonly<Partial<Record<Route, ScreenFactory>>> = {
  naming: mountNaming,
};

/**
 * The mount point for a route, or null if that route has nothing built yet.
 *
 * Null rather than throwing: most routes are stubs right now, and the router
 * needs to be able to say "not built" without the whole app failing.
 */
export function screenMount(route: Route): string | null {
  return SCREEN_MOUNTS[route] ?? null;
}

/** The screen for a route, or null if that route has nothing built yet. */
export function resolveScreen(route: Route): ScreenFactory | null {
  return SCREENS[route] ?? null;
}