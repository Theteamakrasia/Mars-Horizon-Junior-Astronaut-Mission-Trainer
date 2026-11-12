/**
 * Preload and decode the interior "boy" sprite strips before room exploration.
 *
 * The strips are used as CSS background images in the interior tour. Without an
 * explicit preload/decode, the browser may fetch a strip the first time its
 * animation is shown, which can flash an empty or wrong frame when the player
 * switches poses (for example on the first step). Keeping decoded Image objects
 * alive also keeps the decoded data cached for the CSS backgrounds.
 *
 * DOM-only: this creates Image elements and calls decode(). Call
 * `preloadInteriorSprites()` as early as possible in the journey (before
 * `#/interior`) so every strip is ready when room exploration begins.
 */

import walkLeftUrl from '../../Assets/images/interior/sprite/walk-left.webp';
import walkRightUrl from '../../Assets/images/interior/sprite/walk-right.webp';
import interactUrl from '../../Assets/images/interior/sprite/interact.webp';
import interactAltUrl from '../../Assets/images/interior/sprite/interact-alt.webp';
import pointLeftUrl from '../../Assets/images/interior/sprite/point-left.webp';
import pointRightUrl from '../../Assets/images/interior/sprite/point-right.webp';

/** One animation strip, keyed by the name the interior model returns. */
export const INTERIOR_SPRITE_URLS = {
  'walk-left': walkLeftUrl,
  'walk-right': walkRightUrl,
  interact: interactUrl,
  'interact-alt': interactAltUrl,
  'point-left': pointLeftUrl,
  'point-right': pointRightUrl,
} as const;

/** Hold references so the decoded images stay cached for the lifetime of the page. */
const spriteImages: HTMLImageElement[] = [];
let spritesReady: Promise<void> | null = null;

/**
 * Load and decode every sprite strip. Idempotent: later calls return the same
 * promise, so it is safe to trigger from boot, from an earlier screen, and from
 * the interior mount itself.
 */
export function preloadInteriorSprites(): Promise<void> {
  if (spritesReady !== null) return spritesReady;

  spritesReady = Promise.all(
    Object.values(INTERIOR_SPRITE_URLS).map(async (url) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      spriteImages.push(image);

      try {
        await image.decode();
      } catch {
        /* A failed decode must not block the room: the browser can try on use. */
      }
    }),
  ).then(() => undefined);

  return spritesReady;
}

// Kick off as soon as this module is evaluated so the strips start loading even
// before the first explicit preload call in the journey.
if (typeof window !== 'undefined') void preloadInteriorSprites();
