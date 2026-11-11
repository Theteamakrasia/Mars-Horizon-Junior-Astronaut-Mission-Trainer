/**
 * Presentation helpers for the act screen.
 *
 * Deliberately thin: every simulation rule — drain, events, loss — lives in
 * `src/sim/sol.ts`, where it is tested. This file only decides how a run is
 * worded, which meters look worrying, and what the day's three activities
 * say on the screen (D-051).
 */

import { offerFor, planForSol, type ActivitySpec, type ActivityStoreName } from '../../sim/activities';
import { goalProgress, goalReadings, type GoalStatus, type ScienceGoal } from '../../sim/goals';
import { RESOURCE_NAMES, percentOf, type ResourceName, type ResourceStores } from '../../sim/resources';
import type { RunState } from '../../sim/run';
import { systemsFor } from '../../sim/modules';
import { rankProgress, type ScienceRank } from '../../sim/science';
import { WIN_SOL } from '../../sim/sol';
import type { ScienceTopic } from '../../sim/topics';

/** A headline and a line under it for the sol about to be played. */
export interface ActPresentation {
  readonly title: string;
  readonly subtitle: string;
}

/**
 * The plan for the sol about to be played.
 *
 * The plan lives in `sim/activities.ts` because the sim needs it too: the
 * headline on the screen and the activities on the screen have to be the same
 * day, and a cosmetic array in this file could drift from the forecast the
 * way the old `MISSIONS` array did (ISS-048).
 */
export function missionHeadline(run: RunState): ActPresentation {
  const plan = planForSol(run.sol + 1);

  if (plan !== null) return { title: plan.title, subtitle: plan.subtitle };

  const last = planForSol(WIN_SOL);

  return { title: last?.title ?? 'Mission complete', subtitle: last?.subtitle ?? 'The outpost is out there, on its own.' };
}

/** The order the stores are listed in when an activity names a cost or a gain. */
const ACTIVITY_STORE_ORDER: readonly ActivityStoreName[] = ['oxygen', 'water', 'food', 'shielding'];

export type MeterTone = 'ok' | 'low' | 'critical';

export interface MeterRow {
  readonly name: ResourceName;
  readonly label: string;
  readonly emoji: string;
  readonly percent: number;
  readonly tone: MeterTone;
}

export const RESOURCE_LABELS: Readonly<Record<ResourceName, { readonly label: string; readonly emoji: string }>> = {
  power: { label: 'Power', emoji: '⚡' },
  oxygen: { label: 'Oxygen', emoji: '🫁' },
  water: { label: 'Water', emoji: '💧' },
  food: { label: 'Food', emoji: '🍞' },
  shielding: { label: 'Shielding', emoji: '🛡️' },
};

/** How worried a meter should look. Below a quarter is low; below a tenth is critical. */
export function toneFor(percent: number): MeterTone {
  if (percent < 10) return 'critical';
  if (percent < 25) return 'low';

  return 'ok';
}

/** One row per store, ready to draw. */
export function meterRows(run: RunState): readonly MeterRow[] {
  const capacity = systemsFor(run.modules, run.regionId).batteryKwh;

  return RESOURCE_NAMES.map((name) => {
    const percent = percentOf(name, run.stores, capacity);

    return { name, ...RESOURCE_LABELS[name], percent, tone: toneFor(percent) };
  });
}

/** One line of the "what this sol changed" strip. */
export interface ChangeRow {
  readonly name: ResourceName;
  readonly label: string;
  readonly emoji: string;
  /** Signed and unit-bearing, e.g. `+14 kWh` or `−3%`. */
  readonly text: string;
  readonly tone: 'gain' | 'cost' | 'flat';
}

/**
 * Turn a sol's net change into five readable rows.
 *
 * Power is kWh in the batteries; the other four are percentage points of a
 * tank. A rounded zero says "no change" rather than `−0`, which a child would
 * read as a loss that did not happen.
 */
export function changeRows(net: ResourceStores): readonly ChangeRow[] {
  return RESOURCE_NAMES.map((name) => {
    const value = Math.round(net[name]);
    const unit = name === 'power' ? ' kWh' : '%';
    const text = value === 0 ? 'no change' : `${value > 0 ? '+' : '−'}${Math.abs(value)}${unit}`;

    return {
      name,
      ...RESOURCE_LABELS[name],
      text,
      tone: value > 0 ? 'gain' : value < 0 ? 'cost' : 'flat',
    };
  });
}

/** How far through the run the player is, 0-100. */
export function progressPercent(run: RunState): number {
  return Math.round((run.sol / WIN_SOL) * 100);
}

/** Whole seconds left, never negative. */
export function secondsLeft(totalSeconds: number, elapsedMs: number): number {
  return Math.max(0, Math.ceil(totalSeconds - elapsedMs / 1000));
}

/** Words for a night-power picture, so it can be read aloud as well as seen. */
export function powerSentence(generatedKw: number, storedKwh: number, nightDrainKw: number): string {
  return `${generatedKw} kW in the Sun · ${storedKwh} kWh stored · ${nightDrainKw} kW at night`;
}

/* ------------------------------------------------------------- activities -- */

/**
 * What an activity costs and what it gives, as short lines.
 *
 * The numbers come from the catalogue rather than from the sentence beside
 * them, so a cost can never disagree with the words describing it.
 */
export interface ActivityCost {
  /** What the activity takes, e.g. `−25 kWh`. Empty when it is free. */
  readonly costs: readonly string[];
  /** What the activity gives, e.g. `+4 science`. */
  readonly gains: readonly string[];
}

/** Split an activity's effect into what it costs and what it gives. */
export function activityCosts(spec: ActivitySpec): ActivityCost {
  const costs: string[] = [];
  const gains: string[] = [];

  if (spec.powerCostKwh > 0) costs.push(`−${spec.powerCostKwh} kWh`);

  for (const name of ACTIVITY_STORE_ORDER) {
    const value = spec.storeDelta[name] ?? 0;

    if (value === 0) continue;

    const text = `${value > 0 ? '+' : '−'}${Math.abs(value)} ${RESOURCE_LABELS[name].label}`;

    if (value > 0) gains.push(text);
    else costs.push(text);
  }

  gains.push(`+${spec.science} science`);

  return { costs, gains };
}

/** One activity card, ready to draw. */
export interface ActivityRow {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly icon: string;
  readonly topic: ScienceTopic;
  readonly science: number;
  readonly costs: readonly string[];
  readonly gains: readonly string[];
  /** False when the outpost is not built for it yet. */
  readonly available: boolean;
  /** Why it is locked, or null when it is available. */
  readonly lockedReason: string | null;
  /** True when the player has already picked this one. */
  readonly chosen: boolean;
}

/**
 * The three activities offered on a sol.
 *
 * A locked activity is still listed, with the reason attached: hiding it would
 * teach nothing, and showing it greyed out tells the player what building
 * next would be for.
 */
export function activityRows(run: RunState, sol: number): readonly ActivityRow[] {
  return offerFor(run, sol).map((offer) => {
    const { costs, gains } = activityCosts(offer.spec);

    return {
      id: offer.spec.id,
      title: offer.spec.title,
      detail: offer.spec.detail,
      icon: offer.spec.icon,
      topic: offer.spec.topic,
      science: offer.spec.science,
      costs,
      gains,
      available: offer.available,
      lockedReason: offer.lockedReason,
      chosen: run.chosenActivity === offer.spec.id,
    };
  });
}

/* ----------------------------------------------------------------- goals -- */

/**
 * One of the five science goals, read against the run as it stands.
 *
 * Two things in one row: how the goal is doing *right now* (the status and
 * the detail), and how much of it the crew has *earned* (the count). The
 * count is the part that carries forward, so it is the part that is big.
 */
export interface GoalRow {
  readonly id: ScienceGoal;
  /** The name the science goes by. */
  readonly title: string;
  /** The short name on the tile: "Dust", "Air", "Shield". */
  readonly short: string;
  /** How the goal is doing. */
  readonly status: GoalStatus;
  /** One line about it right now. */
  readonly detail: string;
  /** The topic its NASA fact is filed under. */
  readonly topic: ScienceTopic;
  /** What earning this goal means, in one short line. */
  readonly aim: string;
  /** Sols that counted towards it so far. */
  readonly held: number;
  /** Sols needed to earn it. */
  readonly needed: number;
  /** 0-100 through the target. */
  readonly percent: number;
  /** True once the goal is earned. */
  readonly earned: boolean;
}

/**
 * The five science goals, and how each is doing.
 *
 * Every number in the game belongs to one of them, so naming them turns a set
 * of falling bars into a set of things a player can think about: the dust is
 * blocking the Sun, the flat batteries are slowing the air makers, the
 * greenhouse is not keeping up with four appetites.
 *
 * The count comes from the objective and the status from the live reading, so
 * a row can say "the power is on right now" and "you have held it for eight
 * of ten sols" at the same time.
 */
export function goalRows(run: RunState): readonly GoalRow[] {
  const readings = goalReadings(run);
  const objectives = goalProgress(run);

  return readings.map((reading) => {
    const objective = objectives.find((entry) => entry.id === reading.spec.id);
    const held = objective?.held ?? 0;
    const needed = objective?.needed ?? 1;

    return {
      id: reading.spec.id,
      title: reading.spec.title,
      short: reading.spec.short,
      status: reading.status,
      detail: reading.detail,
      topic: reading.spec.topic,
      aim: objective?.aim ?? '',
      held,
      needed,
      percent: Math.min(100, Math.round((held / needed) * 100)),
      earned: objective?.earned ?? false,
    };
  });
}

/* ---------------------------------------------------------------- science -- */

/** The score, the rank it earns, and the road to the next one. */
export interface ScienceSummary {  readonly points: number;
  readonly rank: ScienceRank;
  readonly next: ScienceRank | null;
  /** 0-100 through the current band. */
  readonly percent: number;
  /** How many more points to the next rank. Zero at the top. */
  readonly toNext: number;
}

/** What the science score looks like right now. */
export function scienceSummary(run: RunState): ScienceSummary {
  const progress = rankProgress(run.science);

  return {
    points: run.science,
    rank: progress.current,
    next: progress.next,
    percent: progress.percent,
    toNext: progress.toNext,
  };
}

/** One line for the score card, so it can be read aloud as well as seen. */
export function scienceSentence(summary: ScienceSummary): string {
  const base = `${summary.points} science points. Your rank is ${summary.rank.title}.`;

  if (summary.next === null) return `${base} That is the top rank.`;

  return `${base} ${summary.toNext} more points to reach ${summary.next.title}.`;
}
