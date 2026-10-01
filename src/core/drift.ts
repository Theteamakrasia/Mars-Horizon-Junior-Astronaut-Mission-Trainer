/**
 * Pure DVD-logo drift mathematics.
 *
 * Kept free of DOM access so the bounce behaviour can be unit tested directly.
 * All velocity values are expressed in pixels per second, which lets the
 * animation run at an identical speed on 60Hz and 144Hz displays.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * A bounce off a viewport wall. `normal` points away from the wall that was
 * hit, as -1/0/+1 per axis, which is all the deformation layer needs to know:
 * it orients the squash axis and whether the sprite flattens or stretches.
 */
export interface Impact {
  normal: Vec2;
  /** Closing speed in px/s at the moment of contact. */
  speed: number;
}

export interface DriftState {
  position: Vec2;
  velocity: Vec2;
}

/**
 * One step's outcome: the new state plus the strongest bounce that happened
 * along the way, or null for a frame spent in open space.
 */
export interface DriftResult extends DriftState {
  impact: Impact | null;
}

/** Clamp a value into an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A single animation frame may span a long time — most often when the user
 * returns to a backgrounded tab. Advancing the full delta in one go can tunnel
 * the sprite straight through a wall, so it is subdivided into fixed steps.
 */
const MAX_SUBSTEP_SECONDS = 1 / 120;

/**
 * Launch angles, in degrees. The DVD logo travels on an obvious diagonal, so
 * the band deliberately excludes the flat and steep extremes: an angle near 0
 * reads as a plain horizontal slide and one near 90 as a vertical ladder.
 */
const MIN_LAUNCH_ANGLE_DEG = 30;
const MAX_LAUNCH_ANGLE_DEG = 45;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Speed bounds in pixels per second, plus the fraction of the viewport width
 * used to pick a speed between them. A desktop lands near the top of the range
 * (~200px/s) while a phone is floored at 120px/s, because the same sprite
 * crossing a 375px screen at desktop speed reads as a blur rather than a drift.
 */
export const MIN_DRIFT_SPEED = 96;
export const MAX_DRIFT_SPEED = 176;
const DRIFT_SPEED_VIEWPORT_FRACTION = 0.128;

/**
 * Drift speed used when the visitor prefers reduced motion, in px/second.
 *
 * A flat figure rather than a fraction of the normal speed: at roughly a fifth
 * of the usual pace he crosses a 1280px viewport in about 30s, which is slow
 * enough to drift past the periphery without demanding a saccade toward him.
 * Scaling the normal speed down proportionally instead would make him crawl at
 * a visually odd, stop-start pace on large displays.
 */
export const REDUCED_DRIFT_SPEED = 34;

/**
 * Advance the drift by `deltaSeconds`, reflecting off the viewport edges.
 *
 * `size` is the astronaut's rendered box and `viewport` is the travel area.
 * The sprite is kept fully inside both, so the legal range for `position` is
 * `[0, viewport - size]`.
 */
export function stepDrift(
  state: DriftState,
  deltaSeconds: number,
  size: Size,
  viewport: Size,
): DriftResult {
  const maxX = Math.max(0, viewport.width - size.width);
  const maxY = Math.max(0, viewport.height - size.height);

  let { x, y } = state.position;
  let { x: vx, y: vy } = state.velocity;

  const steps = Math.max(1, Math.ceil(deltaSeconds / MAX_SUBSTEP_SECONDS));
  const stepTime = deltaSeconds / steps;

  // A long frame can clip two different walls. Only the fastest bounce is
  // reported, so a single lag spike does not stack two full deformations.
  let impact: Impact | null = null;

  const record = (normalX: number, normalY: number, speed: number): void => {
    if (impact === null || speed > impact.speed) {
      impact = { normal: { x: normalX, y: normalY }, speed };
    }
  };

  for (let i = 0; i < steps; i++) {
    x += vx * stepTime;
    y += vy * stepTime;

    // Both axes are resolved before the impact is recorded, so a corner reads
    // as one two-axis landing rather than two separate wall hits.
    let normalX = 0;
    let normalY = 0;

    if (x < 0) {
      x = -x;
      normalX = 1;
      vx = -vx;
    } else if (x > maxX) {
      x = maxX - (x - maxX);
      normalX = -1;
      vx = -vx;
    }

    if (y < 0) {
      y = -y;
      normalY = 1;
      vy = -vy;
    } else if (y > maxY) {
      y = maxY - (y - maxY);
      normalY = -1;
      vy = -vy;
    }

    // The closing speed is the magnitude of travel, which is what a listener
    // actually feels, rather than one axis of it.
    if (normalX !== 0 || normalY !== 0) {
      record(normalX, normalY, Math.hypot(vx, vy));
    }
  }

  return {
    position: { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) },
    velocity: { x: vx, y: vy },
    impact,
  };
}

/**
 * Pull a position back inside the viewport after a resize. Used together with a
 * `stepDrift` call so the velocity reflection stays consistent.
 */
export function clampToViewport(position: Vec2, size: Size, viewport: Size): Vec2 {
  const maxX = Math.max(0, viewport.width - size.width);
  const maxY = Math.max(0, viewport.height - size.height);
  return { x: clamp(position.x, 0, maxX), y: clamp(position.y, 0, maxY) };
}

/**
 * Pick a starting position and velocity for a diagonal drift at the given
 * speed. The angle is randomised so each page load looks different.
 */
export function createInitialDrift(size: Size, viewport: Size, speed: number): DriftState {
  const maxX = Math.max(0, viewport.width - size.width);
  const maxY = Math.max(0, viewport.height - size.height);

  // Both sines and cosines are positive across the 30-45 degree band, so the
  // heading alone only yields two quadrants. Flipping each axis independently
  // is what lets the sprite set off into any of the four, rather than always
  // starting on the same rightward heading.
  const heading =
    (MIN_LAUNCH_ANGLE_DEG + Math.random() * (MAX_LAUNCH_ANGLE_DEG - MIN_LAUNCH_ANGLE_DEG)) *
    DEG_TO_RAD;
  const horizontal = Math.random() < 0.5 ? -1 : 1;
  const vertical = Math.random() < 0.5 ? -1 : 1;

  return {
    position: {
      x: Math.random() * maxX,
      y: Math.random() * maxY,
    },
    velocity: {
      x: Math.cos(heading) * speed * horizontal,
      y: Math.sin(heading) * speed * vertical,
    },
  };
}

/** The drift speed to use on a viewport of the given width, in px/second. */
export function driftSpeedForViewport(viewportWidth: number): number {
  return clamp(
    viewportWidth * DRIFT_SPEED_VIEWPORT_FRACTION,
    MIN_DRIFT_SPEED,
    MAX_DRIFT_SPEED,
  );
}

/**
 * Ceiling on a thrown astronaut, in px/s. A fast flick across a 4K display can
 * otherwise read as several thousand px/s, which looks like a glitch rather
 * than a throw. Deliberately well above MAX_DRIFT_SPEED so a throw is visibly
 * livelier than the idle drift it returns to.
 */
export const MAX_THROW_SPEED = 620;

/**
 * Re-point a velocity at a new speed while preserving its direction. Needed on
 * resize, where the viewport-relative target speed changes but the sprite
 * should carry on along the line it is already travelling.
 */
export function rescaleSpeed(velocity: Vec2, speed: number): Vec2 {
  const magnitude = Math.hypot(velocity.x, velocity.y);

  if (magnitude === 0) {
    return velocity;
  }

  const factor = speed / magnitude;
  return { x: velocity.x * factor, y: velocity.y * factor };
}

/**
 * Clamp a velocity's magnitude to `maxSpeed` while leaving its heading alone.
 * Used to cap the speed of a throw, so a hard flick across a large display
 * cannot send the sprite off at a speed that reads as a glitch.
 */
export function clampSpeed(velocity: Vec2, maxSpeed: number): Vec2 {
  const magnitude = Math.hypot(velocity.x, velocity.y);

  if (magnitude === 0 || magnitude <= maxSpeed) {
    return velocity;
  }

  const factor = maxSpeed / magnitude;
  return { x: velocity.x * factor, y: velocity.y * factor };
}
