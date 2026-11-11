/**
 * The rover: a robot you send out to look for lost history and rare rocks.
 *
 * Pure rules only. No DOM, no timers, no network (R-1). This file owns what
 * is allowed to happen: a rover that is at base cannot find anything, a find
 * waits until the player has answered it, and nothing is ever found twice.
 *
 * The rover lives in the run, not in a window. It is sent out by a work order
 * like any other, it moves on sol time rather than on a wall clock, and it
 * comes back with a document on the desk. A rover you can only look at from
 * the outside is not part of the game.
 *
 * Randomness comes in as a number from 0 to 1 (`pick`), never from
 * `Math.random()`, so every rule here can be asserted on exactly.
 *
 * Nothing here touches the resource stores: the rover is an explorer's extra,
 * not a way to win or lose a run (R-20).
 */

/** A lost craft or landing site worth reading about, or a rock worth keeping. */
export type FindKind = 'site' | 'material';

/** One thing the rover can come across. Every field is shown to the player. */
export interface RoverFind {
  /** Stable key, e.g. `viking-1`. Used so nothing is found twice. */
  readonly id: string;
  readonly kind: FindKind;
  readonly title: string;
  /** Where on Mars, in plain words. */
  readonly where: string;
  /** When it happened or was found, e.g. `1976`. */
  readonly when: string;
  /** What the picture shows, for a screen reader. */
  readonly alt: string;
  /** Two or three short sentences telling its story. */
  readonly story: string;
  /** The one surprising fact. */
  readonly fact: string;
  /** NASA's credit line for the picture. */
  readonly credit: string;
  /** The picture itself, on NASA's Photojournal. */
  readonly imageUrl: string;
  /** The picture's page on NASA's Photojournal. */
  readonly sourceUrl: string;
}

/** At base, or out exploring. */
export type RoverPhase = 'stowed' | 'exploring';

/** Everything the rover has done this run. */
export interface RoverState {
  readonly phase: RoverPhase;
  /**
   * The sol the rover comes back on.
   *
   * Null while it is stowed. The rover drives on sol time, like everything
   * else in the game, so the player knows when to expect it rather than
   * watching a countdown in another window.
   */
  readonly returnsOn: number | null;
  /** A find the player has not answered yet. While set, the rover finds nothing new. */
  readonly pending: RoverFind | null;
  /** Every id the rover has ever turned up, answered or not. Stops repeats. */
  readonly found: readonly string[];
  /** Sites the player has read about and logged. */
  readonly visited: readonly string[];
  /** Materials the player chose to collect. */
  readonly collected: readonly string[];
  /** Materials the player chose to leave where they lie. */
  readonly left: readonly string[];
}

/** A rover that has not been sent out yet. */
export function newRover(): RoverState {
  return { phase: 'stowed', returnsOn: null, pending: null, found: [], visited: [], collected: [], left: [] };
}

/**
 * Send the rover out.
 *
 * It comes back on the next sol, so the find is on the desk when the player
 * is making the next decision rather than arriving while they are looking at
 * something else. Already out is a no-op.
 */
export function deployRover(state: RoverState, sol: number): RoverState {
  if (state.phase === 'exploring') return state;

  return { ...state, phase: 'exploring', returnsOn: sol + 1 };
}

/**
 * Bring the rover home. Whatever it has already found stays found.
 *
 * A find that has not been answered holds the rover out: it is still driving
 * towards it. Recalling it then would leave a find waiting that the player
 * can never open, because a rover at base shows the deploy question first.
 */
export function recallRover(state: RoverState): RoverState {
  if (state.phase === 'stowed' || state.pending !== null) return state;

  return { ...state, phase: 'stowed', returnsOn: null };
}

/** The finds the rover has not turned up yet, in catalogue order. */
export function remainingFinds(state: RoverState, catalogue: readonly RoverFind[]): readonly RoverFind[] {
  return catalogue.filter((find) => !state.found.includes(find.id));
}

/** True when the rover is out, has nothing waiting, and there is still something left to find. */
export function canDiscover(state: RoverState, catalogue: readonly RoverFind[]): boolean {
  return state.phase === 'exploring' && state.pending === null && remainingFinds(state, catalogue).length > 0;
}

/**
 * The rover comes across something new.
 *
 * `pick` is 0 up to (not including) 1 and chooses among what is left. Returns
 * the state unchanged when the rover is at base, a find is already waiting, or
 * everything has been found.
 */
export function discover(state: RoverState, catalogue: readonly RoverFind[], pick: number): RoverState {
  if (!canDiscover(state, catalogue)) return state;

  const left = remainingFinds(state, catalogue);
  const index = Math.min(left.length - 1, Math.max(0, Math.floor(pick * left.length)));
  const find = left[index];

  if (find === undefined) return state;

  return { ...state, pending: find, found: [...state.found, find.id] };
}

/** The player has read about a historic site. It goes in the log and the find clears. */
export function logSite(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'site') return state;

  return { ...state, pending: null, visited: [...state.visited, find.id] };
}

/** The player took the material. It goes in the collection and the find clears. */
export function collectMaterial(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'material') return state;

  return { ...state, pending: null, collected: [...state.collected, find.id] };
}

/** The player chose to let the material be. It stays on Mars and the find clears. */
export function leaveMaterial(state: RoverState): RoverState {
  const find = state.pending;

  if (find === null || find.kind !== 'material') return state;

  return { ...state, pending: null, left: [...state.left, find.id] };
}

/**
 * What a find is worth in science points.
 *
 * The same however the player answers it. The choice is about what goes in
 * the record, not about the score: the rover teaches, and the score is for
 * the work rather than for the button pressed.
 */
export const FIND_SCIENCE = 4;

/** How the player answered a find. */
export type FindAnswer = 'log' | 'collect' | 'leave';

/**
 * Which find the rover turns up, given the sol it is on.
 *
 * The rover moves on sol time, so its finds do too: the same sol always turns
 * up the same thing, and the pick walks through the catalogue so a long run
 * works its way along it rather than repeating.
 */
export function pickForSol(sol: number, remaining: number): number {
  if (remaining <= 0) return 0;

  const spread = (Math.abs(sol * 7) % remaining) / remaining;

  return Math.min(0.999, spread);
}

/* ------------------------------------------------------------- the catalogue -- */

/**
 * The picture itself, from NASA's image CDN.
 *
 * Photojournal used to serve these at `photojournal.jpl.nasa.gov/jpeg/<PIA>.jpg`.
 * That address now redirects to a web page rather than an image, so every
 * rover picture came back as HTML and was dropped. The pictures live on
 * NASA's asset CDN instead, under a folder built from the PIA number:
 * `PIA26368` is in `pia26/pia26368/`.
 *
 * The size in the query string is the CDN resizing the picture for us, so a
 * child on a school connection downloads a picture that fits the screen rather
 * than the full-size one. Schiaparelli's picture is 2.6 MB unscaled. Both
 * sides are capped and the shape is kept, so nothing is cropped: a picture is
 * a picture of the thing, not of a piece of it.
 */
function pictureUrl(pia: string): string {
  const digits = pia.replace('PIA', '').toLowerCase();
  const folder = `pia${digits.slice(0, 2)}`;

  return `https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/${folder}/pia${digits}/${pia}.jpg?w=768&h=768&fit=clip`;
}

/** The picture's page, where the full caption and size options live. */
function pageUrl(pia: string): string {
  return `https://photojournal.jpl.nasa.gov/catalog/${pia}`;
}

/** Everything the rover can come across, in the order of this list. */
export const ROVER_FINDS: readonly RoverFind[] = [
  {
    id: 'viking-1',
    kind: 'site',
    title: 'Viking 1 landing site',
    where: 'Chryse Planitia, the “Plains of Gold”',
    when: '1976',
    alt: 'A rocky red-brown Martian plain under a reddish sky, with part of the Viking 1 lander and an orange cable in the corner.',
    story:
      'This is where the first American spacecraft to land safely on Mars came to rest. Viking 1 touched down on 20 July 1976 and sent back the first pictures ever taken from the surface of Mars.',
    fact: 'The two Viking landers took more than 4,500 pictures of the surface between them.',
    credit: 'NASA/JPL',
    imageUrl: pictureUrl('PIA00564'),
    sourceUrl: pageUrl('PIA00564'),
  },
  {
    id: 'pathfinder',
    kind: 'site',
    title: 'Pathfinder and Sojourner',
    where: 'Ares Vallis, an ancient flood channel',
    when: '1997',
    alt: 'The tiny Sojourner rover sitting next to some rocks on the rocky ground of Ares Vallis.',
    story:
      'Mars Pathfinder bounced to a stop on airbags in July 1997. Out rolled Sojourner, the very first wheeled rover to drive on Mars. It is about the size of a microwave oven.',
    fact: 'Sojourner was planned to work for 7 days. It kept going for 83.',
    credit: 'NASA/JPL',
    imageUrl: pictureUrl('PIA01122'),
    sourceUrl: pageUrl('PIA01122'),
  },
  {
    id: 'beagle-2',
    kind: 'site',
    title: 'Beagle 2, the lost lander',
    where: 'Isidis Planitia',
    when: 'Lost 2003, found 2015',
    alt: 'A black-and-white satellite picture of Mars, with a tiny bright shape marked "Beagle 2" on the dusty ground.',
    story:
      'Beagle 2 was a small British lander that was never heard from after it arrived on Christmas Day 2003. For years nobody knew what had happened. Then NASA’s Mars Reconnaissance Orbiter spotted it from space.',
    fact: 'The pictures show Beagle 2 did land softly and opened some of its solar panels. It simply could not call home.',
    credit: 'NASA/JPL-Caltech/Univ. of Arizona/University of Leicester',
    imageUrl: pictureUrl('PIA19107'),
    sourceUrl: pageUrl('PIA19107'),
  },
  {
    id: 'schiaparelli',
    kind: 'site',
    title: 'Schiaparelli test lander',
    where: 'Meridiani Planum',
    when: '2016',
    alt: 'A black-and-white satellite picture of Mars, with a bright square close-up of the crater where Schiaparelli reached the ground.',
    story:
      'Schiaparelli was a European test lander. Its landing did not go as planned, but it sent data all the way down. NASA’s orbiter then photographed the marks it left, and engineers used both to learn what to fix next time.',
    fact: 'Testing a landing on a small lander first is how space agencies make the next big one safer.',
    credit: 'NASA/JPL-Caltech/Univ. of Arizona',
    imageUrl: pictureUrl('PIA21131'),
    sourceUrl: pageUrl('PIA21131'),
  },
  {
    id: 'heat-shield-rock',
    kind: 'material',
    title: 'Heat Shield Rock',
    where: 'Meridiani Planum',
    when: '2005',
    alt: 'A dark, pitted, basketball-sized rock sitting on pale Martian sand.',
    story:
      'This pitted rock is a meteorite made mostly of iron and nickel. It fell to Mars from space long ago. It was the first meteorite of any kind ever identified on another planet.',
    fact: 'It was found sitting right next to where Opportunity’s own heat shield landed, which is how it got its name.',
    credit: 'NASA/JPL/Cornell',
    imageUrl: pictureUrl('PIA07269'),
    sourceUrl: pageUrl('PIA07269'),
  },
  {
    id: 'block-island',
    kind: 'material',
    title: 'Block Island meteorite',
    where: 'Meridiani Planum',
    when: '2009',
    alt: 'A close-up microscope view of a metal rock with a fine triangle-shaped pattern in its surface.',
    story:
      'Block Island is about 60 centimetres across and is the largest meteorite yet found on Mars. A close-up shows a triangle pattern that iron-nickel meteorites on Earth have too.',
    fact: 'That pattern formed more than 4.5 billion years ago, as the metal slowly cooled.',
    credit: 'NASA/JPL-Caltech/Cornell University/USGS',
    imageUrl: pictureUrl('PIA12191'),
    sourceUrl: pageUrl('PIA12191'),
  },
  {
    id: 'cheyava-falls',
    kind: 'material',
    title: 'The “leopard spot” rock',
    where: 'Jezero Crater, an ancient river bed',
    when: '2024',
    alt: 'A reddish band of rock on Mars covered in small white patches ringed with dark minerals, like leopard spots.',
    story:
      'Nicknamed Cheyava Falls, this rock was found by the Perseverance rover. Its reddish band is covered in light patches about a millimetre wide, each one ringed by a thin layer of dark minerals. The rover drilled a sample and kept it on board.',
    fact: 'The minerals in those spots, vivianite and greigite, are sometimes found on Earth beside living things. Scientists need to study the sample closely before they can say what it means.',
    credit: 'NASA/JPL-Caltech/MSSS',
    imageUrl: pictureUrl('PIA26368'),
    sourceUrl: pageUrl('PIA26368'),
  },
];
