/**
 * The debrief: the end-of-run screen.
 *
 * - Survived all sols (won): shows the ending image with a congratulations
 *   message and options to go back to the main menu or choose another landing zone.
 * - Failed (lost): shows a black "mission failed" screen with options to go to
 *   the main menu or start again at the landing zone choice page.
 *
 * Owns the DOM only. All reasoning lives in ./model and src/sim/.
 */

import { h } from '../../dom/h';
import { newRun, type RunState } from '../../sim/run';
import { navigate } from '../../ui/router';
import { stopReading } from '../../ui/readAloud';
import { clearTrainingRecord } from '../../ui/training';
import { playSfx } from '../../ui/sfx';

import './debrief.css';

import endingUrl from '../../../Assets/images/end/ending.jpeg';

export function mountDebrief(
  mount: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  function toMainMenu(): void {
    navigate('naming');
  }

  function toLandingChoice(): void {
    clearTrainingRecord();
    setRun(newRun('', run?.astronautName ?? 'Astronaut'));
    navigate('landing-site');
  }

  function renderEmpty(): void {
    const menu = h('button', { class: 'debrief-end__btn debrief-end__btn--primary', type: 'button' }, 'Back to main menu');
    menu.addEventListener('click', toMainMenu);

    const start = h('button', { class: 'debrief-end__btn', type: 'button' }, 'Choose landing zone');
    start.addEventListener('click', toLandingChoice);

    mount.replaceChildren(
      h(
        'div',
        { class: 'debrief-end debrief-end--empty' },
        h('div', { class: 'debrief-end__card' }, h('h1', { class: 'debrief-end__title', text: 'Nothing to show yet' }), h('div', { class: 'debrief-end__actions' }, menu, start)),
      ),
    );
  }

  function renderWin(): void {
    const menu = h('button', { class: 'debrief-end__btn', type: 'button' }, 'Back to main menu');
    menu.addEventListener('click', toMainMenu);

    const other = h('button', { class: 'debrief-end__btn debrief-end__btn--primary', type: 'button' }, 'Choose other landing zone');
    other.addEventListener('click', toLandingChoice);

    mount.replaceChildren(
      h(
        'div',
        { class: 'debrief-end debrief-end--win' },
        h('img', { class: 'debrief-end__image', src: endingUrl, alt: 'Mission complete on Mars' }),
        h(
          'div',
          { class: 'debrief-end__overlay' },
          h('h1', { class: 'debrief-end__title', text: "Congratulations, you've survived and completed your missions successfully." }),
          h('div', { class: 'debrief-end__actions' }, menu, other),
        ),
      ),
    );
  }

  function renderLoss(): void {
    const menu = h('button', { class: 'debrief-end__btn', type: 'button' }, 'Go to main menu');
    menu.addEventListener('click', toMainMenu);

    const again = h('button', { class: 'debrief-end__btn debrief-end__btn--primary', type: 'button' }, 'Start again');
    again.addEventListener('click', toLandingChoice);

    mount.replaceChildren(
      h(
        'div',
        { class: 'debrief-end debrief-end--loss' },
        h(
          'div',
          { class: 'debrief-end__card' },
          h('h1', { class: 'debrief-end__title', text: 'Mission failed' }),
          h('div', { class: 'debrief-end__actions' }, menu, again),
        ),
      ),
    );
  }

  function render(): void {
    stopReading();

    if (run === null || run.log.length === 0) {
      renderEmpty();
      return;
    }

    if (run.status === 'won') {
      renderWin();
      return;
    }

    renderLoss();
  }

  render();

  return () => {
    mount.replaceChildren();
  };
}
