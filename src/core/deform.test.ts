import { describe, expect, it } from 'vitest';

import {
  createDeform,
  deformScale,
  impact,
  IMPULSE,
  isDeformSettled,
  MAX_COMPRESSION,
  MAX_DRAG_COMPRESSION,
  releaseStretch,
  stepDeform,
  stretch,
  type DeformState,
} from './deform';

/** A mid-sized astronaut on a desktop viewport, as a percentage. */
const PROFILE = { sizePercent: 18 };

/** The reference size the deformation is tuned for. */
const REFERENCE = { sizePercent: 18 };

/** Run the spring forward for `seconds` at 60Hz and return the final state. */
function settle(state: DeformState, seconds: number): DeformState {
  let current = state;

  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    current = stepDeform(current, 1 / 60);
  }

  return current;
}

/** The most compressed the spring got along the way. */
function peakCompression(state: DeformState, seconds: number): number {
  let current = state;
  let peak = 0;

  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    current = stepDeform(current, 1 / 60);
    peak = Math.max(peak, current.compression);
  }

  return peak;
}

describe('impact', () => {
  it('records the deform axis angle', () => {
    const result = impact(createDeform(), Math.PI / 2, 1, PROFILE);

    expect(result.angle).toBeCloseTo(Math.PI / 2, 10);
  });

  it('kicks the spring positive, so the sprite squashes', () => {
    const result = impact(createDeform(), 0, 1, PROFILE);

    expect(result.compressionVelocity).toBeGreaterThan(0);
  });

  it('scales the impulse with strength', () => {
    const gentle = impact(createDeform(), 0, 0.25, PROFILE);
    const hard = impact(createDeform(), 0, 1, PROFILE);

    expect(hard.compressionVelocity).toBeGreaterThan(gentle.compressionVelocity);
  });

  it('does not stack impulses when a bounce lands mid-squash', () => {
    // Two hits in quick succession should read as one harder landing, not as a
    // spring driven to an absurd amplitude.
    let state = impact(createDeform(), 0, 0.4, PROFILE);
    state = stepDeform(state, 1 / 60);
    state = impact(state, 0, 0.4, PROFILE);

    const doubled = impact(
      impact(createDeform(), 0, 0.8, PROFILE),
      0,
      0.8,
      PROFILE,
    );

    expect(state.compressionVelocity).toBeLessThanOrEqual(doubled.compressionVelocity);
  });

  it('never stacks an impulse above full strength', () => {
    let state = impact(createDeform(), 0, 1, PROFILE);

    for (let i = 0; i < 30; i++) {
      state = impact(state, 0, 1, PROFILE);
    }

    const doubled = impact(impact(createDeform(), 0, 1, PROFILE), 0, 1, PROFILE);

    expect(state.compressionVelocity).toBeLessThanOrEqual(doubled.compressionVelocity);
  });

  it('clears any held drag stretch, so the two cannot compound', () => {
    // A wall bounce landing mid-drag should be a clean, full-strength squash
    // rather than a squash on top of a lean.
    const held = stretch(createDeform(), 0, 1, PROFILE);

    expect(impact(held, 0, 1, PROFILE).target).toBe(0);
  });

  it('ignores a non-finite strength rather than poisoning the spring', () => {
    expect(impact(createDeform(), 0, Number.NaN, PROFILE).compressionVelocity).toBe(0);
    expect(impact(createDeform(), 0, Number.POSITIVE_INFINITY, PROFILE).compressionVelocity).toBe(0);
  });

  it('deforms a bigger sprite less hard for the same hit', () => {
    // Inverse to size: a large astronaut already moves further per pixel of
    // squash, so scaling its response up would make it the most exaggerated
    // thing on the page.
    const small = impact(createDeform(), 0, 1, { sizePercent: 8 });
    const large = impact(createDeform(), 0, 1, { sizePercent: 34 });

    expect(small.compressionVelocity).toBeGreaterThan(large.compressionVelocity);
  });

  it('applies the tuned strength at the reference size', () => {
    const reference = impact(createDeform(), 0, 1, REFERENCE);
    const same = impact(createDeform(), 0, 1, { sizePercent: 18 });

    expect(reference.compressionVelocity).toBeCloseTo(same.compressionVelocity, 10);
  });

  it('caps the size weighting so no sprite distorts absurdly', () => {
    const tiny = impact(createDeform(), 0, 1, { sizePercent: 1 });
    const huge = impact(createDeform(), 0, 1, { sizePercent: 100 });

    expect(tiny.compressionVelocity).toBeLessThanOrEqual(IMPULSE * 1.5);
    expect(huge.compressionVelocity).toBeGreaterThanOrEqual(IMPULSE * 0.6);
  });
});

describe('stretch', () => {
  it('holds a sustained lean instead of kicking the spring', () => {
    const held = stretch(createDeform(), 0, 1, PROFILE);

    // The distinguishing property: no velocity impulse, so it eases in and stays.
    expect(held.compressionVelocity).toBe(0);
    expect(held.target).toBeGreaterThan(0);
    expect(held.angle).toBe(0);
  });

  it('stays far shallower than a full impact', () => {
    // A drag lasts as long as the pointer moves, so at impact strength the
    // sprite reads as a rubber band being towed rather than a figure trailing
    // the cursor.
    const held = stretch(createDeform(), 0, 1, PROFILE);

    expect(held.target).toBeLessThan(MAX_COMPRESSION / 3);
  });

  it('settles at the target rather than oscillating around it', () => {
    const held = stretch(createDeform(), 0, 1, PROFILE);
    const settled = settle(held, 1);

    expect(settled.compression).toBeCloseTo(held.target, 3);
    expect(isDeformSettled(settled)).toBe(true);
  });

  it('never exceeds the drag ceiling however hard it is pulled', () => {
    const held = stretch(createDeform(), 0, 1, PROFILE);

    expect(settle(held, 1).compression).toBeLessThanOrEqual(MAX_DRAG_COMPRESSION);
  });

  it('scales with how fast the pointer is moving', () => {
    const slow = stretch(createDeform(), 0, 0.2, PROFILE);
    const fast = stretch(createDeform(), 0, 1, PROFILE);

    expect(slow.target).toBeLessThan(fast.target);
  });

  it('does not disturb an impact that is still ringing out', () => {
    // The impact should carry on wobbling; the drag merely adds a resting point
    // underneath it.
    const hit = impact(createDeform(), 0, 1, PROFILE);
    const held = stretch(hit, 0, 0.5, PROFILE);

    expect(held.compressionVelocity).toBe(hit.compressionVelocity);
  });
});

describe('releaseStretch', () => {
  it('drops the target back to neutral so the spring eases out', () => {
    // Released part-way into the lean, rather than before it has moved: he
    // should already be visibly stretched and then relax, not pop.
    const held = settle(stretch(createDeform(), 0, 1, PROFILE), 0.2);
    const released = releaseStretch(held);

    expect(released.target).toBe(0);
    expect(released.compression).toBeGreaterThan(0);
  });

  it('returns the sprite to its resting shape', () => {
    const released = releaseStretch(stretch(createDeform(), 0, 1, PROFILE));

    expect(settle(released, 1).compression).toBeCloseTo(0, 4);
  });
});

describe('stepDeform', () => {
  it('squashes first, then rebounds past rest before settling', () => {
    // The overshoot past zero is what makes the impact read as jelly rather
    // than a linear ease in and out.
    const hit = impact(createDeform(), 0, 1, PROFILE);

    expect(peakCompression(hit, 1)).toBeGreaterThan(MAX_COMPRESSION * 0.5);

    const rebound = peakCompression(hit, 1);
    expect(rebound).toBeGreaterThan(0);

    // Sample for a minimum value across the settle.
    let current = hit;
    let lowest = 0;
    for (let elapsed = 0; elapsed < 1.5; elapsed += 1 / 60) {
      current = stepDeform(current, 1 / 60);
      lowest = Math.min(lowest, current.compression);
    }
    expect(lowest).toBeLessThan(0);
  });

  it('caps the squash at the maximum allowed deformation', () => {
    const hit = impact(createDeform(), 0, 1, PROFILE);

    expect(peakCompression(hit, 1)).toBeLessThanOrEqual(MAX_COMPRESSION);
  });

  it('comes to rest within about a second', () => {
    const hit = impact(createDeform(), 0, 1, PROFILE);

    expect(isDeformSettled(settle(hit, 1.5))).toBe(true);
  });

  it('is already settled before any impact', () => {
    expect(isDeformSettled(createDeform())).toBe(true);
  });

  it('is settled while holding a steady stretch', () => {
    // A held target is a resting posture, not ongoing motion, so the loop is
    // allowed to stop writing transforms even though compression is non-zero.
    expect(isDeformSettled(settle(stretch(createDeform(), 0, 1, PROFILE), 1))).toBe(true);
  });

  it('stays stable across a long stalled frame', () => {
    // A backgrounded tab produces a multi-second delta. Naive integration would
    // blow the spring up or produce NaN here.
    const hit = impact(createDeform(), 0, 1, PROFILE);
    const result = stepDeform(hit, 3);

    expect(Number.isFinite(result.compression)).toBe(true);
    expect(Math.abs(result.compression)).toBeLessThanOrEqual(MAX_COMPRESSION);
  });

  it('behaves the same over one long frame as over many short ones', () => {
    const hit = impact(createDeform(), 0, 1, PROFILE);
    let many = hit;
    for (let i = 0; i < 6; i++) many = stepDeform(many, 1 / 60);

    const oneBig = stepDeform(hit, 6 / 60);

    expect(oneBig.compression).toBeCloseTo(many.compression, 3);
  });
});

describe('deformScale', () => {
  it('is the identity at rest', () => {
    expect(deformScale(createDeform())).toEqual({ along: 1, across: 1 });
  });

  it('flattens along the deform axis and stretches across it', () => {
    const squashed = deformScale({
      compression: 0.3,
      compressionVelocity: 0,
      angle: 0,
      target: 0,
    });

    expect(squashed.along).toBeLessThan(1);
    expect(squashed.across).toBeGreaterThan(1);
  });

  it('reverses past rest, stretching the axis on the rebound', () => {
    const stretched = deformScale({
      compression: -0.2,
      compressionVelocity: 0,
      angle: 0,
      target: 0,
    });

    expect(stretched.along).toBeGreaterThan(1);
    expect(stretched.across).toBeLessThan(1);
  });

  it('stays within bounds however extreme the spring gets', () => {
    const absurd = deformScale({
      compression: 99,
      compressionVelocity: 0,
      angle: 0,
      target: 0,
    });

    expect(absurd.along).toBeGreaterThanOrEqual(1 - MAX_COMPRESSION);
    expect(absurd.across).toBeGreaterThanOrEqual(1);
  });

  it('keeps the sprite roughly area-preserving rather than shrinking it', () => {
    // Squashing one axis while stretching the other is what reads as squash and
    // stretch; a plain scale would just look like a resize.
    const { along, across } = deformScale({
      compression: 0.3,
      compressionVelocity: 0,
      angle: 0,
      target: 0,
    });

    expect(along * across).toBeGreaterThan(0.98);
    expect(along * across).toBeLessThanOrEqual(1.02);
  });
});