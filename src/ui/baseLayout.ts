/**
 * Where each module stands on the outpost panel.
 *
 * The layout is data, not code. `baseLayout.json` is the file a developer
 * produces by dragging the modules on the real base screen (`?editlayout=1`),
 * and this module is the gate between that file and the game: it validates
 * every number and falls back to the authored default when one is missing or
 * out of bounds, so a bad JSON can never white-screen the game.
 *
 * The file holds a **pose list per kind**, not one pose per kind. A player
 * can build four solar arrays, and each of them can stand somewhere
 * different, so each of them gets an entry: the second solar array the player
 * builds is the second entry of the `solar-array` list. The list is
 * positional — the order is the order the copies are built in.
 *
 * `SPOT_BAND` is the single source of truth for how far a module may be
 * placed. The clamp in `styles/game-loop.css` mirrors it, and `check-markup`
 * Rule 11 fails the build if the two ever disagree — a silent divergence
 * there would put every module somewhere the developer never asked for.
 */

import { MODULE_CATALOGUE, type ModuleKind } from '../sim/modules';
import raw from './baseLayout.json';

/** One module's place on the world panel, in percent of the panel. */
export interface ModuleSpot {
  /** Percent from the panel's left edge to the picture's left edge. */
  readonly left: number;
  /** Percent from the panel's bottom edge to the picture's bottom edge. */
  readonly bottom: number;
  /** Percent of the panel's width the picture takes. */
  readonly width: number;
  /** Stacking order. Higher paints in front. */
  readonly z: number;
  /**
   * Mirrored left to right.
   *
   * Absent means not mirrored. Every module has a facing direction — a solar
   * panel catches the sun on one side, the ice miner's arm points one way — so
   * a mirrored module is the same module turned around, not a different one.
   *
   * The mirror is about the picture's centre, so turning a module around does
   * not move it.
   */
  readonly flip?: boolean;
}

/**
 * Where every copy of every module kind stands.
 *
 * One list per kind, in build order: the first entry is where the first copy
 * stands, the second entry is where the second copy stands, and so on.
 */
export type ModulePoses = Readonly<Record<ModuleKind, readonly ModuleSpot[]>>;

/**
 * How far a module may be placed, in percent of the panel.
 *
 * The numbers are the same ones the CSS clamp uses, because the clamp is what
 * decides where a picture actually lands. Authoring outside the band would
 * mean the file said one thing and the screen did another.
 */
export const SPOT_BAND = {
  left: { min: 2, max: 92 },
  bottom: { min: 2, max: 32 },
  width: { min: 6, max: 24 },
} as const;

/**
 * The right-hand edge of the panel, in percent.
 *
 * A module is never wider than the gap between where it starts and here, so
 * a module can never hang off the side of the Mars panel.
 */
export const PANEL_RIGHT_EDGE = 100;

/**
 * The authored layout, used whenever `baseLayout.json` cannot supply one.
 *
 * Four zones across the panel, two rows deep: power on the left, then home,
 * then food, then shielding and nuclear power. Each list holds one entry per
 * copy the player could ever build.
 */
export const DEFAULT_POSES: ModulePoses = {
  'solar-array': [
    { left: 4, bottom: 30, width: 20, z: 3 },
    { left: 14, bottom: 32, width: 17, z: 4 },
    { left: 24, bottom: 32, width: 14, z: 5 },
    { left: 34, bottom: 32, width: 11, z: 6 },
  ],
  batteries: [
    { left: 4, bottom: 4, width: 20, z: 5 },
    { left: 14, bottom: 8, width: 17, z: 6 },
    { left: 24, bottom: 12, width: 14, z: 7 },
    { left: 34, bottom: 16, width: 11, z: 8 },
  ],
  habitat: [{ left: 28, bottom: 30, width: 20, z: 4 }],
  'life-support': [{ left: 28, bottom: 4, width: 20, z: 5 }],
  greenhouse: [{ left: 52, bottom: 30, width: 20, z: 4 }],
  'ice-miner': [{ left: 52, bottom: 4, width: 20, z: 5 }],
  'regolith-shield': [
    { left: 76, bottom: 30, width: 18, z: 3 },
    { left: 81, bottom: 32, width: 15, z: 4 },
  ],
  'nuclear-unit': [{ left: 76, bottom: 4, width: 18, z: 5 }],
};

/** Clamp a number into a range. A number that is not a number becomes `min`. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp a spot into the band, so it lands where the CSS would put it anyway.
 *
 * The width is also pulled in so the module cannot hang off the right-hand
 * edge of the panel. That rule lives here rather than in the CSS because the
 * CSS clamp only knows the left edge, and a module at 90% with a width of 24%
 * would run off the side.
 */
export function clampSpot(spot: ModuleSpot): ModuleSpot {
  const left = clamp(spot.left, SPOT_BAND.left.min, SPOT_BAND.left.max);
  const width = clamp(spot.width, SPOT_BAND.width.min, SPOT_BAND.width.max);
  const fits = Math.max(SPOT_BAND.width.min, PANEL_RIGHT_EDGE - left);

  return {
    left,
    bottom: clamp(spot.bottom, SPOT_BAND.bottom.min, SPOT_BAND.bottom.max),
    width: Math.min(width, fits),
    z: clamp(spot.z, 0, 20),
    flip: spot.flip === true,
  };
}

/**
 * A spot with every number rounded to one decimal.
 *
 * A dragged position is never more precise than that, and rounding in one
 * place is what keeps the toolbar, the readout and the exported file telling
 * the same story. Without it the toolbar reads 45.58845757471659 while the
 * file reads 45.6.
 */
export function roundSpot(spot: ModuleSpot): ModuleSpot {
  return {
    left: Math.round(spot.left * 10) / 10,
    bottom: Math.round(spot.bottom * 10) / 10,
    width: Math.round(spot.width * 10) / 10,
    z: Math.round(spot.z),
    flip: spot.flip === true,
  };
}

/** Is this a plain object rather than an array or null? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read one spot out of the raw layout.
 *
 * Returns null when the entry is not a spot at all, so the caller can fall
 * back to the authored default rather than to a half-read object. A spot
 * whose numbers are merely out of range is clamped rather than discarded:
 * a typo should nudge the module, not make it vanish.
 */
function readSpot(value: unknown): ModuleSpot | null {
  if (!isRecord(value)) return null;

  const { left, bottom, width, z } = value;

  if (typeof left !== 'number' || typeof bottom !== 'number') return null;
  if (typeof width !== 'number' || typeof z !== 'number') return null;
  if (!Number.isFinite(left) || !Number.isFinite(bottom)) return null;
  if (!Number.isFinite(width) || !Number.isFinite(z)) return null;

  /* A missing flip is not a flip. Anything that is not exactly true is not
   * true either, so a typo turns the module back the right way round rather
   * than mirroring it at random. */
  return clampSpot({ left, bottom, width, z, flip: value.flip === true });
}

/**
 * The next copy's place, when the file does not say.
 *
 * The rule the game used before the layout became a file: step right by half
 * a slot, shrink a little, rise a little. It is only a fallback now — for a
 * hand-edited file with fewer poses than the player can build — so that a
 * missing entry produces a plausible module rather than a gap.
 */
function deriveSpot(previous: ModuleSpot): ModuleSpot {
  const width = Math.max(SPOT_BAND.width.min, previous.width - 3);
  const step = Math.floor(previous.width * 0.5);

  return clampSpot({
    left: previous.left + step,
    bottom: previous.bottom + 4,
    width,
    z: previous.z + 1,
  });
}

/**
 * The pose list for one kind, out of the raw layout.
 *
 * Reads the new shape — a list of poses — and also the old one, a single
 * pose, which becomes a list of one. A kind the file says nothing about, or
 * holds nothing usable, gets the authored default. A list shorter than the
 * number of copies the player can build is padded with derived poses; a
 * longer one is cut.
 */
function readPoses(value: unknown, kind: ModuleKind, count: number): ModuleSpot[] {
  const fallback = DEFAULT_POSES[kind];

  if (value === undefined) return fallback.map((spot) => clampSpot(spot));

  const entries = Array.isArray(value) ? value : [value];
  const poses: ModuleSpot[] = [];

  for (const entry of entries) {
    const read = readSpot(entry);

    if (read !== null) poses.push(read);
  }

  /* Nothing usable at all: the authored default is better than a guess. */
  if (poses.length === 0) return fallback.map((spot) => clampSpot(spot));

  while (poses.length < count) {
    poses.push(deriveSpot(poses[poses.length - 1]));
  }

  return poses.slice(0, count);
}

/**
 * The layout to use, with every kind filled in.
 *
 * A kind missing from the file gets the authored default. The result is
 * always complete — every kind has one pose per copy the player can build —
 * and every pose is inside the band, whatever the file says.
 */
export function resolvePoses(source: unknown): ModulePoses {
  const record = isRecord(source) ? source : {};
  const poses: Record<string, ModuleSpot[]> = {};

  for (const spec of MODULE_CATALOGUE) {
    poses[spec.kind] = readPoses(record[spec.kind], spec.kind, spec.maxCount);
  }

  /* The catalogue names every kind, so the record is complete. TypeScript
   * cannot see that from an array, hence the cast. */
  return poses as unknown as ModulePoses;
}

/**
 * Where the Nth copy of a kind stands.
 *
 * The file says. When the file has no entry for that copy, the pose is
 * derived from the last one, so a short file still renders every copy.
 */
export function poseFor(poses: ModulePoses, kind: ModuleKind, copy: number): ModuleSpot {
  const list = poses[kind];

  if (list === undefined || list.length === 0) return clampSpot(DEFAULT_POSES[kind][0]);

  const spot = list[copy];

  if (spot !== undefined) return spot;

  return deriveSpot(list[list.length - 1]);
}

/**
 * What is wrong with the layout file, in words.
 *
 * Pure, so it can be tested and shown to the developer who hand-edited the
 * file. The game does not need it — `resolvePoses` has already produced
 * something usable — but somebody who typed a number in by hand deserves to be
 * told what was ignored and what was nudged.
 */
export function describeLayoutProblems(source: unknown): string[] {
  if (!isRecord(source)) {
    return ['baseLayout.json is not an object of module kinds. Every default position is being used.'];
  }

  const problems: string[] = [];
  const known = new Set<string>(MODULE_CATALOGUE.map((spec) => spec.kind));

  for (const spec of MODULE_CATALOGUE) {
    const entry = source[spec.kind];

    if (entry === undefined) {
      problems.push(`${spec.kind} is missing. The default positions are being used.`);

      continue;
    }

    /* The old shape: one pose where the new shape has a list. */
    const entries = Array.isArray(entry) ? entry : [entry];

    if (!Array.isArray(entry) && !isRecord(entry)) {
      problems.push(`${spec.kind} is not a pose or a list of poses. The default positions are being used.`);

      continue;
    }

    if (entries.length > spec.maxCount) {
      problems.push(`${spec.kind} lists ${poses(entries.length)}, but only ${spec.maxCount} copies can be built. The extra ones are ignored.`);
    }

    if (entries.length < spec.maxCount) {
      problems.push(`${spec.kind} lists ${poses(entries.length)}, but ${spec.maxCount} copies can be built. The rest are derived.`);
    }

    entries.forEach((pose, index) => {
      problems.push(...describeSpot(`${spec.kind}[${index}]`, pose));
    });
  }

  for (const key of Object.keys(source)) {
    if (!known.has(key)) problems.push(`${key} is not a module kind. It is being ignored.`);
  }

  return problems;
}

/** "1 pose" or "3 poses", so a message can say what it found. */
function poses(count: number): string {
  return count === 1 ? '1 pose' : `${count} poses`;
}

/** What is wrong with one pose, in words. */function describeSpot(label: string, value: unknown): string[] {
  if (!isRecord(value)) return [`${label} is not a pose. It is being ignored.`];

  const problems: string[] = [];

  const checks: ReadonlyArray<readonly [string, unknown, number, number]> = [
    ['left', value.left, SPOT_BAND.left.min, SPOT_BAND.left.max],
    ['bottom', value.bottom, SPOT_BAND.bottom.min, SPOT_BAND.bottom.max],
    ['width', value.width, SPOT_BAND.width.min, SPOT_BAND.width.max],
  ];

  for (const [name, number, min, max] of checks) {
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      problems.push(`${label}.${name} is not a number. It is being ignored.`);
    } else if (number < min || number > max) {
      problems.push(`${label}.${name} is ${number}, outside ${min}-${max}. It has been clamped.`);
    }
  }

  if (typeof value.z !== 'number' || !Number.isFinite(value.z)) {
    problems.push(`${label}.z is not a number. It is being ignored.`);
  }

  if (value.flip !== undefined && typeof value.flip !== 'boolean') {
    problems.push(`${label}.flip is not true or false. The module is not being mirrored.`);
  }

  return problems;
}

/**
 * The layout file, as text.
 *
 * Keys come out in catalogue order so the file reads like the catalogue, and
 * positions are rounded to one decimal because a dragged position is never
 * more precise than that.
 *
 * `flip` is written only for a module that is actually mirrored, so the file
 * stays quiet for the ones that are not.
 */
export function buildLayoutJson(poses: Readonly<Record<string, readonly ModuleSpot[]>>): string {
  const ordered: Record<string, { left: number; bottom: number; width: number; z: number; flip?: boolean }[]> = {};

  for (const spec of MODULE_CATALOGUE) {
    const list = poses[spec.kind] ?? DEFAULT_POSES[spec.kind];

    ordered[spec.kind] = list.map((spot) => {
      const rounded = roundSpot(spot);
      const entry: { left: number; bottom: number; width: number; z: number; flip?: boolean } = {
        left: rounded.left,
        bottom: rounded.bottom,
        width: rounded.width,
        z: rounded.z,
      };

      if (rounded.flip === true) entry.flip = true;

      return entry;
    });
  }

  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** A rectangle in viewport pixels. */
export interface PanelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The percent a pointer is at inside a panel.
 *
 * `left` is the picture's left edge and `bottom` its bottom edge, matching
 * how `.gl__figure` is positioned in CSS. A pointer below the panel gives a
 * negative bottom; the caller clamps it.
 */
export function pointToPercent(
  point: { readonly x: number; readonly y: number },
  panel: PanelRect,
): { readonly left: number; readonly bottom: number } {
  if (panel.width <= 0 || panel.height <= 0) return { left: 0, bottom: 0 };

  return {
    left: ((point.x - panel.x) / panel.width) * 100,
    bottom: ((panel.y + panel.height - point.y) / panel.height) * 100,
  };
}

/** The layout the game uses, validated on the way in. */
export const MODULE_POSES: ModulePoses = resolvePoses(raw);

/** What is wrong with the layout file, if anything. */
export const LAYOUT_PROBLEMS: readonly string[] = describeLayoutProblems(raw);
