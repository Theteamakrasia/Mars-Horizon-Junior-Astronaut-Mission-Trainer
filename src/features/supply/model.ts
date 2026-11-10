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
 * The real-world mass stays a separate labelled line and is never the thing being
 * tested. There is no single NASA figure for grams of food per astronaut per day:
 * it depends on whether packaging and water are counted, so quoting one as
 * official would be the faked precision the README rules out.
 *
 * **And the numbers change every run.** A fixed question has a fixed answer, and
 * a fixed answer is a number a child memorises instead of a calculation they do:
 * the second time through, 80 is a guess that works. So the mission length
 * varies, the answer moves with it, and all four options are worked out from the
 * question on screen rather than written down once. The options are also in a
 * different order each run, so there is no button to memorise either.
 *
 * The variation is seeded from the astronaut's name — the one thing that changes
 * between runs — rather than from a random number. That keeps the promise the
 * rest of the project keeps: the same astronaut always gets the same board, so a
 * demo repeats and a test can pin it.
 */

import { CREW_SIZE } from '../../sim/modules';

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

/**
 * The mission lengths the ration check can ask about, in months.
 *
 * With a crew of four and three days to a packet, the answer is `months x 40`,
 * so these give 40, 80, 120, 160, 200 and 240 packets. Six is enough that a
 * child who plays more than a couple of runs will meet numbers they have not
 * seen, and few enough that every answer is still a tidy number a child can
 * check by hand.
 */
export const MISSION_MONTHS: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * A stable number from the astronaut's name.
 *
 * The ration check has to be different every run, or the answer is one number
 * forever and a child learns the number instead of the calculation. It cannot
 * be random: a demo must repeat and a test must be able to pin it. So it is
 * derived from the one thing that changes between runs — whose mission this is.
 *
 * FNV-1a: small, well known, and it spreads short strings like "Ada" and "Bob"
 * across the range instead of clustering them.
 */
export function seedFrom(name: string): number {
  let hash = 2166136261;

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash >>> 0;
}

/**
 * The question for a seed.
 *
 * The crew size is the real crew size, read from the sim rather than typed in
 * here: the briefing tells the player there are four of them, and the ration
 * question has to agree (ISS-044).
 */
export function questionFor(seed: number): RationQuestion {
  const months = MISSION_MONTHS[seed % MISSION_MONTHS.length] ?? 2;

  return { months, crewSize: CREW_SIZE };
}

/** The question as it is asked when nothing has been seeded. */
export const QUESTION: RationQuestion = questionFor(seedFrom(''));

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
 * A deterministic shuffle.
 *
 * The same seed always gives the same order, so a demo repeats and a test can
 * pin it. `Math.random()` is not an option here: the whole point is that the
 * same astronaut gets the same board every time.
 */
function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = (seed >>> 0) || 1;

  for (let index = out.length - 1; index > 0; index -= 1) {
    /* A small linear congruential generator: deterministic, and more than
       enough to shuffle four numbers. */
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    const swap = state % (index + 1);
    const held = out[index] as T;

    out[index] = out[swap] as T;
    out[swap] = held;
  }

  return out;
}

/**
 * The four answers on the board, each one a specific mistake.
 *
 * Every option is worked out from the question on screen, so they are always
 * right for it and never need authoring — and they are the four mistakes a
 * child actually makes:
 *
 *   - the answer: everything, done properly
 *   - forgot the crew: packed for one astronaut
 *   - forgot the packet size: counted astronaut-days, not packets
 *   - forgot both: divided the days by three and stopped there
 *
 * The order is shuffled by the seed as well, so there is no button to memorise
 * either. A run where the answer is always second is a run where the second
 * button is the answer, and the calculation stops mattering.
 */
export function choicesFor(question: RationQuestion, seed = 0): readonly number[] {
  const days = missionDays(question.months);
  const personDays = astronautDays(question.months, question.crewSize);

  const options = [
    packsFor(question.months, question.crewSize),
    days / DAYS_PER_PACKET,
    personDays,
    days,
  ];

  return shuffle(options, seed);
}

/**
 * The answer buttons.
 *
 * Just numbers, no per-option text. An earlier version gave every wrong answer its
 * own explanation, which had to be written by hand and could only ever cover the
 * cases somebody thought of. The feedback is now derived from whether the pick is
 * above or below the answer, so it is correct for any value and cannot go stale.
 */
export const CHOICES: readonly number[] = choicesFor(QUESTION, seedFrom(''));

/**
 * The question, as asked.
 *
 * Built from the question rather than written as a fixed sentence: an earlier
 * version hardcoded the prose while the arithmetic lived in another function,
 * which is exactly how a screen ends up asking about two months and answering
 * about three.
 */
export function promptFor(question: RationQuestion): string {
  const months = numberWord(question.months);
  const crew = numberWord(question.crewSize);

  return (
    `The mission lasts ${months} ${question.months === 1 ? 'month' : 'months'}. ` +
    `Your crew has ${crew} astronauts. How many ration packets must you pack?`
  );
}

/** Small numbers as words, so the sentence reads like speech. */
const NUMBER_WORDS: readonly string[] = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** The word for a small number, or the number itself when it is not small. */
function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

/** The question as it is actually asked. */
export const QUESTION_PROMPT = promptFor(QUESTION);

/**
 * The whole ration puzzle for one run.
 *
 * One call, so the screen cannot show a question from one place and options
 * from another. That was the bug this shape exists to prevent: the number under
 * test and the buttons on the wall have to come from the same question.
 */
export interface RationPuzzle {
  readonly question: RationQuestion;
  /** The number the player is asked for. */
  readonly correct: number;
  /** The four buttons, in the order they are shown. */
  readonly choices: readonly number[];
  /** The question as it is spoken. */
  readonly prompt: string;
}

/** The ration puzzle for the astronaut with this name. */
export function puzzleFor(name: string): RationPuzzle {
  const seed = seedFrom(name);
  const question = questionFor(seed);

  return {
    question,
    correct: packsFor(question.months, question.crewSize),
    choices: choicesFor(question, seed),
    prompt: promptFor(question),
  };
}

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
 * The blank the working leaves for the answer while the player is still working.
 *
 * The working ends with the number under test - "so 240 divided by 3 is 80
 * packets" - so putting it on screen put the answer in front of the player for
 * as long as they were looking at it. That is no use to a question meant to be
 * worked out: the number stops being a number under test and becomes a number
 * to read.
 *
 * So the sentence is shown with the answer left out, and completed only once the
 * answer has actually been earned.
 */
export const ANSWER_BLANK = '___';

/**
 * The working, as one sentence with the answer at the end.
 *
 * Built from QUESTION rather than written as a fixed sentence. An earlier version
 * hardcoded the prose ("2 months is 60 days...") while the arithmetic lived in
 * another function, which is exactly how a screen ends up showing 60 days beside a
 * question about a different number of months. Here there is one source.
 *
 * The tail is a parameter rather than being built here, so the version with the
 * answer and the version without it cannot drift apart. Two separate sentences
 * would be two places for the same arithmetic to be restated, which is the
 * mistake this function exists to prevent.
 */
function workingText(tail: string, months: number, crewSize: number): string {
  const days = missionDays(months);
  const personDays = astronautDays(months, crewSize);

  return (
    `${months} months is ${days} days. ` +
    `${days} days for each of ${crewSize} astronauts is ${personDays} astronaut-days. ` +
    `Each packet covers ${DAYS_PER_PACKET} days, so ${personDays} divided by ${DAYS_PER_PACKET} is ` +
    tail
  );
}

/** The working, with the answer in it. Shown once the answer has been earned. */
export function workingSentence(months: number = QUESTION.months, crewSize: number = QUESTION.crewSize): string {
  return workingText(`${packsFor(months, crewSize)} packets.`, months, crewSize);
}

/**
 * The working, with the answer left out. Shown while the player is still trying.
 *
 * The method is the part worth showing: the days, the astronaut-days and the
 * division. The number it arrives at is the thing being tested, so it is left
 * as a blank for the player to fill in.
 */
export function workingSentenceBlanked(
  months: number = QUESTION.months,
  crewSize: number = QUESTION.crewSize,
): string {
  return workingText(`${ANSWER_BLANK} packets.`, months, crewSize);
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

/*
  The keyboard rules.
  ---------------------
  Two questions the screen has to answer about a key press, kept here because they
  are rules and not plumbing: a rule that cannot be asserted is a rule that will
  be broken by the next person who tidies the view file.

  The screen's own words for it are in ./view.ts; these are the decisions.
*/

/** The modifier keys that were held down with a key press. */
export interface KeyModifiers {
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
}

/**
 * True when a key press is a plain Enter, which is the only key this screen answers.
 *
 * A modified Enter is somebody's shortcut, not a request to move the story on:
 * Alt+Enter, Ctrl+Enter and the Windows key all belong to the browser or the
 * operating system, and answering them would move the beat on under a key the
 * player never meant to press.
 */
export function isPlainEnter(key: string, modifiers: KeyModifiers): boolean {
  if (key !== 'Enter') return false;

  return !modifiers.alt && !modifiers.ctrl && !modifiers.meta;
}

/**
 * True when the focused element deals with Enter itself, so the screen must not.
 *
 * Enter on a focused button already fires a click, and the browser gives a
 * focused link the same treatment. Handling those here as well would advance
 * twice on one press - and on a question screen, twice means the wrong answer.
 *
 * The text fields are here for the same reason as on the interior screen: there
 * are none on this screen today, and the next person to add one should not have
 * to remember that Enter in a field is the player's business, not the screen's.
 */
export function focusHandlesEnter(tagName: string): boolean {
  switch (tagName) {
    case 'BUTTON':
    case 'A':
    case 'INPUT':
    case 'TEXTAREA':
    case 'SELECT':
      return true;
    default:
      return false;
  }
}