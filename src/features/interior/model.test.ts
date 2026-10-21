import { describe, expect, it } from 'vitest';

import {
  GREET_MS,
  LANDING_COMING_SOON,
  POINT_MS,
  ROOMS,
  TALK_MS,
  WALK_BOUNDS,
  WALK_SPEED,
  allRoomsVisited,
  canChooseLanding,
  createWalker,
  hintText,
  isAtExit,
  markVisited,
  nextRoomIndex,
  nextRoomLabel,
  progressLabel,
  speakerName,
  spriteFor,
  stepWalker,
  type WalkerInput,
} from './model';

/**
 * Every input is literal. No Math.random, no clock, no DOM: the walker and the
 * room table are functions of their arguments, so these tests cannot flake.
 */

function input(overrides: Partial<WalkerInput> = {}): WalkerInput {
  return { left: false, right: false, ...overrides };
}

describe('ROOMS', () => {
  it('lists the six rooms in tour order', () => {
    expect(ROOMS.map((room) => room.id)).toEqual([
      'cabin',
      'galley',
      'sleep',
      'lab',
      'logistics',
      'haven',
    ]);
  });

  it('gives every room a unique id and name', () => {
    expect(new Set(ROOMS.map((room) => room.id)).size).toBe(ROOMS.length);
    expect(new Set(ROOMS.map((room) => room.name)).size).toBe(ROOMS.length);
  });

  it('gives every room a non-empty brief that ends in a full stop', () => {
    for (const room of ROOMS) {
      expect(room.name.trim()).toBe(room.name);
      expect(room.name.length).toBeGreaterThan(0);
      expect(room.what.length).toBeGreaterThan(0);
      expect(room.why.length).toBeGreaterThan(0);
      expect(room.what.endsWith('.')).toBe(true);
      expect(room.why.endsWith('.')).toBe(true);
      expect(room.what.length).toBeLessThan(220);
      expect(room.why.length).toBeLessThan(220);
    }
  });

  it('points only left or right', () => {
    for (const room of ROOMS) {
      expect(['left', 'right']).toContain(room.point);
    }
  });

  it('spawns every room inside the walkable strip', () => {
    for (const room of ROOMS) {
      expect(room.spawnX).toBeGreaterThanOrEqual(WALK_BOUNDS.minX);
      expect(room.spawnX).toBeLessThanOrEqual(WALK_BOUNDS.maxX);
    }
  });

  it('keeps the cabin static and closer than the walking rooms', () => {
    expect(ROOMS[0].walkable).toBe(false);
    expect(ROOMS[0].playerScale).toBeGreaterThan(1);
    expect(ROOMS[0].playerScale).toBeGreaterThan(ROOMS[1].playerScale);

    for (const room of ROOMS.slice(1)) {
      expect(room.walkable).toBe(true);
      expect(room.playerScale).toBe(0.95);
    }
  });

  it('gives the safe haven a raised floor and a right-wall exit', () => {
    const haven = ROOMS[ROOMS.length - 1];

    expect(haven.id).toBe('haven');
    expect(haven.playerBottom).toBeGreaterThan(ROOMS[0].playerBottom);
    expect(haven.exit).toBe('right');

    for (const room of ROOMS.slice(0, -1)) {
      expect(room.playerBottom).toBe(10);
      expect(room.exit).toBeNull();
    }
  });
});

describe('nextRoomIndex', () => {
  it('walks forward and wraps from the safe haven to the cabin', () => {
    expect([0, 1, 2, 3, 4, 5].map(nextRoomIndex)).toEqual([1, 2, 3, 4, 5, 0]);
  });
});

describe('progressLabel', () => {
  it('counts from one, not zero', () => {
    expect(progressLabel(0)).toBe('Room 1 of 6');
    expect(progressLabel(5)).toBe('Room 6 of 6');
  });
});

describe('nextRoomLabel', () => {
  it('says next room until the last room, which returns to the cabin', () => {
    expect(nextRoomLabel(0)).toBe('Next room');
    expect(nextRoomLabel(4)).toBe('Next room');
    expect(nextRoomLabel(5)).toBe('Back to cabin');
  });
});

describe('hintText', () => {
  it('names the next room before the tour is complete', () => {
    expect(hintText(0, false)).toContain('N — next room');
    expect(hintText(1, false)).toContain('N — next room');
  });

  it('names the cabin as the destination on the last room', () => {
    expect(hintText(5, true)).toContain('N — back to the cabin');
  });

  it('offers the loop again once the cabin is complete', () => {
    expect(hintText(0, true)).toContain('N — visit the rooms again');
  });

  it('always mentions repeat', () => {
    expect(hintText(0, false)).toContain('R repeat brief');
  });

  it('omits the walk keys in the static cabin', () => {
    expect(hintText(0, false)).not.toContain('walk');
    expect(hintText(0, true)).not.toContain('walk');
    expect(hintText(1, false)).toContain('← → walk');
  });
});

describe('markVisited', () => {
  it('adds a room once', () => {
    expect(markVisited([], 'cabin')).toEqual(['cabin']);
  });

  it('returns the same list for a room already seen', () => {
    const once = markVisited([], 'cabin');

    expect(markVisited(once, 'cabin')).toBe(once);
  });
});

describe('allRoomsVisited', () => {
  it('is false while any room is missing', () => {
    expect(allRoomsVisited(['cabin', 'galley', 'sleep', 'lab', 'logistics'])).toBe(false);
  });

  it('is true once every room has been seen', () => {
    expect(allRoomsVisited(['cabin', 'galley', 'sleep', 'lab', 'logistics', 'haven'])).toBe(
      true,
    );
  });
});

describe('canChooseLanding', () => {
  const all = ['cabin', 'galley', 'sleep', 'lab', 'logistics', 'haven'] as const;

  it('opens only in the cabin after the whole tour', () => {
    expect(canChooseLanding(ROOMS[0], all)).toBe(true);
  });

  it('stays closed in another room even after the tour', () => {
    expect(canChooseLanding(ROOMS[1], all)).toBe(false);
  });

  it('stays closed in the cabin before the tour is finished', () => {
    expect(canChooseLanding(ROOMS[0], ['cabin', 'galley'])).toBe(false);
  });
});

describe('createWalker', () => {
  it('faces right and stands still', () => {
    const walker = createWalker(0.5);

    expect(walker).toEqual({ x: 0.5, facing: 'right', moving: false });
  });

  it('clamps a spawn that is outside the strip', () => {
    const walker = createWalker(2);
    const low = createWalker(-1);

    expect(walker.x).toBe(WALK_BOUNDS.maxX);
    expect(low.x).toBe(WALK_BOUNDS.minX);
  });
});

describe('stepWalker', () => {
  it('moves right at the walking speed', () => {
    const start = createWalker(0.2);
    const moved = stepWalker(start, input({ right: true }), 1000);

    expect(moved.x).toBeCloseTo(0.2 + WALK_SPEED, 10);
    expect(moved.facing).toBe('right');
    expect(moved.moving).toBe(true);
  });

  it('moves left and turns to face left', () => {
    const start = createWalker(0.5);
    const moved = stepWalker(start, input({ left: true }), 500);

    expect(moved.x).toBeCloseTo(0.5 - WALK_SPEED * 0.5, 10);
    expect(moved.facing).toBe('left');
  });

  it('clamps at the left and right edges', () => {
    const right = stepWalker(createWalker(0.88), input({ right: true }), 1000);
    const left = stepWalker(createWalker(0.12), input({ left: true }), 1000);

    expect(right.x).toBe(WALK_BOUNDS.maxX);
    expect(left.x).toBe(WALK_BOUNDS.minX);
  });

  it('stops but keeps position and facing when the keys are released', () => {
    const moving = stepWalker(createWalker(0.4), input({ left: true }), 100);
    const stopped = stepWalker(moving, input(), 100);

    expect(stopped.moving).toBe(false);
    expect(stopped.x).toBe(moving.x);
    expect(stopped.facing).toBe('left');
  });

  it('marks a held key as moving even with a zero delta', () => {
    const start = createWalker(0.5);
    const held = stepWalker(start, input({ right: true }), 0);

    expect(held.moving).toBe(true);
    expect(held.x).toBe(start.x);
  });
});

describe('isAtExit', () => {
  it('detects the safe haven airlock wall', () => {
    const haven = ROOMS[ROOMS.length - 1];

    expect(isAtExit(haven, createWalker(0.5))).toBe(false);
    expect(isAtExit(haven, createWalker(WALK_BOUNDS.maxX))).toBe(true);
  });

  it('ignores the same wall in a room without an exit', () => {
    expect(isAtExit(ROOMS[1], createWalker(WALK_BOUNDS.maxX))).toBe(false);
  });
});

describe('spriteFor', () => {
  const still = createWalker(0.5);

  it('walks right and left while moving', () => {
    const right = stepWalker(still, input({ right: true }), 100);
    const left = stepWalker(still, input({ left: true }), 100);

    expect(spriteFor(right, 'idle', 'left').animation).toBe('walk-right');
    expect(spriteFor(left, 'idle', 'left').animation).toBe('walk-left');
  });

  it('holds the two-arm wave for the greeting', () => {
    expect(spriteFor(still, 'greet', 'left')).toEqual({
      animation: 'interact',
      frames: 2,
      cycleMs: 0,
      playing: false,
      frame: 0,
    });
  });

  it('uses the one-arm strip that matches the room', () => {
    expect(spriteFor(still, 'point', 'left').animation).toBe('point-left');
    expect(spriteFor(still, 'point', 'right').animation).toBe('point-right');
    expect(spriteFor(still, 'point', 'left').frames).toBe(1);
    expect(spriteFor(still, 'point', 'left').playing).toBe(false);
  });

  it('loops the talking gesture while the brief is up', () => {
    expect(spriteFor(still, 'talk', 'left')).toEqual({
      animation: 'interact-alt',
      frames: 2,
      cycleMs: 1200,
      playing: true,
      frame: 0,
    });
  });

  it('rests on the neutral frame when idle', () => {
    expect(spriteFor(still, 'idle', 'left')).toEqual({
      animation: 'interact-alt',
      frames: 2,
      cycleMs: 1200,
      playing: false,
      frame: 1,
    });
  });
});

describe('gesture timings', () => {
  it('gives every phase a positive duration', () => {
    expect(GREET_MS).toBeGreaterThan(0);
    expect(POINT_MS).toBeGreaterThan(0);
    expect(TALK_MS).toBeGreaterThan(0);
  });
});

describe('speakerName', () => {
  it('trims and collapses whitespace', () => {
    expect(speakerName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
  });

  it('strips control and bidi-override characters', () => {
    expect(speakerName('Ada\u202e')).toBe('Ada');
    expect(speakerName('\u0000Ada\u0007')).toBe('Ada');
  });

  it('falls back to Astronaut for a missing or empty name', () => {
    expect(speakerName('')).toBe('Astronaut');
    expect(speakerName('   ')).toBe('Astronaut');
    expect(speakerName(null)).toBe('Astronaut');
    expect(speakerName(undefined)).toBe('Astronaut');
  });

  it('shortens a long name without splitting an emoji', () => {
    expect(speakerName('A'.repeat(30))).toBe('A'.repeat(24));
    expect(speakerName('🚀'.repeat(30))).toBe('🚀'.repeat(24));
  });
});

describe('LANDING_COMING_SOON', () => {
  it('is a full sentence rather than an empty hook', () => {
    expect(LANDING_COMING_SOON.length).toBeGreaterThan(0);
    expect(LANDING_COMING_SOON.endsWith('.')).toBe(true);
  });
});
