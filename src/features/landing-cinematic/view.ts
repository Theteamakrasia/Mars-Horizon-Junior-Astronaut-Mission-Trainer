/**
 * The landing cinematic: the film that plays between the landing-site map and
 * the outpost.
 *
 * Five supplied frames, played as one shot: the approach to Mars, a black
 * beat, the parachute coming down closer and closer, and the landing. Then the
 * outpost, which is where the player has been going the whole time.
 *
 * One clock
 * ---------
 * Everything on screen is written from a single `requestAnimationFrame` loop
 * and a single number: the milliseconds of film that have been played. The
 * camera, the dissolves, the wobble, the sway, the haze and the flash are all
 * read out of the model at that one moment.
 *
 * That is the whole reason for this shape. A film driven by a dozen CSS
 * animations and a dozen timers cannot be paused, skipped or cleaned up
 * reliably: something is always left running, and something is always late.
 * Here, skipping is "stop the loop and hand over", pausing is "do not add to
 * the number", and cleaning up is "cancel one frame request and remove two
 * listeners".
 *
 * Nothing but `transform` and `opacity` is ever written. The frames are
 * NASA's, and the game's job is to show them, not to grade them: there is no
 * filter anywhere in this feature.
 *
 * The pictures are decoded before the clock starts, so the film never begins
 * on a half-drawn frame and never flashes white between two scenes. The wait
 * happens behind black, which is the first thing on screen anyway.
 *
 * Styles go in ./landing-cinematic.css, imported here. Do not add a line to
 * src/style.css — that is the landing page's stylesheet (AGENTS.md R-15).
 */

import { h } from '../../dom/h';
import { focusHandlesEnter, isPlainEnter } from '../../dom/keys';
import { factById, zoneFact, type NasaFact } from '../../data/landingFacts';
import { REGIONS, regionById } from '../../sim/regions';
import type { RunState } from '../../sim/run';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import { playHandoffFade } from '../../ui/handoffFade';

import {
  BEATS,
  SKIP_DESCRIPTION,
  SKIP_LABEL,
  TOTAL_DURATION_MS,
  cameraTransformAt,
  captionBeatAt,
  captionOpacityAt,
  flashOpacityAt,
  hazeOpacityAt,
  imageOpacityAt,
  shakeAt,
  swayAt,
  type Beat,
  type CinematicImage,
} from './model';

import './landing-cinematic.css';

/* Typed asset imports, so Vite fingerprints these and emits them into dist/. */
import approachUrl from '../../../Assets/images/landing-cinematic/02-approach.jpeg';
import chuteFarUrl from '../../../Assets/images/landing-cinematic/03-chute-far.jpeg';
import chuteMidUrl from '../../../Assets/images/landing-cinematic/04-chute-mid.jpeg';
import chuteNearUrl from '../../../Assets/images/landing-cinematic/05-chute-near.jpeg';
import chuteLandingUrl from '../../../Assets/images/landing-cinematic/06-chute-landing.jpeg';

/** The five frames, by the key the model gives them. Keeps the model DOM-free. */
const IMAGES: Readonly<Record<CinematicImage, string>> = {
  approach: approachUrl,
  chuteFar: chuteFarUrl,
  chuteMid: chuteMidUrl,
  chuteNear: chuteNearUrl,
  chuteLanding: chuteLandingUrl,
};

/** How long the screen takes to fade to black when the player skips. */
const SKIP_FADE_MS = 260;

/** How long the film waits for the pictures before it gives up and starts anyway. */
const PRELOAD_TIMEOUT_MS = 2000;

/** How many stars hang in the sky of the approach frame. */
const STAR_COUNT = 18;

/** How many streaks of dust fly past the spacecraft. */
const STREAK_COUNT = 6;

/** How many motes of dust drift across the chute frames. */
const DUST_COUNT = 26;

/**
 * A tiny deterministic generator, so the dust is the same dust every time.
 *
 * The film is the same film on every run: the same stars in the same places,
 * the same motes of dust. A screen that reshuffles its own decoration each
 * time it is opened looks like a different picture each time.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
}

/** One picture in the film, and the elements that move with it. */
interface SceneLayer {
  readonly beat: Beat;
  /** The layer the dissolve happens on. */
  readonly scene: HTMLElement;
  /** The frame the camera moves. */
  readonly frame: HTMLElement;
  /** The dust haze over the landing frame. */
  readonly haze: HTMLElement | null;
  /** The flash of light as the capsule touches down. */
  readonly flash: HTMLElement | null;
}

/** True when the visitor asked for less motion. Read live, not once at boot. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mount the cinematic into `root` and return a teardown.
 *
 * The region comes off the run, which `landing-site` has already set: the
 * player chose the site, pressed Land here, and the run says where they are
 * going. A deep link with no run falls back to Jezero Crater rather than
 * throwing, the way the build screen falls back to a run of its own.
 */
export function mountLandingCinematic(
  root: HTMLElement,
  run: RunState | null,
  // The cinematic creates no state of its own. Underscored to match the other
  // screens' convention for a parameter the shell passes and this feature does
  // not need.
  _setRun: (next: RunState | null) => void,
): () => void {
  const region = regionById(run?.regionId ?? '') ?? REGIONS[0];

  const reduced = prefersReducedMotion();
  root.dataset.landingMotion = reduced ? 'reduced' : 'full';

  /* ---------- THE PICTURES ---------- */

  const layers: SceneLayer[] = [];
  const pictures: HTMLImageElement[] = [];

  for (const beat of BEATS) {
    if (beat.image === null) continue;

    const image = h('img', {
      class: 'landing-cinematic__image',
      src: IMAGES[beat.image],
      alt: '',
      'aria-hidden': 'true',
      decoding: 'async',
    });

    const frame = h('div', { class: 'landing-cinematic__frame' }, image);

    frame.style.setProperty('--landing-camera-origin', beat.camera?.origin ?? '50% 50%');

    const overlay = buildOverlay(beat);
    const haze = overlay.querySelector<HTMLElement>('.landing-cinematic__haze');
    const flash = overlay.querySelector<HTMLElement>('.landing-cinematic__flash');

    const scene = h('div', { class: 'landing-cinematic__scene' }, frame, overlay);

    layers.push({ beat, scene, frame, haze, flash });
    pictures.push(image);
  }

  /* ---------- THE WORDS ---------- */

  const label = h('p', { class: 'landing-cinematic__caption-label' });
  const headline = h('p', { class: 'landing-cinematic__caption-headline' });
  const title = h('p', { class: 'landing-cinematic__caption-title' });
  const factLines = [
    h('p', { class: 'landing-cinematic__caption-fact' }),
    h('p', { class: 'landing-cinematic__caption-fact' }),
  ];
  const source = h('p', { class: 'landing-cinematic__caption-source' });

  const caption = h(
    'div',
    { class: 'landing-cinematic__caption' },
    label,
    headline,
    title,
    ...factLines,
    source,
  );

  /* The spoken version of the same words, for anyone who cannot see them. */
  const spoken = h('p', {
    class: 'landing-cinematic__visually-hidden',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  /* ---------- THE SKIP BUTTON ---------- */

  const skip = h(
    'button',
    {
      class: 'landing-cinematic__skip',
      type: 'button',
      'aria-label': SKIP_DESCRIPTION,
    },
    SKIP_LABEL,
  );

  const stage = h(
    'div',
    {
      class: 'landing-cinematic__stage',
      role: 'dialog',
      'aria-label': 'Landing sequence',
    },
    ...layers.map((layer) => layer.scene),
    caption,
    skip,
    spoken,
  );

  root.replaceChildren(stage);

  /* ---------- THE CLOCK ---------- */

  let elapsed = 0;
  let last = performance.now();
  let frameId = 0;
  let started = false;
  let finished = false;
  let paused = false;
  let captionBeatId: string | null = null;
  /** The timer that carries a skipped film to the hand-off. */
  let skipTimer = 0;

  /**
   * Write the whole film for one moment.
   *
   * Every value here is read out of the model at `t`, so there is one source
   * of truth for what the screen looks like at any point in the film.
   */
  function paint(t: number): void {
    for (const layer of layers) {
      const opacity = imageOpacityAt(layer.beat, t);

      layer.scene.style.opacity = opacity.toFixed(3);

      if (opacity <= 0) continue;

      layer.frame.style.transform = reduced
        ? 'none'
        : cameraTransformAt(layer.beat, t);

      if (reduced) {
        layer.scene.style.transform = 'none';
      } else {
        const shake = shakeAt(layer.beat, t);
        const sway = swayAt(layer.beat, t);

        layer.scene.style.transform = `translate3d(${shake.x}px, ${shake.y}px, 0) rotate(${sway}deg)`;
      }

      if (layer.haze !== null) {
        layer.haze.style.opacity = hazeOpacityAt(layer.beat, t).toFixed(3);
      }

      if (layer.flash !== null) {
        layer.flash.style.opacity = flashOpacityAt(t).toFixed(3);
      }
    }

    const beat = captionBeatAt(t);

    if (beat !== null && beat.id !== captionBeatId) {
      captionBeatId = beat.id;
      renderCaption(beat);
    }

    caption.style.opacity =
      beat === null ? '0' : captionOpacityAt(beat, t).toFixed(3);
  }

  /**
   * Fill the lower third for one beat.
   *
   * The words are replaced rather than added to, so the panel never grows
   * from three lines to five, and the live region is written with the same
   * words so a screen reader says what is on the screen.
   */
  function renderCaption(beat: Beat): void {
    const facts = factsFor(beat);

    label.textContent = beat.caption.label;
    headline.textContent = beat.caption.headline;
    title.textContent = titleFor(beat);

    for (const [index, line] of factLines.entries()) {
      line.textContent = facts[index]?.text ?? '';
    }

    source.textContent = facts.length === 0 ? '' : `Source: NASA · ${facts[0]?.source ?? ''}`;

    spoken.textContent = [beat.caption.label, beat.caption.headline, titleFor(beat), ...facts.map((fact) => fact.text)]
      .filter((line) => line !== '')
      .join('. ');
  }

  /** The title for a beat: the region's name, or "Landing at <region>". */
  function titleFor(beat: Beat): string {
    if (beat.caption.title === 'zone') return region.name;
    if (beat.caption.title === 'landing') return `Landing at ${region.name}`;

    return '';
  }

  /**
   * The facts a beat teaches.
   *
   * `zone` means the fact about the region the player chose. A fact that
   * cannot be found is a mistake in the data file, and it is reported rather
   * than quietly swallowed: the line is left out and the console says so.
   */
  function factsFor(beat: Beat): readonly NasaFact[] {
    const found: NasaFact[] = [];

    for (const id of beat.caption.factIds) {
      const fact = id === 'zone' ? zoneFact(region.id) : factById(id);

      if (fact === null) {
        console.warn(`[landing-cinematic] no NASA fact for "${id}" — the line is left out.`);
        continue;
      }

      found.push(fact);
    }

    return found;
  }

  /** One frame of the film. */
  function frame(now: number): void {
    const delta = now - last;
    last = now;

    if (!paused) elapsed = Math.min(TOTAL_DURATION_MS, elapsed + delta);

    paint(elapsed);

    if (elapsed >= TOTAL_DURATION_MS) {
      finish();
      return;
    }

    frameId = window.requestAnimationFrame(frame);
  }

  /** Start the film, once. */
  function start(): void {
    if (started || finished) return;

    started = true;
    last = performance.now();
    frameId = window.requestAnimationFrame(frame);
  }

  /** The film is over. */
  function finish(): void {
    if (finished) return;

    finished = true;

    if (frameId !== 0) window.cancelAnimationFrame(frameId);
    frameId = 0;

    root.classList.add('is-finished');

    handOff();
  }

  /**
   * The player cut the film short.
   *
   * The film fades to black and then the outpost arrives, exactly as it does
   * when the film runs to its end: the same hand-off, so there is one way out
   * of this screen and not two.
   */
  function onSkip(): void {
    if (finished) return;

    finished = true;

    if (frameId !== 0) window.cancelAnimationFrame(frameId);
    frameId = 0;

    root.classList.add('is-finished');
    stage.classList.add('is-closing');

    skipTimer = window.setTimeout(() => {
      handOff();
    }, SKIP_FADE_MS);
  }

  /**
   * Hand the player over to the outpost.
   *
   * The black curtain is put up first, so the cut from the film to the
   * outpost is a fade and not a jump: the curtain lifts over the outpost as it
   * arrives. The outpost screen itself is not touched by any of this.
   */
  function handOff(): void {
    const destination = nextStop('landing-cinematic') ?? 'base';

    playHandoffFade();
    navigate(destination);
  }

  /** A plain Enter, or Escape, cuts the film. */
  function onKeyDown(event: KeyboardEvent): void {
    if (finished) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onSkip();

      return;
    }

    if (!isPlainEnter(event.key, { alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey })) {
      return;
    }

    /* A focused button already deals with Enter itself, and answering it here
       as well would cut the film twice on one press. */
    const target = event.target as HTMLElement | null;

    if (target !== null && focusHandlesEnter(target.tagName)) return;

    event.preventDefault();
    onSkip();
  }

  /** A hidden tab freezes the film where it stands. */
  function onVisibility(): void {
    if (document.hidden) {
      paused = true;
      root.classList.add('is-paused');

      return;
    }

    paused = false;
    root.classList.remove('is-paused');

    /* The time in the tab was not film time, so it is not counted. */
    last = performance.now();
  }

  /* ---------- THE OVERLAYS ---------- */

  /**
   * The decoration on one frame.
   *
   * Every piece of it is drawn in the palette of the picture it sits on: a
   * blue engine glow and a warm sun flare in space, warm dust in the Martian
   * sky, and dust haze over the landing. Nothing here is drawn over the
   * subject of the shot.
   */
  function buildOverlay(beat: Beat): HTMLElement {
    const overlay = h('div', { class: 'landing-cinematic__overlay' });

    if (beat.overlay === 'space') {
      const random = seeded(20260211);

      overlay.append(
        h('div', { class: 'landing-cinematic__glow', 'aria-hidden': 'true' }),
        h('div', { class: 'landing-cinematic__flare', 'aria-hidden': 'true' }),
      );

      for (let i = 0; i < STAR_COUNT; i += 1) {
        const star = h('span', { class: 'landing-cinematic__star', 'aria-hidden': 'true' });

        star.style.setProperty('--x', `${(random() * 96 + 2).toFixed(2)}%`);
        star.style.setProperty('--y', `${(random() * 62 + 2).toFixed(2)}%`);
        star.style.setProperty('--s', `${(random() * 1.6 + 1).toFixed(2)}px`);
        star.style.setProperty('--d', `${Math.round(random() * 3200)}ms`);

        overlay.append(star);
      }

      for (let i = 0; i < STREAK_COUNT; i += 1) {
        const streak = h('span', { class: 'landing-cinematic__streak', 'aria-hidden': 'true' });

        streak.style.setProperty('--y', `${(random() * 70 + 6).toFixed(2)}%`);
        streak.style.setProperty('--d', `${Math.round(random() * 3200)}ms`);

        overlay.append(streak);
      }

      return overlay;
    }

    if (beat.overlay === 'dust') {
      const random = seeded(20260211 + beat.startMs);

      for (let i = 0; i < DUST_COUNT; i += 1) {
        const mote = h('span', { class: 'landing-cinematic__dust', 'aria-hidden': 'true' });

        mote.style.setProperty('--x', `${(random() * 100).toFixed(2)}%`);
        mote.style.setProperty('--y', `${(random() * 72 + 12).toFixed(2)}%`);
        mote.style.setProperty('--s', `${(random() * 2.6 + 1).toFixed(2)}px`);
        mote.style.setProperty('--o', (random() * 0.35 + 0.18).toFixed(2));
        mote.style.setProperty('--d', `${Math.round(random() * 5600)}ms`);

        overlay.append(mote);
      }

      return overlay;
    }

    overlay.append(
      h('div', { class: 'landing-cinematic__haze', 'aria-hidden': 'true' }),
      h('div', { class: 'landing-cinematic__flash', 'aria-hidden': 'true' }),
    );

    return overlay;
  }

  /* ---------- WIRING ---------- */

  skip.addEventListener('click', onSkip);
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);

  /*
    Decode every picture before the clock starts.

    `decode()` resolves when the browser can paint the image without doing
    more work, which is exactly what the film needs: no half-drawn frame at
    the start, and no white flash between two scenes. The wait happens behind
    black, which is what is on screen anyway.
  */
  const decoded = Promise.all(
    pictures.map((picture) =>
      picture.decode().catch(() => {
        /* A picture that will not decode leaves its layer empty. The film
           still plays: a missing frame is better than a screen that never
           starts. */
      }),
    ),
  );

  void decoded.then(() => {
    start();
  });

  /* The safety net: a decode that never settles must not hold the screen
     hostage. */
  const startTimer = window.setTimeout(() => {
    start();
  }, PRELOAD_TIMEOUT_MS);

  /* The skip button takes the focus, because it is the only control on the
     screen and a keyboard player should know it is there. */
  skip.focus({ preventScroll: true });

  return () => {
    finished = true;

    if (frameId !== 0) window.cancelAnimationFrame(frameId);
    frameId = 0;

    window.clearTimeout(startTimer);
    window.clearTimeout(skipTimer);

    skip.removeEventListener('click', onSkip);
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);

    root.removeAttribute('data-landing-motion');
    root.classList.remove('is-finished', 'is-paused');
    root.replaceChildren();
  };
}
