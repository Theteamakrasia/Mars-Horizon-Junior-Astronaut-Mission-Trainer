/**
 * The landing cinematic: the timeline, in one place.
 *
 * Pure: no DOM, no clock, no randomness. Every input is a literal, so this
 * file cannot flake — the defect recorded as ISS-015.
 *
 * Where the camera points, and why
 * -------------------------------
 * The five supplied frames are measured by eye against the artwork, and the
 * numbers below are in the file on purpose. A camera move is only as good as
 * the reading of the picture behind it, and a reader arriving in six weeks has
 * no way to check those numbers against anything. Recording the measurements
 * next to the values means the next person can verify the framing rather than
 * trust it.
 *
 *   02 approach (1600x900)
 *     the spacecraft   x  8-32%   y 30-62%   centre ~ (14%, 47%)
 *     the Mars limb    x 55-100%  y  0-100%
 *     the sun          x  4-12%   y 10-22%
 *     therefore: push in toward the limb on the right, drifting that way, with
 *     a roll of no more than 1.5 degrees. The engine glow stays at 14% / 47%.
 *
 *   03, 04, 05 chute (1365x768)
 *     the parachute and the capsule   x 38-62%   y 15-60%
 *     the ground                      y 78-100%
 *     therefore: push toward the centre from 50% / 42%, and never past 1.12x,
 *     because those three frames are 1365 pixels wide and a bigger zoom on a
 *     large screen would show the pixels.
 *
 *   06 landing (1600x900)
 *     the parachute and the capsule   x 44-66%   y 10-78%
 *     the ground                      y 72-100%
 *     therefore: grow from the bottom of the frame, so the ground rises toward
 *     the camera, with the whole frame swaying very slightly.
 *
 * ONE WAY DOWN, the whole time
 * -----------------------------
 * The descent is one move and never stops: 1.00, 1.06, 1.08, 1.10, 1.15.
 * Every frame from the first chute picture to the last grows from the **same
 * point** — the bottom of the frame — so the ground stays where it is while
 * the capsule comes down towards it.
 *
 * That is the whole fix for the move that read as a zoom-out. The landing
 * frame used to grow from the bottom while the chute frame before it grew from
 * the middle, and the two disagreed about where the ground was: the dissolve
 * showed the same picture at two different sizes and it read as the camera
 * pulling back. One origin for the whole descent, and the zoom only ever goes
 * the same way.
 *
 * The approach frame grows from the middle and the descent from the bottom,
 * and that change is hidden: the black beat sits between them, so the one
 * place the origin moves is a place nothing is showing.
 *
 * Nothing here is load-bearing
 * -----------------------------
 * Every picture's resting state is the state that should be on screen if no
 * animation ever runs: the layers are transparent and the frame is at rest, so
 * a suppressed animation leaves a black screen with a Skip button rather than a
 * half-drawn picture.
 */

/** The five supplied frames. */
export type CinematicImage = 'approach' | 'chuteFar' | 'chuteMid' | 'chuteNear' | 'chuteLanding';

/** The beats of the film, in order. */
export type BeatId = 'approach' | 'black' | 'chuteFar' | 'chuteMid' | 'chuteNear' | 'landing';

/** What sits on top of a frame: the engine glow and the stars, the dust, the haze. */
export type OverlayKind = 'space' | 'dust' | 'haze';

/**
 * A slow move on a still: how much it grows, which way it drifts and how far
 * it rolls, plus the point it grows from.
 *
 * The numbers rather than CSS strings, because the camera is interpolated
 * frame by frame: a string would have to be parsed on every frame, and a
 * number cannot be got wrong in a way a test cannot see.
 */
export interface CameraMove {
  readonly scaleFrom: number;
  readonly scaleTo: number;
  /** Horizontal drift, in percent of the frame. */
  readonly translateXFrom: number;
  readonly translateYFrom: number;
  readonly translateXTo: number;
  readonly translateYTo: number;
  /** The roll, in degrees. */
  readonly rotateFrom: number;
  readonly rotateTo: number;
  /** The point the frame grows from, as a CSS origin. */
  readonly origin: string;
}

/** What the lower third says during a beat. */
export interface CaptionPlan {
  /** The small orange label. Empty on the black beat. */
  readonly label: string;
  /** The big line on the black beat. Empty elsewhere. */
  readonly headline: string;
  /** Where the title comes from: the zone's name, "Landing at <zone>", or none. */
  readonly title: 'zone' | 'landing' | 'none';
  /**
   * The facts this beat teaches, by id from `src/data/landingFacts.ts`.
   *
   * `zone` is special: it means the fact about the region the player chose.
   */
  readonly factIds: readonly string[];
}

/** One beat of the film. */
export interface Beat {
  readonly id: BeatId;
  /** The frame this beat shows, or null on the black beat. */
  readonly image: CinematicImage | null;
  /** When the picture starts to arrive, in ms from the start of the film. */
  readonly startMs: number;
  /** How long the dissolve in takes, in ms. */
  readonly fadeMs: number;
  /** When the picture starts to leave again, or null when it stays. */
  readonly fadeOutStartMs: number | null;
  /** How long the dissolve out takes, in ms. */
  readonly fadeOutMs: number;
  /** When the camera move ends, in ms. */
  readonly endMs: number;
  /** When the lower third is on screen, in ms. */
  readonly captionFromMs: number;
  readonly captionToMs: number;
  readonly camera: CameraMove | null;
  readonly overlay: OverlayKind | null;
  readonly caption: CaptionPlan;
}

/** How long the lower third takes to fade in and out, in ms. */
export const CAPTION_FADE_MS = 400;

/** The whole runtime, in ms. The hand-off happens on this number. */
export const TOTAL_DURATION_MS = 17000;

/** The label on the skip button. One word: it is a control, not a sentence. */
export const SKIP_LABEL = 'Skip';

/** What the skip button does, for anyone who cannot see the label. */
export const SKIP_DESCRIPTION = 'Skip the landing sequence and go straight to the outpost';

/**
 * The film.
 *
 * Seventeen seconds. The beats overlap on purpose: the next picture starts to
 * arrive while the one before it is still there, which is what makes the
 * descent read as one continuous shot rather than four cuts.
 *
 * The origin of the descent is `50% 100%` on every one of its frames — the
 * bottom of the frame, where the ground is. That is what keeps the zoom going
 * one way.
 */
export const BEATS: readonly Beat[] = [
  {
    id: 'approach',
    image: 'approach',
    startMs: 0,
    fadeMs: 350,
    fadeOutStartMs: 5000,
    fadeOutMs: 350,
    endMs: 5000,
    captionFromMs: 400,
    captionToMs: 4600,
    camera: {
      scaleFrom: 1,
      scaleTo: 1.12,
      translateXFrom: 0,
      translateYFrom: 0,
      translateXTo: 2.6,
      translateYTo: -0.6,
      rotateFrom: 0,
      rotateTo: -1.2,
      origin: '50% 50%',
    },
    overlay: 'space',
    caption: {
      label: 'NASA DATA · APPROACH',
      headline: '',
      title: 'zone',
      factIds: ['distance'],
    },
  },
  {
    id: 'black',
    image: null,
    startMs: 5000,
    fadeMs: 350,
    fadeOutStartMs: null,
    fadeOutMs: 0,
    endMs: 6700,
    captionFromMs: 5400,
    captionToMs: 6600,
    camera: null,
    overlay: null,
    caption: {
      label: '',
      headline: 'ENTRY · DESCENT · LANDING',
      title: 'none',
      factIds: ['entry', 'sol'],
    },
  },
  {
    id: 'chuteFar',
    image: 'chuteFar',
    startMs: 6700,
    fadeMs: 800,
    fadeOutStartMs: null,
    fadeOutMs: 0,
    endMs: 9300,
    captionFromMs: 7000,
    captionToMs: 9000,
    camera: {
      scaleFrom: 1,
      scaleTo: 1.06,
      translateXFrom: 0,
      translateYFrom: 0,
      translateXTo: 0,
      translateYTo: 0,
      rotateFrom: 0,
      rotateTo: 0,
      origin: '50% 100%',
    },
    overlay: 'dust',
    caption: {
      label: 'NASA DATA · DESCENT',
      headline: '',
      title: 'none',
      factIds: ['air'],
    },
  },
  {
    id: 'chuteMid',
    image: 'chuteMid',
    startMs: 9100,
    fadeMs: 800,
    fadeOutStartMs: null,
    fadeOutMs: 0,
    endMs: 11600,
    captionFromMs: 9400,
    captionToMs: 11300,
    camera: {
      scaleFrom: 1.06,
      scaleTo: 1.08,
      translateXFrom: 0,
      translateYFrom: 0,
      translateXTo: 0,
      translateYTo: 0,
      rotateFrom: 0,
      rotateTo: 0,
      origin: '50% 100%',
    },
    overlay: 'dust',
    caption: {
      label: 'NASA DATA · DESCENT',
      headline: '',
      title: 'none',
      factIds: ['parachute'],
    },
  },
  {
    id: 'chuteNear',
    image: 'chuteNear',
    startMs: 11400,
    fadeMs: 800,
    fadeOutStartMs: null,
    fadeOutMs: 0,
    endMs: 13900,
    captionFromMs: 11700,
    captionToMs: 13600,
    camera: {
      scaleFrom: 1.08,
      scaleTo: 1.1,
      translateXFrom: 0,
      translateYFrom: 0,
      translateXTo: 0,
      translateYTo: 0,
      rotateFrom: 0,
      rotateTo: 0,
      origin: '50% 100%',
    },
    overlay: 'dust',
    caption: {
      label: 'NASA DATA · DESCENT',
      headline: '',
      title: 'none',
      factIds: ['seven-minutes'],
    },
  },
  {
    id: 'landing',
    image: 'chuteLanding',
    startMs: 13700,
    fadeMs: 800,
    fadeOutStartMs: 16200,
    fadeOutMs: 800,
    endMs: 16200,
    captionFromMs: 14000,
    captionToMs: 15900,
    camera: {
      scaleFrom: 1.1,
      scaleTo: 1.15,
      translateXFrom: 0,
      translateYFrom: 0,
      translateXTo: 0,
      /* The ground comes up to meet the capsule: the picture slides down as it
         grows, so the horizon moves down the frame and there is more ground in
         it. The bottom of the frame is already off the screen at this zoom, so
         the slide never shows an edge. */
      translateYTo: 2.4,
      rotateFrom: 0,
      rotateTo: 0,
      origin: '50% 100%',
    },
    overlay: 'haze',
    caption: {
      label: 'NASA DATA',
      headline: '',
      title: 'landing',
      factIds: ['zone', 'sunlight'],
    },
  },
];

/** The black beat: the pause between the approach and the descent. */
export const BLACK_BEAT = BEATS[1] as Beat;

/**
 * The easing the camera moves use: `cubic-bezier(.22, .61, .36, 1)`.
 *
 * The same curve the rest of the game's transitions use, worked out in
 * arithmetic rather than left to CSS, because the camera is interpolated frame
 * by frame and a CSS curve cannot be read back mid-move.
 */
export function easeInOut(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));

  /* Bisection on the curve's x: twenty-four steps is far past the precision a
     frame needs, and it cannot fail on a flat stretch the way a Newton step
     can. */
  let low = 0;
  let high = 1;
  let t = clamped;

  for (let i = 0; i < 24; i += 1) {
    t = (low + high) / 2;

    const cx =
      3 * (1 - t) * (1 - t) * t * 0.22 + 3 * (1 - t) * t * t * 0.36 + t * t * t;

    if (cx < clamped) low = t;
    else high = t;
  }

  return (
    3 * (1 - t) * (1 - t) * t * 0.61 + 3 * (1 - t) * t * t * 1 + t * t * t
  );
}

/** How far through its own move a beat is, 0 to 1. */
export function beatProgress(beat: Beat, tMs: number): number {
  if (beat.endMs <= beat.startMs) return 1;

  const raw = (tMs - beat.startMs) / (beat.endMs - beat.startMs);

  return Math.max(0, Math.min(1, raw));
}

/**
 * How opaque a beat's picture is at this moment, 0 to 1.
 *
 * It rises when the beat starts, holds, and falls at the end when the beat
 * says it does. The picture before it stays where it is: the dissolve is the
 * next layer coming up over it, not this one going out.
 */
export function imageOpacityAt(beat: Beat, tMs: number): number {
  const rise = (tMs - beat.startMs) / beat.fadeMs;

  if (rise <= 0) return 0;

  let opacity = Math.min(1, rise);

  if (beat.fadeOutStartMs !== null && tMs >= beat.fadeOutStartMs) {
    const fall = (tMs - beat.fadeOutStartMs) / beat.fadeOutMs;

    opacity = Math.max(0, 1 - fall);
  }

  return Math.max(0, Math.min(1, opacity));
}

/**
 * The camera transform for a beat at this moment.
 *
 * Scale, a drift and a roll, and nothing else: the frames move, and nothing
 * about them changes. A filter would change how the artwork looks, and the
 * artwork is NASA's, not ours.
 */
export function cameraTransformAt(beat: Beat, tMs: number): string {
  const camera = beat.camera;

  if (camera === null) return 'none';

  const p = easeInOut(beatProgress(beat, tMs));

  const scale = camera.scaleFrom + (camera.scaleTo - camera.scaleFrom) * p;
  const x = camera.translateXFrom + (camera.translateXTo - camera.translateXFrom) * p;
  const y = camera.translateYFrom + (camera.translateYTo - camera.translateYFrom) * p;
  const roll = camera.rotateFrom + (camera.rotateTo - camera.rotateFrom) * p;

  return `scale(${scale.toFixed(4)}) translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) rotate(${roll.toFixed(3)}deg)`;
}

/**
 * The handheld wobble on the first chute frame, in pixels.
 *
 * Two pixels is the ceiling: enough to stop the frame feeling like a
 * photograph on a tripod, not enough to move the subject out of the picture.
 */
export function shakeAt(beat: Beat, tMs: number): { readonly x: number; readonly y: number } {
  if (beat.id !== 'chuteFar') return { x: 0, y: 0 };

  const seconds = (tMs - beat.startMs) / 1000;

  return {
    x: Number((Math.sin(seconds * 7.3) * 1.4).toFixed(3)),
    y: Number((Math.cos(seconds * 5.1) * 1.1).toFixed(3)),
  };
}

/**
 * The sway of the landing frame, in degrees.
 *
 * The capsule is hanging under a parachute, so the whole frame breathes. The
 * amplitude is under one degree, and it does not stop: a sway that stopped
 * would read as a glitch.
 */
export function swayAt(beat: Beat, tMs: number): number {
  if (beat.id !== 'landing') return 0;

  const seconds = (tMs - beat.startMs) / 1000;

  return Number((Math.sin(seconds * 1.1) * 0.6).toFixed(4));
}

/** How thick the dust haze over the landing frame is, 0 to 1. */
export function hazeOpacityAt(beat: Beat, tMs: number): number {
  if (beat.overlay !== 'haze') return 0;

  const p = beatProgress(beat, tMs);

  return Number((p * 0.45).toFixed(4));
}

/** When the warm flash at the end of the landing frame fires, in ms. */
export const FLASH_FROM_MS = 15800;

/** How long the flash lasts, in ms. */
export const FLASH_MS = 400;

/**
 * The flash of light as the capsule touches down, 0 to 1.
 *
 * Up and down inside its own window, so it is a flash and not a step.
 */
export function flashOpacityAt(tMs: number): number {
  if (tMs < FLASH_FROM_MS) return 0;

  const p = Math.min(1, (tMs - FLASH_FROM_MS) / FLASH_MS);

  return Number((Math.sin(p * Math.PI) * 0.35).toFixed(4));
}

/**
 * How opaque the lower third is at this moment, 0 to 1.
 *
 * It fades in over `CAPTION_FADE_MS`, holds, and fades out over the same
 * before the beat's caption window closes.
 */
export function captionOpacityAt(beat: Beat, tMs: number): number {
  const rise = (tMs - beat.captionFromMs) / CAPTION_FADE_MS;
  const fall = (beat.captionToMs - tMs) / CAPTION_FADE_MS;

  return Math.max(0, Math.min(1, Math.min(rise, fall)));
}

/** The beat whose caption is on screen at this moment, or null. */
export function captionBeatAt(tMs: number): Beat | null {
  for (const beat of BEATS) {
    if (tMs >= beat.captionFromMs && tMs <= beat.captionToMs) return beat;
  }

  return null;
}

/** The beat that owns the picture at this moment, or null. */
export function imageBeatAt(tMs: number): Beat | null {
  /* The latest beat that has started: the picture under the dissolve is always
     the most recent one, and the one before it is still there underneath. */
  let current: Beat | null = null;

  for (const beat of BEATS) {
    if (beat.image === null) continue;
    if (tMs >= beat.startMs) current = beat;
  }

  return current;
}
