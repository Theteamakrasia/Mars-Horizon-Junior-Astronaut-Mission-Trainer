/**
 * Rover Parking: the ground the rover has to cross.
 *
 * A 6×6 patch of Mars with rocks on it. The rover starts at one corner and
 * has to reach the outpost at the other, and the player gets a few moves more
 * than the shortest way there — enough to think, not enough to wander.
 *
 * Pure. The maps are rows of characters, and the shortest route is found with
 * a breadth-first search, so every map is proved solvable by a test rather
 * than by eye.
 */

import type { TrainingPerformance } from './training';

/** The patch of ground is 6×6. */
export const ROVER_SIZE = 6;

/**
 * The maps.
 *
 * `R` is the rover, `P` the outpost, `S` a sample to bring home, `#` a rock
 * and `.` open ground. Each map is checked by `trainingRover.test.ts`: the
 * route has to exist, the sample has to be reachable, and the player is given
 * that route plus a few moves of slack.
 */
export const ROVER_MAPS: readonly (readonly string[])[] = [
  ['R.....', '.##...', '..#S#.', '....#.', '.#.#..', '....#P'],
  ['R#....', '.#...#', '..S#..', '.#..#.', '..#...', '....#P'],
  ['R.....', '.#.#..', '..S#.#', '.#...#', '#.#...', '....#P'],
  ['R..#..', '.##.#.', '..S...', '.#..#.', '...#..', '..#..P'],
  ['R#..#.', '..#...', '.#..S.', '...#..', '#...#.', '....#P'],
  ['R.....', '.#.#.#', '...S..', '.#...#', '#.#...', '.....P'],
];

/**
 * How many moves the player gets over the shortest route.
 *
 * Six is enough to walk round a rock and try again, and few enough that the
 * player has to look at the ground before moving.
 */
export const ROVER_EXTRA_MOVES = 6;

/** Finishing within this many wasted moves is an excellent run. */
export const ROVER_EXCELLENT_WASTED = 2;

/** Finishing within this many wasted moves is a good run. */
export const ROVER_GOOD_WASTED = 4;

/**
 * How the rover round goes at a level.
 *
 * The goal grows for the first three levels: level 1 is to reach the outpost,
 * level 2 is to bring a sample home, and level 3 is a new piece of ground to
 * do it on. From the fourth level on the goal stays and the allowance
 * shrinks - fewer moves over the shortest route - so each level is the same
 * job with less room to think.
 *
 * The bands widen as the round gets harder, so the player is paid the same for
 * the same quality of work whatever the level is.
 */
export interface RoverDifficulty {
  /** The moves over the shortest route the player is given. */
  readonly spare: number;
  /** True when the rover has to bring a sample home as well as arrive. */
  readonly deliver: boolean;
  /** Which map the round is played on. */
  readonly map: number;
  /** The wasted moves an excellent run allows. */
  readonly excellent: number;
  /** The wasted moves a good run allows. */
  readonly good: number;
}

/** One row per level. The first is the game as it always was. */
const ROVER_DIFFICULTY: readonly RoverDifficulty[] = [
  { spare: 6, deliver: false, map: 0, excellent: 2, good: 4 },
  { spare: 6, deliver: true, map: 0, excellent: 3, good: 5 },
  { spare: 6, deliver: true, map: 1, excellent: 3, good: 5 },
  { spare: 5, deliver: true, map: 1, excellent: 3, good: 5 },
  { spare: 5, deliver: true, map: 2, excellent: 4, good: 6 },
  { spare: 4, deliver: true, map: 2, excellent: 4, good: 6 },
  { spare: 4, deliver: true, map: 3, excellent: 4, good: 6 },
  { spare: 3, deliver: true, map: 3, excellent: 5, good: 7 },
  { spare: 3, deliver: true, map: 4, excellent: 5, good: 7 },
  { spare: 2, deliver: true, map: 4, excellent: 5, good: 7 },
  { spare: 2, deliver: true, map: 5, excellent: 6, good: 8 },
  { spare: 1, deliver: true, map: 5, excellent: 6, good: 8 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function roverDifficulty(level: number): RoverDifficulty {
  const step = Math.min(ROVER_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return ROVER_DIFFICULTY[step - 1] as RoverDifficulty;
}

/** Which way the rover can go. */
export type RoverDirection = 'up' | 'down' | 'left' | 'right';

/** The step each direction takes, as [row, column]. */
export const ROVER_STEPS: Readonly<Record<RoverDirection, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/** Where one character stands on a map. */
export function roverCell(map: readonly string[], mark: string): readonly [number, number] | null {
  for (let row = 0; row < map.length; row += 1) {
    const column = map[row]?.indexOf(mark) ?? -1;

    if (column >= 0) return [row, column];
  }

  return null;
}

/** Is this square open ground? */
export function roverOpen(map: readonly string[], row: number, column: number): boolean {
  const line = map[row];

  if (line === undefined) return false;

  const cell = line[column];

  return cell !== undefined && cell !== '#';
}

/**
 * The fewest moves from the rover to the outpost, or -1 when there is no way.
 *
 * A breadth-first search over the open ground. It is also what the move
 * budget is built from: the player is given the shortest route plus a few
 * moves, so every map is winnable by construction.
 */
export function roverRoute(map: readonly string[]): number {
  const start = roverCell(map, 'R');
  const goal = roverCell(map, 'P');

  if (start === null || goal === null) return -1;

  const seen = new Set<string>([start.join(',')]);
  let frontier: readonly (readonly [number, number])[] = [start];
  let distance = 0;

  while (frontier.length > 0) {
    const next: (readonly [number, number])[] = [];

    for (const [row, column] of frontier) {
      if (row === goal[0] && column === goal[1]) return distance;

      for (const [stepRow, stepColumn] of Object.values(ROVER_STEPS)) {
        const newRow = row + stepRow;
        const newColumn = column + stepColumn;

        if (!roverOpen(map, newRow, newColumn)) continue;

        const key = `${newRow},${newColumn}`;

        if (seen.has(key)) continue;

        seen.add(key);
        next.push([newRow, newColumn]);
      }
    }

    frontier = next;
    distance += 1;
  }

  return -1;
}

/** How many moves the player gets on a map. */
export function roverMovesAllowed(map: readonly string[], spare: number = ROVER_EXTRA_MOVES): number {
  const route = roverRoute(map);

  return route <= 0 ? 0 : route + spare;
}

/**
 * The fewest moves for a round where the rover has to bring the sample home.
 *
 * The rover to the sample and then the sample to the outpost, so the move
 * budget is built from the journey the player actually has to make. It is -1
 * when the sample cannot be reached.
 */
export function roverDeliveryRoute(map: readonly string[]): number {
  const start = roverCell(map, 'R');
  const sample = roverCell(map, 'S');
  const goal = roverCell(map, 'P');

  if (start === null || sample === null || goal === null) return -1;

  const there = roverRouteFrom(start, sample, map);
  const back = roverRouteFrom(sample, goal, map);

  if (there < 0 || back < 0) return -1;

  return there + back;
}

/** The fewest moves from one square to another over the open ground. */
function roverRouteFrom(
  start: readonly [number, number],
  goal: readonly [number, number],
  map: readonly string[],
): number {
  const seen = new Set<string>([start.join(',')]);
  let frontier: (readonly [number, number])[] = [start];
  let distance = 0;

  while (frontier.length > 0) {
    const next: (readonly [number, number])[] = [];

    for (const [row, column] of frontier) {
      if (row === goal[0] && column === goal[1]) return distance;

      for (const [stepRow, stepColumn] of Object.values(ROVER_STEPS)) {
        const newRow = row + stepRow;
        const newColumn = column + stepColumn;

        if (!roverOpen(map, newRow, newColumn)) continue;

        const key = `${newRow},${newColumn}`;

        if (seen.has(key)) continue;

        seen.add(key);
        next.push([newRow, newColumn]);
      }
    }

    frontier = next;
    distance += 1;
  }

  return -1;
}

/**
 * The band a finished game falls into.
 *
 * What matters is the moves that were not needed: the route the rover had to
 * find, and how many it spent finding it.
 */
export function roverPerformance(
  movesLeft: number,
  route: number,
  difficulty: RoverDifficulty = roverDifficulty(1),
): TrainingPerformance {
  const wasted = route + difficulty.spare - movesLeft;

  if (wasted <= difficulty.excellent) return 'excellent';
  if (wasted <= difficulty.good) return 'good';

  return 'basic';
}
