/**
 * A full-width, fixed-height strip pinned to the bottom of a screen.
 * It owns Next / Prev / other action buttons; dialogue text stays wherever the
 * feature puts it. This is the dedicated button bar a VN-style screen uses, so
 * no screen has to position its controls individually.
 *
 * Importable from any feature view (feature-view may import ui/). No DOM in
 * model.ts; no feature imports another feature.
 */

export interface ButtonStripOptions {
  /** CSS height of the strip. */
  readonly height?: string;
  /** Extra class added to the strip so the owning feature can theme it. */
  readonly className?: string;
}

export interface ButtonStripSpec {
  readonly el: HTMLElement;
  /** Append a button the feature already created (e.g. one read from markup). */
  appendButton: (button: HTMLButtonElement) => void;
  /** Create and append a button. */
  addButton: (spec: {
    readonly label: string;
    readonly onClick: () => void;
    readonly className?: string;
    readonly hidden?: boolean;
  }) => HTMLButtonElement;
  readonly teardown: () => void;
}

/**
 * Create the bottom button strip and append it to `root`.
 *
 * Buttons appended to the strip become its children, so `teardown` removing the
 * strip detaches all of their listeners at once.
 */
export function createButtonStrip(
  root: HTMLElement,
  options: ButtonStripOptions = {},
): ButtonStripSpec {
  const strip = document.createElement('div');
  strip.className = `ui-button-strip ${options.className ?? ''}`.trim();

  strip.style.position = 'fixed';
  strip.style.bottom = '0';
  strip.style.left = '0';
  strip.style.width = '100%';
  strip.style.height = options.height ?? '4.5rem';
  strip.style.display = 'flex';
  strip.style.justifyContent = 'flex-end';
  strip.style.alignItems = 'center';
  strip.style.gap = '0.75rem';
  strip.style.padding = '0.75rem 1rem';
  strip.style.boxSizing = 'border-box';
  strip.style.zIndex = '20';

  root.appendChild(strip);

  const appendButton = (button: HTMLButtonElement): void => {
    strip.appendChild(button);
  };

  const createdButtons: HTMLButtonElement[] = [];

  const addButton = (spec: {
    readonly label: string;
    readonly onClick: () => void;
    readonly className?: string;
    readonly hidden?: boolean;
  }): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = spec.label;
    button.className = `ui-button-strip__button ${spec.className ?? ''}`.trim();
    if (spec.hidden) button.hidden = true;
    button.addEventListener('click', spec.onClick);
    createdButtons.push(button);
    strip.appendChild(button);
    return button;
  };

  const teardown = (): void => {
    strip.remove();
    createdButtons.length = 0;
  };

  return { el: strip, appendButton, addButton, teardown };
}
