/**
 * `debrief/` model: outcome attribution and summary.
 *
 * Pure: reads the finished `RunState` and its ledger, reasons over history to
 * explain why the run ended. Never imports `base/` or `act/` (R-5).
 *
 * The debrief is load-bearing: with no planning phase, this is the only place
 * a player learns why they lost. A correct timeline beats a confident wrong
 * explanation, so attribution only claims what the ledger actually shows
 * (GAME_LOOP_PLAN.md §6.3).
 */

import type {
  ResourceStores,
  ResourceName,
  StoreChange,
} from '../../sim/resources';

import type { RunState } from '../../sim/run';
import type { SolEvent } from '../../sim/events';

/** How many recent sols the attribution looks at. */
const ATTRIBUTION_WINDOW = 5;

/** What the player is told, and how confident we are about it. */
export interface Explanation {
  readonly headline: string;
  readonly detail: string;
  /**
   * False when the cause is genuinely established from the event history.
   *
   * When true the UI must say the game is not sure — which is also the moment to
   * point at the timeline and let the player conclude it themselves.
   */
  readonly confident: boolean;
}

/** What was used and what was wasted — arithmetic over the run's ledger. */
export interface ConsumptionSummary {
  /** Total of every negative ledger delta, across all stores. */
  readonly used: number;
  /** Damage from weather events that better preparation would have reduced. */
  readonly wasted: number;
}

/** Causes that count as weather damage rather than routine consumption. */
const WEATHER_CAUSES: readonly string[] = [
  'storm',
  'storm-aftermath',
  'solar-flare',
];

/**
 * Attribute the run's outcome to the decision that caused it.
 *
 * The rule is deliberately conservative: sum the negative ledger causes for
 * the first depleted store over the last few sols, and only name a cause when
 * it accounts for more than half the loss. Otherwise say so and let the
 * timeline speak.
 */
export function explainOutcome(
  run: RunState,
  _history: readonly SolEvent[] = [],
): Explanation {
  if (run.status === 'won') {
    return {
      headline: 'Mission complete.',
      detail: `You reached sol ${run.sol} with every store above zero. The outpost is self-sustaining.`,
      confident: true,
    };
  }

  const depleted = depletedStores(run.stores);
  if (depleted.length === 0) {
    return {
      headline: 'The run ended.',
      detail: 'No store reached zero, but the mission did not reach its target sol.',
      confident: false,
    };
  }

  const store = depleted[0];
  const { totals, total } = lossesFor(run.ledger, store);
  const dominant = dominantCause(totals);

  if (dominant !== null && dominant.amount > total / 2) {
    return explainCause(store, dominant.cause, run);
  }

  // No clear ledger cause: fall back to a missing module only when that is a
  // fact we can see, otherwise admit the game is not sure.
  const missing = missingModuleExplanation(store, run);
  if (missing !== null) return missing;

  return neutralExplanation(store);
}
export function consumptionSummary(
  run: RunState,
  _history: readonly SolEvent[] = [],
): ConsumptionSummary {
  let used = 0;
  let wasted = 0;

  for (const entry of run.ledger) {
    for (const change of entry.changes) {
      if (change.delta >= 0) continue;
      const amount = Math.abs(change.delta);
      used += amount;
      if (WEATHER_CAUSES.includes(change.cause)) wasted += amount;
    }
  }

  return { used, wasted };
}

/** The stores that reached zero, in catalogue order. */
export function depletedStores(stores: ResourceStores): readonly ResourceName[] {
  const out: ResourceName[] = [];
  for (const name of ['power', 'oxygen', 'water', 'food', 'shielding'] as const) {
    if (stores[name] <= 0) out.push(name);
  }
  return out;
}

/** Sum negative deltas per cause for one store over the attribution window. */
function lossesFor(
  ledger: RunState['ledger'],
  store: ResourceName,
): { totals: Map<string, number>; total: number } {
  const totals = new Map<string, number>();
  let total = 0;

  for (const entry of ledger.slice(-ATTRIBUTION_WINDOW)) {
    for (const change of entry.changes) {
      if (change.store !== store || change.delta >= 0) continue;
      const amount = Math.abs(change.delta);
      totals.set(change.cause, (totals.get(change.cause) ?? 0) + amount);
      total += amount;
    }
  }

  return { totals, total };
}

/** The single biggest negative cause, or null when there were none. */
function dominantCause(
  totals: ReadonlyMap<string, number>,
): { cause: string; amount: number } | null {
  let best: { cause: string; amount: number } | null = null;

  for (const [cause, amount] of totals) {
    if (best === null || amount > best.amount) {
      best = { cause, amount };
    }
  }

  return best;
}

/** Copy for a cause the ledger clearly supports. */
function explainCause(
  store: ResourceName,
  cause: string,
  run: RunState,
): Explanation {
  if (store === 'power') {
    if (cause === 'storm' || cause === 'storm-aftermath') {
      return {
        headline: 'The dust storm outlasted your power.',
        detail:
          'Solar output fell during the storm and the batteries could not carry the night. More arrays, or more batteries, close that gap before sol 5.',
        confident: true,
      };
    }

    if (cause === 'night-drain') {
      return {
        headline: 'Your batteries were sized for one night, not two.',
        detail:
          'Night drain took more power than the arrays replaced by day. Extra arrays generate more; extra batteries store more.',
        confident: true,
      };
    }

    if (cause === 'module-draw') {
      return {
        headline: 'The outpost drew more power than the arrays replaced.',
        detail:
          'Each module adds a permanent power draw. Pair a new module with an extra solar array or batteries before the next sol.',
        confident: true,
      };
    }
  }

  if (store === 'shielding' && (cause === 'storm' || cause === 'solar-flare')) {
    return {
      headline: 'Radiation took the outpost.',
      detail:
        'Storms and flares stripped the shielding. A radiation shelter halves that damage, so it is worth building before the storm.',
      confident: true,
    };
  }

  if (store === 'water') {
    if (cause === 'crew' && !run.modules.includes('water-extractor')) {
      return {
        headline: 'Thirst outpaced recycling.',
        detail:
          'Crew use pulled water faster than life support could recycle it, and there was no extractor to replace it.',
        confident: true,
      };
    }

    if (cause === 'greenhouse') {
      return {
        headline: 'The greenhouse drank the water.',
        detail:
          'Growing food costs water. A water extractor replaces what the greenhouse uses.',
        confident: true,
      };
    }
  }

  if (store === 'food' && cause === 'crew') {
    if (!run.modules.includes('greenhouse')) {
      return {
        headline: 'Food ran out.',
        detail:
          'Crew use consumed the reserves and there was no greenhouse to replace it.',
        confident: true,
      };
    }

    return {
      headline: 'Food reached zero.',
      detail:
        'The greenhouse did not produce enough to keep ahead of crew use. The timeline shows where it fell behind.',
      confident: false,
    };
  }

  if (store === 'oxygen' && cause === 'crew') {
    if (!run.modules.includes('life-support')) {
      return {
        headline: 'Oxygen ran out.',
        detail:
          'Crew use pulled oxygen faster than life support could recycle it.',
        confident: true,
      };
    }

    return {
      headline: 'Oxygen reached zero.',
      detail:
        'Life support recycled air, but not fast enough for the whole crew. The timeline shows where it fell behind.',
      confident: false,
    };
  }

  return neutralExplanation(store);
}

/** A missing module is a fact we can see, so it can be stated confidently. */
function missingModuleExplanation(
  store: ResourceName,
  run: RunState,
): Explanation | null {
  if (store === 'food' && !run.modules.includes('greenhouse')) {
    return {
      headline: 'Food ran out.',
      detail:
        'Crew use consumed the reserves and there was no greenhouse to replace it.',
      confident: true,
    };
  }

  if (store === 'water' && !run.modules.includes('water-extractor')) {
    return {
      headline: 'Thirst outpaced recycling.',
      detail:
        'Crew use pulled water faster than life support could recycle it, and there was no extractor to replace it.',
      confident: true,
    };
  }

  if (store === 'oxygen' && !run.modules.includes('life-support')) {
    return {
      headline: 'Oxygen ran out.',
      detail:
        'Crew use pulled oxygen faster than life support could recycle it.',
      confident: true,
    };
  }

  return null;
}

/** The honest fallback: say what ran out, and admit we are not certain why. */
function neutralExplanation(store: ResourceName): Explanation {
  const labels: Record<ResourceName, string> = {
    power: 'Power',
    oxygen: 'Oxygen',
    water: 'Water',
    food: 'Food',
    shielding: 'Shielding',
  };

  return {
    headline: `${labels[store]} reached zero.`,
    detail: `The timeline shows ${labels[store].toLowerCase()} falling sol by sol. The game is not certain which single cause mattered most — read it and decide.`,
    confident: false,
  };
}

export type { StoreChange };
