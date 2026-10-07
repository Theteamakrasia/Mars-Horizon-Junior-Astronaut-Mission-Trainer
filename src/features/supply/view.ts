/**
 * The supply check: five facts about what a crew has to take, then the ration
 * arithmetic, then Mission Control's verdict.
 *
 * DOM, images and timing only. The words, the numbers and the scoring all live in
 * ./model and are unit tested there. This file is the part I cannot run a test
 * against, so it is written to fail loudly: every element it needs is looked up
 * with `require`, which throws with the selector in the message rather than
 * leaving a half-drawn screen with dead buttons.
 *
 * Three states, each with its own illustration:
 *   question - the four answer buttons, one of them right
 *   wrong    - a miss, the working, and the same buttons again
 *   right    - the total, and CONTINUE hands off to the next stop
 *
 * A wrong answer is retryable by design. That means a child can guess their way
 * through, which is a soft failure: the attempt is cheap and the explanation that
 * follows a miss is the part that teaches. The alternative - saying why it was
 * wrong and moving on - gives up the retry, which was the choice made here.
 *
 * Note on the numbers: the question asked on screen is QUESTION from the model,
 * not one rebuilt from run state. Nothing in RunState can drift out of step with
 * the arithmetic under test.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './supply.css';

import questionUrl from '../../../Assets/images/supply/question.webp';
import rightUrl from '../../../Assets/images/supply/right.webp';
import wrongUrl from '../../../Assets/images/supply/wrong.webp';

import {
  CHOICES,
  CORRECT_ANSWER,
  RESOURCE_FACTS,
  explainChoice,
  isCorrect,
  successSentence,
  workingSentence,
  type ResourceFact,
} from './model';

/** Milliseconds each fact is held before the next one appears. */
const FACT_INTERVAL_MS = 1900;

/** Illustrations, by state. Imported so Vite fingerprints and bundles them. */
const SCENE_URLS = {
  question: questionUrl,
  wrong: wrongUrl,
  right: rightUrl,
} as const;

/** Which of the three illustrations the screen is showing. */
type SceneName = keyof typeof SCENE_URLS;

/**
 * Look up a required child, or throw naming the selector.
 *
 * `mountScreen` sets `root.hidden = false` before calling a factory, so a throw
 * from here leaves a visible but empty screen with unresponsive buttons. That is
 * a bad failure to debug by eye, so it is worth shouting about instead.
 */
function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`supply: missing required element ${selector}`);
  }

  return element;
}

/** True when the visitor asked for less motion. Read live, not once at boot. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function mountSupply(
  root: HTMLElement,
  run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  const scene = require<HTMLImageElement>(root, '[data-supply-scene]');
  const factList = require<HTMLUListElement>(root, '[data-supply-facts]');
  const skip = require<HTMLButtonElement>(root, '[data-supply-skip]');
  const questionBlock = require<HTMLElement>(root, '[data-supply-question]');
  const choiceList = require<HTMLUListElement>(root, '[data-supply-choices]');
  const feedback = require<HTMLParagraphElement>(root, '[data-supply-feedback]');
  const result = require<HTMLParagraphElement>(root, '[data-supply-result]');
  const cont = require<HTMLButtonElement>(root, '[data-supply-continue]');

  const setScene = (name: SceneName): void => {
    scene.src = SCENE_URLS[name];
    // Read by the stylesheet, so a state can change the frame's tint.
    root.dataset.supplyState = name;
  };

  const setChoicesEnabled = (enabled: boolean): void => {
    // Disabled rather than hidden, so the buttons are never tab stops the player
    // can reach before there is anything to answer.
    for (const button of choiceButtons) button.disabled = !enabled;
  };

  /*
   * Build the five facts up front, hidden, and reveal them in order. Same shape
   * as the briefing: the DOM order is the reading order, so a screen reader gets
   * all five regardless of how the animation is going.
   */
  const factItems: HTMLLIElement[] = RESOURCE_FACTS.map((fact: ResourceFact) => {
    const item = document.createElement('li');
    item.className = 'supply__fact';
    item.dataset.supplyFact = fact.key;
    item.hidden = true;

    const label = document.createElement('span');
    label.className = 'supply__fact-label';
    label.textContent = fact.label;

    const line = document.createElement('span');
    line.className = 'supply__fact-line';
    line.textContent = fact.line;

    item.append(label, line);
    factList.appendChild(item);
    return item;
  });

  /*
   * Build the four answer buttons from the model, so the numbers on screen and
   * the numbers under test cannot disagree.
   */
  const choiceButtons: HTMLButtonElement[] = CHOICES.map((choice) => {
    const item = document.createElement('li');
    item.className = 'supply__choice';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'supply__button';
    button.dataset.supplyChoice = String(choice.value);
    button.textContent = `${choice.value} packs`;
    button.disabled = true;
    button.addEventListener('click', onChoiceClick);

    item.appendChild(button);
    choiceList.appendChild(item);
    return button;
  });

  let timers: number[] = [];
  let index = 0;
  /** True once the right answer has been given, which ends the interaction. */
  let solved = false;

  const showFact = (item: HTMLElement): void => {
    // Un-hide first, then decorate. Content must be readable the moment `hidden`
    // comes off; the class is decoration only. An earlier version of the briefing
    // animated max-width from 0 and left the screen blank whenever the animation
    // did not run, so this is a correctness rule, not a stylistic one.
    item.hidden = false;
    item.classList.add('is-revealed');
  };

  const revealAllFacts = (): void => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];

    for (const item of factItems) showFact(item);

    index = factItems.length;
    skip.hidden = true;
  };

  /** Put the question on screen with the buttons live and nothing judged yet. */
  const askQuestion = (): void => {
    questionBlock.hidden = false;
    feedback.hidden = true;
    feedback.textContent = '';
    result.hidden = true;
    result.textContent = '';
    cont.hidden = true;
    setChoicesEnabled(true);
  };

  const advance = (): void => {
    if (index >= factItems.length) {
      skip.hidden = true;
      askQuestion();
      return;
    }

    showFact(factItems[index]);
    index += 1;

    timers.push(window.setTimeout(advance, FACT_INTERVAL_MS));
  };

  /** Say why the pick was wrong, show the working, and let them try again. */
  const showWrong = (value: number): void => {
    setScene('wrong');
    setChoicesEnabled(false);

    const why = explainChoice(value);
    feedback.textContent =
      why === null
        ? 'That is not one of the amounts on the board. Read the two numbers in the question again.'
        : why;
    feedback.hidden = false;

    // The working goes up alongside the explanation. A child told only that they
    // were wrong has nothing to correct.
    result.textContent = workingSentence();
    result.hidden = false;

    // Re-enable after a beat so the wrong frame is seen before the retry. The
    // timer is tracked so teardown can cancel it.
    timers.push(
      window.setTimeout(() => {
        if (!solved) setChoicesEnabled(true);
      }, 900),
    );
  };

  /** Show the real answer and offer the way on. */
  const showRight = (): void => {
    solved = true;
    setScene('right');
    setChoicesEnabled(false);

    result.textContent = successSentence();
    result.hidden = false;
    feedback.hidden = true;
    feedback.textContent = '';
    cont.hidden = false;
  };

  function onChoiceClick(event: Event): void {
    if (solved) return;

    const button = event.currentTarget as HTMLButtonElement;
    const value = Number(button.dataset.supplyChoice);

    // A button with no parsable value gives NaN, and NaN compares false against
    // everything, so it would be silently scored as a wrong answer.
    if (!Number.isFinite(value)) return;

    if (isCorrect(value, CORRECT_ANSWER)) {
      showRight();
    } else {
      showWrong(value);
    }
  }

  const onSkip = (): void => {
    revealAllFacts();
    askQuestion();
  };

  const onContinue = (): void => {
    // nextStop inserts the under-construction interstitial when the next scene is
    // not built, so this needs no special casing now or when later scenes land.
    const next = nextStop('supply');

    if (next === null) return;

    navigate(next);
  };

  skip.addEventListener('click', onSkip);
  cont.addEventListener('click', onContinue);

  // Start on the Mission Control frame with the checklist unticked, which is the
  // problem the player has been called in to fix.
  setScene('question');

  /*
   * Reduced motion, or no run in progress, shows all five at once with no
   * animation. The `run === null` case matters: #/supply is reachable by typing it
   * into the address bar, and the reveal must not start a timed sequence behind a
   * run that does not exist.
   */
  if (prefersReducedMotion() || run === null || run.status !== 'active') {
    revealAllFacts();
    askQuestion();
  } else {
    // The question stays out of the way until the last fact has been read.
    questionBlock.hidden = true;
    setChoicesEnabled(false);
    advance();
  }

  return () => {
    skip.removeEventListener('click', onSkip);
    cont.removeEventListener('click', onContinue);

    for (const button of choiceButtons) {
      button.removeEventListener('click', onChoiceClick);
    }

    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };
}