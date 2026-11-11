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
 * Every copy of every module is on the panel at once — four solar arrays, two
 * regolith shields, one of everything else — because the file records a pose
 * for each copy and the player may build any number of them. The nth copy of
 * a kind stands on the nth pose in that kind's list.
 *
 * The overlay is a fixed layer on `document.body` rather than a set of
 * elements injected into the screen. `features/base` replaces every child of
 * its mount when the live forecast arrives, so anything injected into the
 * screen would be destroyed in the middle of a drag.
 */

import { h } from '../dom/h';
import { MODULE_CATALOGUE, type ModuleKind } from '../sim/modules';
import {
  DEFAULT_POSES,
  SPOT_BAND,
  buildLayoutJson,
  clampSpot,
  pointToPercent,
  roundSpot,
  type ModuleSpot,
} from './baseLayout';
import { moduleArt } from './gameLoop';

import './base-layout-editor.css';

/** The class put on the outpost panel while the editor is on. */
const EDITING_CLASS = 'gl__world--editing';

/** How far one arrow key nudges a module, in percent. */
const NUDGE = 0.5;

/** How far a shift and an arrow key nudges a module, in percent. */
const NUDGE_FAR = 5;

/** How much one key press changes a module's width, in percent. */
const RESIZE = 1;

/** How much a shift and a key press changes a module's width, in percent. */
const RESIZE_FAR = 5;

/** One copy of one module: which kind, and which copy of it. */
interface Instance {
  /** A stable key, e.g. `solar-array#2`. */
  readonly key: string;
  readonly kind: ModuleKind;
  /** Zero-based: copy 0 is the first one the player builds. */
  readonly copy: number;
  /** How many copies of this kind the player could build. */
  readonly total: number;
  /** What to call it in the toolbar. */
  readonly label: string;
}

/** Every copy of every module, in catalogue order. */
function buildInstances(): Instance[] {
  const instances: Instance[] = [];

  for (const spec of MODULE_CATALOGUE) {
    for (let copy = 0; copy < spec.maxCount; copy += 1) {
      instances.push({
        key: `${spec.kind}#${copy}`,
        kind: spec.kind,
        copy,
        total: spec.maxCount,
        label: spec.maxCount === 1 ? spec.name : `${spec.name} ${copy + 1} of ${spec.maxCount}`,
      });
    }
  }

  return instances;
}

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

  const instances = buildInstances();
  const poses: Record<string, ModuleSpot[]> = {};

  for (const spec of MODULE_CATALOGUE) {
    poses[spec.kind] = (DEFAULT_POSES[spec.kind] ?? []).map((spot) => ({ ...spot }));
  }

  let selected: string | null = null;
  let stopped = false;

  /** What a pointer is doing right now. */
  let drag: { key: string; mode: 'move' | 'resize'; grabX: number; grabY: number } | null = null;

  // --- The draggable handles, one per copy of every module. ----------------

  const handles = new Map<string, HTMLElement>();
  const box = h('div', { class: 'ble__box' });

  const guide = h('div', { class: 'ble__guide' });

  guide.style.setProperty('--ble-band-left', `${SPOT_BAND.left.min}%`);
  guide.style.setProperty('--ble-band-right', `${100 - SPOT_BAND.left.max}%`);
  guide.style.setProperty('--ble-band-bottom', `${SPOT_BAND.bottom.min}%`);
  guide.style.setProperty('--ble-band-top', `${100 - SPOT_BAND.bottom.max}%`);

  box.append(guide);

  for (const instance of instances) {
    /* The grip is the corner you drag to change the size. */
    const grip = h('span', {
      class: 'ble__grip',
      role: 'button',
      tabindex: '-1',
      'aria-hidden': 'true',
      title: 'Drag to resize',
    });

    const handle = h(
      'div',
      {
        class: 'ble__handle',
        'data-kind': instance.kind,
        'data-copy': String(instance.copy),
        tabindex: '0',
        role: 'button',
        'aria-label': `${instance.label} — drag to place, drag the corner to resize, arrow keys to nudge`,
      },
      h('img', { src: moduleArt(instance.kind), alt: '', 'aria-hidden': 'true' }),
      h('span', { class: 'ble__tag', 'aria-hidden': 'true' }, instance.label),
      grip,
    );

    handle.addEventListener('pointerdown', (event) => onPointerDown(event, instance, 'move'));
    handle.addEventListener('pointermove', (event) => onPointerMove(event, instance));
    handle.addEventListener('pointerup', (event) => onPointerUp(event));
    handle.addEventListener('pointercancel', (event) => onPointerUp(event));
    handle.addEventListener('keydown', (event) => onKeyDown(event, instance));

    grip.addEventListener('pointerdown', (event) => onPointerDown(event, instance, 'resize'));
    grip.addEventListener('pointermove', (event) => onPointerMove(event, instance));
    grip.addEventListener('pointerup', (event) => onPointerUp(event));
    grip.addEventListener('pointercancel', (event) => onPointerUp(event));

    handles.set(instance.key, handle);
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

  const picker = h('select', { class: 'ble__pick' });

  for (const instance of instances) {
    picker.append(h('option', { value: instance.key }, instance.label));
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
      text: 'Drag a module to move it, drag its corner to resize it. Every copy the player could build is here.',
    }),
    picker,
    readout,
    h('div', { class: 'ble__fields' }, left.row, bottom.row, width.row, depth.row),
    h('p', { class: 'ble__label', text: 'baseLayout.json — save it into src/ui/' }),
    jsonArea,
    h('div', { class: 'ble__buttons' }, download, copy, reset, done),
  );

  // --- Painting. -----------------------------------------------------------

  function render(): void {
    for (const instance of instances) {
      const handle = handles.get(instance.key);

      if (handle === undefined) continue;

      const spot = poses[instance.kind][instance.copy];

      handle.style.setProperty('--ble-left', `${spot.left}%`);
      handle.style.setProperty('--ble-bottom', `${spot.bottom}%`);
      handle.style.setProperty('--ble-width', `${spot.width}%`);

      /* The selected copy is drawn in front of the others. Copies of a kind
       * overlap, and a copy you cannot see is a copy you cannot grab — so
       * picking it from the toolbar brings it to the front. */
      handle.style.setProperty('--ble-z', instance.key === selected ? '999' : String(spot.z));
    }

    jsonArea.value = buildLayoutJson(poses);
  }

  function select(key: string): void {
    selected = key;

    for (const [other, handle] of handles) {
      handle.classList.toggle('ble__handle--selected', other === key);
    }

    const instance = instances.find((entry) => entry.key === key);

    if (instance === undefined) return;

    const spot = poses[instance.kind][instance.copy];

    picker.value = key;
    left.input.value = String(spot.left);
    bottom.input.value = String(spot.bottom);
    width.input.value = String(spot.width);
    depth.input.value = String(spot.z);

    readout.textContent = `${instance.label} — left ${spot.left}%, bottom ${spot.bottom}%, width ${spot.width}%.`;
  }

  function setSpot(instance: Instance, spot: ModuleSpot): void {
    poses[instance.kind][instance.copy] = roundSpot(clampSpot(spot));

    render();

    /* The toolbar follows the drag, so the numbers on screen are always the
     * numbers in the file. */
    if (selected === instance.key) showSpot(instance);
  }

  /** Put a module's numbers in the toolbar. */
  function showSpot(instance: Instance): void {
    const spot = poses[instance.kind][instance.copy];

    left.input.value = String(spot.left);
    bottom.input.value = String(spot.bottom);
    width.input.value = String(spot.width);
    depth.input.value = String(spot.z);

    readout.textContent = `${instance.label} — left ${spot.left}%, bottom ${spot.bottom}%, width ${spot.width}%.`;
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

  function onPointerDown(event: PointerEvent, instance: Instance, mode: 'move' | 'resize'): void {
    if (drag !== null || world === null) return;

    event.preventDefault();
    event.stopPropagation();

    const handle = handles.get(instance.key);

    if (handle === undefined) return;

    handle.setPointerCapture(event.pointerId);

    const rect = world.getBoundingClientRect();
    const spot = poses[instance.kind][instance.copy];

    if (mode === 'move') {
      /* Remember where in the picture the pointer grabbed it, so the module
       * does not jump to the cursor when the drag starts. */
      drag = {
        key: instance.key,
        mode,
        grabX: event.clientX - (rect.left + (rect.width * spot.left) / 100),
        grabY: event.clientY - (rect.top + rect.height - (rect.height * spot.bottom) / 100),
      };
    } else {
      /* Resizing grabs the right-hand edge, so the left edge stays put. */
      drag = {
        key: instance.key,
        mode,
        grabX: event.clientX - (rect.left + (rect.width * (spot.left + spot.width)) / 100),
        grabY: event.clientY,
      };
    }

    select(instance.key);
  }

  function onPointerMove(event: PointerEvent, instance: Instance): void {
    if (drag === null || drag.key !== instance.key || world === null) return;

    const rect = world.getBoundingClientRect();
    const spot = poses[instance.kind][instance.copy];

    if (drag.mode === 'move') {
      const { left: nextLeft, bottom: nextBottom } = pointToPercent(
        { x: event.clientX - drag.grabX, y: event.clientY - drag.grabY },
        rect,
      );

      setSpot(instance, { ...spot, left: nextLeft, bottom: nextBottom });

      return;
    }

    /* Resizing: the right edge follows the pointer, the left edge does not. */
    const rightPx = event.clientX - drag.grabX;
    const leftPx = rect.left + (rect.width * spot.left) / 100;
    const nextWidth = ((rightPx - leftPx) / rect.width) * 100;

    setSpot(instance, { ...spot, width: nextWidth });
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag === null) return;

    const handle = handles.get(drag.key);

    if (handle !== undefined && handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }

    drag = null;
  }

  function onKeyDown(event: KeyboardEvent, instance: Instance): void {
    const step = event.shiftKey ? NUDGE_FAR : NUDGE;
    const resize = event.shiftKey ? RESIZE_FAR : RESIZE;
    const spot = poses[instance.kind][instance.copy];

    let delta: { left: number; bottom: number } | null = null;

    if (event.key === 'ArrowLeft') delta = { left: -step, bottom: 0 };
    else if (event.key === 'ArrowRight') delta = { left: step, bottom: 0 };
    else if (event.key === 'ArrowUp') delta = { left: 0, bottom: step };
    else if (event.key === 'ArrowDown') delta = { left: 0, bottom: -step };

    if (delta !== null) {
      event.preventDefault();
      select(instance.key);
      setSpot(instance, { ...spot, left: spot.left + delta.left, bottom: spot.bottom + delta.bottom });

      return;
    }

    /* Plus and minus change the size, so the whole editor works from the
     * keyboard alone. */
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      select(instance.key);
      setSpot(instance, { ...spot, width: spot.width + resize });

      return;
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      select(instance.key);
      setSpot(instance, { ...spot, width: spot.width - resize });

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(instance.key);
    }
  }

  // --- The toolbar's actions. ----------------------------------------------

  function onFieldChange(): void {
    if (selected === null) return;

    const instance = instances.find((entry) => entry.key === selected);

    if (instance === undefined) return;

    setSpot(instance, {
      left: Number(left.input.value),
      bottom: Number(bottom.input.value),
      width: Number(width.input.value),
      z: Number(depth.input.value),
    });
  }

  function downloadJson(): void {
    const blob = new Blob([buildLayoutJson(poses)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: 'baseLayout.json' });

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyJson(): Promise<void> {
    const text = buildLayoutJson(poses);

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

  function resetPoses(): void {
    for (const spec of MODULE_CATALOGUE) {
      poses[spec.kind] = (DEFAULT_POSES[spec.kind] ?? []).map((spot) => ({ ...spot }));
    }

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

  picker.addEventListener('change', () => select(picker.value));

  download.addEventListener('click', downloadJson);
  copy.addEventListener('click', () => void copyJson());
  reset.addEventListener('click', resetPoses);
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
  select(instances[0].key);

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
