import './style.css';

import astronautUrl from '../Assets/images/floating.png';
import { startFloatingAstronaut } from './dom/floatAstronaut';
import { createStarfield } from './dom/starfield';
import type { RunState } from './sim/run';
import { allScreenMounts, resolveScreen, screenMount } from './ui/registry';
import { startRouter } from './ui/router';
import type { Route } from './ui/routes';

/**
 * Resolves an element by id, throwing a clear error if the markup and the
 * script have drifted apart — easier to debug than a null dereference.
 */
function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

/**
 * Explicit motion override, for previewing the drift on a machine whose OS
 * reports reduced motion: `?motion=force` always animates, `?motion=reduce`
 * never does. Returns null when no override was requested, in which case the
 * OS preference decides — so the accessibility behaviour is the default and the
 * override only ever applies to a URL somebody typed on purpose.
 */
function readMotionOverride(): boolean | null {
  const requested = new URLSearchParams(window.location.search).get('motion');

  if (requested === 'force') return false;
  if (requested === 'reduce') return true;

  return null;
}

/**
 * The landing page's layers, hidden while a routed screen is mounted over them.
 *
 * Declared before bootstrap runs, and assigned there, because bootstrap can be
 * called synchronously at module evaluation when the document is already parsed.
 */
let landingLayers: readonly HTMLElement[] = [];

/**
 * Every routed screen's root element.
 *
 * Collected from the registry rather than listed, so adding a screen cannot be
 * forgotten here. Each is toggled with `hidden` on every navigation: all of them
 * are position:fixed at the same z-index, so two visible at once means one
 * silently covers the other.
 */
let routedScreens: readonly HTMLElement[] = [];

/** Teardown for the mounted screen, if any. */
let activeScreen: (() => void) | null = null;

/**
 * The current run, owned here.
 *
 * The shell holds it rather than any screen, which is what lets naming create the
 * run and briefing read the name from it without either importing the other. It
 * lives in memory only: a refresh loses it, because persistence is deferred
 * (D-003).
 */
let run: RunState | null = null;

/** Hand the run to the shell. Screens get this rather than a shared global. */
function setRun(next: RunState | null): void {
  run = next;
}

/** Show the landing page, hiding any mounted screen's layer. */
function showLanding(): void {
  for (const layer of landingLayers) layer.hidden = false;
}

/** Hide the landing page, revealing whatever is mounted over it. */
function hideLanding(): void {
  for (const layer of landingLayers) layer.hidden = true;
}

function bootstrap(): void {
  const starfield = requireElement<HTMLElement>('starfield');
  const astronaut = requireElement<HTMLElement>('astronaut');
  const astronautDeform = requireElement<HTMLElement>('astronaut-deform');
  const astronautImg = requireElement<HTMLImageElement>('astronaut-img');

  // Typed asset import — Vite fingerprints this and emits it into dist/.
  astronautImg.src = astronautUrl;
  // Native image dragging would otherwise hijack the pointer gesture that
  // pointerGrab.ts wants for picking the astronaut up.
  astronautImg.draggable = false;

  createStarfield(starfield);

  // Respect the OS-level motion preference for the drifting sprite as well as
  // for the CSS animations.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Teardown handle for the animation loop, so the preference can be
  // re-applied without stacking up duplicate rAF loops.
  let stopFloating: (() => void) | null = null;

  const motionOverride = readMotionOverride();

  // With reduced motion he still drifts, just slowly and without the snapping
  // deformation, and he stays pick-up-able: moving something in direct response
  // to the pointer is not the kind of self-directed motion the setting targets.
  // Parking him dead in the centre instead left the page looking broken.
  // Toggling the OS setting mid-session must take effect, so this is a live
  // listener rather than a one-off check at load.
  const applyMotionPreference = (): void => {
    stopFloating?.();
    stopFloating = null;

    stopFloating = startFloatingAstronaut(astronaut, {
      deformLayer: astronautDeform,
      reducedMotion: motionOverride ?? motionQuery.matches,
    });
  };

  // Only listen for OS changes when the OS is actually the thing in charge.
  // Otherwise an override would be discarded and replaced the moment the
  // preference flipped, which is surprising when the URL asked for a mode.
  if (motionOverride === null) {
    motionQuery.addEventListener('change', applyMotionPreference);
  }

  applyMotionPreference();

  /*
   * Everything that belongs to the landing page, hidden while a routed screen is
   * mounted over it.
   *
   * Scoped to the landing layer specifically rather than listing elements one by
   * one. A previous version listed four of them and missed the naming screen
   * entirely, so the menu and the briefing were both visible at once — and
   * because naming comes first in the document, its dead buttons sat on top of
   * the briefing. Adding a screen without remembering to add it here is the exact
   * mistake this scoping avoids.
   */
  const landing = document.getElementById('landing');

  landingLayers = landing === null ? [] : [...landing.querySelectorAll<HTMLElement>('*')];

  // Every routed screen starts hidden. Only the router reveals one, which is what
  // guarantees two screens are never visible at the same z-index.
  routedScreens = allScreenMounts()
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((screen): screen is HTMLElement => screen !== null);

  for (const screen of routedScreens) screen.hidden = true;

  startScreenRouter();
}

/**
 * Mount the routed screen, and unmount whatever was mounted before.
 *
 * Only one screen is live at a time and teardown is mandatory: a screen that
 * leaves its listeners attached would double up every time the player navigates
 * back to it.
 */
function mountScreen(route: Route): void {
  const teardown = activeScreen;
  activeScreen = null;

  if (teardown !== null) {
    teardown();
  }

  const selector = screenMount(route);
  const factory = resolveScreen(route);

  /*
   * Every routed screen starts hidden; exactly one is revealed below.
   *
   * This is what stops two screens being visible at once. They are all
   * position:fixed at the same z-index, so whichever came first in the document
   * paints on top of the one actually mounted — which is how the naming menu used
   * to sit over the briefing with its dead buttons, and why the briefing looked
   * blank and unresponsive.
   */
  for (const screen of routedScreens) screen.hidden = true;

  // A route with nothing built yet is not an error. Most screens are stubs, and
  // the router must be able to fall through rather than take the page down.
  if (selector === null || factory === null) {
    showLanding();
    return;
  }

  const root = document.querySelector<HTMLElement>(selector);

  if (root === null) {
    throw new Error(`Missing screen mount point: ${selector}`);
  }

  hideLanding();
  root.hidden = false;
  activeScreen = factory(root, run, setRun);
}

/**
 * Start hash routing.
 *
 * The landing page keeps running behind whichever screen is mounted: it is the
 * only visual that works today and BACK TO MAIN MENU returns to it, so retiring
 * it before the game reaches 30% built would remove something that still works.
 */
function startScreenRouter(): void {
  const stopRouter = startRouter({ onRoute: mountScreen });

  // Unmount on unload so nothing is left attached to a document going away.
  window.addEventListener('pagehide', () => {
    stopRouter();
    activeScreen?.();
    activeScreen = null;
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
