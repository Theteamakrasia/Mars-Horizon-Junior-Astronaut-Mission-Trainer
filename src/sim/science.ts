/**
 * The science score and the rank it earns.
 *
 * Decision D-049: activities award science points, `RunState.science` totals
 * them across the run, and the debrief shows the total and the rank.
 *
 * This measures *science done*, not whether the run was won. A run that did a
 * great deal of science and then ran out of water still did the science, and
 * the debrief says that in separate words — the rank never implies the player
 * won, because the debrief's own section explains the outcome first.
 *
 * Pure. No DOM, no network, no randomness: the same run always earns the same
 * rank, so a demo repeats and a test can pin it.
 */

/** One rung on the ladder. */
export interface ScienceRank {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  /** The lowest score that earns this rank. */
  readonly min: number;
}

/**
 * The ladder, lowest first.
 *
 * The bands are twelve points apart because a twelve-sol run can earn twelve
 * day-log points on its own, so the first band covers "you did not get far"
 * and the top band needs both survival and good choices.
 */
export const SCIENCE_RANKS: readonly ScienceRank[] = [
  { id: 'explorer', title: 'Explorer', icon: '🌱', min: 0 },
  { id: 'field-scientist', title: 'Field Scientist', icon: '🔬', min: 12 },
  { id: 'research-lead', title: 'Research Lead', icon: '🧪', min: 24 },
  { id: 'senior-scientist', title: 'Senior Scientist', icon: '🛰️', min: 36 },
  { id: 'chief-scientist', title: 'Chief Martian Scientist', icon: '🏅', min: 48 },
];

/**
 * Points for keeping the crew alive and writing the day up.
 *
 * Awarded for every sol, whether it was spent on an activity or on a crisis.
 * It is small on purpose: the score should mostly move because of the
 * player's choices, not because time passed.
 */
export const SOL_LOG_POINTS = 1;

/** A score that is not a number cannot be ranked, so it is treated as zero. */
function safePoints(points: number): number {
  if (!Number.isFinite(points)) return 0;

  return Math.max(0, points);
}

/** The rank a score earns. Never throws: a bad score is the lowest rank. */
export function rankFor(points: number): ScienceRank {
  const total = safePoints(points);

  let found: ScienceRank = SCIENCE_RANKS[0] as ScienceRank;

  for (const rank of SCIENCE_RANKS) {
    if (total >= rank.min) found = rank;
  }

  return found;
}

/** How far along the ladder the player is. */
export interface ScienceProgress {
  /** The rank the score earns now. */
  readonly current: ScienceRank;
  /** The rank above it, or null at the top. */
  readonly next: ScienceRank | null;
  /** 0-100: how far through the current band the score is. */
  readonly percent: number;
  /** How many more points to the next rank, or zero at the top. */
  readonly toNext: number;
}

/**
 * The score, the rank, and the road to the next one.
 *
 * At the top rank there is no next, so `percent` is 100 and `toNext` is zero
 * rather than NaN — the debrief draws a progress bar from these numbers, and
 * a NaN would leave it blank.
 */
export function rankProgress(points: number): ScienceProgress {
  const total = safePoints(points);
  const current = rankFor(total);
  const index = SCIENCE_RANKS.findIndex((rank) => rank.id === current.id);
  const next = index >= 0 ? (SCIENCE_RANKS[index + 1] ?? null) : null;

  if (next === null) {
    return { current, next: null, percent: 100, toNext: 0 };
  }

  const span = next.min - current.min;
  const into = total - current.min;

  return {
    current,
    next,
    percent: span > 0 ? Math.min(100, Math.max(0, Math.round((into / span) * 100))) : 100,
    toNext: Math.max(0, next.min - total),
  };
}
