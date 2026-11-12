/**
 * Writing a run down, and picking it back up.
 *
 * Pure: no DOM, no storage, no `Math.random` (R-1). The browser's storage is
 * `ui/save.ts`'s business; this file only turns a `RunState` into something
 * JSON can hold and back again, so the whole of the save format is testable
 * without a browser.
 *
 * The format is **versioned**. `SAVE_VERSION` is bumped whenever `RunState`
 * changes shape in a way this decoder cannot repair, and a save carrying a
 * different version is ignored rather than half-read: a run resumed with a
 * field missing is worse than no run at all.
 *
 * Decoding is deliberately forgiving of everything except the spine. A save is
 * a child's progress, not a security boundary, so a field that does not
 * validate is replaced with the value a fresh run would have rather than
 * throwing the whole run away — a lost rover find is a shrug, a lost run is a
 * lost afternoon. What is *not* forgiven is the sol, the stores and the status:
 * a run without those is not a run, and the caller is told so by `null`.
 *
 * See D-081, which supersedes D-003 for device-local saves only. Supabase is
 * still deferred.
 */

import type { ForecastEvent, ForecastKind } from './forecast';
import { MODULE_CATALOGUE, type ModuleKind } from './modules';
import { STORE_CAPACITY, type ResourceStores } from './resources';
import type { RoverFind, RoverState } from './rover';
import {
  newRun,
  type DecisionRecord,
  type Inspection,
  type RunState,
  type RunStatus,
  type SolActivity,
  type SolEvent,
  type SolRecord,
} from './run';
import {
  emptyTraining,
  TRAINING_GAMES,
  type TrainingCompletion,
  type TrainingPerformance,
  type TrainingState,
} from './training';

/**
 * The shape of a written run.
 *
 * Bump this when `RunState` gains, loses or renames a field **and** the change
 * cannot be absorbed by the decoders below. An old save is then ignored, which
 * is the honest outcome: the player starts again rather than resuming into a
 * run the code no longer understands.
 */
export const SAVE_VERSION = 1;

/* ------------------------------------------------------------------ shapes -- */

/** A decoded object, before any of its fields have been trusted. */
type Plain = Record<string, unknown>;

const MODULE_KINDS: ReadonlySet<string> = new Set(MODULE_CATALOGUE.map((spec) => spec.kind));
const TRAINING_IDS: ReadonlySet<string> = new Set(TRAINING_GAMES.map((game) => game.id));

const EVENT_KINDS: readonly SolEvent['kind'][] = ['storm', 'supply-pod', 'mission', 'anomaly', 'flare'];
const FORECAST_KINDS: readonly ForecastKind[] = ['flare', 'supply-pod', 'storm'];
const FIND_KINDS: readonly RoverFind['kind'][] = ['site', 'material'];
const PERFORMANCES: readonly TrainingPerformance[] = ['basic', 'good', 'excellent'];

/* ----------------------------------------------------------------- helpers -- */

function plain(value: unknown): Plain | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Plain) : null;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function flag(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/** A count: a whole number, never negative. */
function whole(value: unknown): number | null {
  const number = finite(value);
  return number === null || number < 0 ? null : Math.round(number);
}

/** A measurement, pulled back inside the range it is allowed to occupy. */
function between(value: unknown, min: number, max: number): number | null {
  const number = finite(value);
  return number === null ? null : Math.min(max, Math.max(min, number));
}

/** A quantity that may not go below `min`, with no upper bound. */
function atLeast(value: unknown, min = 0): number | null {
  const number = finite(value);
  return number === null || number < min ? null : number;
}

/** Keep every entry that decodes; drop the rest. Never returns null. */
function list<T>(value: unknown, decode: (entry: unknown) => T | null): readonly T[] {
  if (!Array.isArray(value)) return [];

  const kept: T[] = [];

  for (const entry of value) {
    const decoded = decode(entry);

    if (decoded !== null) kept.push(decoded);
  }

  return kept;
}

/** One of a fixed set of words, or null. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

/* ---------------------------------------------------------------- decoding -- */

/**
 * The five stores.
 *
 * `allowNegative` is for a sol record's `net` and `consumed`, which are
 * differences rather than levels: a store can fall by more than it ever held.
 */
function decodeFive(value: unknown, allowNegative = false): ResourceStores | null {
  const raw = plain(value);

  if (raw === null) return null;

  const read = (entry: unknown, cap: number): number | null => {
    const number = finite(entry);

    if (number === null) return null;

    return allowNegative ? number : Math.min(cap, Math.max(0, number));
  };

  // Power has no fixed tank: its ceiling is how many batteries were built.
  const power = read(raw.power, Number.POSITIVE_INFINITY);
  const oxygen = read(raw.oxygen, STORE_CAPACITY);
  const water = read(raw.water, STORE_CAPACITY);
  const food = read(raw.food, STORE_CAPACITY);
  const shielding = read(raw.shielding, STORE_CAPACITY);

  if (power === null || oxygen === null || water === null || food === null || shielding === null) return null;

  return { power, oxygen, water, food, shielding };
}

function decodeStatus(value: unknown): RunStatus | null {
  return oneOf<RunStatus>(value, ['active', 'lost', 'won']);
}

/**
 * The modules on the surface.
 *
 * A kind this build does not know is dropped rather than failing the run. The
 * outpost is then smaller than it was, which is worse than nothing only if the
 * player does not notice — and the build screen names every module it holds, so
 * they will.
 */
function decodeModules(value: unknown): readonly ModuleKind[] | null {
  if (!Array.isArray(value)) return null;

  const kept: ModuleKind[] = [];

  for (const entry of value) {
    if (typeof entry === 'string' && MODULE_KINDS.has(entry)) kept.push(entry as ModuleKind);
  }

  return kept;
}

function decodeActivity(value: unknown): SolActivity | null {
  const raw = plain(value);

  if (raw === null) return null;

  const id = text(raw.id);
  const title = text(raw.title);
  const science = atLeast(raw.science);

  if (id === null || title === null || science === null) return null;

  return { id, title, science };
}

function decodeUsed(value: unknown): SolRecord['used'] | null {
  const raw = plain(value);

  if (raw === null) return null;

  const oxygen = atLeast(raw.oxygen);
  const water = atLeast(raw.water);
  const food = atLeast(raw.food);

  if (oxygen === null || water === null || food === null) return null;

  return { oxygen, water, food };
}

function decodeSolEvent(value: unknown): SolEvent | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const kind = oneOf(raw.kind, EVENT_KINDS);
  const summary = text(raw.summary);
  const approximate = flag(raw.approximate);

  if (sol === null || kind === null || summary === null || approximate === null) return null;

  return { sol, kind, summary, approximate };
}

function decodeRecord(value: unknown): SolRecord | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const stores = decodeFive(raw.stores);
  const net = decodeFive(raw.net, true);
  const powerGenerated = atLeast(raw.powerGenerated);
  const powerUsed = atLeast(raw.powerUsed);
  const powerWasted = atLeast(raw.powerWasted);
  /* The night and the day's work are newer than the save format. A save
     written before them is still a run, so they read as zero rather than
     refusing the whole record (ISS-084). */
  const powerNight = atLeast(raw.powerNight) ?? 0;
  const powerExtra = atLeast(raw.powerExtra) ?? 0;
  const blackout = between(raw.blackout, 0, 1);
  const panelHealth = between(raw.panelHealth, 0, 1);
  const greenhousePaused = flag(raw.greenhousePaused);
  const produced = decodeFive(raw.produced);
  const consumed = decodeFive(raw.consumed);
  const used = decodeUsed(raw.used);

  if (
    sol === null ||
    stores === null ||
    net === null ||
    powerGenerated === null ||
    powerUsed === null ||
    powerWasted === null ||
    blackout === null ||
    panelHealth === null ||
    greenhousePaused === null ||
    produced === null ||
    consumed === null ||
    used === null
  ) {
    return null;
  }

  /* A sol with no activity and a sol whose activity line is unreadable decode
     the same way. The debrief says "a quiet sol" either way, which is true of
     the record it now holds. */
  return {
    sol,
    stores,
    net,
    powerGenerated,
    powerUsed,
    powerWasted,
    powerNight,
    powerExtra,
    blackout,
    panelHealth,
    greenhousePaused,
    produced,
    consumed,
    used,
    activity: decodeActivity(raw.activity),
    events: list(raw.events, decodeSolEvent),
    notes: list(raw.notes, text),
  };
}

function decodeForecast(value: unknown): ForecastEvent | null {
  const raw = plain(value);

  if (raw === null) return null;

  const id = text(raw.id);
  const sol = whole(raw.sol);
  const kind = oneOf(raw.kind, FORECAST_KINDS);
  const durationSols = whole(raw.durationSols);
  const intensity = whole(raw.intensity);
  const summary = text(raw.summary);
  const approximate = flag(raw.approximate);

  if (
    id === null ||
    sol === null ||
    kind === null ||
    durationSols === null ||
    durationSols < 1 ||
    intensity === null ||
    summary === null ||
    approximate === null
  ) {
    return null;
  }

  return { id, sol, kind, durationSols, intensity, summary, approximate };
}

function decodeInspection(value: unknown): Inspection | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const activityId = text(raw.activityId);
  const stars = whole(raw.stars);

  if (sol === null || activityId === null || stars === null) return null;

  return { sol, activityId, stars: Math.min(3, stars) };
}

function decodeDecision(value: unknown): DecisionRecord | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const crisisId = text(raw.crisisId);
  const optionId = text(raw.optionId);
  const timedOut = flag(raw.timedOut);

  if (sol === null || crisisId === null || optionId === null || timedOut === null) return null;

  return { sol, crisisId, optionId, timedOut };
}

/**
 * The thing the rover found.
 *
 * All eleven fields are shown to the player, so a find missing one of them
 * cannot be drawn. A broken find is dropped and the rover simply has nothing
 * waiting — the alternative is a document on the desk with a hole in it.
 */
function decodeFind(value: unknown): RoverFind | null {
  const raw = plain(value);

  if (raw === null) return null;

  const kind = oneOf(raw.kind, FIND_KINDS);

  if (kind === null) return null;

  const id = text(raw.id);
  const title = text(raw.title);
  const where = text(raw.where);
  const when = text(raw.when);
  const alt = text(raw.alt);
  const story = text(raw.story);
  const fact = text(raw.fact);
  const credit = text(raw.credit);
  const imageUrl = text(raw.imageUrl);
  const sourceUrl = text(raw.sourceUrl);

  if (
    id === null ||
    title === null ||
    where === null ||
    when === null ||
    alt === null ||
    story === null ||
    fact === null ||
    credit === null ||
    imageUrl === null ||
    sourceUrl === null
  ) {
    return null;
  }

  return { id, kind, title, where, when, alt, story, fact, credit, imageUrl, sourceUrl };
}

function decodeRover(value: unknown): RoverState | null {
  const raw = plain(value);

  if (raw === null) return null;

  const phase: RoverState['phase'] = raw.phase === 'exploring' ? 'exploring' : 'stowed';
  const returnsOn = raw.returnsOn === null || raw.returnsOn === undefined ? null : whole(raw.returnsOn);

  return {
    phase,
    returnsOn,
    pending: decodeFind(raw.pending),
    found: list(raw.found, text),
    visited: list(raw.visited, text),
    collected: list(raw.collected, text),
    left: list(raw.left, text),
  };
}

function decodeCompletion(value: unknown): TrainingCompletion | null {
  const raw = plain(value);

  if (raw === null) return null;

  const gameId = text(raw.gameId);
  const points = atLeast(raw.points);
  const performance = oneOf(raw.performance, PERFORMANCES);

  if (gameId === null || !TRAINING_IDS.has(gameId) || points === null || performance === null) return null;

  return { gameId: gameId as TrainingCompletion['gameId'], points, performance };
}

function decodeTraining(value: unknown): TrainingState | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const pointsToday = atLeast(raw.pointsToday);

  if (sol === null || pointsToday === null) return null;

  return { sol, completed: list(raw.completed, decodeCompletion), pointsToday };
}

/* ------------------------------------------------------------------- entry -- */

/**
 * A run, as something `JSON.stringify` can carry.
 *
 * `RunState` is plain data already, so the round trip is the guarantee rather
 * than the transformation: it proves that what is about to be written holds no
 * function, no cycle and no `undefined` that the storage layer would silently
 * drop. A copy also means a later `withState` cannot reach back into text that
 * was already written.
 */
export function encodeRun(run: RunState): unknown {
  return JSON.parse(JSON.stringify(run)) as unknown;
}

/**
 * Read a written run back, or null when it is not one.
 *
 * Everything beyond the spine is repaired rather than refused — see the
 * comment at the top of the file for why that trade is the right way round.
 */
export function decodeRun(value: unknown): RunState | null {
  const raw = plain(value);

  if (raw === null) return null;

  const sol = whole(raw.sol);
  const regionId = text(raw.regionId);
  const astronautName = text(raw.astronautName);
  const stores = decodeFive(raw.stores);
  const status = decodeStatus(raw.status);
  const modules = decodeModules(raw.modules);
  const panelHealth = between(raw.panelHealth, 0, 1);
  const science = atLeast(raw.science);

  if (
    sol === null ||
    regionId === null ||
    astronautName === null ||
    stores === null ||
    status === null ||
    modules === null ||
    panelHealth === null ||
    science === null
  ) {
    return null;
  }

  // A fresh run is the baseline every repaired field is taken from, so a save
  // written before a field existed still resumes with something sane in it.
  const fresh = newRun(regionId, astronautName);

  return {
    ...fresh,
    sol,
    stores,
    status,
    modules,
    panelHealth,
    science,
    chosenActivity: text(raw.chosenActivity),
    inspections: list(raw.inspections, decodeInspection),
    rover: decodeRover(raw.rover) ?? fresh.rover,
    forecast: list(raw.forecast, decodeForecast),
    log: list(raw.log, decodeRecord),
    decisions: list(raw.decisions, decodeDecision),
    /* The day's training belongs to one sol, and `RunState` keeps it as sol + 1
       (see `newRun`), so a record that cannot be read starts *this* day again
       rather than an old one — otherwise the two-game rule would see a stale day
       and unlock the work orders it was supposed to lock. */
    training: decodeTraining(raw.training) ?? emptyTraining(sol + 1),
  };
}
