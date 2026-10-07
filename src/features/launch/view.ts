/**
 * The launch cinematic: two stills, a title card, and the camera moves between them.
 *
 * Almost nothing here is JavaScript. Every camera move, dissolve, letterbox bar and
 * camera flash is a CSS animation whose *duration and delay* are written onto the
 * elements from the model. That is deliberate, and it is the opposite of the supply
 * screen, which needed timers because its content had to wait for clicks.
 *
 * A cinematic is made entirely of animation, and animation is exactly what has
 * broken this project three times: content hidden behind a width animation, a button
 * that could not be clicked because of an ancestor's `pointer-events`, and a screen
 * that ignored `hidden` because something set `display`. All three looked correct
 * in a screenshot. So the rule this file is written to is the one agreed for the
 * transitions: **an animation is never load-bearing.** Nothing is revealed by its
 * animation completing, and the end state is correct however it was reached.
 *
 * That leaves exactly one timer: the hand-off. It is tracked and teardown cancels
 * it. There is no skip — the screen's only exit is this timer — which makes it the
 * most load-bearing line in the feature, and the reason TOTAL_DURATION_MS is
 * derived from the shots rather than typed beside them.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './launch.css';

import pressUrl from '../../../Assets/images/launch/press.webp';
import walkUrl from '../../../Assets/images/launch/walk.webp';

import {
  BARS_MS,
  PRESS_SHOT,
  SHOTS,
  TITLE,
  TITLE_DURATION_MS,
  TOTAL_DURATION_MS,
  type Shot,
} from './model';

/** The two stills, by the key the model gives them. Keeps the model DOM-free. */
const IMAGES: Readonly<Record<Shot['image'], string>> = {
  press: pressUrl,
  walk: walkUrl,
};

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`launch: missing required element ${selector}`);
  }

  return element;
}

/** True when the visitor asked for less motion. Read live, not once at boot. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function mountLaunch(
  root: HTMLElement,
  // A cutscene has no use for the run. Underscored to match the other screens'
  // convention for a parameter the shell passes and this feature does not need.
  _run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  const stage = require<HTMLDivElement>(root, '[data-launch-stage]');
  const title = require<HTMLParagraphElement>(root, '[data-launch-title]');
  const flash = require<HTMLDivElement>(root, '[data-launch-flash]');
  const description = require<HTMLParagraphElement>(root, '[data-launch-description]');

  const shots = [...root.querySelectorAll<HTMLElement>('[data-launch-shot]')];

  if (shots.length !== SHOTS.length) {
    // Loud on purpose. A mismatch means the markup and the model have drifted, and
    // the symptom would otherwise be a shot that silently never appears.
    throw new Error(
      `launch: model declares ${SHOTS.length} shot(s) but index.html has ${shots.length}`,
    );
  }

  title.textContent = TITLE;

  /*
   * One passage describing the whole sequence, rather than an alt on each frame.
   *
   * Both images are `alt=""` and hidden from assistive technology, because they are
   * shown one after another with movement between them: two alt attributes would
   * both be read at once, in markup order, describing a scene that is not the one
   * being looked at. The copy still comes from the model, so it is still tested.
   */
  description.textContent = SHOTS.map((shot) => shot.alt).join(' ');

  /*
   * Drive every shot off the title's duration.
   *
   * Each animation needs a start time, and deriving them all from one running
   * offset is what stops the first camera move beginning over the title card. That
   * overlap is invisible in the markup and obvious on screen.
   */
  let offset = TITLE_DURATION_MS;

  for (const [i, shot] of SHOTS.entries()) {
    const node = shots[i];
    const image = require<HTMLImageElement>(node, '[data-launch-img]');

    image.src = IMAGES[shot.image];
    node.dataset.launchIndex = String(shot.index);

    node.style.setProperty('--launch-fade', `${shot.fadeMs}ms`);
    node.style.setProperty('--launch-shot-delay', `${offset}ms`);

    /*
     * The camera move lasts the whole shot, not its fade. Trimming it to the fade
     * would finish the push while the picture was still arriving, and would pull
     * the second shot's camera back to its start frame on every loop.
     *
     * Linear on purpose: an ease-in-out stalls at the start and sprints at the end,
     * which reads as a lurch rather than a camera move.
     */
    node.style.setProperty('--launch-camera-dur', `${shot.durationMs}ms`);
    node.style.setProperty('--launch-camera-from', shot.camera.from);
    node.style.setProperty('--launch-camera-to', shot.camera.to);
    node.style.setProperty('--launch-camera-origin', shot.camera.origin);

    offset += shot.durationMs;
  }

  /*
   * The title card fades out over the same span as the first shot fades in, ending
   * where that fade begins — so the two cross rather than leaving a gap or
   * overlapping into a double-dark.
   */
  stage.style.setProperty('--launch-title-out-dur', `${SHOTS[0].fadeMs}ms`);
  stage.style.setProperty('--launch-title-out-delay', `${TITLE_DURATION_MS - SHOTS[0].fadeMs}ms`);
  stage.style.setProperty('--launch-bars-dur', `${BARS_MS}ms`);
  stage.style.setProperty('--launch-flash-dur', `${PRESS_SHOT.durationMs}ms`);

  // Held on the flash element so check-markup can confirm the hand-written CSS
  // keyframes still describe the same three spikes as the model's FLASH_TIMES.
  flash.dataset.launchFlashCount = String(SHOTS.filter((shot) => shot.hasPress).length);

  /*
   * Reduced motion removes the movement and keeps everything else.
   *
   * The CSS holds the first shot and drops the second, because both at once would
   * just stack and the later one would win. What matters is that the title and a
   * picture are still there for the same length of time.
   */
  root.dataset.launchMotion = prefersReducedMotion() ? 'reduced' : 'full';

  /*
   * The only timer in this feature, and the only way off the screen.
   *
   * There is no skip. One consequence worth writing down: if this never fires the
   * player is stuck, so it comes from a constant derived from the shots rather than
   * from a measurement, and the feature is arranged so that the only thing that can
   * go wrong on the way in is a loud throw from `require`.
   */
  let handOff: number | null = null;
  const destination = nextStop('launch');

  if (destination !== null) {
    handOff = window.setTimeout(() => navigate(destination), TOTAL_DURATION_MS);
  }

  return () => {
    if (handOff !== null) window.clearTimeout(handOff);
    handOff = null;
  };
}