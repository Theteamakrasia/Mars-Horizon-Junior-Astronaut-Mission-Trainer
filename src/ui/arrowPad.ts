/**
 * The on-screen arrow pad.
 *
 * One training game - the rover one - is played with the arrow keys and
 * nothing else, so on a phone it cannot be played at all. This is the pad
 * that stands in for the keyboard.
 *
 * It sends real key events rather than calling the game's own move function,
 * so the game does not know or care whether it was played with a keyboard or
 * with a thumb: the pad *is* a keyboard, made of buttons.
 */

import { h } from '../dom/h';

import './arrow-pad.css';

/** The keys the pad draws, and where each one sits in the grid. */
const KEYS = [
  { key: 'ArrowUp', glyph: '▲', place: 'up' },
  { key: 'ArrowLeft', glyph: '◀', place: 'left' },
  { key: 'ArrowRight', glyph: '▶', place: 'right' },
  { key: 'ArrowDown', glyph: '▼', place: 'down' },
] as const;

/** The pad on the screen. */
export interface ArrowPad {
  /** The element it lives in. */
  readonly element: HTMLElement;
  /** Take it off the screen. */
  destroy(): void;
}

/**
 * True when this device has no keyboard to speak of.
 *
 * A phone is a coarse pointer, and the phone shell marks the page it draws
 * the game in, so either one of those says "this is a thumb".
 */
export function isThumbDevice(): boolean {
  return (
    document.documentElement.classList.contains('is-frame') ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * The pad, mounted into `root`.
 *
 * The buttons are half transparent so the game behind them stays readable,
 * and they take the press themselves so the page cannot scroll under a
 * finger that lands on one.
 */
export function mountArrowPad(root: HTMLElement): ArrowPad {
  const pad = h('div', { class: 'pad', role: 'group', 'aria-label': 'Arrow keys' });

  const press = (key: string): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  const release = (key: string): void => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  };

  for (const { key, glyph, place } of KEYS) {
    const button = h(
      'button',
      { class: `pad__btn pad__btn--${place}`, type: 'button', 'aria-label': key, 'data-sfx-hover': 'off' },
      glyph,
    );

    button.addEventListener('pointerdown', (event) => {
      /* The pad owns the touch: no scroll, no double-tap zoom, no text
         selection. The press is the game move. */
      event.preventDefault();
      press(key);
    });

    button.addEventListener('pointerup', () => release(key));
    button.addEventListener('pointercancel', () => release(key));
    button.addEventListener('pointerleave', () => release(key));

    pad.append(button);
  }

  root.append(pad);

  return {
    element: pad,
    destroy(): void {
      pad.remove();
    },
  };
}
