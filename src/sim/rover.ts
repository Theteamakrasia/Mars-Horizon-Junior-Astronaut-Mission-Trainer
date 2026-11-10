/**
 * The rover: a robot you send out to look for lost history and rare rocks.
 *
 * Pure rules only. No DOM, no timers, no network (R-1). The rover button in
 * `ui/` owns the clock and the windows; this file owns what is allowed to
 * happen: a rover that is at base cannot find anything, a find waits until the
 * player has answered it, and nothing is ever found twice.
 *
 * Randomness comes in as a number from 0 to 1 (`pick`), never from
 * `Math.random()`, so every rule here can be asserted on exactly.
 *
 * Nothing here touches the resource stores: the rover is an explorer's extra,
 * not a way to win or lose a run (R-20).
 */

/** A lost craft or landing site worth reading about, or a rock worth keeping. */
export type FindKind = 'site' | 'material';

/** One thing the rover can come across. Every field is shown to the player. */
export interface RoverFind {
  /** Stable key, e.g. `viking-1`. Used so nothing is found twice. */
  readonly id: string;
  readonly kind: FindKind;
  readonly title: string;
  /** Where on Mars, in plain words. */
  readonly where: string;
  /** When it happened or was found, e.g. `1976`. */
  readonly when: string;
  /** What the picture shows, for a screen reader. */
  readonly alt: string;
  /** Two or three short sentences telling its story. */
  readonly story: string;
  /** The one surprising fact. */
  readonly fact: string;
  /** NASA's credit line for the picture. */
  readonly credit: string;
  /** The picture itself, on NASA's Photojournal. */
  readonly imageUrl: string;
  /** The picture's page on NASA's Photojournal. */
  readonly sourceUrl: string;
}

/** At base, or out exploring. */
export type RoverPhase = 'stowed' | 'exploring';

/** Everything the rover has done this run. */
export interface RoverState {
  readonly phase: RoverPhase;
  /** A find the player has not answered yet. While set, the rover finds nothing new. */
  readonly pending: RoverFind | null;
  /** Every id the rover has ever turned up, answered or not. Stops repeats. */
  readonly found: readonly string[];
  /** Sites the player has read about and logged. */
  readonly visited: readonly string[];
  /** Materials the player chose to collect. */
  readonly collected: readonly string[];
  /** Materials the player chose to leave where they lie. */
  readonly left: readonly string[];
}

/** Wait before the first find after a deploy, in ms: 15 to 25 seconds. */
export const FIRST_FIND_MIN_MS = 15_000;
export const FIRST_FIND_SPREAD_MS = 10_000;
/** Wait before every later find, in ms: 35 to 65 seconds. */
export const NEXT_FIND_MIN_MS = 35_000;
export const NEXT_FIND_SPREAD_MS = 30_000;

/** A rover that has not been sent out yet. */
export function newRover(): RoverState {
  return { phase: 'stowed', pending: null, found: [], visited: [], collected: [], left: [] };
}

/** Send the rover out. Already out is a no-op. */
export function deployRover(state: RoverState): RoverState {
  return state.phase === 'exploring' ? state : { ...state, phase: 'exploring' };
}

/**
 * Bring the rover home. Whatever it has already found stays found.
 *
 * A find that has not been answered holds the rover out: it is still driving
 * towards it. Recalling it then would leave a find waiting that the player
 * can never open, because a rover at base shows the deploy question first.
 */
export function recallRover(state: RoverState): RoverState {
  if (state.phase === 'stowed' || state.pending !== null) return state;

  return { ...state, phase: 'stowed' };
}

/** The finds the rover has not turned up yet, in catalogue order. */
export function remainingFinds(state: RoverState, catalogue: readonly RoverFind[]): readonly RoverFind[] {
  return catalogue.filter((find) => !state.found.includes(find.id));
}

/** True when the rover is out, has nothing waiting, and there is still something left to find. */
export function canDiscover(state: RoverState, catalogue: readonly RoverFind[]): boolean {
  return state.phase === 'exploring' && state.pending === null && remainingFinds(state, catalogue).length > 0;
}

/**
 * The rover comes across something new.
 *
 * `pick` is 0 up to (not including) 1 and chooses among what is left. Returns
 * the state unchanged when the rover is at base, a find is already waiting, or
 * everything has been found.
 */
export function discover(state: RoverState, catalogue: readonly RoverFind[], pick: number): RoverState {
  if (!canDiscover(state, catalogue)) return state;

  const left = remainingFinds(state, catalogue);
  const index = Math.min(left.length - 1, Math.max(0, Math.floor(pick * left.length)));
  const find = left[index];

  if (find === undefined) return state;

  return { ...state, pending: find, found: [...state.found, find.id] };
}

/** The player has read about a historic site. It goes in the log and the find clears. */
export function logSite(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'site') return state;

  return { ...state, pending: null, visited: [...state.visited, find.id] };
}

/** The player took the material. It goes in the collection and the find clears. */
export function collectMaterial(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'material') return state;

  return { ...state, pending: null, collected: [...state.collected, find.id] };
}

/** The player chose to let the material be. It stays on Mars and the find clears. */
export function leaveMaterial(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'material') return state;

  return { ...state, pending: null, left: [...state.left, find.id] };
}

/**
 * How long until the rover's next find, in ms.
 *
 * The first find comes quickly so a new player sees the rover do something;
 * later ones are further apart so it never feels like a slot machine.
 */
export function nextFindDelayMs(foundSoFar: number, pick: number): number {
  const clamped = Math.min(1, Math.max(0, pick));

  return foundSoFar === 0
    ? Math.round(FIRST_FIND_MIN_MS + clamped * FIRST_FIND_SPREAD_MS)
    : Math.round(NEXT_FIND_MIN_MS + clamped * NEXT_FIND_SPREAD_MS);
}
