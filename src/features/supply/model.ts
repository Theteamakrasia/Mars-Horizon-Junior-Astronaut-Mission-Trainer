/**
 * The supply check: what the crew has to take, and the ration arithmetic.
 *
 * Pure: no DOM, no timer, no randomness. Every test input is a literal, so this
 * file cannot flake — the defect recorded as ISS-015.
 *
 * On the arithmetic, because being honest here is the whole point of the scene.
 * There is no single NASA-published "grams of food per astronaut per day": the
 * figure depends on whether you count total mass, dry mass or packaging, and
 * quoting one of those as *the* official number would be exactly the faking of
 * precision the project README rules out. So the thing the child is asked to
 * calculate is a countable unit — ration packs, which is what the checklist on
 * the Mission Control board actually counts — and the real-world mass is shown
 * separately and labelled as context.
 */

/** The five things that run out, in the order the README names them. */
export type ResourceKey = 'power' | 'oxygen' | 'water' | 'food' | 'shielding';

/**
 * One line per resource.
 *
 * Deliberately one line each. Five scannable facts read better than five
 * paragraphs, and this screen has a question waiting behind them.
 *
 * `water` and `food` carry the figures the question needs. The other three state
 * the problem without a number, because inventing a number for them would be the
 * faked precision this scene exists to avoid.
 */
export interface ResourceFact {
  readonly key: ResourceKey;
  readonly label: string;
  readonly line: string;
}

export const RESOURCE_FACTS: readonly ResourceFact[] = [
  {
    key: 'power',
    label: 'Power',
    line: 'Solar panels only work while the sun is up. The batteries have to carry the crew through the night.',
  },
  {
    key: 'oxygen',
    label: 'Oxygen',
    line: 'Every breath you take uses it, and the ship scrubs it out of the air for you to breathe again.',
  },
  {
    key: 'water',
    label: 'Water',
    line: 'On the International Space Station, about 90 out of every 100 litres are cleaned up and used again. Very little is thrown away.',
  },
  {
    key: 'food',
    label: 'Food',
    line: 'Food is packed as ration packs — one pack per astronaut per day. Fresh food cannot survive the trip.',
  },
  {
    key: 'shielding',
    label: 'Radiation shielding',
    line: 'Mars has no global magnetic field, so the crew needs shielding that never gets used up and never goes outside.',
  },
];

/** Ration packs one astronaut needs per day. A pack is the unit being counted. */
export const RATIONS_PER_ASTRONAUT_PER_DAY = 1;

/** Days in a month, for turning the mission length into a day count. */
export const DAYS_PER_MONTH = 30;

/** The crew size and mission length the child is asked about. */
export interface RationQuestion {
  readonly months: number;
  readonly crewSize: number;
}

/** The question as it is actually asked, with the numbers already set. */
export const QUESTION: RationQuestion = { months: 2, crewSize: 4 };

/** How long the mission lasts, in sols' worth of Earth days. */
export function missionDays(months: number): number {
  return months * DAYS_PER_MONTH;
}

/**
 * Ration packs needed for the whole crew for the whole mission.
 *
 * Two steps on purpose: days, then packs. A child who gets 60 and then 240 has
 * shown the working, and a single expression hides which half they understood.
 */
export function rationsFor(months: number, crewSize: number): number {
  return missionDays(months) * crewSize * RATIONS_PER_ASTRONAUT_PER_DAY;
}

/** The correct answer to QUESTION. */
export const CORRECT_ANSWER = rationsFor(QUESTION.months, QUESTION.crewSize);

/** One answer button. */
export interface RationChoice {
  readonly value: number;
  /**
   * Why this number is wrong, or null when it is right.
   *
   * Shown after a wrong pick, so a mistake teaches instead of just being marked
   * wrong. This is the README's "losing is informative" promise, kept small.
   */
  readonly mistake: string | null;
}

/**
 * The four answer buttons.
 *
 * Every wrong answer is a mistake a child plausibly makes rather than a random
 * number, because a distractor that teaches nothing is just a guess with extra
 * steps.
 */
export const CHOICES: readonly RationChoice[] = [
  {
    value: 240,
    mistake: null,
  },
  {
    value: 8,
    mistake: 'That is the days multiplied by the crew — but you stopped there. You also need the packs per astronaut.',
  },
  {
    value: 120,
    mistake: 'That counts a month as 30 days. Two months is 60, so the packs double.',
  },
  {
    value: 480,
    mistake: 'That is 120 days — a month counted as 60. Two months is 60 days, so halve it.',
  },
];

/** True when `value` is the correct answer. */
export function isCorrect(value: number, correct: number = CORRECT_ANSWER): boolean {
  return value === correct;
}

/** The explanation for a chosen answer, or null when it was right. */
export function explainChoice(value: number): string | null {
  return CHOICES.find((choice) => choice.value === value)?.mistake ?? null;
}

/**
 * Rough real-world mass, shown as context and never as the thing being tested.
 *
 * NASA food is commonly quoted at about 1.8 kg per astronaut per day. Stated as
 * "about" on purpose: it varies with what is counted, and a child reading this
 * should learn that number means less than the pack count, not more.
 */
export const APPROX_KG_PER_ASTRONAUT_PER_DAY = 1.8;

/** Rough total mass in kilograms, for the context line after a correct answer. */
export function approximateTotalKg(months: number, crewSize: number): number {
  return Math.round(missionDays(months) * crewSize * APPROX_KG_PER_ASTRONAUT_PER_DAY);
}

/** The question, as shown on screen. */
export const QUESTION_PROMPT =
  'The mission lasts two months. Your crew has four astronauts. How many ration packs must you pack?';

/**
 * The working, spelled out for a child who got it wrong.
 *
 * Built from QUESTION rather than written as a fixed sentence. An earlier version
 * hardcoded the prose ("2 months is 60 days...") while the arithmetic lived in
 * `rationsFor`, which is exactly how a screen ends up showing 60 days beside a
 * question about a different number of months. Here there is one source.
 */
export function workingSentence(months: number = QUESTION.months, crewSize: number = QUESTION.crewSize): string {
  const days = missionDays(months);

  return (
    `${months} months is ${days} days, ` +
    `and ${days} days for each of ${crewSize} astronauts is ` +
    `${rationsFor(months, crewSize)} packs.`
  );
}

/** The sentence shown after a correct answer, with the real-world mass attached. */
export function successSentence(months: number = QUESTION.months, crewSize: number = QUESTION.crewSize): string {
  const total = rationsFor(months, crewSize);

  return (
    `${total} packs. ${missionDays(months)} days for each of ${crewSize} astronauts. ` +
    `That is roughly ${approximateTotalKg(months, crewSize)} kg of food, ` +
    'and a lot of room in the cargo hold.'
  );
}