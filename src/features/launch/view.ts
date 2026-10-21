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
 * The reel is driven by the media, not the clock
 * -----------------------------------------------
 * A beat starts at the later of its scheduled slot and the moment its clip can
 * first be shown, and each beat chains on the clip before it ending. That is the
 * whole fix for the black-screen-and-skip behaviour on a slow connection (ISS-030):
 * a clip that has not buffered delays the next beat rather than being skipped, and
 * the hand-off waits for the last frame instead of firing at a fixed time.
 *
 * Only one film is on the wire at a time. The launch film loads up front, because
 * the title card and the two stills give it ~5s of cover; the docking clip and the
 * tour load when the beat before them starts. Each also carries a poster frame, so
 * a clip that is still buffering shows a picture rather than a black rectangle.
 *
 * The same hard-won rule as always still applies: **an animation is never
 * load-bearing.** Every shot's resting CSS state is the state that should be on
 * screen if no animation ever runs, and the end state is correct however it was
 * reached. Reduced motion does not shorten the runtime — it holds every picture
 * still for exactly as long as it would have moved, except the tour, whose
 * content is a sequence of captions.
 *
 * There is no skip. The screen's only exit is the hand-off when the last film
 * ends, which is why the schedule is derived in the model rather than typed here.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './launch.css';

import pressUrl from '../../../Assets/images/launch/press.webp';
import walkUrl from '../../../Assets/images/launch/walk.webp';
import launchVideoUrl from '../../../Assets/images/launch/launch-cinematic.mp4';
import launchPosterUrl from '../../../Assets/images/launch/launch-poster.webp';
import dockingVideoUrl from '../../../Assets/video/docking.mp4';
import dockingPosterUrl from '../../../Assets/video/docking-poster.webp';
import partsVideoUrl from '../../../Assets/video/parts.mp4';
import partsPosterUrl from '../../../Assets/video/parts-poster.webp';

import {
  DOCKING_DESCRIPTION,
  DOCKING_DURATION_MS,
  FADE_MS,
  PARTS_DESCRIPTION,
  PARTS_DURATION_MS,
  PRESS_SHOT,
  SHOTS,
  TITLE,
  TITLE_DURATION_MS,
  VIDEO_DESCRIPTION,
  VIDEO_DURATION_MS,
  resolveBeatStart,
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

/**
 * One film in the reel, and the runtime state that drives it.
 *
 * The fields the model could own (duration, the reduced-motion hold) are readonly
 * and set once; the rest is bookkeeping for the media-driven schedule.
 */
interface Beat {
  readonly el: HTMLVideoElement;
  readonly url: string;
  readonly posterUrl: string;
  readonly durationMs: number;
  /** The earliest this beat may start, in ms from mount. The previous beat moves it. */
  earliestMs: number;
  /** The frame reduced motion holds, or null when the clip plays anyway. */
  readonly holdSeconds: number | null;
  /** True once the clip has a frame to show. */
  ready: boolean;
  /** When the clip became ready, in ms from mount. 0 until it signals. */
  readyAtMs: number;
  /** True once this beat has started, so a beat cannot start twice. */
  started: boolean;
  /** When the beat actually started, in ms from mount. */
  startedAtMs: number;
  /** True until the beat before this one has finished. */
  awaitingPredecessor: boolean;
  /** A pending earliest-slot timer, or null. */
  timer: number | null;
  /** True once the src has been assigned, so a film loads once. */
  loaded: boolean;
  /** True once this beat's successor has been armed. */
  successorArmed: boolean;
  /** True when the clip failed, so the chain advances on its nominal duration. */
  failed: boolean;
  /** The `ended` listener, so teardown and an error can remove it. */
  endedHandler: (() => void) | null;
  /** The `loadeddata` listener, for teardown. */
  loadedHandler: (() => void) | null;
  /** The `seeked` listener, for teardown. */
  seekedHandler: (() => void) | null;
  /** The `error` listener, for teardown. */
  errorHandler: (() => void) | null;
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

  // ---------- THE REEL ----------
  const reduced = prefersReducedMotion();
  root.dataset.launchMotion = reduced ? 'reduced' : 'full';

  /*
   * Milliseconds from this mount, which is the only clock the schedule uses. The
   * stills run on CSS animations and need none of it; the films are timed from
   * here so that a beat that starts late pushes the beats after it, rather than
   * leaving them behind.
   */
  const mountedAt = performance.now();
  const now = (): number => performance.now() - mountedAt;

  const shotsTotal = SHOTS.reduce((total, shot) => total + shot.durationMs, 0);
  const filmBegins = TITLE_DURATION_MS + shotsTotal;
  const dockingBegins = filmBegins + VIDEO_DURATION_MS;
  const partsBegins = dockingBegins + DOCKING_DURATION_MS;

  const beats: Beat[] = [
    {
      el: video,
      url: launchVideoUrl,
      posterUrl: launchPosterUrl,
      durationMs: VIDEO_DURATION_MS,
      earliestMs: filmBegins,
      holdSeconds: REDUCED_MOTION_LAUNCH_SECONDS,
      ready: false,
      readyAtMs: 0,
      started: false,
      startedAtMs: 0,
      awaitingPredecessor: false,
      timer: null,
      loaded: false,
      successorArmed: false,
      failed: false,
      endedHandler: null,
      loadedHandler: null,
      seekedHandler: null,
      errorHandler: null,
    },
    {
      el: docking,
      url: dockingVideoUrl,
      posterUrl: dockingPosterUrl,
      durationMs: DOCKING_DURATION_MS,
      earliestMs: dockingBegins,
      holdSeconds: REDUCED_MOTION_DOCKING_SECONDS,
      ready: false,
      readyAtMs: 0,
      started: false,
      startedAtMs: 0,
      awaitingPredecessor: true,
      timer: null,
      loaded: false,
      successorArmed: false,
      failed: false,
      endedHandler: null,
      loadedHandler: null,
      seekedHandler: null,
      errorHandler: null,
    },
    {
      el: parts,
      url: partsVideoUrl,
      posterUrl: partsPosterUrl,
      durationMs: PARTS_DURATION_MS,
      earliestMs: partsBegins,
      holdSeconds: null,
      ready: false,
      readyAtMs: 0,
      started: false,
      startedAtMs: 0,
      awaitingPredecessor: true,
      timer: null,
      loaded: false,
      successorArmed: false,
      failed: false,
      endedHandler: null,
      loadedHandler: null,
      seekedHandler: null,
      errorHandler: null,
    },
  ];

  const destination = nextStop('launch');
  let handedOff = false;
  let handOffTimer: number | null = null;

  /** The screen's only exit: the next stop, once and only once. */
  const handOff = (): void => {
    if (handedOff) return;
    handedOff = true;

    if (destination !== null) navigate(destination);
  };

  /** Hand off on a timer, used when the last clip cannot signal its own end. */
  const armHandOff = (atMs: number): void => {
    if (handOffTimer !== null) window.clearTimeout(handOffTimer);
    handOffTimer = window.setTimeout(handOff, Math.max(0, atMs - now()));
  };

  /**
   * Give a film its src, but only once.
   *
   * Only the launch film is loaded at mount. The other two load here, when the
   * beat before them starts, so a re-arm cannot restart a load and only one film
   * is on the wire at a time.
   */
  const loadFilm = (beat: Beat): void => {
    if (beat.loaded) return;
    beat.loaded = true;

    // The poster is set here too, so a clip that is still buffering shows its
    // picture from the moment it is stacked, before its first frame arrives.
    beat.el.src = beat.url;
    beat.el.poster = beat.posterUrl;
    beat.el.muted = true;
    beat.el.preload = 'auto';
    beat.el.style.setProperty('--launch-video-fade', `${FADE_MS}ms`);
    beat.el.load();
  };

  /** Arm the earliest-slot timer for one beat. */
  const arm = (index: number, atMs: number): void => {
    const beat = beats[index];
    if (beat.timer !== null) window.clearTimeout(beat.timer);
    beat.timer = window.setTimeout(() => {
      beat.timer = null;
      begin(index);
    }, Math.max(0, atMs - now()));
  };

  /** Add the reveal class, then arm the hand-off or the next beat. */
  const startBeat = (index: number): void => {
    const beat = beats[index];
    beat.started = true;
    beat.startedAtMs = now();

    // The previous picture stays put; this one fades in over it. The resting state
    // is hidden, so a clip that never becomes ready leaves the one before it on
    // screen rather than a black rectangle.
    if (index > 0) beats[index - 1].el.pause();
    beat.el.classList.add('launch__on');

    if (reduced && beat.holdSeconds !== null) {
      // A held clip is already parked on its frame by the seek in `onLoaded`.
      beat.el.pause();
    } else {
      // Rewind first: the film element outlives this mount, and a player who
      // comes back to the screen after it ended would otherwise get nothing.
      beat.el.currentTime = 0;
      // A clip that refuses to play is treated as a failure, so the reel advances
      // on its nominal duration instead of stalling with nothing moving.
      void beat.el.play().catch(() => onError(index));
    }

    armSuccessor(index);
  };

  /**
   * Arm the beat after this one.
   *
   * A playing clip ends on its own, so the next beat chains on its `ended` — that
   * is what makes a stall delay the reel instead of cutting it. A held clip never
   * ends and a failed clip will not either, so both wait a timer instead.
   */
  const armSuccessor = (index: number): void => {
    const beat = beats[index];
    if (beat.successorArmed) return;
    beat.successorArmed = true;

    const useTimer = (reduced && beat.holdSeconds !== null) || beat.failed;
    const atMs = beat.startedAtMs + beat.durationMs;

    if (index + 1 >= beats.length) {
      if (useTimer) armHandOff(atMs);
      else armEnded(beat, handOff);
      return;
    }

    const next = beats[index + 1];
    loadFilm(next);
    next.awaitingPredecessor = false;

    if (useTimer) {
      next.earliestMs = atMs;
      arm(index + 1, atMs);
    } else {
      armEnded(beat, () => {
        next.earliestMs = now();
        begin(index + 1);
      });
    }
  };

  /** Chain a beat on a clip's `ended`, keeping the listener so it can be removed. */
  const armEnded = (beat: Beat, onEnded: () => void): void => {
    if (beat.endedHandler !== null) return;
    beat.endedHandler = onEnded;
    beat.el.addEventListener('ended', onEnded);
  };

  /**
   * Start a beat if its predecessor is done and it has a frame.
   *
   * `resolveBeatStart` is the policy: never before the earliest slot, never before
   * the clip is ready. A clip that is not ready yet simply waits, and the
   * `loadeddata`/`seeked` handler calls this again when it is.
   */
  const begin = (index: number): void => {
    const beat = beats[index];
    if (beat.started || beat.awaitingPredecessor) return;

    const start = resolveBeatStart(beat.earliestMs, beat.ready ? beat.readyAtMs : null);
    if (start > now()) {
      arm(index, start);
      return;
    }

    if (!beat.ready) return;
    startBeat(index);
  };

  /**
   * A clip has its first frame.
   *
   * Under reduced motion a held clip is parked on its representative frame instead
   * of being marked ready, and `seeked` finishes the job — the frame is the picture
   * the motion-sensitive player sees, so it has to exist before it is revealed.
   */
  const onLoaded = (index: number): void => {
    const beat = beats[index];

    if (reduced && beat.holdSeconds !== null) {
      beat.el.currentTime = beat.holdSeconds;
      return;
    }

    beat.ready = true;
    beat.readyAtMs = now();
    begin(index);
  };

  /** A held clip has finished seeking, so its frame can be revealed. */
  const onSeeked = (index: number): void => {
    const beat = beats[index];
    if (!(reduced && beat.holdSeconds !== null)) return;

    beat.ready = true;
    beat.readyAtMs = now();
    begin(index);
  };

  /**
   * A clip failed.
   *
   * The poster stays on screen and the chain moves on by the clip's nominal
   * duration, so a dead connection neither shows black nor hangs the screen. The
   * `ended` listener is dropped because a failed clip will never fire it.
   */
  const onError = (index: number): void => {
    const beat = beats[index];

    if (beat.endedHandler !== null) {
      beat.el.removeEventListener('ended', beat.endedHandler);
      beat.endedHandler = null;
    }

    if (!beat.started) {
      beat.started = true;
      beat.startedAtMs = Math.max(beat.earliestMs, beat.readyAtMs);
      beat.el.classList.add('launch__on');
    }

    beat.failed = true;
    if (beat.successorArmed) beat.successorArmed = false;
    armSuccessor(index);
  };

  beats.forEach((beat, index) => {
    beat.loadedHandler = () => onLoaded(index);
    beat.seekedHandler = () => onSeeked(index);
    beat.errorHandler = () => onError(index);

    beat.el.addEventListener('loadeddata', beat.loadedHandler);
    beat.el.addEventListener('seeked', beat.seekedHandler);
    beat.el.addEventListener('error', beat.errorHandler);
  });

  /*
   * Start the reel. The film's earliest slot is its beat in the sequence; whether
   * it starts then or later is decided by `begin` against its readiness.
   */
  if (destination !== null) {
    loadFilm(beats[0]);
    begin(0);
  }

  return () => {
    for (const beat of beats) {
      if (beat.timer !== null) window.clearTimeout(beat.timer);
      if (beat.endedHandler !== null) beat.el.removeEventListener('ended', beat.endedHandler);
      if (beat.loadedHandler !== null) beat.el.removeEventListener('loadeddata', beat.loadedHandler);
      if (beat.seekedHandler !== null) beat.el.removeEventListener('seeked', beat.seekedHandler);
      if (beat.errorHandler !== null) beat.el.removeEventListener('error', beat.errorHandler);

      // A torn-down screen must not keep playing — or holding a buffer — behind the
      // next one.
      beat.el.pause();
      beat.el.removeAttribute('src');
      beat.el.load();
      beat.el.classList.remove('launch__on');
    }

    if (handOffTimer !== null) window.clearTimeout(handOffTimer);
  };
}
