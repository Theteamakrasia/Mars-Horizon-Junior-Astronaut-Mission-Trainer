import { describe, it, expect } from 'vitest';
import { MODULE_CATALOGUE } from '../sim/modules';
import raw from './baseLayout.json';
import {
  DEFAULT_POSES,
  DEPTH_ORDER,
  LAYOUT_PROBLEMS,
  MODULE_POSES,
  PANEL_RIGHT_EDGE,
  SPOT_BAND,
  buildLayoutJson,
  clamp,
  clampSpot,
  depthFor,
  describeLayoutProblems,
  pointToPercent,
  poseFor,
  resolvePoses,
  roundSpot,
} from './baseLayout';

/** A layout with the right number of poses for every kind, so only the thing under test is wrong. */
function complete(): Record<string, { left: number; bottom: number; width: number }[]> {
  const layout: Record<string, { left: number; bottom: number; width: number }[]> = {};

  for (const spec of MODULE_CATALOGUE) {
    layout[spec.kind] = Array.from({ length: spec.maxCount }, () => ({ left: 10, bottom: 20, width: 15 }));
  }

  return layout;
}

describe('SPOT_BAND', () => {
  it('keeps every band ordered', () => {
    expect(SPOT_BAND.left.min).toBeLessThan(SPOT_BAND.left.max);
    expect(SPOT_BAND.bottom.min).toBeLessThan(SPOT_BAND.bottom.max);
    expect(SPOT_BAND.width.min).toBeLessThan(SPOT_BAND.width.max);
  });

  it('matches the CSS clamp in styles/game-loop.css', () => {
    // Rule 11 of check-markup.mjs compares the same numbers. This test is the
    // other half: it fails here too, so a change is noticed even if the
    // checker is not run.
    expect(SPOT_BAND.left).toEqual({ min: 2, max: 92 });
    expect(SPOT_BAND.bottom).toEqual({ min: 2, max: 32 });
    expect(SPOT_BAND.width).toEqual({ min: 6, max: 24 });
  });
});

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(5, 2, 92)).toBe(5);
    expect(clamp(-4, 2, 92)).toBe(2);
    expect(clamp(400, 2, 92)).toBe(92);
  });

  it('turns a number that is not a number into the minimum', () => {
    expect(clamp(Number.NaN, 2, 92)).toBe(2);
    expect(clamp(Number.POSITIVE_INFINITY, 2, 92)).toBe(2);
  });
});

describe('clampSpot', () => {
  it('pulls every number into the band', () => {
    const spot = clampSpot({ left: 400, bottom: -20, width: 2 });

    expect(spot.left).toBe(SPOT_BAND.left.max);
    expect(spot.bottom).toBe(SPOT_BAND.bottom.min);
    expect(spot.width).toBe(SPOT_BAND.width.min);
  });

  it('leaves a legal spot alone', () => {
    const spot = { left: 28, bottom: 30, width: 20 };

    expect(clampSpot(spot)).toEqual({ ...spot, flip: false });
  });

  it('keeps a module from hanging off the right-hand edge', () => {
    const spot = clampSpot({ left: 90, bottom: 30, width: 24 });

    expect(spot.left + spot.width).toBeLessThanOrEqual(PANEL_RIGHT_EDGE);
  });

  it('never shrinks a module below the smallest the band allows', () => {
    const spot = clampSpot({ left: 95, bottom: 30, width: 24 });

    expect(spot.width).toBeGreaterThanOrEqual(SPOT_BAND.width.min);
    expect(spot.left + spot.width).toBeLessThanOrEqual(PANEL_RIGHT_EDGE);
  });
});

describe('roundSpot', () => {
  it('rounds every number to one decimal', () => {
    const spot = roundSpot({ left: 45.58845757471659, bottom: 20.244645987348527, width: 20.04 });

    expect(spot).toEqual({ left: 45.6, bottom: 20.2, width: 20, flip: false });
  });

  it('leaves an already-round spot alone', () => {
    const spot = { left: 28, bottom: 30, width: 20 };

    expect(roundSpot(spot)).toEqual({ ...spot, flip: false });
  });
});

describe('resolvePoses', () => {
  it('gives every kind one pose per copy the player can build', () => {
    const poses = resolvePoses({});

    for (const spec of MODULE_CATALOGUE) {
      expect(poses[spec.kind]).toHaveLength(spec.maxCount);
    }
  });

  it('reads a complete layout', () => {
    const poses = resolvePoses({
      habitat: [{ left: 10, bottom: 20, width: 15 }],
    });

    expect(poses.habitat[0]).toEqual({ left: 10, bottom: 20, width: 15, flip: false });
  });

  it('reads the old shape, where a kind held one pose', () => {
    const poses = resolvePoses({
      habitat: { left: 10, bottom: 20, width: 15 },
    });

    expect(poses.habitat[0]).toEqual({ left: 10, bottom: 20, width: 15, flip: false });
  });

  it('falls back to the default for a kind that is missing', () => {
    const poses = resolvePoses({});

    expect(poses.habitat[0]).toEqual({ ...DEFAULT_POSES.habitat[0], flip: false });
  });

  it('falls back to the default for a pose that is not a spot', () => {
    const poses = resolvePoses({ habitat: ['over there'] });

    expect(poses.habitat[0]).toEqual({ ...DEFAULT_POSES.habitat[0], flip: false });
  });

  it('derives the copies a short list does not cover', () => {
    const poses = resolvePoses({
      'solar-array': [{ left: 4, bottom: 30, width: 20 }],
    });

    expect(poses['solar-array']).toHaveLength(4);
    /* The derived copy steps right by half a slot and shrinks. */
    expect(poses['solar-array'][1].left).toBe(14);
    expect(poses['solar-array'][1].width).toBe(17);
  });

  it('cuts the copies a long list does not need', () => {
    const poses = resolvePoses({
      habitat: [
        { left: 10, bottom: 20, width: 15 },
        { left: 20, bottom: 20, width: 15 },
      ],
    });

    expect(poses.habitat).toHaveLength(1);
  });

  it('survives a source that is not an object at all', () => {
    const poses = resolvePoses('nonsense');

    expect(poses.habitat[0]).toEqual({ ...DEFAULT_POSES.habitat[0], flip: false });
  });
});

describe('poseFor', () => {
  it('returns the pose the file records', () => {
    const poses = resolvePoses({
      'solar-array': [
        { left: 1, bottom: 2, width: 10 },
        { left: 3, bottom: 4, width: 12 },
      ],
    });

    expect(poseFor(poses, 'solar-array', 1)).toEqual({ left: 3, bottom: 4, width: 12, flip: false });
  });

  it('derives a pose the file does not have', () => {
    const poses = resolvePoses({
      'solar-array': [{ left: 1, bottom: 2, width: 10 }],
    });

    const spot = poseFor(poses, 'solar-array', 3);

    expect(spot.left).toBeGreaterThan(1);
    expect(spot.width).toBeLessThan(10);
  });

  it('returns something for a kind the file never mentions', () => {
    const poses = resolvePoses({});

    expect(poseFor(poses, 'habitat', 0)).toEqual({ ...DEFAULT_POSES.habitat[0], flip: false });
  });
});

describe('describeLayoutProblems', () => {
  it('says nothing about a good layout', () => {
    expect(describeLayoutProblems(complete())).toEqual([]);
  });

  it('names a missing kind', () => {
    const layout = complete();

    delete layout.habitat;

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat') && line.includes('missing'))).toBe(true);
  });

  it('names a number that had to be clamped', () => {
    const layout = complete();

    layout.habitat[0] = { left: 400, bottom: 20, width: 15 };

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat[0].left') && line.includes('clamped'))).toBe(true);
  });

  it('names a list with too few poses', () => {
    const layout = complete();

    layout['solar-array'] = [{ left: 10, bottom: 20, width: 15 }];

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('solar-array') && line.includes('derived'))).toBe(true);
  });

  it('names a list with too many poses', () => {
    const layout = complete();

    layout.habitat = [
      { left: 10, bottom: 20, width: 15 },
      { left: 12, bottom: 20, width: 15 },
    ];

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat') && line.includes('ignored'))).toBe(true);
  });

  it('names a kind that is not in the catalogue', () => {
    const layout = complete();

    layout['rocket-chair'] = [{ left: 1, bottom: 1, width: 1 }];

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('rocket-chair'))).toBe(true);
  });

  it('reports a source that is not an object', () => {
    expect(describeLayoutProblems('nonsense')).toHaveLength(1);
  });
});

describe('the stacking order', () => {
  it('names every module kind exactly once', () => {
    const kinds = DEPTH_ORDER.map((entry) => entry.kind);

    expect(new Set(kinds).size).toBe(kinds.length);
    expect([...kinds].sort()).toEqual([...MODULE_CATALOGUE.map((spec) => spec.kind)].sort());
  });

  it('puts every copy of a kind behind every copy of the kind after it', () => {
    for (let i = 0; i < DEPTH_ORDER.length - 1; i++) {
      const behind = DEPTH_ORDER[i].kind;
      const inFront = DEPTH_ORDER[i + 1].kind;

      for (let copy = 0; copy < 4; copy += 1) {
        expect(depthFor(behind, copy)).toBeLessThan(depthFor(inFront, 0));
      }
    }
  });

  it('puts the habitat nearest and the shields farthest', () => {
    expect(depthFor('habitat', 0)).toBeGreaterThan(depthFor('life-support', 0));
    expect(depthFor('life-support', 0)).toBeGreaterThan(depthFor('batteries', 0));
    expect(depthFor('regolith-shield', 0)).toBeLessThan(depthFor('ice-miner', 0));
  });

  it('steps the copies of a solar array towards the camera', () => {
    expect(depthFor('solar-array', 0)).toBeLessThan(depthFor('solar-array', 1));
    expect(depthFor('solar-array', 1)).toBeLessThan(depthFor('solar-array', 2));
    expect(depthFor('solar-array', 2)).toBeLessThan(depthFor('solar-array', 3));
  });

  it('steps the copies of a battery bank too', () => {
    expect(depthFor('batteries', 0)).toBeLessThan(depthFor('batteries', 1));
    expect(depthFor('batteries', 3)).toBeLessThan(depthFor('life-support', 0));
  });

  it('gives the two regolith shields the same depth', () => {
    expect(depthFor('regolith-shield', 0)).toBe(depthFor('regolith-shield', 1));
  });

  it('keeps every depth inside the space the order reserves', () => {
    for (const spec of MODULE_CATALOGUE) {
      for (let copy = 0; copy < spec.maxCount; copy += 1) {
        const depth = depthFor(spec.kind, copy);
        const rank = DEPTH_ORDER.findIndex((entry) => entry.kind === spec.kind);

        expect(depth).toBeGreaterThanOrEqual(rank * 10);
        expect(depth).toBeLessThan((rank + 1) * 10);
      }
    }
  });
});

describe('mirroring', () => {
  it('reads a mirrored pose', () => {
    const poses = resolvePoses({ habitat: [{ left: 10, bottom: 20, width: 15, flip: true }] });

    expect(poses.habitat[0].flip).toBe(true);
  });

  it('treats a pose with no flip as not mirrored', () => {
    const poses = resolvePoses({ habitat: [{ left: 10, bottom: 20, width: 15 }] });

    expect(poses.habitat[0].flip).toBe(false);
  });

  it('treats a flip that is not true as not mirrored', () => {
    const poses = resolvePoses({ habitat: [{ left: 10, bottom: 20, width: 15, flip: 'yes' }] });

    expect(poses.habitat[0].flip).toBe(false);
  });

  it('keeps the mirror through clamping and rounding', () => {
    expect(clampSpot({ left: 10, bottom: 20, width: 15, flip: true }).flip).toBe(true);
    expect(roundSpot({ left: 10, bottom: 20, width: 15, flip: true }).flip).toBe(true);
  });

  it('writes the mirror only for a module that is mirrored', () => {
    const poses = {
      ...MODULE_POSES,
      habitat: [{ left: 28, bottom: 30, width: 20, flip: true }],
      greenhouse: [{ left: 52, bottom: 30, width: 20 }],
    };
    const parsed = JSON.parse(buildLayoutJson(poses)) as { habitat: { flip?: boolean }[]; greenhouse: { flip?: boolean }[] };

    expect(parsed.habitat[0].flip).toBe(true);
    expect(parsed.greenhouse[0].flip).toBeUndefined();
  });

  it('reports a flip that is neither true nor false', () => {
    const layout = complete();

    layout.habitat[0] = { ...layout.habitat[0], flip: 'yes' } as never;

    const problems = describeLayoutProblems(layout);

    expect(problems.some((line) => line.includes('habitat[0].flip'))).toBe(true);
  });

  it('reads every flip in the shipped layout as a boolean', () => {
    /* Not "the shipped layout is unmirrored" — that would fail the moment a
     * developer did the one thing this tool is for. What matters is that
     * every flip in the file is a real yes or no. */
    for (const spec of MODULE_CATALOGUE) {
      for (const spot of MODULE_POSES[spec.kind]) {
        expect(typeof spot.flip).toBe('boolean');
      }
    }
  });
});

describe('pointToPercent', () => {
  const panel = { x: 100, y: 50, width: 400, height: 200 };

  it('reads the bottom-left corner', () => {
    expect(pointToPercent({ x: 100, y: 250 }, panel)).toEqual({ left: 0, bottom: 0 });
  });

  it('reads the top-right corner', () => {
    expect(pointToPercent({ x: 500, y: 50 }, panel)).toEqual({ left: 100, bottom: 100 });
  });

  it('reads the middle', () => {
    expect(pointToPercent({ x: 300, y: 150 }, panel)).toEqual({ left: 50, bottom: 50 });
  });

  it('returns zero for a panel with no size', () => {
    expect(pointToPercent({ x: 10, y: 10 }, { x: 0, y: 0, width: 0, height: 0 })).toEqual({ left: 0, bottom: 0 });
  });
});

describe('buildLayoutJson', () => {
  it('writes one list per catalogue kind, in catalogue order', () => {
    const json = buildLayoutJson(MODULE_POSES);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(Object.keys(parsed)).toEqual(MODULE_CATALOGUE.map((spec) => spec.kind));
  });

  it('writes one entry per copy', () => {
    const parsed = JSON.parse(buildLayoutJson(MODULE_POSES)) as Record<string, unknown[]>;

    for (const spec of MODULE_CATALOGUE) {
      expect(parsed[spec.kind]).toHaveLength(spec.maxCount);
    }
  });

  it('rounds a position to one decimal', () => {
    const poses = { ...MODULE_POSES, habitat: [{ left: 28.12345, bottom: 30, width: 20 }] };
    const parsed = JSON.parse(buildLayoutJson(poses)) as { habitat: { left: number }[] };

    expect(parsed.habitat[0].left).toBe(28.1);
  });

  it('ends with a newline, so the file is well formed', () => {
    expect(buildLayoutJson(MODULE_POSES).endsWith('}\n')).toBe(true);
  });
});

describe('the layout file that ships with the game', () => {
  it('has no problems', () => {
    expect(LAYOUT_PROBLEMS).toEqual([]);
    expect(describeLayoutProblems(raw)).toEqual([]);
  });

  it('has an entry for every module kind', () => {
    for (const spec of MODULE_CATALOGUE) {
      expect((raw as Record<string, unknown>)[spec.kind]).toBeDefined();
    }
  });

  it('has one pose per copy the player can build', () => {
    for (const spec of MODULE_CATALOGUE) {
      expect(MODULE_POSES[spec.kind]).toHaveLength(spec.maxCount);
    }
  });

  it('puts every module inside the band', () => {
    for (const spec of MODULE_CATALOGUE) {
      for (const spot of MODULE_POSES[spec.kind]) {
        expect(spot.left).toBeGreaterThanOrEqual(SPOT_BAND.left.min);
        expect(spot.left).toBeLessThanOrEqual(SPOT_BAND.left.max);
        expect(spot.bottom).toBeGreaterThanOrEqual(SPOT_BAND.bottom.min);
        expect(spot.bottom).toBeLessThanOrEqual(SPOT_BAND.bottom.max);
        expect(spot.width).toBeGreaterThanOrEqual(SPOT_BAND.width.min);
        expect(spot.width).toBeLessThanOrEqual(SPOT_BAND.width.max);
        expect(spot.left + spot.width).toBeLessThanOrEqual(PANEL_RIGHT_EDGE);
      }
    }
  });
});
