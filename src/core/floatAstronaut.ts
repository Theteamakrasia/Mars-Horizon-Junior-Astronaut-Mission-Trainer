import {
  clampToViewport,
  createInitialDrift,
  driftSpeedForViewport,
  rescaleSpeed,
  stepDrift,
  type DriftState,
  type Size,
} from './drift';

/**
 * A frame longer than this is treated as a stall (backgrounded tab) and the
 * delta is discarded, so the astronaut never teleports on return.
 */
const MAX_DELTA_SECONDS = 0.05;

/**
 * Drives the astronaut's DVD-style drift with requestAnimationFrame.
 *
 * Only the wrapper element's transform is touched here; the sway and breathing
 * animations live on the inner image in CSS. Keeping the two transforms on
 * separate elements stops them from overwriting each other.
 */
export function startFloatingAstronaut(wrapper: HTMLElement): () => void {
  const viewport: Size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const size: Size = {
    width: wrapper.offsetWidth,
    height: wrapper.offsetHeight,
  };

  let speed = driftSpeedForViewport(viewport.width);
  let state: DriftState = createInitialDrift(size, viewport, speed);
  let lastTime = performance.now();
  let frameId = 0;

  const render = (): void => {
    wrapper.style.transform = `translate3d(${state.position.x}px, ${state.position.y}px, 0)`;
  };

  const tick = (now: number): void => {
    const deltaSeconds = Math.min((now - lastTime) / 1000, MAX_DELTA_SECONDS);
    lastTime = now;

    state = stepDrift(state, deltaSeconds, size, viewport);
    render();

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
    speed = driftSpeedForViewport(viewport.width);

    state = {
      position: clampToViewport(state.position, size, viewport),
      velocity: rescaleSpeed(state.velocity, speed),
    };
    render();
  };

  render();
  frameId = requestAnimationFrame(tick);

  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
  };
}

/**
 * Positions the astronaut in the centre and applies no motion at all.
 * Used when the visitor prefers reduced motion.
 */
export function centreAstronaut(wrapper: HTMLElement): void {
  const x = (window.innerWidth - wrapper.offsetWidth) / 2;
  const y = (window.innerHeight - wrapper.offsetHeight) / 2;
  wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
