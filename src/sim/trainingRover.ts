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
 * `R` is the rover, `P` the outpost, `#` a rock and `.` open ground. Each map
 * is checked by `trainingRover.test.ts`: the route has to exist, and the
 * player is given that route plus a few moves of slack.
 */
export const ROVER_MAPS: readonly (readonly string[])[] = [
  ['R.....', '.##...', '..#.#.', '....#.', '.#.#..', '....#P'],
  ['R#....', '.#...#', '...#..', '.#..#.', '..#...', '....#P'],
  ['R.....', '.#.#..', '...#.#', '.#...#', '#.#...', '....#P'],
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
export function roverMovesAllowed(map: readonly string[]): number {
  const route = roverRoute(map);

  return route <= 0 ? 0 : route + ROVER_EXTRA_MOVES;
}

/**
 * The band a finished game falls into.
 *
 * What matters is the moves that were not needed: the route the rover had to
 * find, and how many it spent finding it.
 */
export function roverPerformance(movesLeft: number, route: number): TrainingPerformance {
  const wasted = route + ROVER_EXTRA_MOVES - movesLeft;

  if (wasted <= ROVER_EXCELLENT_WASTED) return 'excellent';
  if (wasted <= ROVER_GOOD_WASTED) return 'good';

  return 'basic';
}
