/**
 * The moments the player has to decide.
 *
 * Decision D-029 adds these on top of D-018: there is still no planning phase and
 * no per-sol action menu, but three forecast events stop the clock and ask for a
 * choice. Every option costs something — there is no free answer.
 *
 * Pure. The countdown itself is a timer, so it lives in the view; this file only
 * says how long it is and what the default is when it runs out.
 */

import { type ForecastEvent } from './forecast';
import { LOAD_KW } from './modules';
import { earthCanAnswerInTime } from './comms';
import { CRISIS_CHOICE, CRISIS_DEFAULT, canAffordKwh } from './powerBudget';
import type { RunState } from './run';
import { projectSol } from './sol';

export interface CrisisOption {
  readonly id: string;
  readonly label: string;
  /** What choosing it costs and what it buys, in plain words. */
  readonly detail: string;
  /**
   * What it takes out of the batteries, in kWh.
   *
   * The sim charges this when the choice is applied, and the screen greys the
   * option out when the batteries cannot pay: one field, read by both, so the
   * card can never promise a price the run does not charge.
   */
  readonly powerKwh?: number;
}

/**
 * The digger's bill, in kWh, for piling soil on the roof during a flare.
 *
 * Lives here rather than in `sim/sol.ts` because it is a property of the
 * choice. It used to be a constant in the sol maths with the option id
 * hard-coded beside it, which meant the price on the card and the price
 * charged could drift apart without either being wrong on its own terms.
 */
export const SHIELD_UP_POWER_KWH = 60;

export interface Crisis {
  readonly id: string;
  readonly kind: ForecastEvent['kind'];
  readonly sol: number;
  readonly title: string;
  readonly prompt: string;
  /** True when the clock is running. A supply pod can be thought about at leisure. */
  readonly urgent: boolean;
  /** Seconds on the clock, or null when it is not urgent. */
  readonly countdownSeconds: number | null;
  /** How many in-game minutes until the problem arrives. Compared with Earth's reply time. */
  readonly windowMinutes: number;
  /** The real science behind it, shown in the debrief and the Earth reply. */
  readonly science: string;
  readonly options: readonly CrisisOption[];
  /** What happens if the player does nothing. */
  readonly defaultOptionId: string;
}

export const COUNTDOWN_SECONDS = 10;

const FLARE_OPTIONS: readonly CrisisOption[] = [
  {
    id: CRISIS_CHOICE.shelter,
    label: 'Shelter in the storm room',
    detail: 'Cuts the radiation by more than half. But the greenhouse is left alone for a sol, so no food grows.',
  },
  {
    id: 'shield-up',
    label: 'Pile on extra soil',
    detail: 'Cuts the radiation by some. Costs 60 kWh of battery to run the digger.',
    powerKwh: SHIELD_UP_POWER_KWH,
  },
  {
    id: CRISIS_CHOICE.carryOn,
    label: 'Carry on working',
    detail: 'Costs nothing today. Your shielding takes the full hit.',
  },
];

const STORM_OPTIONS: readonly CrisisOption[] = [
  {
    id: CRISIS_CHOICE.retract,
    label: 'Fold the panels away',
    detail: 'Panels stay clean but make no power for two sols.',
  },
  {
    id: CRISIS_CHOICE.retractSave,
    label: 'Fold panels and pause the greenhouse',
    detail: `Saves ${LOAD_KW.greenhouse} kW of power while the panels are folded, but no food grows.`,
  },
  {
    id: CRISIS_CHOICE.expose,
    label: 'Leave the panels out',
    detail: 'Some power keeps coming in, but dust settles on the panels for good.',
  },
];

const SUPPLY_OPTIONS: readonly CrisisOption[] = [
  { id: 'food', label: 'Unpack food', detail: '+30 food.' },
  { id: 'water', label: 'Unpack water', detail: '+30 water.' },
  {
    id: 'spares',
    label: 'Unpack spare parts',
    detail: '+20 shielding and a panel-cleaning kit that brings back a fifth of lost solar power.',
  },
];

const SCIENCE = {
  flare:
    'A solar flare is a burst of energy from the Sun. Mars has no global magnetic field to deflect the charged particles, so shielding is the crew\u2019s only protection.',
  storm:
    'Mars dust storms can cover the whole planet and block most sunlight. That is why NASA\u2019s Opportunity rover, which ran on solar panels, went quiet in 2018.',
  supply:
    'A supply pod only comes when the planets line up, so every kilogram on it is chosen months in advance. Mars cannot be restocked in a hurry.',
} as const;

/** The crisis that goes with a forecast event. */
export function crisisForEvent(event: ForecastEvent): Crisis {
  if (event.kind === 'flare') {
    return {
      id: event.id,
      kind: 'flare',
      sol: event.sol,
      title: 'Solar flare incoming',
      prompt: `${event.summary} The radiation arrives in minutes. What do you do?`,
      urgent: true,
      countdownSeconds: COUNTDOWN_SECONDS,
      windowMinutes: 15,
      science: SCIENCE.flare,
      options: FLARE_OPTIONS,
      defaultOptionId: CRISIS_DEFAULT.flare,
    };
  }

  if (event.kind === 'storm') {
    return {
      id: event.id,
      kind: 'storm',
      sol: event.sol,
      title: 'Dust storm over the panels',
      prompt: 'It is sol ' + event.sol + '. A dust storm is about to bury your solar panels. Fold them away and lose power tonight, or leave them out and risk losing a lot more?',
      urgent: true,
      countdownSeconds: COUNTDOWN_SECONDS,
      windowMinutes: 10,
      science: SCIENCE.storm,
      options: STORM_OPTIONS,
      defaultOptionId: CRISIS_DEFAULT.storm,
    };
  }

  return {
    id: event.id,
    kind: 'supply-pod',
    sol: event.sol,
    title: 'Supply pod landed',
    prompt: event.summary,
    urgent: false,
    countdownSeconds: null,
    windowMinutes: 24 * 60,
    science: SCIENCE.supply,
    options: SUPPLY_OPTIONS,
    defaultOptionId: CRISIS_DEFAULT['supply-pod'],
  };
}

/**
 * The crisis waiting for the player before the next sol runs, or null.
 *
 * One at a time, and only if no decision has been recorded for it yet, so
 * pressing the button twice cannot ask twice.
 */
export function pendingCrisis(run: RunState): Crisis | null {
  const next = run.sol + 1;

  for (const event of run.forecast) {
    if (event.sol !== next) continue;

    const decided = run.decisions.some((decision) => decision.crisisId === event.id);

    if (!decided) return crisisForEvent(event);
  }

  return null;
}

/** An option by id, or null. */
export function optionOf(crisis: Crisis, optionId: string): CrisisOption | null {
  return crisis.options.find((option) => option.id === optionId) ?? null;
}

/**
 * True when the batteries can pay for this option.
 *
 * The same rule as every other price in the game: the option has to fit in
 * what the outpost will have at the end of the day. The one exception is a
 * free option, which is always allowed — every crisis keeps one, so a
 * countdown can never run out with nothing to press.
 */
export function canAffordOption(run: RunState, option: CrisisOption): boolean {
  return canAffordKwh(run, option.powerKwh ?? 0);
}

/**
 * The options the player may actually choose right now.
 *
 * Every crisis keeps a free option — all three defaults cost nothing — so this
 * can never come back empty. The guarantee it protects is narrow and important:
 * a flare on a flat battery still offers shelter and carrying on. It never
 * leaves a countdown with nothing to press.
 */
export function availableOptions(run: RunState, crisis: Crisis): readonly CrisisOption[] {
  return crisis.options.filter((option) => canAffordOption(run, option));
}

/**
 * What happens when the clock runs out.
 *
 * The crisis's default, unless the batteries cannot pay for it, in which case
 * the first affordable option stands in. A countdown must never charge the
 * crew for a choice it would not let them make.
 */
export function fallbackOption(run: RunState, crisis: Crisis): CrisisOption {
  const preferred = optionOf(crisis, crisis.defaultOptionId);

  if (preferred !== null && canAffordOption(run, preferred)) return preferred;

  const affordable = crisis.options.find((option) => canAffordOption(run, option));

  /* Unreachable by construction — every crisis offers a free option — so
     throwing is the honest failure: it beats applying a cost nobody could pay. */
  if (affordable === undefined) throw new Error(`Crisis ${crisis.id} has no affordable option`);

  return affordable;
}

/** Can Earth's answer beat the clock? The comms-delay lesson in one boolean. */
export function earthIsInTime(run: RunState, crisis: Crisis): boolean {
  return earthCanAnswerInTime(run.sol + 1, crisis.windowMinutes);
}

/**
 * What Mission Control would say, worked out from the outpost's real numbers.
 *
 * Only called when the reply would arrive in time. It recommends, it does not
 * decide: the player still presses the button.
 */
export function earthAdvice(run: RunState, crisis: Crisis): { optionId: string; text: string } {
  if (crisis.kind === 'flare') {
    return {
      optionId: 'shelter',
      text: 'Get everyone into the storm room. A day without a harvest is cheaper than a shield you cannot rebuild.',
    };
  }

  if (crisis.kind === 'storm') {
    const foodNet = projectSol(run).net.food;
    const optionId = foodNet >= 0 ? 'retract-save' : 'retract';

    return {
      optionId,
      text:
        optionId === 'retract-save'
          ? 'Fold the panels and pause the greenhouse. Your food is holding, so save the power.'
          : 'Fold the panels. Your food is falling, so keep the greenhouse running.',
    };
  }

  const net = projectSol(run).net;
  const days = (store: number, change: number): number =>
    change < 0 ? store / -change : Number.POSITIVE_INFINITY;
  const food = days(run.stores.food, net.food);
  const water = days(run.stores.water, net.water);

  if (food === Number.POSITIVE_INFINITY && water === Number.POSITIVE_INFINITY) {
    return { optionId: 'spares', text: 'Your food and water are holding. Spares will keep the panels and shields healthy.' };
  }

  return food <= water
    ? { optionId: 'food', text: 'Your food runs out first. Unpack food.' }
    : { optionId: 'water', text: 'Your water runs out first. Unpack water.' };
}
