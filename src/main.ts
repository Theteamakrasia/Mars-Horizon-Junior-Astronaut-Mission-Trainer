import './style.css';

import astronautUrl from '../Assets/images/floating.png';
import { startFloatingAstronaut } from './dom/floatAstronaut';
import { createStarfield } from './dom/starfield';
import type { RunState } from './sim/run';
import { LAYOUT_PROBLEMS } from './ui/baseLayout';
import { preloadLandingFrames } from './ui/landingFrames';
import { allScreenMounts, resolveScreen, screenMount } from './ui/registry';
import { startRouter } from './ui/router';
import type { Route } from './ui/routes';
import { clearSave, readSave, writeSave } from './ui/save';
import { playSfx, startSfx } from './ui/sfx';

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
 * The placement editor, when the developer has switched it on.
 *
 * A developer tool, not a game screen: it has no route, no mount point and no
 * registry entry, and it is compiled out of a production build entirely, so
 * no player can reach it.
 *
 * The module is loaded on demand with a dynamic import, which is what keeps
 * it out of the production bundle: `import.meta.env.DEV` is false there, the
 * branch below never runs, and the module is never even fetched.
 */
let layoutEditorReady: Promise<((root: HTMLElement) => () => void) | null> = Promise.resolve(null);

/** Teardown for the placement editor on the screen currently mounted. */
let layoutTeardown: (() => void) | null = null;

/**
 * Counts screen mounts, so a late-arriving editor knows whether the screen
 * it was meant for is still the one on show.
 */
let layoutToken = 0;

/** Has the developer asked for the placement editor? */
function layoutRequested(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('editlayout');
}

/**
 * The current run, owned here.
 *
 * The shell holds it rather than any screen, which is what lets naming create the
 * run and briefing read the name from it without either importing the other.
 *
 * It is also written down as it changes (`ui/save.ts`), so closing the tab is no
 * longer the end of it: the menu greets the astronaut by name and offers
 * CONTINUE (D-081). That is a device-local save, not an account — Supabase is
 * still deferred (D-003), and a different browser has a different run.
 */
let run: RunState | null = null;

/** The screen on show, so a save knows where the player was. */
let currentRoute: Route | null = null;

/**
 * Hand the run to the shell, and write it down.
 *
 * Screens get this rather than a shared global. Saving here rather than in each
 * screen means no screen has to remember to: every change to the run goes
 * through this one function.
 */
function setRun(next: RunState | null): void {
  run = next;

  /*
   * A null run means the player has gone back to the menu with nothing to come
   * back to: START OVER, or the form's own back button. The saved run goes with
   * it, because a CONTINUE left behind would contradict the button they pressed.
   */
  if (next === null) {
    clearSave();
    return;
  }

  if (currentRoute !== null) {
    writeSave(next, currentRoute);
  }
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
      onGrab: () => playSfx('astronaut-grab'),
      onToss: () => playSfx('astronaut-toss'),
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

  /*
   * The placement editor, if the developer asked for it with `?editlayout=1`.
   *
   * The dynamic import is inside the `import.meta.env.DEV` branch on purpose:
   * in a production build that branch is false, so the module is never
   * fetched and never reaches the bundle.
   */
  if (layoutRequested()) {
    layoutEditorReady = import('./ui/baseLayoutEditor').then((mod) => mod.startLayoutEditor);
  }

  /*
   * Say so when the layout file is not clean.
   *
   * The game copes with a broken file rather than refusing to start: a kind it
   * cannot read falls back to the authored default and a number out of range
   * is clamped. That is the right behaviour for the player, and it is the
   * wrong behaviour for the developer, because a silently fixed file looks
   * exactly like a file that was ignored. So the fix list is printed where the
   * developer will see it.
   *
   * Dev only. A malformed file cannot reach production anyway — Vite fails
   * the build on unparseable JSON — so a warning there would be noise.
   */
  if (import.meta.env.DEV && LAYOUT_PROBLEMS.length > 0) {
    console.warn(
      `[Mars Horizon] baseLayout.json has ${LAYOUT_PROBLEMS.length} problem(s). The game is using the closest it can.`,
      ...LAYOUT_PROBLEMS,
    );
  }

  /**
   * Start the sound, before the first screen is mounted.
   *
   * The listeners it installs are on `document`, not on any screen, so they
   * survive the desk being rebuilt on every change and the player moving
   * between scenes. The browser will not play anything until the first
   * gesture, which is exactly when the first cue is asked for.
   */
  startSfx();

  /**
   * Continue from an earlier visit.
   *
   * Loaded before the router mounts anything, so a browser that restored a tab
   * on `#/act` gets the desk with the run it belongs to instead of the desk's
   * "no run" fallback. The menu reads the save itself for its CONTINUE button,
   * and this is the other half of the same choice: the run has to be back in
   * memory before any screen asks for it (D-081).
   */
  run = readSave()?.run ?? null;

  /*
    The landing sequence's five frames, fetched now.

    The film is a moment the player waits for, and five pictures is real
    weight. Fetching them here means they are in the cache, and decoded,
    before the player is anywhere near the map - so the film can start on its
    first frame instead of on a download. The film still waits for the frames
    when it mounts; this only means there is nothing left to wait for.
  */
  preloadLandingFrames();

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
  // Where a save would send the player, and what a change made on this screen
  // is written against (D-081).
  currentRoute = route;

  const teardown = activeScreen;
  activeScreen = null;

  if (teardown !== null) {
    teardown();
  }

  layoutTeardown?.();
  layoutTeardown = null;
  layoutToken += 1;

  const token = layoutToken;

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

  /*
   * Coming back to a screen is worth remembering too. The run has not changed,
   * but the place to resume at has — so a player who closed the tab here comes
   * back here (D-081).
   */
  if (run !== null) {
    writeSave(run, route);
  }

  /*
   * The placement editor, once its module has loaded.
   *
   * The editor may not be wanted at all — the developer may have pressed
   * Done, which takes the flag out of the address bar — and it must not
   * attach to a screen that has already been replaced.
   */
  void layoutEditorReady.then((start) => {
    if (start === null) return;
    if (!layoutRequested()) return;
    if (token !== layoutToken) return;
    if (root.hidden) return;

    layoutTeardown?.();
    layoutTeardown = start(root);
  });
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
    layoutTeardown?.();
    layoutTeardown = null;
    activeScreen?.();
    activeScreen = null;
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
