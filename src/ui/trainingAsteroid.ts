/**
 * Asteroid Defender: the dark outside the outpost, and what drifts past it.
 *
 * The timing is in `sim/trainingAsteroid.ts`; this file draws the arena and
 * counts what the player cleared, what they missed, and what they should
 * have left alone.
 */

import { h } from '../dom/h';
import { icon } from './icons';
import {
  ASTEROID_GOAL,
  ASTEROID_SECONDS,
  asteroidAccuracy,
  asteroidDelay,
  asteroidIsDecoy,
  asteroidLife,
  asteroidPerformance,
} from '../sim/trainingAsteroid';
import type { TrainingGameMount } from './trainingGame';

/**
 * The arena.
 *
 * Rocks drift in and the player taps them. Some of what drifts past is a
 * friendly satellite of the relay, and tapping that is a mistake. The round
 * is won by clearing twelve rocks before the clock runs out.
 */
export const mountAsteroid: TrainingGameMount = (root, context) => {
  let cleared = 0;
  let mistakes = 0;
  let missed = 0;
  let timeLeft = ASTEROID_SECONDS;
  let finished = false;
  let over = false;

  const timers = new Set<number>();

  const arena = h('div', { class: 'trn__arena' });
  const hint = h('p', { class: 'trn__hint', text: 'Tap the rocks. Leave the satellites alone!' });

  root.append(arena, hint);

  const later = (fn: () => void, ms: number): void => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);

    timers.add(timer);
  };

  function status(): void {
    context.setStatus(`Cleared: ${cleared}/${ASTEROID_GOAL} · Time: ${timeLeft}s`);
  }

  function spawn(): void {
    if (finished || over) return;

    const elapsed = ASTEROID_SECONDS - timeLeft;
    const decoy = asteroidIsDecoy(context.random);
    const node = h(
      'button',
      {
        class: `trn__target${decoy ? ' trn__target--friendly' : ''}`,
        type: 'button',
        'aria-label': decoy ? 'A friendly satellite' : 'An asteroid',
        style: `left:${8 + context.random() * 78}%;top:${10 + context.random() * 70}%`,
      },
      icon(decoy ? 'dish' : 'rock', decoy ? 'A friendly satellite' : 'An asteroid'),
    );

    let gone = false;

    node.addEventListener('click', (event) => {
      event.preventDefault();

      if (gone || finished || over) return;

      gone = true;

      if (decoy) {
        mistakes += 1;
        hint.textContent = 'That one was friendly. Leave it alone!';
      } else {
        cleared += 1;
        node.classList.add('trn__target--cleared');
        status();
      }

      later(() => node.remove(), 150);

      if (cleared >= ASTEROID_GOAL && !finished) {
        finished = true;
        hint.textContent = 'The colony is safe!';

        const accuracy = asteroidAccuracy(cleared, mistakes, missed);

        later(() => context.onComplete(asteroidPerformance(accuracy)), 500);
      }
    });

    arena.append(node);

    later(() => {
      if (gone) return;

      gone = true;

      if (!decoy) missed += 1;

      node.remove();
    }, asteroidLife(elapsed));

    later(spawn, asteroidDelay(elapsed));
  }

  const clock = window.setInterval(() => {
    if (finished || over) return;

    timeLeft -= 1;
    status();

    if (timeLeft <= 0) {
      over = true;
      arena.replaceChildren();
      hint.textContent = 'Time is up. Press Restart to try again.';
    }
  }, 1000);

  status();
  later(spawn, 400);

  return {
    destroy(): void {
      window.clearInterval(clock);
      timers.forEach((timer) => window.clearTimeout(timer));
      root.replaceChildren();
    },
  };
};
