import {
  deformScale,
  isDeformSettled,
  type DeformState,
} from '../core/deform';
import {
  clampToViewport,
  driftSpeedForViewport,
  MAX_THROW_SPEED,
  REDUCED_DRIFT_SPEED,
  rescaleSpeed,
  type Size,
  type Vec2,
} from '../core/drift';
import {
  createAstronautFrame,
  MIN_THROW_SPEED,
  releaseAstronaut,
  stepAstronaut,
  type AstronautFrame,
  type FrameOptions,
  type GrabTarget,
} from '../core/frame';
import { attachGrab } from './pointerGrab';

/**
 * A frame longer than this is treated as a stall (backgrounded tab) and the
 * delta is discarded, so the astronaut never teleports on return.
 */
const MAX_DELTA_SECONDS = 0.05;

export interface FloatingAstronautOptions {
  /** The element whose transform carries the deformation. */
  deformLayer: HTMLElement;
  /**
   * When true the astronaut still drifts, but at a much slower pace, with no
   * deformation on impact and no throw on release. Used for
   * prefers-reduced-motion, where large self-directed motion is the problem but
   * a dead, unmoving page is not an acceptable answer either.
   *
   * He stays pick-up-able either way: moving something in direct response to the
   * pointer is not the kind of motion this preference targets.
   */
  reducedMotion?: boolean;
}

/**
 * Drives the astronaut: a DVD-style drift, squash-and-stretch deformation on
 * impact, and pointer grabbing that hands control to the user mid-flight.
 *
 * This module is the DOM and timing layer only — the requestAnimationFrame loop,
 * the two transforms, and the pointer plumbing. The per-frame physics lives in
 * frame.ts, which is pure and unit tested.
 *
 * Three elements each own exactly one transform:
 *   - `wrapper`  translate3d, this module
 *   - `deform`   rotate + scale, this module
 *   - the inner image, CSS keyframes for idle sway and breathing
 *
 * Keeping them separate is what stops the three from fighting over `transform`.
 */
export function startFloatingAstronaut(
  wrapper: HTMLElement,
  options: FloatingAstronautOptions,
): () => void {
  const { deformLayer, reducedMotion = false } = options;

  const viewport: Size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const size: Size = {
    width: wrapper.offsetWidth,
    height: wrapper.offsetHeight,
  };

  /** The reduced speed is a flat figure, so only the normal speed tracks width. */
  const speedForWidth = (width: number): number =>
    reducedMotion ? REDUCED_DRIFT_SPEED : driftSpeedForViewport(width);

  let speed = speedForWidth(viewport.width);
  let frame: AstronautFrame = createAstronautFrame(size, viewport, speed);
  let lastTime = performance.now();
  let frameId = 0;

  /** Where the pointer is holding, or null while the astronaut drifts free. */
  let grab: GrabTarget | null = null;

  /** Rebuilt on resize, when the sprite's share of the viewport changes. */
  const frameOptions = (): FrameOptions => ({
    size,
    viewport,
    speed,
    reducedMotion,
    profile: { sizePercent: (size.width / viewport.width) * 100 },
  });

  const render = (deform: DeformState): void => {
    wrapper.style.transform =
      `translate3d(${frame.drift.position.x}px, ${frame.drift.position.y}px, 0)`;

    // The scale has to be applied in the rotated frame, hence the rotate on both
    // sides of it: rotate into the deform axis, scale, then rotate back out.
    if (isDeformSettled(deform) && grab === null) return;

    const { along, across } = deformScale(deform);
    const radians = (deform.angle * 180) / Math.PI;

    deformLayer.style.transform =
      `rotate(${radians.toFixed(2)}deg) ` +
      `scale(${along.toFixed(4)}, ${across.toFixed(4)}) ` +
      `rotate(${(-radians).toFixed(2)}deg)`;
  };

  const tick = (now: number): void => {
    const deltaSeconds = Math.min((now - lastTime) / 1000, MAX_DELTA_SECONDS);
    lastTime = now;

    frame = stepAstronaut(frame, deltaSeconds, grab, frameOptions());
    render(frame.deform);

    frameId = requestAnimationFrame(tick);
  };

  const onResize = (): void => {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;

    // Re-read the box: clamp() sizing means it changes with the viewport too.
    size.width = wrapper.offsetWidth;
    size.height = wrapper.offsetHeight;

    // The target speed is viewport-relative, so a resize changes it. The
    // heading is preserved, meaning the sprite carries on along its current
    // line instead of snapping to a new direction mid-flight.
    speed = speedForWidth(viewport.width);

    frame = {
      drift: {
        position: clampToViewport(frame.drift.position, size, viewport),
        velocity: rescaleSpeed(frame.drift.velocity, speed),
      },
      deform: frame.deform,
    };

    render(frame.deform);
  };

  const onGrab = (pointer: Vec2): void => {
    // Grab offset preserves where inside the sprite the cursor took hold, so he
    // does not jump so that his corner meets the pointer.
    grab = {
      pointer,
      offset: {
        x: pointer.x - frame.drift.position.x,
        y: pointer.y - frame.drift.position.y,
      },
      velocity: { x: 0, y: 0 },
    };

    wrapper.classList.add('is-held');
  };

  const onDrag = (pointer: Vec2, velocity: Vec2): void => {
    if (grab === null) return;
    grab.pointer = pointer;
    grab.velocity = velocity;
  };

  /** Put the astronaut back under his own power, from wherever he was dropped. */
  const resumeDrift = (release: Vec2): void => {
    frame = releaseAstronaut(frame, release, frameOptions());

    grab = null;
    wrapper.classList.remove('is-held');
  };

  const onRelease = (_point: Vec2, velocity: Vec2): void => {
    if (grab === null) return;

    // Reduced motion still allows picking him up and putting him down, but a
    // flick across the screen is exactly the kind of large self-directed motion
    // the preference is about. He resumes his slow drift from where he was
    // dropped instead of carrying the throw.
    resumeDrift(reducedMotion ? { x: 0, y: 0 } : velocity);
  };

  const onCancel = (): void => {
    if (grab === null) return;
    resumeDrift({ x: 0, y: 0 });
  };

  render(frame.deform);
  frameId = requestAnimationFrame(tick);

  window.addEventListener('resize', onResize);

  const detachGrab = attachGrab(
    wrapper,
    { onGrab, onDrag, onRelease, onCancel },
    {
      maxThrowSpeed: MAX_THROW_SPEED,
      minThrowSpeed: MIN_THROW_SPEED,
      // He is dragged rather than thrown under reduced motion, so the release
      // velocity is discarded at the source and never reaches onRelease.
      freezeOnRelease: reducedMotion,
    },
  );

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
    detachGrab();
    deformLayer.style.transform = '';
    wrapper.classList.remove('is-held');
  };
}