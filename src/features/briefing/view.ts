/**
 * The mission briefing, read one beat at a time.
 *
 * DOM only. The words live in ./model and are unit tested there; this file is
 * just the drawing, one button, and the hand-off.
 *
 * The reader drives it. NEXT brings up the next line and nothing else does - the
 * screen holds still until asked. An earlier version revealed on a timer and
 * offered SKIP to jump ahead, which is the wrong shape for two reasons: it took
 * away the pace, and SKIP was a button whose only job was to do what NEXT does.
 *
 * There is no CONTINUE. The briefing is not optional, so a button that let you
 * leave before you had read it was the wrong affordance; and once every beat has
 * been shown there is nothing to decide, so the screen hands off to the next stop
 * by itself.
 *
 * That hand-off is the one timer in this file. It exists so the closing line can
 * be read before the scene changes underneath it - navigating in the same tick
 * that reveals the last beat would flash it past in a single frame. It is tracked
 * so teardown can cancel it, because a pending navigation firing after the player
 * has already gone somewhere else is exactly the sort of thing that looks like a
 * random jump.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './briefing.css';

import { BEATS, greetingFor } from './model';

/**
 * How long the final beat sits there before the screen moves on.
 *
 * The closing line is "Your crew is waiting. Are you ready?" - about forty
 * characters. This is a read-aloud pace for an eight-year-old, not a fixed
 * animation, and the point is that the screen waits for the child rather than the
 * child chasing the screen.
 */
const CLOSING_READ_MS = 2600;

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`briefing: missing required element ${selector}`);
  }

  return element;
}

export function mountBriefing(
  root: HTMLElement,
  run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  const greeting = require<HTMLParagraphElement>(root, '[data-briefing-greeting]');
  const stream = require<HTMLOListElement>(root, '[data-briefing-stream]');
  const advance = require<HTMLButtonElement>(root, '[data-briefing-next]');
  const yes = require<HTMLButtonElement>(root, '[data-briefing-yes]');
  const hint = require<HTMLParagraphElement>(root, '[data-briefing-hint]');

  greeting.textContent = greetingFor(run?.astronautName ?? '');

  // Every beat is built up front, hidden. NEXT then only un-hides them in order,
  // so the DOM order is the reading order and a screen reader gets the whole
  // briefing whether or not anyone clicks.
  const lines = BEATS.map((beat) => {
    const item = document.createElement('li');
    item.className = 'briefing__line';
    item.dataset.briefingLine = beat.id;
    item.textContent = beat.text;
    item.hidden = true;
    stream.appendChild(item);
    return item;
  });

  /** How many beats have been shown. The reader owns this by clicking. */
  let index = 0;
  let timers: number[] = [];

  /** The next stop, or null at the end of the journey. Resolved once, on mount. */
  const destination = nextStop('briefing');

  /**
   * Go on to the next scene.
   *
   * Any pending hand-off is cancelled first. Without that, pressing YES while the
   * fallback timer is still running leaves two navigations queued, and the second
   * fires on a screen that is already gone - which reads as the app jumping on
   * its own a moment after you told it where to go.
   */
  const goOn = (): void => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];

    if (destination === null) return;

    navigate(destination);
  };

  /**
   * Offer YES, and move on by itself if nobody does.
   *
   * The last beat asks "Are you ready?", so the answer deserves a button rather
   * than a countdown - a child who has already decided should not have to wait out
   * a timer to say so.
   *
   * The timer stays as a floor, not as the alternative: a screen that waits
   * forever for a click is a dead end, and anyone who drifted off without
   * pressing anything would be stranded on the closing line. YES is the fast path.
   *
   * Reaching the end of the journey is a real state, not an error, so it says so
   * and offers no button rather than leaving a control that silently does nothing.
   */
  const handOff = (): void => {
    if (destination === null) {
      hint.textContent = 'That is the end of the journey for now.';
      return;
    }

    yes.hidden = false;
    timers.push(window.setTimeout(goOn, CLOSING_READ_MS));
  };

  /**
   * Show the next unrevealed beat, or finish if there is none.
   *
   * The button hides itself on the last beat rather than disabling: a control
   * that has nothing left to do is noise, and a greyed-out button invites
   * pressing it twice to find out why.
   */
  const revealNext = (): void => {
    if (index >= lines.length) return;

    const item = lines[index];

    // Un-hide first, then mark it revealed. The class only decorates the
    // appearance; the content is readable the moment `hidden` comes off.
    //
    // An earlier version animated max-width from 0, which meant a line stayed
    // invisible whenever its animation did not run - leaving the briefing as an
    // empty column with a heading and two buttons.
    item.hidden = false;
    item.classList.remove('is-typing');
    item.classList.add('is-revealed');

    index += 1;

    if (index >= lines.length) {
      advance.hidden = true;
      handOff();
    }
  };

  advance.addEventListener('click', revealNext);
  yes.addEventListener('click', goOn);

  // The opening line is already on screen when you arrive; nobody should have to
  // click to find out what the screen is.
  revealNext();

  return () => {
    advance.removeEventListener('click', revealNext);
    yes.removeEventListener('click', goOn);

    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };
}