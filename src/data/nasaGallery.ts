/**
 * A curated set of real NASA images, one for each sol of a winning run.
 *
 * Why a static gallery rather than a live call: the image API answers with CORS
 * `*`, but a child on a school connection should not wait for it between sols,
 * and an API outage must not cost the game its teaching moment. These twelve
 * assets are fixed, checked, and credited; the only network request is the
 * browser fetching the picture itself.
 *
 * Pure: no DOM, no network. `nasaCard.ts` in `ui/` draws these; this file only
 * describes them.
 *
 * Image use follows NASA's media guidelines: credit is shown on every card and
 * the caption links back to the image's NASA page. No NASA insignia is used
 * here, and a credit line is never removed.
 */

import type { ScienceTopic } from '../sim/topics';

/**
 * Everything every NASA figure needs, whether it belongs to a sol or a region.
 *
 * `sol` and `regionId` are deliberately separate fields on separate interfaces
 * rather than one optional pair: a card that claims to be for sol 4 must say
 * so, and a region card must not be able to lie about which sol it follows.
 */
export interface NasaFigure {
  /** NASA's image id, e.g. `PIA21958`. Also the last part of the details URL. */
  readonly nasaId: string;
  /** Headline on the card. Short enough for a child to read at a glance. */
  readonly title: string;
  /** What a screen reader says instead of the picture. Describe, do not repeat the title. */
  readonly alt: string;
  /** Two sentences: what the picture shows and why it matters on Mars. */
  readonly caption: string;
  /** The "did you know" hook: one concrete, surprising fact. */
  readonly fact: string;
  /** NASA's required credit line, kept exactly as published. */
  readonly credit: string;
  /** The fixed `images-assets.nasa.gov` URL. `small` is used where NASA has no `medium`. */
  readonly imageUrl: string;
  /** The image's page on images.nasa.gov. */
  readonly sourceUrl: string;
}

/** One learning card, tied to the sol it appears after. */
export interface NasaCard extends NasaFigure {
  /** The sol this card follows: 1-12. */
  readonly sol: number;
}

/** One learning card for a landing region. */
export interface RegionCard extends NasaFigure {
  /** The `Region.id` this card illustrates, e.g. `jezero`. */
  readonly regionId: string;
}

/** Build the stable asset URL. `small` is about 640px wide, enough for a card. */
function assetUrl(nasaId: string, size: 'small' | 'medium' = 'medium'): string {
  return `https://images-assets.nasa.gov/image/${nasaId}/${nasaId}~${size}.jpg`;
}

/** The details page a player can visit for the full-size picture and story. */
function sourceUrl(nasaId: string): string {
  return `https://images.nasa.gov/details/${nasaId}`;
}

/**
 * The twelve cards, in sol order.
 *
 * The order follows the run: arrival, scouting water, the first flare, how much
 * shielding radiation needs, a resupply launch, the rover at Jezero, the dust
 * storm, the station's solar arrays, water recycling, the second flare, making
 * oxygen, and growing food. Each one explains a system the player has just used.
 */
export const NASA_CARDS: readonly NasaCard[] = [
  {
    sol: 1,
    nasaId: 'PIA02992',
    title: 'The whole planet Mars',
    alt: 'A globe of Mars assembled from many images, showing its dusty orange surface.',
    caption: 'This is Mars, the planet you just landed on. It is about half as wide as Earth and covered in red dust.',
    fact: 'One Mars day, called a sol, is only about 40 minutes longer than a day on Earth.',
    credit: 'NASA/JPL/USGS',
    imageUrl: assetUrl('PIA02992'),
    sourceUrl: sourceUrl('PIA02992'),
  },
  {
    sol: 2,
    nasaId: 'PIA26045',
    title: 'Where the water ice hides',
    alt: 'A map of Mars with blue patches marking places where water ice lies under the ground.',
    caption: 'The blue areas show where NASA found water ice under the dusty ground. Ice can become drinking water and air to breathe.',
    fact: 'Most of the water on Mars is frozen, and some of it is buried just below the surface.',
    credit: 'NASA/JPL-Caltech/Planetary Science Institute',
    imageUrl: assetUrl('PIA26045'),
    sourceUrl: sourceUrl('PIA26045'),
  },
  {
    sol: 3,
    nasaId: 'PIA21958',
    title: 'A real solar flare',
    alt: 'A bright burst of light exploding from the surface of the Sun.',
    caption: 'The Sun can throw out a huge flash of energy called a solar flare. The flash adds radiation at Mars, so crews shelter behind shields.',
    fact: 'This flare was measured in 2017 and was one of the strongest of that solar cycle.',
    credit: 'NASA/GSFC/Solar Dynamics Observatory',
    imageUrl: assetUrl('PIA21958'),
    sourceUrl: sourceUrl('PIA21958'),
  },
  {
    sol: 4,
    nasaId: 'PIA17600',
    title: 'How much radiation reaches Mars',
    alt: "A chart of daily radiation measurements taken by NASA's Curiosity rover on Mars.",
    caption: 'Radiation is invisible energy that can harm people. Curiosity measured it every day so engineers know how much shielding a crew needs.',
    fact: 'Mars has thin air and no global magnetic field like Earth, so more radiation reaches the ground.',
    credit: 'NASA/JPL-Caltech/SwRI',
    imageUrl: assetUrl('PIA17600', 'small'),
    sourceUrl: sourceUrl('PIA17600'),
  },
  {
    sol: 5,
    nasaId: 'KSC-20171215-PH_AWG03_0009',
    title: 'A supply ship leaves Earth',
    alt: 'A rocket lifting off with a Dragon supply ship carrying cargo into space.',
    caption: 'Supply ships carry food, water and spare parts to crews in space. A pod like this can bring the things your outpost cannot make yet.',
    fact: 'The Dragon capsule in this launch carried cargo to the International Space Station.',
    credit: 'NASA/Tony Gray and Sandra Joseph',
    imageUrl: assetUrl('KSC-20171215-PH_AWG03_0009'),
    sourceUrl: sourceUrl('KSC-20171215-PH_AWG03_0009'),
  },
  {
    sol: 6,
    nasaId: 'PIA26378',
    title: 'The rover exploring Jezero',
    alt: "A wide view of Jezero Crater on Mars taken by NASA's Perseverance rover.",
    caption: "NASA's Perseverance rover is exploring Jezero Crater, an ancient lake bed. Rovers test tools and find safe places before people arrive.",
    fact: 'Perseverance landed in 2021 and is still studying Martian rocks today.',
    credit: 'NASA/JPL-Caltech/ASU/MSSS',
    imageUrl: assetUrl('PIA26378'),
    sourceUrl: sourceUrl('PIA26378'),
  },
  {
    sol: 7,
    nasaId: 'PIA22519',
    title: 'A giant dust storm',
    alt: 'A map of Mars showing a huge dust storm spreading across the planet.',
    caption: 'Dust storms on Mars can grow wider than a country and last for weeks. Dust blocks sunlight, so solar panels make less power.',
    fact: 'In 2018, one storm grew so big it covered almost the whole planet.',
    credit: 'NASA/JPL-Caltech/MSSS',
    imageUrl: assetUrl('PIA22519', 'small'),
    sourceUrl: sourceUrl('PIA22519'),
  },
  {
    sol: 8,
    nasaId: 'iss073e0850593',
    title: 'Solar panels in space',
    alt: 'Large solar arrays glowing violet in the moonlight on the International Space Station.',
    caption: "These are the International Space Station's solar arrays. They turn sunlight into electricity, just like the panels on your outpost.",
    fact: "The station's solar wings are longer than a basketball court.",
    credit: 'NASA/JAXA · Kimiya Yui',
    imageUrl: assetUrl('iss073e0850593'),
    sourceUrl: sourceUrl('iss073e0850593'),
  },
  {
    sol: 9,
    nasaId: 'iss065e333421',
    title: 'Recycling every drop of water',
    alt: 'An astronaut working on the water recovery system inside the space station.',
    caption: 'Astronauts clean and reuse their water on the space station instead of throwing it away. A Mars outpost must do the same.',
    fact: "The station's water recovery system can reuse about 98% of the water the crew uses.",
    credit: 'NASA/ESA · Thomas Pesquet',
    imageUrl: assetUrl('iss065e333421'),
    sourceUrl: sourceUrl('iss065e333421'),
  },
  {
    sol: 10,
    nasaId: 'PIA21949',
    title: 'The Sun sends another burst',
    alt: 'Another bright solar flare bursting from the Sun, seen by a NASA telescope.',
    caption: 'Big flares can happen more than once in a month. Each one is a reminder to keep the crew shelter close and the shields ready.',
    fact: 'This 2017 flare was the largest the Sun had produced in more than a decade.',
    credit: 'NASA/GSFC/Solar Dynamics Observatory',
    imageUrl: assetUrl('PIA21949'),
    sourceUrl: sourceUrl('PIA21949'),
  },
  {
    sol: 11,
    nasaId: 'PIA24203',
    title: 'Making oxygen from Martian air',
    alt: "The gold-coloured MOXIE experiment installed inside NASA's Perseverance rover.",
    caption: 'MOXIE is a small machine that turns carbon dioxide from the Martian air into oxygen. A bigger one could help a crew breathe.',
    fact: 'MOXIE made oxygen on Mars for the first time in 2021.',
    credit: 'NASA/JPL-Caltech',
    imageUrl: assetUrl('PIA24203'),
    sourceUrl: sourceUrl('PIA24203'),
  },
  {
    sol: 12,
    nasaId: 'iss040e009126',
    title: 'Growing food in space',
    alt: 'An astronaut harvesting fresh plants grown on the International Space Station.',
    caption: 'Astronauts grow lettuce and other plants in space to learn how to feed a crew far from Earth. Your greenhouse does the same job on Mars.',
    fact: 'The Veg-01 experiment grew red romaine lettuce on the station in 2014.',
    credit: 'NASA',
    imageUrl: assetUrl('iss040e009126'),
    sourceUrl: sourceUrl('iss040e009126'),
  },
];

/**
 * The closing card: not tied to a sol, and honest that it is a drawing.
 *
 * A run can end in a win or a loss, so this does not promise success. It points
 * at the same five systems the player has just spent twelve sols balancing.
 */
export const NEXT_HORIZON_CARD: NasaCard = {
  sol: 12,
  nasaId: 'PIA23302',
  title: 'What a Mars outpost could look like',
  alt: "An artist's concept of astronauts and habitats on the surface of Mars.",
  caption: "This is an artist's picture of a future Mars outpost, not a photograph. Every run is about the same trade-offs: power, air, water, food and shielding.",
  fact: 'No people have visited Mars yet. NASA is testing the tools that could take a crew there.',
  credit: 'NASA',
  imageUrl: assetUrl('PIA23302'),
  sourceUrl: sourceUrl('PIA23302'),
};

/**
 * The card to show after a sol, or `null` when the sol is outside the run.
 *
 * The run is 12 sols, so `1` through `12` always answer. A fractional or
 * out-of-range value is not guessed at: returning `null` keeps the caller from
 * showing a lesson attached to the wrong day.
 */
export function cardForSol(sol: number): NasaCard | null {
  if (!Number.isFinite(sol)) return null;

  const whole = Math.trunc(sol);

  if (whole < 1 || whole > NASA_CARDS.length) return null;

  return NASA_CARDS[whole - 1] ?? null;
}

/**
 * One real NASA picture per landing region, so the choice the player is making
 * is a real place rather than a dot on a map.
 *
 * Every id here was checked against NASA's image API, and the caption says when
 * the picture is an artist's idea rather than a photograph.
 */
export const REGION_CARDS: Readonly<Record<string, RegionCard>> = {
  arcadia: {
    regionId: 'arcadia',
    nasaId: 'PIA22377',
    title: 'Arcadia Planitia',
    alt: 'Rounded hills and long ridges on the flat plains of Arcadia Planitia.',
    caption: 'Arcadia Planitia is a flat northern plain with ice buried under the surface. NASA orbiters photographed these rounded hills and ridges.',
    fact: 'There is so much buried ice here that a future crew could dig for water.',
    credit: 'NASA/JPL-Caltech/ASU',
    imageUrl: assetUrl('PIA22377'),
    sourceUrl: sourceUrl('PIA22377'),
  },
  jezero: {
    regionId: 'jezero',
    nasaId: 'PIA24172',
    title: 'Jezero Crater, long ago',
    alt: "An artist's idea of Jezero Crater filled with a lake, with rivers flowing in and out.",
    caption: 'Jezero Crater held a lake billions of years ago. This is an artist picture of what it may have looked like, not a photograph.',
    fact: 'NASA landed the Perseverance rover here in 2021 to look for signs of ancient life.',
    credit: 'NASA/JPL-Caltech',
    imageUrl: assetUrl('PIA24172'),
    sourceUrl: sourceUrl('PIA24172'),
  },
  olympus: {
    regionId: 'olympus',
    nasaId: 'PIA00300',
    title: 'Olympus Mons',
    alt: 'A huge flat-topped volcano rising above the surrounding plains of Mars.',
    caption: 'Olympus Mons is the tallest volcano in the solar system. It is about 22 kilometres high, more than twice as tall as Mount Everest.',
    fact: 'The cliff around the volcano is so tall that a day on Mars would not be long enough to climb it.',
    credit: 'NASA/JPL/USGS',
    imageUrl: assetUrl('PIA00300'),
    sourceUrl: sourceUrl('PIA00300'),
  },
  valles: {
    regionId: 'valles',
    nasaId: 'PIA06926',
    title: 'Valles Marineris',
    alt: 'A huge canyon system stretching across Mars, with layered walls and landslides.',
    caption: 'Valles Marineris is a canyon system more than 4,000 kilometres long. It would stretch almost all the way across the United States.',
    fact: 'Earth\'s Grand Canyon would fit inside Valles Marineris many times over.',
    credit: 'NASA/JPL/Arizona State University',
    imageUrl: assetUrl('PIA06926'),
    sourceUrl: sourceUrl('PIA06926'),
  },
  argyre: {
    regionId: 'argyre',
    nasaId: 'PIA08067',
    title: 'Argyre Basin',
    alt: 'A wide impact basin on Mars seen from orbit, with lighter and darker ground.',
    caption: 'Argyre is a giant impact basin in the southern highlands. Scientists think it may once have held water.',
    fact: 'Argyre Basin is about 1,800 kilometres across, wider than the whole island of Hawaii.',
    credit: 'NASA/JPL/MSSS',
    imageUrl: assetUrl('PIA08067', 'small'),
    sourceUrl: sourceUrl('PIA08067'),
  },
};

/** The card for a landing region, or `null` for an unknown id. */
export function regionCard(regionId: string): RegionCard | null {
  return REGION_CARDS[regionId] ?? null;
}

/** A short NASA fact a screen can show beside its own numbers. */
export interface NasaFact {
  readonly text: string;
  readonly credit: string;
  /**
   * What the fact is about.
   *
   * A screen that is teaching about water wants a fact about water, so the
   * facts carry the same topics the activities do (`sim/topics.ts`).
   */
  readonly topic: ScienceTopic;
}

/** The first fact is also the fallback, so `factFor` can never return undefined. */
const FIRST_FACT: NasaFact = {
  text: 'A day on Mars, called a sol, is 24 hours and 39 minutes long.',
  credit: 'NASA',
  topic: 'missions',
};

/**
 * Short, surprising NASA facts for the screens that have no card of their own.
 *
 * Kept separate from the cards because these rotate rather than follow a sol:
 * the same screen can show a different fact each run without inventing one.
 */
export const FACTS: readonly NasaFact[] = [
  FIRST_FACT,
  { text: 'A year on Mars lasts 687 Earth days, almost twice as long as an Earth year.', credit: 'NASA', topic: 'missions' },
  { text: 'Mars has two small moons, Phobos and Deimos. Phobos is so close that it rises and sets twice in one sol.', credit: 'NASA/JPL', topic: 'missions' },
  { text: 'The tallest volcano in the solar system, Olympus Mons, is about 22 kilometres high.', credit: 'NASA/JPL/USGS', topic: 'missions' },
  { text: 'Martian dust is so fine that it makes the sunset on Mars look blue.', credit: 'NASA/JPL-Caltech', topic: 'power' },
  { text: 'Sometimes a dust storm on Mars grows so large that it covers the whole planet.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'power' },
  { text: 'NASA Curiosity found evidence that Mars once had rivers and lakes.', credit: 'NASA/JPL-Caltech', topic: 'water' },
  { text: 'Almost all the water on Mars today is frozen, in the polar ice caps and underground.', credit: 'NASA/JPL-Caltech/ASU', topic: 'water' },
  { text: 'The red colour of Mars comes from rusty iron in its dust.', credit: 'NASA/JPL', topic: 'missions' },
  { text: 'Mars is about half as wide as Earth.', credit: 'NASA', topic: 'missions' },
  { text: 'Perseverance carried a small helicopter called Ingenuity that flew in the thin Martian air.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
  { text: 'The air on Mars is about 95% carbon dioxide, so crews must bring their own oxygen.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
  { text: 'Valles Marineris is more than 4,000 kilometres long.', credit: 'NASA/JPL/Arizona State University', topic: 'missions' },
  { text: 'Mars has no global magnetic field, so crews will need shielding from space radiation.', credit: 'NASA/JPL-Caltech/SwRI', topic: 'radiation' },
  { text: 'The solar wind stripped away much of the Martian air a long time ago.', credit: 'NASA/GSFC', topic: 'radiation' },
  { text: 'Solar panels get dusty on Mars, so rovers tilt toward the Sun to shake the dust off.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'power' },
  { text: 'The Mars InSight lander made about 100 watts of power — the same as a dim light bulb.', credit: 'NASA/JPL-Caltech', topic: 'power' },
  { text: 'A nuclear power unit keeps working in the dark and in a dust storm, which is why NASA rover teams have used radioisotope power.', credit: 'NASA', topic: 'power' },
  { text: 'Solar cells on Mars rovers get dustier every year, so engineers clean them with wind, not water.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'power' },
  { text: 'A solar panel only makes power while the Sun is up, so every Mars outpost needs batteries for the night.', credit: 'NASA', topic: 'power' },
  { text: 'Dust storms can cut the sunlight on Mars so low that a rover has to go to sleep and wait them out.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'power' },
  { text: 'Salt water, not fresh, was found in the soil of Gale Crater, and it took millions of years to form.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'water' },
  { text: 'The Phoenix lander found water ice in the soil and watched it turn straight into vapour.', credit: 'NASA/JPL-Caltech/University of Arizona', topic: 'water' },
  { text: 'On Earth, water boils at 100 degrees. On Mars it boils at almost nothing, so liquid water needs a sealed tank.', credit: 'NASA', topic: 'water' },
  { text: 'Mars has rivers today, not just ancient ones: NASA found seasonal flows of salty water on warm slopes.', credit: 'NASA/JPL-Caltech', topic: 'water' },
  { text: 'Water ice has been found at both poles of Mars and under the dust at middle latitudes.', credit: 'NASA/JPL-Caltech', topic: 'water' },
  { text: 'Recycling water is essential: astronauts on the space station reuse about 98% of the water they use.', credit: 'NASA', topic: 'water' },
  { text: 'Astronauts have grown plants in space since the 1970s, on the first NASA space station.', credit: 'NASA', topic: 'food' },
  { text: 'Plants in space have to be told which way is down, because there is no gravity pulling their roots.', credit: 'NASA', topic: 'food' },
  { text: 'Every kilogram of food for a Mars crew has to be launched from Earth, so growing it on Mars saves a rocket.', credit: 'NASA', topic: 'food' },
  { text: 'Growing food gives the crew something to look after, which matters on a long trip.', credit: 'NASA', topic: 'food' },
  { text: 'On the space station, plants help clean the air as well as feed the crew.', credit: 'NASA', topic: 'food' },
  { text: 'Curiosity measured radiation on the surface of Mars for years, to work out how much shielding a crew needs.', credit: 'NASA/JPL-Caltech/SwRI', topic: 'radiation' },
  { text: 'The space station is protected by the magnetic field of Earth, not by a thick wall.', credit: 'NASA', topic: 'radiation' },
  { text: 'Solar particles reach Mars in minutes, but any answer from Earth takes at least three.', credit: 'NASA', topic: 'radiation' },
  { text: 'Spacesuit layers are not mainly for cold. They are for radiation, dust and tiny bits of rock.', credit: 'NASA', topic: 'radiation' },
  { text: 'The Perseverance rover landed in Jezero Crater in 2021 and has been collecting samples ever since.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
  { text: 'Curiosity has been climbing Mount Sharp in Gale Crater since 2014.', credit: 'NASA/JPL-Caltech/MSSS', topic: 'missions' },
  { text: 'Ingenuity was the first aircraft to fly on another planet. It made 72 flights.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
  { text: 'Perseverance caches its rock samples in tubes, so a future spacecraft can pick them up.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
  { text: 'Martian dust is so fine and sticky that it clings to everything, including spacecraft.', credit: 'NASA/JPL-Caltech', topic: 'missions' },
];

/**
 * Pick a fact from a number, so a screen can rotate facts without `Math.random`.
 *
 * A seed is usually the sol, the run length or the region index: the same run
 * sees the same fact, which keeps the screen repeatable in a demo and in tests.
 * Negative and huge seeds are wrapped rather than throwing.
 */
export function factFor(seed: number): NasaFact {
  const count = FACTS.length;

  if (!Number.isFinite(seed)) return FIRST_FACT;

  const wrapped = ((Math.trunc(seed) % count) + count) % count;
  const found = FACTS[wrapped];

  return found ?? FIRST_FACT;
}

/**
 * Pick a fact about one particular system.
 *
 * A screen teaching about solar panels wants a fact about solar panels, not a
 * random one — that is what the topics are for (D-050). A topic with no facts
 * falls back to the first fact rather than returning nothing, so a screen
 * never has to guard against it.
 */
export function factForTopic(topic: ScienceTopic, seed: number): NasaFact {
  const matching = FACTS.filter((fact) => fact.topic === topic);

  if (matching.length === 0) return FIRST_FACT;
  if (!Number.isFinite(seed)) return matching[0] ?? FIRST_FACT;

  const wrapped = ((Math.trunc(seed) % matching.length) + matching.length) % matching.length;

  return matching[wrapped] ?? FIRST_FACT;
}

