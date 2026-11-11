/**
 * The notes that land on the outpost's desk.
 *
 * Papers Please holds its attention together with a thread about the
 * inspector's family: messages that arrive, that ask for something, and that
 * make the days different from each other. Mars Horizon needs the same thing
 * for a different reason — the sol loop is otherwise the same three orders
 * twelve times, and a day with a letter on it is a day that is not the same as
 * yesterday.
 *
 * These are the warm ones. There is no family waiting at home in trouble, and
 * nothing bad ever happens in them: the game's rule is that losing costs
 * resources and never a life, and a note from home that hints at anything
 * darker would break that rule in the reader's head if not in the code.
 *
 * Every message takes time to arrive, because radio does, and the delay is
 * one of the things the game teaches. The note says how long it took.
 */

import type { ScienceTopic } from './topics';

/** Who a note is from. */
export type NoteFrom = 'home' | 'crew';

/** One note on the desk. */
export interface DeskNote {
  /** Stable key. */
  readonly id: string;
  /** The sol it arrives on. */
  readonly sol: number;
  readonly from: NoteFrom;
  /** Whose it is, in the crew's own words: "Your mother", "Ravi". */
  readonly who: string;
  /** The note itself. Two or three short sentences. */
  readonly text: string;
  /** The topic its fact belongs to, if it has one. */
  readonly topic?: ScienceTopic;
}

/**
 * The notes, in the order they arrive.
 *
 * They are spread out on purpose. A note on every sol would be as
 * predictable as no notes at all; seven over twelve sols means some days
 * have something on the desk and some do not, and that is the shape of a
 * real run.
 */
export const DESK_NOTES: readonly DeskNote[] = [
  {
    id: 'home-2',
    sol: 2,
    from: 'home',
    who: 'Your mother',
    text: 'The tomatoes are doing better than the potatoes. Dad says the rover pictures look better than the ones on the news. Say hello to the tomatoes for me.',
  },
  {
    id: 'crew-3',
    sol: 3,
    from: 'crew',
    who: 'Ravi',
    text: 'I have found a rock that is not a rock. It is a very good rock. I have called it Gerald and I am not taking advice.',
  },
  {
    id: 'home-5',
    sol: 5,
    from: 'home',
    who: 'Your sister',
    text: 'I got the exam result. I got the exam result! Mum said not to say so in case you were busy. You are very busy. I am telling you anyway.',
  },
  {
    id: 'crew-6',
    sol: 6,
    from: 'crew',
    who: 'Mei',
    text: 'Can we have one quiet sol? The greenhouse wants tidying and the plants are growing sideways. They do not know which way is down, so neither do I.',
  },
  {
    id: 'home-8',
    sol: 8,
    from: 'home',
    who: 'Your father',
    text: 'Read a piece about your outpost this morning. Four people in a tin on Mars, keeping each other alive. It did not say your name, but it was you. It was you.',
  },
  {
    id: 'crew-9',
    sol: 9,
    from: 'crew',
    who: 'Jonas',
    text: 'Whoever built the water tank: it works. I have been watching it all morning doing nothing but working. Very satisfying.',
  },
  {
    id: 'home-11',
    sol: 11,
    from: 'home',
    who: 'Your mother',
    text: 'One sol to go, they said. I have made a cake, which is not useful in a tin, but it is the thought. Come home and eat it.',
  },
];

/** The note that arrives on a sol, or null when that sol is a quiet one. */
export function noteForSol(sol: number): DeskNote | null {
  return DESK_NOTES.find((note) => note.sol === sol) ?? null;
}
