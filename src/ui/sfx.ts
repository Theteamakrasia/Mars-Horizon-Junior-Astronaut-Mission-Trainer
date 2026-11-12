/**
 * The game's sound effects, played.
 *
 * This is the only file that makes noise. A screen asks for a cue by id
 * (`playSfx('order-stamp')`) and never touches a file name, a volume or an
 * `<audio>` element; the ids and their trims are in `sfxMap.ts`.
 *
 * ## Why `<audio>` and not Web Audio
 *
 * Web Audio would be the tidier mixer, but it can only see a file through
 * `decodeAudioData`, which needs the bytes, which means `fetch` — and
 * `no-network-outside-data` bans that outside `data/` for good reasons (every
 * request in the game is supposed to fail in one place). Pooled
 * `HTMLAudioElement`s cost a little memory per voice and give everything this
 * game needs: overlap, a per-cue trim, `playbackRate` for pitch, and simple
 * loop/stop control for continuous cues.
 *
 * ## The gesture rule
 *
 * No browser will start audio before the player has interacted with the page.
 * The game never tries to: every cue is a response to a click, a key or a
 * navigation that followed one, so the first sound is always inside the
 * gesture that caused it. A cue that is refused is dropped silently rather
 * than thrown, because a refused cue is not an error the player can act on.
 *
 * ## Delegation, not per-button wiring
 *
 * `startSfx` installs listeners on `document`, once, at boot. That is
 * deliberate: the desk rebuilds its entire DOM on every change, so a listener
 * attached per button would either be lost on every redraw or stack up on the
 * ones that survived.
 *
 * A control that wants its own cue carries `data-sfx="order-stamp"`; one that
 * has already played the right sound in its own handler, or should stay
 * silent, carries `data-sfx="none"`. Hover can be opted out with
 * `data-sfx-hover="off"` (or opted in on a child with `data-sfx-hover="on"`).
 */
 
import { readAudioSettings, writeAudioSettings } from './save';
import { SFX, SFX_DEFAULT_VOICES, type SfxDef, type SfxId } from './sfxMap';

/** What a call site may override. */
export interface PlayOptions {
  /** Playback rate, overriding the map. */
  readonly rate?: number;
  /** Peak trim, overriding the map. */
  readonly gain?: number;
  /** Play even while the game is muted. Only the mute button uses this. */
  readonly force?: boolean;
}

/**
 * How much a cue is turned down while the browser is reading aloud.
 *
 * Read-aloud is the feature that makes the game usable by a child who cannot
 * yet read the briefing fluently, so it wins the mix.
 */
const SPEECH_DUCK = 0.35;

/** The quiet cues a screen may be about to ask for. */
const WARM: readonly SfxId[] = [
  'ui-click',
  'ui-hover',
  'ui-confirm',
  'ui-open-sheet',
  'ui-close-sheet',
  'ui-error',
  'ui-disabled',
  'dialogue-next',
  'dialogue-pop',
  'desk-tile-open',
  'order-select',
  'order-stamp',
];

/** One pool per cue, built the first time that cue is asked for. */
const pools = new Map<SfxId, HTMLAudioElement[]>();

/** Round-robin position per cue, used when every voice is busy. */
const turns = new Map<SfxId, number>();

/** Scheduled end-trim timers per playing voice. */
const endTimers = new Map<HTMLAudioElement, number>();

/** The mute state, read from storage at boot. */
let muted = false;

/** Listeners told when the mute state changes: the header, the menu. */
const watchers = new Set<(muted: boolean) => void>();

/** Has `startSfx` run? Installing the listeners twice would double every click. */
let started = false;

/** The hover throttle's last tick, in milliseconds. */
let lastHover = 0;

/** Was sound explicitly muted by the address bar? */
let forcedByUrl = false;

function voicesOf(def: SfxDef): number {
  if (def.loop) return 1;

  return def.voices ?? SFX_DEFAULT_VOICES;
}

function clearEndTimer(voice: HTMLAudioElement): void {
  const timer = endTimers.get(voice);

  if (timer !== undefined) {
    window.clearTimeout(timer);
    endTimers.delete(voice);
  }
}

function haltVoice(voice: HTMLAudioElement): void {
  clearEndTimer(voice);

  try {
    voice.pause();
    voice.currentTime = 0;
  } catch {
    /* Some browsers refuse a seek before the file is buffered. Not an error. */
  }
}

/**
 * The pool for one cue.
 *
 * Built lazily so the game never asks for all 34 files at boot.
 */
function poolFor(id: SfxId): readonly HTMLAudioElement[] {
  const existing = pools.get(id);

  if (existing !== undefined) return existing;

  const def = SFX[id] as SfxDef & { loop?: boolean };
  const pool: HTMLAudioElement[] = [];

  for (let index = 0; index < voicesOf(def); index += 1) {
    const audio = new Audio(def.src);

    audio.preload = 'auto';
    audio.loop = def.loop === true;
    /*
     * Let the rate change the pitch.
     *
     * Browsers preserve pitch by default, which is right for a podcast at
     * 1.5x and wrong here: the whole point of playing a cue at 1.12 is that it
     * sounds different, not that it says the same thing faster.
     */
    audio.preservesPitch = false;
    pool.push(audio);
  }

  pools.set(id, pool);

  return pool;
}

/** True while the browser's voice is reading something out. */
function speaking(): boolean {
  return typeof window !== 'undefined' && window.speechSynthesis?.speaking === true;
}

/** The voice to use for this play: a free one, else the next in the rotation. */
function pickVoice(id: SfxId): HTMLAudioElement {
  const pool = poolFor(id);
  const def = SFX[id] as SfxDef & { loop?: boolean };

  if (def.loop) return pool[0] as HTMLAudioElement;

  const free = pool.find((audio) => audio.paused);

  if (free !== undefined) return free;

  const turn = (turns.get(id) ?? 0) % pool.length;

  turns.set(id, turn + 1);

  return pool[turn] as HTMLAudioElement;
}

function scheduleEndEarly(voice: HTMLAudioElement, endEarlyMs: number): void {
  const arm = (): void => {
    if (!Number.isFinite(voice.duration) || voice.duration <= 0) return;

    clearEndTimer(voice);

    const rate = voice.playbackRate > 0 ? voice.playbackRate : 1;
    const playedMs = (voice.currentTime / rate) * 1000;
    const totalMs = (voice.duration / rate) * 1000;
    const remainingMs = Math.max(0, totalMs - playedMs - endEarlyMs);

    endTimers.set(
      voice,
      window.setTimeout(() => {
        endTimers.delete(voice);
        haltVoice(voice);
      }, remainingMs),
    );
  };

  if (Number.isFinite(voice.duration) && voice.duration > 0) {
    arm();

    return;
  }

  voice.addEventListener('loadedmetadata', arm, { once: true });
  voice.addEventListener('durationchange', arm, { once: true });
}

/**
 * Play one cue.
 *
 * Returns whether the sound was attempted.
 */
export function playSfx(id: SfxId, options: PlayOptions = {}): boolean {
  if (muted && options.force !== true) return false;

  const def: SfxDef & { duck?: boolean } = SFX[id];
  const voice = pickVoice(id);
  const duck = def.duck !== false && speaking();

  voice.volume = Math.min(1, Math.max(0, (options.gain ?? def.gain) * (duck ? SPEECH_DUCK : 1)));
  voice.playbackRate = options.rate ?? def.rate ?? 1;
  voice.loop = def.loop === true;

  try {
    if (def.loop) {
      if (voice.paused || voice.ended) {
        clearEndTimer(voice);
        voice.currentTime = 0;
      }
    } else {
      haltVoice(voice);
      voice.currentTime = 0;
    }
  } catch {
    /* Some browsers refuse a seek before the file is buffered. Not an error. */
  }

  if (!def.loop && def.endEarlyMs !== undefined && def.endEarlyMs > 0) {
    scheduleEndEarly(voice, def.endEarlyMs);
  }

  void voice.play().catch(() => {
    /* Autoplay policy, or a file not yet decoded. Both are silent by design. */
  });

  return true;
}

/** Stop a cue (all its voices). Safe to call when it is not playing. */
export function stopSfx(id: SfxId): void {
  const pool = pools.get(id);

  if (pool === undefined) return;

  for (const voice of pool) haltVoice(voice);
}

/** Load a cue's file without playing it. */
export function preloadSfx(id: SfxId): void {
  for (const audio of poolFor(id)) {
    if (audio.readyState === 0) audio.load();
  }
}

/** Is the game muted? */
export function isSfxMuted(): boolean {
  return muted;
}

/** Told whenever the mute state changes. Returns the unsubscribe. */
export function onSfxChange(listener: (muted: boolean) => void): () => void {
  watchers.add(listener);

  return () => watchers.delete(listener);
}

/**
 * Mute or unmute, and remember it.
 *
 * Settings are their own key, not part of the run.
 */
export function setSfxMuted(next: boolean): void {
  if (muted === next) return;

  muted = next;
  forcedByUrl = false;

  if (muted) {
    for (const pool of pools.values()) {
      for (const audio of pool) haltVoice(audio);
    }
  } else {
    /* Warm the chrome again: a muted game never loaded it. */
    for (const id of WARM) preloadSfx(id);
  }

  writeAudioSettings({ muted });

  for (const listener of watchers) listener(muted);
}

/**
 * Turn the mute state over.
 *
 * The cue for the new state is played deliberately so the button always gives
 * evidence that it did something.
 */
export function toggleSfx(): boolean {
  const next = !muted;

  if (next) {
    setSfxMuted(false);
    playSfx('ui-toggle-on', { force: true });
  } else {
    /* Play the confirmation before silence takes effect for future cues. */
    playSfx('ui-toggle-off', { force: true });
    setSfxMuted(true);
  }

  return next;
}

/* ----------------------------------------------------------------- wiring -- */

/** The control a pointer event belongs to, if it belongs to one. */
function controlFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLElement>('[data-sfx], button, [role="button"], a[href]');
}

/** A control that cannot be pressed. */
function dead(control: HTMLElement): boolean {
  return control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true';
}

function onClick(event: MouseEvent): void {
  const control = controlFrom(event.target);

  if (control === null) return;

  const named = control.dataset.sfx;

  if (named === 'none') return;

  if (named !== undefined) {
    if (named in SFX) playSfx(named as SfxId);

    return;
  }

  if (dead(control)) {
    playSfx('ui-disabled');

    return;
  }

  playSfx('ui-click');
}

function hoverSetting(control: HTMLElement): string | undefined {
  if (control.dataset.sfxHover !== undefined) return control.dataset.sfxHover;

  const opted = control.closest<HTMLElement>('[data-sfx-hover]');

  return opted?.dataset.sfxHover;
}

function onHover(event: PointerEvent): void {
  /* A tap is not a hover: on a phone every press would tick before its click. */
  if (!window.matchMedia('(hover: hover)').matches) return;

  const control = controlFrom(event.target);

  if (control === null || dead(control)) return;

  const setting = hoverSetting(control);

  if (setting === 'off') return;

  /* pointerover fires for every child; only the arrival in the control counts. */
  if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;

  const now = Date.now();

  if (now - lastHover < 70) return;

  lastHover = now;

  if (setting !== undefined && setting !== 'on' && setting in SFX) {
    playSfx(setting as SfxId);

    return;
  }

  playSfx('ui-hover');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'm' && event.key !== 'M') return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

  const target = event.target;

  /* M is a letter somebody may be typing into the name field. */
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  ) {
    return;
  }

  event.preventDefault();
  toggleSfx();
}

/**
 * Start the game's sound.
 *
 * Called once from `main.ts`, before the router mounts the first screen.
 * Safe to call twice: the second call does nothing.
 */
export function startSfx(): void {
  if (started) return;

  started = true;

  const saved = readAudioSettings();
  const query = new URLSearchParams(window.location.search);

  /*
   * `?mute=1` silences a run for the browser checks, and saves nothing.
   */
  forcedByUrl = query.get('mute') === '1';
  muted = forcedByUrl || saved.muted;

  if (!muted) {
    for (const id of WARM) preloadSfx(id);
  }

  document.addEventListener('click', onClick, true);
  document.addEventListener('pointerover', onHover, true);
  document.addEventListener('keydown', onKeydown);

  /* Keep the speaker's label honest if the setting changed in another tab. */
  window.addEventListener('storage', () => {
    if (forcedByUrl) return;

    const next = readAudioSettings().muted;

    if (next === muted) return;

    muted = next;

    if (muted) {
      for (const pool of pools.values()) {
        for (const audio of pool) haltVoice(audio);
      }
    }

    for (const listener of watchers) listener(muted);
  });
}

/* Re-export the id type so callers can name a cue without reaching into the map. */
export type { SfxId } from './sfxMap';
