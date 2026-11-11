import { describe, expect, it } from 'vitest';

import { focusHandlesEnter, isPlainEnter } from './keys';

/*
  These rules used to live in the ration check's own model, where the launch
  parts tour could not have them - a feature never imports another feature
  (AGENTS.md R-5). They live in src/dom/keys.ts now, so both screens share one
  copy of the rule.
*/

describe('isPlainEnter', () => {
  /** No modifiers held, the ordinary case. */
  const plain = { alt: false, ctrl: false, meta: false };

  it('accepts an unmodified Enter', () => {
    expect(isPlainEnter('Enter', plain)).toBe(true);
  });

  it('ignores a modified Enter', () => {
    // Alt+Enter, Ctrl+Enter and the Windows key belong to the browser and the
    // operating system, not to the story.
    expect(isPlainEnter('Enter', { alt: true, ctrl: false, meta: false })).toBe(false);
    expect(isPlainEnter('Enter', { alt: false, ctrl: true, meta: false })).toBe(false);
    expect(isPlainEnter('Enter', { alt: false, ctrl: false, meta: true })).toBe(false);
  });

  it('ignores every other key', () => {
    expect(isPlainEnter(' ', plain)).toBe(false);
    expect(isPlainEnter('Escape', plain)).toBe(false);
    expect(isPlainEnter('NumpadEnter', plain)).toBe(false);
    expect(isPlainEnter('enter', plain)).toBe(false);
  });
});

describe('focusHandlesEnter', () => {
  it('leaves a focused button to the browser', () => {
    // Enter on a focused button already fires a click. Answering it here as well
    // would advance twice on one press, and on the question screen twice is a
    // wrong answer.
    expect(focusHandlesEnter('BUTTON')).toBe(true);
  });

  it('leaves a focused link to the browser', () => {
    expect(focusHandlesEnter('A')).toBe(true);
  });

  it('leaves a focused text field to the player', () => {
    // There are no fields on this screen today; the next person to add one should
    // not have to remember that Enter in a field is the player's business.
    expect(focusHandlesEnter('INPUT')).toBe(true);
    expect(focusHandlesEnter('TEXTAREA')).toBe(true);
    expect(focusHandlesEnter('SELECT')).toBe(true);
  });

  it('claims the key when nothing interactive has the focus', () => {
    // The body has the focus on arrival, which is exactly when Enter did nothing
    // (ISS-047).
    expect(focusHandlesEnter('BODY')).toBe(false);
    expect(focusHandlesEnter('DIV')).toBe(false);
    expect(focusHandlesEnter('UL')).toBe(false);
    expect(focusHandlesEnter('LI')).toBe(false);
  });
});
