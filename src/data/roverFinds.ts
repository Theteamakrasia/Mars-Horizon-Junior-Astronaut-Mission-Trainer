/**
 * What the rover can find: real places and rocks, from NASA's own pictures.
 *
 * Three historic sites (craft that landed, were lost, or were rediscovered) and
 * three rare rocks. Every picture comes from NASA and every credit line is
 * kept as NASA publishes it. Like the sol gallery, this is a fixed, checked
 * list rather than a live call: a child on a slow connection should not wait
 * for an API, and an outage must not cost the game a lesson. The only request
 * is the browser fetching the picture; a picture that fails to load is dropped
 * by the window and the words stay.
 *
 * Pure: no DOM, no network. `ui/roverWidget.ts` draws these.
 *
 * Wording follows R-20: craft are "lost", never destroyed in a way that costs a
 * life, and nothing here has an enemy.
 */

import type { RoverFind } from '../sim/rover';

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
