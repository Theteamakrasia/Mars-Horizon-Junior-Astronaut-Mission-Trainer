/**
 * The placement editor — a developer's tool, not a game screen.
 *
 * Open `?editlayout=1` on any screen that draws the outpost panel, drag the
 * modules to where they should stand, and download `baseLayout.json`. Drop
 * that file into `src/ui/` and the game uses it: `baseLayout.ts` loads it,
 * `gameLoop.ts` places the modules with it.
 *
 * It lives in `ui/` rather than in a feature folder on purpose. It is not
 * part of the journey, so it needs no route, no mount point in `index.html`
 * and no registry entry — which is exactly what the abandoned `drag-editor`
 * feature got wrong (ISS-047): a screen that was never wired up and could
 * therefore never be checked. It is also compiled out of a production build
 * entirely, so no player can reach it.
 *
 * The overlay is a fixed layer on `document.body` rather than a set of
 * elements injected into the screen. `features/base` replaces every child of
 * its mount when the live forecast arrives, so anything injected into the
 * screen would be destroyed in the middle of a drag.
 */

import { h } from '../dom/h';
import { MODULE_CATALOGUE, specOf, type ModuleKind } from '../sim/modules';
import {
  MODULE_SPOT,
  SPOT_BAND,
  buildLayoutJson,
  clampSpot,
  pointToPercent,
  roundSpot,
  type ModuleSpot,
} from './baseLayout';
import { moduleArt } from './gameLoop';

import './base-layout-editor.css';

/** The module kinds the editor places, in catalogue order. */
const KINDS: readonly ModuleKind[] = MODULE_CATALOGUE.map((spec) => spec.kind);

/** The class put on the outpost panel while the editor is on. */
const EDITING_CLASS = 'gl__world--editing';

/** How far one arrow key nudges a module, in percent. */
const NUDGE = 0.5;

/** How far a shift and an arrow key nudges a module, in percent. */
const NUDGE_FAR = 5;

/** One number field in the toolbar. */
interface NumberField {
  readonly input: HTMLInputElement;
  readonly row: HTMLElement;
}

/**
 * Start the placement editor on a mounted screen.
 *
 * Returns a teardown. The teardown is safe to call twice, because the
 * toolbar's own Done button calls it and the shell calls it too when the
 * screen is replaced.
 */
export function startLayoutEditor(root: HTMLElement): () => void {
  let world: HTMLElement | null = root.querySelector<HTMLElement>('.gl__world');

  /* A screen with no outpost panel has nothing to place. */
  if (world === null) return () => {};

  const spots: Record<string, ModuleSpot> = {};

  for (const kind of KINDS) spots[kind] = { ...MODULE_SPOT[kind] };

  let selected: ModuleKind | null = null;
  let dragging: ModuleKind | null = null;
  let grab = { x: 0, y: 0 };
  let stopped = false;

  // --- The draggable handles, one per module kind. -------------------------

  const handles = new Map<ModuleKind, HTMLElement>();
  const box = h('div', { class: 'ble__box' });

  const guide = h('div', { class: 'ble__guide' });

  guide.style.setProperty('--ble-band-left', `${SPOT_BAND.left.min}%`);
  guide.style.setProperty('--ble-band-right', `${100 - SPOT_BAND.left.max}%`);
  guide.style.setProperty('--ble-band-bottom', `${SPOT_BAND.bottom.min}%`);
  guide.style.setProperty('--ble-band-top', `${100 - SPOT_BAND.bottom.max}%`);

  box.append(guide);

  for (const kind of KINDS) {
    const spec = specOf(kind);

    const handle = h(
      'div',
      {
        class: 'ble__handle',
        'data-kind': kind,
        tabindex: '0',
        role: 'button',
        'aria-label': `${spec.name} — drag to place, arrow keys to nudge`,
      },
      h('img', { src: moduleArt(kind), alt: '', 'aria-hidden': 'true' }),
      h('span', { class: 'ble__tag', 'aria-hidden': 'true' }, spec.name),
    );

    handle.addEventListener('pointerdown', (event) => onPointerDown(event, kind));
    handle.addEventListener('pointermove', (event) => onPointerMove(event, kind));
    handle.addEventListener('pointerup', (event) => onPointerUp(event, kind));
    handle.addEventListener('pointercancel', (event) => onPointerUp(event, kind));
    handle.addEventListener('keydown', (event) => onKeyDown(event, kind));

    handles.set(kind, handle);
    box.append(handle);
  }

  // --- The toolbar. --------------------------------------------------------

  function numberField(label: string, min: number, max: number): NumberField {
    const input = h('input', {
      class: 'ble__num',
      type: 'number',
      step: '0.5',
      min: String(min),
      max: String(max),
    });

    const row = h(
      'label',
      { class: 'ble__field' },
      h('span', { class: 'ble__field-label', text: label }),
      input,
    );

    return { input, row };
  }

  const left = numberField('left %', SPOT_BAND.left.min, SPOT_BAND.left.max);
  const bottom = numberField('bottom %', SPOT_BAND.bottom.min, SPOT_BAND.bottom.max);
  const width = numberField('width %', SPOT_BAND.width.min, SPOT_BAND.width.max);
  const depth = numberField('depth', 0, 20);

  const readout = h('p', { class: 'ble__readout', text: 'Pick a module.' });
  const jsonArea = h('textarea', { class: 'ble__json', rows: '12', readonly: true, spellcheck: false });

  const download = h('button', { class: 'ble__btn', type: 'button' }, 'Download JSON');
  const copy = h('button', { class: 'ble__btn', type: 'button' }, 'Copy JSON');
  const reset = h('button', { class: 'ble__btn', type: 'button' }, 'Reset');
  const done = h('button', { class: 'ble__btn ble__btn--primary', type: 'button' }, 'Done');

  const toolbar = h(
    'div',
    { class: 'ble__toolbar' },
    h('p', { class: 'ble__title', text: 'Placement editor' }),
    h('p', {
      class: 'ble__hint',
      text: 'Drag a module to place it. Extra copies of a module step right on their own.',
    }),
    readout,
    h('div', { class: 'ble__fields' }, left.row, bottom.row, width.row, depth.row),
    h('p', { class: 'ble__label', text: 'baseLayout.json — save it into src/ui/' }),
    jsonArea,
    h('div', { class: 'ble__buttons' }, download, copy, reset, done),
  );

  // --- Painting. -----------------------------------------------------------

  function render(): void {
    for (const kind of KINDS) {
      const handle = handles.get(kind);

      if (handle === undefined) continue;

      const spot = spots[kind];

      handle.style.setProperty('--ble-left', `${spot.left}%`);
      handle.style.setProperty('--ble-bottom', `${spot.bottom}%`);
      handle.style.setProperty('--ble-width', `${spot.width}%`);
      handle.style.setProperty('--ble-z', String(spot.z));
    }

    jsonArea.value = buildLayoutJson(spots);
  }

  function select(kind: ModuleKind): void {
    selected = kind;

    for (const [other, handle] of handles) {
      handle.classList.toggle('ble__handle--selected', other === kind);
    }

    showSpot(kind);
  }

  /** Put a module's numbers in the toolbar. */
  function showSpot(kind: ModuleKind): void {
    const spot = spots[kind];

    left.input.value = String(spot.left);
    bottom.input.value = String(spot.bottom);
    width.input.value = String(spot.width);
    depth.input.value = String(spot.z);

    readout.textContent = `${specOf(kind).name} — left ${spot.left}%, bottom ${spot.bottom}%.`;
  }

  function setSpot(kind: ModuleKind, spot: ModuleSpot): void {
    /* Rounded as well as clamped, so the toolbar, the readout and the file
     * all quote the same numbers. */
    spots[kind] = roundSpot(clampSpot(spot));

    render();

    /* The toolbar follows the drag, so the numbers on screen are always the
     * numbers in the file. */
    if (selected === kind) showSpot(kind);
  }

  /** Move the overlay over the outpost panel, wherever it now is. */
  function syncBox(): void {
    const panel = world;

    if (panel === null) return;

    const rect = panel.getBoundingClientRect();

    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  // --- Dragging. -----------------------------------------------------------

  function onPointerDown(event: PointerEvent, kind: ModuleKind): void {
    const handle = handles.get(kind);

    if (handle === undefined || world === null || dragging !== null) return;

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const rect = world.getBoundingClientRect();
    const spot = spots[kind];

    /* Remember where in the picture the pointer grabbed it, so the module
     * does not jump to the cursor when the drag starts. */
    grab = {
      x: event.clientX - (rect.left + (rect.width * spot.left) / 100),
      y: event.clientY - (rect.top + rect.height - (rect.height * spot.bottom) / 100),
    };

    dragging = kind;
    select(kind);
  }

  function onPointerMove(event: PointerEvent, kind: ModuleKind): void {
    if (dragging !== kind || world === null) return;

    const rect = world.getBoundingClientRect();
    const { left: nextLeft, bottom: nextBottom } = pointToPercent(
      { x: event.clientX - grab.x, y: event.clientY - grab.y },
      rect,
    );

    setSpot(kind, { ...spots[kind], left: nextLeft, bottom: nextBottom });
  }

  function onPointerUp(event: PointerEvent, kind: ModuleKind): void {
    if (dragging !== kind) return;

    const handle = handles.get(kind);

    if (handle !== undefined && handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }

    dragging = null;
  }

  function onKeyDown(event: KeyboardEvent, kind: ModuleKind): void {
    const step = event.shiftKey ? NUDGE_FAR : NUDGE;

    let delta: { left: number; bottom: number } | null = null;

    if (event.key === 'ArrowLeft') delta = { left: -step, bottom: 0 };
    else if (event.key === 'ArrowRight') delta = { left: step, bottom: 0 };
    else if (event.key === 'ArrowUp') delta = { left: 0, bottom: step };
    else if (event.key === 'ArrowDown') delta = { left: 0, bottom: -step };

    if (delta === null) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(kind);
      }

      return;
    }

    event.preventDefault();
    select(kind);
    setSpot(kind, {
      ...spots[kind],
      left: spots[kind].left + delta.left,
      bottom: spots[kind].bottom + delta.bottom,
    });
  }

  // --- The toolbar's actions. ----------------------------------------------

  function onFieldChange(): void {
    if (selected === null) return;

    setSpot(selected, {
      left: Number(left.input.value),
      bottom: Number(bottom.input.value),
      width: Number(width.input.value),
      z: Number(depth.input.value),
    });
  }

  function downloadJson(): void {
    const blob = new Blob([buildLayoutJson(spots)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: 'baseLayout.json' });

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyJson(): Promise<void> {
    const text = buildLayoutJson(spots);

    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Copied';
    } catch {
      /* Clipboard access can be refused. Selecting the text is the fallback
       * that always works. */
      jsonArea.select();
      copy.textContent = 'Select and copy';
    }

    window.setTimeout(() => {
      copy.textContent = 'Copy JSON';
    }, 1500);
  }

  function resetSpots(): void {
    for (const kind of KINDS) spots[kind] = { ...MODULE_SPOT[kind] };

    render();

    if (selected !== null) select(selected);
  }

  function finish(): void {
    /* Take the flag out of the address bar, so a reload lands on the game
     * rather than the editor. */
    const url = new URL(window.location.href);

    url.searchParams.delete('editlayout');
    window.history.replaceState(null, '', url.toString());

    stop();
  }

  for (const field of [left, bottom, width, depth]) {
    field.input.addEventListener('change', onFieldChange);
  }

  download.addEventListener('click', downloadJson);
  copy.addEventListener('click', () => void copyJson());
  reset.addEventListener('click', resetSpots);
  done.addEventListener('click', finish);

  // --- Staying in step with the screen. ------------------------------------

  /*
   * The screen replaces every child of its mount when the live forecast
   * arrives, which replaces the outpost panel with a new element. A
   * MutationObserver on the mount is how the overlay finds the new one.
   */
  const observer = new MutationObserver(() => {
    const next = root.querySelector<HTMLElement>('.gl__world');

    if (next === world) return;

    world?.classList.remove(EDITING_CLASS);
    world = next;
    world?.classList.add(EDITING_CLASS);

    syncBox();
  });

  observer.observe(root, { childList: true });

  window.addEventListener('resize', syncBox);

  // --- Going live. ---------------------------------------------------------

  world.classList.add(EDITING_CLASS);
  document.body.append(box, toolbar);

  syncBox();
  render();
  select(KINDS[0]);

  function stop(): void {
    if (stopped) return;

    stopped = true;

    observer.disconnect();
    window.removeEventListener('resize', syncBox);
    box.remove();
    toolbar.remove();
    world?.classList.remove(EDITING_CLASS);
  }

  return stop;
}
