/**
 * Name rules for the main menu, and what the menu says to a player who has been
 * here before.
 *
 * Pure: no DOM, no storage, no randomness. Every test input is a literal, because
 * a test that depends on Math.random is how the suite ended up failing 40% of the
 * time (ISS-015).
 *
 * The words live here rather than in the view so they can be asserted on. The
 * name and the run themselves are written down in `ui/save.ts`; this file never
 * sees a save, only the three facts about it that change the sentence (D-081).
 */

/**
 * Longest accepted name, in code points.
 *
 * Counted in code points rather than UTF-16 units so an emoji counts as one
 * character rather than two. The input carries a matching `maxlength`, which the
 * browser enforces in UTF-16 units, so a name containing an emoji can be refused
 * by the browser at 24 units while validateName would accept it at 24 code points.
 * That errs toward refusing input, which is the safe direction for a field.
 */
export const MAX_NAME_LENGTH = 24;

/** Why a name was rejected, or null when it is fine. */
export type NameProblem = 'empty' | 'too-long';

export interface NameCheck {
  /** Whether the name may be used. */
  readonly ok: boolean;
  /** The cleaned-up name. Present even when invalid, so a form can echo it back. */
  readonly value: string;
  readonly problem: NameProblem | null;
}

/**
 * Trim the ends and collapse runs of whitespace to a single space.
 *
 * Collapsing matters more than it looks: without it a name pasted with a newline
 * renders on two lines and breaks the greeting's layout.
 */
export function normaliseName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Decide whether a name is usable.
 *
 * Returns the normalised value alongside the verdict so a caller never has to
 * normalise twice and risk disagreeing with itself.
 */
export function checkName(raw: string): NameCheck {
  const value = normaliseName(raw);

  if (value === '') return { ok: false, value, problem: 'empty' };

  if ([...value].length > MAX_NAME_LENGTH) return { ok: false, value, problem: 'too-long' };

  return { ok: true, value, problem: null };
}

/**
 * A safe form of the name for display, in case anything unexpected gets through.
 *
 * Called by the view rather than trusted at the call site, because this is the one
 * string that ends up interpolated into markup.
 */
export function displayName(raw: string): string {
  const { value } = checkName(raw);

  // Strip control characters, which have no business in a rendered greeting and
  // would not survive being shown.
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_NAME_LENGTH);
}

/* ------------------------------------------------------- the returning menu -- */

/** What the menu knows about a run that was found on this device. */
export interface ReturningPlayer {
  readonly name: string;
  /** The sols already flown. Zero means the run has not had one yet. */
  readonly sol: number;
  /** True once a landing site has been chosen, so an outpost exists. */
  readonly landed: boolean;
  /** True when the run is over, one way or the other. */
  readonly finished: boolean;
}

/** The two lines the menu shows instead of asking for a name again. */
export interface ReturningMenu {
  readonly greeting: string;
  readonly note: string;
}

/**
 * Greet the player by the name they gave last time, and say where they stopped.
 *
 * The note is the honest reason CONTINUE is worth pressing: "sol 4" tells a
 * child that four days of work are behind that button. It is a sentence about
 * the *run*, not about the save — a run that never landed has no outpost to
 * return to, and saying so is better than an empty line.
 */
export function returningMenu(player: ReturningPlayer): ReturningMenu {
  const who = displayName(player.name);

  const greeting = who === '' ? 'Welcome back, astronaut.' : `Welcome back, ${who}.`;

  if (player.finished) {
    return { greeting, note: 'Your mission is over — the report is waiting.' };
  }

  if (!player.landed) {
    return { greeting, note: 'Your spacecraft is still on the launch pad.' };
  }

  if (player.sol <= 0) {
    return { greeting, note: 'Your outpost is built and waiting for its first sol.' };
  }

  return { greeting, note: `You stopped on sol ${player.sol}.` };
}