/**
 * RunState is the only thing shared between screens. `main.ts` owns it and passes
 * it down; features must never import each other to get it (`npm run check`
 * fails that as `cross-feature`).
 *
 * There is no persistence in this project, so a RunState lives only as long as
 * the page does. Supabase is deferred — see decision D-003.
 */

import type { ForecastEvent } from './forecast';
import { type ModuleKind, systemsFor } from './modules';
import { newRover, collectMaterial, leaveMaterial, logSite, FIND_SCIENCE, type FindAnswer, type RoverState } from './rover';
import { createInitialStores, type ResourceStores } from './resources';

/** A run is active, or ended one way or the other. No third state. */
export type RunStatus = 'active' | 'lost' | 'won';

/**
 * Something that happened on a sol, shown in the timeline.
 *
 * `approximate` is required rather than optional on purpose: the README promises
 * the player is told when a number is an estimate. Making it impossible to omit
 * is cheaper than remembering to.
 */
export interface SolEvent {
  readonly sol: number;
  readonly kind: 'storm' | 'supply-pod' | 'mission' | 'anomaly' | 'flare';
  readonly summary: string;
  readonly approximate: boolean;
}

/** A choice the player made in a crisis. */
export interface DecisionRecord {
  readonly sol: number;
  readonly crisisId: string;
  readonly optionId: string;
  /** True when the countdown ran out and the default was applied. */
  readonly timedOut: boolean;
}

/**
 * What the crew spent a sol on.
 *
 * The id, the title and the points are copied onto the record rather than
 * looked up later, so the debrief can name the activity without needing the
 * catalogue — and so a record still reads correctly if the catalogue changes.
 */
export interface SolActivity {
  readonly id: string;
  readonly title: string;
  /** The science points the activity earned. */
  readonly science: number;
}

/** What one sol did, kept so the debrief can reason over the whole run. */
export interface SolRecord {
  readonly sol: number;
  /** Stores at the end of the sol, after clamping. */
  readonly stores: ResourceStores;
  /** The unclamped change this sol: where each store was heading. */
  readonly net: ResourceStores;
  readonly powerGenerated: number;
  readonly powerUsed: number;
  /** Power the panels made that had nowhere to go because the batteries were full. */
  readonly powerWasted: number;
  /** 0-1: the share of the sol's power demand that could not be met. */
  readonly blackout: number;
  /** 0-1: how clean the panels were at the end of the sol. Dust only ever goes down. */
  readonly panelHealth: number;
  readonly greenhousePaused: boolean;
  /** What the crew breathed, drank and ate this sol. */
  readonly used: { readonly oxygen: number; readonly water: number; readonly food: number };
  /** The main activity for this sol, or null when the sol was spent on a crisis. */
  readonly activity: SolActivity | null;
  readonly events: readonly SolEvent[];
  /** Plain-language things worth knowing about this sol. */
  readonly notes: readonly string[];
}

/** Everything a screen needs, and nothing it does not. */
export interface RunState {
  readonly sol: number;
  /** Set by `landing-site`. Empty until then. */
  readonly regionId: string;
  /** Set by `naming`. In memory only, so a refresh loses it (D-003). */
  readonly astronautName: string;
  readonly stores: ResourceStores;
  readonly status: RunStatus;
  /** Set by `base`: every module on the surface, core ones included. */
  readonly modules: readonly ModuleKind[];
  /** 0-1: how much of the panels' output survives. Dust damage lowers it for good. */
  readonly panelHealth: number;
  /** Science points earned so far. Activities award them (D-051). */
  readonly science: number;
  /** The activity picked for the next sol, or null when none has been picked. */
  readonly chosenActivity: string | null;
  /**
   * What the rover has been up to.
   *
   * The rover is part of the run, not a window floating over it: it is sent out
   * by a work order like any other, it moves on sol time, and it comes back
   * with a document on the desk.
   */
  readonly rover: RoverState;
  readonly forecast: readonly ForecastEvent[];
  readonly log: readonly SolRecord[];
  readonly decisions: readonly DecisionRecord[];
}

/**
 * Begin a run. Called once, from `naming`.
 *
 * Sol starts at 0, meaning "arrived, nothing done yet", so the first advance is
 * sol 1.
 */
export function newRun(regionId: string, astronautName = ''): RunState {
  return {
    sol: 0,
    regionId,
    astronautName,
    stores: createInitialStores(),
    status: 'active',
    modules: [],
    panelHealth: 1,
    science: 0,
    chosenActivity: null,
    rover: newRover(),
    forecast: [],
    log: [],
    decisions: [],
  };
}

/**
 * Land at a chosen region: keep the astronaut's name, start the run fresh.
 *
 * Called by `landing-site` when the player presses LAND HERE. `base` then builds
 * the modules and calls `startOutpost`; this only records where we came down.
 */
export function landAt(state: RunState, regionId: string): RunState {
  return newRun(regionId, state.astronautName);
}

/**
 * Answer the find the rover brought back.
 *
 * The choice is the stamp: a historic site is logged, a rock is collected or
 * left where it lies. Every answer is worth the same science, because the
 * rover teaches and the score is for the work rather than for the button
 * pressed.
 */
export function answerRoverFind(state: RunState, answer: FindAnswer): RunState {
  const find = state.rover.pending;

  if (find === null) return state;

  const rover =
    answer === 'log'
      ? logSite(state.rover)
      : answer === 'collect'
        ? collectMaterial(state.rover)
        : leaveMaterial(state.rover);

  /* The wrong answer for the wrong kind changes nothing, and so earns
     nothing: a rock cannot be logged and a site cannot be collected. */
  if (rover === state.rover) return state;

  return { ...state, rover, science: state.science + FIND_SCIENCE };
}

/**
 * Replace some fields, returning new state.
 *
 * Shallow rather than a merge helper: stores and sol change one at a time, and a
 * general merge hides which field a caller thought it was changing.
 */
export function withState(state: RunState, change: Partial<RunState>): RunState {
  return { ...state, ...change };
}

/**
 * Land the outpost: set the modules and start with full batteries and the
 * shielding those modules give. Resets anything a previous attempt left behind.
 */
export function startOutpost(state: RunState, modules: readonly ModuleKind[]): RunState {
  const systems = systemsFor(modules, state.regionId);

  return {
    ...state,
    sol: 0,
    status: 'active',
    modules,
    panelHealth: 1,
    science: 0,
    chosenActivity: null,
    rover: newRover(),
    log: [],
    decisions: [],
    stores: createInitialStores({
      power: systems.batteryKwh,
      shielding: systems.shieldingStart,
    }),
  };
}
