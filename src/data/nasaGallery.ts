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

/** One learning card, tied to the sol it appears after. */
export interface NasaCard {
  /** The sol this card follows: 1-12. */
  readonly sol: number;
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
