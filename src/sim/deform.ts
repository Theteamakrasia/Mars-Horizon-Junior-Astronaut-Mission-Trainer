/**
 * Squash-and-stretch deformation, as pure spring mathematics.
 *
 * The astronaut has one deformable axis: a rotation plus a compression along it.
 * Rotating the axis to the wall's normal makes him flatten against whatever he
 * hit; rotating it to the direction the cursor is pulling makes him stretch
 * along the drag. One mechanism, two uses, and no DOM access so the feel can
 * be unit tested.
 *
 * Compression runs from 0 at rest, positive while squashed and negative during
 * the rebound overshoot. Scale factors are derived from it, so a single spring
 * drives the whole effect.
 */

/**
 * Spring frequency. Governs how fast the wobble rings out: higher settles
 * sooner and feels stiffer.
 */
export const STIFFNESS = 340;

/**
 * Spring damping. Well below critical (which would be 2*sqrt(STIFFNESS), ~37
 * here), so an impact wobbles and rings back to rest instead of snapping.
 */
export const DAMPING = 11;

/**
 * Deepest squash and widest rebound stretch, as a fraction of resting size.
 *
 * Kept modest on purpose. The perpendicular axis takes the reciprocal, so this
 * number doubles the deformation: 0.19 is a 19% flatten paired with a 24%
 * stretch. Enough to clearly register a wall hit, not enough that the sprite
 * stops reading as a figure and starts reading as a distorted image.
 */
export const MAX_COMPRESSION = 0.19;

/**
 * Deepest stretch while being dragged, as a fraction of resting size.
 *
 * Roughly a quarter of MAX_COMPRESSION, on purpose. An impact is a brief, readable
 * event; a drag lasts as long as the pointer moves, and near impact strength the
 * astronaut reads as a rubber band being towed across the screen rather than a
 * figure trailing a cursor. The ratio is what matters, so this is kept in step
 * with MAX_COMPRESSION rather than left as an absolute number.
 */
export const MAX_DRAG_COMPRESSION = 0.045;

/**
 * Velocity impulse applied by a full-strength impact. The spring's peak
 * compression works out to roughly IMPULSE / sqrt(STIFFNESS), so this is set so
 * a hard hit reaches MAX_COMPRESSION and softer ones scale down from there
 * instead of clamping against it.
 */
export const IMPULSE = 3.5;

/**
 * A single animation frame may span a long time. Spring integration is only
 * stable for small steps, so an oversized delta is subdivided the same way the
 * drift math does rather than being discarded.
 */
const MAX_SUBSTEP_SECONDS = 1 / 120;

export interface DeformState {
  /** Squash along the deform axis. Positive squashes, negative stretches. */
  compression: number;
  /** Rate of change of `compression`, per second. */
  compressionVelocity: number;
  /**
   * Deform axis heading in radians. Held rather than sprung: an impact against
   * the right wall squashes horizontally, and that direction has to stay put
   * through the rebound rather than rotating back to vertical.
   */
  angle: number;
  /**
   * The compression the spring settles at rather than oscillating around.
   *
   * Zero for everything an impact does, which is why a hit rings back to a
   * neutral sprite. A drag sets a small non-zero value so the stretch holds for
   * as long as the pointer keeps moving and eases out when it stops — the
   * difference between a sustained lean and a shape that keeps twitching.
   */
  target: number;
}

export interface DeformProfile {
  /** The sprite's rendered width as a percentage of the viewport width. */
  sizePercent: number;
}

/** A deform spring that is completely at rest. */
export function createDeform(): DeformState {
  return { compression: 0, compressionVelocity: 0, angle: 0, target: 0 };
}

/**
 * Kick the spring so the sprite squashes along `angle`.
 *
 * Sets a velocity impulse rather than a position, so the deformation overshoots
 * and rings back to rest instead of easing in and out — that ringing is what
 * makes it read as jelly rather than a linear tween.
 *
 * `strength` is 0-1 and should already account for impact speed.
 */
export function impact(
  state: DeformState,
  angle: number,
  strength: number,
  profile: DeformProfile,
): DeformState {
  const scaled = clampStrength(strength) * sizeWeight(profile);

  return {
    ...state,
    // An impulse is a velocity, and the peak amplitude it reaches works out to
    // roughly impulse/sqrt(STIFFNESS) for this spring — so IMPULSE is expressed
    // pre-divided to make peak compression land near `scaled`.
    compressionVelocity: Math.max(state.compressionVelocity, IMPULSE * scaled),
    angle,
    // A hit is a transient: clear any sustained drag stretch so the two cannot
    // compound when a wall bounce lands mid-drag.
    target: 0,
  };
}

/**
 * Hold a sustained stretch along `angle`, rather than kicking the spring.
 *
 * The drag wants the sprite leaning into the pull for as long as the pointer
 * moves, so this sets the spring's resting point instead of an impulse. An
 * impulse here would be wrong twice over: re-kicking it every frame pins the
 * spring at maximum compression, and a bounce should feel like a sudden event
 * where a drag feels like a sustained posture.
 *
 * `strength` is 0-1 and is deliberately given a much lower ceiling than an
 * impact — see MAX_DRAG_COMPRESSION.
 */
export function stretch(
  state: DeformState,
  angle: number,
  strength: number,
  profile: DeformProfile,
): DeformState {
  const scaled = clampStrength(strength) * sizeWeight(profile);

  return {
    ...state,
    angle,
    target: scaled * MAX_DRAG_COMPRESSION,
  };
}

/** Release a held stretch and let the spring ease back to neutral. */
export function releaseStretch(state: DeformState): DeformState {
  return { ...state, target: 0 };
}

/**
 * Advance the spring by `deltaSeconds`.
 *
 * Semi-implicit Euler, substepped at a fixed rate so behaviour does not change
 * between a 60Hz and a 144Hz display.
 */
export function stepDeform(state: DeformState, deltaSeconds: number): DeformState {
  const steps = Math.max(1, Math.ceil(deltaSeconds / MAX_SUBSTEP_SECONDS));
  const stepTime = deltaSeconds / steps;

  let { compression, compressionVelocity } = state;
  const { target } = state;

  for (let i = 0; i < steps; i++) {
    // Damped harmonic oscillator around `target` rather than around zero:
    // acceleration = -STIFFNESS*(x - target) - DAMPING*v.
    //
    // Measuring displacement from the target is what lets the same spring serve
    // both a bounce (target stays 0, so it rings back to neutral) and a drag
    // (a small non-zero target, so it settles into a lean instead of oscillating
    // about one).
    compressionVelocity +=
      (-STIFFNESS * (compression - target) - DAMPING * compressionVelocity) * stepTime;
    compression += compressionVelocity * stepTime;
  }

  return { ...state, compression, compressionVelocity };
}

/**
 * True once the spring has effectively settled, so the caller can stop writing
 * transforms for a sprite that is sitting still.
 */
export function isDeformSettled(state: DeformState): boolean {
  return (
    Math.abs(state.compression - state.target) < 0.0015 &&
    Math.abs(state.compressionVelocity) < 0.02
  );
}

/**
 * The scale to apply in the rotated frame, as `(along, across)` factors.
 *
 * The perpendicular axis takes the exact reciprocal of the deform axis, which
 * conserves area at every compression. That is what makes a wall impact read as
 * a flatten rather than the sprite simply shrinking; `1 + c` alongside `1 - c`
 * would lose 9% of the area on a hard hit and read as a resize.
 */
export function deformScale(state: DeformState): { along: number; across: number } {
  const amount = Math.min(
    Math.max(state.compression, -MAX_COMPRESSION),
    MAX_COMPRESSION,
  );

  const along = 1 - amount;

  return { along, across: 1 / along };
}

/**
 * The sprite width, as a percentage of viewport width, that the deformation is
 * tuned for. Derived from the `--astronaut-size` clamp at a typical desktop size.
 */
const REFERENCE_SIZE_PERCENT = 18;

/**
 * How much a hit should deform the sprite for its size. Inverse, because a big
 * astronaut already travels visibly further per pixel of squash: scaling the
 * effect up with size would make it the most exaggerated thing on the page, and
 * scaling it with size would leave a small one barely reacting at all. Capped
 * so neither extreme reaches absurdity.
 */
function sizeWeight(profile: DeformProfile): number {
  const ratio = REFERENCE_SIZE_PERCENT / Math.max(profile.sizePercent, 1);
  return Math.min(Math.max(ratio, 0.6), 1.5);
}

/** Strength expressed as 0-1, guarding against a caller passing anything odd. */
function clampStrength(strength: number): number {
  if (!Number.isFinite(strength)) return 0;
  return Math.min(Math.max(strength, 0), 1);
}