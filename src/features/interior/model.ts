/**
 * Pure rules for the spacecraft-interior tour.
 *
 * This is the screen between the launch cinematic and the landing-site choice.
 * The player walks the transit habitat, hears one brief per room, and returns to
 * the cabin once every room has been visited. The landing-site screen is the
 * main game and is built later; the cabin's landing panel is the seam that will
 * pick it up when it lands.
 *
 * No DOM, no network, no Math.random, no clock. The view owns all of those; this
 * file is a function of its arguments so the room order, the walker, the
 * animation choice and the visited state can be asserted without a browser.
 */

/** The six room ids. The id is also the room image key. */
export type RoomId = 'cabin' | 'galley' | 'sleep' | 'lab' | 'logistics' | 'haven';

/** One room's copy, spawn, floor, fixed scale and movement rules. */
export interface Room {
  readonly id: RoomId;
  readonly name: string;
  /** What the room is. One or two sentences, written for ages 8-16. */
  readonly what: string;
  /** Why the room matters to the mission. */
  readonly why: string;
  /** Which way the astronaut points when the brief starts. */
  readonly point: 'left' | 'right';
  /** Where the player stands when the room opens, as a stage fraction. */
  readonly spawnX: number;
  /** Whether left/right movement is enabled in this room. */
  readonly walkable: boolean;
  /** Fixed size for the player sprite here. 1 is the base size. */
  readonly playerScale: number;
  /** The room's feet line, as a percentage from the stage bottom. */
  readonly playerBottom: number;
  /** The wall that phases to the next room, or null for a normal cut. */
  readonly exit: 'left' | 'right' | null;
}

/**
 * The tour, in play order.
 *
 * The cabin is first because it is where the player arrives and where the
 * landing-site choice will live. The safe haven is last because its airlock is
 * the natural "next stop, Mars" exit. Adding a seventh room later is one entry
 * here, its WebP in ROOM_IMAGES, and one more room image slot in index.html.
 * The view's count check fails loudly if a slot or map entry is missing.
 */
export const ROOMS: readonly Room[] = [
  {
    id: 'cabin',
    name: 'Orion Cabin',
    what:
      'This is the Orion cabin — our command post. The seats, the screens and the big porthole are where we fly the ship.',
    why:
      'Commander Vega is at the controls. From here we check our course, our air and our power before the last hop down to Mars.',
    point: 'right',
    spawnX: 0.42,
    walkable: false,
    playerScale: 1.2,
    playerBottom: 10,
    exit: null,
  },
  {
    id: 'galley',
    name: 'Common Area & Galley',
    what:
      'This is the common area. The table is where we eat together, and the porthole is where we watch Earth shrink behind us.',
    why:
      'The galley stores and heats our food. Meals keep the crew healthy, keep our sleep steady and keep us working as a team.',
    point: 'left',
    spawnX: 0.62,
    walkable: true,
    playerScale: 0.95,
    playerBottom: 10,
    exit: null,
  },
  {
    id: 'sleep',
    name: 'Crew Sleep Module',
    what:
      'These are our bunks. The straps stop us floating away while we sleep, and the lockers hold our personal things and medical supplies.',
    why:
      'Sleep is mission hardware. A crew that rests properly stays sharp for the months-long trip, and the medical kit is here if anyone needs it.',
    point: 'left',
    spawnX: 0.62,
    walkable: true,
    playerScale: 0.95,
    playerBottom: 10,
    exit: null,
  },
  {
    id: 'lab',
    name: 'Research Lab',
    what:
      'This is the lab, and it is the reason we came. The desks and screens are where we study Mars rocks and run experiments.',
    why:
      'Every sample we bring back teaches us how Mars works. What we learn here helps the crew on the surface — and the scientists back on Earth.',
    point: 'left',
    spawnX: 0.7,
    walkable: true,
    playerScale: 0.95,
    playerBottom: 10,
    exit: null,
  },
  {
    id: 'logistics',
    name: 'Logistics Bay',
    what:
      'This is the logistics bay — our warehouse in space. The racks hold food, spare parts, tools and the equipment we will need on Mars.',
    why:
      'Every box is counted and strapped down. If we know what we have and where it is, we can fix a broken part or survive a delay without a resupply ship.',
    point: 'left',
    spawnX: 0.55,
    walkable: true,
    playerScale: 0.95,
    playerBottom: 10,
    exit: null,
  },
  {
    id: 'haven',
    name: 'Safe Haven',
    what:
      'This is the safe haven — half crew lounge, half science bench. The couch is for downtime, and the microscope is where we make final checks on samples.',
    why:
      'A long mission needs a calm place to recharge. The airlock on the right is our door to the surface, so this is the last quiet room before Mars.',
    point: 'right',
    spawnX: 0.5,
    walkable: true,
    playerScale: 0.95,
    playerBottom: 16,
    exit: 'right',
  },
];

/** Rooms already seen. Kept as an array so it can live in a React-free view. */
export type VisitedRooms = readonly RoomId[];

/** The next room, wrapping from the safe haven back to the cabin. */
export function nextRoomIndex(index: number): number {
  return (index + 1) % ROOMS.length;
}

/** "Room 2 of 6", for the HUD. */
export function progressLabel(index: number): string {
  return `Room ${index + 1} of ${ROOMS.length}`;
}

/** The label on the Next button. The last room returns to the cabin. */
export function nextRoomLabel(index: number): string {
  return index === ROOMS.length - 1 ? 'Back to cabin' : 'Next room';
}

/**
 * The full keyboard hint.
 *
 * The cabin after the tour is the one case where N is not "next room": the
 * player is back at the hub and the next press starts the loop again. Saying so
 * is cheaper than a second button. The cabin is static, so its hint omits the
 * walk keys; every other room keeps the full hint.
 */
export function hintText(index: number, allVisited: boolean): string {
  let next: string;

  if (index === ROOMS.length - 1) {
    next = 'N — back to the cabin';
  } else if (allVisited && index === 0) {
    next = 'N — visit the rooms again';
  } else {
    next = 'N — next room';
  }

  const walk = ROOMS[index]?.walkable === false ? '' : '← → walk · ';

  return `${walk}${next} · R repeat brief`;
}

/** Add a room to the visited list, without duplicating it. */
export function markVisited(visited: VisitedRooms, room: RoomId): VisitedRooms {
  return visited.includes(room) ? visited : [...visited, room];
}

/** True once every room in the tour has been entered. */
export function allRoomsVisited(visited: VisitedRooms): boolean {
  return ROOMS.every((room) => visited.includes(room.id));
}

/**
 * Whether the landing-site panel belongs on screen.
 *
 * Only in the cabin, and only after the whole tour. The landing site is the main
 * game; this is the hook the cabin offers once the player has seen the ship.
 */
export function canChooseLanding(room: Room, visited: VisitedRooms): boolean {
  return room.id === 'cabin' && allRoomsVisited(visited);
}

/** Which way the astronaut faces. The sheet has a walk cycle for each. */
export type Facing = 'left' | 'right';

/** One of the two movement keys. */
export type Direction = 'left' | 'right';

/** The two held-direction flags, kept separate so the view can read them. */
export interface WalkerInput {
  readonly left: boolean;
  readonly right: boolean;
}

/** Where the player is horizontally and which way he is facing. */
export interface Walker {
  /** Horizontal position, 0 at the left edge of the stage and 1 at the right. */
  readonly x: number;
  readonly facing: Facing;
  readonly moving: boolean;
}

/**
 * The horizontal strip the player can walk in.
 *
 * X stops short of the stage edges so the 20%-wide sprite never hangs off the
 * picture. The feet use the room's own floor line; there is no depth axis.
 */
export const WALK_BOUNDS = {
  minX: 0.1,
  maxX: 0.9,
} as const;

/**
 * True once the player has reached a room's phase-through wall.
 *
 * Only a room with an exit transitions this way; every other room leaves
 * through N. The exit is the same walkable bound the player can reach, so the
 * wall is reached by walking rather than by a separate hidden trigger.
 */
export function isAtExit(room: Room, walker: Walker): boolean {
  if (room.exit === null) return false;

  return room.exit === 'right'
    ? walker.x >= WALK_BOUNDS.maxX
    : walker.x <= WALK_BOUNDS.minX;
}

/** Stage fractions per second. A full crossing takes just under three seconds. */
export const WALK_SPEED = 0.34;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A walker at the given spawn, facing right, standing still. */
export function createWalker(spawnX = 0.5): Walker {
  return {
    x: clamp(spawnX, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
    facing: 'right',
    moving: false,
  };
}

/**
 * Advance the walker by one frame's worth of time.
 *
 * With no input the walker stops but keeps his position and facing; with a zero
 * delta he is still "moving" in the sense that a key is held, which is what
 * keeps the walk cycle running.
 */
export function stepWalker(walker: Walker, input: WalkerInput, dtMs: number): Walker {
  const dt = Math.max(0, dtMs) / 1000;
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (dx === 0) {
    return walker.moving ? { ...walker, moving: false } : walker;
  }

  return {
    x: clamp(walker.x + dx * WALK_SPEED * dt, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
    facing: dx < 0 ? 'left' : 'right',
    moving: true,
  };
}

/**
 * The six strips the slicer writes. The names are also the WebP file names.
 *
 * `interact` is the two-arm wave; `interact-alt` is the one-arm wave and the
 * neutral stance. The greet holds the first frame of `interact`, the talk loops
 * both frames of `interact-alt`, and idle holds its neutral second frame.
 */
export type SpriteAnimation =
  | 'walk-left'
  | 'walk-right'
  | 'interact'
  | 'interact-alt'
  | 'point-left'
  | 'point-right';

/** What the brief is doing right now. */
export type Gesture = 'greet' | 'point' | 'talk' | 'idle';

/** One animation selection for the view. */
export interface SpriteState {
  readonly animation: SpriteAnimation;
  readonly frames: number;
  readonly cycleMs: number;
  readonly playing: boolean;
  /** The frame shown when `playing` is false, 0-based. */
  readonly frame: number;
}

/**
 * Frame counts and cycle lengths, matching the six strips on disk.
 *
 * A mismatch here would skip or freeze a frame, so the slicer prints the same
 * counts when it writes the strips. `interact` is a static wave, so its cycle is
 * 0; the view only reads `cycleMs` when `playing` is true.
 */
export const SPRITE_SPECS: Record<
  SpriteAnimation,
  { readonly frames: number; readonly cycleMs: number }
> = {
  'walk-left': { frames: 8, cycleMs: 720 },
  'walk-right': { frames: 8, cycleMs: 720 },
  interact: { frames: 2, cycleMs: 0 },
  'interact-alt': { frames: 2, cycleMs: 1200 },
  'point-left': { frames: 1, cycleMs: 0 },
  'point-right': { frames: 1, cycleMs: 0 },
};

/**
 * Pick the animation for this frame.
 *
 * Movement always wins: a player who walks during the brief should see the walk
 * cycle, not a talking pose sliding across the floor. Once he stops, the current
 * gesture comes back.
 */
export function spriteFor(walker: Walker, gesture: Gesture, point: 'left' | 'right'): SpriteState {
  if (walker.moving) {
    const animation = walker.facing === 'left' ? 'walk-left' : 'walk-right';

    return { animation, ...SPRITE_SPECS[animation], playing: true, frame: 0 };
  }

  if (gesture === 'greet') {
    return { animation: 'interact', ...SPRITE_SPECS.interact, playing: false, frame: 0 };
  }

  if (gesture === 'point') {
    const animation = point === 'left' ? 'point-left' : 'point-right';

    return { animation, ...SPRITE_SPECS[animation], playing: false, frame: 0 };
  }

  if (gesture === 'talk') {
    return { animation: 'interact-alt', ...SPRITE_SPECS['interact-alt'], playing: true, frame: 0 };
  }

  return { animation: 'interact-alt', ...SPRITE_SPECS['interact-alt'], playing: false, frame: 1 };
}

/** How long the astronaut waves when a room opens. */
export const GREET_MS = 1000;
/** How long he holds the point at the room's main feature. */
export const POINT_MS = 1200;
/** How long he gestures while the brief is on screen. */
export const TALK_MS = 2500;

/**
 * What to say when the landing button is pressed before the landing screen is
 * built. The view shows this instead of navigating to a dead end.
 */
export const LANDING_COMING_SOON = 'The Mars map is the next part of the game.';

/** Longest speaker name shown above the brief. */
const MAX_SPEAKER_LENGTH = 24;

/**
 * Control, zero-width and bidi-override characters.
 *
 * The name is already validated by the naming screen, but this screen can be
 * opened directly with no run at all, and a bidi override in a name would
 * scramble the whole speech panel. Stripping is cheaper than trusting.
 */
const UNSAFE_NAME_CHARS =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * The player's name as a speaker label.
 *
 * `Array.from` counts code points, not UTF-16 units, so a long emoji name is
 * shortened without splitting a surrogate pair into a replacement character.
 */
export function speakerName(raw: string | null | undefined): string {
  const cleaned = (raw ?? '')
    .replace(UNSAFE_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const shortened = Array.from(cleaned).slice(0, MAX_SPEAKER_LENGTH).join('').trim();

  return shortened === '' ? 'Astronaut' : shortened;
}
