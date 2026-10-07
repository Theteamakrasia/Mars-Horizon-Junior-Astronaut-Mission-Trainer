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
}

/**
 * The beats, in order.
 *
 * Five, not seven, and none longer than about ninety characters. An earlier
 * version ran seven beats to up to 124 characters each, which was three screens
 * of clicking before anything happened - long enough that a child stopped
 * reading and started mashing. The arc is the same, just compressed: who you
 * are, what you are building, that nobody is coming, the five things that run
 * out, and go.
 *
 * There is no pacing field and no read-time calculation. The reader clicks NEXT
 * and the next line appears, so how long a line ought to sit on screen is the
 * reader's decision rather than the model's. An earlier version weighted each
 * beat and computed a duration to auto-reveal it; that machinery became dead the
 * moment the reveal became click-driven, and dead exports in a pure model are
 * worse than none — they read as a contract that nothing honours.
 */
export const BEATS: readonly BriefingBeat[] = [
  {
    id: 'crew',
    text: 'You are the newest astronaut here. Two others have flown to space. You have not.',
  },
  {
    id: 'task',
    text: 'The three of you are going to Mars to build an outpost that has to keep you alive.',
  },
  {
    id: 'never-alone',
    text: 'Nobody is coming to help. Whatever you build, you build it yourself.',
  },
  {
    id: 'balance',
    text: 'Power, air, water, food, shields. None of it lasts. Spend more of one and you have less of everything else.',
  },
  {
    id: 'ready',
    text: 'Are you ready?',
  },
];

/** The beats up to and including `id`, in order. */
export function beatsThrough(id: string, beats: readonly BriefingBeat[] = BEATS): BriefingBeat[] {
  const index = beats.findIndex((beat) => beat.id === id);
  if (index < 0) return [];

  return beats.slice(0, index + 1);
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