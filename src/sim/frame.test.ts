import { describe, expect, it } from 'vitest';

import { createDeform, deformScale, impact, isDeformSettled } from './deform';
import { REDUCED_DRIFT_SPEED, type Size } from './drift';
import {
  createAstronautFrame,
  MIN_THROW_SPEED,
  releaseAstronaut,
  stepAstronaut,
  type AstronautFrame,
  type FrameOptions,
  type GrabTarget,
} from './frame';

const VIEWPORT: Size = { width: 1000, height: 800 };
const SPRITE: Size = { width: 100, height: 100 };
const SPEED = 176;

/** Reduced motion gives up deformation but never movement. */
const REDUCED: FrameOptions = {
  size: SPRITE,
  viewport: VIEWPORT,
  speed: REDUCED_DRIFT_SPEED,
  reducedMotion: true,
  profile: { sizePercent: 10 },
};

const NORMAL: FrameOptions = {
  size: SPRITE,
  viewport: VIEWPORT,
  speed: SPEED,
  reducedMotion: false,
  profile: { sizePercent: 10 },
};

/** Advance `frames` frames at 60Hz, optionally holding the astronaut. */
function advance(
  start: AstronautFrame,
  frames: number,
  options: FrameOptions,
  grab: GrabTarget | null = null,
): AstronautFrame {
  let current = start;

  for (let i = 0; i < frames; i++) {
    current = stepAstronaut(current, 1 / 60, grab, options);
  }

  return current;
}

/** A grab holding still at (400, 400) with no drag velocity. */
const STILL_GRAB: GrabTarget = {
  pointer: { x: 400, y: 400 },
  offset: { x: 50, y: 50 },
  velocity: { x: 0, y: 0 },
};

/**
 * Drive the astronaut into the right wall and let go, returning the frame from
 * just after the bounce. Used to reproduce the reported bug, where the
 * deformation stayed applied indefinitely after an edge hit.
 */
function afterImpact(frames: number): AstronautFrame {
  const pinned: AstronautFrame = {
    drift: { position: { x: 900, y: 400 }, velocity: { x: SPEED, y: 0 } },
    deform: createDeform(),
  };

  return advance(pinned, frames, NORMAL);
}

describe('stepAstronaut — deformation rings out after an impact', () => {
  it('produces no deformation while drifting through open space', () => {
    const fresh: AstronautFrame = {
      drift: { position: { x: 200, y: 350 }, velocity: { x: 80, y: 0 } },
      deform: createDeform(),
    };
    const after = advance(fresh, 120, NORMAL);

    expect(isDeformSettled(after.deform)).toBe(true);

    const scale = deformScale(after.deform);
    expect(scale.along).toBeCloseTo(1, 5);
    expect(scale.across).toBeCloseTo(1, 5);
  });

  it('deforms on the frame the wall is hit', () => {
    const hit = afterImpact(1);

    expect(isDeformSettled(hit.deform)).toBe(false);
  });

  it('fully relaxes after an impact, rather than staying squashed', () => {
    // The reported bug: stepDeform was only reached on frames that produced an
    // impact, so the spring froze at peak amplitude and the deformation stayed
    // applied forever.
    const settled = afterImpact(300);

    expect(isDeformSettled(settled.deform)).toBe(true);
    expect(settled.deform.compression).toBeCloseTo(0, 4);

    // Compared numerically rather than with toEqual: a spring that has decayed
    // asymptotically sits at ~1 - 1e-13 rather than exactly 1, and asserting
    // exact equality would be asserting on float noise.
    const scale = deformScale(settled.deform);
    expect(scale.along).toBeCloseTo(1, 5);
    expect(scale.across).toBeCloseTo(1, 5);
  });

  it('relaxes even when nothing else happens for a long stretch', () => {
    // Explicitly decoupled from "an impact occurred this frame": 600 frames of
    // open space must still decay the spring to rest.
    const hit = afterImpact(1);
    const settled = advance(hit, 600, NORMAL);

    expect(isDeformSettled(settled.deform)).toBe(true);
  });

  it('relaxes across several impacts rather than accumulating', () => {
    // Repeated wall hits must not ratchet the deformation up over time. Each
    // bounce is a single impulse, and the frames in between must let the spring
    // ring back down before the next one arrives.
    let current = createAstronautFrame(SPRITE, VIEWPORT, SPEED);
    let worst = 0;

    for (let bounce = 0; bounce < 40; bounce++) {
      // Teleport to the wall and let one frame of travel trigger the impact.
      current = {
        drift: { position: { x: 900, y: 300 }, velocity: { x: SPEED, y: 0 } },
        deform: current.deform,
      };
      current = stepAstronaut(current, 1 / 60, null, NORMAL);
      worst = Math.max(worst, Math.abs(current.deform.compression));

      // Then a long stretch of open space, exactly as happens in practice.
      current = advance(current, 200, NORMAL);
      expect(isDeformSettled(current.deform)).toBe(true);
    }

    expect(worst).toBeLessThan(0.2);
  });

  it('keeps relaxing a deformation left in flight by a mid-wobble grab', () => {
    // Toggling reduced motion mid-wobble rebuilds the frame, but the spring must
    // still be integrable to rest in the new mode.
    const hit = afterImpact(1);
    const settled = advance(hit, 300, REDUCED);

    expect(isDeformSettled(settled.deform)).toBe(true);
  });
});

describe('stepAstronaut — movement modes', () => {
  it('drifts in reduced motion rather than sitting still', () => {
    // Parking him in the centre was the original reduced-motion bug.
    const fresh = createAstronautFrame(SPRITE, VIEWPORT, REDUCED_DRIFT_SPEED);
    const moved = advance(fresh, 120, REDUCED);

    const travelled = Math.hypot(
      moved.drift.position.x - fresh.drift.position.x,
      moved.drift.position.y - fresh.drift.position.y,
    );

    expect(travelled).toBeGreaterThan(10);
  });

  it('moves noticeably slower under reduced motion', () => {
    // Both start from a pinned, known position so the comparison is of speeds
    // rather than of two independently randomised launch positions.
    const from = (speed: number): AstronautFrame => ({
      drift: { position: { x: 400, y: 400 }, velocity: { x: speed, y: 0 } },
      deform: createDeform(),
    });

    const fast = advance(from(SPEED), 60, NORMAL);
    const slow = advance(from(REDUCED_DRIFT_SPEED), 60, REDUCED);

    const travelled = (result: AstronautFrame): number =>
      Math.hypot(result.drift.position.x - 400, result.drift.position.y - 400);

    expect(travelled(slow)).toBeLessThan(travelled(fast) / 2);
  });

  it('never deforms under reduced motion, even on a wall hit', () => {
    const pinned: AstronautFrame = {
      drift: { position: { x: 900, y: 400 }, velocity: { x: REDUCED_DRIFT_SPEED, y: 0 } },
      deform: createDeform(),
    };

    expect(isDeformSettled(advance(pinned, 120, REDUCED).deform)).toBe(true);
  });

  it('still bounces off the wall under reduced motion', () => {
    const pinned: AstronautFrame = {
      drift: { position: { x: 900, y: 400 }, velocity: { x: REDUCED_DRIFT_SPEED, y: 0 } },
      deform: createDeform(),
    };

    const bounced = stepAstronaut(pinned, 1 / 60, null, REDUCED);

    expect(bounced.drift.velocity.x).toBe(-REDUCED_DRIFT_SPEED);
  });

  it('follows the pointer while held', () => {
    const target: GrabTarget = {
      pointer: { x: 800, y: 600 },
      offset: { x: 50, y: 50 },
      velocity: { x: 0, y: 0 },
    };

    const held = advance(createAstronautFrame(SPRITE, VIEWPORT, SPEED), 180, NORMAL, target);

    expect(held.drift.position.x).toBeCloseTo(750, 0);
    expect(held.drift.position.y).toBeCloseTo(550, 0);
  });

  it('does not deform while held still under reduced motion', () => {
    const held = advance(
      createAstronautFrame(SPRITE, VIEWPORT, SPEED),
      180,
      REDUCED,
      STILL_GRAB,
    );

    expect(isDeformSettled(held.deform)).toBe(true);
  });
});

describe('releaseAstronaut', () => {
  it('drops him inside the viewport even when carried partly off-screen', () => {
    const carried: AstronautFrame = {
      drift: { position: { x: 5000, y: -300 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(carried, { x: 0, y: 0 }, NORMAL);

    expect(released.drift.position.x).toBe(900);
    expect(released.drift.position.y).toBe(0);
  });

  it('carries the throw momentum when flicked', () => {
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(held, { x: 300, y: 0 }, NORMAL);

    expect(released.drift.velocity.x).toBe(300);
  });

  it('resumes the idle diagonal after a gentle release', () => {
    // A near-stationary vector would look like he had stalled.
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(held, { x: 10, y: 0 }, NORMAL);

    expect(Math.hypot(released.drift.velocity.x, released.drift.velocity.y)).toBeCloseTo(
      SPEED,
      5,
    );
  });

  it('releases the held stretch so he relaxes instead of staying elongated', () => {
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: impact(createDeform(), 0, 1, { sizePercent: 10 }),
    };

    const released = releaseAstronaut(held, { x: 0, y: 0 }, NORMAL);

    expect(released.deform.target).toBe(0);
  });

  it('caps an absurd throw', () => {
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(held, { x: 9000, y: 0 }, NORMAL);

    expect(Math.hypot(released.drift.velocity.x, released.drift.velocity.y)).toBe(620);
  });

  it('discards the throw under reduced motion', () => {
    // A hard flick must not become a 620px/s launch, however it reaches here.
    // Guaranteed here rather than relying on the pointer layer to filter it.
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(held, { x: 500, y: 500 }, REDUCED);

    expect(Math.hypot(released.drift.velocity.x, released.drift.velocity.y)).toBeCloseTo(
      REDUCED_DRIFT_SPEED,
      5,
    );
  });

  it('treats a sub-threshold release as a placement', () => {
    const held: AstronautFrame = {
      drift: { position: { x: 400, y: 400 }, velocity: { x: 0, y: 0 } },
      deform: createDeform(),
    };

    const released = releaseAstronaut(held, { x: MIN_THROW_SPEED / 2, y: 0 }, NORMAL);

    // Direction is randomised per resume, so assert the magnitude rather than a
    // particular heading.
    expect(Math.hypot(released.drift.velocity.x, released.drift.velocity.y)).toBeCloseTo(
      SPEED,
      5,
    );
  });
});
