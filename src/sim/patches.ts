/**
 * The patches a run can earn.
 *
 * Papers Please gives the inspector a family to feed and a house to pay for,
 * and the reason to come back tomorrow is the ledger. Mars Horizon has the
 * science score for that, but a score is a number and a patch is a thing: the
 * debrief prints them as a set of stickers with the astronaut's name on them,
 * and a child wants all of them.
 *
 * Every patch is derived from what the run actually did. Nothing here is
 * awarded for something the log cannot show, and nothing here can be lost
 * afterwards.
 *
 * Pure. No DOM, no randomness: the same run earns the same patches.
 */

import { CREW_SIZE } from './modules';
import type { RunState } from './run';

/** One patch. */
export interface Patch {
  readonly id: string;
  readonly title: string;
  /** Why it was earned, in one line. */
  readonly detail: string;
}

/**
 * The patches a run has earned.
 *
 * The order is the order they were earned in, so the debrief can show the run
 * as a story rather than as a list.
 */
export function patchesFor(run: RunState): readonly Patch[] {
  const earned: Patch[] = [];
  const log = run.log;

  /* Every sol had an order worked on it. */
  const worked = log.filter((record) => record.activity !== null).length;

  if (worked >= log.length && log.length > 0) {
    earned.push({
      id: 'no-skip',
      title: 'No-Skip Astronaut',
      detail: `Worked every one of the ${log.length} sols.`,
    });
  }

  /* No sol ran in the dark. */
  const dark = log.filter((record) => record.blackout > 0.05).length;

  if (log.length > 0 && dark === 0) {
    earned.push({
      id: 'night-watch',
      title: 'Night Watch',
      detail: 'Never let the batteries run flat.',
    });
  }

  /* The rover was put to work. */
  if (run.rover.found.length >= 3) {
    earned.push({
      id: 'ice-hunter',
      title: 'Explorer',
      detail: `The rover brought back ${run.rover.found.length} finds.`,
    });
  }

  /* The crew logged where they had landed. */
  if (run.rover.visited.length >= 2) {
    earned.push({
      id: 'cartographer',
      title: 'Cartographer',
      detail: `Logged ${run.rover.visited.length} places from the past.`,
    });
  }

  /* They left a rock where it lay. */
  if (run.rover.left.length >= 1) {
    earned.push({
      id: 'leave-no-trace',
      title: 'Leave No Trace',
      detail: 'Left the rock where it was found.',
    });
  }

  /* The food never fell below half. */
  const foodLow = log.some((record) => record.stores.food < 50);

  if (log.length > 0 && !foodLow) {
    earned.push({
      id: 'green-thumb',
      title: 'Green Thumb',
      detail: 'The food never fell below half a tank.',
    });
  }

  /* The shielding held. */
  const shieldLow = log.some((record) => record.stores.shielding < 40);

  if (log.length > 0 && !shieldLow) {
    earned.push({
      id: 'iron-skin',
      title: 'Iron Skin',
      detail: 'The shielding never fell below 40.',
    });
  }

  /* The water held. */
  const waterLow = log.some((record) => record.stores.water < 50);

  if (log.length > 0 && !waterLow) {
    earned.push({
      id: 'full-tank',
      title: 'Full Tank',
      detail: 'The water never fell below half a tank.',
    });
  }

  /* Every flare was sheltered from. */
  const flares = log.filter((record) => record.events.some((event) => event.kind === 'flare')).length;
  const exposed = log.filter(
    (record) => record.events.some((event) => event.kind === 'flare') && record.stores.shielding < 40,
  ).length;

  if (flares > 0 && exposed === 0) {
    earned.push({
      id: 'flare-dodger',
      title: 'Flare Dodger',
      detail: `Sheltered from ${flares} solar ${flares === 1 ? 'flare' : 'flares'}.`,
    });
  }

  /* A full crew, kept alive, to the last sol. */
  if (log.length > 0 && run.status === 'won') {
    earned.push({
      id: 'full-crew',
      title: 'Full Crew',
      detail: `Kept all ${CREW_SIZE} of them alive to the last sol.`,
    });
  }

  return earned;
}

/** How many patches there are to earn, for the debrief's collection. */
export const PATCH_COUNT = 10;
