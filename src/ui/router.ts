import {
  DEFAULT_ROUTE,
  parseRoute,
  routeToHash,
  type Route,
} from './routes';

/**
 * Hash routing: the browser glue.
 *
 * Deliberately thin. Every decision about what a hash *means* lives in
 * `routes.ts`, which is pure and unit tested; this file only reads
 * `location.hash`, listens for `hashchange`, and calls back. That split is why
 * the routing logic has real coverage while the DOM layer has none.
 *
 * Hash routing rather than separate HTML pages: there is no persistence in this
 * project, so a navigation would lose the run state a multi-mission loop needs.
 */

export interface RouterOptions {
  /**
   * Called once immediately with the current route, and again on every
   * navigation. Replaces the current screen.
   */
  onRoute(route: Route): void;

  /**
   * Called when the hash names no known screen, before the default route is
   * shown. Useful for surfacing a typo during a demo rather than failing silently.
   */
  onUnknownHash?(hash: string): void;
}

/**
 * Start routing. Returns a teardown function that removes the listener.
 *
 * An unrecognised hash is normalised to the default route with `replaceState`, so
 * the address bar never disagrees with what is on screen and the back button
 * still works.
 */
export function startRouter(options: RouterOptions): () => void {
  const resolve = (): Route => {
    const route = parseRoute(window.location.hash);

    if (route !== null) return route;

    // Ignore the browser's bare '#', which is the default and needs no repair.
    if (window.location.hash !== '' && window.location.hash !== '#') {
      options.onUnknownHash?.(window.location.hash);
    }

    const fallback = DEFAULT_ROUTE;
    window.history.replaceState(null, '', routeToHash(fallback));

    return fallback;
  };

  const onHashChange = (): void => {
    options.onRoute(resolve());
  };

  window.addEventListener('hashchange', onHashChange);
  options.onRoute(resolve());

  return () => {
    window.removeEventListener('hashchange', onHashChange);
  };
}

/**
 * Navigate to a route. Uses `location.hash` rather than `pushState` so the
 * browser's back button steps between screens, which is what makes a deep link
 * like `#/debrief` demoable without playing there first.
 */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}