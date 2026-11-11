/**
 * Why the run ended the way it did, worked out from what actually happened.
 *
 * Because there is no planning phase (D-018), this is where a player learns the
 * reason — a confident wrong answer is worse than none. So every sentence here
 * is built from a fact the sim logged (a decision, a module, a blackout, a store
 * level), and when no rule matches the facts, `confident` is false and the screen
 * points at the timeline instead of guessing.
 *
 * Pure. No DOM, no network.
 */

import { crisisForEvent, optionOf } from '../../sim/crises';
import { goalById, goalProgress, type ScienceGoal } from '../../sim/goals';
import { systemsFor, countOf, NIGHT_HOURS, type ModuleKind } from '../../sim/modules';
import { RESOURCE_NAMES, type ResourceName } from '../../sim/resources';
import type { RunState, SolRecord } from '../../sim/run';
import { rankProgress, type ScienceRank } from '../../sim/science';
import { endedBy, isSelfSustaining, WIN_SOL } from '../../sim/sol';

/** What the player is told, and how sure we are. */
export interface Explanation {
  readonly headline: string;
  readonly detail: string;
  /**
   * True only when a logged fact establishes the cause.
   *
   * When false the UI says the game is not sure, and points at the timeline so
   * the player can draw the conclusion themselves.
   */
  readonly confident: boolean;
}

/** Full names, for sentences. */
const STORE_NAME: Readonly<Record<ResourceName, string>> = {
  power: 'power',
  oxygen: 'oxygen',
  water: 'water',
  food: 'food',
  shielding: 'radiation shielding',
};

/** Sols (numbers) on which the batteries ran flat enough to slow life support. */
export function blackoutSols(run: RunState): readonly number[] {
  return run.log.filter((record) => record.blackout > 0.05).map((record) => record.sol);
}

/** Why power ran short, from the facts: a folded storm, small batteries, or too few panels. */
function powerCause(run: RunState): string {
  const systems = systemsFor(run.modules, run.regionId);
  const nightNeed = Math.max(0, systems.loadKw - systems.nuclearKw) * NIGHT_HOURS;
  const stormChoice = run.decisions.find((decision) => decision.crisisId.startsWith('storm'));
  const stormBlackout = run.log.some((record) => record.blackout > 0.05 && record.events.some((event) => event.kind === 'storm'));
  const reasons: string[] = [];

  if (systems.batteryKwh < nightNeed) {
    reasons.push(`your batteries held ${systems.batteryKwh} kWh but one night needs about ${Math.round(nightNeed)} kWh`);
  }

  if (stormChoice !== undefined && stormChoice.optionId !== 'expose' && stormBlackout) {
    reasons.push('folding the panels away during the dust storm meant no power was made for two sols');
  }

  if (run.panelHealth < 1) {
    reasons.push(`dust left on the panels cut their output to ${Math.round(run.panelHealth * 100)}%`);
  }

  return reasons.length === 0 ? '' : ` It happened because ${reasons.join(', and ')}.`;
}

/** The first sol on which a store hit zero, or the last sol if the log has no earlier one. */
function failureSol(run: RunState, name: ResourceName): number {
  return run.log.find((record) => record.stores[name] <= 0)?.sol ?? run.sol;
}

/**
 * Attribute the run's outcome to the decision that caused it.
 *
 * Reasons over the event history, not just the final numbers: a loss to
 * shielding on sol 10 is a different lesson if the player sheltered on sol 3.
 */
export function explainOutcome(run: RunState): Explanation {
  if (run.status === 'won') {
    return isSelfSustaining(run)
      ? {
          headline: 'You built a self-sustaining outpost.',
          detail: 'Air, water and food are all being made faster than the crew uses them, and the power balances day and night. That is the goal of a real Mars outpost: nothing needs to arrive from Earth.',
          confident: true,
        }
      : {
          headline: `You got the crew through all ${WIN_SOL} sols.`,
          detail: 'But you got there living off your reserves. Something is still running down every sol, so the outpost could not keep going on its own. Try a build that makes what it uses.',
          confident: true,
        };
  }

  if (run.status === 'active') {
    return { headline: 'The mission is still running.', detail: 'There is nothing to explain yet.', confident: false };
  }

  const ended = endedBy(run);
  const first = ended[0];

  if (first === undefined) {
    return {
      headline: 'The run ended, but the game cannot tell you which supply failed.',
      detail: 'Read the timeline below and see where the numbers started to fall.',
      confident: false,
    };
  }

  const sol = failureSol(run, first);
  const modules = run.modules;
  const blackouts = blackoutSols(run);

  if (first === 'food') {
    if (countOf(modules, 'greenhouse') === 0) {
      return {
        headline: `The food ran out on sol ${sol}.`,
        detail: 'The crew eats every sol, and with no greenhouse nothing was growing to replace it. Food you do not grow is food you have to launch from Earth, and nothing was coming.',
        confident: true,
      };
    }

    if (blackouts.length > 0) {
      return {
        headline: `The food ran out on sol ${sol}.`,
        detail: `You did build a greenhouse, but the power failed on sol ${blackouts.join(', ')} and the plants stopped growing.${powerCause(run)}`,
        confident: true,
      };
    }
  }

  if (first === 'water') {
    const calm = run.log[0]?.net.water;

    if (calm !== undefined && calm < 0 && countOf(modules, 'ice-miner') === 0) {
      return {
        headline: `The water ran out on sol ${sol}.`,
        detail: `Water was falling by about ${Math.abs(Math.round(calm))} every sol, and nothing was making new water. Recycling saves 90%, but the greenhouse and the oxygen maker both use some. An ice miner, or choosing water from the supply pod, would have topped it up.`,
        confident: true,
      };
    }

    if (blackouts.length > 0) {
      return {
        headline: `The water ran out on sol ${sol}.`,
        detail: `When the power failed on sol ${blackouts.join(', ')}, the water recycler slowed down, so far more water was lost than usual.${powerCause(run)}`,
        confident: true,
      };
    }
  }

  if (first === 'oxygen' && blackouts.length > 0) {
    return {
      headline: `The air ran out on sol ${sol}.`,
      detail: `Oxygen is made by splitting water, and that takes power. When the batteries ran flat on sol ${blackouts.join(', ')}, the oxygen maker slowed down while the crew kept breathing.${powerCause(run)}`,
      confident: true,
    };
  }

  if (first === 'shielding') {
    const flare = run.log.flatMap((record) => record.events).filter((event) => event.kind === 'flare').pop();
    const decision = flare === undefined ? undefined : run.decisions.find((entry) => entry.sol === flare.sol && entry.crisisId.startsWith('flare'));

    if (flare !== undefined && decision !== undefined) {
      const crisis = crisisForEvent({ id: decision.crisisId, sol: flare.sol, kind: 'flare', durationSols: 1, intensity: 0, summary: flare.summary, approximate: flare.approximate });
      const label = optionOf(crisis, decision.optionId)?.label.toLowerCase() ?? decision.optionId;
      const built = countOf(modules, 'regolith-shield');
      const earlier = run.log.find((record) => record.sol === flare.sol - 1);
      const before = Math.round(earlier?.stores.shielding ?? systemsFor(modules, run.regionId).shieldingStart);

      return {
        headline: `The radiation shielding ran out on sol ${sol}.`,
        detail:
          `The solar flare on sol ${flare.sol} hit a shield that was at ${before} out of 100. You chose to ${label}${decision.timedOut ? ' (the clock ran out, so that was chosen for you)' : ''}, and you had built ${built === 0 ? 'no regolith shield' : `${built} regolith shield${built === 1 ? '' : 's'}`}. ` +
          'With no magnetic field to turn the particles aside, shielding is all the crew has.',
        confident: true,
      };
    }
  }

  return {
    headline: `The ${STORE_NAME[first]} ran out on sol ${sol}.`,
    detail: 'The game cannot say for sure why. Look at the timeline and find the sol where it started to fall.',
    confident: false,
  };
}

/** Totals for "what you used and what you wasted". */
export interface ConsumptionSummary {
  readonly sols: number;
  readonly crewOxygen: number;
  readonly crewWater: number;
  readonly crewFood: number;
  readonly powerGenerated: number;
  readonly powerWasted: number;
  readonly blackoutSols: number;
}

/** What was used and what was wasted. Arithmetic over the log, not a causal claim. */
export function consumptionSummary(run: RunState): ConsumptionSummary {
  const sum = (pick: (record: SolRecord) => number): number => run.log.reduce((total, record) => total + pick(record), 0);

  return {
    sols: run.log.length,
    crewOxygen: Math.round(sum((record) => record.used.oxygen)),
    crewWater: Math.round(sum((record) => record.used.water)),
    crewFood: Math.round(sum((record) => record.used.food)),
    powerGenerated: Math.round(sum((record) => record.powerGenerated)),
    powerWasted: Math.round(sum((record) => record.powerWasted)),
    blackoutSols: blackoutSols(run).length,
  };
}

export interface DecisionReview {
  readonly sol: number;
  readonly title: string;
  readonly chose: string;
  readonly verdict: 'solved' | 'caught' | 'mixed';
  readonly why: string;
  readonly science: string;
  readonly timedOut: boolean;
}

/**
 * Which problems were solved early and which caught the player out.
 *
 * Verdicts come from fixed rules about each option's cost, never from whether
 * the run happened to end well, so a lucky win cannot praise a bad call.
 */
export function reviewDecisions(run: RunState): readonly DecisionReview[] {
  const reviews: DecisionReview[] = [];

  for (const decision of run.decisions) {
    const event = run.forecast.find((entry) => entry.id === decision.crisisId);

    if (event === undefined || event.sol > run.sol) continue;

    const crisis = crisisForEvent(event);
    const option = optionOf(crisis, decision.optionId);

    if (option === null) continue;

    let verdict: DecisionReview['verdict'] = 'mixed';
    let why = option.detail;

    if (crisis.kind === 'flare') {
      verdict = decision.optionId === 'carry-on' ? 'caught' : 'solved';
      why = decision.optionId === 'carry-on' ? 'Nobody took cover, so the shielding took the full hit.' : option.detail;
    }

    if (crisis.kind === 'storm') {
      verdict = decision.optionId === 'expose' ? 'caught' : decision.optionId === 'retract-save' ? 'solved' : 'mixed';
      why = decision.optionId === 'expose' ? 'The panels stayed out and dust settled on them for good.' : option.detail;
    }

    reviews.push({
      sol: event.sol,
      title: crisis.title,
      chose: option.label,
      verdict,
      why,
      science: crisis.science,
      timedOut: decision.timedOut,
    });
  }

  return reviews.sort((a, b) => a.sol - b.sol);
}

/** One row of the timeline. */
export interface TimelineRow {
  readonly sol: number;
  readonly stores: Readonly<Record<ResourceName, number>>;
  readonly headline: string;
  readonly notes: readonly string[];
}

/** Every sol, so the player can draw their own conclusion when the game cannot. */
export function timeline(run: RunState): readonly TimelineRow[] {
  return run.log.map((record) => ({
    sol: record.sol,
    stores: record.stores,
    headline: record.events.length > 0 ? record.events.map((event) => event.summary).join(' ') : 'A quiet sol.',
    notes: record.notes,
  }));
}

/** The lowest each store went, so the debrief can show where the margin was thinnest. */
export function lowestPoints(run: RunState): Readonly<Record<ResourceName, number>> {
  const lowest = { power: Infinity, oxygen: Infinity, water: Infinity, food: Infinity, shielding: Infinity };

  for (const record of run.log) {
    for (const name of RESOURCE_NAMES) lowest[name] = Math.min(lowest[name], record.stores[name]);
  }

  return Object.fromEntries(RESOURCE_NAMES.map((name) => [name, Number.isFinite(lowest[name]) ? Math.round(lowest[name]) : 0])) as Record<ResourceName, number>;
}

/** True when any flare event in the run was sized from fallback data. */
export function usedApproximateData(run: RunState): boolean {
  return run.forecast.some((event) => event.approximate);
}

/** The store that ended the run, or null when the crew got through. */
export function wentEmpty(run: RunState): ResourceName | null {
  return run.status === 'lost' ? (endedBy(run)[0] ?? null) : null;
}

/** One thing worth trying on the next run. */
export interface NextStep {
  readonly title: string;
  readonly detail: string;
  /**
   * Which picture to draw beside it: a module to build, a choice at a crisis,
   * or a different site. A hint for the view, not a rule.
   */
  readonly art: ModuleKind | 'choice' | 'site';
}

/** One sol the crew spent on an activity. */
export interface ScienceRow {
  readonly sol: number;
  readonly title: string;
  readonly points: number;
}

/** What the run's science amounts to (D-052). */
export interface ScienceReport {
  /** The score: every science point the run earned. */
  readonly points: number;
  /** The rank that score earns. */
  readonly rank: ScienceRank;
  /** The rank above it, or null at the top. */
  readonly next: ScienceRank | null;
  /** How many more points to the next rank. */
  readonly toNext: number;
  /** 0-100 through the current band. */
  readonly percent: number;
  /** Every activity the crew chose, in order. */
  readonly activities: readonly ScienceRow[];
  /** The sols spent on a crisis instead of an activity. */
  readonly crisisSols: readonly number[];
  /** The sols where nothing at all was chosen. */
  readonly quietSols: readonly number[];
}

/**
 * What science the run did.
 *
 * This measures the science, not the outcome: a run that did a great deal of
 * science and then ran out of water still did the science. The debrief's own
 * section explains whether the crew got home, and this one is about the work.
 */
export function scienceReport(run: RunState): ScienceReport {
  const progress = rankProgress(run.science);

  const activities: ScienceRow[] = [];
  const crisisSols: number[] = [];
  const quietSols: number[] = [];

  for (const record of run.log) {
    if (record.activity !== null) {
      activities.push({ sol: record.sol, title: record.activity.title, points: record.activity.science });
      continue;
    }

    /* No activity: either a crisis took the day, or nothing was chosen. */
    if (record.events.length > 0) crisisSols.push(record.sol);
    else quietSols.push(record.sol);
  }

  return {
    points: run.science,
    rank: progress.current,
    next: progress.next,
    toNext: progress.toNext,
    percent: progress.percent,
    activities,
    crisisSols,
    quietSols,
  };
}

/**
 * The headline for the science score.
 *
 * No article before the rank: "a Explorer" is wrong, and the sentence has to
 * survive every rank in the ladder.
 */
export function scienceHeadline(report: ScienceReport): string {
  if (report.points === 0) return 'No science points yet.';

  return `Your rank: ${report.rank.title}.`;
}

/** The line under the headline: what is left to reach, or what was reached. */
export function scienceDetail(report: ScienceReport): string {
  if (report.points === 0) {
    return 'Next time, pick an activity on every calm sol. Each one earns science points.';
  }

  if (report.next === null) return 'That is the top rank. There is nothing above it.';

  return `${report.toNext} more points to reach ${report.next.title}.`;
}

/** One line for the science score, so it can be read aloud as well as seen. */
export function scienceSentence(report: ScienceReport): string {
  return `${report.points} science points. ${scienceHeadline(report)} ${scienceDetail(report)}`;
}

/* ------------------------------------------------------------ the rover -- */

/**
 * What the rover found over the run.
 *
 * The rover is part of the run now, so what it brought back belongs in the
 * debrief next to everything else the crew did.
 */
export interface RoverReport {
  /** How many finds the rover turned up. */
  readonly found: number;
  /** Historic sites the crew logged. */
  readonly visited: readonly string[];
  /** Rocks the crew brought home. */
  readonly collected: readonly string[];
  /** Rocks the crew left where they lie. */
  readonly left: readonly string[];
}

/** What the rover found over the run. */
export function roverReport(run: RunState): RoverReport {
  return {
    found: run.rover.found.length,
    visited: run.rover.visited,
    collected: run.rover.collected,
    left: run.rover.left,
  };
}

/* ------------------------------------------------------------ the goals -- */

/**
 * How one goal fared, before the objective count is joined on.
 *
 * `held` — it was fine. `hurt` — it was damaged or dipped. `failed` — it ran
 * out.
 */
interface GoalVerdict {
  readonly id: ScienceGoal;
  readonly title: string;
  readonly verdict: 'held' | 'hurt' | 'failed';
  readonly detail: string;
}

/** How one of the five science goals fared over the run. */
export interface GoalOutcome extends GoalVerdict {
  /** Sols that counted towards the goal. */
  readonly held: number;
  /** What this goal asked of the crew, in one short line. */
  readonly aim: string;
}

/**
 * How each of the five science goals fared.
 *
 * This is the run read back as science rather than as numbers: the dust took
 * so much off the panels, the shielding fell so far, the greenhouse grew less
 * than the crew ate. Every figure comes from the log or the final stores, so
 * the debrief can be checked against the timeline.
 */
export function goalOutcomes(run: RunState): readonly GoalOutcome[] {
  const lows = lowestPoints(run);
  const blackouts = blackoutSols(run);
  const ended = endedBy(run);
  const systems = systemsFor(run.modules, run.regionId);

  const title = (id: ScienceGoal): string => goalById(id)?.title ?? id;

  /* -- Martian Dust Storm ----------------------------------------------- */
  const dust: GoalVerdict = (() => {
    if (run.panelHealth <= 0.25) {
      return {
        id: 'dust-storm',
        title: title('dust-storm'),
        verdict: 'failed',
        detail: 'The panels are wrecked. They will never make their full power again.',
      };
    }

    if (run.panelHealth < 1) {
      const lost = Math.round((1 - run.panelHealth) * 100);

      return {
        id: 'dust-storm',
        title: title('dust-storm'),
        verdict: 'hurt',
        detail: `Dust took ${lost}% off the panels, and it is for good.`,
      };
    }

    return {
      id: 'dust-storm',
      title: title('dust-storm'),
      verdict: 'held',
      detail: 'The panels are still clean.',
    };
  })();

  /* -- Life Support ------------------------------------------------------ */
  const life: GoalVerdict = (() => {
    if (ended.includes('oxygen')) {
      return {
        id: 'life-support',
        title: title('life-support'),
        verdict: 'failed',
        detail: `The air ran out on sol ${failureSol(run, 'oxygen')}.`,
      };
    }

    if (ended.includes('water')) {
      return {
        id: 'life-support',
        title: title('life-support'),
        verdict: 'failed',
        detail: `The water ran out on sol ${failureSol(run, 'water')}.`,
      };
    }

    if (lows.oxygen < 40 || lows.water < 40) {
      return {
        id: 'life-support',
        title: title('life-support'),
        verdict: 'hurt',
        detail: `The air fell to ${lows.oxygen}% and the water to ${lows.water}%.`,
      };
    }

    return {
      id: 'life-support',
      title: title('life-support'),
      verdict: 'held',
      detail: `The air never fell below ${lows.oxygen}% and the water never below ${lows.water}%.`,
    };
  })();

  /* -- Radiation Exposure ------------------------------------------------ */
  const radiation: GoalVerdict = (() => {
    if (ended.includes('shielding')) {
      return {
        id: 'radiation',
        title: title('radiation'),
        verdict: 'failed',
        detail: `The shielding ran out on sol ${failureSol(run, 'shielding')}.`,
      };
    }

    if (lows.shielding < 40) {
      return {
        id: 'radiation',
        title: title('radiation'),
        verdict: 'hurt',
        detail: `The shielding fell to ${lows.shielding} of 100.`,
      };
    }

    return {
      id: 'radiation',
      title: title('radiation'),
      verdict: 'held',
      detail: `The shielding never fell below ${lows.shielding} of 100.`,
    };
  })();

  /* -- Power Shortage ---------------------------------------------------- */
  const power: GoalVerdict = (() => {
    if (blackouts.length > 0) {
      const sols = blackouts.join(', ');

      return {
        id: 'power',
        title: title('power'),
        verdict: 'hurt',
        detail:
          blackouts.length === 1
            ? `The batteries ran flat on sol ${sols}, and life support slowed down with them.`
            : `The batteries ran flat on ${blackouts.length} sols (${sols}).`,
      };
    }

    return {
      id: 'power',
      title: title('power'),
      verdict: 'held',
      detail: 'The batteries never ran flat. The crew never lost power to the dark.',
    };
  })();

  /* -- Food Production --------------------------------------------------- */
  const food: GoalVerdict = (() => {
    if (ended.includes('food')) {
      return {
        id: 'food',
        title: title('food'),
        verdict: 'failed',
        detail: `The food ran out on sol ${failureSol(run, 'food')}.`,
      };
    }

    if (!systems.hasGreenhouse) {
      return {
        id: 'food',
        title: title('food'),
        verdict: 'hurt',
        detail: 'There was no greenhouse. The crew ate the stores and nothing replaced it.',
      };
    }

    if (lows.food < 40) {
      return {
        id: 'food',
        title: title('food'),
        verdict: 'hurt',
        detail: `The food fell to ${lows.food}%. The greenhouse barely kept up.`,
      };
    }

    return {
      id: 'food',
      title: title('food'),
      verdict: 'held',
      detail: `The food never fell below ${lows.food}%. The greenhouse kept up.`,
    };
  })();

  /* The count of sols that counted is joined on here, so the debrief and the
     act screen cannot disagree about how far the crew got. */
  const objectives = goalProgress(run);

  return [dust, life, radiation, power, food].map((outcome) => {
    const objective = objectives.find((entry) => entry.id === outcome.id);

    return {
      ...outcome,
      held: objective?.held ?? 0,
      aim: objective?.aim ?? '',
    };
  });
}

/**
 * What to try next, each step tied to a fact from this run.
 *
 * No generic advice: a tip only appears when the log or the module list proves
 * it would have changed something here. The first two are all the debrief panel
 * has room for, so the most specific facts are pushed first.
 */
export function nextSteps(run: RunState, limit = 2): readonly NextStep[] {
  const steps: NextStep[] = [];
  const systems = systemsFor(run.modules, run.regionId);
  const nightNeed = Math.max(0, systems.loadKw - systems.nuclearKw) * NIGHT_HOURS;
  const ended = endedBy(run)[0];
  const objectives = goalProgress(run);

  /**
   * A goal the crew actually missed: it let a sol slip past that it could
   * have counted. A goal that held on every sol it had is not something to
   * give advice about, and a run that was lost early has not missed
   * anything, it has not finished.
   */
  const missed = (id: ScienceGoal): boolean => {
    const objective = objectives.find((entry) => entry.id === id);

    if (objective === undefined) return false;

    return objective.held < run.sol;
  };

  /* A goal the crew did not hold is worth a tip even in a run they won: the
     run was survivable and the science was not. */
  const goalTips = new Map<ScienceGoal, NextStep>();

  if (missed('life-support') && countOf(run.modules, 'ice-miner') === 0) {
    goalTips.set('life-support', { title: 'Add an ice miner', detail: 'Make water from nearby ice, instead of waiting for a supply pod.', art: 'ice-miner' });
  }

  if (missed('food') && countOf(run.modules, 'greenhouse') === 0) {
    goalTips.set('food', { title: 'Add a greenhouse', detail: 'Grow food every sol so the stores stop falling.', art: 'greenhouse' });
  }

  if (missed('radiation')) {
    goalTips.set(
      'radiation',
      countOf(run.modules, 'regolith-shield') < 2
        ? {
            title: 'Pile on more soil',
            detail: 'The shield fell below 40 and stayed there. Another regolith shield starts you with more.',
            art: 'regolith-shield',
          }
        : {
            title: 'Pile soil on the habitat',
            detail: 'The shield fell below 40 and stayed there. The activity adds 8 shielding a sol.',
            art: 'regolith-shield',
          },
    );
  }

  if (missed('power') && systems.batteryKwh < nightNeed) {
    goalTips.set('power', { title: 'Add a battery bank', detail: `One night needs about ${Math.round(nightNeed)} kWh. You had ${systems.batteryKwh}.`, art: 'batteries' });
  }

  /* The goal that ended the run comes first, because that is the one that
     mattered. Then the pod, which is the one choice that was a mistake. */
  const endedGoal: Readonly<Record<string, ScienceGoal>> = {
    oxygen: 'life-support',
    water: 'life-support',
    food: 'food',
    shielding: 'radiation',
  };
  const endedId = ended === undefined ? null : (endedGoal[ended] ?? null);
  const order: readonly ScienceGoal[] = ['life-support', 'food', 'radiation', 'power'];

  if (endedId !== null) {
    const tip = goalTips.get(endedId);

    if (tip !== undefined) steps.push(tip);
  }

  const pod = run.decisions.find((decision) => decision.crisisId.startsWith('supply-') && decision.optionId !== 'water');
  const podSol = pod === undefined ? undefined : run.forecast.find((event) => event.id === pod.crisisId)?.sol;

  if (ended === 'water' && podSol !== undefined) {
    steps.push({ title: 'Choose water from the pod', detail: `The pod on sol ${podSol} could have topped the tank up by 30.`, art: 'choice' });
  }

  for (const id of order) {
    if (id === endedId) continue;

    const tip = goalTips.get(id);

    if (tip !== undefined) steps.push(tip);
  }

  const caught = reviewDecisions(run).find((review) => review.verdict === 'caught');

  if (caught !== undefined) {
    steps.push({ title: `Rethink sol ${caught.sol}`, detail: `${caught.chose}. ${caught.why}`, art: 'choice' });
  }

  if (run.status === 'won' && !isSelfSustaining(run)) {
    steps.push({ title: 'Make what you use', detail: 'The crew survived on reserves. Add the module that refills whatever is still falling.', art: 'choice' });
  }

  if (steps.length === 0) {
    steps.push({ title: 'Try a harsher site', detail: 'This build held. A site with less sun or ice would test it harder.', art: 'site' });
  }

  return steps.slice(0, limit);
}
