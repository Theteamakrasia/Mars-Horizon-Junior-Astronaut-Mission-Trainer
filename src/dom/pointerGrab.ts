import { clampSpeed, type Vec2 } from '../sim/drift';

/**
 * Pointer grabbing for the astronaut.
 *
 * Everything here is about turning raw pointer events into the two things the
 * animation loop cares about: where the cursor is, and how fast it was moving
 * when the user let go. Velocity is sampled over a short window rather than the
 * final event pair, because a single `pointermove` right before `pointerup` is
 * often a near-zero delta and would throw the astronaut at a crawl.
 */

/** Handlers the animation loop implements. */
export interface GrabHandlers {
  /** A grab started. `point` is where the cursor went down. */
  onGrab(point: Vec2): void;
  /** The cursor moved, still held. `velocity` is smoothed, in px/second. */
  onDrag(point: Vec2, velocity: Vec2): void;
  /** The grab ended. `velocity` is smoothed, in px/second, and already capped. */
  onRelease(point: Vec2, velocity: Vec2): void;
  /** The grab was abandoned (pointercancel, lost capture, window blur). */
  onCancel(): void;
}

/** Options for `attachGrab`. */
export interface GrabOptions {
  /** Upper bound on a throw, in px/second. */
  maxThrowSpeed: number;
  /** Below this, a release is treated as a placement rather than a throw. */
  minThrowSpeed?: number;
  /** Report no release velocity at all, for reduced-motion mode. */
  freezeOnRelease?: boolean;
}

/**
 * Time window used to compute release velocity, in seconds. Roughly six frames
 * at 60Hz: long enough to be stable, short enough that a pause before letting
 * go reads as a deliberate stop rather than a slow throw.
 */
const VELOCITY_WINDOW_SECONDS = 0.1;

/**
 * Pointer samples are only collected while a drag is active. Older entries are
 * kept so velocity is a windowed average rather than a per-event delta.
 */
interface Sample {
  point: Vec2;
  time: number;
}

const MAX_SAMPLES = 8;

/**
 * Wire pointer events on `target` to the given handlers.
 *
 * Returns a teardown function that removes every listener. Pointer capture is
 * used so a drag keeps tracking even when the cursor outruns the sprite, which
 * is the whole point of springy dragging.
 */
export function attachGrab(
  target: HTMLElement,
  handlers: GrabHandlers,
  options: GrabOptions,
): () => void {
  const minThrowSpeed = options.minThrowSpeed ?? 40;

  let activePointer: number | null = null;
  let samples: Sample[] = [];
  let velocity: Vec2 = { x: 0, y: 0 };

  const pushSample = (point: Vec2, time: number): void => {
    samples.push({ point, time });
    if (samples.length > MAX_SAMPLES) samples.shift();
  };

  /**
   * Velocity across the retained window, in px/second. Falls back to the last
   * two samples when the window is a single frame, and to zero when there is no
   * elapsed time to divide by.
   */
  const windowVelocity = (now: number): Vec2 => {
    const cutoff = now - VELOCITY_WINDOW_SECONDS;

    // Drop samples that have fallen out of the window, keeping the newest one
    // even if it is older than the cutoff (a stationary hold).
    while (samples.length > 2 && samples[0].time < cutoff) samples.shift();

    const first = samples[0];
    const last = samples[samples.length - 1];
    const elapsed = (last.time - first.time) / 1000;

    if (elapsed <= 0) return { x: 0, y: 0 };

    return {
      x: (last.point.x - first.point.x) / elapsed,
      y: (last.point.y - first.point.y) / elapsed,
    };
  };

  const endGrab = (): void => {
    activePointer = null;
    samples = [];
    velocity = { x: 0, y: 0 };
  };

  const onPointerDown = (event: PointerEvent): void => {
    // Left button / primary contact only. A right-click should not start a drag,
    // and a second finger joining an in-progress drag must not steal it.
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;

    const point = { x: event.clientX, y: event.clientY };

    activePointer = event.pointerId;
    samples = [];
    velocity = { x: 0, y: 0 };
    pushSample(point, event.timeStamp);

    target.setPointerCapture(event.pointerId);
    // Stops the browser from starting a text selection or an image drag
    // alongside the grab.
    event.preventDefault();

    handlers.onGrab(point);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;

    const point = { x: event.clientX, y: event.clientY };
    pushSample(point, event.timeStamp);

    // Smoothed with an exponential moving average: raw per-event velocity from a
    // high-rate pointer is noisy enough to make the deformation jitter.
    const instant = windowVelocity(event.timeStamp);
    const blend = 0.35;
    velocity = {
      x: velocity.x + (instant.x - velocity.x) * blend,
      y: velocity.y + (instant.y - velocity.y) * blend,
    };

    event.preventDefault();

    handlers.onDrag(point, velocity);
  };

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if (event.pointerId !== activePointer) return;

    const point = { x: event.clientX, y: event.clientY };
    pushSample(point, event.timeStamp);

    const release = clampSpeed(windowVelocity(event.timeStamp), options.maxThrowSpeed);

    endGrab();

    // Capturing release itself can throw if the element is mid-teardown.
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    if (cancelled || options.freezeOnRelease) {
      handlers.onCancel();
      return;
    }

    // A deliberate stop reads as a placement, not a throw, so anything slower
    // than the floor is discarded and the astronaut simply resumes its drift.
    const magnitude = Math.hypot(release.x, release.y);
    const thrown = magnitude < minThrowSpeed ? { x: 0, y: 0 } : release;

    handlers.onRelease(point, thrown);
  };

  const onPointerUp = (event: PointerEvent): void => finish(event, false);

  const onPointerCancel = (event: PointerEvent): void => finish(event, true);

  const onLostCapture = (event: PointerEvent): void => {
    // Fires on release too, but the grab is already closed by then.
    if (event.pointerId !== activePointer) return;
    finish(event, true);
  };

  // A drag left running when the window loses focus would resume on return with
  // no pointerup ever having arrived.
  const onWindowBlur = (): void => {
    if (activePointer === null) return;
    endGrab();
    handlers.onCancel();
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerCancel);
  target.addEventListener('lostpointercapture', onLostCapture);
  window.addEventListener('blur', onWindowBlur);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerCancel);
    target.removeEventListener('lostpointercapture', onLostCapture);
    window.removeEventListener('blur', onWindowBlur);
  };
}