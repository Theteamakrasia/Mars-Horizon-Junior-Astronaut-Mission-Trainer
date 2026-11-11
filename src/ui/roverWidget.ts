/**
 * The rover button and every window it opens.
 *
 * Shared chrome, like `nasaCard`: `base` and `act` both show it, and a feature
 * may not import another feature (R-5), so it lives in `ui/`.
 *
 * The rover has to outlive screen changes. `act` redraws its whole screen on
 * every press, and the player moves from `base` to `act`, so the rover's state,
 * its timer and whichever window is open all live in this module rather than in
 * the DOM. Each button is a thin view over that one store: a screen redraw
 * builds a fresh button, which paints from the store and picks up exactly where
 * the last one stopped. `resetRover` clears it for a new run.
 *
 * What the rover may do is decided by `sim/rover.ts`; what it can find is
 * `data/roverFinds.ts`. This file only shows it and keeps the clock.
 *
 * No `confirm()` (R-9): the deploy question is a window of its own.
 */

import roverGifUrl from '../../Assets/images/rover/mars_rover_seamless_loop.gif';
import roverButtonUrl from '../../Assets/images/rover/rbutton.png';
import { ROVER_FINDS } from '../data/roverFinds';
import { h } from '../dom/h';
import {
  canDiscover,
  collectMaterial,
  deployRover,
  discover,
  leaveMaterial,
  logSite,
  newRover,
  nextFindDelayMs,
  recallRover,
  remainingFinds,
  type RoverFind,
  type RoverState,
} from '../sim/rover';
import { stopReading } from './readAloud';
import { readButton } from './readButton';

import './rover.css';

/** Which window is open. Only one at a time. */
type Panel = 'none' | 'confirm' | 'notice' | 'status' | 'find';

/** How long the short "Rover deployed!" style notices stay before closing themselves. */
const NOTICE_MS = 3500;

interface Notice {
  readonly title: string;
  readonly text: string;
}

/** The whole rover, outside the DOM. */
let rover: RoverState = newRover();
let panel: Panel = 'none';
let notice: Notice = { title: '', text: '' };
/** Set by a player action; the next paint moves keyboard focus accordingly, then clears it. */
let focusRequest: 'window' | 'button' | null = null;

let findTimer: number | null = null;
let noticeTimer: number | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function clearFindTimer(): void {
  if (findTimer !== null) window.clearTimeout(findTimer);

  findTimer = null;
}

function clearNoticeTimer(): void {
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);

  noticeTimer = null;
}

/** Start the countdown to the next find, if the rover is out and free to find one. */
function scheduleFind(): void {
  clearFindTimer();

  if (!canDiscover(rover, ROVER_FINDS)) return;

  findTimer = window.setTimeout(() => {
    findTimer = null;
    rover = discover(rover, ROVER_FINDS, Math.random());
    emit();
  }, nextFindDelayMs(rover.found.length, Math.random()));
}

function setPanel(next: Panel, focus: 'window' | 'button' | null): void {
  panel = next;
  focusRequest = focus;
  if (next !== 'notice') clearNoticeTimer();
  if (next !== 'find') stopReading();
  emit();
}

/** Show a short message that closes itself. */
function showNotice(next: Notice): void {
  notice = next;
  clearNoticeTimer();
  setPanel('notice', 'window');
  noticeTimer = window.setTimeout(() => {
    noticeTimer = null;
    if (panel === 'notice') setPanel('none', null);
  }, NOTICE_MS);
}

/** Forget everything. Called when a new run begins, so a new mission starts with the rover at base. */
export function resetRover(): void {
  clearFindTimer();
  clearNoticeTimer();
  stopReading();
  rover = newRover();
  panel = 'none';
  focusRequest = null;
  emit();
}

/** The rover button was pressed: open the window that fits what the rover is doing. */
function press(): void {
  if (panel !== 'none') {
    setPanel('none', 'button');

    return;
  }

  if (rover.phase === 'stowed') setPanel('confirm', 'window');
  else if (rover.pending !== null) setPanel('find', 'window');
  else setPanel('status', 'window');
}

function confirmDeploy(): void {
  rover = deployRover(rover);
  scheduleFind();
  showNotice({ title: 'Rover deployed!', text: 'It is rolling out to explore. A red dot will pop up when it finds something.' });
}

function bringBack(): void {
  clearFindTimer();
  rover = recallRover(rover);
  showNotice({ title: 'Rover is back at base', text: 'You can send it out again any time.' });
}

function logFind(): void {
  const title = rover.pending?.title ?? 'The site';

  rover = logSite(rover);
  scheduleFind();
  showNotice({ title: 'Saved to your log', text: `${title} is now in your mission log.` });
}

function collectFind(): void {
  const title = rover.pending?.title ?? 'The rock';

  rover = collectMaterial(rover);
  scheduleFind();
  showNotice({ title: 'Collected!', text: `${title} is on board. The rover keeps exploring.` });
}

function letBe(): void {
  const title = rover.pending?.title ?? 'The rock';

  rover = leaveMaterial(rover);
  scheduleFind();
  showNotice({ title: 'Left where it lies', text: `${title} stays on Mars. The rover keeps exploring.` });
}

/** Close the window without answering. A waiting find stays waiting, and the red dot stays. */
function closePanel(): void {
  setPanel('none', 'button');
}

/** Keep Tab inside a modal window. */
function trapTab(event: KeyboardEvent, windowEl: HTMLElement): void {
  if (event.key !== 'Tab') return;

  const items = [...windowEl.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
  const first = items[0];
  const last = items[items.length - 1];

  if (first === undefined || last === undefined) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeButton(): HTMLButtonElement {
  const button = h('button', { class: 'rover__close', type: 'button', 'aria-label': 'Close' }, '✕');

  button.addEventListener('click', closePanel);

  return button;
}

function actionButton(label: string, tone: 'primary' | 'plain', onClick: () => void): HTMLButtonElement {
  const button = h('button', { class: `rover__btn rover__btn--${tone}`, type: 'button' }, label);

  button.addEventListener('click', onClick);

  return button;
}

function windowShell(size: 'small' | 'large', label: string, ...content: (Node | null)[]): HTMLElement {
  return h(
    'div',
    { class: `rover__window rover__window--${size}`, role: 'dialog', 'aria-label': label, tabindex: '-1' },
    ...content,
  );
}

/** "Deploy the rover?" */
function confirmWindow(): HTMLElement {
  return windowShell(
    'small',
    'Deploy the rover?',
    closeButton(),
    h('p', { class: 'rover__kicker', text: 'Rover' }),
    h('h2', { class: 'rover__title', text: 'Deploy the rover?' }),
    h('p', {
      class: 'rover__text',
      text: 'It will drive out across Mars looking for lost spacecraft and rare rocks. You can bring it back any time.',
    }),
    h(
      'div',
      { class: 'rover__actions' },
      actionButton('Deploy rover', 'primary', confirmDeploy),
      actionButton('Not now', 'plain', closePanel),
    ),
  );
}

/** A short message: "Rover deployed!" and friends. */
function noticeWindow(): HTMLElement {
  return windowShell(
    'small',
    notice.title,
    h('p', { class: 'rover__kicker', text: 'Rover' }),
    h('h2', { class: 'rover__title', text: notice.title }),
    h('p', { class: 'rover__text', role: 'status', text: notice.text }),
    h('div', { class: 'rover__actions' }, actionButton('OK', 'primary', closePanel)),
  );
}

/** The small window: the rover's GIF, what it has done so far, and how to bring it back. */
function statusWindow(): HTMLElement {
  const sitesLine = `🏛 Sites found: ${rover.visited.length}`;
  const rocksLine = `💎 Rocks collected: ${rover.collected.length}`;
  const collectedTitles = rover.collected
    .map((id) => ROVER_FINDS.find((find) => find.id === id)?.title)
    .filter((title): title is string => title !== undefined);
  const searching = remainingFinds(rover, ROVER_FINDS).length > 0;

  return windowShell(
    'small',
    'The rover is exploring',
    closeButton(),
    h('p', { class: 'rover__kicker', text: 'Rover' }),
    h('h2', { class: 'rover__title', text: 'Exploring Mars…' }),
    h('img', {
      class: 'rover__gif',
      src: roverGifUrl,
      alt: 'The rover driving across the red Martian ground.',
      draggable: 'false',
    }),
    h('p', {
      class: 'rover__text',
      text: searching
        ? 'Searching for lost history and rare rocks.'
        : 'The rover has explored everything nearby. Great work, explorer!',
    }),
    h('p', { class: 'rover__tally', text: `${sitesLine}  ·  ${rocksLine}` }),
    collectedTitles.length > 0 ? h('p', { class: 'rover__tally rover__tally--list', text: collectedTitles.join(' · ') }) : null,
    h('div', { class: 'rover__actions' }, actionButton('Bring rover back', 'primary', bringBack)),
  );
}

/** The big window: a picture, the story, and what to do about it. */
function findWindow(find: RoverFind): HTMLElement {
  const isSite = find.kind === 'site';
  const image = h('img', { class: 'rover__photo', src: find.imageUrl, alt: find.alt, decoding: 'async' });
  const figure = h('div', { class: 'rover__figure' }, image);

  /* A picture that fails to load is removed rather than shown as a broken icon.
     The story, the fact and the NASA link stay. */
  image.addEventListener('error', () => {
    image.remove();
    figure.classList.add('rover__figure--empty');
    figure.textContent = isSite ? '🏛' : '💎';
  });

  const read = readButton(() => `${find.title}. ${find.where}. ${find.story} Did you know? ${find.fact}`, {
    className: 'rover__btn rover__btn--plain',
    idleLabel: '🔊 Read to me',
    stopLabel: '⏹ Stop reading',
    ariaLabel: 'Read this discovery aloud',
  });

  const actions = h('div', { class: 'rover__actions' });

  if (isSite) {
    actions.append(actionButton('Got it, save to my log', 'primary', logFind));
  } else {
    actions.append(actionButton('Collect it', 'primary', collectFind), actionButton('Let it be', 'plain', letBe));
  }

  if (read !== null) actions.append(read);

  return windowShell(
    'large',
    find.title,
    closeButton(),
    h('p', { class: 'rover__kicker rover__kicker--find', text: isSite ? '🏛 Historic site found!' : '💎 Rare material found!' }),
    h('h2', { class: 'rover__title rover__title--big', text: find.title }),
    h('p', { class: 'rover__where', text: `${find.where} · ${find.when}` }),
    figure,
    h('p', { class: 'rover__text', text: find.story }),
    h('p', { class: 'rover__fact' }, h('strong', { text: 'Did you know? ' }), find.fact),
    h(
      'p',
      { class: 'rover__credit' },
      `${find.credit} · `,
      h('a', { href: find.sourceUrl, target: '_blank', rel: 'noopener noreferrer', text: 'See it at NASA ↗' }),
    ),
    actions,
  );
}

/**
 * Build the rover button for one screen.
 *
 * Append the returned element to the screen's root. It listens to the shared
 * store while it is on the page and lets go of it the first time it finds itself
 * removed, so a redrawn screen never leaves a stale button listening.
 */
export function roverWidget(): HTMLElement {
  const picture = h('img', { class: 'rover__icon', src: roverButtonUrl, alt: '', draggable: 'false' });
  const badge = h('span', { class: 'rover__badge', 'aria-hidden': 'true', hidden: true });
  const status = h('span', { class: 'rover__status' });
  const button = h(
    'button',
    { class: 'rover__fab', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' },
    picture,
    badge,
  );
  const host = h('div', { class: 'rover__host' });
  const root = h('div', { class: 'rover' }, button, status, host);

  let attached = false;

  const paint = (): void => {
    if (root.isConnected) attached = true;
    else if (attached) {
      listeners.delete(paint);

      return;
    } else {
      return;
    }

    const open = panel !== 'none';
    const waiting = rover.pending !== null;

    badge.hidden = !waiting;
    status.textContent = rover.phase === 'stowed' ? 'Rover' : waiting ? 'Found something!' : 'Exploring';
    root.dataset.phase = rover.phase;
    root.dataset.waiting = String(waiting);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute(
      'aria-label',
      rover.phase === 'stowed'
        ? 'Rover, at base. Press to deploy it.'
        : waiting
          ? 'Rover. It found something. Press to see what.'
          : 'Rover, exploring. Press to open it.',
    );

    host.replaceChildren();

    let windowEl: HTMLElement | null = null;

    if (panel === 'confirm') windowEl = confirmWindow();
    else if (panel === 'notice') windowEl = noticeWindow();
    else if (panel === 'status') windowEl = statusWindow();
    else if (panel === 'find' && rover.pending !== null) windowEl = findWindow(rover.pending);

    if (windowEl === null) {
      if (focusRequest === 'button') button.focus();
      focusRequest = null;

      return;
    }

    const shown = windowEl;
    const large = panel === 'find';
    const surface = large ? h('div', { class: 'rover__backdrop' }, shown) : shown;

    if (large) {
      shown.setAttribute('aria-modal', 'true');
      surface.addEventListener('click', (event) => {
        if (event.target === surface) closePanel();
      });
    }

    shown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();

        return;
      }

      if (large) trapTab(event, shown);
    });

    host.append(surface);

    if (focusRequest === 'window') {
      const first = shown.querySelector<HTMLElement>('.rover__btn--primary') ?? shown;

      first.focus();
    }

    focusRequest = null;
  };

  button.addEventListener('click', press);
  listeners.add(paint);

  /* The element is not on the page yet; the first paint happens once it is.
     queueMicrotask runs after the caller has appended it in the same task. */
  queueMicrotask(paint);

  return root;
}
