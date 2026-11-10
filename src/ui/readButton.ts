/**
 * A toggle button that reads a live piece of text aloud.
 *
 * Wraps the browser voice in `readAloud.ts` with the shared button behaviour:
 * one click starts, another stops, the label says which, and a cancelled
 * passage cannot reset a newer one. Returns `null` where speech is unavailable,
 * so callers append nothing rather than a dead control.
 */

import { h } from '../dom/h';
import { canReadAloud, readAloud, stopReading } from './readAloud';

export interface ReadButtonOptions {
  /** Classes for the button. Defaults to the game-loop `gl__calm` treatment. */
  readonly className?: string;
  readonly idleLabel?: string;
  readonly stopLabel?: string;
  /** Spoken name for the control, e.g. "Read the briefing aloud". */
  readonly ariaLabel?: string;
  /** Called when a passage starts. Useful to pause something that would move on. */
  readonly onStart?: () => void;
  /**
   * Called when the passage ends or is stopped. `completed` is false when the
   * player pressed the button again, so a caller can tell "finished" from
   * "abandoned" and only resume a paused hand-off in the first case.
   */
  readonly onStop?: (completed: boolean) => void;
}

/**
 * Build the button. `getText` is called at click time so it can read whatever
 * the screen has revealed so far rather than a snapshot from mount.
 */
export function readButton(getText: () => string, options: ReadButtonOptions = {}): HTMLButtonElement | null {
  if (!canReadAloud()) return null;

  const idle = options.idleLabel ?? '🔊 Read aloud';
  const stop = options.stopLabel ?? '⏹ Stop reading';
  const aria = options.ariaLabel ?? 'Read this screen aloud';

  const button = h('button', { class: options.className ?? 'gl__calm', type: 'button' });
  let reading = false;
  let generation = 0;

  const paint = (): void => {
    button.textContent = reading ? stop : idle;
    button.setAttribute('aria-pressed', String(reading));
    button.setAttribute('aria-label', reading ? 'Stop reading aloud' : aria);
  };

  button.addEventListener('click', () => {
    if (reading) {
      generation += 1;
      reading = false;
      stopReading();
      paint();
      options.onStop?.(false);

      return;
    }

    const mine = ++generation;

    reading = readAloud(getText(), () => {
      /* A cancelled passage can still fire its end callback after a new one
         starts, so only the newest request may reset the button. */
      if (mine !== generation) return;

      reading = false;
      paint();
      options.onStop?.(true);
    });
    paint();

    /* Only after the click succeeded: a browser that refused the text (empty,
       or speech missing mid-session) never started, so nothing was paused. */
    if (reading) options.onStart?.();
  });

  paint();

  return button;
}
