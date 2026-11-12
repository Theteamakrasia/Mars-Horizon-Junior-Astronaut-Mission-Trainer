/**
 * Background music playback.
 *
 * One looping track at a time, selected by route. Music follows the same mute
 * state/controls as SFX (`?mute=1`, mute button, `M`, persisted audio setting),
 * so this module listens to `sfx.ts` rather than owning its own mute flag.
 *
 * HTMLAudio elements are used for the same reasons as SFX (no fetch/decode path
 * outside `data/`, simple loop control). Autoplay may be blocked before a user
 * gesture; play attempts fail silently and are retried on the next interaction.
 */

import type { Route } from './routes';
import { BGM, bgmForRoute, type BgmId } from './bgmMap';
import { isSfxMuted, onSfxChange } from './sfx';

const tracks = new Map<BgmId, HTMLAudioElement>();

let started = false;
let current: BgmId | null = null;
/** The track the active route wants, even if playback is currently blocked/muted. */
let wanted: BgmId | null = null;

function trackFor(id: BgmId): HTMLAudioElement {
  const existing = tracks.get(id);

  if (existing !== undefined) return existing;

  const def = BGM[id];
  const audio = new Audio(def.src);

  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = Math.min(1, Math.max(0, def.gain));
  tracks.set(id, audio);

  return audio;
}

function halt(audio: HTMLAudioElement): void {
  try {
    audio.pause();
  } catch {
    /* Not an error. */
  }

  try {
    audio.currentTime = 0;
  } catch {
    /* Not an error before buffered. */
  }
}

function pause(audio: HTMLAudioElement): void {
  try {
    audio.pause();
  } catch {
    /* Not an error. */
  }
}

function playWanted(): void {
  if (wanted === null) return;
  if (isSfxMuted()) return;

  const audio = trackFor(wanted);

  if (current !== wanted) {
    if (current !== null) halt(trackFor(current));
    current = wanted;
  }

  if (!audio.paused) return;

  void audio.play().catch(() => {
    /* Autoplay policy or not yet ready. Retried on next gesture/mute change. */
  });
}

function stopCurrent(): void {
  if (current === null) return;

  halt(trackFor(current));
  current = null;
}

function onMuteChange(muted: boolean): void {
  if (muted) {
    if (current !== null) pause(trackFor(current));
    return;
  }

  playWanted();
}

/** Retry playback on the first/next user gesture when autoplay was blocked. */
function onGesture(): void {
  if (wanted !== null && (current === null || trackFor(wanted).paused)) {
    playWanted();
  }
}

/**
 * Start background music handling. Safe to call twice.
 *
 * Call after SFX is started so mute state/settings are already loaded.
 */
export function startBgm(): void {
  if (started) return;

  started = true;
  onSfxChange(onMuteChange);

  const opts: AddEventListenerOptions = { capture: true, passive: true };
  document.addEventListener('pointerdown', onGesture, opts);
  document.addEventListener('keydown', onGesture, opts);
  document.addEventListener('click', onGesture, opts);

  /* Apply current mute state (e.g. ?mute=1 or saved mute). */
  onMuteChange(isSfxMuted());
}

/** Set the track for the active route. `encyclopedia` keeps the current track. */
export function setBgmForRoute(route: Route): void {
  if (!started) startBgm();

  const next = bgmForRoute(route);

  if (next === null) {
    /* Keep playing whatever is current (or wanted) underneath this screen. */
    playWanted();
    return;
  }

  if (wanted === next) {
    playWanted();
    return;
  }

  wanted = next;

  if (isSfxMuted()) {
    /* Switching tracks while muted: reset the previous track so unmuting starts
       the newly wanted track from the beginning. */
    if (current !== null && current !== wanted) stopCurrent();
    return;
  }

  playWanted();
}

/** Stop all music (e.g. on pagehide). */
export function stopBgm(): void {
  wanted = null;
  stopCurrent();
}
