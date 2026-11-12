/**
 * Solar Panel Power-Up: the power lines, and whether they carry.
 *
 * A 4×4 board of power tiles. Each tile has lines on two of its four sides,
 * and tapping a tile turns it a quarter. The player has to make one unbroken
 * line from the solar panel on the left to the battery on the right.
 *
 * The puzzle is generated rather than written down: a route is carved across
 * the board and every tile on it is turned away from its answer, so the game
 * is always winnable and never starts solved. The generator is handed the
 * same deterministic generator as the other games, so a sol always deals the
 * same board.
 *
 * Pure. A tile is a type and a rotation, and the flow is a walk over them.
 */

import type { TrainingPerformance } from './training';

/** The board is 4×4. */
export const SOLAR_SIZE = 4;

/** The four sides of a tile: up, right, down, left. */
export type SolarDirection = 0 | 1 | 2 | 3;

/** What a tile is: a straight line, a corner, or nothing at all. */
export type SolarTileType = 'straight' | 'corner' | 'empty';

/** One tile on the board. */
export interface SolarTile {
  readonly type: SolarTileType;
  /** Which way round it is, 0 to 3. */
  readonly rotation: number;
  /**
   * The rotations that put this tile on the solution path.
   *
   * Empty for a tile that is only scenery. It is a property of the tile
   * rather than of the board, so turning a tile does not change it.
   */
  readonly good: readonly number[];
}

/** A board, and how many turns the answer needs. */
export interface SolarPuzzle {
  /** The 4×4 board, row by row. */
  readonly tiles: readonly (readonly SolarTile[])[];
  /** The squares the solution runs through, from the panel to the battery. */
  readonly route: readonly (readonly [number, number])[];
  /** The fewest turns that solve the board. */
  readonly needed: number;
}

/** The step each direction takes, as [row, column]. */
const DELTA: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** The sides each kind of tile has, before it is turned. */
const BASE: Readonly<Record<SolarTileType, readonly number[]>> = {
  straight: [0, 2],
  corner: [0, 1],
  empty: [],
};

/** The sides a tile is open on, once it is turned. */
export function solarOpens(tile: SolarTile): readonly number[] {
  return BASE[tile.type].map((side) => (side + tile.rotation) % 4);
}

/** Do two sets of sides match, whatever order they are in? */
function sameSides(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((side) => right.includes(side));
}

/** The rotations that open a tile on exactly these two sides. */
function solarGoodRotations(type: SolarTileType, need: readonly number[]): number[] {
  return [0, 1, 2, 3].filter((rotation) =>
    sameSides(
      BASE[type].map((side) => (side + rotation) % 4),
      need,
    ),
  );
}

/** Turn a tile a quarter turn. */
export function rotateSolarTile(
  tiles: readonly (readonly SolarTile[])[],
  row: number,
  column: number,
): SolarTile[][] {
  return tiles.map((line, index) =>
    line.map((tile, position) =>
      index === row && position === column ? { ...tile, rotation: (tile.rotation + 1) % 4 } : tile,
    ),
  );
}

/**
 * Where the power goes, and whether it reaches the battery.
 *
 * The power enters the top-left tile from the left, where the solar panel
 * is, and the battery is to the right of the bottom-right tile. A tile only
 * passes power on when the next tile is open towards it as well.
 */
export function solarFlow(tiles: readonly (readonly SolarTile[])[]): {
  readonly lit: ReadonlySet<string>;
  readonly win: boolean;
} {
  const lit = new Set<string>();
  let win = false;

  const first = tiles[0]?.[0];

  if (first === undefined || !solarOpens(first).includes(3)) return { lit, win };

  lit.add('0,0');

  const queue: (readonly [number, number])[] = [[0, 0]];

  while (queue.length > 0) {
    const [row, column] = queue.shift() as readonly [number, number];

    for (const side of solarOpens(tiles[row]?.[column] as SolarTile)) {
      /* The battery sits to the right of the last tile. */
      if (row === SOLAR_SIZE - 1 && column === SOLAR_SIZE - 1 && side === 1) win = true;

      const [stepRow, stepColumn] = DELTA[side] as readonly [number, number];
      const newRow = row + stepRow;
      const newColumn = column + stepColumn;

      if (newRow < 0 || newColumn < 0 || newRow >= SOLAR_SIZE || newColumn >= SOLAR_SIZE) continue;

      const key = `${newRow},${newColumn}`;

      if (lit.has(key)) continue;

      const next = tiles[newRow]?.[newColumn];

      if (next === undefined) continue;

      if (!solarOpens(next).includes((side + 2) % 4)) continue;

      lit.add(key);
      queue.push([newRow, newColumn]);
    }
  }

  return { lit, win };
}

/** The fewest turns that turn every tile on the route to its answer. */
export function solarTapsNeeded(puzzle: SolarPuzzle): number {
  return puzzle.route.reduce((total, [row, column]) => {
    const tile = puzzle.tiles[row]?.[column];

    if (tile === undefined || tile.good.length === 0) return total;

    const taps = Math.min(...tile.good.map((rotation) => (rotation - tile.rotation + 4) % 4));

    return total + taps;
  }, 0);
}

/** Build one board: a route, the tiles on it, and scenery around it. */
function buildSolarPuzzle(random: () => number): SolarPuzzle {
  const route: (readonly [number, number])[] = [[0, 0]];
  const exits: number[] = [];

  let row = 0;
  let column = 0;

  while (row !== SOLAR_SIZE - 1 || column !== SOLAR_SIZE - 1) {
    const options: number[] = [];

    if (column < SOLAR_SIZE - 1) options.push(1);
    if (row < SOLAR_SIZE - 1) options.push(2);

    const side = options[Math.floor(random() * options.length)] as number;
    const [stepRow, stepColumn] = DELTA[side] as readonly [number, number];

    exits.push(side);
    row += stepRow;
    column += stepColumn;
    route.push([row, column]);
  }

  /* The last tile sends the power out to the battery on its right. */
  exits.push(1);

  const tiles: SolarTile[][] = Array.from({ length: SOLAR_SIZE }, () =>
    Array.from({ length: SOLAR_SIZE }, (): SolarTile => ({ type: 'empty', rotation: 0, good: [] })),
  );

  route.forEach(([pathRow, pathColumn], index) => {
    const entry = index === 0 ? 3 : ((exits[index - 1] as number) + 2) % 4;
    const exit = exits[index] as number;
    const type: SolarTileType = (entry + 2) % 4 === exit ? 'straight' : 'corner';

    tiles[pathRow]![pathColumn] = {
      type,
      rotation: Math.floor(random() * 4),
      good: solarGoodRotations(type, [entry, exit]),
    };
  });

  for (let line = 0; line < SOLAR_SIZE; line += 1) {
    for (let column = 0; column < SOLAR_SIZE; column += 1) {
      if (route.some(([pathRow, pathColumn]) => pathRow === line && pathColumn === column)) continue;

      const types: readonly SolarTileType[] = ['straight', 'corner', 'corner', 'empty'];
      const type = types[Math.floor(random() * types.length)] as SolarTileType;

      tiles[line]![column] = { type, rotation: Math.floor(random() * 4), good: [] };
    }
  }

  const puzzle: SolarPuzzle = { tiles, route, needed: 0 };

  return { ...puzzle, needed: solarTapsNeeded(puzzle) };
}

/**
 * Deal a board.
 *
 * A board that is already solved is rejected and dealt again: the player has
 * to have something to do. If the generator somehow cannot find one, the
 * last board is turned off its answer instead.
 */
export function generateSolarPuzzle(random: () => number): SolarPuzzle {
  let last = buildSolarPuzzle(random);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    last = buildSolarPuzzle(random);

    if (!solarFlow(last.tiles).win && last.needed > 0) return last;
  }

  const first = last.tiles[0]?.[0];

  if (first !== undefined) {
    const row = [...last.tiles[0] as readonly SolarTile[]];
    const turned = { ...first, rotation: (first.rotation + 1) % 4 };

    row[0] = turned;

    const tiles = [...last.tiles];

    tiles[0] = row;

    return { ...last, tiles, needed: solarTapsNeeded({ ...last, tiles }) };
  }

  return last;
}

/** How many turns the player gets over the answer. */
export const SOLAR_EXTRA_TAPS = 12;

/** Solving it within this many extra turns is an excellent run. */
export const SOLAR_EXCELLENT_EXTRA = 2;

/** Solving it within this many extra turns is a good run. */
export const SOLAR_GOOD_EXTRA = 6;

/**
 * How the solar round goes at a level.
 *
 * The goal grows for the first three levels - fewer spare turns over the
 * answer - and then the allowance keeps shrinking all the way down.
 *
 * The bands widen as the round gets harder, so the player is paid the same
 * for the same quality of work whatever the level is.
 */
export interface SolarDifficulty {
  /** The turns the player gets over the answer. */
  readonly spare: number;
  /** The extra turns an excellent round allows. */
  readonly excellent: number;
  /** The extra turns a good round allows. */
  readonly good: number;
}

/** One row per level. The first is the game as it always was. */
const SOLAR_DIFFICULTY: readonly SolarDifficulty[] = [
  { spare: 12, excellent: 2, good: 6 },
  { spare: 10, excellent: 3, good: 7 },
  { spare: 8, excellent: 3, good: 8 },
  { spare: 7, excellent: 4, good: 9 },
  { spare: 6, excellent: 4, good: 10 },
  { spare: 5, excellent: 5, good: 11 },
  { spare: 5, excellent: 5, good: 12 },
  { spare: 4, excellent: 6, good: 13 },
  { spare: 4, excellent: 6, good: 14 },
  { spare: 3, excellent: 7, good: 15 },
  { spare: 3, excellent: 7, good: 16 },
  { spare: 2, excellent: 8, good: 17 },
];

/**
 * The round at a level.
 *
 * Level 1 is the game as it always was. A level past the last one stays at
 * the last one: the counter stops, and so does the game.
 */
export function solarDifficulty(level: number): SolarDifficulty {
  const step = Math.min(SOLAR_DIFFICULTY.length, Math.max(1, Math.floor(level)));

  return SOLAR_DIFFICULTY[step - 1] as SolarDifficulty;
}

/** The band a finished game falls into, from the turns it took over the answer. */
export function solarPerformance(
  used: number,
  needed: number,
  difficulty: SolarDifficulty = solarDifficulty(1),
): TrainingPerformance {
  const extra = used - needed;

  if (extra <= difficulty.excellent) return 'excellent';
  if (extra <= difficulty.good) return 'good';

  return 'basic';
}
