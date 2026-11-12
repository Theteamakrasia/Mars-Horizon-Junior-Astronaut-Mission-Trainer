/**
 * The icon set.
 *
 * Every pictogram in the game is one of the drawings supplied in
 * `Assets/icons/`. Nothing here is an emoji: an emoji is drawn by the operating
 * system, so it changes shape between machines, cannot follow the game's ink,
 * and reads as decoration rather than as a control. These are the drawings
 * that were made for this game — filled, coloured, and in one style with the
 * module artwork on the outpost panel.
 *
 * The files are read at build time (`?raw`) and parsed into path data here, so
 * the game still draws **one inline `<svg>` per icon**: a tile, a HUD card and
 * a warning sit side by side without a second layout, and `ICON_PATHS` stays
 * pure data a test can read without a browser.
 *
 * The data and the drawing live in one file on purpose: `ICON_PATHS` is what a
 * test can read without a browser, and `icon()` is the only thing that touches
 * the DOM. A name with no drawing is a type error, and a drawing with a stray
 * character in it fails `icons.test.ts`.
 */

import { svg, type Shape } from '../dom/svg';
import type { ResourceName } from '../sim/resources';
import type { ModuleKind } from '../sim/modules';

import './icons.css';

import alertSvg from '../../Assets/icons/alert.svg?raw';
import batteriesModuleSvg from '../../Assets/icons/batteries-module.svg?raw';
import boltSvg from '../../Assets/icons/bolt.svg?raw';
import bookSvg from '../../Assets/icons/book.svg?raw';
import boxSvg from '../../Assets/icons/box.svg?raw';
import bulbSvg from '../../Assets/icons/bulb.svg?raw';
import chartSvg from '../../Assets/icons/chart.svg?raw';
import checkSvg from '../../Assets/icons/check.svg?raw';
import chevronSvg from '../../Assets/icons/chevron.svg?raw';
import chiefScientistSvg from '../../Assets/icons/chief-scientist.svg?raw';
import clipboardSvg from '../../Assets/icons/clipboard.svg?raw';
import cloudSunSvg from '../../Assets/icons/cloud-sun.svg?raw';
import dishSvg from '../../Assets/icons/dish.svg?raw';
import dropletSvg from '../../Assets/icons/droplet.svg?raw';
import explorerSvg from '../../Assets/icons/explorer.svg?raw';
import fieldScientistSvg from '../../Assets/icons/field-scientist.svg?raw';
import flaskSvg from '../../Assets/icons/flask.svg?raw';
import foodSvg from '../../Assets/icons/food.svg?raw';
import greenhouseModuleSvg from '../../Assets/icons/greenhouse-module.svg?raw';
import habitatModuleSvg from '../../Assets/icons/habitat-module.svg?raw';
import helmetSvg from '../../Assets/icons/helmet.svg?raw';
import historySvg from '../../Assets/icons/history.svg?raw';
import homeSvg from '../../Assets/icons/home.svg?raw';
import iceMinerModuleSvg from '../../Assets/icons/ice-miner-module.svg?raw';
import leafSvg from '../../Assets/icons/leaf.svg?raw';
import letterSvg from '../../Assets/icons/letter.svg?raw';
import lifeSupportModuleSvg from '../../Assets/icons/life-support-module.svg?raw';
import lockSvg from '../../Assets/icons/lock.svg?raw';
import mapSvg from '../../Assets/icons/map.svg?raw';
import moonSvg from '../../Assets/icons/moon.svg?raw';
import mountainSvg from '../../Assets/icons/mountain.svg?raw';
import nightWatchSvg from '../../Assets/icons/night-watch.svg?raw';
import noSkipSvg from '../../Assets/icons/no-skip.svg?raw';
import nuclearUnitModuleSvg from '../../Assets/icons/nuclear-unit-module.svg?raw';
import oxygenSvg from '../../Assets/icons/oxygen.svg?raw';
import pickSvg from '../../Assets/icons/pick.svg?raw';
import powerSvg from '../../Assets/icons/power.svg?raw';
import questionSvg from '../../Assets/icons/question.svg?raw';
import recycleSvg from '../../Assets/icons/recycle.svg?raw';
import regolithShieldModuleSvg from '../../Assets/icons/regolith-shield-module.svg?raw';
import researchLeadSvg from '../../Assets/icons/research-lead.svg?raw';
import restSvg from '../../Assets/icons/rest.svg?raw';
import rockSvg from '../../Assets/icons/rock.svg?raw';
import rocketSvg from '../../Assets/icons/rocket.svg?raw';
import roverSvg from '../../Assets/icons/rover.svg?raw';
import seniorScientistSvg from '../../Assets/icons/senior-scientist.svg?raw';
import shieldSvg from '../../Assets/icons/shield.svg?raw';
import shieldingSvg from '../../Assets/icons/shielding.svg?raw';
import solarArrayModuleSvg from '../../Assets/icons/solar-array-module.svg?raw';
import sparkleSvg from '../../Assets/icons/sparkle.svg?raw';
import starSvg from '../../Assets/icons/star.svg?raw';
import stormSvg from '../../Assets/icons/storm.svg?raw';
import sunSvg from '../../Assets/icons/sun.svg?raw';
import surveySvg from '../../Assets/icons/survey.svg?raw';
import traySvg from '../../Assets/icons/tray.svg?raw';
import waterSvg from '../../Assets/icons/water.svg?raw';

/** Every pictogram the game can draw. */
export type IconName =
  | 'alert'
  | 'batteries-module'
  | 'bolt'
  | 'book'
  | 'box'
  | 'bulb'
  | 'chart'
  | 'check'
  | 'chevron'
  | 'chief-scientist'
  | 'clipboard'
  | 'close'
  | 'cloud-sun'
  | 'dish'
  | 'droplet'
  | 'explorer'
  | 'field-scientist'
  | 'flask'
  | 'food'
  | 'greenhouse-module'
  | 'habitat-module'
  | 'helmet'
  | 'history'
  | 'home'
  | 'ice-miner-module'
  | 'leaf'
  | 'letter'
  | 'life-support-module'
  | 'lock'
  | 'map'
  | 'moon'
  | 'mountain'
  | 'night-watch'
  | 'no-skip'
  | 'nuclear-unit-module'
  | 'oxygen'
  | 'pick'
  | 'power'
  | 'question'
  | 'recycle'
  | 'regolith-shield-module'
  | 'research-lead'
  | 'rest'
  | 'rock'
  | 'rocket'
  | 'rover'
  | 'senior-scientist'
  | 'shield'
  | 'shielding'
  | 'solar-array-module'
  | 'sparkle'
  | 'star'
  | 'storm'
  | 'sun'
  | 'survey'
  | 'tray'
  | 'water';

/** The box every drawing is in. */
const VIEW_BOX = '0 0 96 96';

/**
 * Read the shapes out of one drawing.
 *
 * The supplied files are plain SVG: an `<svg>` wrapper, a `<g>` or two, and a
 * run of `<path>` elements. Only the paths are read, and only the attributes
 * that paint them — the wrapper and the groups carry no paint of their own, so
 * a path's own attributes are the whole truth about how it is drawn.
 *
 * `fill` and `stroke` default to 'none', which is what the files' own root
 * `<svg fill="none">` does to a path that says nothing about either.
 */
function parseArt(source: string): readonly Shape[] {
  const shapes: Shape[] = [];

  for (const [, attributes] of source.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const paint: Record<string, string> = {};

    for (const [, key, value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) paint[key] = value;

    const width = paint['stroke-width'];
    const cap = paint['stroke-linecap'];
    const join = paint['stroke-linejoin'];
    const rule = paint['fill-rule'];

    shapes.push({
      d: paint.d ?? '',
      fill: paint.fill ?? 'none',
      stroke: paint.stroke ?? 'none',
      ...(width === undefined ? {} : { strokeWidth: Number(width) }),
      ...(cap === undefined ? {} : { linecap: cap as 'butt' | 'round' | 'square' }),
      ...(join === undefined ? {} : { linejoin: join as 'miter' | 'round' | 'bevel' }),
      ...(rule === undefined ? {} : { fillRule: rule as 'nonzero' | 'evenodd' }),
    });
  }

  return shapes;
}

/**
 * The drawings, in the box they were drawn in.
 *
 * Filled and coloured, each path carrying its own paint: the cream, navy,
 * orange, teal, yellow and blue of the game's own palette. They are read from
 * the asset files rather than written out here, so the drawing on the screen is
 * the drawing that was designed.
 */
export const ICON_PATHS: Readonly<Record<IconName, readonly Shape[]>> = {
  alert: parseArt(alertSvg),
  'batteries-module': parseArt(batteriesModuleSvg),
  bolt: parseArt(boltSvg),
  book: parseArt(bookSvg),
  box: parseArt(boxSvg),
  bulb: parseArt(bulbSvg),
  chart: parseArt(chartSvg),
  check: parseArt(checkSvg),
  chevron: parseArt(chevronSvg),
  'chief-scientist': parseArt(chiefScientistSvg),
  clipboard: parseArt(clipboardSvg),
  'cloud-sun': parseArt(cloudSunSvg),
  dish: parseArt(dishSvg),
  droplet: parseArt(dropletSvg),
  explorer: parseArt(explorerSvg),
  'field-scientist': parseArt(fieldScientistSvg),
  flask: parseArt(flaskSvg),
  food: parseArt(foodSvg),
  'greenhouse-module': parseArt(greenhouseModuleSvg),
  'habitat-module': parseArt(habitatModuleSvg),
  helmet: parseArt(helmetSvg),
  history: parseArt(historySvg),
  home: parseArt(homeSvg),
  'ice-miner-module': parseArt(iceMinerModuleSvg),
  leaf: parseArt(leafSvg),
  letter: parseArt(letterSvg),
  'life-support-module': parseArt(lifeSupportModuleSvg),
  lock: parseArt(lockSvg),
  map: parseArt(mapSvg),
  moon: parseArt(moonSvg),
  mountain: parseArt(mountainSvg),
  'night-watch': parseArt(nightWatchSvg),
  'no-skip': parseArt(noSkipSvg),
  'nuclear-unit-module': parseArt(nuclearUnitModuleSvg),
  oxygen: parseArt(oxygenSvg),
  pick: parseArt(pickSvg),
  power: parseArt(powerSvg),
  question: parseArt(questionSvg),
  recycle: parseArt(recycleSvg),
  'regolith-shield-module': parseArt(regolithShieldModuleSvg),
  'research-lead': parseArt(researchLeadSvg),
  rest: parseArt(restSvg),
  rock: parseArt(rockSvg),
  rocket: parseArt(rocketSvg),
  rover: parseArt(roverSvg),
  'senior-scientist': parseArt(seniorScientistSvg),
  shield: parseArt(shieldSvg),
  shielding: parseArt(shieldingSvg),
  'solar-array-module': parseArt(solarArrayModuleSvg),
  sparkle: parseArt(sparkleSvg),
  star: parseArt(starSvg),
  storm: parseArt(stormSvg),
  sun: parseArt(sunSvg),
  survey: parseArt(surveySvg),
  tray: parseArt(traySvg),
  water: parseArt(waterSvg),

  /* The one drawing the supplied set has no counterpart for: the X on the
     guide popup, the section sheet and the training dialog. It is the old line
     drawing scaled into the same 96-unit box, so it draws exactly as it did,
     and it keeps its `currentColor` stroke so it still follows the button it
     sits in. */
  close: [
    { d: 'M24 24l48 48', stroke: 'currentColor', strokeWidth: 8, linecap: 'round' },
    { d: 'M72 24 24 72', stroke: 'currentColor', strokeWidth: 8, linecap: 'round' },
  ],
};

/** The pictogram for one of the five stores. */
export const RESOURCE_ICON: Readonly<Record<ResourceName, IconName>> = {
  power: 'power',
  oxygen: 'oxygen',
  water: 'water',
  food: 'food',
  shielding: 'shielding',
};

/**
 * The pictogram for a science rank, by rank id.
 *
 * A rank is a milestone, not a resource: the picture climbs from an explorer to
 * a chief scientist as the crew does. Ids are used rather than titles so
 * rewording a rank cannot silently lose its icon.
 */
export const RANK_ICON: Readonly<Record<string, IconName>> = {
  explorer: 'explorer',
  'field-scientist': 'field-scientist',
  'research-lead': 'research-lead',
  'senior-scientist': 'senior-scientist',
  'chief-scientist': 'chief-scientist',
};

/**
 * The pictogram for a module, by module kind.
 *
 * The eight drawings of the outpost's own equipment, in the same hand as the
 * module artwork on the panel. A model may not import `ui/`, so the mapping
 * lives here rather than in `sim/modules.ts` (D-083).
 */
export const MODULE_ICON: Readonly<Record<ModuleKind, IconName>> = {
  habitat: 'habitat-module',
  'life-support': 'life-support-module',
  'solar-array': 'solar-array-module',
  batteries: 'batteries-module',
  greenhouse: 'greenhouse-module',
  'ice-miner': 'ice-miner-module',
  'regolith-shield': 'regolith-shield-module',
  'nuclear-unit': 'nuclear-unit-module',
};

/**
 * Draw an icon.
 *
 * Pass `label` when the icon is the only thing carrying the meaning (a tile in
 * a grid of tiles, a lone button); leave it off inside a labelled card, where
 * the pictogram is decoration and a screen reader should skip it.
 */
export function icon(name: IconName, label?: string): SVGSVGElement {
  const classes = label === undefined ? 'ico' : 'ico ico--labelled';

  return svg(ICON_PATHS[name], {
    class: classes,
    viewBox: VIEW_BOX,
    ...(label === undefined
      ? { 'aria-hidden': 'true' }
      : { role: 'img', 'aria-label': label }),
  });
}
