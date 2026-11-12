/**
 * The main activity for each sol, and the twelve activities the crew can pick.
 *
 * Decision D-051: every sol has a main activity. On the eight calm sols `act`
 * offers three and the player chooses one; on a crisis sol the crisis replaces
 * the activity panel (D-040), so the crisis *is* that day's activity.
 *
 * This file describes the activities and says which ones a player may choose
 * today. It does not apply them — `sim/sol.ts` does that, because the sol
 * maths owns the power balance and the store deltas. Keeping the arithmetic
 * out of here is what stops a second set of rules drifting into the game.
 *
 * Pure. No DOM, no network, no randomness: the same run always offers the
 * same three activities, so a demo repeats and a test can pin them.
 */

import type { ScienceGoal } from './goals';
import type { EngineKind } from './minigames';
import type { ModuleKind } from './modules';
import { canAffordKwh, nightCoverAfterJob, powerBudget } from './powerBudget';
import type { ResourceStores } from './resources';
import type { RunState } from './run';
import type { ScienceTopic } from './topics';

/**
 * The stores an activity can add to or take from.
 *
 * `power` is deliberately excluded: an activity's power draw is not a store
 * delta, it is extra load on the sol, and the sim applies it through the same
 * `extraPowerCost` path a flare's shielding digger uses. Excluding it here
 * means the type cannot be wrong.
 */
export type ActivityStoreName = 'oxygen' | 'water' | 'food' | 'shielding';

export type ActivityStores = Partial<Pick<ResourceStores, ActivityStoreName>>;

/** Why an activity cannot be chosen today. */
export type ActivityRequirement =
  | { readonly kind: 'module'; readonly module: ModuleKind; readonly why: string }
  | { readonly kind: 'dirty-panels'; readonly why: string };

/** One activity the crew can spend a sol on. */
export interface ActivitySpec {
  /** Stable id, used in `RunState.chosenActivity` and in the tests. */
  readonly id: string;
  /** The headline on the card. Short enough to read at a glance. */
  readonly title: string;
  /**
   * What the crew does, in plain words.
   *
   * No numbers: the numbers live in the fields below and the screen renders
   * them, so a cost can never disagree with the sentence describing it.
   */
  readonly detail: string;
  /** What the activity is about, so the right NASA fact can sit beside it. */
  readonly topic: ScienceTopic;
  /**
   * Which of the five science goals this activity works on, if any.
   *
   * The pure-science activities — a survey, an experiment, a rock sample — serve
   * no goal: they are the reason a player earns science points. The other seven
   * are the work of the five goals, and saying which one is what turns a list of
   * activities into a mission.
   */
  readonly goal?: ScienceGoal;
  /**
   * The system this activity looks after, and the reading the player checks it
   * against.
   *
   * The work order shows this reading beside the request, so the number and the
   * order are in the same place and the player can check one against the
   * other. An activity with no system is one for the science points rather than
   * for the outpost, and the order says so.
   */
  readonly system?: {
    /** The goal it belongs to, so the board can point at the order that governs it. */
    readonly goal: ScienceGoal;
    /** What the reading is called on the order. */
    readonly label: string;
    /** Which store the reading comes from. */
    readonly store: 'oxygen' | 'water' | 'food' | 'shielding' | 'panels';
  };
  /** Science points earned for doing this. */
  readonly science: number;
  /**
   * Extra power the activity draws, in kWh.
   *
   * The scale is the day's power, not a round number: a good outpost has
   * roughly a hundred kWh spare over a sol, so an order that costs 20 to 50
   * kWh is a real share of what the Sun made that day, and an order that costs
   * more than the sol's spare comes out of the batteries and shortens the
   * night (ISS-084).
   *
   * The old prices were 8 to 25 kWh against a surplus of three hundred, so no
   * order could ever cost anything: the player could not see what the power
   * was for.
   */
  readonly powerCostKwh: number;
  /**
   * The tool this order is inspected with, and the stars it can win.
   *
   * The stars are the only thing an inspection changes: an inspection is
   * never worth a resource, because the balance of the run is not the
   * inspection's business.
   */
  readonly engine?: EngineKind;
  /**
   * True when this activity sends the rover out to explore.
   *
   * The rover drives on sol time, so it comes back with a document on the desk
   * the next sol. It is the one order that brings the outside world in.
   */
  readonly sendsRover?: boolean;
  /** What it adds to, or takes from, the stores. */
  readonly storeDelta: ActivityStores;
  /** How much panel health it restores, capped at 1 by the sim. */
  readonly panelRepair?: number;
  /** Why it may be unavailable, and what the player has to do about it. */
  readonly requires?: ActivityRequirement;
}

/** One sol: its headline, and the activities offered on it. */
export interface SolPlan {
  /** The sol, 1 to 12. */
  readonly sol: number;
  /** The day's headline. */
  readonly title: string;
  /** One line about what the day is for. */
  readonly subtitle: string;
  /** The ids of the activities offered. Three, in the order they are shown. */
  readonly activityIds: readonly string[];
}

/** An activity, and whether the player may pick it right now. */
export interface ActivityOffer {
  readonly spec: ActivitySpec;
  readonly available: boolean;
  /** Why it is locked, or null when it is available. */
  readonly lockedReason: string | null;
}

/**
 * The twelve activities.
 *
 * Every one of them costs something, because a choice with no price is not a
 * decision (D-051). `rest` is the one that costs nothing, and it is always
 * available, so a player is never stuck with nothing they can afford.
 *
 * The costs are tuned so that a power-hungry activity on a flat battery
 * causes a blackout — the activity competes with life support for the same
 * kWh, which is the lesson the whole game is built around.
 */
export const ACTIVITY_CATALOGUE: readonly ActivitySpec[] = [
  {
    id: 'rest',
    engine: 'sequence',
    title: 'Rest and watch the sunset',
    detail: 'The crew rests and looks at the sky. Nothing breaks.',
    topic: 'missions',
    science: 3,
    powerCostKwh: 0,
    storeDelta: {},
  },
  {
    id: 'survey',
    engine: 'radar',
    title: 'Send the rover out to survey',
    detail: 'The rover drives out and maps the ground around the outpost.',
    topic: 'missions',
    science: 4,
    powerCostKwh: 50,
    sendsRover: true,
    storeDelta: {},
  },
  {
    id: 'experiment',
    engine: 'pack',
    title: 'Run a science experiment',
    detail: 'A real experiment, run by real people, on real Mars.',
    topic: 'missions',
    science: 6,
    powerCostKwh: 30,
    storeDelta: {},
  },
  {
    id: 'map-site',
    engine: 'sort',
    title: 'Map the ground around the outpost',
    detail: 'You chart the ground so nothing gets lost out there.',
    topic: 'missions',
    science: 4,
    powerCostKwh: 28,
    storeDelta: {},
  },
  {
    id: 'sweep-panels',
    engine: 'timing',
    title: 'Clean the solar panels',
    detail: 'You wipe the dust off the panels so they catch more sun.',
    topic: 'dust',
    goal: 'dust-storm',
    system: { goal: 'dust-storm', label: 'Panels', store: 'panels' },
    science: 2,
    powerCostKwh: 20,
    storeDelta: {},
    panelRepair: 0.25,
    requires: { kind: 'dirty-panels', why: 'The panels are already clean. There is nothing to sweep.' },
  },
  {
    id: 'grow-extra',
    engine: 'pack',
    title: 'Grow an extra crop',
    detail: 'You plant an extra batch of food. Growing food uses water.',
    topic: 'food',
    goal: 'food',
    system: { goal: 'food', label: 'Food', store: 'food' },
    science: 2,
    powerCostKwh: 16,
    storeDelta: { food: 6, water: -5 },
    requires: { kind: 'module', module: 'greenhouse', why: 'You have no greenhouse, so there is nothing to grow.' },
  },
  {
    id: 'sample-rock',
    engine: 'sort',
    title: 'Collect a rock sample',
    detail: 'You pick up a rock and study it. Mars rocks are full of surprises.',
    topic: 'missions',
    science: 4,
    powerCostKwh: 20,
    storeDelta: {},
  },
  {
    id: 'dig-ice',
    engine: 'radar',
    title: 'Dig for water ice',
    detail: 'You dig up buried ice and melt it into water.',
    topic: 'water',
    goal: 'life-support',
    system: { goal: 'life-support', label: 'Water', store: 'water' },
    science: 3,
    powerCostKwh: 40,
    storeDelta: { water: 6 },
    requires: { kind: 'module', module: 'ice-miner', why: 'You have no ice miner, so there is no ice to dig.' },
  },
  {
    id: 'recycle-tune',
    engine: 'match',
    title: 'Tune the water recycler',
    detail: 'You tune the recycler so less of the water is wasted.',
    topic: 'water',
    goal: 'life-support',
    system: { goal: 'life-support', label: 'Water', store: 'water' },
    science: 2,
    powerCostKwh: 20,
    storeDelta: { water: 3 },
  },
  {
    id: 'stack-shielding',
    engine: 'timing',
    title: 'Pile soil on the habitat',
    detail: 'You pile Martian soil over the habitat to block radiation.',
    topic: 'radiation',
    goal: 'radiation',
    system: { goal: 'radiation', label: 'Shielding', store: 'shielding' },
    science: 3,
    powerCostKwh: 36,
    storeDelta: { shielding: 8 },
  },
  {
    id: 'mend-suits',
    engine: 'sequence',
    title: 'Mend the spacesuits',
    detail: 'You mend and patch the spacesuits so they keep their cover.',
    topic: 'radiation',
    goal: 'radiation',
    system: { goal: 'radiation', label: 'Shielding', store: 'shielding' },
    science: 2,
    powerCostKwh: 16,
    storeDelta: { shielding: 6 },
  },
  {
    id: 'air-check',
    engine: 'match',
    title: 'Test the airlock and the suits',
    detail: 'You test the airlock and every suit, before they need it.',
    topic: 'missions',
    goal: 'life-support',
    system: { goal: 'life-support', label: 'Air', store: 'oxygen' },
    science: 2,
    powerCostKwh: 24,
    storeDelta: { oxygen: 8 },
  },
];

/**
 * The twelve sol plans.
 *
 * The headlines are the old cosmetic ones from `features/act/model.ts`, which
 * disagreed with the forecast: sol 8 read "Mission 7: First Harvest" while the
 * dust storm was actually on sol 7 (ISS-048). Now every sol has a real plan
 * and the activity on screen always matches the day.
 *
 * Every sol offers at least one activity that can never be locked, so the
 * player is never left with nothing they are allowed to choose.
 */
export const SOL_PLANS: readonly SolPlan[] = [
  {
    sol: 1,
    title: 'Mission 1: Establish Outpost',
    subtitle: 'Nothing works without power. Watch the batteries.',
    activityIds: ['rest', 'sweep-panels', 'experiment'],
  },
  {
    sol: 2,
    title: 'Mission 2: Survey the Environment',
    subtitle: 'Read your site before you trust it.',
    activityIds: ['survey', 'map-site', 'rest'],
  },
  {
    sol: 3,
    title: 'Mission 3: Robotic Operations',
    subtitle: 'Rovers do the routine jobs so people do not have to.',
    activityIds: ['survey', 'map-site', 'experiment'],
  },
  {
    sol: 4,
    title: 'Mission 4: First EVA',
    subtitle: 'Suits, airlocks and the clock: every spacewalk is on a budget.',
    activityIds: ['air-check', 'mend-suits', 'experiment'],
  },
  {
    sol: 5,
    title: 'Mission 5: Find Resources',
    subtitle: 'What you can find here is cargo you do not have to launch.',
    activityIds: ['dig-ice', 'sample-rock', 'survey'],
  },
  {
    sol: 6,
    title: 'Mission 6: Make Water (ISRU)',
    subtitle: 'Turn local ice and dirt into supplies.',
    activityIds: ['dig-ice', 'recycle-tune', 'experiment'],
  },
  {
    sol: 7,
    title: 'Mission 7: First Harvest',
    subtitle: 'Food you grow is food you do not launch.',
    activityIds: ['grow-extra', 'recycle-tune', 'rest'],
  },
  {
    sol: 8,
    title: 'Mission 8: Survive a Major Hazard',
    subtitle: 'A dust storm tests everything you prepared.',
    activityIds: ['sweep-panels', 'grow-extra', 'stack-shielding'],
  },
  {
    sol: 9,
    title: 'Mission 9: Science Expedition',
    subtitle: 'Research is the whole point of being here.',
    activityIds: ['experiment', 'sample-rock', 'survey'],
  },
  {
    sol: 10,
    title: 'Mission 10: Expand the Outpost',
    subtitle: 'Grow without losing stability.',
    activityIds: ['stack-shielding', 'dig-ice', 'grow-extra'],
  },
  {
    sol: 11,
    title: 'Mission 11: Keep the Crew Safe',
    subtitle: 'The suit, the shield and the air — checked and ready.',
    activityIds: ['mend-suits', 'air-check', 'stack-shielding'],
  },
  {
    sol: 12,
    title: 'Mission 12: The Long Push Home',
    subtitle: 'One last sol of science before the ship leaves.',
    activityIds: ['experiment', 'sample-rock', 'map-site'],
  },
];

/** An activity by id, or null for an unknown id. */
export function activityById(id: string): ActivitySpec | null {
  return ACTIVITY_CATALOGUE.find((spec) => spec.id === id) ?? null;
}

/** The plan for a sol, or null when the sol is outside the run. */
export function planForSol(sol: number): SolPlan | null {
  if (!Number.isFinite(sol)) return null;

  const whole = Math.trunc(sol);

  if (whole < 1 || whole > SOL_PLANS.length) return null;

  return SOL_PLANS[whole - 1] ?? null;
}

/**
 * True when the batteries can pay for this job right now.
 *
 * The job is paid for out of the energy the sol has in hand: the bank at
 * dawn, plus what the panels make, less what the outpost draws all day. The
 * night's reserve is a warning and never a lock — the card says what the
 * night would be afterwards.
 *
 * It is the same rule as a crisis option and the same number the desk shows.
 */
export function canAfford(spec: ActivitySpec, run: RunState): boolean {
  return canAffordKwh(run, spec.powerCostKwh);
}

/**
 * Why an activity cannot be chosen, or null when it can.
 *
 * The outpost itself can lock an activity — a module the player has not built,
 * or panels that are already clean — and so can a flat battery. The module and
 * panel reasons are checked first because they are about the outpost's shape
 * and will not change while the player reads the card; the power reason is
 * about this sol's store and changes the moment a sol is advanced.
 */
export function lockedReason(spec: ActivitySpec, run: RunState): string | null {
  const requires = spec.requires;

  if (requires !== undefined) {
    if (requires.kind === 'module' && !run.modules.includes(requires.module)) return requires.why;
    if (requires.kind === 'dirty-panels' && run.panelHealth >= 1) return requires.why;
  }

  /*
   * Power is the one resource with no floor line: it does not end the run by
   * sitting low, it stops the crew working. A job the batteries cannot pay for
   * cannot be started, and the card says exactly what is short — the price,
   * what there is to spend and what the night will need — so the player can
   * see how far off they are.
   *
   * At a site that cannot pay for itself, the useful sentence is not about
   * today's price. It is that the outpost is short every sol, and what would
   * fix it.
   *
   * `rest` costs nothing, so this can never leave the day with no choice.
   */
  if (!canAfford(spec, run)) {
    const budget = powerBudget(run);

    if (budget.siteSpareKwh < 0) {
      return (
        `The outpost is ${Math.abs(Math.round(budget.siteSpareKwh))} kWh short every sol, so there is nothing to spend. ` +
        'Another solar array would fix it.'
      );
    }

    return (
      `This job needs ${spec.powerCostKwh} kWh. You can spend ${Math.round(budget.spendableKwh)} kWh today, ` +
      `and tonight needs ${Math.round(budget.nightNeedKwh)} kWh.`
    );
  }

  return null;
}

/**
 * The warning a job carries when paying for it would eat into the night's
 * reserve, or null when it would not.
 *
 * A job the daylight can cover on its own leaves the reserve alone, and so
 * does one that costs less than the sol's spare. One that comes out of the
 * reserve gets a warning: the night is a warning and never a lock, but the
 * card says what the reserve would be afterwards.
 */
export function nightWarning(spec: ActivitySpec, run: RunState): string | null {
  if (spec.powerCostKwh === 0) return null;

  const budget = powerBudget(run);
  const after = nightCoverAfterJob(budget, spec.powerCostKwh);

  if (budget.nightShortKwh > 0) {
    /* The night is already short. The job makes it shorter, and the player
       is told how much shorter. */
    if (after >= -budget.nightShortKwh) return null;

    return `This job makes the night worse: it would be ${Math.round(-after)} kWh short instead of ${Math.round(budget.nightShortKwh)}.`;
  }

  if (after >= budget.reserveKwh) return null;

  return (
    `This job comes out of the night's reserve: the bank would hold ${Math.round(after)} kWh after the night ` +
    `instead of ${Math.round(budget.reserveKwh)}.`
  );
}

/** An activity and whether the player may pick it right now. */
export function offerForSpec(spec: ActivitySpec, run: RunState): ActivityOffer {
  const reason = lockedReason(spec, run);

  return { spec, available: reason === null, lockedReason: reason };
}

/**
 * The three activities offered on a sol.
 *
 * Empty when the sol is outside the run. A sol with a crisis still has a
 * plan — the crisis replaces the activity panel in the view (D-040), so the
 * activities are simply not shown that day.
 */
export function offerFor(run: RunState, sol: number): readonly ActivityOffer[] {
  const plan = planForSol(sol);

  if (plan === null) return [];

  return plan.activityIds.map((id) => {
    const spec = activityById(id);

    if (spec === null) throw new RangeError(`No such activity: ${id}`);

    return offerForSpec(spec, run);
  });
}
