/**
 * The mission briefing, as data.
 *
 * Pure: no DOM, no timer, no randomness. The reveal timing lives in `view.ts`
 * because it is presentation; the words and their order live here so they can be
 * asserted on without a browser.
 *
 * Copy rules, from the project README's design promise: a child of eight has to
 * be able to read this without help. Short sentences, no unexplained jargon, and
 * every technical term either avoided or introduced in the same breath.
 */

/** One paragraph of the briefing. */
export interface BriefingBeat {
  /** Stable key, used by the view to reveal beats in order and by tests to name them. */
  readonly id: string;
  readonly text: string;
  /** Roughly how long this line takes to read aloud, used to pace the reveal. */
  readonly weight: number;
}

/**
 * The beats, in order.
 *
 * `weight` is a rough read-time multiplier rather than a character count, so a
 * line of dialogue can be given more time than a line of description without
 * hard-coding a duration per beat.
 */
export const BEATS: readonly BriefingBeat[] = [
  {
    id: 'crew',
    text: 'You are the newest astronaut on the crew.',
    weight: 1,
  },
  {
    id: 'veterans',
    text: 'Two others have flown to space before. You have not. They know what a real mission looks like, and they will show you.',
    weight: 2,
  },
  {
    id: 'task',
    text: 'The three of you have been sent to Mars to build an outpost. It has to keep your crew alive once the rocket leaves.',
    weight: 2,
  },
  {
    id: 'never-alone',
    text: 'Nobody is coming to help. There is no rescue mission. Whatever you build, you build it yourself.',
    weight: 2,
  },
  {
    id: 'supplies',
    text: 'Everything you need is already on the ship: power, air, water, food and shields against the radiation.',
    weight: 2,
  },
  {
    id: 'balance',
    text: 'None of it lasts. Spend more of one and you have less of everything else. That is the whole job.',
    weight: 2,
  },
  {
    id: 'ready',
    text: 'Your crew is waiting. Are you ready?',
    weight: 1,
  },
];

/** Total weight of all beats, so the reveal can be paced as a whole. */
export function totalWeight(beats: readonly BriefingBeat[] = BEATS): number {
  return beats.reduce((total, beat) => total + beat.weight, 0);
}

/** The beats up to and including `id`, in order. */
export function beatsThrough(id: string, beats: readonly BriefingBeat[] = BEATS): BriefingBeat[] {
  const index = beats.findIndex((beat) => beat.id === id);
  if (index < 0) return [];

  return beats.slice(0, index + 1);
}

/**
 * How long one beat takes to type, in milliseconds.
 *
 * Capped per beat: a long line should take longer, but never long enough that a
 * child waits through what reads like a hang. `charsPerSecond` is slow on
 * purpose — this is an eight-year-old's briefing, not a terminal.
 */
export const CHARS_PER_SECOND = 26;

/** Longest a single beat may take before it is cut short. */
export const MAX_BEAT_MS = 2600;

export function beatDuration(beat: BriefingBeat, charsPerSecond = CHARS_PER_SECOND): number {
  const base = (beat.text.length / charsPerSecond) * 1000 * beat.weight;
  return Math.round(Math.min(base, MAX_BEAT_MS));
}

/**
 * The greeting line, with the player's name in it.
 *
 * The name is inserted as data and never as markup: `view.ts` sets it through
 * `textContent`, and this only produces the string.
 */
export function greetingFor(name: string): string {
  const trimmed = name.trim();

  return trimmed === '' ? 'Welcome aboard.' : `Welcome aboard, ${trimmed}.`;
}