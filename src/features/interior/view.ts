/**
 * The spacecraft interior: the tour between the launch cinematic and the
 * landing-site choice.
 *
 * Mounted at "#interior" by ui/registry.ts. The player stands in the cabin,
 * walks the rest of the transit habitat with the movement sprite, reads one
 * brief per room, and loops back to the cabin after the last room. The cabin
 * then offers the landing-site choice; the
 * landing screen itself is the main game and is built later, so the button says
 * so rather than navigating to a dead end.
 *
 * The player is the narrator. There is no guide portrait: the female astronaut
 * is part of the cabin artwork, and the player's own sprite does the waving,
 * pointing and talking in every room.
 *
 * DOM and timing only. The room table, the walker, the animation choice, the
 * visited state and the copy live in ./model and are unit tested there.
 *
 * Why the movement is a rAF loop but the room rotation is not
 * -----------------------------------------------------------
 * Walking is continuous: it has to react to a key being held and stop the frame
 * it is released. The room rotation is a CSS keyframe, like the naming menu, so
 * there is no loop to leak when the screen unmounts. The only JS loop here is
 * the walk loop, and it cancels itself as soon as no direction is held.
 */

import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import type { RunState } from '../../sim/run';

import './interior.css';

// Three levels up: src/features/interior/ -> src/features/ -> src/ -> repo root.
// Typed asset imports, so Vite fingerprints these and emits them into dist/.
import cabinUrl from '../../../Assets/images/interior/rooms/cabin.webp';
import galleyUrl from '../../../Assets/images/interior/rooms/galley.webp';
import havenUrl from '../../../Assets/images/interior/rooms/haven.webp';
import labUrl from '../../../Assets/images/interior/rooms/lab.webp';
import logisticsUrl from '../../../Assets/images/interior/rooms/logistics.webp';
import sleepUrl from '../../../Assets/images/interior/rooms/sleep.webp';
import interactAltUrl from '../../../Assets/images/interior/sprite/interact-alt.webp';
import interactUrl from '../../../Assets/images/interior/sprite/interact.webp';
import pointLeftUrl from '../../../Assets/images/interior/sprite/point-left.webp';
import pointRightUrl from '../../../Assets/images/interior/sprite/point-right.webp';
import walkLeftUrl from '../../../Assets/images/interior/sprite/walk-left.webp';
import walkRightUrl from '../../../Assets/images/interior/sprite/walk-right.webp';

import {
  GREET_MS,
  LANDING_COMING_SOON,
  POINT_MS,
  ROOMS,
  TALK_MS,
  allRoomsVisited,
  canChooseLanding,
  createWalker,
  hintText,
  isAtExit,
  markVisited,
  nextRoomIndex,
  nextRoomLabel,
  progressLabel,
  speakerName,
  spriteFor,
  stepWalker,
  type Direction,
  type Gesture,
  type Room,
  type RoomId,
  type SpriteAnimation,
  type SpriteState,
  type VisitedRooms,
  type Walker,
  type WalkerInput,
} from './model';

/** One room's still, keyed by the same id the model uses. */
const ROOM_IMAGES: Record<RoomId, string> = {
  cabin: cabinUrl,
  galley: galleyUrl,
  sleep: sleepUrl,
  lab: labUrl,
  logistics: logisticsUrl,
  haven: havenUrl,
};

/** One animation strip, keyed by the name the model returns. */
const SPRITE_URLS: Record<SpriteAnimation, string> = {
  'walk-left': walkLeftUrl,
  'walk-right': walkRightUrl,
  interact: interactUrl,
  'interact-alt': interactAltUrl,
  'point-left': pointLeftUrl,
  'point-right': pointRightUrl,
};

/**
 * How long a keyboard activation of an on-screen pad moves the player.
 *
 * A click on a pad button is a step, not a hold. 140 ms is long enough to show
 * the walk cycle and short enough that a child pressing the button four times
 * crosses the room.
 */
const NUDGE_MS = 140;

/** How long the player takes to phase out through an exit wall. */
const PHASE_OUT_MS = 420;

/** How long the player takes to materialise in the room he phases into. */
const PHASE_IN_MS = 360;

/**
 * Resolve a child of the screen root, throwing if the markup and this file have
 * drifted apart. Far easier to debug than a null dereference on click.
 */
function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`interior: missing required element ${selector}`);
  }

  return element;
}

/** Never steal an arrow key from a text field. There are none here yet, but the
 * next person to put a search box on this screen should not have to remember. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Map an arrow key to a walk direction, or null for every other key. */
function directionForKey(key: string): Direction | null {
  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

/**
 * Mount the interior into `root` and return a teardown.
 *
 * `run` supplies the astronaut's name for the speaker label. It may be null if
 * the screen is opened directly by hash, in which case the label falls back to
 * "Astronaut" rather than blank.
 */
export function mountInterior(
  root: HTMLElement,
  run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  const roomImages = [...root.querySelectorAll<HTMLImageElement>('[data-interior-room]')];

  if (roomImages.length !== ROOMS.length) {
    throw new Error(
      `interior: expected ${ROOMS.length} room images, found ${roomImages.length}`,
    );
  }

  const player = require<HTMLDivElement>(root, '[data-interior-player]');
  const sprite = require<HTMLDivElement>(root, '[data-interior-sprite]');
  const speaker = require<HTMLParagraphElement>(root, '[data-interior-speaker]');
  const title = require<HTMLHeadingElement>(root, '[data-interior-title]');
  const what = require<HTMLParagraphElement>(root, '[data-interior-what]');
  const why = require<HTMLParagraphElement>(root, '[data-interior-why]');
  const progress = require<HTMLParagraphElement>(root, '[data-interior-progress]');
  const dotsList = require<HTMLOListElement>(root, '[data-interior-dots]');
  const hint = require<HTMLParagraphElement>(root, '[data-interior-hint]');
  const repeatButton = require<HTMLButtonElement>(root, '[data-interior-repeat]');
  const nextButton = require<HTMLButtonElement>(root, '[data-interior-next]');
  const landingPanel = require<HTMLDivElement>(root, '[data-interior-landing]');
  const landingNote = require<HTMLParagraphElement>(root, '[data-interior-landing-note]');
  const landingGo = require<HTMLButtonElement>(root, '[data-interior-landing-go]');
  const landingClose = require<HTMLButtonElement>(root, '[data-interior-landing-close]');
  const pad = require<HTMLDivElement>(root, '[data-interior-pad]');
  const padButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-interior-move]')];

  // Every still is loaded at mount, not on the keypress. The room change is a
  // crossfade over an already-decoded image, so pressing N never shows a blank
  // frame on a slow connection.
  roomImages.forEach((image, index) => {
    image.src = ROOM_IMAGES[ROOMS[index].id];
  });

  speaker.textContent = speakerName(run?.astronautName);

  // The dots are generated here, not in the markup. A remount — back/forward,
  // or coming back through the landing loop — would otherwise append a second
  // set beside the first, and the HUD would show two progress rows. Clearing
  // first makes the mount idempotent; the teardown clears them again.
  dotsList.replaceChildren();

  const dots = ROOMS.map(() => {
    const dot = document.createElement('li');
    dot.className = 'interior__dot';
    dotsList.appendChild(dot);

    return dot;
  });

  const cleanups: Array<() => void> = [];
  const timers: number[] = [];
  const keyHeld = new Set<Direction>();
  const buttonHeld = new Set<Direction>();

  let roomIndex = 0;
  let currentRoom: Room = ROOMS[0];
  let visited: VisitedRooms = [];
  let walker: Walker = createWalker(currentRoom.spawnX);
  let gesture: Gesture = 'greet';
  let rafId: number | null = null;
  let lastFrame = 0;
  let lastSpriteKey = '';
  let nudgeTimer: number | null = null;
  /** True while the wall phase is playing; blocks input and room changes. */
  let phasing = false;
  /** The phase-out or phase-in timer. Kept apart from the brief timers. */
  let phaseTimer: number | null = null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function anyHeld(): boolean {
    return keyHeld.size > 0 || buttonHeld.size > 0;
  }

  function readInput(): WalkerInput {
    if (!currentRoom.walkable) return { left: false, right: false };

    return {
      left: keyHeld.has('left') || buttonHeld.has('left'),
      right: keyHeld.has('right') || buttonHeld.has('right'),
    };
  }

  function applySprite(state: SpriteState): void {
    // The key is the animation plus what the static frame should be. Without it
    // every rAF frame would rewrite four inline styles and restart the CSS
    // animation, which is the classic "walk cycle stuck on frame one" bug.
    const key = `${state.animation}|${state.playing}|${state.frame}`;

    if (key === lastSpriteKey) return;
    lastSpriteKey = key;

    sprite.style.setProperty('--sprite-image', `url("${SPRITE_URLS[state.animation]}")`);
    sprite.style.setProperty('--frames', String(state.frames));
    sprite.style.setProperty('--sprite-offset', `${(state.frame / state.frames) * 100}%`);
    sprite.style.animationDuration = `${state.cycleMs}ms`;
    sprite.style.animationTimingFunction = `steps(${state.frames})`;
    sprite.dataset.playing = String(state.playing);
  }

  function applyWalker(): void {
    player.style.setProperty('--player-x', `${walker.x * 100}%`);
    applySprite(spriteFor(walker, gesture, currentRoom.point));
  }

  function startLoop(): void {
    if (rafId !== null) return;

    lastFrame = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop(): void {
    if (rafId === null) return;

    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function tick(now: number): void {
    rafId = null;

    // Clamp the delta so a tab that was backgrounded for a minute does not
    // teleport the player across the room when it wakes up.
    const delta = Math.min(Math.max(now - lastFrame, 0), 50);
    lastFrame = now;

    walker = stepWalker(walker, readInput(), delta);
    applyWalker();

    // Walking into a room's exit wall starts the phase. This is checked only
    // while a direction is held, so stopping at the wall does not teleport.
    if (anyHeld() && isAtExit(currentRoom, walker)) {
      phaseToNextRoom();
      return;
    }

    if (anyHeld()) {
      rafId = requestAnimationFrame(tick);
    }
  }

  /** Stop the walk loop and put the sprite back into its resting pose. */
  function settle(): void {
    if (anyHeld()) return;

    stopLoop();
    walker = stepWalker(walker, readInput(), 0);
    applyWalker();
  }

  /**
   * Fade the player through the current room's exit wall, then mount the next
   * room.
   *
   * The room change waits for the fade so the exit reads as phasing through the
   * airlock rather than an instant cut. `phasing` blocks input during the gap;
   * the phase timers are separate from the brief timers because entering the
   * next room clears those.
   */
  function phaseToNextRoom(): void {
    if (phasing) return;

    phasing = true;
    stopLoop();
    keyHeld.clear();
    buttonHeld.clear();
    clearTimers();

    if (nudgeTimer !== null) {
      window.clearTimeout(nudgeTimer);
      nudgeTimer = null;
    }

    if (phaseTimer !== null) {
      window.clearTimeout(phaseTimer);
      phaseTimer = null;
    }

    if (!reduced) {
      player.classList.remove('is-materialising');
      player.classList.add('is-phasing');
    }

    phaseTimer = window.setTimeout(
      () => {
        phaseTimer = null;
        phasing = false;
        player.classList.remove('is-phasing');

        enterRoom(nextRoomIndex(roomIndex));

        if (!reduced) {
          player.classList.add('is-materialising');

          phaseTimer = window.setTimeout(() => {
            phaseTimer = null;
            player.classList.remove('is-materialising');
          }, PHASE_IN_MS);
        }
      },
      reduced ? 0 : PHASE_OUT_MS,
    );
  }

  function pressKey(direction: Direction): void {
    keyHeld.add(direction);
    startLoop();
  }

  function releaseKey(direction: Direction): void {
    if (keyHeld.delete(direction)) {
      settle();
    }
  }

  function pressButton(direction: Direction): void {
    if (phasing) return;

    buttonHeld.add(direction);
    startLoop();
  }

  function releaseButton(direction: Direction): void {
    if (buttonHeld.delete(direction)) {
      settle();
    }
  }

  function clearTimers(): void {
    for (const timer of timers) {
      window.clearTimeout(timer);
    }

    timers.length = 0;
  }

  /**
   * Wave, point at the room's feature, talk, rest.
   *
   * The three timers are ordinary timeouts rather than `animationend`: a
   * background tab or a reduced-motion user would never fire the event and the
   * astronaut would be stuck mid-wave. The text is already readable regardless
   * of the gesture, so a missed beat is cosmetic, never blocking.
   */
  function startBrief(): void {
    clearTimers();

    if (nudgeTimer !== null) {
      window.clearTimeout(nudgeTimer);
      nudgeTimer = null;
    }

    // A pending nudge leaves `moving` true for a beat. Clear it before the
    // gesture is chosen, or a click on the pad would leave the walk cycle
    // running on the spot behind the speech.
    if (!anyHeld()) {
      walker = stepWalker(walker, readInput(), 0);
    }

    gesture = reduced ? 'idle' : 'greet';
    applyWalker();

    if (reduced) return;

    timers.push(
      window.setTimeout(() => {
        gesture = 'point';
        applyWalker();
      }, GREET_MS),
    );

    timers.push(
      window.setTimeout(() => {
        gesture = 'talk';
        applyWalker();
      }, GREET_MS + POINT_MS),
    );

    timers.push(
      window.setTimeout(() => {
        gesture = 'idle';
        applyWalker();
      }, GREET_MS + POINT_MS + TALK_MS),
    );
  }

  function openLanding(): void {
    landingNote.textContent = '';
    landingPanel.hidden = false;
    landingGo.focus();
  }

  function closeLanding(focusNext: boolean): void {
    landingPanel.hidden = true;
    landingNote.textContent = '';

    if (focusNext) {
      nextButton.focus();
    }
  }

  function enterRoom(index: number): void {
    roomIndex = index;

    if (phaseTimer !== null) {
      window.clearTimeout(phaseTimer);
      phaseTimer = null;
    }

    player.classList.remove('is-phasing', 'is-materialising');

    const room = ROOMS[roomIndex];
    currentRoom = room;
    visited = markVisited(visited, room.id);

    roomImages.forEach((image, i) => {
      image.classList.toggle('is-active', i === roomIndex);
    });

    title.textContent = room.name;
    what.textContent = room.what;
    why.textContent = room.why;
    progress.textContent = progressLabel(roomIndex);
    nextButton.textContent = nextRoomLabel(roomIndex);
    hint.textContent = hintText(roomIndex, allRoomsVisited(visited));

    // Each room owns its fixed floor line and player size. The cabin is a
    // static close-up, the safe haven's floor is raised, and the pad appears
    // only in walkable rooms.
    player.style.setProperty('--player-bottom', `${room.playerBottom}%`);
    player.style.setProperty('--player-scale', String(room.playerScale));
    pad.hidden = !room.walkable;
    keyHeld.clear();
    buttonHeld.clear();

    dots.forEach((dot, i) => {
      dot.classList.toggle('is-visited', visited.includes(ROOMS[i].id));
      dot.classList.toggle('is-current', i === roomIndex);
    });

    walker = createWalker(room.spawnX);
    startBrief();

    if (canChooseLanding(room, visited)) {
      openLanding();
    } else {
      closeLanding(false);
    }
  }

  function repeatBrief(): void {
    startBrief();
  }

  function advanceRoom(): void {
    if (phasing) return;

    // The safe haven's only exit is the airlock wall. Both N and the button
    // phase through it instead of cutting straight to the cabin; walking into
    // the wall calls the same function from tick().
    if (currentRoom.exit !== null) {
      phaseToNextRoom();
      return;
    }

    const hadModal = !landingPanel.hidden;

    if (hadModal) {
      closeLanding(false);
    }

    enterRoom(nextRoomIndex(roomIndex));

    // Do not steal focus back from the landing panel if the loop has just
    // returned to a completed cabin and opened it again.
    if (hadModal && landingPanel.hidden) {
      nextButton.focus();
    }
  }

  function chooseLanding(): void {
    const next = nextStop('interior');

    if (next !== null && next !== 'landing') {
      navigate(next);
      return;
    }

    landingNote.textContent = LANDING_COMING_SOON;
  }

  function keepExploring(): void {
    closeLanding(true);
  }

  /**
   * A keyboard activation of a pad is one step. A pointer press is a hold and is
   * handled by the rAF loop; the click that follows it has a non-zero `detail`,
   * so it is ignored here.
   */
  function nudge(direction: Direction): void {
    if (phasing || !currentRoom.walkable) return;

    if (nudgeTimer !== null) {
      window.clearTimeout(nudgeTimer);
    }

    walker = stepWalker(
      walker,
      {
        left: direction === 'left',
        right: direction === 'right',
      },
      NUDGE_MS,
    );

    applyWalker();

    nudgeTimer = window.setTimeout(() => {
      nudgeTimer = null;

      if (anyHeld()) return;

      walker = stepWalker(walker, readInput(), 0);
      applyWalker();
    }, NUDGE_MS + 80);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTypingTarget(event.target)) return;
    if (phasing) return;

    const direction = directionForKey(event.key);

    if (direction !== null) {
      event.preventDefault();

      if (!currentRoom.walkable) return;

      pressKey(direction);
      return;
    }

    switch (event.key) {
      case 'n':
      case 'N':
        if (event.repeat) return;
        event.preventDefault();
        advanceRoom();
        break;
      case 'r':
      case 'R':
        if (event.repeat) return;
        event.preventDefault();
        repeatBrief();
        break;
      case 'Escape':
        if (!landingPanel.hidden) {
          event.preventDefault();
          closeLanding(true);
        }
        break;
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    const direction = directionForKey(event.key);

    if (direction === null) return;

    releaseKey(direction);
  }

  function onBlur(): void {
    keyHeld.clear();
    buttonHeld.clear();
    settle();
  }

  function onVisibilityChange(): void {
    if (!document.hidden) return;

    keyHeld.clear();
    buttonHeld.clear();
    settle();
  }

  /** Safety net for a pointer released outside a pad that did not capture it. */
  function onPointerUp(): void {
    if (buttonHeld.size === 0) return;

    buttonHeld.clear();
    settle();
  }

  function bindPad(button: HTMLButtonElement, direction: Direction): void {
    function onDown(event: PointerEvent): void {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pressButton(direction);

      // A quick tap can start and finish between two animation frames, so the
      // hold loop never ticks. Apply one stride immediately; a held button
      // keeps walking from there, and a quick tap has still moved the player.
      nudge(direction);
    }

    function onUp(): void {
      releaseButton(direction);
    }

    function onClick(event: MouseEvent): void {
      // Keyboard-activated clicks have detail 0; pointer clicks have detail 1.
      if (event.detail !== 0) return;

      nudge(direction);
    }

    button.addEventListener('pointerdown', onDown);
    button.addEventListener('pointerup', onUp);
    button.addEventListener('pointercancel', onUp);
    button.addEventListener('pointerleave', onUp);
    button.addEventListener('lostpointercapture', onUp);
    button.addEventListener('click', onClick);

    cleanups.push(() => {
      button.removeEventListener('pointerdown', onDown);
      button.removeEventListener('pointerup', onUp);
      button.removeEventListener('pointercancel', onUp);
      button.removeEventListener('pointerleave', onUp);
      button.removeEventListener('lostpointercapture', onUp);
      button.removeEventListener('click', onClick);
    });
  }

  for (const button of padButtons) {
    const direction = button.dataset.interiorMove;

    if (direction !== 'left' && direction !== 'right') {
      throw new Error(`interior: pad button has unknown direction "${direction}"`);
    }

    bindPad(button, direction);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('visibilitychange', onVisibilityChange);

  repeatButton.addEventListener('click', repeatBrief);
  nextButton.addEventListener('click', advanceRoom);
  landingGo.addEventListener('click', chooseLanding);
  landingClose.addEventListener('click', keepExploring);

  enterRoom(0);

  return () => {
    stopLoop();
    clearTimers();

    if (nudgeTimer !== null) {
      window.clearTimeout(nudgeTimer);
      nudgeTimer = null;
    }

    if (phaseTimer !== null) {
      window.clearTimeout(phaseTimer);
      phaseTimer = null;
    }

    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    for (const cleanup of cleanups) {
      cleanup();
    }

    dotsList.replaceChildren();

    repeatButton.removeEventListener('click', repeatBrief);
    nextButton.removeEventListener('click', advanceRoom);
    landingGo.removeEventListener('click', chooseLanding);
    landingClose.removeEventListener('click', keepExploring);
  };
}
