/**
 * Rover Parking: the ground, and the rover driving over it.
 *
 * The maps and the shortest route are in `sim/trainingRover.ts`; this file
 * draws the ground and moves the rover. Bumping into a rock does not cost a
 * move — a child should be able to try a door without being punished for it.
 */

import { h } from '../dom/h';
import { icon } from './icons';
import {
  ROVER_MAPS,
  ROVER_STEPS,
  roverCell,
  roverMovesAllowed,
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
  const map = ROVER_MAPS[Math.floor(context.random() * ROVER_MAPS.length)] ?? (ROVER_MAPS[0] as readonly string[]);
  const route = roverRoute(map);
  const goal = roverCell(map, 'P') ?? [map.length - 1, map.length - 1];
  const start = roverCell(map, 'R') ?? [0, 0];

  let row = start[0];
  let column = start[1];
  let movesLeft = roverMovesAllowed(map);
  let finished = false;
  let over = false;

  const board = h('div', { class: 'trn__rover' });
  const hint = h('p', { class: 'trn__hint', text: 'Drive the rover to the outpost.' });

  const up = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive up' }, '▲');
  const left = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive left' }, '◀');
  const down = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive down' }, '▼');
  const right = h('button', { class: 'trn__pad-key', type: 'button', 'aria-label': 'Drive right' }, '▶');

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
        const cell = h('div', { class: `trn__ground${ground === '#' ? ' trn__ground--rock' : ''}${isRover && bumped ? ' trn__ground--bump' : ''}` });

        if (isRover) cell.append(icon('rover', 'The rover'));
        else if (ground === '#') cell.append(icon('rock', 'A rock'));
        else if (isOutpost) cell.append(icon('home', 'The outpost'));

        cells.push(cell);
      }
    }

    board.replaceChildren(...cells);
    context.setStatus(`Moves left: ${movesLeft}`);
  }

  function drive(direction: RoverDirection): void {
    if (finished || over) return;

    const [stepRow, stepColumn] = ROVER_STEPS[direction];
    const newRow = row + stepRow;
    const newColumn = column + stepColumn;
    const ground = map[newRow]?.[newColumn];

    if (ground === undefined || ground === '#') {
      hint.textContent = 'There is a rock in the way. Try another way.';
      paint(true);

      return;
    }

    row = newRow;
    column = newColumn;
    movesLeft -= 1;
    hint.textContent = 'Drive the rover to the outpost.';
    paint(false);

    if (row === goal[0] && column === goal[1]) {
      finished = true;
      hint.textContent = 'The rover is home!';

      window.setTimeout(() => context.onComplete(roverPerformance(movesLeft, route)), 400);

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
