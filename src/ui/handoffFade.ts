/**
 * The black curtain that lifts when one screen hands over to the next.
 *
 * A cut from black to a screen is a jump; a lift is a fade. The cinematic
 * ends on black and the outpost arrives behind this curtain, so the two
 * screens meet instead of colliding.
 *
 * It lives on `document.body` rather than inside a screen, for the reason the
 * guide and the setup window live there too: the screen it covers is replaced
 * while the curtain is up, and a curtain inside that screen would be rebuilt
 * with it.
 *
 * The curtain is decoration and nothing is under it: it is marked
 * `aria-hidden`, and it does not take the pointer, so a click meant for the
 * screen underneath lands on the screen underneath.
 */

import { h } from '../dom/h';

import './handoff-fade.css';

/** How long the curtain takes to lift, in ms. */
export const HANDOFF_FADE_MS = 600;

/**
 * How long the curtain stays up before it starts to lift, in ms.
 *
 * Long enough for the next screen to be mounted and its first frame painted,
 * so the lift reveals the new screen rather than the old one.
 */
export const HANDOFF_HOLD_MS = 120;

/**
 * Put the curtain up and lift it again.
 *
 * Call it just before navigating: the curtain covers the cut, and it is gone
 * again a moment later.
 */
export function playHandoffFade(): void {
  const curtain = h('div', { class: 'handoff-fade', 'aria-hidden': 'true' });

  document.body.append(curtain);

  window.setTimeout(() => {
    curtain.classList.add('is-lifting');
  }, HANDOFF_HOLD_MS);

  window.setTimeout(() => {
    curtain.remove();
  }, HANDOFF_HOLD_MS + HANDOFF_FADE_MS + 60);
}
