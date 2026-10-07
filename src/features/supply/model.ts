/**
 * The supply check: what a ration packet is, and how many the mission needs.
 *
 * Pure: no DOM, no timer, no randomness. Every test input is a literal, so this
 * file cannot flake — the defect recorded as ISS-015.
 *
 * On the arithmetic, because being honest here is the whole point of the scene.
 *
 * The unit was originally "one pack per astronaut per day", which made the answer
 * a single multiplication and the pack count identical to the number of days. That
 * is a weak question: nothing has to be understood beyond days x crew.
 *
 * So the unit is what a packet physically is. A packet is not one day's food. It
 * is a multipack covering three days for one crew member, which is how meals are
 * actually issued for flight — bulk and dehydrated, because fresh food does not
 * survive a trip and a loose brick of crackers would not either. That makes the
 * question a real conversion in three steps:
 *
 *     2 months is 60 days
 *     60 days x 4 astronauts is 240 astronaut-days
 *     240 astronaut-days / 3 days per packet is 80 packets
 *
 * 80 is the correct answer. It is the number a child can check by hand, and the
 * middle step is a unit nobody has to be told is called an "astronaut-day".
 *
 * The real-world mass stays a separate labelled line and is never the thing being
 * tested. There is no single NASA figure for grams of food per astronaut per day:
 * it depends on whether packaging and water are counted, so quoting one as
 * official would be the faked precision the README rules out.
 */

/** The five things that run out, in the order the README names them. */
export type ResourceKey = 'power' | 'oxygen' | 'water' | 'food' | 'shielding';

/** One line of the briefing the astronaut speaks before he asks anything. */
export interface SupplyBeat {
  readonly id: string;
  readonly label: string;
  readonly line: string;
  /** Set on the beats that correspond to one of the five resources. */
  readonly resource?: ResourceKey;
}

/**
 * What he says, in order.
 *
 * The four generic resources first, then the two that actually feed the question.
 * Putting the ration facts last means they are the freshest thing in the player's
 * head when the numbers arrive, which is the difference between a calculation
 * they can do and one they have to reconstruct.
 */
export const SUPPLY_BEATS: readonly SupplyBeat[] = [
  {
    id: 'power',
    label: 'Power',
    line: 'Solar panels only work while the sun is up. The batteries have to carry the crew through the night.',
    resource: 'power',
  },
  {
    id: 'oxygen',
    label: 'Oxygen',
    line: 'Every breath you take uses it, and the ship scrubs it out of the air for you to breathe again.',
    resource: 'oxygen',
  },
  {
    id: 'water',
    label: 'Water',
    line: 'On the International Space Station, about 90 out of every 100 litres are cleaned up and used again. Very little is thrown away.',
    resource: 'water',
  },
  {
    id: 'shielding',
    label: 'Radiation shielding',
    line: 'Mars has no global magnetic field, so the crew needs shielding that never gets used up and never goes outside.',
    resource: 'shielding',
  },
  {
    id: 'packet',
    label: 'A ration packet',
    line: 'Freeze-dried meals, cereal bars and long-life treats. Fresh fruit and vegetables do not survive the trip.',
    resource: 'food',
  },
  {
    id: 'packet-days',
    label: 'Three days each',
    line: 'One packet feeds one astronaut for three days. That is why the crew counts packets instead of meals.',
  },
];

/**
 * How many days of food one packet covers, for one astronaut.
 *
 * The one number the whole question turns on, and the thing being tested.
 */
export const DAYS_PER_PACKET = 3;

/** Days in a month, for turning the mission length into a day count. */
export const DAYS_PER_MONTH = 30;

/** The crew size and mission length the child is asked about. */
export interface RationQuestion {
  readonly months: number;
  readonly crewSize: number;
}

/** The question as it is actually asked. */
export const QUESTION: RationQuestion = { months: 2, crewSize: 4 };

/** How long the mission lasts, in days. */
export function missionDays(months: number): number {
  return months * DAYS_PER_MONTH;
}

/**
 * Total astronaut-days of food the mission needs.
 *
 * Named as its own step because it is the one people skip. 60 days is not the
 * answer to anything: it is the length of the trip, and there are four people
 * eating the whole time.
 */
export function astronautDays(months: number, crewSize: number): number {
  return missionDays(months) * crewSize;
}

/**
 * Ration packets the mission needs.
 *
 * Divides, because a packet already carries several days. Getting this backwards
 * is the single most likely mistake, which is why 240 is one of the options.
 */
export function packsFor(months: number, crewSize: number): number {
  return astronautDays(months, crewSize) / DAYS_PER_PACKET;
}

/** The correct answer to QUESTION. */
export const CORRECT_ANSWER = packsFor(QUESTION.months, QUESTION.crewSize);

/**
 * The answer buttons.
 *
 * Just numbers, no per-option text. An earlier version gave every wrong answer its
 * own explanation, which had to be written by hand and could only ever cover the
 * cases somebody thought of. The feedback is now derived from whether the pick is
 * above or below the answer, so it is correct for any value and cannot go stale.
 */
export const CHOICES: readonly number[] = [20, 80, 240, 720];

/** How a chosen amount compares with the answer. */
export type Verdict = 'correct' | 'tooLow' | 'tooHigh';

/** True when `value` is the correct answer. */
export function isCorrect(value: number, correct: number = CORRECT_ANSWER): boolean {
  return value === correct;
}

/**
 * Judge a chosen amount.
 *
 * Anything below the answer is too low and anything above is too high. No "close
 * enough" band: a partial credit rule would need a tolerance chosen by someone,
 * and on a multiple-choice screen for an eight-year-old the only honest options
 * are right or not right.
 */
export function judge(value: number, correct: number = CORRECT_ANSWER): Verdict {
  if (isCorrect(value, correct)) return 'correct';
  return value < correct ? 'tooLow' : 'tooHigh';
}

/**
 * What to say about a wrong answer.
 *
 * Directional rather than specific, which is what makes the option worth locking:
 * "too low, think larger" narrows the remaining answers without naming one. The
 * child still has to choose, and a wrong choice they cannot repeat is a mistake
 * they cannot make twice.
 */
export function hintFor(verdict: Verdict): string | null {
  if (verdict === 'tooLow') return 'That is way too low. Every astronaut needs food for every day, so think larger.';
  if (verdict === 'tooHigh') return 'That is way too high. You are packing more than the crew can eat. Think smaller.';
  return null;
}

/**
 * The working, spelled out for a child who got it wrong.
 *
 * Built from QUESTION rather than written as a fixed sentence. An earlier version
 * hardcoded the prose ("2 months is 60 days...") while the arithmetic lived in
 * another function, which is exactly how a screen ends up showing 60 days beside a
 * question about a different number of months. Here there is one source.
 */
export function workingSentence(months: number = QUESTION.months, crewSize: number = QUESTION.crewSize): string {
  const days = missionDays(months);
  const personDays = astronautDays(months, crewSize);

  return (
    `${months} months is ${days} days. ` +
    `${days} days for each of ${crewSize} astronauts is ${personDays} astronaut-days. ` +
    `Each packet covers ${DAYS_PER_PACKET} days, so ${personDays} divided by ${DAYS_PER_PACKET} is ` +
    `${packsFor(months, crewSize)} packets.`
  );
}

/** The sentence shown after a correct answer, with the real-world mass attached. */
export function successSentence(months: number = QUESTION.months, crewSize: number = QUESTION.crewSize): string {
  const total = packsFor(months, crewSize);

  return (
    `${total} packets. That covers ${astronautDays(months, crewSize)} astronaut-days, ` +
    `at ${DAYS_PER_PACKET} days per packet. ` +
    `That is roughly ${approximateTotalKg(months, crewSize)} kg of food.`
  );
}

/**
 * Rough real-world mass, shown as context and never as the thing being tested.
 *
 * NASA food is commonly quoted at about 1.8 kg per astronaut per day. Stated as
 * "about" on purpose: it varies with what is counted, and a child reading this
 * should learn that the figure means less than the pack count, not more.
 */
export const APPROX_KG_PER_ASTRONAUT_PER_DAY = 1.8;

/** Rough total mass in kilograms, for the context line after a correct answer. */
export function approximateTotalKg(months: number, crewSize: number): number {
  return Math.round(astronautDays(months, crewSize) * APPROX_KG_PER_ASTRONAUT_PER_DAY);
}

/** The question, as shown on screen. */
export const QUESTION_PROMPT =
  'The mission lasts two months. Your crew has four astronauts. How many ration packets must you pack?';