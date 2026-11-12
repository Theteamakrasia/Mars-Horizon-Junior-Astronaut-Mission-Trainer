/**
 * The saved run, in this browser.
 *
 * The game keeps the run in memory and writes it down as it changes, so closing
 * the tab is no longer the end of it: the menu greets the astronaut by name and
 * offers CONTINUE (D-081, which supersedes D-003 for device-local saves only —
 * Supabase is still deferred, and this is not an account, it is one tab's
 * progress on one machine).
 *
 * Two halves, deliberately:
 *   `sim/save.ts`      what a run looks like written down. Pure, versioned, and
 *                      covered by tests without a browser.
 *   this file          where it is written, and where CONTINUE sends the
 *                      player. The only part that knows storage exists.
 *
 * Same shape as the training record in `ui/training.ts` (D-075): one versioned
 * key, every read wrapped, and a browser that refuses storage costing the
 * player nothing but the ability to come back later.
 */

import { hasReachedOutpost, type RunState } from '../sim/run';
import { decodeRun, encodeRun, SAVE_VERSION } from '../sim/save';

import { ROUTE_ORDER, type Route } from './routes';

/**
 * Where the run is written.
 *
 * The `.v1` is the same convention as the training key: a format change gets a
 * new key rather than trying to migrate text that was never designed to last.
 */
const STORAGE_KEY = 'mars-horizon.save.v1';

/** A run, and the screen the player left it on. */
export interface SavedGame {
  readonly run: RunState;
  readonly screen: Route;
}

/* ------------------------------------------------------------------ storage -- */

/** The browser's storage, if it has any and it will let us near it. */
function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * The run on this device, or null when there is none to offer.
 *
 * Null covers every way there is to have nothing: no save yet, storage blocked
 * by the browser, text that is not JSON, a format from another build, and a run
 * too broken to resume. All of them mean the same thing to the player — there
 * is no CONTINUE — so the caller does not have to tell them apart.
 *
 * A bad entry is left where it is rather than deleted. Ignoring it costs
 * nothing, and deleting it would throw away a save written by a newer build
 * that this tab happens to be running from cache.
 */
export function readSave(): SavedGame | null {
  try {
    const raw = store()?.getItem(STORAGE_KEY);

    if (raw === null || raw === undefined) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed !== 'object' || parsed === null) return null;

    const envelope = parsed as { version?: unknown; screen?: unknown; run?: unknown };

    if (envelope.version !== SAVE_VERSION) return null;

    const run = decodeRun(envelope.run);

    if (run === null) return null;

    const screen = ROUTE_ORDER.find((route) => route === envelope.screen);

    if (screen === undefined) return null;

    return { run, screen };
  } catch {
    return null;
  }
}

/**
 * Write the run down.
 *
 * Only a journey stop is worth resuming on: the menu and the reference book are
 * places you pass through, not places you were. Saving from either would leave
 * CONTINUE pointing at the menu that is offering it. `main.ts` calls this after
 * every change and every move, so the last screen the player saw is the one
 * they come back to.
 *
 * Failure is silent on purpose. Storage can be full, or denied in a private
 * window, and a run that cannot be written is still a run: the game plays
 * exactly as it did before there was a save at all.
 */
export function writeSave(run: RunState, screen: Route): void {
  if (!isSaveableScreen(screen)) return;

  try {
    store()?.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, screen, run: encodeRun(run) }));
  } catch {
    /* Nothing to do: the run in memory is unaffected. */
  }
}

/** Forget the saved run. START OVER, and going back to a blank menu. */
export function clearSave(): void {
  try {
    store()?.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
}

/* -------------------------------------------------------------------- resume -- */

/**
 * Is this a screen a player can be sent back to?
 *
 * Every stop in the journey except the menu itself. `landing` (the
 * under-construction interstitial) and `encyclopedia` are not stops, and a run
 * resumed onto either of them would look like it had been lost.
 */
export function isSaveableScreen(route: Route): boolean {
  return route !== 'naming' && ROUTE_ORDER.includes(route);
}

/**
 * Where CONTINUE goes.
 *
 * The screen they left, because that is what "continue" means: a child who
 * closed the tab in the middle of the day's work orders comes back to the day's
 * work orders, not to the start of the sol. The fallbacks are for a save whose
 * screen is no longer one a run can resume on — an old format, or a screen that
 * has since been retired — and they go to the honest place for the run's state
 * rather than guessing: the report if the mission is over, the desk if there is
 * an outpost, the briefing if there is not.
 */
export function resumeScreen(save: SavedGame): Route {
  if (isSaveableScreen(save.screen)) return save.screen;

  if (save.run.status !== 'active') return 'debrief';

  return hasReachedOutpost(save.run) ? 'act' : 'briefing';
}
