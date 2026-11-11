/**
 * The standing orders: the rule book the outpost works to.
 *
 * Two orders arrive every sol. By sol six the board is complete, and after
 * that the player works to a full set — which is the whole point. In Papers,
 * Please the bulletin board fills up over the first half of the shift and the
 * difficulty comes from holding all of it in your head at once; here it comes
 * from holding twenty-four rules about power, water, dust, food and radiation
 * in your head while the numbers change underneath you.
 *
 * Every order is a real operating rule, and every one has a verified NASA
 * fact behind it in `data/nasaGallery.ts`. The orders *are* the five learning
 * goals, in the order the player meets them: this is where the science is
 * taught, and it is taught as something you have to work to rather than as a
 * score you collect.
 *
 * Pure. No DOM, no network, no randomness: the same run gets the same board.
 */

import type { ScienceGoal } from './goals';
import type { ScienceTopic } from './topics';

/** One order on the board. */
export interface StandingOrder {
  /** Stable key, e.g. `dust-fold`. */
  readonly id: string;
  /** The sol it arrives on, 1 to 12. */
  readonly sol: number;
  /** The goal it belongs to. */
  readonly goal: ScienceGoal;
  /** The rule, in one sentence a child can read. */
  readonly text: string;
  /** The topic its NASA fact is filed under. */
  readonly topic: ScienceTopic;
}

/**
 * The twenty-four orders, in the order they arrive.
 *
 * Two a sol, and every sol's pair is about a different pair of systems, so no
 * two days ask the same question. The order of the goals across the run is
 * deliberate: dust and power first, because the player meets them at landing;
 * then water and food, the two things the crew drinks and eats; then
 * radiation, which only becomes frightening once a flare is on the way; and
 * the closing orders pull the whole set together.
 */
export const STANDING_ORDERS: readonly StandingOrder[] = [
  { id: 'dust-fold', sol: 1, goal: 'dust-storm', topic: 'dust', text: 'The arrays make nothing while the panels are folded.' },
  { id: 'power-night', sol: 1, goal: 'power', topic: 'power', text: 'A solar panel only works while the Sun is up. Every night needs batteries.' },

  { id: 'water-ice', sol: 2, goal: 'life-support', topic: 'water', text: 'Water ice lies under the ground at this site.' },
  { id: 'food-launch', sol: 2, goal: 'food', topic: 'food', text: 'Every kilogram of food has to be launched from Earth.' },

  { id: 'rad-no-field', sol: 3, goal: 'radiation', topic: 'radiation', text: 'Mars has no global magnetic field. The crew needs shielding.' },
  { id: 'life-co2', sol: 3, goal: 'life-support', topic: 'missions', text: 'The air is 95% carbon dioxide. You have to make your own oxygen.' },

  { id: 'dust-settle', sol: 4, goal: 'dust-storm', topic: 'dust', text: 'Dust settles on the panels and never washes off. Clean them.' },
  { id: 'power-size', sol: 4, goal: 'power', topic: 'power', text: 'Size the batteries for the night, not for the day.' },

  { id: 'food-down', sol: 5, goal: 'food', topic: 'food', text: 'In orbit, plants have to be told which way is down.' },
  { id: 'life-recycle', sol: 5, goal: 'life-support', topic: 'water', text: 'The space station reuses 98% of its water. Recycle before you mine.' },

  { id: 'rad-minutes', sol: 6, goal: 'radiation', topic: 'radiation', text: "A flare's radiation arrives in minutes. Shelter, or pile on soil." },
  { id: 'power-nightcost', sol: 6, goal: 'power', topic: 'power', text: 'The night costs about 260 kWh. That is what has to be in the batteries.' },

  { id: 'dust-sleep', sol: 7, goal: 'dust-storm', topic: 'dust', text: 'A storm can cut the sunlight so low a rover has to sleep through it.' },
  { id: 'power-nuclear', sol: 7, goal: 'power', topic: 'power', text: 'A nuclear unit keeps working in the dark. That is why NASA rovers carry one.' },

  { id: 'water-phoenix', sol: 8, goal: 'life-support', topic: 'water', text: 'Phoenix found ice in the soil and watched it turn straight to vapour.' },
  { id: 'food-air', sol: 8, goal: 'food', topic: 'food', text: 'Plants in space clean the air as well as feed the crew.' },

  { id: 'rad-curiosity', sol: 9, goal: 'radiation', topic: 'radiation', text: "Curiosity measured radiation on Mars for years, to size a crew's shielding." },
  { id: 'life-ground', sol: 9, goal: 'life-support', topic: 'water', text: 'Your recycler makes most of your water. The rest comes from the ground.' },

  { id: 'dust-cling', sol: 10, goal: 'dust-storm', topic: 'dust', text: 'Martian dust is so fine it clings to everything, including the spacecraft.' },
  { id: 'food-crop', sol: 10, goal: 'food', topic: 'food', text: 'Every crop you grow is a crop you did not launch.' },

  { id: 'water-poles', sol: 11, goal: 'life-support', topic: 'water', text: 'Water ice has been found at both poles and under the dust at middle latitudes.' },
  { id: 'power-insight', sol: 11, goal: 'power', topic: 'power', text: 'InSight made about 100 watts with solar. A dim light bulb.' },

  { id: 'water-rivers', sol: 12, goal: 'life-support', topic: 'water', text: 'Mars has rivers today, not just ancient ones.' },
  { id: 'final-hold', sol: 12, goal: 'dust-storm', topic: 'missions', text: 'Everything you have built has to hold for one more sol.' },
];

/**
 * The orders on the board at the start of a sol.
 *
 * Two arrive on the sol itself; everything before it has been on the board
 * since it was posted. The player works to the whole set, which is what makes
 * the later sols harder: there is more to hold in mind, not a bigger number.
 */
export function ordersThrough(sol: number): readonly StandingOrder[] {
  return STANDING_ORDERS.filter((order) => order.sol <= sol);
}

/** The orders that arrive on this sol. */
export function ordersForSol(sol: number): readonly StandingOrder[] {
  return STANDING_ORDERS.filter((order) => order.sol === sol);
}

/** The order with this id, or null. */
export function orderById(id: string): StandingOrder | null {
  return STANDING_ORDERS.find((order) => order.id === id) ?? null;
}
