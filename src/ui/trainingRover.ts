/**
 * Rover Parking: the ground, and the rover driving over it.
 *
 * The maps and the shortest route are in `sim/trainingRover.ts`; this file
 * draws the ground and moves the rover. Bumping into a rock does not cost a
 * move — a child should be able to try a door without being punished for it.
 */

import { h } from '../dom/h';
import { icon } from './icons';
import { playSfx } from './sfx';
import {
  ROVER_MAPS,
  ROVER_STEPS,
  roverCell,
  roverDeliveryRoute,
  roverDifficulty,
  roverPerformance,
  roverRoute,
  type RoverDirection,
} from '../sim/trainingRover';
import type { TrainingGameMount } from './trainingGame';

/**
 * The ground.
 *
 * Six by six of Martian dust, with rocks on it. The rover starts in one
 * corner and the outpost is in the other, and the player has a few moves more
 * than the shortest way there.
 */
export const mountRover: TrainingGameMount = (root, context) => {
  /* How hard this round is: which piece of ground, whether a sample has to be
     brought home as well, and how many moves there are over the shortest
     route. */
  const difficulty = roverDifficulty(context.level);
  const map = ROVER_MAPS[difficulty.map] ?? (ROVER_MAPS[0] as readonly string[]);
  /* The move budget is built from the journey the player has to make: to the
     outpost, or to the sample and then to the outpost. */
  const route = difficulty.deliver ? roverDeliveryRoute(map) : roverRoute(map);
  const goal = roverCell(map, 'P') ?? [map.length - 1, map.length - 1];
  const start = roverCell(map, 'R') ?? [0, 0];
  const sample = roverCell(map, 'S');

  let row = start[0];
  let column = start[1];
  let carrying = false;
  let movesLeft = route <= 0 ? 0 : route + difficulty.spare;
  let finished = false;
  let over = false;

  const board = h('div', { class: 'trn__rover' });
  const hint = h('p', {
    class: 'trn__hint',
    text: difficulty.deliver
      ? 'Pick up the sample and bring it to the outpost.'
      : 'Drive the rover to the outpost.',
  });

  const up = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive up', 'data-sfx-hover': 'off' }, '▲');
  const left = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive left', 'data-sfx-hover': 'off' }, '◀');
  const down = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive down', 'data-sfx-hover': 'off' }, '▼');
  const right = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive right', 'data-sfx-hover': 'off' }, '▶');

  up.addEventListener('click', () => drive('up'));
  left.addEventListener('click', () => drive('left'));
  down.addEventListener('click', () => drive('down'));
  right.addEventListener('click', () => drive('right'));

  const pad = h('div', { class: 'trn__pad' }, up, h('div', { class: 'trn__pad-row' }, left, down, right));

  root.append(board, hint, pad);

  function paint(bumped: boolean): void {
    const cells: HTMLElement[] = [];

    for (let line = 0; line < map.length; line += 1) {
      for (let place = 0; place < (map[line]?.length ?? 0); place += 1) {
        const ground = map[line]?.[place] ?? '.';
        const isRover = line === row && place === column;
        const isOutpost = line === goal[0] && place === goal[1];
        /* The sample is only on the ground while it is on the ground. Once the
           rover has it, the cell is empty - and the cell keeps to one picture,
           because a grid column is as wide as the widest thing in it and a
           second picture made the whole board grow (ISS-086). */
        const isSample = sample !== null && !carrying && line === sample[0] && place === sample[1];
        const cell = h('div', { class: `trn__ground${ground === '#' ? ' trn__ground--rock' : ''}${isRover && bumped ? ' trn__ground--bump' : ''}` });

        if (isRover) cell.append(icon('rover', 'The rover'));
        else if (ground === '#') cell.append(icon('rock', 'A rock'));
        else if (isSample) cell.append(icon('box', 'A sample to bring home'));
        else if (isOutpost) cell.append(icon('home', 'The outpost'));

        cells.push(cell);
      }
    }

    board.replaceChildren(...cells);
    context.setStatus(`Moves left: ${movesLeft}${carrying ? ' · Carrying the sample' : ''}`);
  }

  function drive(direction: RoverDirection): void {
    if (finished || over) return;

    const [stepRow, stepColumn] = ROVER_STEPS[direction];
    const newRow = row + stepRow;
    const newColumn = column + stepColumn;
    const ground = map[newRow]?.[newColumn];

    if (ground === undefined || ground === '#') {
      playSfx('rover-bump');
      hint.textContent = 'There is a rock in the way. Try another way.';
      paint(true);

      return;
    }

    row = newRow;
    column = newColumn;
    movesLeft -= 1;

    /* Driving over the sample picks it up. */
    if (sample !== null && row === sample[0] && column === sample[1] && !carrying) {
      carrying = true;
      hint.textContent = 'The sample is on board. Bring it to the outpost.';
      paint(false);

      return;
    }

    hint.textContent = difficulty.deliver
      ? 'Pick up the sample and bring it to the outpost.'
      : 'Drive the rover to the outpost.';
    paint(false);

    if (row === goal[0] && column === goal[1]) {
      /* The outpost without the sample is not home yet. */
      if (difficulty.deliver && !carrying) {
        hint.textContent = 'You are at the outpost, but the sample is still out there.';

        return;
      }

      finished = true;
      hint.textContent = carrying ? 'The rover is home, with the sample!' : 'The rover is home!';

      window.setTimeout(() => context.onComplete(roverPerformance(movesLeft, route, difficulty)), 400);

      return;
    }

    if (movesLeft <= 0) {
      over = true;
      hint.textContent = 'Out of moves. Press Restart to try again.';
    }
  }

  const KEYS: Readonly<Record<string, RoverDirection>> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
  };

  const onKey = (event: KeyboardEvent): void => {
    const direction = KEYS[event.key];

    if (direction === undefined) return;

    event.preventDefault();
    if (event.isTrusted && !event.repeat) playSfx('ui-click');
    drive(direction);
  };

  document.addEventListener('keydown', onKey);
  paint(false);

  return {
    destroy(): void {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
    },
  };
};
