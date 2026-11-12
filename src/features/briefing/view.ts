/**
 * The mission briefing, read one beat at a time under the artwork.
 *
 * DOM only. The words live in ./model and are unit tested there; this file is
 * just the drawing, one button, the Enter key, and the hand-off.
 *
 * The reader drives it. NEXT (or Enter) swaps in the next line and nothing else
 * does - the screen holds still until asked. Each line REPLACES the one before
 * it, so the artwork stays the scene and the copy stays one spoken sentence
 * rather than a wall that grows down the screen. An earlier version stacked the
 * beats as they were revealed; that is the version this replaces.
 *
 * An even earlier version revealed on a timer and offered SKIP to jump ahead,
 * which is the wrong shape for two reasons: it took away the pace, and SKIP was
 * a button whose only job was to do what NEXT does.
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

import { readButton } from '../../ui/readButton';
import { stopReading } from '../../ui/readAloud';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';
import { playSfx } from '../../ui/sfx';

import './briefing.css';

import astronautUrl from '../../../Assets/images/briefing/astronaut.webp';

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
  const art = require<HTMLImageElement>(root, '[data-briefing-art]');
  const message = require<HTMLParagraphElement>(root, '[data-briefing-message]');
  const advance = require<HTMLButtonElement>(root, '[data-briefing-next]');
  const yes = require<HTMLButtonElement>(root, '[data-briefing-yes]');
  const hint = require<HTMLParagraphElement>(root, '[data-briefing-hint]');
  const actions = require<HTMLDivElement>(root, '[data-briefing-actions]');

  greeting.textContent = greetingFor(run?.astronautName ?? '');
  art.src = astronautUrl;

  /** Which beat is on screen. The reader owns this by clicking. */
  let index = 0;
  let timers: number[] = [];

  /** The next stop, or null at the end of the journey. Resolved once, on mount. */
  const destination = nextStop('briefing');

  /*
   * Read the line that is on screen, not the whole script: with one message at
   * a time, reading ahead would spoil the ending before the player has seen it.
   */
  const read = readButton(
    () => [greeting.textContent ?? '', message.textContent ?? ''].join(' ').trim(),
    {
      className: 'briefing__button briefing__button--read',
      ariaLabel: 'Read the briefing aloud',
      onStart: () => {
        /* The closing line is spoken, so the hand-off must not cut it off
           mid-sentence. It comes back on natural completion below. */
        for (const timer of timers) window.clearTimeout(timer);
        timers = [];
      },
      onStop: (completed) => {
        /* Resume only after a finished reading. A deliberate stop means the
           player is back in control, and YES is still on screen. */
        if (completed && index >= BEATS.length - 1) handOff();
      },
    },
  );

  if (read !== null) actions.append(read);

  /**
   * Go on to the next scene.
   *
   * Any pending hand-off is cancelled first. Without that, pressing YES while the
   * fallback timer is still running leaves two navigations queued, and the second
   * fires on a screen that is already gone - which reads as the app jumping on
   * its own a moment after you told it where to go.
   */
  const goOn = (): void => {
    stopReading();
    playSfx('yes-confirm');
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
   * Put one beat on screen.
   *
   * The text is written first, then the fade is restarted, so the animation
   * decorates the swap rather than gating it - the line is readable the instant
   * `textContent` lands, whatever the animation does.
   */
  const showBeat = (at: number): void => {
    message.textContent = BEATS[at].text;

    message.classList.remove('is-revealed');
    void message.offsetWidth;
    message.classList.add('is-revealed');
    playSfx('dialogue-pop');
  };

  /**
   * Show the next beat, or finish if the last one is already up.
   *
   * The button hides itself on the last beat rather than disabling: a control
   * that has nothing left to do is noise, and a greyed-out button invites
   * pressing it twice to find out why.
   */
  const revealNext = (): void => {
    if (index >= BEATS.length - 1) return;

    playSfx('dialogue-next');
    index += 1;
    showBeat(index);

    if (index >= BEATS.length - 1) {
      advance.hidden = true;
      handOff();
    }
  };

  /**
   * Enter advances, and confirms on the last beat.
   *
   * NEXT is the visible control, but a child reading with a keyboard should not
   * have to reach for the mouse: Enter does what NEXT does, and once the last
   * line is up it does what YES!! does.
   *
   * Ignored while a button or link has focus. Enter on a focused button already
   * fires a click, so handling it here as well would advance twice on one press.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target as HTMLElement | null;

    if (target !== null && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;

    event.preventDefault();

    if (yes.hidden) revealNext();
    else goOn();
  };

  advance.addEventListener('click', revealNext);
  yes.addEventListener('click', goOn);
  window.addEventListener('keydown', onKeyDown);

  // The opening line is already on screen when you arrive; nobody should have to
  // click to find out what the screen is.
  showBeat(0);

  return () => {
    advance.removeEventListener('click', revealNext);
    yes.removeEventListener('click', goOn);
    window.removeEventListener('keydown', onKeyDown);
    stopReading();

    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };
}