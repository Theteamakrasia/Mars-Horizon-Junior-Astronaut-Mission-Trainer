/**
 * Pure scoring rules for the landing-site screen.
 *
 * The region table lives in `sim/regions.ts` so `base` and `act` can read
 * terrain, sun and dust without importing this feature (R-5). This file owns
 * the scoring functions and the tradeoff summary.
 *
 * No DOM, no network, no Math.random — `npm run check` enforces the first two
 * and a random score would make the screen unrepeatable in a demo and
 * untestable without pinning a seed.
 *
 * Task: TASK-028.
 */

import {
  REGIONS,
  SITE_AXES,
  type Region,
  type SiteAxis,
  type SiteScore,
  totalScore as regionTotalScore,
} from '../../sim/regions';

export { REGIONS, SITE_AXES };
export type { Region, SiteAxis, SiteScore };

/**
 * Score one region across all five axes. Pure. Returns a safe all-zero score
 * for an unknown id rather than throwing.
 */
export function scoreRegion(regionId: string): SiteScore {
  const region = REGIONS.find((r) => r.id === regionId);

  if (!region) {
    return { water: 0, sun: 0, terrain: 0, dust: 0, temp: 0 };
  }

  return region.scores;
}

/**
 * Sum every axis into one total, 0-25.
 */
export function totalScore(score: SiteScore): number {
  return regionTotalScore(score);
}

/**
 * The strongest and weakest axis for a score, in SITE_AXES order to break
 * ties deterministically. Used by the panel to explain the tradeoff without
 * recommending a winner.
 */
export function strengthAndWeakness(score: SiteScore): {
  readonly strength: SiteAxis;
  readonly weakness: SiteAxis;
} {
  let strength: SiteAxis = SITE_AXES[0];
  let weakness: SiteAxis = SITE_AXES[0];

  for (const axis of SITE_AXES) {
    if (score[axis] > score[strength]) strength = axis;
    if (score[axis] < score[weakness]) weakness = axis;
  }

  return { strength, weakness };
}

/**
 * A one-line reason the region is a gamble either way. Names the strongest
 * and weakest axis, never a "recommended" site. There is no perfect choice.
 */
export function tradeoffSummary(score: SiteScore): string {
  const { strength, weakness } = strengthAndWeakness(score);

  return `Strong on ${strength}, weak on ${weakness}.`;
}
