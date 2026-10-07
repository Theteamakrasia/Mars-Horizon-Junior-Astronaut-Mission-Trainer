/**
 * Name rules for the main menu.
 *
 * Pure: no DOM, no storage, no randomness. Every test input is a literal, because
 * a test that depends on Math.random is how the suite ended up failing 40% of the
 * time (ISS-015).
 *
 * The player's name is held in memory only for now. Supabase is deferred (D-003),
 * so a refresh loses it — see docs/team/issues.md.
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