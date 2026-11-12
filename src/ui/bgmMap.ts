/**
 * Background music tracks and route mapping.
 *
 * Data only: imports bundled MP3s so Vite fingerprints them, and describes
 * which route gets which track. Playback lives in `bgm.ts`.
 *
 * Credits and license notes are kept in `Assets/audio/bgm/Mars_Horizon_BGM_Credits.txt`
 * (Pixabay tracks; do not redistribute as standalone audio).
 */

import type { Route } from './routes';

import menuUrl from '../../Assets/audio/bgm/menu.mp3';
import ambientUrl from '../../Assets/audio/bgm/ambient.mp3';
import takeOffUrl from '../../Assets/audio/bgm/take-off.mp3';
import baseUrl from '../../Assets/audio/bgm/base.mp3';
import actUrl from '../../Assets/audio/bgm/act.mp3';
import debriefUrl from '../../Assets/audio/bgm/debrief.mp3';

export interface BgmDef {
  readonly src: string;
  /** Peak trim, 0..1. */
  readonly gain: number;
}

export const BGM = {
  menu: { src: menuUrl, gain: 0.30 },
  ambient: { src: ambientUrl, gain: 0.15 },
  'take-off': { src: takeOffUrl, gain: 0.10 },
  base: { src: baseUrl, gain: 0.15 },
  act: { src: actUrl, gain: 0.20 },
  debrief: { src: debriefUrl, gain: 0.20 },
} as const satisfies Readonly<Record<string, BgmDef>>;

export type BgmId = keyof typeof BGM;

export const BGM_IDS = Object.keys(BGM) as readonly BgmId[];

/**
 * The track for a route.
 *
 * `null` means keep the current track (used for reference/overlay screens like
 * the encyclopedia, so opening it does not interrupt the music underneath).
 */
export function bgmForRoute(route: Route): BgmId | null {
  switch (route) {
    case 'naming':
    case 'landing':
      return 'menu';
    case 'briefing':
    case 'landing-site':
      return 'ambient';
    case 'supply':
    case 'launch':
    case 'interior':
    case 'landing-cinematic':
      return 'take-off';
    case 'base':
      return 'base';
    case 'act':
      return 'act';
    case 'debrief':
      return 'debrief';
    case 'encyclopedia':
      return null;
  }
}
