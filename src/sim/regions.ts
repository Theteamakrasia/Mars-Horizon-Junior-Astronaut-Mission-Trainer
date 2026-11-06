/**
 * The five candidate landing regions.
 *
 * Pure authored data — no randomness, so the screen is repeatable in a demo
 * and testable without pinning a seed. Every axis is scored 0-5 with higher
 * = better (Dust 5 = safe, Temp 5 = mild). Pin positions are stage
 * percentages so they stay on the same map feature at any window size.
 *
 * `base` and `act` read terrain, sun and dust from here; R-5 stops them
 * importing `landing-site`, so the table lives in `sim/` instead.
 *
 * All five totals stay within ±1 of 17/25, so there is no perfect site.
 */

export type SiteAxis = 'water' | 'sun' | 'terrain' | 'dust' | 'temp';

export const SITE_AXES: readonly SiteAxis[] = ['water', 'sun', 'terrain', 'dust', 'temp'];

export interface SiteScore {
  readonly water: number;
  readonly sun: number;
  readonly terrain: number;
  readonly dust: number;
  readonly temp: number;
}

export interface RegionPin {
  readonly x: number; // stage percentage, 0-100
  readonly y: number; // stage percentage, 0-100
}

export interface Region {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  readonly pin: RegionPin;
  readonly scores: SiteScore;
}

export const REGIONS: readonly Region[] = [
  {
    id: 'arcadia',
    name: 'Arcadia Planitia',
    blurb: 'Flat, open plains with plenty of buried ice. Easy to build on, but cold at night.',
    pin: { x: 20, y: 30 },
    scores: { water: 5, sun: 3, terrain: 5, dust: 3, temp: 2 },
  },
  {
    id: 'jezero',
    name: 'Jezero Crater',
    blurb: 'An ancient lakebed with a river delta. Rich in rock samples, but dusty.',
    pin: { x: 50, y: 40 },
    scores: { water: 4, sun: 4, terrain: 3, dust: 3, temp: 3 },
  },
  {
    id: 'olympus',
    name: 'Olympus Mons',
    blurb: 'The tallest volcano in the solar system. Great sun, but steep and cold.',
    pin: { x: 80, y: 25 },
    scores: { water: 2, sun: 5, terrain: 2, dust: 4, temp: 3 },
  },
  {
    id: 'valles',
    name: 'Valles Marineris',
    blurb: 'A giant canyon system. Sheltered from storms, but hard to land in.',
    pin: { x: 70, y: 60 },
    scores: { water: 4, sun: 3, terrain: 2, dust: 4, temp: 3 },
  },
  {
    id: 'argyre',
    name: 'Argyre Basin',
    blurb: 'A wide impact basin that may have held water. Flat and mild, but far from the equator.',
    pin: { x: 30, y: 70 },
    scores: { water: 4, sun: 3, terrain: 4, dust: 2, temp: 4 },
  },
];

/**
 * Sum every axis into one total, 0-25.
 */
export function totalScore(score: SiteScore): number {
  return score.water + score.sun + score.terrain + score.dust + score.temp;
}
