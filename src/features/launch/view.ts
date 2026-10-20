/**
 * The launch cinematic: two stills, three films, and the hand-off.
 *
 * The stills are the departure — the press conference, the walk to the rocket —
 * and the films are what follows: the launch, the Orion docking with the
 * transfer vehicle, then a tour of the assembled craft. Each film is a rendered
 * MP4 imported below, so its camera moves, its shake and its grade are already in
 * the picture; this file only decides *when* each beat plays. The title card
 * holds, lifts, the stills cross-dissolve under it, the launch film
 * cross-dissolves in over the walk shot, and the screen hands itself to the next
 * stop the moment the last film ends.
 *
 * The same hard-won rule as always still applies: **an animation is never
 * load-bearing.** Every shot's resting CSS state is the state that should be on
 * screen if no animation ever runs, and the end state is correct however it was
 * reached. Reduced motion does not shorten the runtime — it holds every picture
 * still for exactly as long as it would have moved, except the tour, whose
 * content is a sequence of captions.
 *
 * There is no skip. The screen's only exit is the hand-off timer below, which
 * makes it the most load-bearing line in the feature, and the reason
 * TOTAL_DURATION_MS is derived in the model rather than typed here.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './launch.css';

import pressUrl from '../../../Assets/images/launch/press.webp';
import walkUrl from '../../../Assets/images/launch/walk.webp';
import launchVideoUrl from '../../../Assets/images/launch/launch-cinematic.mp4';
import dockingVideoUrl from '../../../Assets/video/docking.mp4';
import partsVideoUrl from '../../../Assets/video/parts.mp4';

import {
  DOCKING_DESCRIPTION,
  DOCKING_DURATION_MS,
  FADE_MS,
  PARTS_DESCRIPTION,
  PRESS_SHOT,
  SHOTS,
  TITLE,
  TITLE_DURATION_MS,
  TOTAL_DURATION_MS,
  VIDEO_DESCRIPTION,
  VIDEO_DURATION_MS,
  type Shot,
} from './model';

/** The two stills, by the key the model gives them. Keeps the model DOM-free. */
const IMAGES: Readonly<Record<Shot['image'], string>> = {
  press: pressUrl,
  walk: walkUrl,
};

/**
 * Which frame of the launch film reduced motion holds, in seconds.
 *
 * The first shot of the film is the pad, and 0.5s is safely inside it — the
 * same "rest on the opening frame" choice the stills make, where the first
 * shot is the one held because both cannot be shown at once.
 */
const REDUCED_MOTION_LAUNCH_SECONDS = 0.5;

/**
 * Which frame of the docking clip reduced motion holds, in seconds.
 *
 * After contact at 1.8s and the flash's 0.25s decay, so the held frame is the
 * finished joint with its latch ring lit — the result, not the collision.
 */
const REDUCED_MOTION_DOCKING_SECONDS = 2.4;

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
  const video = require<HTMLVideoElement>(root, '[data-launch-video]');
  const docking = require<HTMLVideoElement>(root, '[data-launch-docking]');
  const parts = require<HTMLVideoElement>(root, '[data-launch-parts]');
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
   * Both stills are `alt=""` and hidden from assistive technology, because they
   * are shown one after another with movement between them: two alt attributes
   * would both be read at once, in markup order, describing a scene that is not
   * the one being looked at. The film is a single video element, so its
   * description is announced once, the way a single clip would be.
   */
  description.textContent =
    SHOTS.map((shot) => shot.alt).join(' ') +
    ' ' + VIDEO_DESCRIPTION +
    ' ' + DOCKING_DESCRIPTION +
    ' ' + PARTS_DESCRIPTION;

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
  stage.style.setProperty('--launch-title-out-dur', `${FADE_MS}ms`);
  stage.style.setProperty('--launch-title-out-delay', `${TITLE_DURATION_MS - FADE_MS}ms`);
  stage.style.setProperty('--launch-flash-dur', `${PRESS_SHOT.durationMs}ms`);

  // Held on the flash element so check-markup can confirm the hand-written CSS
  // keyframes still describe the same three spikes as the model's FLASH_TIMES.
  flash.dataset.launchFlashCount = String(SHOTS.filter((shot) => shot.hasPress).length);

  /*
   * The launch film cross-dissolves in over the walk shot, beginning one fade
   * before the walk shot ends so the two cross the way the stills do. It is
   * parked on its first frame until playback begins, so the dissolve reveals a
   * picture and not a black rectangle.
   *
   * The two clips that follow start exactly when the film before them ends. Both
   * open on black, so each element's fade-in reads as a fade through black rather
   * than a hard cut.
   */
  const filmBegins = TITLE_DURATION_MS + SHOTS.reduce((total, shot) => total + shot.durationMs, 0);
  const dockingBegins = filmBegins + VIDEO_DURATION_MS;
  const partsBegins = dockingBegins + DOCKING_DURATION_MS;

  /*
   * Muted in the markup too, so the films can play without a user gesture. The
   * property is the one that counts; the attribute alone does not stick in every
   * engine.
   */
  video.src = launchVideoUrl;
  video.muted = true;
  video.currentTime = 0;
  video.style.setProperty('--launch-video-fade', `${FADE_MS}ms`);
  video.style.setProperty('--launch-video-delay', `${filmBegins - FADE_MS}ms`);

  docking.src = dockingVideoUrl;
  docking.muted = true;
  docking.currentTime = 0;
  docking.style.setProperty('--launch-video-fade', `${FADE_MS}ms`);
  docking.style.setProperty('--launch-clip-delay', `${dockingBegins}ms`);

  parts.src = partsVideoUrl;
  parts.muted = true;
  parts.currentTime = 0;
  parts.style.setProperty('--launch-video-fade', `${FADE_MS}ms`);
  parts.style.setProperty('--launch-clip-delay', `${partsBegins}ms`);

  root.dataset.launchMotion = prefersReducedMotion() ? 'reduced' : 'full';

  /**
   * Start a film, or hold it on one frame.
   *
   * Reduced motion seeks to the still and pauses there. The seek is applied
   * once the metadata arrives, which every engine does on its own — setting
   * `currentTime` before that is the default playback start position, not a
   * no-op — so the frame is on screen by the time the film fades in.
   */
  const beginLaunchFilm = (): void => {
    if (root.dataset.launchMotion === 'reduced') {
      video.currentTime = REDUCED_MOTION_LAUNCH_SECONDS;
      video.pause();
      return;
    }

    // Rewind first: the film element outlives this mount, and a player who
    // comes back to the screen after it ended would otherwise get nothing.
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const beginDocking = (): void => {
    video.pause();

    if (root.dataset.launchMotion === 'reduced') {
      docking.currentTime = REDUCED_MOTION_DOCKING_SECONDS;
      docking.pause();
      return;
    }

    docking.currentTime = 0;
    void docking.play().catch(() => undefined);
  };

  /*
   * The tour plays under reduced motion too. Its content is four captions in
   * sequence: holding it on one frame would show the first part and hide the
   * other three, which is less information, not less movement.
   */
  const beginParts = (): void => {
    docking.pause();
    parts.currentTime = 0;
    void parts.play().catch(() => undefined);
  };

  /*
   * The timers, and the only way off the screen.
   *
   * There is no skip. One consequence worth writing down: if these never fire
   * the player is stuck, so they come from constants derived in the model
   * rather than from a measurement, and the feature is arranged so that the
   * only thing that can go wrong on the way in is a loud throw from `require`.
   */
  let startLaunchFilm: number | null = null;
  let startDocking: number | null = null;
  let startParts: number | null = null;
  let handOff: number | null = null;
  const destination = nextStop('launch');

  if (destination !== null) {
    startLaunchFilm = window.setTimeout(beginLaunchFilm, filmBegins);
    startDocking = window.setTimeout(beginDocking, dockingBegins);
    startParts = window.setTimeout(beginParts, partsBegins);
    handOff = window.setTimeout(() => navigate(destination), TOTAL_DURATION_MS);
  }

  return () => {
    if (startLaunchFilm !== null) window.clearTimeout(startLaunchFilm);
    if (startDocking !== null) window.clearTimeout(startDocking);
    if (startParts !== null) window.clearTimeout(startParts);
    if (handOff !== null) window.clearTimeout(handOff);
    // A torn-down screen must not keep playing behind the next one.
    video.pause();
    docking.pause();
    parts.pause();
    startLaunchFilm = null;
    startDocking = null;
    startParts = null;
    handOff = null;
  };
}
