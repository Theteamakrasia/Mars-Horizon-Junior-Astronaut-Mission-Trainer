/**
 * Read a passage aloud with the browser's own speech synthesis.
 *
 * No audio file, no network request, no key: the voice is already on the device.
 * That keeps the project's zero-runtime-dependency rule and makes the feature
 * work offline, which matters on the demo laptop.
 *
 * Support is uneven. Callers must check `canReadAloud()` before showing a
 * control; `readAloud()` still returns false rather than throwing when the API
 * is missing, so a browser without speech simply stays quiet.
 *
 * One passage at a time. Starting a new one cancels the old one, and the router
 * cancels whatever is playing when the screen changes so a voice cannot follow
 * the player into the next scene.
 */

/** The engine, or null where speech is unavailable. */
function engine(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

/** True when this browser can speak without a network request. */
export function canReadAloud(): boolean {
  return engine() !== null && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Stop the current passage. Safe to call when nothing is playing. */
export function stopReading(): void {
  engine()?.cancel();
}

/**
 * Speak `text`, replacing anything already playing.
 *
 * Returns false when the browser cannot speak or the text is empty. `onDone`
 * runs when the passage finishes or fails, but not when `stopReading()` cancels
 * it: the caller that asked to stop already knows.
 */
export function readAloud(text: string, onDone?: () => void): boolean {
  const speech = engine();

  if (speech === null || typeof SpeechSynthesisUtterance === 'undefined') return false;

  const passage = text.replace(/\s+/g, ' ').trim();

  if (passage === '') return false;

  speech.cancel();

  const utterance = new SpeechSynthesisUtterance(passage);

  /* Slightly slower than the browser default: the card is written for a child
     reading along, not for an adult skimming. */
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();

  speech.speak(utterance);

  return true;
}
