import {
  createDeform,
  impact,
  releaseStretch,
  stepDeform,
  stretch,
  type DeformProfile,
  type DeformState,
} from './deform';
import {
  clampSpeed,
  clampToViewport,
  createInitialDrift,
  MAX_THROW_SPEED,
  stepDrift,
  type DriftState,
  type Size,
  type Vec2,
} from './drift';

/**
 * One frame of astronaut physics, with no DOM access.
 *
 * Everything the animation loop needs to decide happens here: whether the
 * astronaut is being dragged or drifting, whether this frame produced an impact,
 * and how the deformation spring responds. Keeping it pure means the interplay
 * between drift and deformation is directly testable, which matters because that
 * interplay is where the subtle bugs live — gating the spring's advance on "did
 * something happen this frame" freezes a wobble part-way instead of letting it
 * ring out, and nothing about that shows up in the drift or deform maths alone.
 */

/**
 * How quickly the astronaut chases the cursor while held, per second. High
 * enough to feel attached to the pointer, low enough that he visibly trails it
 * and stretches in the direction of the pull.
 */
export const DRAG_FOLLOW_RATE = 14;

/**
 * Drag speed, in px/second, at which the stretch reaches full strength. Set well
 * above a comfortable flick so ordinary dragging only leans the sprite slightly;
 * the ceiling on the result is MAX_DRAG_COMPRESSION regardless.
 */
export const DRAG_STRETCH_SPEED = 3400;

/** Below this release speed the astronaut is placed rather than thrown. */
export const MIN_THROW_SPEED = 60;

/** Where the pointer is holding, or null while the astronaut drifts free. */
export interface GrabTarget {
  pointer: Vec2;
  offset: Vec2;
  velocity: Vec2;
}

export interface FrameOptions {
  /** The astronaut's rendered box. */
  size: Size;
  /** The travel area. */
  viewport: Size;
  /** Target drift speed in px/second, already adjusted for reduced motion. */
  speed: number;
  /** Suppresses deformation and throwing, but not movement. */
  reducedMotion: boolean;
  /** The sprite's size relative to the viewport, for damping the response. */
  profile: DeformProfile;
}

/** Everything a single frame advances. */
export interface AstronautFrame {
  drift: DriftState;
  deform: DeformState;
}

/** A frame at rest, ready to be advanced. */
export function createAstronautFrame(
  size: Size,
  viewport: Size,
  speed: number,
): AstronautFrame {
  return { drift: createInitialDrift(size, viewport, speed), deform: createDeform() };
}

/**
 * Advance one frame.
 *
 * The deform spring is stepped unconditionally at the end, once per frame,
 * whatever mode we are in. That is the load-bearing detail: impacts and drag
 * stretches only ever *kick* it, and a kick that is never integrated again
 * leaves the deformation stuck on indefinitely.
 */
export function stepAstronaut(
  frame: AstronautFrame,
  deltaSeconds: number,
  grab: GrabTarget | null,
  options: FrameOptions,
): AstronautFrame {
  const { size, viewport, speed, reducedMotion, profile } = options;

  let { drift, deform } = frame;

  if (grab !== null) {
    // Exponential approach to the cursor, which is frame-rate independent and
    // leaves a visible gap the deformation can stretch across.
    const follow = 1 - Math.exp(-DRAG_FOLLOW_RATE * deltaSeconds);
    const target = {
      x: grab.pointer.x - grab.offset.x,
      y: grab.pointer.y - grab.offset.y,
    };

    drift = {
      position: {
        x: drift.position.x + (target.x - drift.position.x) * follow,
        y: drift.position.y + (target.y - drift.position.y) * follow,
      },
      velocity: grab.velocity,
    };

    // Deformation is the part of the effect that snaps and rebounds hardest, so
    // it is the part reduced motion gives up. The position change above still
    // tracks the pointer directly.
    if (!reducedMotion) {
      // Hold a lean into the pull, rather than kicking the spring every frame.
      // Re-kicking would pin the deformation at its ceiling for as long as the
      // pointer moved, which reads as the sprite being towed rather than trailing
      // the cursor. With a target the spring eases into the lean and settles.
      const strength = Math.min(
        1,
        Math.hypot(grab.velocity.x, grab.velocity.y) / DRAG_STRETCH_SPEED,
      );

      deform =
        strength > 0.02
          ? stretch(
              deform,
              Math.atan2(grab.velocity.y, grab.velocity.x),
              strength,
              profile,
            )
          : releaseStretch(deform);
    }
  } else {
    const result = stepDrift(drift, deltaSeconds, size, viewport);
    drift = result;

    // Impacts are only ever generated when deformation is enabled. Under reduced
    // motion he turns around at the wall without flattening against it.
    if (!reducedMotion && result.impact !== null) {
      const { normal, speed: impactSpeed } = result.impact;
      const angle = Math.atan2(normal.y, normal.x);

      // A corner hit carries both axes, so it is a harder landing than either
      // wall alone. Normalised against the idle drift speed so the effect does
      // not change with viewport size.
      const axes = (normal.x !== 0 ? 1 : 0) + (normal.y !== 0 ? 1 : 0);
      const strength = Math.min(1, impactSpeed / speed) * (axes === 2 ? 1.25 : 1);

      deform = impact(deform, angle, strength, profile);
    }
  }

  return { drift, deform: stepDeform(deform, deltaSeconds) };
}

/**
 * Put the astronaut back under his own power, from wherever he was dropped.
 *
 * Clamps the drop back inside the viewport, since he may have been carried
 * partly off-screen. A release slower than MIN_THROW_SPEED is read as a
 * placement rather than a throw, and resumes the idle diagonal instead of
 * continuing a near-stationary vector, which would look like he had stalled.
 *
 * Reduced motion discards the throw here rather than relying on the pointer
 * layer to have filtered it, so the guarantee holds for any caller.
 */
export function releaseAstronaut(
  frame: AstronautFrame,
  release: Vec2,
  options: Pick<FrameOptions, 'size' | 'viewport' | 'speed' | 'reducedMotion'>,
): AstronautFrame {
  const { size, viewport, speed, reducedMotion } = options;

  const thrown = reducedMotion ? { x: 0, y: 0 } : clampSpeed(release, MAX_THROW_SPEED);
  const magnitude = Math.hypot(thrown.x, thrown.y);

  return {
    drift: {
      position: clampToViewport(frame.drift.position, size, viewport),
      velocity:
        magnitude < MIN_THROW_SPEED ? createInitialDrift(size, viewport, speed).velocity : thrown,
    },
    // Let go of any lean he was still holding, so he springs back to neutral
    // instead of staying stretched along the direction of the last drag.
    deform: releaseStretch(frame.deform),
  };
}