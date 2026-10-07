/**
 * Maps a route to the screen that draws it.
 *
 * The one file allowed to know about both `ui/` and `features/`. Every feature
 * is imported by name here, which is what keeps features from importing each
 * other: a screen can reach its own model, and the router hands it the run.
 */

import { mountBriefing } from '../features/briefing/view';
import { mountNaming } from '../features/naming/view';
import type { RunState } from '../sim/run';

import { nextRoute, type Route } from './routes';

/**
 * A screen: given a mount point, the current run, and a way to replace that run,
 * draw and return a teardown.
 *
 * Teardown is required rather than optional because screens accumulate. Without
 * it, navigating back and forth leaks every listener from the screen left behind.
 *
 * `setRun` is how a screen creates run state. The shell owns the run so that
 * screens never have to reach each other for it: naming creates the run, and
 * every later screen reads it. A fourth argument when a screen needs to start a
 * run or change it is what keeps `cross-feature` from ever being needed.
 */
export type ScreenFactory = (
  mount: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
) => () => void;

/** Mount points live in index.html, keyed by route. */
const SCREEN_MOUNTS: Readonly<Partial<Record<Route, string>>> = {
  naming: '#naming',
  briefing: '#briefing',
};

const SCREENS: Readonly<Partial<Record<Route, ScreenFactory>>> = {
  naming: mountNaming,
  briefing: mountBriefing,
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

/**
 * Where "continue" goes from the given route.
 *
 * Every scene that is not built yet is entered through `landing`, the
 * under-construction interstitial. Applying that here rather than in the route
 * table is deliberate: a new screen cannot be made reachable without its
 * placeholder, because there is nothing to remember to add.
 *
 * As each scene gets built it simply stops being skipped, so the interstitial
 * drops out of the journey on its own with no edit here.
 */
export function nextStop(route: Route): Route | null {
  const next = nextRoute(route);

  if (next === null) return null;

  return resolveScreen(next) === null ? 'landing' : next;
}