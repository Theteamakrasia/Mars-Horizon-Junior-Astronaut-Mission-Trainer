/**
 * The power picture for the sol about to be played.
 *
 * One place that says what the panels make, what the outpost needs, what is in
 * the batteries and what the night will cost, so the desk, the job cards and
 * the sim all read the same numbers.
 *
 * It used to be three places, and they disagreed. The job card priced a job
 * against the level in the batteries at dawn. The desk showed how full the
 * batteries would be at dusk, and called it "available". Neither mentioned the
 * night, which is where most of the power goes. So a player who spent 15 kWh
 * out of a bank holding 150 could not work out why the bank was nearly empty
 * at the next dawn, and the honest reading of the screen was three different
 * numbers (ISS-083).
 *
 * The order below is the order the sol step uses, because the picture has to be
 * the sol that is about to happen:
 *
 *   1. the panels make power and the outpost draws it, all day;
 *   2. the batteries fill, and any more than they can hold is spilled;
 *   3. the day's job is paid for out of what is left;
 *   4. the night takes what is left over.
 *
 * Pure. No DOM, no randomness, no state of its own.
 */

import { eventsStartingOn, stormOn, stormOpacity, type ForecastKind } from './forecast';
import { NIGHT_HOURS, SUN_HOURS, systemsFor } from './modules';
import { siteScore } from './regions';
import type { RunState } from './run';

/**
 * The crisis choices that change what the outpost's power does.
 *
 * They live here because the power picture has to know them, and the picture
 * is what the sim and the screens both read. `sim/crises.ts` uses the same
 * constants for the options it offers, so a choice cannot be renamed in one
 * place and left behind in the other.
 */
export const CRISIS_CHOICE = {
  /** Shelter in the storm room: the greenhouse is paused for the sol. */
  shelter: 'shelter',
  /** Carry on working: nothing about the power changes. */
  carryOn: 'carry-on',
  /** Fold the panels away: no power from the Sun. */
  retract: 'retract',
  /** Fold the panels and pause the greenhouse: no Sun, and less load. */
  retractSave: 'retract-save',
  /** Leave the panels out: some power still comes in. */
  expose: 'expose',
} as const;

/**
 * What the crew does when the clock runs out.
 *
 * Every crisis's default is free, so the default is always affordable and the
 * sim's fallback always lands on it. The power picture reads the same default
 * for the same reason, so the two cannot disagree about what an unanswered
 * crisis does to the panels.
 */
export const CRISIS_DEFAULT: Readonly<Record<ForecastKind, string>> = {
  flare: CRISIS_CHOICE.carryOn,
  storm: CRISIS_CHOICE.expose,
  'supply-pod': 'food',
};

/** What one sol of power looks like, before anything is spent on a job. */
export interface PowerBudget {
  /** kWh the panels make today. */
  readonly solarKwh: number;
  /** kWh the nuclear unit makes today, day and night. */
  readonly nuclearKwh: number;
  /** kWh made today, by everything. */
  readonly generatedKwh: number;
  /** kW the outpost draws, day and night. */
  readonly loadKw: number;
  /** kWh the outpost needs over the whole sol, job aside. */
  readonly demandKwh: number;
  /** kWh the night needs from the batteries, the reactor aside. */
  readonly nightNeedKwh: number;
  /**
   * kWh the outpost has to find every sol: what is made minus what is used.
   *
   * Negative means the outpost is running down, and a second solar array is
   * the answer. This is the number that says whether the build is sound; the
   * numbers below it say what today looks like.
   */
  readonly spareKwh: number;
  /**
   * The same balance on a clear day.
   *
   * `spareKwh` counts the dust storm that is over the panels today, which
   * makes a site in credit look short. This one does not, so it is the
   * number that says whether the *build* is sound.
   */
  readonly siteSpareKwh: number;
  /** kWh in the batteries now. */
  readonly storedKwh: number;
  /** kWh the batteries hold. */
  readonly capacityKwh: number;
  /**
   * kWh a job may cost today.
   *
   * The energy the sol has in hand: the bank at dawn, plus what the panels
   * make, less what the outpost draws all day. The day's work is paid out of
   * this, and the batteries keep the night's worth.
   *
   * It is the gate for every price in the game, and it is what the desk
   * shows, so the two cannot disagree (ISS-084). Zero when the day cannot
   * pay for anything at all.
   */
  readonly spendableKwh: number;
  /**
   * kWh the daylight has left once the outpost has drawn all day.
   *
   * The same number as `spendableKwh` before it is floored at zero: negative
   * means the day does not even cover the outpost's own draw.
   */
  readonly dayLeftKwh: number;
  /**
   * kWh the bank will hold at dusk, if nothing is spent today.
   *
   * What the reserve is worth, in the number the player can compare a job
   * against.
   */
  readonly duskKwh: number;
  /**
   * kWh of the bank that is left over after the night has taken its share.
   *
   * Zero when the night is already short, and `nightShortKwh` says by how
   * much.
   */
  readonly reserveKwh: number;
  /** kWh the night is short by, if it is short. */
  readonly nightShortKwh: number;
  /** True when the night is covered without spending anything today. */
  readonly nightCovered: boolean;
  /** True when the greenhouse is paused for this sol. */
  readonly greenhousePaused: boolean;
}

/** The choice made for a crisis, or the free default when none was made. */
function choiceFor(run: RunState, crisisId: string, kind: ForecastKind): string {
  const recorded = run.decisions.find((entry) => entry.crisisId === crisisId);

  return recorded?.optionId ?? CRISIS_DEFAULT[kind];
}

/**
 * The power picture for the sol about to be played.
 *
 * The storm and the greenhouse are read the way the sol step reads them: the
 * storm from the panels' point of view, and the greenhouse from the load's.
 * A flare the crew shelters from pauses the greenhouse for the sol, and a
 * storm they answer by folding the panels stops both the Sun and the plants.
 */
export function powerBudget(run: RunState): PowerBudget {
  const sol = run.sol + 1;
  const systems = systemsFor(run.modules, run.regionId);
  const score = siteScore(run.regionId);

  let greenhousePaused = false;

  for (const event of eventsStartingOn(run.forecast, sol)) {
    if (choiceFor(run, event.id, event.kind) === CRISIS_CHOICE.shelter) greenhousePaused = true;
  }

  const storm = stormOn(run.forecast, sol);
  let stormFactor = 1;

  if (storm !== null) {
    const choice = choiceFor(run, storm.id, 'storm');

    stormFactor = choice === CRISIS_CHOICE.expose ? 1 - stormOpacity(score.dust) : 0;

    if (choice === CRISIS_CHOICE.retractSave) greenhousePaused = true;
  }

  const loadKw = systems.loadKw - (greenhousePaused ? systems.greenhouseLoadKw : 0);
  const solarKwh = systems.solarKw * systems.sunFactor * run.panelHealth * stormFactor * SUN_HOURS;
  const nuclearKwh = systems.nuclearKw * (SUN_HOURS + NIGHT_HOURS);
  const dayNeedKwh = loadKw * SUN_HOURS;
  const nightNeedKwh = Math.max(0, loadKw - systems.nuclearKw) * NIGHT_HOURS;
  const demandKwh = loadKw * (SUN_HOURS + NIGHT_HOURS);
  const capacityKwh = systems.batteryKwh;

  /* What the daylight leaves once the outpost has drawn all day: the bank as
     it was, plus what the panels made, less the day's draw. The day's work is
     paid out of this, and the batteries keep the night's worth. */
  const dayLeft = run.stores.power + solarKwh + nuclearKwh / 2 - dayNeedKwh;

  /* What the bank will hold at dusk, and what is left of it after the night.
     These are the same numbers the sol step works with, in the same order. */
  const dusk = Math.max(0, Math.min(capacityKwh, dayLeft));

  return {
    solarKwh,
    nuclearKwh,
    generatedKwh: solarKwh + nuclearKwh,
    loadKw,
    demandKwh,
    nightNeedKwh,
    spareKwh: solarKwh + nuclearKwh - demandKwh,
    siteSpareKwh:
      systems.solarKw * systems.sunFactor * run.panelHealth * SUN_HOURS + nuclearKwh - demandKwh,
    storedKwh: run.stores.power,
    capacityKwh,
    spendableKwh: Math.max(0, dayLeft),
    dayLeftKwh: dayLeft,
    duskKwh: dusk,
    reserveKwh: Math.max(0, dusk - nightNeedKwh),
    nightShortKwh: Math.max(0, nightNeedKwh - dusk),
    nightCovered: dusk >= nightNeedKwh,
    greenhousePaused,
  };
}

/**
 * What the night will be left with after a job of this size is paid for.
 *
 * Positive means the bank still covers the night and the number is what it
 * has to spare; negative means the night is short by that much. The job is
 * paid out of the daylight, so when the bank is full the surplus covers it
 * and the night is none the worse.
 */
export function nightCoverAfterJob(budget: PowerBudget, costKwh: number): number {
  const dusk = Math.max(0, Math.min(budget.capacityKwh, budget.dayLeftKwh - costKwh));

  return dusk - budget.nightNeedKwh;
}

/**
 * What the night would have left after a job of this size is paid for.
 *
 * The job is paid out of the daylight, so when the bank is full the surplus
 * covers it and the night is none the worse.
 */
export function afterJob(budget: PowerBudget, costKwh: number): number {
  return nightCoverAfterJob(budget, costKwh);
}

/**
 * True when the outpost can pay this many kWh today.
 *
 * The one rule for every price in the game: a job, a crisis option and a
 * training game are all checked against the same number, so the screen can
 * never offer something the run cannot pay for.
 *
 * The night's reserve is a warning and never a lock: a job that breaks the
 * night is allowed, and the card says what the night would be afterwards.
 */
export function canAffordKwh(run: RunState, costKwh: number): boolean {
  return costKwh <= powerBudget(run).spendableKwh;
}

/**
 * True when paying this many kWh still leaves the night covered.
 *
 * The night is a warning and never a lock: the player may spend the reserve,
 * sometimes that is the right call, but the card says what the reserve will
 * be afterwards.
 */
export function keepsTheNight(budget: PowerBudget, costKwh: number): boolean {
  return nightCoverAfterJob(budget, costKwh) >= 0;
}
