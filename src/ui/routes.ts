/**
 * Route table and pure hash parsing.
 *
 * Split from `router.ts` deliberately: this half has no DOM at all, so it can be
 * unit tested the way `sim/` is. `router.ts` is then only the thin browser glue —
 * read `location.hash`, listen for `hashchange`, call back.
 *
 * Hash routing is used rather than separate HTML pages because there is no
 * persistence in this project (no storage, no backend). A multi-page build would
 * lose run state on every navigation, which breaks a multi-mission loop.
 */

/** Every screen the player can reach. */
export type Route = 'naming' | 'landing' | 'landing-site' | 'base' | 'act' | 'debrief';

/**
 * The screens in play order, for progression and for the debrief's "what next"
 * affordance.
 *
 * `naming` is first because it is the entry screen: the player names their
 * astronaut and starts the journey from there. A login page is intended to sit
 * in front of it later, but it is not implemented and not built — Supabase is
 * deferred (D-003).
 *
 * `landing` is the placeholder page that ships until the game is 30% built
 * (D-008), and stays reachable as the "main menu" target.
 */
export const ROUTE_ORDER: readonly Route[] = [
  'naming',
  'landing',
  'landing-site',
  'base',
  'act',
  'debrief',
];

/** The route shown when there is no usable hash. */
export const DEFAULT_ROUTE: Route = 'naming';

function isRoute(value: string): value is Route {
  return (ROUTE_ORDER as readonly string[]).includes(value);
}

/**
 * Parse a location hash into a route, or null if it names no known screen.
 *
 * Tolerates a missing `#`, a missing or duplicated `/`, surrounding whitespace and
 * mixed case, because a hash gets typed by hand during a demo. Returns null rather
 * than throwing: a bad hash is a navigation mistake, not a programming error, and
 * the caller can fall back to the default route.
 */
export function parseRoute(hash: string): Route | null {
  const cleaned = hash
    .trim()
    .replace(/^#+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase();

  if (cleaned === '') return null;

  // Tolerate a query string so a future `?debug=1` cannot break navigation.
  const name = cleaned.split(/[?&]/)[0];

  return isRoute(name) ? name : null;
}

/** The canonical hash for a route, e.g. `base` -> `#/base`. */
export function routeToHash(route: Route): string {
  return `#/${route}`;
}

/**
 * The next screen in play order, or null at the end.
 *
 * Used by the debrief to offer a next step without hard-coding the sequence.
 */
export function nextRoute(route: Route): Route | null {
  const index = ROUTE_ORDER.indexOf(route);
  if (index < 0 || index === ROUTE_ORDER.length - 1) return null;

  return ROUTE_ORDER[index + 1];
}

/** The previous screen in play order, or null at the start. */
export function previousRoute(route: Route): Route | null {
  const index = ROUTE_ORDER.indexOf(route);
  return index <= 0 ? null : ROUTE_ORDER[index - 1];
}