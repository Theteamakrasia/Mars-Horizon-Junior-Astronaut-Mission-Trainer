/**
 * The contract every training game keeps.
 *
 * A training game is a small thing that draws itself into an element and
 * tells the screen when it is finished. It never awards anything: it says
 * how well it went, and `sim/training.ts` decides what that is worth and
 * whether it is paid for at all.
 *
 * The three things a game is given:
 *
 *  - `setStatus`, for the line under the title: moves left, tries, seconds;
 *  - `onComplete`, called once, when the player has really finished;
 *  - `random`, the game's own generator, so a sol always deals the same cards.
 *
 * And the one thing it gives back: `destroy`, which stops every timer and
 * listener it started. A game that leaves a timer running keeps the game
 * alive after the player has gone, and the screen it was on is gone.
 */

import type { TrainingPerformance } from '../sim/training';

/** What a training game is given. */
export interface TrainingGameContext {
  /** The line under the title: moves left, tries, seconds. */
  readonly setStatus: (text: string) => void;
  /** Called once, when the player has finished the game. */
  readonly onComplete: (performance: TrainingPerformance) => void;
  /** The game's own generator, seeded from the sol. */
  readonly random: () => number;
}

/** What a training game gives back. */
export interface TrainingGameHandle {
  /** Stop every timer and listener the game started. */
  readonly destroy: () => void;
}

/** How a training game is mounted into an element. */
export type TrainingGameMount = (root: HTMLElement, context: TrainingGameContext) => TrainingGameHandle;
