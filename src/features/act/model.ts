/**
 * Presentation helpers for the act screen.
 *
 * Deliberately thin: every simulation rule — drain, events, loss — lives in
 * `src/sim/sol.ts`, where it is tested. This file only decides how a run is
 * worded, which meters look worrying, and what the day's three activities
 * say on the screen (D-051).
 */

import { offerFor, planForSol, nightWarning, type ActivitySpec, type ActivityStoreName } from '../../sim/activities';
import { DUST_SPOTLESS, LIFE_STORE_FLOOR, POWER_BLACKOUT_FLOOR, type ScienceGoal } from '../../sim/goals';
import { oneWayMinutes } from '../../sim/comms';
import { noteForSol } from '../../sim/deskNotes';
import type { FindAnswer, FindKind } from '../../sim/rover';
import type { EngineKind } from '../../sim/minigames';
import { ordersThrough, type StandingOrder } from '../../sim/standingOrders';
import { TRAINING_DAILY_LIMIT, trainingUnlocked } from '../../sim/training';
import { RESOURCE_FLOOR, RESOURCE_NAMES, floorStreak, percentOf, FLOORED_STORES, type ResourceName, type ResourceStores } from '../../sim/resources';
import type { RunState, SolRecord } from '../../sim/run';
import { systemsFor } from '../../sim/modules';
import { powerBudget } from '../../sim/powerBudget';
import { rankProgress, type ScienceRank } from '../../sim/science';
import { WIN_SOL } from '../../sim/sol';
import type { ScienceTopic } from '../../sim/topics';

/**
 * The power picture for the sol about to be played.
 *
 * One set of numbers, and every screen reads the same set:
 *
 *   `generated`  what the panels make today
 *   `demand`     what the outpost needs over the whole sol
 *   `spare`      the difference, and negative when the outpost runs down
 *   `stored`     what is in the batteries now
 *   `spendable`  what a job may cost today
 *   `nightNeed`  what the night will take
 *
 * The night is in every one of them, because it is where the power goes. The
 * screen used to show the level in the batteries at dawn (always near zero),
 * and separately a projection that saturated at the battery's capacity (always
 * the same number), and neither mentioned the night — so a player who spent
 * 15 kWh out of a bank holding 150 could not work out why the bank was nearly
 * empty at the next dawn (ISS-083).
 */
export interface TodayPower {
  /** kWh the panels make today. */
  readonly generated: number;
  /** kWh the outpost needs over the whole sol, job aside. */
  readonly demand: number;
  /** kWh to spare over the whole sol. Negative when the outpost runs down. */
  readonly spare: number;
  /** kWh in the batteries now. */
  readonly stored: number;
  /** The batteries' capacity, in kWh. */
  readonly capacity: number;
  /** kWh a job may cost today. */
  readonly spendable: number;
  /** kWh the night needs from the batteries. */
  readonly nightNeed: number;
  /** True when the batteries still cover the night. */
  readonly nightCovered: boolean;
}

/** The power picture for the sol about to be played. */
export function powerToday(run: RunState): TodayPower {
  const budget = powerBudget(run);

  return {
    generated: Math.round(budget.generatedKwh),
    demand: Math.round(budget.demandKwh),
    spare: Math.round(budget.spareKwh),
    stored: Math.round(Math.max(0, Math.min(budget.capacityKwh, run.stores.power))),
    capacity: Math.round(budget.capacityKwh),
    spendable: Math.round(budget.spendableKwh),
    nightNeed: Math.round(budget.nightNeedKwh),
    nightCovered: budget.nightCovered,
  };
}

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
  readonly percent: number;
  readonly tone: MeterTone;
}

export const RESOURCE_LABELS: Readonly<Record<ResourceName, { readonly label: string }>> = {
  power: { label: 'Power' },
  oxygen: { label: 'Oxygen' },
  water: { label: 'Water' },
  food: { label: 'Food' },
  shielding: { label: 'Shielding' },
};

/**
 * How worried a meter should look.
 *
 * The lines are the game's own, not round numbers picked for the palette:
 * below 30 is the floor a store can be scrubbed under, so that is critical;
 * below 40 is where the science goals stop counting it, so that is a warning.
 * A player who sees red is one sol from losing the mission, which is exactly
 * what the card should say without needing a sentence.
 */
export function toneFor(percent: number): MeterTone {
  if (percent < RESOURCE_FLOOR) return 'critical';
  if (percent < LIFE_STORE_FLOOR) return 'low';

  return 'ok';
}

/**
 * One row per store, ready to draw.
 *
 * The power meter is the odd one out. The bank is nearly empty at dawn on
 * every sol — the night took it — so a meter that judged power by its level
 * would be red every morning of the run and teach the player that the game
 * was broken. Power has no floor line: a low bank does not end the run, it
 * stops the crew working. So the meter is worried about the day: red when
 * nothing can be spent, amber when the night is not covered, calm otherwise.
 */
export function meterRows(run: RunState): readonly MeterRow[] {
  const capacity = systemsFor(run.modules, run.regionId).batteryKwh;
  const power = powerToday(run);

  return RESOURCE_NAMES.map((name) => {
    const percent = percentOf(name, run.stores, capacity);

    if (name === 'power') {
      const tone: MeterTone = power.spendable <= 0 ? 'critical' : power.nightCovered ? 'ok' : 'low';

      return { name, ...RESOURCE_LABELS[name], percent, tone };
    }

    return { name, ...RESOURCE_LABELS[name], percent, tone: toneFor(percent) };
  });
}

/** A store that is one sol under the floor away from ending the run. */
export interface FloorWarning {
  readonly name: ResourceName;
  readonly label: string;
  readonly percent: number;
  readonly text: string;
}

/**
 * The store the crew is one sol away from losing to, or null.
 *
 * The floor rule is the one way a run ends with the tank still part full, so
 * it cannot be left to the numbers alone: a player at 28% would otherwise see
 * a slightly low bar and nothing else. This is the sentence the desk says, and
 * it is a warning and never a scolding — one bad sol is survivable, which is
 * the whole shape of the rule.
 *
 * Only the first store in the canonical order is named. Naming all four in a
 * banner is a paragraph, and the meters already carry the rest.
 */
export function floorWarning(run: RunState): FloorWarning | null {
  const capacity = systemsFor(run.modules, run.regionId).batteryKwh;
  const name = FLOORED_STORES.find((store) => floorStreak(run.log, store) > 0);

  if (name === undefined) return null;

  const label = RESOURCE_LABELS[name].label;

  return {
    name,
    label,
    percent: percentOf(name, run.stores, capacity),
    text: `${label} has been under ${RESOURCE_FLOOR}% for a whole sol. One more sol below the line and the crew is brought home.`,
  };
}

/** One resource's day: what it made, what it used, and where it ended up. */
export interface LedgerRow {
  readonly name: ResourceName;
  readonly label: string;
  /** What was made or gained, e.g. `216 kWh`. */
  readonly made: string;
  /** What was used or lost, e.g. `180 kWh`. */
  readonly used: string;
  /** The change in the store, e.g. `+36 kWh`, or `no change`. */
  readonly change: string;
  readonly tone: 'gain' | 'cost' | 'flat';
  /** A short note when something did not go to plan, such as wasted sunlight. Empty otherwise. */
  readonly note: string;
}

/**
 * What one sol produced and used, per resource, ready to draw.
 *
 * Power is in kWh and the other four in points of a tank. Zero shows as a
 * dash rather than `0`, which a child would read as a measurement. Sunlight the
 * batteries had no room for is named in the note, so the made, used and
 * change columns can be added up by eye and still agree.
 */
export function ledgerRows(record: SolRecord): readonly LedgerRow[] {
  const fmt = (name: ResourceName, value: number): string => {
    const rounded = Math.round(value);

    return rounded === 0 ? '–' : `${rounded}${name === 'power' ? ' kWh' : '%'}`;
  };

  return RESOURCE_NAMES.map((name) => {
    const change = Math.round(record.net[name]);
    const unit = name === 'power' ? ' kWh' : '%';
    const wasted = name === 'power' ? Math.round(record.powerWasted) : 0;

    return {
      name,
      ...RESOURCE_LABELS[name],
      made: fmt(name, record.produced[name]),
      used: fmt(name, record.consumed[name]),
      change: change === 0 ? 'no change' : `${change > 0 ? '+' : '−'}${Math.abs(change)}${unit}`,
      tone: change > 0 ? 'gain' : change < 0 ? 'cost' : 'flat',
      note: wasted > 0 ? `${wasted} kWh of sunlight wasted: the batteries were full.` : '',
    };
  });
}

/** One line of the "what this sol changed" strip. */
export interface ChangeRow {
  readonly name: ResourceName;
  readonly label: string;
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

/**
 * What the last sol did to the power, in one line.
 *
 * Every number the player needs to add the sol up by eye: what was made, what
 * the outpost used, what the night took, what the job cost, what spilled, and
 * where the bank ended. It is the answer to "why did my power go down?", and
 * it is on the screen every sol rather than only when something went wrong —
 * a sol the player can add up is a sol they can plan around.
 *
 * The night is named because it is the spender nobody sees: most of a sol's
 * power goes on the dark half of it, and the bank is empty at dawn because of
 * that rather than because of the job (ISS-083).
 */
export function powerReceipt(run: RunState): string {
  const record = run.log[run.log.length - 1];

  if (record === undefined) return '';

  const made = Math.round(record.powerGenerated);
  const outpost = Math.round(record.powerUsed - record.powerExtra);
  const night = Math.round(record.powerNight);
  const job = Math.round(record.powerExtra);
  const spilled = Math.round(record.powerWasted);
  const ended = Math.round(record.stores.power);

  const parts = [`made ${made} kWh`, `outpost ${outpost} (night ${night})`];

  if (job > 0) parts.push(`job ${job}`);
  if (spilled > 0) parts.push(`${spilled} spilled`);
  parts.push(`ended ${ended} kWh`);

  const line = `Yesterday: ${parts.join(' · ')}.`;

  if (record.blackout > POWER_BLACKOUT_FLOOR) {
    return `${line} The batteries ran flat for ${Math.round(record.blackout * 100)}% of the day.`;
  }

  return line;
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
  readonly topic: ScienceTopic;
  readonly science: number;
  /** The kWh this activity takes out of the batteries. */
  readonly powerCost: number;
  readonly costs: readonly string[];
  readonly gains: readonly string[];
  /** False when the outpost is not built for it yet. */
  readonly available: boolean;
  /** Why it is locked, or null when it is available. */
  readonly lockedReason: string | null;
  /**
   * What this job would do to the night's reserve, or null when it leaves it
   * alone.
   *
   * A warning and never a lock: the player may spend the reserve, but the card
   * says what the reserve will be afterwards.
   */
  readonly nightWarning: string | null;
  /** True when the player has already picked this one. */
  readonly chosen: boolean;
  /** The system this order looks after, or null for a science-only order. */
  readonly system: ActivitySystem | null;
  /** The tool this order can be worked with, or null when it has none. */
  readonly engine: EngineKind | null;
}

/** The system an activity looks after, and the reading it is checked against. */
export interface ActivitySystem {
  readonly goal: ScienceGoal;
  readonly label: string;
  readonly store: 'oxygen' | 'water' | 'food' | 'shielding' | 'panels';
}

/**
 * One thing the player has to check before approving an order.
 *
 * Papers, Please's job is cross-referencing: a traveller carries a passport
 * and a work permit and the inspector checks that they agree with each other
 * and with the day's rules. Here every order carries two checks — what it
 * costs against the power the outpost has, and the system it looks after
 * against the reading on the desk.
 */
export interface OrderCheck {
  /** What is being checked. */
  readonly label: string;
  /** The numbers, so the player can compare them. */
  readonly value: string;
  /** True when the order can go ahead. */
  readonly ok: boolean;
  /** Why not, in one short line. Empty when it can. */
  readonly why: string;
}

/** The reading for a system, as the order shows it: the number alone. */
function systemReading(run: RunState, store: ActivitySystem['store']): string {
  const stores = run.stores;

  switch (store) {
    case 'oxygen':
      return `${Math.round(stores.oxygen)}%`;
    case 'water':
      return `${Math.round(stores.water)}%`;
    case 'food':
      return `${Math.round(stores.food)}%`;
    case 'shielding':
      return `${Math.round(stores.shielding)} of 100`;
    case 'panels':
      return `${Math.round(run.panelHealth * 100)}%`;
  }
}

/** The level a system has to be at for the order to be worth approving. */
function systemFloor(store: ActivitySystem['store']): number {
  switch (store) {
    case 'panels':
      return DUST_SPOTLESS * 100;
    default:
      return LIFE_STORE_FLOOR;
  }
}

/**
 * The two things to check on an order.
 *
 * The first is always the power: every order costs some, and the player has
 * to weigh it against what the outpost has for today. The second is the system
 * the order looks after — or, for an order that is only about science, a line
 * saying so, because "this one is for the science points, not the outpost" is
 * a thing worth being told.
 */
export function orderChecks(run: RunState, row: ActivityRow): readonly OrderCheck[] {
  const power = powerToday(run);
  const cost = row.powerCost;

  /* Every power number on the screen carries the night's demand with it: the
     night is where most of the sol's power goes, and a price on its own reads
     as a price against a bank that is really about to be emptied (ISS-083). */
  const powerCheck: OrderCheck =
    cost === 0
      ? { label: 'Power', value: `free · night needs ${power.nightNeed} kWh`, ok: true, why: '' }
      : {
          label: 'Power',
          value: `${cost} kWh of ${power.spendable} kWh today · night needs ${power.nightNeed} kWh`,
          ok: cost <= power.spendable,
          why:
            cost > power.spendable
              ? `Not enough power today: you can spend ${power.spendable} kWh and it needs ${cost}. Tonight needs ${power.nightNeed} kWh.`
              : '',
        };

  if (row.system === null) {
    return [
      powerCheck,
      { label: 'For', value: 'science points, not the outpost', ok: true, why: '' },
    ];
  }

  const reading = systemReading(run, row.system.store);
  const floor = systemFloor(row.system.store);
  const level =
    row.system.store === 'panels'
      ? Math.round(run.panelHealth * 100)
      : Math.round(run.stores[row.system.store === 'shielding' ? 'shielding' : row.system.store]);

  return [
    powerCheck,
    {
      label: row.system.label,
      value: reading,
      ok: level >= floor,
      why: level >= floor ? '' : `Below ${floor}. This is worth fixing first.`,
    },
  ];
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
      topic: offer.spec.topic,
      science: offer.spec.science,
      powerCost: offer.spec.powerCostKwh,
      costs,
      gains,
      available: offer.available,
      lockedReason: offer.lockedReason,
      nightWarning: nightWarning(offer.spec, run),
      chosen: run.chosenActivity === offer.spec.id,
      system: offer.spec.system ?? null,
      engine: offer.spec.engine ?? null,
    };
  });
}

/* ----------------------------------------------------------------- goals -- */

/* ---------------------------------------------------------------- the board -- */

/** One standing order on the board, ready to draw. */
export interface BoardRow {
  readonly id: string;
  /** The rule, in one sentence. */
  readonly text: string;
  /** The goal it belongs to. */
  readonly goal: ScienceGoal;
  /** True when this order arrived today. */
  readonly isNew: boolean;
  /** The topic its NASA fact is filed under. */
  readonly topic: ScienceTopic;
}

/**
 * The standing orders on the board for this sol.
 *
 * Two arrive on the sol itself and everything earlier is still on the board.
 * The player works to the whole set, which is what makes the later sols
 * harder: there is more to hold in mind, not a bigger number.
 */
export function boardRows(run: RunState): readonly BoardRow[] {
  const sol = run.sol + 1;

  return ordersThrough(sol).map((order: StandingOrder) => ({
    id: order.id,
    text: order.text,
    goal: order.goal,
    isNew: order.sol === sol,
    topic: order.topic,
  }));
}

/* --------------------------------------------------------------- the rover -- */

/** One answer the player can give to the rover's find. */
export interface RoverAnswer {
  readonly id: FindAnswer;
  readonly label: string;
}

/** The rover's find, and what the player can do about it. */
export interface RoverDocument {
  readonly id: string;
  readonly kind: FindKind;
  readonly title: string;
  readonly where: string;
  readonly when: string;
  readonly alt: string;
  readonly story: string;
  readonly fact: string;
  readonly credit: string;
  readonly imageUrl: string;
  readonly sourceUrl: string;
  /** The answers the player can give. */
  readonly answers: readonly RoverAnswer[];
}

/**
 * The rover's find, if it is waiting to be answered.
 *
 * The find is a document on the desk, exactly like a work order: a picture, a
 * place, a year, a story, and a stamp to give it. A site is logged; a rock is
 * collected or left where it lies.
 */
export function roverDocument(run: RunState): RoverDocument | null {
  const find = run.rover.pending;

  if (find === null) return null;

  const answers: readonly RoverAnswer[] =
    find.kind === 'site'
      ? [{ id: 'log', label: 'Log the site' }]
      : [
          { id: 'collect', label: 'Take the rock' },
          { id: 'leave', label: 'Leave it there' },
        ];

  return {
    id: find.id,
    kind: find.kind,
    title: find.title,
    where: find.where,
    when: find.when,
    alt: find.alt,
    story: find.story,
    fact: find.fact,
    credit: find.credit,
    imageUrl: find.imageUrl,
    sourceUrl: find.sourceUrl,
    answers,
  };
}

/* ---------------------------------------------------------------- the desk -- */

/** A note that landed on the desk: a letter from home, or a word from a crewmate. */
export interface DeskNoteRow {
  readonly id: string;
  readonly from: 'home' | 'crew';
  readonly who: string;
  readonly text: string;
  /** How long it took to arrive, in minutes. Radio does not hurry. */
  readonly minutes: number;
}

/**
 * The note on the desk for this sol, if there is one.
 *
 * Some sols are quiet ones and some are not, and that is the point: a run of
 * twelve identical days is a run nobody remembers. The delay is real — the
 * game already teaches that a reply from Earth cannot arrive in time — so
 * the note says how long it took.
 */
export function deskNote(sol: number): DeskNoteRow | null {
  const note = noteForSol(sol);

  if (note === null) return null;

  return {
    id: note.id,
    from: note.from,
    who: note.who,
    text: note.text,
    minutes: oneWayMinutes(sol),
  };
}

/* --------------------------------------------------------------- the hub -- */

/**
 * The panel's buttons.
 *
 * The desk used to be one long scroll: the orders, the board, the notes, the
 * rover, the diagram, NASA's picture, then the button that ran the day. A
 * child looking for one thing had to read past everything else to find it
 * (ISS-057's cousin, and the reason this screen is now a hub). Each button is
 * a label and one line of state; the thing itself opens over the desk.
 */
export type HubSection = 'tasks' | 'desk' | 'orders' | 'stats' | 'data' | 'review';

/** One button on the hub. */
export interface HubTile {
  readonly id: HubSection;
  readonly label: string;
  /** The single line under the label: what is in there, and how much of it. */
  readonly status: string;
  /** True when the tile is asking the player to do something. */
  readonly attention: boolean;
  /**
   * The sol's net change, on the review tile.
   *
   * The review is behind a button now, so the one thing the screen must never
   * hide — what the last sol did — is printed on the button itself.
   */
  readonly chips: readonly ChangeRow[];
  /**
   * True when the section cannot be opened yet.
   *
   * Today's tasks are locked until the crew has done two training games, so
   * the tile says so rather than opening a sheet the player cannot use.
   */
  readonly locked?: boolean;
}

/**
 * What the hub needs that the run cannot know: what NASA has answered.
 *
 * The model cannot ask the network, and it may not import `data/` (a model may
 * only import `sim/`), so the view counts the pictures and the readings and
 * passes the numbers in. The data tile then says what is behind it, which is
 * the whole point of a tile.
 */
export interface HubContext {
  /** True when NASA's daily picture answered today. */
  readonly nasaToday: boolean;
  /** How many NASA pictures are behind the data tile. */
  readonly pictures: number;
  /** How many live space-weather readings came back. */
  readonly liveFlares: number;
}

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * The hub's buttons for this sol.
 *
 * Worded here rather than in the view, because these are the screen's claims:
 * "one stamped" and "2 new" have to agree with the model, and a view that
 * counts for itself is a second source of truth.
 */
export function hubTiles(run: RunState, context: HubContext): readonly HubTile[] {
  const sol = run.sol + 1;
  const tiles: HubTile[] = [];

  const orders = activityRows(run, sol);
  const chosen = orders.find((row) => row.chosen);
  /* Today's work orders are behind the training: two games a sol, and the
     orders open once they are done. */
  const ready = trainingUnlocked(run);

  tiles.push({
    id: 'tasks',
    label: "Today's tasks",
    status: ready
      ? orders.length === 0
        ? 'Nothing to decide today'
        : chosen === undefined
          ? `${plural(orders.length, 'order')} · choose one`
          : `${plural(orders.length, 'order')} · one stamped`
      : `Locked · ${TRAINING_DAILY_LIMIT} training games first`,
    attention: ready && orders.length > 0 && chosen === undefined,
    chips: [],
    locked: !ready,
  });

  const note = deskNote(sol);
  const find = roverDocument(run);
  const waiting: string[] = [];

  if (find !== null) waiting.push('a find to answer');
  if (note !== null) waiting.push('a note');

  tiles.push({
    id: 'desk',
    label: 'Check the desk',
    status: waiting.length === 0 ? 'Nothing new' : waiting.join(' · '),
    attention: find !== null,
    chips: [],
  });

  const board = boardRows(run);
  const fresh = board.filter((row) => row.isNew).length;

  tiles.push({
    id: 'orders',
    label: 'Standing orders',
    status: `${plural(board.length, 'rule')}${fresh > 0 ? ` · ${fresh} new` : ''}`,
    attention: fresh > 0,
    chips: [],
  });

  const meters = meterRows(run);
  const lowest = meters.reduce((low, row) => (row.percent < low.percent ? row : low));

  tiles.push({
    id: 'stats',
    label: 'Colony stats',
    status: `Lowest: ${lowest.label} ${lowest.percent}%`,
    attention: meters.some((row) => row.tone === 'critical'),
    chips: [],
  });

  tiles.push({
    id: 'data',
    label: 'Real data',
    status:
      context.liveFlares > 0
        ? `${plural(context.pictures, 'picture')} · ${plural(context.liveFlares, 'live flare')}`
        : context.nasaToday
          ? `${plural(context.pictures, 'picture')} · live today`
          : `${plural(context.pictures, 'picture')} · saved`,
    attention: false,
    chips: [],
  });

  const last = run.log[run.log.length - 1];

  if (last !== undefined) {
    tiles.push({
      id: 'review',
      label: `Sol ${last.sol} in review`,
      status: last.activity === null ? 'A quiet sol' : last.activity.title,
      attention: false,
      chips: changeRows(last.net).filter((row) => row.tone !== 'flat'),
    });
  }

  return tiles;
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
