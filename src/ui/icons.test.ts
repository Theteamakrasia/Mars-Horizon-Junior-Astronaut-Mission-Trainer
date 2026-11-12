import { describe, it, expect } from 'vitest';
import { ICON_PATHS, MODULE_ICON, RANK_ICON, RESOURCE_ICON, type IconName } from './icons';
import { RESOURCE_NAMES } from '../sim/resources';
import { SCIENCE_RANKS } from '../sim/science';
import { MODULE_CATALOGUE } from '../sim/modules';

/**
 * The icon set's pure half.
 *
 * `icon()` needs a browser, so that is not tested here. What is tested is the
 * data: every name draws something, every shape is painted, nothing draws an
 * emoji, and the three lookup tables cover every store, every rank and every
 * module. The emoji check is the one that matters — the whole point of this
 * file is that the game stopped using them, and a well-meaning edit could add
 * one back.
 */

/** Anything outside the printable ASCII range would be an emoji or a stray glyph. */
const NON_ASCII = /[^\x20-\x7E]/;

/** A colour the drawings are allowed to be painted in. */
const COLOUR = /^(currentColor|#[0-9A-Fa-f]{6})$/;

const NAMES = Object.keys(ICON_PATHS) as readonly IconName[];

describe('ICON_PATHS', () => {
  it('draws at least one shape for every name', () => {
    for (const name of NAMES) {
      expect(ICON_PATHS[name].length, name).toBeGreaterThan(0);
    }
  });

  it('gives every shape real path data, and nothing else', () => {
    for (const name of NAMES) {
      for (const shape of ICON_PATHS[name]) {
        expect(shape.d.length, name).toBeGreaterThan(3);
        expect(NON_ASCII.test(shape.d), name).toBe(false);
      }
    }
  });

  it('paints every shape, so that nothing is drawn invisibly', () => {
    for (const name of NAMES) {
      for (const shape of ICON_PATHS[name]) {
        const filled = shape.fill !== undefined && shape.fill !== 'none';
        const stroked = shape.stroke !== undefined && shape.stroke !== 'none';

        expect(filled || stroked, `${name}: ${shape.d.slice(0, 24)}`).toBe(true);
      }
    }
  });

  it('paints in the palette, not in nothing', () => {
    for (const name of NAMES) {
      for (const shape of ICON_PATHS[name]) {
        for (const colour of [shape.fill, shape.stroke]) {
          if (colour === undefined || colour === 'none') continue;

          expect(COLOUR.test(colour), `${name}: ${colour}`).toBe(true);
        }
      }
    }
  });

  it('holds no emoji anywhere in the set', () => {
    const serialised = JSON.stringify(ICON_PATHS);

    expect(NON_ASCII.test(serialised)).toBe(false);
  });
});

describe('RESOURCE_ICON', () => {
  it('gives every one of the five stores a pictogram', () => {
    for (const name of RESOURCE_NAMES) {
      expect(ICON_PATHS[RESOURCE_ICON[name]], name).toBeDefined();
    }
  });

  it('tells the five stores apart', () => {
    const used = RESOURCE_NAMES.map((name) => RESOURCE_ICON[name]);

    expect(new Set(used).size).toBe(RESOURCE_NAMES.length);
  });
});

describe('RANK_ICON', () => {
  it('gives every rank in the ladder a pictogram', () => {
    for (const rank of SCIENCE_RANKS) {
      expect(ICON_PATHS[RANK_ICON[rank.id] as IconName], rank.id).toBeDefined();
    }
  });

  it('tells the ranks apart', () => {
    const used = SCIENCE_RANKS.map((rank) => RANK_ICON[rank.id]);

    expect(new Set(used).size).toBe(SCIENCE_RANKS.length);
  });
});

describe('MODULE_ICON', () => {
  it('gives every module in the catalogue a pictogram', () => {
    for (const spec of MODULE_CATALOGUE) {
      expect(ICON_PATHS[MODULE_ICON[spec.kind]], spec.kind).toBeDefined();
    }
  });

  it('tells the modules apart', () => {
    const used = MODULE_CATALOGUE.map((spec) => MODULE_ICON[spec.kind]);

    expect(new Set(used).size).toBe(MODULE_CATALOGUE.length);
  });
});
