/**
 * The speaker control: a button that mutes and unmutes the game.
 *
 * Kept in `ui/` because two different screens draw it — the game-loop header
 * and the main menu — and neither can own a control the other needs without
 * breaking R-5. It does not decide what the mute *means*; that is `sfx.ts`.
 * This is only the picture and the label.
 *
 * The button is always drawn. A browser that cannot play sound is still a
 * browser whose mute state can be changed, and a control that disappears on
 * some machines is a control nobody can learn to find.
 */

import { h } from '../dom/h';
import { isSfxMuted, onSfxChange, toggleSfx } from './sfx';

/** The speaker's face, drawn in ink so it follows the current text colour. */
function glyph(muted: boolean): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('sfx-toggle__icon');

  const horn = document.createElementNS(ns, 'path');

  horn.setAttribute('d', 'M4 9.5v5h3.5L12 19V5l-4.5 4.5z');
  horn.setAttribute('fill', 'currentColor');
  horn.setAttribute('stroke', 'none');
  svg.append(horn);

  if (muted) {
    const cross = document.createElementNS(ns, 'path');

    cross.setAttribute('d', 'M15.5 9l5 6M20.5 9l-5 6');
    svg.append(cross);
  } else {
    const waves = document.createElementNS(ns, 'path');

    waves.setAttribute('d', 'M15 9.5a3.5 3.5 0 010 5M17.5 7a7 7 0 010 10');
    svg.append(waves);
  }

  return svg;
}

function describe(muted: boolean): string {
  return muted ? 'Sound off. Press M to turn it on.' : 'Sound on. Press M to turn it off.';
}

/**
 * The speaker button.
 *
 * `extraClass` lets the two places it lives share the behaviour without
 * sharing the shape: the header gives it the round icon-button look, the menu
 * gives it its own pill.
 */
export function soundButton(extraClass?: string): HTMLButtonElement {
  const button = h('button', {
    class: extraClass ? `sfx-toggle ${extraClass}` : 'sfx-toggle',
    type: 'button',
  }) as HTMLButtonElement;

  const paint = (muted: boolean): void => {
    button.replaceChildren(glyph(muted));
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', describe(muted));
    button.setAttribute('title', describe(muted));
  };

  paint(isSfxMuted());
  button.addEventListener('click', () => toggleSfx());

  const stop = onSfxChange(paint);

  /* The header is torn down and rebuilt on every screen change. */
  button.addEventListener('DOMNodeRemovedFromDocument', () => stop(), { once: true });

  return button;
}
