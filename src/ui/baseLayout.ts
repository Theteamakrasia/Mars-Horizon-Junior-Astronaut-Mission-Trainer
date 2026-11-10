/**
 * Where each module stands on the outpost panel.
 *
 * The layout is data, not code. `baseLayout.json` is the file a developer
 * produces by dragging the modules on the real base screen (`?editlayout=1`),
 * and this module is the gate between that file and the game: it validates
 * every number and falls back to the authored default when one is missing or
 * out of bounds, so a bad JSON can never white-screen the game.
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
}

/** A place for every module kind. */
export type ModuleSpots = Readonly<Record<ModuleKind, ModuleSpot>>;

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
 * The authored layout, used whenever `baseLayout.json` cannot supply one.
 *
 * Four zones across the panel, two rows deep: power on the left, then home,
 * then food, then shielding and nuclear power.
 */
export const DEFAULT_SPOTS: ModuleSpots = {
  'solar-array': { left: 4, bottom: 30, width: 20, z: 3 },
  batteries: { left: 4, bottom: 4, width: 20, z: 5 },
  habitat: { left: 28, bottom: 30, width: 20, z: 4 },
  'life-support': { left: 28, bottom: 4, width: 20, z: 5 },
  greenhouse: { left: 52, bottom: 30, width: 20, z: 4 },
  'ice-miner': { left: 52, bottom: 4, width: 20, z: 5 },
  'regolith-shield': { left: 76, bottom: 30, width: 18, z: 3 },
  'nuclear-unit': { left: 76, bottom: 4, width: 18, z: 5 },
};

/** Clamp a number into a range. A number that is not a number becomes `min`. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, value));
}

/** Clamp a spot into the band, so it lands where the CSS would put it anyway. */
export function clampSpot(spot: ModuleSpot): ModuleSpot {
  return {
    left: clamp(spot.left, SPOT_BAND.left.min, SPOT_BAND.left.max),
    bottom: clamp(spot.bottom, SPOT_BAND.bottom.min, SPOT_BAND.bottom.max),
    width: clamp(spot.width, SPOT_BAND.width.min, SPOT_BAND.width.max),
    z: clamp(spot.z, 0, 20),
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

  return clampSpot({ left, bottom, width, z });
}

/**
 * The layout to use, with every kind filled in.
 *
 * A kind missing from the file, or holding something that is not a spot, gets
 * the authored default. The result is always complete and always inside the
 * band, whatever the file says.
 */
export function resolveSpots(source: unknown): ModuleSpots {
  const record = isRecord(source) ? source : {};
  const spots: Record<string, ModuleSpot> = {};

  for (const spec of MODULE_CATALOGUE) {
    const read = readSpot(record[spec.kind]);

    spots[spec.kind] = read === null ? DEFAULT_SPOTS[spec.kind] : read;
  }

  return spots as ModuleSpots;
}

/**
 * What is wrong with the layout file, in words.
 *
 * Pure, so it can be tested and shown to the developer who hand-edited the
 * file. The game does not need it — `resolveSpots` has already produced
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
      problems.push(`${spec.kind} is missing. The default position is being used.`);

      continue;
    }

    if (!isRecord(entry)) {
      problems.push(`${spec.kind} is not a spot. The default position is being used.`);

      continue;
    }

    const checks: ReadonlyArray<readonly [string, unknown, number, number]> = [
      ['left', entry.left, SPOT_BAND.left.min, SPOT_BAND.left.max],
      ['bottom', entry.bottom, SPOT_BAND.bottom.min, SPOT_BAND.bottom.max],
      ['width', entry.width, SPOT_BAND.width.min, SPOT_BAND.width.max],
    ];

    for (const [name, number, min, max] of checks) {
      if (typeof number !== 'number' || !Number.isFinite(number)) {
        problems.push(`${spec.kind}.${name} is not a number. The default position is being used.`);
      } else if (number < min || number > max) {
        problems.push(`${spec.kind}.${name} is ${number}, outside ${min}-${max}. It has been clamped.`);
      }
    }

    if (typeof entry.z !== 'number' || !Number.isFinite(entry.z)) {
      problems.push(`${spec.kind}.z is not a number. The default position is being used.`);
    }
  }

  for (const key of Object.keys(source)) {
    if (!known.has(key)) problems.push(`${key} is not a module kind. It is being ignored.`);
  }

  return problems;
}

/**
 * The layout file, as text.
 *
 * Keys come out in catalogue order so the file reads like the catalogue, and
 * positions are rounded to one decimal because a dragged position is never
 * more precise than that.
 */
export function buildLayoutJson(spots: Readonly<Record<string, ModuleSpot>>): string {
  const ordered: Record<string, { left: number; bottom: number; width: number; z: number }> = {};

  for (const spec of MODULE_CATALOGUE) {
    const spot = spots[spec.kind] ?? DEFAULT_SPOTS[spec.kind];

    ordered[spec.kind] = {
      left: Math.round(spot.left * 10) / 10,
      bottom: Math.round(spot.bottom * 10) / 10,
      width: Math.round(spot.width * 10) / 10,
      z: Math.round(spot.z),
    };
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
export const MODULE_SPOT: ModuleSpots = resolveSpots(raw);

/** What is wrong with the layout file, if anything. */
export const LAYOUT_PROBLEMS: readonly string[] = describeLayoutProblems(raw);
