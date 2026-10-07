/**
 * The mission briefing, read one beat at a time.
 *
 * DOM only. The words live in ./model and are unit tested there; this file is
 * just the drawing and the two buttons.
 *
 * The reader drives it. NEXT brings up the next line and nothing else does - the
 * screen holds still until asked. An earlier version revealed on a timer and
 * offered SKIP to jump ahead, which is the wrong shape for two reasons: it took
 * away the pace, and SKIP was a button whose only job was to do what NEXT does.
 * One control, one action.
 *
 * There are no timers in this file at all now, which is why teardown is two
 * removeEventListener calls. The reveal has nothing outstanding to cancel, so it
 * cannot fire into a detached node or arrive after the player has moved on.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './briefing.css';

import { BEATS, greetingFor } from './model';

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
  const cont = require<HTMLButtonElement>(root, '[data-briefing-continue]');
  const hint = require<HTMLParagraphElement>(root, '[data-briefing-hint]');

  // True when continue has somewhere real to go. If the briefing is the last
  // built screen, the button says so instead of doing nothing.
  const hasNextStop = nextStop('briefing') !== null;

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

  /**
   * Show the next unrevealed beat, or get out of the way when there is none.
   *
   * The button hides itself on the last beat rather than disabling: a control
   * that has nothing left to do is noise, and a greyed-out button invites
   * pressing it twice to find out.
   */
  const revealNext = (): void => {
    if (index >= lines.length) {
      advance.hidden = true;
      return;
    }

    const item = lines[index];

    // Un-hide first, then mark it revealed. The class only decorates the
    // appearance; the content is readable the moment `hidden` comes off.
    //
    // An earlier version animated max-width from 0, which meant a line stayed
    // invisible whenever its animation did not run â€” leaving the briefing as an
    // empty column with a heading and two buttons.
    item.hidden = false;
    item.classList.remove('is-typing');
    item.classList.add('is-revealed');

    index += 1;

    if (index >= lines.length) advance.hidden = true;
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

  advance.addEventListener('click', revealNext);
  cont.addEventListener('click', onContinue);

  // The opening line is already on screen when you arrive; nobody should have to
  // click to find out what the screen is.
  revealNext();

  return () => {
    advance.removeEventListener('click', revealNext);
    cont.removeEventListener('click', onContinue);
  };
}