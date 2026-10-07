/**
 * Route table and pure hash parsing.
 *
 * Split from `router.ts` deliberately: this half has no DOM at all, so it can be
 * unit tested the way `sim/` is. `router.ts` is then only the thin browser glue â€”
 * read `location.hash`, listen for `hashchange`, call back.
 *
 * Hash routing is used rather than separate HTML pages because there is no
 * persistence in this project (no storage, no backend). A multi-page build would
 * lose run state on every navigation, which breaks a multi-mission loop.
 */

/** Every screen the player can reach. */
export type Route =
  | 'naming'
  | 'briefing'
  | 'supply'
  | 'launch'
  | 'landing'
  | 'landing-site'
  | 'base'
  | 'act'
  | 'debrief';

/**
 * The journey, in play order.
 *
 * One entry per distinct screen, no duplicates. The under-construction
 * interstitial is NOT listed here â€” see `nextStop` in `registry.ts`, which knows
 * which screens are actually built and inserts the placeholder itself.
 *
 * An earlier version spelled the interstitial out as repeated `landing` entries
 * in this array. That was wrong: `nextRoute` uses `indexOf`, so from the first
 * `landing` it always found the same `landing` and the player would have walked
 * `landing-site -> landing -> landing-site` forever. Making the interstitial a
 * computed step rather than a listed one removes the possibility entirely.
 *
 * `naming` is first because it is the entry screen: the player names their
 * astronaut and starts the journey from there. A login page is intended to sit
 * in front of it later, but it is not built â€” Supabase is deferred (D-003).
 */
export const ROUTE_ORDER: readonly Route[] = [
  'naming',
  'briefing',
  'supply',
  'launch',
  'landing-site',
  'base',
  'act',
  'debrief',
];

/** Alias kept for readability at call sites that care about journey order. */
export const JOURNEY = ROUTE_ORDER;

/** The route shown when there is no usable hash. */
export const DEFAULT_ROUTE: Route = 'naming';

/**
 * Every route that can be typed into the address bar.
 *
 * Wider than ROUTE_ORDER on purpose: `landing` is the under-construction
 * interstitial and is not a stop in the journey, but it must stay a valid route
 * so a player can reach it directly by URL. Keeping the two lists separate is
 * what lets the journey order stay free of duplicates.
 */
export const ALL_ROUTES: readonly Route[] = [...ROUTE_ORDER, 'landing'];

function isRoute(value: string): value is Route {
  return (ALL_ROUTES as readonly string[]).includes(value);
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
 * The next screen in journey order, or null at the end.
 *
 * This is the raw sequence, with no knowledge of what is built. For the route a
 * player actually walks â€” which skips through the under-construction
 * interstitial â€” use `nextStop` in `registry.ts`.
 */
export function nextRoute(route: Route): Route | null {
  const index = ROUTE_ORDER.indexOf(route);
  if (index < 0 || index === ROUTE_ORDER.length - 1) return null;

  return ROUTE_ORDER[index + 1];
}

/** The previous screen in journey order, or null at the start. */
export function previousRoute(route: Route): Route | null {
  const index = ROUTE_ORDER.indexOf(route);
  return index <= 0 ? null : ROUTE_ORDER[index - 1];
}