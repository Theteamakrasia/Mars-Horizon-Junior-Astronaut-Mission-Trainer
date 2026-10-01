import { describe, expect, it } from 'vitest';

import {
  clampToViewport,
  createInitialDrift,
  driftSpeedForViewport,
  MAX_DRIFT_SPEED,
  MIN_DRIFT_SPEED,
  rescaleSpeed,
  stepDrift,
  type DriftState,
  type Size,
  type Vec2,
} from './drift';

const VIEWPORT: Size = { width: 1000, height: 800 };
const SPRITE: Size = { width: 100, height: 200 };

/** Convenience builder so each test reads as a scenario. */
function state(x: number, y: number, vx: number, vy: number): DriftState {
  return { position: { x, y }, velocity: { x: vx, y: vy } };
}

/**
 * How far the line of travel sits off the horizontal axis, in degrees, folded
 * into [0, 90]. A heading of 150deg and one of 30deg describe the same
 * steepness, so folding measures the diagonal rather than the compass
 * direction — otherwise an up-left launch would look like a 150deg climb.
 */
function slopeDeg(velocity: Vec2): number {
  const heading = Math.abs((Math.atan2(velocity.y, velocity.x) * 180) / Math.PI);

  return Math.min(heading, 180 - heading);
}

describe('stepDrift', () => {
  it('moves freely when nowhere near an edge', () => {
    const result = stepDrift(state(500, 400, 10, 10), 1 / 60, SPRITE, VIEWPORT);

    expect(result.position.x).toBeGreaterThan(500);
    expect(result.position.y).toBeGreaterThan(400);
    expect(result.velocity).toEqual({ x: 10, y: 10 });
  });

  it('reflects off the left edge and reverses horizontal velocity', () => {
    // Starts exactly on the wall so even a single frame's travel triggers it.
    const result = stepDrift(state(0, 400, -100, 0), 1 / 60, SPRITE, VIEWPORT);

    expect(result.position.x).toBeGreaterThanOrEqual(0);
    expect(result.velocity.x).toBe(100);
  });

  it('reflects off the right edge and reverses horizontal velocity', () => {
    // maxX is 900, so start flush against it.
    const result = stepDrift(state(900, 400, 100, 0), 1 / 60, SPRITE, VIEWPORT);

    expect(result.position.x).toBeLessThanOrEqual(900);
    expect(result.position.x).toBeLessThan(900);
    expect(result.velocity.x).toBe(-100);
  });

  it('reflects off the bottom edge and reverses vertical velocity', () => {
    // maxY is 600.
    const result = stepDrift(state(500, 600, 0, 100), 1 / 60, SPRITE, VIEWPORT);

    expect(result.position.y).toBeLessThanOrEqual(600);
    expect(result.position.y).toBeLessThan(600);
    expect(result.velocity.y).toBe(-100);
  });

  it('reflects off the top edge and reverses vertical velocity', () => {
    const result = stepDrift(state(500, 0, 0, -100), 1 / 60, SPRITE, VIEWPORT);

    expect(result.position.y).toBeGreaterThan(0);
    expect(result.velocity.y).toBe(100);
  });

  it('flips both axes when it hits a corner', () => {
    const result = stepDrift(state(900, 600, 100, 100), 1 / 60, SPRITE, VIEWPORT);

    expect(result.velocity.x).toBe(-100);
    expect(result.velocity.y).toBe(-100);
  });

  it('never tunnels through a wall during a long frame', () => {
    // A backgrounded tab can produce a multi-second delta. Without substepping
    // the sprite would pass straight through the wall and keep going.
    const result = stepDrift(state(0, 400, 5000, 0), 3, SPRITE, VIEWPORT);

    expect(result.position.x).toBeGreaterThanOrEqual(0);
    expect(result.position.x).toBeLessThanOrEqual(900);
  });

  it('keeps the sprite inside the viewport over many frames', () => {
    let current = createInitialDrift(SPRITE, VIEWPORT, 55);

    for (let i = 0; i < 3000; i++) {
      current = stepDrift(current, 1 / 60, SPRITE, VIEWPORT);

      expect(current.position.x).toBeGreaterThanOrEqual(0);
      expect(current.position.x).toBeLessThanOrEqual(900);
      expect(current.position.y).toBeGreaterThanOrEqual(0);
      expect(current.position.y).toBeLessThanOrEqual(600);
    }
  });

  it('preserves travel speed across frames', () => {
    const start = state(500, 400, 55, 0);
    const result = stepDrift(start, 0.5, SPRITE, VIEWPORT);

    // No collision occurred, so distance must equal speed * time exactly.
    expect(result.position.x - start.position.x).toBeCloseTo(27.5, 5);
  });
});

describe('clampToViewport', () => {
  it('pulls a position back inside the bounds', () => {
    expect(clampToViewport({ x: 5000, y: 5000 }, SPRITE, VIEWPORT)).toEqual({
      x: 900,
      y: 600,
    });
  });

  it('leaves an in-bounds position untouched', () => {
    expect(clampToViewport({ x: 120, y: 240 }, SPRITE, VIEWPORT)).toEqual({
      x: 120,
      y: 240,
    });
  });

  it('clamps to zero when the sprite is larger than the viewport', () => {
    const huge: Size = { width: 2000, height: 2000 };
    expect(clampToViewport({ x: 50, y: 50 }, huge, VIEWPORT)).toEqual({ x: 0, y: 0 });
  });
});

describe('createInitialDrift', () => {
  it('starts inside the viewport', () => {
    const result = createInitialDrift(SPRITE, VIEWPORT, 55);

    expect(result.position.x).toBeGreaterThanOrEqual(0);
    expect(result.position.x).toBeLessThanOrEqual(900);
    expect(result.position.y).toBeGreaterThanOrEqual(0);
    expect(result.position.y).toBeLessThanOrEqual(600);
  });

  it('keeps the requested speed', () => {
    const { velocity } = createInitialDrift(SPRITE, VIEWPORT, 55);
    const magnitude = Math.hypot(velocity.x, velocity.y);

    expect(magnitude).toBeCloseTo(55, 5);
  });

  it('launches on a 30-45 degree diagonal, never flat or vertical', () => {
    for (let i = 0; i < 1000; i++) {
      const { velocity } = createInitialDrift(SPRITE, VIEWPORT, 200);

      expect(slopeDeg(velocity)).toBeGreaterThanOrEqual(30 - 1e-9);
      expect(slopeDeg(velocity)).toBeLessThanOrEqual(45 + 1e-9);
    }
  });

  it('can launch into any of the four quadrants', () => {
    const headings = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const { velocity } = createInitialDrift(SPRITE, VIEWPORT, 200);
      headings.add(`${Math.sign(velocity.x)},${Math.sign(velocity.y)}`);
    }

    expect(headings.size).toBe(4);
  });
});

describe('driftSpeedForViewport', () => {
  it('runs at roughly DVD pace on a desktop viewport', () => {
    expect(driftSpeedForViewport(1280)).toBeCloseTo(204.8, 5);
  });

  it('stays above the floor on a narrow phone viewport', () => {
    expect(driftSpeedForViewport(375)).toBe(MIN_DRIFT_SPEED);
  });

  it('stays below the ceiling on a very wide viewport', () => {
    expect(driftSpeedForViewport(3840)).toBe(MAX_DRIFT_SPEED);
  });
});

describe('rescaleSpeed', () => {
  it('re-points a velocity at the new speed without changing direction', () => {
    const result = rescaleSpeed({ x: 30, y: 40 }, 100);

    expect(Math.hypot(result.x, result.y)).toBeCloseTo(100, 5);
    // Same 3-4-5 heading: the sprite carries on along its existing line.
    expect(result.y / result.x).toBeCloseTo(40 / 30, 10);
  });

  it('leaves a zero velocity alone rather than producing NaN', () => {
    expect(rescaleSpeed({ x: 0, y: 0 }, 100)).toEqual({ x: 0, y: 0 });
  });
});
