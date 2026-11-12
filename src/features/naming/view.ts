/**
 * The main menu: the player names their astronaut and starts the journey — or,
 * if this device already has a run, is greeted by name and offered CONTINUE.
 *
 * Entry screen for now. A login page is intended to sit in front of this later,
 * but it is not implemented and not built — Supabase is deferred (D-003).
 *
 * Owns the DOM only. Name rules and the returning player's two lines live in
 * ./model and are unit tested there; the save itself is `ui/save.ts` (D-081).
 */

// Three levels up: src/features/naming/ -> src/features/ -> src/ -> repo root.
// Typed asset imports, so Vite fingerprints these and emits them into dist/.
import astronautUrl from '../../../Assets/images/naming/astronaut.webp';
import marsUrl from '../../../Assets/images/naming/mars.webp';
import { hasReachedOutpost, newRun, type RunState } from '../../sim/run';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import { clearSave, readSave, resumeScreen } from '../../ui/save';
import { clearTrainingRecord } from '../../ui/training';

import './naming.css';

import { checkName, MAX_NAME_LENGTH, returningMenu } from './model';

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
  const resume = require<HTMLDivElement>(root, '[data-naming-resume]');
  const resumeNote = require<HTMLParagraphElement>(root, '[data-naming-resume-note]');
  const resumeContinue = require<HTMLButtonElement>(root, '[data-naming-continue]');
  const resumeRestart = require<HTMLButtonElement>(root, '[data-naming-restart]');

  // Typed asset imports: Vite fingerprints these and emits them into dist/.
  for (const img of root.querySelectorAll<HTMLImageElement>('[data-naming-img]')) {
    img.src = img.dataset.namingImg === 'mars' ? marsUrl : astronautUrl;
  }

  input.maxLength = MAX_NAME_LENGTH;

  /**
   * The run this device remembers, if it remembers one (D-081).
   *
   * Read once, at mount: the menu asks one question, and re-reading on every
   * keystroke would let a save appear underneath the player while they typed.
   */
  const saved = readSave();

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
    clearTrainingRecord();
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

  /**
   * Back to a blank name field, ready for a new astronaut.
   *
   * Only ever reached from START OVER, on either half of the menu: the saved run
   * is already gone by the time this runs, so there is nothing here to keep.
   */
  const restartForm = (): void => {
    resume.hidden = true;
    resumeNote.textContent = '';
    form.hidden = false;
    input.value = '';
    input.readOnly = false;
    submit.disabled = true;
    setHint('');
    root.dataset.namingStarted = 'false';
    input.focus();
  };

  const onBack = (): void => {
    // The naming screen *is* the main menu (D-021), so "back" has nowhere else
    // to go. It used to call `navigate('naming')` while already there, which is
    // a no-op after the first press. Clearing the form is the honest meaning:
    // start again with a fresh name and no run.
    //
    // Handing the shell a null run is also what takes the saved run away
    // (`main.ts` clears it when the run becomes null), which is right: this
    // button says START OVER, and a save left behind would contradict it.
    setRun(null);
    greeting.textContent = '';
    restartForm();
  };

  /**
   * Pick up the saved run, on the screen it was left on.
   *
   * The run goes back to the shell before the navigation, so every screen after
   * this one reads it from the same place it always has (R-5): nothing here
   * needs to know what the briefing or the outpost does with it.
   */
  const onContinue = (): void => {
    if (saved === null) return;

    setRun(saved.run);
    navigate(resumeScreen(saved));
  };

  /** Forget the saved run, and go back to asking for a name. */
  const onRestart = (): void => {
    clearSave();
    setRun(null);
    greeting.textContent = '';
    restartForm();
  };

  form.addEventListener('submit', onSubmit);
  input.addEventListener('input', onInput);
  back.addEventListener('click', onBack);
  resumeContinue.addEventListener('click', onContinue);
  resumeRestart.addEventListener('click', onRestart);

  if (saved !== null) {
    /*
     * There is a run on this device, so the menu says so instead of asking for a
     * name that has already been given.
     */
    const menu = returningMenu({
      name: saved.run.astronautName,
      sol: saved.run.sol,
      landed: hasReachedOutpost(saved.run),
      finished: saved.run.status !== 'active',
    });

    greeting.textContent = menu.greeting;
    resumeNote.textContent = menu.note;
    resume.hidden = false;
    form.hidden = true;
    root.dataset.namingStarted = 'false';
  } else {
    resume.hidden = true;
    form.hidden = false;

    // Reflect any run already in progress, and start from disabled.
    if (run?.astronautName) {
      input.value = run.astronautName;
    }

    onInput();
  }

  return () => {
    form.removeEventListener('submit', onSubmit);
    input.removeEventListener('input', onInput);
    back.removeEventListener('click', onBack);
    resumeContinue.removeEventListener('click', onContinue);
    resumeRestart.removeEventListener('click', onRestart);
  };
}