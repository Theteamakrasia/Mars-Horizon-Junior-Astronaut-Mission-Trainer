/**
 * The keyboard rules the screens share.
 *
 * A screen that answers the Enter key has to answer exactly one Enter: a plain
 * one, and only when the focus is not already somewhere that deals with Enter
 * itself. Both rules used to live in the ration check's own model, and a second
 * screen that wanted the same behaviour could not have them - a feature never
 * imports another feature (AGENTS.md R-5). They live here so there is one copy
 * of the rule rather than one per screen.
 *
 * The functions are pure: they take a key name and a set of modifiers and
 * answer a question. Nothing here touches the DOM.
 */

/** The modifier keys that were held down with a key press. */
export interface KeyModifiers {
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
}

/**
 * True when a key press is a plain Enter, which is the only key this screen answers.
 *
 * A modified Enter is somebody's shortcut, not a request to move the story on:
 * Alt+Enter, Ctrl+Enter and the Windows key all belong to the browser or the
 * operating system, and answering them would move the beat on under a key the
 * player never meant to press.
 */
export function isPlainEnter(key: string, modifiers: KeyModifiers): boolean {
  if (key !== 'Enter') return false;

  return !modifiers.alt && !modifiers.ctrl && !modifiers.meta;
}

/**
 * True when the focused element deals with Enter itself, so the screen must not.
 *
 * Enter on a focused button already fires a click, and the browser gives a
 * focused link the same treatment. Handling those here as well would advance
 * twice on one press - and on a question screen, twice means the wrong answer.
 *
 * The text fields are here for the same reason as on the interior screen: there
 * are none on this screen today, and the next person to add one should not have
 * to remember that Enter in a field is the player's business, not the screen's.
 */
export function focusHandlesEnter(tagName: string): boolean {
  switch (tagName) {
    case 'BUTTON':
    case 'A':
    case 'INPUT':
    case 'TEXTAREA':
    case 'SELECT':
      return true;
    default:
      return false;
  }
}
