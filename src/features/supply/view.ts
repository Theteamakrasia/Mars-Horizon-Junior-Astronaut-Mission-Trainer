/**
 * The supply check: the astronaut explains what a crew has to take, then asks the
 * ration question, then Mission Control rules on it.
 *
 * DOM, images and timing only. The words, the numbers and the scoring all live in
 * ./model and are unit tested there.
 *
 * How the text is shown, and why it is a bottom panel:
 *
 * The artwork is a full Mission Control room with no empty space in it, so
 * nothing here is laid out as a panel dropped on top of it. The text is
 * dialogue instead: a fixed full-width panel pinned to the bottom of the
 * screen (visual-novel style) with a speaker label, dialogue text, a Next
 * button, and the answer choices. Each fact REPLACES the previous one. The
 * room stays visible, the panel is small enough to read as speech rather than
 * as chrome, and a child who looks away misses one line rather than a wall of
 * five.
 *
 * Every replacement is written immediately through `swapTo` - no crossfade,
 * so the chain cannot stall and the text is always readable. That is the same
 * rule as the briefing: an animation is never load-bearing for content
 * appearing.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';
import { createDialoguePanel } from '../../ui/dialogue';

import './supply.css';

import chooseUrl from '../../../Assets/images/supply/choose.webp';
import questionUrl from '../../../Assets/images/supply/question.webp';
import rightUrl from '../../../Assets/images/supply/right.webp';
import wrongUrl from '../../../Assets/images/supply/wrong.webp';

import {
  CHOICES,
  CORRECT_ANSWER,
  QUESTION_PROMPT,
  SUPPLY_BEATS,
  hintFor,
  isCorrect,
  judge,
  successSentence,
  workingSentence,
  workingSentenceBlanked,
} from './model';

/**
 * How long to wait for a frame before showing it anyway.
 *
 * A crossfade that stalls waiting for a decode is worse than a hard cut, so this
 * is the escape hatch. Same reasoning as the briefing reveal: an animation must
 * never be load-bearing for content appearing.
 *
 * The dissolve's own duration is not here — it lives in supply.css, on the
 * opacity transition, and having the number in both files would be two sources
 * of truth for one effect.
 */
const SCENE_LOAD_FALLBACK_MS = 700;

/**
 * Illustrations, by state. Imported so Vite fingerprints and bundles them.
 *
 * One frame per phase, chosen to match what is happening:
 *
 *   choose   - the astronaut turned to the room with a clipboard, explaining.
 *              Used while he is speaking the resource facts through.
 *   question - him pointing at the checklist with RATIONS still unticked and
 *              marked with a question mark. Used once he actually asks.
 *   wrong    - the alarm state.
 *   right    - the checklist complete.
 *
 * An earlier version showed the question frame for the whole screen, including
 * the five facts he was speaking before it. So the room did not change at the
 * moment he stopped explaining and started asking, which is the one beat the
 * picture most needs to move on.
 */
const SCENE_URLS = {
  choose: chooseUrl,
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
  const sceneB = require<HTMLImageElement>(root, '[data-supply-scene-b]');
  const retry = require<HTMLButtonElement>(root, '[data-supply-retry]');
  const cont = require<HTMLButtonElement>(root, '[data-supply-continue]');

  const dialogue = createDialoguePanel(root);

  /** Who the dialogue text is attributed to. */
  const speaker = run?.astronautName?.trim() || 'Astronaut';

  /*
 * Reduced motion drops the crossfade; it does not remove content.
 *
 * An earlier version treated "no run in progress" as a reason to skip straight to
 * the question, on the grounds that the reveal was tied to a run. It was not:
 * opening #/supply directly meant the five facts never appeared at all, so the
 * teaching content was only reachable if you had played through from the
 * briefing. The facts are the content. They always play.
 */
const reduced = prefersReducedMotion();

  /*
   * The two stacked scene images.
   *
   * `front` is whichever currently holds the visible frame. Changing the
   * illustration writes the next one onto the back layer, waits for it to be
   * ready, then swaps which layer is in front - the CSS opacity transition does
   * the dissolve.
   */
  let front: HTMLImageElement = scene;
  let back: HTMLImageElement = sceneB;

  /**
   * Run `then` once `img` has pixels, or once it has clearly given up trying.
   *
   * The timeout matters: an image whose decode resolves without a `load` event, or
   * a frame that 404s, would otherwise strand the sequence with the previous
   * picture still showing and no explanation.
   */
  const whenReady = (img: HTMLImageElement, then: () => void): void => {
    if (img.complete && img.naturalWidth > 0) {
      then();
      return;
    }

    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      img.removeEventListener('load', finish);
      then();
    };

    img.addEventListener('load', finish);
    later(finish, SCENE_LOAD_FALLBACK_MS);
  };

  /**
   * Dissolve to another frame of the room.
   *
   * Under reduced motion there is no dissolve at all - the frame is simply
   * replaced. That is what reduced motion means, and it is why `whenReady` needs
   * its fallback: the picture must never be the thing waiting on an animation.
   */
  const setScene = (name: SceneName): void => {
    const url = SCENE_URLS[name];

    // Read by the stylesheet, so the room can tint to match the verdict.
    root.dataset.supplyState = name;

    const apply = (): void => {
      front.classList.remove('is-front');
      back.classList.add('is-front');

      const spare = front;
      front = back;
      back = spare;
    };

    if (reduced) {
      back.src = url;
      apply();
      return;
    }

    // Wait for pixels before swapping layers, so the dissolve never fades through
    // an empty image and a flash of bare background.
    back.src = url;
    whenReady(back, apply);
  };

  /**
   * Fetch all four frames now, while the player is reading.
   *
   * A crossfade only looks smooth if the incoming frame is already decoded. By the
   * time anyone has clicked through a few facts it will be in cache anyway, but
   * nothing fetches it until a transition asks for it - so ask now.
   */
  const warmFrames = (): void => {
    for (const url of Object.values(SCENE_URLS)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    }
  };

  const setChoicesEnabled = (enabled: boolean): void => {
    dialogue.setChoicesEnabled(enabled);
  };

  /*
   * What the dialogue is heading for.
   *
   * Set when a line is asked for, not when it lands, so it is right even while
   * a replacement is still running. The view needs it to tell whether the
   * question is already up before asking it again: after a first wrong answer
   * the panel still holds it, because no hint was given, and asking it again
   * would be a swap out and a swap in of the same words.
   */
  let currentLine = '';

  let timers: number[] = [];

  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };

  /**
   * Write one line into the dialogue panel and continue.
   *
   * Text is written immediately - no crossfade, so the chain cannot stall and the
   * text is always readable. Mirrors the briefing's rule that an animation is
   * never load-bearing for content appearing.
   */
  const swapTo = (label: string, text: string, then?: () => void): void => {
    currentLine = text;
    dialogue.setSpeaker(label);
    dialogue.setText(text);
    dialogue.setDetail('');
    if (then) then();
  };

  /** Build the answer buttons in the dialogue panel, created once and shown when the question is asked. */
  dialogue.setChoices(
    CHOICES.map((value) => ({ label: String(value), value: String(value) })),
    onChoiceValue,
  );
  dialogue.clearChoices();
  dialogue.setChoicesEnabled(false);

  /**
   * Retire an option for good.
   *
   * A wrong answer teaches once. Leaving it clickable means a child can pick the
   * same wrong number over and over and read the same sentence, which is not
   * practice - it is a button that does not seem to work. The panel keeps the
   * button visible so the remaining options can be reasoned about; only the
   * ability to repeat the mistake goes away.
   */
  const lockChoice = (value: number): void => {
    dialogue.setChoiceLocked(String(value), true);
  };

  let index = 0;
  /** True once the right answer has been given, which ends the interaction. */
  let solved = false;
  /** How many wrong answers have been given, which is what the hint waits for. */
  let wrongChoices = 0;

  /** Put the buttons on screen with nothing judged yet. */
  const askQuestion = (): void => {
    // The room changes here. He has finished explaining and is now asking, so the
    // pointing-at-the-checklist frame arrives with the question instead of sitting
    // under the whole conversation.
    setScene('question');

    retry.hidden = true;
    cont.hidden = true;
    dialogue.showChoices();
    dialogue.setChoicesEnabled(true);
    dialogue.setNext(false, revealNext);
  };

  const revealNext = (): void => {
    if (index >= SUPPLY_BEATS.length) {
      // He asks it. The sentence lives only here, never also in the rail.
      //
      // NEXT is hidden only now, once the question is actually up. Hiding it after
      // the last fact - which is what this did first - left the player with no way
      // to reach the question at all: five facts, then a dead screen.
      swapTo(speaker, QUESTION_PROMPT, () => {
        askQuestion();
      });
      return;
    }

    const fact = SUPPLY_BEATS[index];
    index += 1;

    swapTo(fact.label, fact.line, () => {
      dialogue.setNext(true, revealNext);
    });
  };

  /**
   * Judge a wrong pick: say which way to move, show the working, retire the option.
   */
  const showWrong = (value: number): void => {
    setScene('wrong');

    // Locked straight away, before anything is said about it, so a fast
    // double-click cannot pick the same number twice.
    lockChoice(value);

    // Everything is off during the alarm, not just the locked one, so the frame
    // reads as "stop" rather than leaving three live buttons under a red light.
    setChoicesEnabled(false);

    /*
     * The hint is not given on the first wrong answer.
     *
     * The first mistake is where the child is still working it out, and a
     * direction - "too low, think larger" - is what stops that working: it
     * rules options out instead of letting the method rule them out. The
     * blanked working is enough on its own for a first attempt, and the panel
     * keeps the question so it can be read again.
     *
     * From the second wrong answer on there is a nudge as well, because by then
     * they have had the method once and are stuck rather than thinking.
     */
    wrongChoices += 1;

    if (wrongChoices > 1) {
      const hint = hintFor(judge(value, CORRECT_ANSWER));

      swapTo(
        speaker,
        hint === null
          ? 'That is not one of the amounts on the board. Read the two numbers again.'
          : hint,
      );
    }

    // The working goes in the panel detail line below the dialogue, so the
    // question or hint stays above it while the child reads what went wrong.
    //
    // With the answer left out of it. The sentence ends with the number under
    // test, so showing it in full put the answer on the panel for as long as
    // the child was looking at it, which is no use to a question meant to be
    // worked out. The full working arrives once the answer has been earned.
    dialogue.setDetail(workingSentenceBlanked());

    // The alarm frame stays up until the player asks for another go. This used
    // to time out on its own after a beat, which took the choice away while the
    // child was still reading the hint; now the way back is a button they press.
    //
    // Focus follows, because every choice button is disabled at this point and
    // focus would otherwise fall back to the body, leaving a keyboard player
    // with nowhere to be.
    retry.hidden = false;
    retry.focus({ preventScroll: true });
  };

  /**
   * Take the room back to the question and let the player have another go.
   *
   * The question is asked again rather than left in the panel, because the
   * panel is the only place the full question has ever been spoken. After a
   * wrong answer it may hold a hint, and someone working out the answer needs
   * the question in front of them, not the hint they have already read.
   *
   * Asked only when it is not already up. A first wrong answer gives no hint,
   * so the question is still in the panel, and asking it again would be a swap
   * out and a swap in of the same words.
   */
  const onRetry = (): void => {
    if (solved) return;

    retry.hidden = true;
    setScene('question');
    dialogue.showChoices();
    dialogue.setChoicesEnabled(true);
    dialogue.setNext(false, revealNext);

    if (currentLine !== QUESTION_PROMPT) {
      swapTo(speaker, QUESTION_PROMPT);
    }
  };

  /** Show the real answer and offer the way on. */
  const showRight = (): void => {
    solved = true;
    setScene('right');
    dialogue.setChoicesEnabled(false);
    retry.hidden = true;

    swapTo(speaker, successSentence());

    // The working is completed now that the answer has been earned, so the
    // blank the child was left with is filled in.
    dialogue.setDetail(workingSentence());

    cont.hidden = false;
  };

  function onChoiceValue(value: string): void {
    if (solved) return;

    const numValue = Number(value);

    // A button with no parsable value gives NaN, and NaN compares false against
    // everything, so it would be silently scored as a wrong answer.
    if (!Number.isFinite(numValue)) return;

    if (isCorrect(numValue, CORRECT_ANSWER)) {
      showRight();
    } else {
      showWrong(numValue);
    }
  }

  const onContinue = (): void => {
    // nextStop inserts the under-construction interstitial when the next scene is
    // not built, so this needs no special casing now or when later scenes land.
    const next = nextStop('supply');

    if (next === null) return;

    navigate(next);
  };

  retry.addEventListener('click', onRetry);
  cont.addEventListener('click', onContinue);

  // Open on the astronaut explaining, with the clipboard. The pointing-at-the-
  // checklist frame waits for the question, which is what he is pointing at.
  setScene('choose');

  // Fetch the other three frames while they read the facts, so no later dissolve
  // has to wait on the network.
  warmFrames();

  // The opening line is already on screen when you arrive. Nobody should have to
  // click to find out what the screen is.
  revealNext();

  return () => {
    dialogue.teardown();
    retry.removeEventListener('click', onRetry);
    cont.removeEventListener('click', onContinue);

    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };
}