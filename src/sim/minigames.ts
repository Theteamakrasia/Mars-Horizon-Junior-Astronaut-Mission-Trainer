/**
 * The six inspections.
 *
 * In Papers, Please the inspector reads a traveller's papers against the day's
 * rules and stamps them. The tools — the magnifier, the lamp, the scanner —
 * are not decoration: each one is a new way to see what a document is hiding,
 * and they unlock one at a time.
 *
 * These are the outpost's tools. Each order on the desk carries one, and
 * working it tells the player something about the order before they stamp it.
 * The stars are how well they did, and stars are the only thing they change:
 * an inspection is never worth a resource, because the balance of the run is
 * not the inspection's business.
 *
 * Pure. No DOM, no timers, no randomness: the player's input comes in as
 * plain data and a grade comes back, so every rule here can be asserted on
 * exactly.
 */

/** The six tools. */
export type EngineKind = 'sequence' | 'radar' | 'timing' | 'sort' | 'pack' | 'match';

/** How an inspection went. */
export interface Grade {
  /** 0 to 3 stars. */
  readonly stars: number;
  /** True when the player got it right. */
  readonly correct: boolean;
  /** One line the player reads. */
  readonly message: string;
}

/** The tools, in the order they unlock. */
export const ENGINE_ORDER: readonly EngineKind[] = ['sequence', 'timing', 'radar', 'sort', 'match', 'pack'];

/**
 * The sol each tool becomes available on.
 *
 * One new tool a sol for the first six sols, and then the whole toolbox.
 *
 * The spacing used to be every second sol, which was slower and looked
 * tidier - and left sol 3 with nothing to work at all. The sol plan is a
 * curriculum and the two had drifted apart: sol 3 offered the rover
 * survey, the site map and the experiment, and their tools (radar, sort,
 * pack) were all still locked. A sol where the player cannot work
 * anything is a sol where the desk is just three buttons.
 *
 * So the rule is now the one that matters: **every sol has at least one
 * order the player can work.** The unlock order is a floor of one a sol
 * and the test in `minigames.test.ts` says so over the whole plan.
 */
export const ENGINE_UNLOCK_SOL: Readonly<Record<EngineKind, number>> = {
  sequence: 1,
  timing: 2,
  radar: 3,
  sort: 4,
  match: 5,
  pack: 6,
};

/** True when the tool is available on this sol. */
export function engineUnlocked(engine: EngineKind, sol: number): boolean {
  return sol >= ENGINE_UNLOCK_SOL[engine];
}

/** How many stars three means, and the name of the tool. */
export const ENGINE_NAME: Readonly<Record<EngineKind, string>> = {
  sequence: 'Checklist',
  radar: 'Radar',
  timing: 'Timing',
  sort: 'Sorting',
  match: 'Matching',
  pack: 'Packing',
};

/**
 * The checklist: press the steps in the right order.
 *
 * The rover's own start-up, or an airlock procedure. Getting the order right
 * matters; a slip is a slip, not a disaster.
 */
export function gradeSequence(pressed: readonly string[], target: readonly string[]): Grade {
  const right = pressed.length === target.length && pressed.every((step, index) => step === target[index]);
  /* How many of the pressed steps belong to the sequence at all. */
  const steps = pressed.filter((step) => target.includes(step)).length;
  /* And whether they were pressed in the right order: a subset of the target,
     in the target's order, is the right order with steps left out. */
  let cursor = 0;
  let inOrder = true;

  for (const step of pressed) {
    const at = target.indexOf(step, cursor);

    if (at < 0) {
      inOrder = false;
      break;
    }

    cursor = at + 1;
  }

  if (right) return { stars: 3, correct: true, message: 'Right order, every time.' };
  if (inOrder && steps === target.length - 1) return { stars: 2, correct: false, message: 'Right order, but one step left out.' };
  if (steps > 0) return { stars: 1, correct: false, message: 'Some of it was right.' };

  return { stars: 0, correct: false, message: 'That is not the order it happens in.' };
}

/**
 * The radar: ping squares until the reading is hot.
 *
 * Every ping says whether it is warmer or colder than the last, so the player
 * is narrowing it down rather than guessing. Finding it fast is worth more.
 */
export function gradeRadar(pings: readonly number[], target: number): Grade {
  const found = pings.indexOf(target);

  if (found < 0) return { stars: 0, correct: false, message: 'You never found it.' };
  if (found === 0) return { stars: 3, correct: true, message: 'First ping. Too good.' };
  if (found <= 2) return { stars: 2, correct: true, message: 'Found it.' };

  return { stars: 1, correct: true, message: 'Found it, eventually.' };
}

/**
 * The timing: stop the marker in the safe band.
 *
 * The band is the safe zone. Dead centre is worth the most; just outside it
 * is worth something; a long way off is worth nothing.
 */
export function gradeTiming(stop: number, zoneStart: number, zoneEnd: number): Grade {
  const centre = (zoneStart + zoneEnd) / 2;
  const spread = Math.max(0.0001, (zoneEnd - zoneStart) / 2);

  if (stop >= zoneStart && stop <= zoneEnd) {
    return Math.abs(stop - centre) <= spread / 2
      ? { stars: 3, correct: true, message: 'Right in the safe band.' }
      : { stars: 2, correct: true, message: 'In the band, just.' };
  }

  if (Math.abs(stop - centre) <= spread * 2) {
    return { stars: 1, correct: false, message: 'Just outside the band.' };
  }

  return { stars: 0, correct: false, message: 'A long way off.' };
}

/**
 * The sorting: put the good ones in the good pile.
 *
 * Getting the good ones right is worth more than getting the bad ones
 * right, because the good ones are what the crew needs.
 */
export function gradeSort(chosen: readonly string[], good: readonly string[]): Grade {
  const right = chosen.filter((id) => good.includes(id)).length;
  const wrong = chosen.filter((id) => !good.includes(id)).length;

  if (wrong === 0 && right === good.length) return { stars: 3, correct: true, message: 'All of them, and no mistakes.' };
  if (wrong === 0) return { stars: 2, correct: false, message: 'You kept the good ones.' };
  if (right > 0) return { stars: 1, correct: false, message: 'Some of them were right.' };

  return { stars: 0, correct: false, message: 'None of those were the good ones.' };
}

/** One thing that can be packed. */
export interface PackItem {
  readonly id: string;
  /** What it is called on the list. */
  readonly label: string;
  /** How heavy it is. */
  readonly mass: number;
  /** How much it is worth. */
  readonly value: number;
}

/**
 * The best value that can actually go in the pod.
 *
 * Not the value of everything on the list: some of it is too heavy, and a
 * player who did the best they could should not be told they did badly.
 */
function bestPackable(items: readonly PackItem[], budget: number): number {
  let best = 0;

  for (let mask = 0; mask < 1 << items.length; mask += 1) {
    let mass = 0;
    let value = 0;

    for (let index = 0; index < items.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;

      const item = items[index];

      if (item === undefined) continue;

      mass += item.mass;
      value += item.value;
    }

    if (mass <= budget && value > best) best = value;
  }

  return best;
}

/**
 * The packing: choose what fits in the pod.
 *
 * The score is how much value got in, and anything over the mass limit is
 * worth nothing at all: a pod that will not launch is not a good idea.
 */
export function gradePack(chosen: readonly string[], items: readonly PackItem[], budget: number): Grade {
  const mass = chosen.reduce((sum, id) => sum + (items.find((item) => item.id === id)?.mass ?? 0), 0);
  const value = chosen.reduce((sum, id) => sum + (items.find((item) => item.id === id)?.value ?? 0), 0);

  if (mass > budget) return { stars: 0, correct: false, message: 'Too heavy. It will not launch.' };

  const best = bestPackable(items, budget);
  const ratio = best === 0 ? 0 : value / best;

  if (ratio >= 0.95) return { stars: 3, correct: true, message: 'The best pod you could build, and it will launch.' };
  if (ratio >= 0.6) return { stars: 2, correct: false, message: 'A decent pod, with room to spare.' };
  if (value > 0) return { stars: 1, correct: false, message: 'A light pod.' };

  return { stars: 0, correct: false, message: 'You brought nothing.' };
}

/**
 * The matching: pair each thing with its job.
 *
 * Every pair right is worth more than a pair wrong, so a half-finished job
 * still scores something.
 */
export function gradeMatch(pairs: readonly (readonly [string, string])[], answers: Readonly<Record<string, string>>): Grade {
  const right = pairs.filter(([left, right]) => answers[left] === right).length;

  if (right === pairs.length && pairs.length > 0) return { stars: 3, correct: true, message: 'Every one of them.' };
  if (right === pairs.length - 1) return { stars: 2, correct: false, message: 'All but one.' };
  if (right > 0) return { stars: 1, correct: false, message: 'Some of them were right.' };

  return { stars: 0, correct: false, message: 'Not one of them.' };
}
