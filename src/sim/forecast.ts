/**
 * What is coming, and when.
 *
 * Nothing about a mission's hazards is fixed. Each run rolls its own: whether
 * there is a dust storm, how many flares there are, how big each one is, and
 * which sol every event lands on. The rolls are modelled on real data:
 *
 *   flares   arrive in bursts, because one active sunspot region keeps firing for
 *            days. Their sizes are drawn from the flares NASA actually recorded
 *            (handed in by the screen that fetched them). When there is no live
 *            data, they are drawn from the long-run NOAA record instead.
 *   storms   a landing site with more dust is hit more often. Most Martian storms
 *            are small and fade in days, which is why ours lasts two sols.
 *   cargo    is scheduled long in advance, so it is the one event with no surprise.
 *
 * The player is warned about each kind as far ahead as the real thing allows
 * (see `visibleForecast`). Only one event is ever active at a time.
 *
 * Pure and deterministic: the same seed always produces the same timetable, and
 * nothing here calls Math.random.
 */

import { NEUTRAL_SCORE } from './regions';

export type ForecastKind = 'flare' | 'supply-pod' | 'storm';

export interface ForecastEvent {
  /** Also the id of the crisis the player decides on, e.g. `storm-7`. */
  readonly id: string;
  /** The sol the event begins on. */
  readonly sol: number;
  readonly kind: ForecastKind;
  /** How many sols it lasts. 1 for everything but a dust storm. */
  readonly durationSols: number;
  /** 1 (small) to 3 (huge) for a flare; 0 for the others. */
  readonly intensity: number;
  /** One line a child can read. */
  readonly summary: string;
  /** True when the size came from fallback data rather than a live NASA reading. */
  readonly approximate: boolean;
}

/** A real flare, as the screen hands it over. */
export interface FlareInput {
  /** NASA's flare class, e.g. `M4.2` or `X5.8`. */
  readonly classType: string;
  readonly approximate: boolean;
  /** How the summary refers to it, e.g. `on 11 May 2024`. */
  readonly when: string;
}

/**
 * Earliest sol an event may begin on: one calm sol after landing, so the player
 * always gets to see the outpost running before the first thing goes wrong.
 */
export const FIRST_EVENT_SOL = 2;

/**
 * Latest sol an event may begin on: two sols before the win at sol 12, so every
 * event still has consequences... and so an event cannot land on the finish line.
 */
export const LAST_EVENT_SOL = 10;

/** A dust storm covers the panels for two sols in a row. */
export const STORM_DURATION_SOLS = 2;

/**
 * The seed used when nobody supplies one. A screen passes a real seed; a test or
 * a scripted demo leaves it out and gets the same mission every time. This seed
 * gives a timetable with a storm, a supply pod and several flares, so a demo
 * shows every kind of decision.
 */
export const DEFAULT_SEED = 6;

/** A mission never has more flares than this. */
export const MAX_FLARES = 4;

/** Every mission has at least this many decisions, or there would be nothing to play. */
export const MIN_EVENTS = 2;

/** Chance that a supply pod is scheduled. A quiet mission always gets one. */
export const POD_CHANCE = 0.6;

/**
 * Chance of a flare on any one sol when the Sun has been quiet. Chosen so a
 * mission faces about two flares: the real Sun makes far more, but most are C
 * class and too weak to threaten a shielded crew.
 */
export const FLARE_CHANCE_QUIET = 0.2;

/**
 * Chance of a flare on the sol right after one. Flares come in bursts: the NOAA
 * flare catalogue shows a few very active sunspot regions producing most of the
 * big ones, so one flare makes another more likely.
 */
export const FLARE_CHANCE_AFTER_FLARE = 0.45;

/**
 * How many M and X class flares are in the NOAA flare catalogue from 1975 to 2012
 * (3,791 M and 345 X). When no live NASA data is available this is the mix used,
 * so about one big flare in twelve is an X.
 */
export const REAL_FLARE_COUNTS = { M: 3791, X: 345 } as const;

/**
 * How many sols ahead the crew can see each kind of event coming.
 *
 *   flare   its X-rays reach Mars at the speed of light, so there is almost no
 *           warning: the crew only hears about it the sol before.
 *   storm   orbiters watch dust build for several days first.
 *   pod     cargo is booked months ahead, so it is always on the schedule.
 */
export const WARNING_SOLS: Readonly<Record<ForecastKind, number>> = {
  flare: 1,
  storm: 3,
  'supply-pod': LAST_EVENT_SOL,
};

/**
 * A small seeded random generator.
 *
 * A seed in, the same numbers out, forever. That is what lets every run have a
 * different timetable while the tests stay assertable: pin the seed, get one
 * exact schedule.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function nextRandom(): number {
    state = (state + 0x6d2b79f5) >>> 0;

    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole sol number from `first` to `last`, both included. */
export function randomSolBetween(random: () => number, first: number, last: number): number {
  return first + Math.floor(random() * (last - first + 1));
}

/**
 * How likely a dust storm is at a site. Dust score 5 is the safest site and 1 the
 * dustiest, so a calm site is hit about one run in three and a dusty one about
 * two in three.
 */
export function stormChance(dustScore: number): number {
  return Math.min(0.9, Math.max(0.1, 0.55 + 0.1 * (3 - dustScore)));
}

/** Where this run's events begin. A storm or a pod may not happen at all. */
export interface EventPlan {
  readonly stormSol: number | null;
  readonly podSol: number | null;
  readonly flareSols: readonly number[];
}

/**
 * Decide what happens, and on which sol.
 *
 * One event at a time is the rule that shapes everything: no two events share a
 * sol, and nothing begins while a storm is still over the panels. The storm is
 * placed first because it takes two sols in a row; flares then walk the run sol
 * by sol; the pod takes whatever sol is left.
 */
export function planEvents(random: () => number, dustScore: number = NEUTRAL_SCORE.dust): EventPlan {
  const taken = new Set<number>();
  let stormSol: number | null = null;

  if (random() < stormChance(dustScore)) {
    stormSol = randomSolBetween(random, FIRST_EVENT_SOL, LAST_EVENT_SOL - STORM_DURATION_SOLS + 1);

    for (let offset = 0; offset < STORM_DURATION_SOLS; offset += 1) taken.add(stormSol + offset);
  }

  const flareSols: number[] = [];
  let flaredYesterday = false;

  for (let sol = FIRST_EVENT_SOL; sol <= LAST_EVENT_SOL; sol += 1) {
    if (taken.has(sol)) {
      flaredYesterday = false;
      continue;
    }

    const chance: number = flaredYesterday ? FLARE_CHANCE_AFTER_FLARE : FLARE_CHANCE_QUIET;

    flaredYesterday = flareSols.length < MAX_FLARES && random() < chance;

    if (flaredYesterday) {
      flareSols.push(sol);
      taken.add(sol);
    }
  }

  // Every mission faces at least one flare: radiation is the lesson of the game.
  if (flareSols.length === 0) {
    const sol = pickFreeSol(taken, random);

    flareSols.push(sol);
    taken.add(sol);
  }

  // A quiet mission gets its cargo pod whatever the dice say.
  const eventCount = flareSols.length + (stormSol === null ? 0 : 1);
  const podSol = random() < POD_CHANCE || eventCount < MIN_EVENTS ? pickFreeSol(taken, random) : null;

  return { stormSol, podSol, flareSols };
}

/** A random sol that nothing has claimed yet. There are always some: at most seven of nine are used. */
function pickFreeSol(taken: ReadonlySet<number>, random: () => number): number {
  const free: number[] = [];

  for (let sol = FIRST_EVENT_SOL; sol <= LAST_EVENT_SOL; sol += 1) {
    if (!taken.has(sol)) free.push(sol);
  }

  return free[Math.floor(random() * free.length)];
}

/**
 * Flare class to game intensity. NASA classes run A, B, C, M, X — each letter ten
 * times stronger than the one before. C and below are minor, M can disturb radio
 * and add radiation, X is the biggest.
 */
export function flareIntensity(classType: string): 1 | 2 | 3 {
  const letter = classType.trim().charAt(0).toUpperCase();

  if (letter === 'X') return 3;
  if (letter === 'M') return 2;

  return 1;
}

/**
 * A flare drawn from the long-run record, for when NASA's live data is missing.
 *
 * The class follows the real M-to-X ratio. The number after it leans small, as
 * real flares do: most are M1 to M3, very few are M9.
 */
function typicalFlare(random: () => number): FlareInput {
  const total = REAL_FLARE_COUNTS.M + REAL_FLARE_COUNTS.X;
  const letter = random() * total < REAL_FLARE_COUNTS.X ? 'X' : 'M';
  const strength = 1 + Math.floor(random() * random() * 90) / 10;

  return { classType: `${letter}${strength.toFixed(1)}`, approximate: true, when: 'a typical flare' };
}

/** One flare event, sized by its real class and placed on its chosen sol. */
function makeFlareEvent(input: FlareInput, sol: number): ForecastEvent {
  const summary = input.approximate
    ? `A ${input.classType} solar flare is on its way. This is a typical flare, not today's reading.`
    : `A ${input.classType} solar flare is on its way, like the one NASA recorded ${input.when}.`;

  return {
    id: `flare-${sol}`,
    sol,
    kind: 'flare',
    durationSols: 1,
    intensity: flareIntensity(input.classType),
    summary,
    approximate: input.approximate,
  };
}

/**
 * Build the run's forecast.
 *
 * `flares` is the pool of real flares to draw from: only M and X class count,
 * because a C flare cannot hurt a shielded crew. `seed` decides everything else.
 * `dustScore` is the landing site's dust score, which sets how likely a storm is.
 *
 * The timetable is planned before any flare is sized, so the same seed puts
 * events on the same sols whatever the pool holds.
 */
export function createForecast(
  flares: readonly FlareInput[],
  seed: number = DEFAULT_SEED,
  dustScore: number = NEUTRAL_SCORE.dust,
): readonly ForecastEvent[] {
  const random = createSeededRandom(seed);
  const plan = planEvents(random, dustScore);
  const pool = flares.filter((flare) => flareIntensity(flare.classType) >= 2);

  const events: ForecastEvent[] = plan.flareSols.map((sol) => {
    const flare = pool.length > 0 ? pool[Math.floor(random() * pool.length)] : typicalFlare(random);

    return makeFlareEvent(flare, sol);
  });

  if (plan.podSol !== null) {
    events.push({
      id: `supply-${plan.podSol}`,
      sol: plan.podSol,
      kind: 'supply-pod',
      durationSols: 1,
      intensity: 0,
      summary: 'A supply pod from Earth lands near the outpost. You can only unpack one kind of cargo.',
      approximate: false,
    });
  }

  if (plan.stormSol !== null) {
    events.push({
      id: `storm-${plan.stormSol}`,
      sol: plan.stormSol,
      kind: 'storm',
      durationSols: STORM_DURATION_SOLS,
      intensity: 0,
      summary: 'A dust storm is rolling in. It will cover the solar panels in dust for two sols.',
      approximate: false,
    });
  }

  return events.sort((a, b) => a.sol - b.sol);
}

/**
 * The events the crew can see coming on this sol: still ahead, and close enough
 * for that kind of event to be spotted. Everything else is a surprise.
 */
export function visibleForecast(forecast: readonly ForecastEvent[], sol: number): readonly ForecastEvent[] {
  return forecast.filter((event) => event.sol > sol && event.sol - sol <= WARNING_SOLS[event.kind]);
}

/** Events that begin on this sol. */
export function eventsStartingOn(
  forecast: readonly ForecastEvent[],
  sol: number,
): readonly ForecastEvent[] {
  return forecast.filter((event) => event.sol === sol);
}

/** The storm raging on this sol, if one is. */
export function stormOn(forecast: readonly ForecastEvent[], sol: number): ForecastEvent | null {
  return (
    forecast.find(
      (event) => event.kind === 'storm' && sol >= event.sol && sol < event.sol + event.durationSols,
    ) ?? null
  );
}

/**
 * How much of the Sun a dust storm blocks, 0-1. A calmer site (higher dust score)
 * blocks less.
 */
export function stormOpacity(dustScore: number): number {
  return Math.min(0.95, Math.max(0.2, 0.95 - 0.12 * dustScore));
}
