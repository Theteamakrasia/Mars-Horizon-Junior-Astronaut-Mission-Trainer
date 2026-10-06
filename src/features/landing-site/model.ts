/**
 * STUB — not implemented. Every export here throws.
 *
 * Pure rules for the landing-site screen. No DOM, no network, no Math.random —
 * `npm run check` enforces the first two and a random score would make the
 * screen unrepeatable in a demo and untestable without pinning a seed.
 *
 * The shape below is taken from the project README: five axes, scored 0-5.
 *
 * Task: TASK-028. The best first task in the project — nothing here depends on
 * the resource model. See ../README.md.
 */

/** The five Site Analysis axes. */
export type SiteAxis = 'water' | 'sun' | 'terrain' | 'dust' | 'temp';

export const SITE_AXES: readonly SiteAxis[] = ['water', 'sun', 'terrain', 'dust', 'temp'];

/**
 * A score per axis, each 0-5.
 *
 * Deliberately not a Record: a named field means the compiler catches a missing
 * axis, and the panel has to show all five anyway.
 */
export interface SiteScore {
  readonly water: number;
  readonly sun: number;
  readonly terrain: number;
  readonly dust: number;
  readonly temp: number;
}

/** One candidate region. Ids match the project README's five regions. */
export interface Region {
  readonly id: string;
  readonly name: string;
}

/** The five regions: Arcadia Planitia, Jezero Crater, Olympus Mons, Valles Marineris, Argyre Basin. */
export const REGIONS: readonly Region[] = [];

/** Score one region across all five axes. Pure. */
export function scoreRegion(_regionId: string): SiteScore {
  throw new Error('STUB: features/landing-site/model.ts is not implemented. See ../README.md.');
}

/**
 * A one-line reason the region is a gamble either way.
 *
 * There is no perfect choice, and the screen should say so rather than
 * recommending a winner. NASA picked Jezero Crater not because it is the best
 * place but because it is the most interesting one.
 */
export function tradeoffSummary(_score: SiteScore): string {
  throw new Error('STUB: features/landing-site/model.ts is not implemented.');
}