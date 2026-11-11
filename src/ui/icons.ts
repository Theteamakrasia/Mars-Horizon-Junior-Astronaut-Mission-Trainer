/**
 * The icon set.
 *
 * Every pictogram in the game is one of these drawings, named. Nothing here is
 * an emoji: an emoji is drawn by the operating system, so it changes shape
 * between machines, cannot follow the game's ink, and reads as decoration
 * rather than as a control. These are 24×24 line drawings stroked in
 * `currentColor`, so a tile, a HUD card and a warning all tint the same icon
 * with their own colour.
 *
 * The data and the drawing live in one file on purpose: `ICON_PATHS` is what a
 * test can read without a browser, and `icon()` is the only thing that touches
 * the DOM. A name with no drawing is a type error, and a drawing with a stray
 * character in it fails `icons.test.ts`.
 */

import { svg, type Shape } from '../dom/svg';
import type { ResourceName } from '../sim/resources';

import './icons.css';

/** Every pictogram the game can draw. */
export type IconName =
  | 'alert'
  | 'bolt'
  | 'book'
  | 'box'
  | 'bulb'
  | 'chart'
  | 'check'
  | 'chevron'
  | 'clipboard'
  | 'close'
  | 'cloud-sun'
  | 'dish'
  | 'droplet'
  | 'flask'
  | 'helmet'
  | 'history'
  | 'home'
  | 'leaf'
  | 'letter'
  | 'map'
  | 'moon'
  | 'mountain'
  | 'oxygen'
  | 'pick'
  | 'question'
  | 'recycle'
  | 'rock'
  | 'rocket'
  | 'rover'
  | 'shield'
  | 'sparkle'
  | 'star'
  | 'storm'
  | 'sun'
  | 'tray';

/**
 * The drawings, in a 24×24 box.
 *
 * Line drawings only, with a `fill` used for a dot. They are deliberately
 * simple: at a HUD card's size a detailed drawing is a smudge, and the label
 * beside it is carrying the meaning anyway.
 */
export const ICON_PATHS: Readonly<Record<IconName, readonly Shape[]>> = {
  alert: [{ d: 'M12 3.5 2.5 20h19Z' }, { d: 'M12 9.5v4.5' }, { d: 'M12 17a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2', fill: true }],
  bolt: [{ d: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z' }],
  book: [
    { d: 'M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2Z' },
    { d: 'M12 6.5v13' },
  ],
  box: [
    { d: 'M3 8 12 4l9 4v8l-9 4-9-4Z' },
    { d: 'M3 8l9 4 9-4' },
    { d: 'M12 12v8' },
  ],
  /* An idea: the guide's header mark, where the reference uses a lightbulb. */
  bulb: [
    { d: 'M9.5 18h5' },
    { d: 'M10.5 21h3' },
    { d: 'M12 3a6 6 0 0 0-3.7 10.7c.7.6 1.2 1.4 1.3 2.3h4.8c.1-.9.6-1.7 1.3-2.3A6 6 0 0 0 12 3Z' },
  ],
  chart: [{ d: 'M3 20h18' }, { d: 'M7 20v-7' }, { d: 'M12 20V5' }, { d: 'M17 20v-10' }],
  check: [{ d: 'm4.5 12.5 5 5 10-11' }],
  chevron: [{ d: 'm9 5 7 7-7 7' }],
  clipboard: [
    { d: 'M9 4h6v3H9Z' },
    { d: 'M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H15' },
    { d: 'm8.5 13 2 2 4-4' },
  ],
  close: [{ d: 'M6 6l12 12' }, { d: 'M18 6 6 18' }],
  'cloud-sun': [
    { d: 'M7.5 19a4 4 0 0 1 .4-8 5.5 5.5 0 0 1 10.6 1.6A3.5 3.5 0 0 1 18 19Z' },
    { d: 'M17.5 5V3.5' },
    { d: 'M21 8.5h1.5' },
    { d: 'M20 4.5l1 1' },
  ],
  dish: [
    { d: 'M4 20h16' },
    { d: 'M5 20a10 10 0 0 1 14 0' },
    { d: 'M12 10V6' },
    { d: 'M12 2.2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8' },
  ],
  droplet: [
    { d: 'M12 3c3 3.6 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6.4 6-10Z' },
  ],
  flask: [
    { d: 'M9.5 3h5' },
    { d: 'M10.5 3v6L5 19a1.4 1.4 0 0 0 1.2 2h11.6a1.4 1.4 0 0 0 1.2-2L13.5 9V3' },
    { d: 'M7.5 14h9' },
  ],
  helmet: [
    { d: 'M4 19h16' },
    { d: 'M6 19v-5a6 6 0 0 1 12 0v5' },
    { d: 'M9.5 13.5h5' },
  ],
  history: [
    { d: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1' },
    { d: 'M3 4.5V9h4.5' },
    { d: 'M12 8v4.5l3 1.8' },
  ],
  home: [{ d: 'm3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z' }],
  leaf: [
    { d: 'M20 4h-1C10 4 5 8.5 5 14a5 5 0 0 0 5 5c6 0 10-6 10-15Z' },
    { d: 'M4 20c2.5-3 5-5.5 9-8' },
  ],
  /* A message from home: an envelope, because the mail takes twenty minutes. */
  letter: [
    { d: 'M3 6.5h18v11H3Z' },
    { d: 'm3 7 9 6.5L21 7' },
  ],
  map: [
    { d: 'M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6Z' },
    { d: 'M9 3v15' },
    { d: 'M15 6v15' },
  ],
  moon: [{ d: 'M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z' }],
  mountain: [{ d: 'M2.5 20 9 7l4.5 8 2.5-4 5.5 9Z' }],
  /* Air: a breath crossing the box. */
  oxygen: [
    { d: 'M3 8h11a3 3 0 1 0-3-3' },
    { d: 'M3 13h15a3 3 0 1 1-3 3' },
    { d: 'M3 18h7' },
  ],
  pick: [
    { d: 'M4 20 13 11' },
    { d: 'M9 4l11 11-3 3L6 7Z' },
  ],
  question: [
    { d: 'M9.2 9a2.9 2.9 0 1 1 4.3 2.6c-.9.6-1.5 1.1-1.5 2.4' },
    { d: 'M12 17.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4', fill: true },
  ],
  recycle: [
    { d: 'M4 12a8 8 0 0 1 13.4-5.9' },
    { d: 'M17.5 2.5v4.5H13' },
    { d: 'M20 12a8 8 0 0 1-13.4 5.9' },
    { d: 'M6.5 21.5V17H11' },
  ],
  rock: [{ d: 'm3 19 4-7 4 2.5 3-5 7 9.5Z' }, { d: 'M3 19h18' }],
  rocket: [
    { d: 'M12 2.5c3 2 5 5.5 5 9.5l-2.5 3h-5L7 12c0-4 2-7.5 5-9.5Z' },
    { d: 'M9.5 15 7 21l3.5-2' },
    { d: 'M14.5 15 17 21l-3.5-2' },
    { d: 'M12 7.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2', fill: true },
  ],
  rover: [
    { d: 'M3 15v-3l2.5-3h13L21 12v3Z' },
    { d: 'M7 19a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4' },
    { d: 'M17 19a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4' },
    { d: 'M15 9V5' },
  ],
  shield: [{ d: 'M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6Z' }],
  sparkle: [
    { d: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z' },
    { d: 'M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z' },
  ],
  star: [{ d: 'M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8Z' }],
  storm: [{ d: 'M3 6h18' }, { d: 'M5 10h14' }, { d: 'M7 14h10' }, { d: 'M9 18h6' }],
  sun: [
    { d: 'M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6' },
    { d: 'M12 2v2' },
    { d: 'M12 20v2' },
    { d: 'M2 12h2' },
    { d: 'M20 12h2' },
    { d: 'M4.9 4.9l1.4 1.4' },
    { d: 'M17.7 17.7l1.4 1.4' },
    { d: 'M19.1 4.9l-1.4 1.4' },
    { d: 'M6.3 17.7l-1.4 1.4' },
  ],
  tray: [{ d: 'M3 13h5l1.5 3h5L16 13h5' }, { d: 'M4.5 13 6.5 5h11l2 8v6a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1Z' }],
};

/** The pictogram for one of the five stores. */
export const RESOURCE_ICON: Readonly<Record<ResourceName, IconName>> = {
  power: 'bolt',
  oxygen: 'oxygen',
  water: 'droplet',
  food: 'leaf',
  shielding: 'shield',
};

/**
 * The pictogram for a science rank, by rank id.
 *
 * A rank is a milestone, not a resource: the picture climbs from a seedling to
 * a star as the crew does. Ids are used rather than titles so rewording a rank
 * cannot silently lose its icon.
 */
export const RANK_ICON: Readonly<Record<string, IconName>> = {
  explorer: 'leaf',
  'field-scientist': 'flask',
  'research-lead': 'sparkle',
  'senior-scientist': 'dish',
  'chief-scientist': 'star',
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
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...(label === undefined
      ? { 'aria-hidden': 'true' }
      : { role: 'img', 'aria-label': label }),
  });
}
