/**
 * The guide: a popup that explains the game, opened from the `?` button.
 *
 * A child who has lost the thread needs a way back in, and a child meeting the
 * game for the first time needs the same thing before they start. So the guide
 * is a dialog over the screen, not a screen of its own: the place it explains
 * stays behind it, and closing it puts the player back exactly where they were.
 *
 * The astronaut does the talking. Each step is one page of a speech bubble, so
 * a page is short enough to read at seven, and the Next button is the only
 * thing a child has to find. The words themselves live in `sim/guide.ts` where
 * they can be read and tested without a browser.
 *
 * DOM only. The caller owns whether it is open, so the same popup can open by
 * itself on the build screen and be opened by the player afterwards.
 */

import astronautUrl from '../../Assets/images/guide/astronaut.png';
import { h } from '../dom/h';
import { GUIDE_STEPS, type GuideStep } from '../sim/guide';
import { icon } from './icons';
import { readButton } from './readButton';
import { stopReading } from './readAloud';

import './guide.css';

/** Where each part of the screen is, so the guide can say it plainly. */
const WHERE_NAME: Readonly<Record<GuideStep['where'], string>> = {
  desk: 'On the desk',
  board: 'On the board',
  recap: 'In the review at the top',
  build: 'On the build screen',
  tool: 'Under an order',
};

/** A unique id per mounted popup, so two dialogs cannot share a label. */
let NEXT_ID = 0;

/** The step at `index`, clamped into the list. */
function stepAt(index: number): GuideStep {
  const last = GUIDE_STEPS.length - 1;

  return GUIDE_STEPS[Math.max(0, Math.min(index, last))] as GuideStep;
}

/** The focusable controls in the bubble, in document order. */
function focusable(card: HTMLElement): readonly HTMLElement[] {
  return [
    ...card.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => !node.hasAttribute('disabled') && !node.hidden);
}

/**
 * Build the how-to-play popup.
 *
 * Returns the backdrop, which is what the caller mounts. The astronaut stands
 * on the left and the bubble on the right, as one stage, so the tail points at
 * the person doing the talking. The caller owns `onClose`; focus returns to the
 * `?` button once the screen has redrawn without the popup.
 */
export function guidePanel(onClose: () => void): HTMLElement {
  const titleId = `guide-title-${(NEXT_ID += 1)}`;
  let page = 0;
  let closed = false;

  const kicker = h('p', { class: 'guide__where' });
  const title = h('h2', { class: 'guide__heading', id: titleId });
  const body = h('p', { class: 'guide__text' });
  const count = h('p', { class: 'guide__count' });
  const dots = h('div', { class: 'guide__dots', 'aria-hidden': 'true' });

  const content = h(
    'div',
    { class: 'guide__page', 'aria-live': 'polite', 'aria-atomic': 'true' },
    kicker,
    title,
    body,
  );

  const tools = h('div', { class: 'guide__tools' });
  const progress = h('div', { class: 'guide__progress' }, dots, count);

  const back = h('button', { class: 'guide__back', type: 'button' }, 'Back');
  const next = h('button', { class: 'guide__next', type: 'button' });
  const close = h(
    'button',
    { class: 'guide__close', type: 'button', 'aria-label': 'Close how to play' },
    icon('close'),
  );

  const bubble = h(
    'div',
    { class: 'guide__bubble', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'guide__pill' },
      h('span', { class: 'guide__pill-icon', 'aria-hidden': 'true' }, icon('bulb')),
      'How to play',
    ),
    close,
    content,
    h('footer', { class: 'guide__foot' }, tools, progress, h('nav', { class: 'guide__nav', 'aria-label': 'Guide pages' }, back, next)),
  );

  const stage = h(
    'div',
    { class: 'guide__stage' },
    h(
      'div',
      { class: 'guide__astro-wrap', 'aria-hidden': 'true' },
      h('span', { class: 'guide__glow' }),
      h('img', { class: 'guide__astro', src: astronautUrl, alt: '', draggable: 'false' }),
    ),
    bubble,
  );

  const backdrop = h('div', { class: 'guide__backdrop' }, stage);

  /** Say which page this is, and show what it says. */
  function paint(direction: number): void {
    const step = stepAt(page);
    const last = page === GUIDE_STEPS.length - 1;

    kicker.textContent = WHERE_NAME[step.where];
    title.textContent = step.title;
    body.textContent = step.body;
    count.textContent = `${page + 1} of ${GUIDE_STEPS.length}`;
    back.disabled = page === 0;

    next.replaceChildren(last ? 'Got it!' : 'Next', icon(last ? 'check' : 'chevron'));

    dots.replaceChildren(
      ...GUIDE_STEPS.map((_, index) =>
        h('span', {
          class:
            index === page
              ? 'guide__dot guide__dot--active'
              : index < page
                ? 'guide__dot guide__dot--done'
                : 'guide__dot',
        }),
      ),
    );

    /* A page changed: stop the old page being read, and give the new page a
       fresh button so it starts from "Read aloud" rather than "Stop". */
    stopReading();
    const read = readButton(() => `${step.title}. ${step.body}`, {
      className: 'guide__read',
      idleLabel: 'Read aloud',
      stopLabel: 'Stop',
      ariaLabel: 'Read this page aloud',
    });

    tools.replaceChildren();

    if (read !== null) tools.append(read);

    /* Restart the page entrance when the page changes, and make it slide in
       from the side the player moved towards. */
    content.style.setProperty('--guide-from', direction < 0 ? '-16px' : '16px');
    content.classList.remove('guide__page--in');
    void content.offsetWidth;
    content.classList.add('guide__page--in');
  }

  /** Move by one page, staying inside the list. */
  function go(direction: number): void {
    const wanted = page + direction;

    if (wanted < 0 || wanted >= GUIDE_STEPS.length) return;

    page = wanted;
    paint(direction);
  }

  /** Close once: stop the voice, let the screen redraw, then return focus. */
  function shut(): void {
    if (closed) return;

    closed = true;
    stopReading();
    onClose();

    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('.gl__icon-button[aria-label="How to play"]')
        ?.focus();
    });
  }

  next.addEventListener('click', () => {
    if (page === GUIDE_STEPS.length - 1) shut();
    else go(1);
  });

  back.addEventListener('click', () => go(-1));
  close.addEventListener('click', shut);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) shut();
  });

  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      shut();

      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);

      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);

      return;
    }

    if (event.key !== 'Tab') return;

    /* The popup is modal, so Tab wraps inside the bubble rather than reaching
       the build controls behind the dimmed backdrop. */
    const stops = focusable(bubble);

    if (stops.length === 0) return;

    const first = stops[0] as HTMLElement;
    const last = stops[stops.length - 1] as HTMLElement;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  paint(1);

  /* The popup is appended after this returns, so focus it on the next frame.
     Focusing Next puts the child on the one control that moves the story on. */
  window.requestAnimationFrame(() => {
    if (backdrop.isConnected) next.focus();
  });

  return backdrop;
}

/** The little button that opens the guide, drawn in the header beside Menu. */
export function guideButton(onOpen: () => void): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'gl__icon-button', type: 'button', 'aria-label': 'How to play', title: 'How to play' },
    icon('question'),
  );

  button.addEventListener('click', onOpen);

  return button;
}
