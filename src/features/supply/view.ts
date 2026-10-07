/**
 * The supply check: the astronaut explains what a crew has to take, then asks the
 * ration question, then Mission Control rules on it.
 *
 * DOM, images and timing only. The words, the numbers and the scoring all live in
 * ./model and are unit tested there.
 *
 * How the text is shown, and why it is not a list:
 *
 * The artwork is a full Mission Control room with no empty space in it. An
 * earlier version laid the five facts out as a scrolling list inside a
 * 46rem panel down the left, and it read as a dialog box dropped on top of a
 * picture â€” the panel covered the astronaut, whose job in the scene is to be
 * pointing at the checklist, and it fought the board the whole scene is about.
 *
 * So the text is dialogue instead: one bubble beside the astronaut's head, with a
 * tail pointing at him, and each fact REPLACES the previous one. The room stays
 * visible, the bubble is small enough to read as speech rather than as chrome,
 * and a child who looks away misses one line rather than a wall of five.
 *
 * Every replacement is a crossfade through `swapTo`, which fades the old line out
 * before writing the new one in. Timing is done with a timer rather than
 * `transitionend`, because a transition that never fires - a hidden element, a
 * background tab, reduced motion - would otherwise strand the sequence and leave
 * the bubble blank forever. That is the same class of bug as the briefing's
 * width animation, and the reason nothing on this screen depends on an animation
 * completing to become readable.
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
  QUESTION_PROMPT,
  RESOURCE_FACTS,
  explainChoice,
  isCorrect,
  successSentence,
  workingSentence,
} from './model';

/** How long a bubble fades out before the next one is written into it. */
const SWAP_MS = 220;

/** How long a fact is held on screen before it is replaced by the next. */
const FACT_HOLD_MS = 2600;

/** How long the wrong frame is held before the buttons come back. */
const RETRY_DELAY_MS = 1100;

/** Illustrations, by state. Imported so Vite fingerprints and bundles them. */
const SCENE_URLS = {
  question: questionUrl,
  wrong: wrongUrl,
  right: rightUrl,
} as const;

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
  const bubble = require<HTMLDivElement>(root, '[data-supply-bubble]');
  const bubbleLabel = require<HTMLParagraphElement>(root, '[data-supply-bubble-label]');
  const bubbleText = require<HTMLParagraphElement>(root, '[data-supply-bubble-text]');
  const answers = require<HTMLElement>(root, '[data-supply-answers]');
  const choiceList = require<HTMLUListElement>(root, '[data-supply-choices]');
  const result = require<HTMLParagraphElement>(root, '[data-supply-result]');
  const skip = require<HTMLButtonElement>(root, '[data-supply-skip]');
  const cont = require<HTMLButtonElement>(root, '[data-supply-continue]');

  /*
   * Who the bubble is attributed to.
   *
   * The player's own name, because the astronaut in the picture is them. An
   * earlier version labelled every bubble "MISSION CONTROL", which duplicated the
   * words already painted on the wall behind him and made it read as a caption
   * board rather than as somebody talking.
   */
  const speaker = run?.astronautName?.trim() || 'Astronaut';

  /*
   * Reduced motion shortens the hold rather than removing the facts.
   *
   * An earlier version treated "no run in progress" as a reason to skip straight
   * to the question, on the grounds that the reveal was tied to a run. It was not:
   * opening #/supply directly meant the five facts never appeared at all, so the
   * teaching content was only reachable if you had played through from the
   * briefing. The facts are the content. They always play.
   */
  const reduced = prefersReducedMotion();
  const holdMs = reduced ? 900 : FACT_HOLD_MS;

  const setScene = (name: SceneName): void => {
    scene.src = SCENE_URLS[name];
    // Read by the stylesheet, so the room can tint to match the verdict.
    root.dataset.supplyState = name;
  };

  const setChoicesEnabled = (enabled: boolean): void => {
    // Disabled rather than hidden, so a button is never a tab stop the player can
    // reach before there is a question to answer.
    for (const button of choiceButtons) button.disabled = !enabled;
  };

  /*
   * Write one line into the bubble and make it visible.
   *
   * Text is written *before* the bubble is shown, never revealed by animating a
   * property that decides whether it can be read.
   */
  const render = (label: string, text: string): void => {
    bubbleLabel.textContent = label;
    bubbleText.textContent = text;
    bubble.hidden = false;
    bubble.dataset.supplyPhase = 'in';
  };

  let timers: number[] = [];

  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };

  /**
   * Crossfade to a new line, then continue.
   *
   * The fade-out is timed rather than event-driven so the chain cannot stall: if
   * the transition is suppressed the timer still fires and the text still lands.
   * `then` runs immediately under reduced motion, which is why the whole reveal
   * collapses to a plain swap there.
   */
  const swapTo = (label: string, text: string, then?: () => void): void => {
    if (reduced || bubble.hidden) {
      render(label, text);
      if (then) then();
      return;
    }

    bubble.dataset.supplyPhase = 'out';

    later(() => {
      render(label, text);
      if (then) then();
    }, SWAP_MS);
  };

  /** Build the four answer buttons from the model. */
  const choiceButtons: HTMLButtonElement[] = CHOICES.map((choice) => {
    const item = document.createElement('li');
    item.className = 'supply__choice';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'supply__choice-button';
    button.dataset.supplyChoice = String(choice.value);
    button.textContent = String(choice.value);
    button.disabled = true;
    button.addEventListener('click', onChoiceClick);

    item.appendChild(button);
    choiceList.appendChild(item);
    return button;
  });

  let index = 0;
  /** True once the right answer has been given, which ends the interaction. */
  let solved = false;

  /** Put the buttons on screen with nothing judged yet. */
  const askQuestion = (): void => {
    answers.hidden = false;
    result.hidden = true;
    result.textContent = '';
    cont.hidden = true;
    setChoicesEnabled(true);
  };

  const advance = (): void => {
    if (index >= RESOURCE_FACTS.length) {
      // He asks it. The sentence lives only here, never also in the rail.
      swapTo(speaker, QUESTION_PROMPT, askQuestion);
      return;
    }

    const fact = RESOURCE_FACTS[index];
    index += 1;

    swapTo(fact.label, fact.line, () => {
      later(advance, holdMs);
    });
  };

  /** Say why the pick was wrong, show the working, and let them try again. */
  const showWrong = (value: number): void => {
    setScene('wrong');
    setChoicesEnabled(false);

    const why = explainChoice(value);
    swapTo(
      speaker,
      why === null
        ? 'That is not one of the amounts on the board. Read the two numbers in the question again.'
        : why,
    );

    // The working goes in the rail, not the bubble, so the question stays on
    // screen beside it while the child reads what went wrong.
    result.textContent = workingSentence();
    result.hidden = false;

    // Bring the buttons back after a beat, so the wrong frame registers before the
    // retry. Guarded on `solved` because a timer can outlive the answer.
    later(() => {
      if (!solved) setChoicesEnabled(true);
    }, RETRY_DELAY_MS);
  };

  /** Show the real answer and offer the way on. */
  const showRight = (): void => {
    solved = true;
    setScene('right');
    setChoicesEnabled(false);

    swapTo(speaker, successSentence());

    result.hidden = true;
    result.textContent = '';
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
    // Cancel the pending chain, then go straight to the question. Without the
    // clear, the next timed swap would fire over the top of the question bubble.
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];

    index = RESOURCE_FACTS.length;
    skip.hidden = true;

    swapTo(speaker, QUESTION_PROMPT, askQuestion);
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
   * The facts always play. Reduced motion only shortens the hold and drops the
   * crossfade; it does not remove content, and neither does arriving with no run
   * behind you. See the note on `holdMs` above for what the old condition cost.
   */
  if (reduced) {
    skip.hidden = true;
  }

  advance();

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