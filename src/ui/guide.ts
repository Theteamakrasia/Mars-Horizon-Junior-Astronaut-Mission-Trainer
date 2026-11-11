/**
 * The guide: a panel that explains the game, openable at any time.
 *
 * A child who has lost the thread needs a way back in, and a child meeting
 * the game for the first time needs the same thing before they start. So it
 * is a panel rather than a screen: it can be opened over the desk while the
 * desk is still there, and the words can point at the thing they describe.
 *
 * DOM only. The words live in `sim/guide.ts`, where they can be read and
 * tested without a browser.
 */

import { h } from '../dom/h';
import { GUIDE_STEPS, type GuideStep } from '../sim/guide';

/** Where each part of the screen is, so the guide can say it plainly. */
const WHERE_NAME: Readonly<Record<GuideStep['where'], string>> = {
  desk: 'On the desk',
  board: 'On the board',
  recap: 'In the review at the top',
  build: 'On the build screen',
  tool: 'Under an order',
};

/**
 * The guide panel, and a way to close it.
 *
 * The caller owns whether it is open, so the same panel can open by itself on
 * the first sol and be opened by the player afterwards.
 */
export function guidePanel(onClose: () => void): HTMLElement {
  const panel = h(
    'div',
    { class: 'gl__guide', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'How to play' },
    h(
      'div',
      { class: 'gl__guide-head' },
      h('h2', { class: 'gl__guide-title', text: 'How to play' }),
      h('button', { class: 'gl__guide-close', type: 'button', 'aria-label': 'Close the guide' }, '✕'),
    ),
    h(
      'ol',
      { class: 'gl__guide-steps' },
      ...GUIDE_STEPS.map((step) =>
        h(
          'li',
          { class: 'gl__guide-step' },
          h('p', { class: 'gl__guide-where', text: WHERE_NAME[step.where] }),
          h('p', { class: 'gl__guide-title-line', text: step.title }),
          h('p', { class: 'gl__guide-body', text: step.body }),
        ),
      ),
    ),
  );

  const close = panel.querySelector<HTMLButtonElement>('.gl__guide-close');

  close?.addEventListener('click', onClose);

  return panel;
}

/** The little button that opens the guide. */
export function guideButton(onOpen: () => void): HTMLButtonElement {
  const button = h('button', { class: 'gl__guide-button', type: 'button', 'aria-label': 'How to play' }, '?');

  button.addEventListener('click', onOpen);

  return button;
}
