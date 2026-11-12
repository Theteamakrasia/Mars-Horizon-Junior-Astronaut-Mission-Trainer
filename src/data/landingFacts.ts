/**
 * The NASA facts the landing cinematic teaches.
 *
 * Every line the player reads during the landing sequence comes from here, and
 * every one of them was checked against a NASA page before it was written down.
 * The page's own title and address travel with the fact, so the "Source: NASA"
 * tag on the screen is not a decoration: it names the page the sentence came
 * from, and the reader can go and look.
 *
 * **No network request.** This file is the saved half of the NASA's data layer,
 * like `nasaGallery.ts` beside it: the facts are here whether or not anything
 * is reachable, so the game works offline and the demo never depends on a
 * connection that may not be there.
 *
 * **A fact that could not be confirmed was dropped, not softened.** Mars's
 * distance from Earth is quoted from NASA's "Hazard: Distance From Earth"
 * (140 million miles on average) and not from the much-quoted "225 million
 * kilometres", which is the distance from the Sun and not from us. The same
 * rule applies to the zone entries: NASA's own figures are used, even where a
 * different figure is more often repeated.
 *
 * Pure: no DOM, no clock, no randomness. `npm run check` enforces the first
 * two, and a fact that changed with the day would be a fact nobody can trust.
 */

/** One fact, with the NASA page it came from. */
export interface NasaFact {
  /** Stable key, used by the cinematic's timeline. */
  readonly id: string;
  /** The sentence on screen. Written for a reader aged eight to sixteen. */
  readonly text: string;
  /** The NASA page's own title. */
  readonly source: string;
  /** The page's address. */
  readonly url: string;
}

/**
 * The facts the cinematic can teach.
 *
 * The order here is the order the film meets them: the approach, the black
 * beat, the three descent shots and the landing. The ids are what the
 * timeline names, so a fact that moves in this file moves with its beat.
 */
export const LANDING_FACTS: readonly NasaFact[] = [
  {
    id: 'distance',
    text: 'Mars is, on average, 140 million miles from Earth.',
    source: 'Hazard: Distance From Earth',
    url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
  },
  {
    id: 'gravity',
    text: 'Gravity on Mars is about one third of Earth’s. You would weigh 38 pounds there for every 100 pounds you weigh here.',
    source: 'Humans to Mars',
    url: 'https://www.nasa.gov/humans-in-space/humans-to-mars/',
  },
  {
    id: 'flight',
    text: 'Perseverance left Earth on July 30, 2020 and landed on Mars on February 18, 2021 — about six and a half months of space flight.',
    source: 'Mars 2020: Perseverance Rover',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
  },
  {
    id: 'sol',
    text: 'A sol — a day on Mars — lasts about 24 hours and 39 minutes.',
    source: 'Mars Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
  },
  {
    id: 'entry',
    text: 'A spacecraft reaches the Martian atmosphere travelling nearly 12,500 mph (20,000 kph).',
    source: 'Perseverance Deploys its Parachute',
    url: 'https://www.nasa.gov/image-article/perseverance-deploys-parachute/',
  },
  {
    id: 'air',
    text: 'The pressure of Mars’s atmosphere is less than 1% of Earth’s, so the thin air cannot slow a heavy spacecraft on its own.',
    source: 'Terraforming the Martian Atmosphere',
    url: 'https://science.nasa.gov/resource/terraforming-the-martian-atmosphere/',
  },
  {
    id: 'parachute',
    text: 'Perseverance’s supersonic parachute is 70.5 feet (21.5 meters) across, and it opened about 240 seconds into the descent.',
    source: 'Perseverance Deploys its Parachute',
    url: 'https://www.nasa.gov/image-article/perseverance-deploys-parachute/',
  },
  {
    id: 'seven-minutes',
    text: 'Entry, descent and landing takes about seven minutes. NASA calls it the seven minutes of terror.',
    source: 'Perseverance Deploys its Parachute',
    url: 'https://www.nasa.gov/image-article/perseverance-deploys-parachute/',
  },
  {
    id: 'sunlight',
    text: 'Sunlight on Mars is about 43% as strong as sunlight on Earth, so a solar panel here makes less power than the same panel there.',
    source: 'Mars Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
  },
  {
    id: 'orion',
    text: 'Orion is NASA’s crew spacecraft for Artemis missions to the Moon. It is the inspiration for the capsule in this film — it has not flown to Mars.',
    source: 'Orion Spacecraft',
    url: 'https://www.nasa.gov/orion/',
  },
  {
    id: 'comms',
    text: 'Mars is between 33 million and 249 million miles from Earth and is always changing, so a radio message takes minutes to arrive, not seconds.',
    source: 'Humans to Mars',
    url: 'https://www.nasa.gov/humans-in-space/humans-to-mars/',
  },
];

/**
 * One fact about each landing region, keyed by the region's id in
 * `sim/regions.ts`.
 *
 * These are the facts the film's last shot carries, so each one is about the
 * place the player chose and not about the landing in general. The wording is
 * NASA's own, with the numbers NASA gives.
 */
export const ZONE_FACTS: Readonly<Record<string, NasaFact>> = {
  jezero: {
    id: 'zone-jezero',
    text: 'Jezero Crater is 28 miles (45 kilometers) wide. More than 3.5 billion years ago, rivers spilled over its wall and filled it with a lake.',
    source: 'Mars 2020: Perseverance Rover',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
  },
  olympus: {
    id: 'zone-olympus',
    text: 'Olympus Mons is the largest volcano in the solar system. It stands more than 25 miles (40 kilometers) tall from base to summit, with a base as large as the state of Arizona.',
    source: 'Mars Facts',
    url: 'https://science.nasa.gov/mars/facts/',
  },
  valles: {
    id: 'zone-valles',
    text: 'Valles Marineris is the largest canyon in the solar system. It runs about 2,400 miles (3,870 kilometers) along and drops 5.8 miles (9.3 kilometers) to its floor.',
    source: 'Mars Facts',
    url: 'https://science.nasa.gov/mars/facts/',
  },
  arcadia: {
    id: 'zone-arcadia',
    text: 'NASA’s map of buried ice shows water ice less than one foot below the surface across a large part of Arcadia Planitia — the most tempting target in the northern hemisphere.',
    source: 'NASA’s Treasure Map for Water Ice on Mars',
    url: 'https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/',
  },
  argyre: {
    id: 'zone-argyre',
    text: 'Argyre Planitia is one of the largest impact basins on Mars, in the southern hemisphere, and its light-colored plains run 800 kilometers across.',
    source: 'NASA Image and Video Library',
    url: 'https://images.nasa.gov/details/PIA00193',
  },
};

/** The fact with this id, or null when there is no such fact. */
export function factById(id: string): NasaFact | null {
  return LANDING_FACTS.find((fact) => fact.id === id) ?? null;
}

/**
 * The fact about a landing region, or null when the region is unknown.
 *
 * A deep link with no region chosen gets null rather than a throw, so the
 * cinematic reached by URL still plays.
 */
export function zoneFact(regionId: string): NasaFact | null {
  return ZONE_FACTS[regionId] ?? null;
}
