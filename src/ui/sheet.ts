/**
 * A sheet: one section of a screen, opened over the screen.
 *
 * The act desk is a hub of small buttons, and each button opens one of these.
 * It is a dialog rather than a new screen because the thing it explains is
 * still behind it: closing the sheet puts the player back where they were,
 * with the day still waiting.
 *
 * It is in `ui/` because the pattern is not about the desk: any screen with
 * more detail than fits can open a sheet over itself (R-5 — a feature may not
 * import another feature, and `ui/` is where shared chrome lives).
 *
 * Three things are handled here so every sheet gets them: the backdrop and the
 * close control, `Escape`, and a focus trap. The caller owns *what* is in the
 * sheet and what closing it means.
 */

import { h } from '../dom/h';
import { icon, type IconName } from './icons';
import { playSfx } from './sfx';

import './sheet.css';

/** Everything a sheet needs. */
export interface SheetOptions {
  /** The pictogram in the header bar. */
  readonly icon: IconName;
  /** A small line above the title, e.g. which sol this belongs to. */
  readonly kicker?: string;
  readonly title: string;
  readonly body: readonly (Node | null | false)[];
  /** Extra controls under the body, before the closing button. */
  readonly footer?: readonly (Node | null | false)[];
  /** The label on the button that closes it. Defaults to "Got it". */
  readonly doneLabel?: string;
  /**
   * Which rung of the stacking ladder this sheet sits on.
   *
   * `section` is the ordinary one, over the panel. `tool` is a sheet opened
   * **over** a section sheet — the mini game over the sheet it came from — so
   * it needs to be above it, and the order is written down rather than left to
   * the order the two happen to be mounted in.
   */
  readonly layer?: 'section' | 'tool';
  /** Called for the close button, the backdrop, `Escape` and the done button. */
  readonly onClose: () => void;
}

let NEXT_ID = 0;

/** The focusable controls in a sheet, in document order. */
function focusable(card: HTMLElement): readonly HTMLElement[] {
  return [...card.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (node) => !node.hasAttribute('disabled'),
  );
}

/**
 * Build a sheet.
 *
 * The returned element is the backdrop, which is what the caller mounts: the
 * card inside it is centred and the backdrop is the click target. The caller
 * decides where it goes and focuses the close button once it is in the
 * document.
 */
export function sheet(options: SheetOptions): HTMLElement {
  const titleId = `sheet-title-${(NEXT_ID += 1)}`;
  const layer = options.layer ?? 'section';

  const close = h('button', { class: 'sheet__close', type: 'button', 'aria-label': 'Close' }, icon('close'));

  const done = h('button', { class: 'gl__btn gl__btn--primary sheet__done', type: 'button' }, options.doneLabel ?? 'Got it');

  const body = h('div', { class: 'sheet__body' }, ...options.body);

  const card = h(
    'div',
    { class: 'sheet__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h(
      'header',
      { class: 'sheet__head' },
      h('span', { class: 'sheet__mark', 'aria-hidden': 'true' }, icon(options.icon)),
      h(
        'div',
        { class: 'sheet__heading' },
        options.kicker === undefined ? null : h('p', { class: 'sheet__kicker', text: options.kicker }),
        h('h2', { class: 'sheet__title', id: titleId, text: options.title }),
      ),
      close,
    ),
    body,
    h('footer', { class: 'sheet__foot' }, ...(options.footer ?? []), done),
  );

  const backdrop = h('div', { class: `sheet__backdrop sheet__backdrop--${layer}` }, card);

  const shut = (): void => {
    playSfx('ui-close-sheet');
    options.onClose();
  };

  close.addEventListener('click', shut);
  done.addEventListener('click', shut);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) shut();
  });

  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      shut();

      return;
    }

    if (event.key !== 'Tab') return;

    /* One wrap in each direction: the head's close button and the footer's
       done button are the ends of the sheet's tab order. */
    const stops = focusable(card);

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

  playSfx('ui-open-sheet');

  return backdrop;
}

/** The close button of a mounted sheet, for the caller to focus after mounting. */
export function sheetCloseButton(mounted: HTMLElement): HTMLElement | null {
  return mounted.querySelector<HTMLElement>('.sheet__close');
}
