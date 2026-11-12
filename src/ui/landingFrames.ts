/**
 * The landing sequence's five frames.
 *
 * The pictures live here rather than in the feature that draws them, because
 * two things want them and neither of them is the feature: the film needs the
 * URLs to show the frames, and the shell needs them to fetch the frames
 * before the player ever gets near them.
 *
 * **Why they are fetched early.** The film is a moment the player is waiting
 * for. Five pictures is real weight, and fetching them when the game starts
 * means they are in the cache, and decoded, long before the map is on screen.
 * By the time the player presses LAND HERE the film can start on its first
 * frame instead of waiting for a download nobody asked for.
 *
 * The keys are the names the cinematic's model gives the frames. The feature
 * types its table against them, so a frame renamed in one place and not the
 * other does not compile.
 *
 * The pictures are WebP, converted from the supplied JPEG by
 * `tools/compress-cinematic-frames.py`. The originals are kept beside them in
 * `source/`.
 */

import approachUrl from '../../Assets/images/landing-cinematic/02-approach.webp';
import chuteFarUrl from '../../Assets/images/landing-cinematic/03-chute-far.webp';
import chuteMidUrl from '../../Assets/images/landing-cinematic/04-chute-mid.webp';
import chuteNearUrl from '../../Assets/images/landing-cinematic/05-chute-near.webp';
import chuteLandingUrl from '../../Assets/images/landing-cinematic/06-chute-landing.webp';

/** Every frame of the landing sequence, by the name the model gives it. */
export const LANDING_FRAME_URLS = {
  approach: approachUrl,
  chuteFar: chuteFarUrl,
  chuteMid: chuteMidUrl,
  chuteNear: chuteNearUrl,
  chuteLanding: chuteLandingUrl,
} as const;

/**
 * Fetch and decode the frames now, so the film can start instantly later.
 *
 * Safe to call at any time: a frame that will not decode is left out, and the
 * film waits for whatever is ready when it mounts.
 */
export function preloadLandingFrames(): void {
  for (const url of Object.values(LANDING_FRAME_URLS)) {
    const picture = new Image();

    picture.src = url;

    void picture.decode().catch(() => undefined);
  }
}
