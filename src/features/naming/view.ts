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
import { newRun, type RunState } from '../../sim/run';
import { nextStop } from '../../ui/registry';
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
export function mountNaming(
  root: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
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

    // The name is the first real piece of run state, so the run is created here
    // and handed up to the shell rather than kept in this screen. Every later
    // scene reads it from there, which is why screens never import each other.
    setRun(newRun('', value));

    greeting.textContent = `Welcome aboard, ${value}.`;
    setHint('Your journey begins here.');

    root.dataset.namingStarted = 'true';
    input.readOnly = true;
    submit.disabled = true;

    // nextStop inserts the under-construction interstitial when the next scene
    // is not built yet, so there is nothing to special-case here or later.
    const next = nextStop('naming');

    if (next !== null) {
      navigate(next);
    }
  };

  const onBack = (): void => {
    // The naming menu *is* the main menu now (D-021), so going back means going
    // to the entry route. This is deliberately not `landing`: forward and back
    // must not be the same destination, which is how this screen used to be
    // wired.
    navigate('naming');
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