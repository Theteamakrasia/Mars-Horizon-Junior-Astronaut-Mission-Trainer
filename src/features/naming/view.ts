/**
 * The main menu: the player names their astronaut and starts the journey.
 *
 * Entry screen for now. A login page is intended to sit in front of this later,
 * but it is not implemented and not built — Supabase is deferred (D-003).
 *
 * Owns the DOM only. Name rules live in ./model and are unit tested there.
 */

// Three levels up: src/features/naming/ -> src/features/ -> src/ -> repo root.
// Typed asset imports, so Vite fingerprints these and emits them into dist/.
import astronautUrl from '../../../Assets/images/naming/astronaut.webp';
import marsUrl from '../../../Assets/images/naming/mars.webp';
import type { RunState } from '../../sim/run';
import { navigate } from '../../ui/router';

import './naming.css';

import { checkName, MAX_NAME_LENGTH } from './model';

/**
 * Resolve a child of the screen root, throwing if the markup and this file have
 * drifted apart. Far easier to debug than a null dereference on click.
 */
function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`naming: missing required element ${selector}`);
  }

  return element;
}

/**
 * Mount the menu into `root` and return a teardown.
 *
 * `run` is null until the player starts a mission; the screen works either way,
 * because naming a astronaut is the first thing they do.
 */
export function mountNaming(root: HTMLElement, run: RunState | null): () => void {
  const input = require<HTMLInputElement>(root, '[data-naming-input]');
  const form = require<HTMLFormElement>(root, '[data-naming-form]');
  const hint = require<HTMLParagraphElement>(root, '[data-naming-hint]');
  const submit = require<HTMLButtonElement>(root, '[data-naming-submit]');
  const back = require<HTMLButtonElement>(root, '[data-naming-back]');
  const greeting = require<HTMLParagraphElement>(root, '[data-naming-greeting]');

  // Typed asset imports: Vite fingerprints these and emits them into dist/.
  for (const img of root.querySelectorAll<HTMLImageElement>('[data-naming-img]')) {
    img.src = img.dataset.namingImg === 'mars' ? marsUrl : astronautUrl;
  }

  input.maxLength = MAX_NAME_LENGTH;

  const setHint = (message: string): void => {
    hint.textContent = message;
  };

  /**
   * Re-validate on every keystroke and keep the button's enabled state in step.
   *
   * Disabled rather than error-on-click: an eight-year-old should not be able to
   * press a button that cannot work.
   */
  const onInput = (): void => {
    const { ok, problem } = checkName(input.value);

    submit.disabled = !ok;

    if (problem === 'empty') setHint('');
    else if (problem === 'too-long') setHint(`Keep it under ${MAX_NAME_LENGTH} characters.`);
    else setHint('');
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();

    const { ok, value } = checkName(input.value);

    if (!ok) {
      onInput();
      return;
    }

    // No scene exists after this one yet, so the screen says so plainly rather
    // than navigating into a stub that would throw. When `landing-site` is built
    // this becomes navigate('landing-site') with the run handed to it.
    greeting.textContent = `Welcome aboard, ${value}.`;
    setHint('Your journey begins here. The next scene is still under construction.');

    root.dataset.namingStarted = 'true';
    input.readOnly = true;
    submit.disabled = true;
  };

  const onBack = (): void => {
    // There is no main menu beyond this one yet, so this returns to the landing
    // page, which is currently the only other screen that works.
    navigate('landing');
  };

  form.addEventListener('submit', onSubmit);
  input.addEventListener('input', onInput);
  back.addEventListener('click', onBack);

  // Reflect any run already in progress, and start from disabled.
  if (run?.astronautName) {
    input.value = run.astronautName;
  }

  onInput();

  return () => {
    form.removeEventListener('submit', onSubmit);
    input.removeEventListener('input', onInput);
    back.removeEventListener('click', onBack);
  };
}