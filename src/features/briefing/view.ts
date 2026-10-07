/**
 * The mission briefing, revealed one line at a time.
 *
 * DOM and timing only. The words live in ./model and are unit tested there; the
 * reveal is deliberately kept out of the model so it can be asserted on without a
 * browser, which is what made `sim/` reliable.
 *
 * Three ways out, in order of preference for the player:
 *   1. SKIP reveals everything at once. Always available, and always first in
 *      the tab order, because waiting out a timed animation with no way to cut it
 *      short is a trap for anyone who is in a hurry or has read it before.
 *   2. prefers-reduced-motion reveals everything immediately, with no animation.
 *   3. Otherwise the lines type themselves in, paced by the model.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './briefing.css';

import { BEATS, beatDuration, greetingFor } from './model';

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`briefing: missing required element ${selector}`);
  }

  return element;
}

/** True when the visitor asked for less motion. Read live, not once at boot. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function mountBriefing(
  root: HTMLElement,
  run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  const greeting = require<HTMLParagraphElement>(root, '[data-briefing-greeting]');
  const stream = require<HTMLOListElement>(root, '[data-briefing-stream]');
  const skip = require<HTMLButtonElement>(root, '[data-briefing-skip]');
  const cont = require<HTMLButtonElement>(root, '[data-briefing-continue]');
  const hint = require<HTMLParagraphElement>(root, '[data-briefing-hint]');

  // True when continue has somewhere real to go. If the briefing is the last
  // built screen, the button says so instead of doing nothing.
  const hasNextStop = nextStop('briefing') !== null;

  greeting.textContent = greetingFor(run?.astronautName ?? '');

  // Build every beat up front, hidden. The reveal then only un-hides them in
  // order, so the DOM order is the reading order and a screen reader gets the
  // whole briefing regardless of how the animation is going.
  const lines = BEATS.map((beat) => {
    const item = document.createElement('li');
    item.className = 'briefing__line';
    item.dataset.briefingLine = beat.id;
    item.textContent = beat.text;
    item.hidden = true;
    stream.appendChild(item);
    return item;
  });

  let timers: number[] = [];
  let index = 0;

  const showLine = (item: HTMLElement): void => {
    item.hidden = false;

    // The typing effect is a CSS width animation on the line's own text; the
    // timer below only decides when it starts.
    item.classList.add('is-typing');
  };

  /** Reveal everything now and stop all pending timers. */
  const revealAll = (): void => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];

    for (const item of lines) {
      item.hidden = false;
      item.classList.remove('is-typing');
      item.classList.add('is-revealed');
    }

    index = lines.length;
    skip.hidden = true;
  };

  /**
   * Start the next line, scheduling the one after it.
   *
   * Timeouts are tracked so teardown can cancel them: a pending timer that fires
   * after the screen is unmounted would write into a detached node, and on a
   * fast navigation several could pile up.
   */
  const advance = (): void => {
    if (index >= lines.length) {
      skip.hidden = true;
      return;
    }

    const item = lines[index];
    const beat = BEATS[index];

    showLine(item);
    index += 1;

    const nextDelay = beatDuration(beat);
    timers.push(window.setTimeout(advance, nextDelay));
  };

  const onSkip = (): void => {
    revealAll();
  };

  const onContinue = (): void => {
    // Hands off to the next stop. nextStop inserts the under-construction
    // interstitial when the following scene is not built yet, so this needs no
    // special casing now or when landing-site is built.
    const next = nextStop('briefing');

    if (next === null) return;

    // Reaching the end of the journey is a real state, not an error, so say so
    // rather than leaving the button dead. That is the alternative to every
    // button on a screen silently doing nothing, which is the worst possible
    // failure for a child.
    if (next === 'debrief' && !hasNextStop) {
      hint.textContent = 'That is the end of the journey for now.';
      return;
    }

    navigate(next);
  };

  skip.addEventListener('click', onSkip);
  cont.addEventListener('click', onContinue);

  /*
   * Reduced motion, or no run in progress, means show everything at once.
   *
   * The `run === null` case matters: this screen is reachable by typing
   * `#/briefing` into the address bar, with no run behind it. Without this the
   * reveal would start against a run that does not exist.
   */
  if (prefersReducedMotion() || run === null || run.status !== 'active') {
    revealAll();
  } else {
    advance();
  }

  return () => {
    skip.removeEventListener('click', onSkip);
    cont.removeEventListener('click', onContinue);

    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };
}