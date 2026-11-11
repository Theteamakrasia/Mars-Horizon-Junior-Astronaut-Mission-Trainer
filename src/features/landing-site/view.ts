/**
 * The landing-site screen: choose where to land on Mars.
 *
 * A rocket is in orbit and five regions are marked on the map. There is no
 * perfect choice — each is strong in some ways and dangerous in others. The
 * chosen region becomes part of RunState and is handed to the next screen, so
 * this screen never imports base/ or act/ (R-5).
 *
 * DOM and timing only. Scoring lives in ./model and is unit tested there.
 *
 * Accessibility: the five pins are buttons reachable by keyboard (Tab or
 * arrow keys, Enter to select), and the Site Analysis panel is a live region
 * that announces the selection.
 *
 * Styles go in ./landing-site.css, imported here. Do not add a line to
 * src/style.css — that is the landing page's stylesheet (AGENTS.md R-15).
 *
 * Task: TASK-028.
 */

import { landAt, newRun, type RunState } from '../../sim/run';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';
import { nasaCard } from '../../ui/nasaCard';
import { h } from '../../dom/h';
import { regionCard } from '../../data/nasaGallery';

import { REGIONS, SITE_AXES, scoreRegion, tradeoffSummary } from './model';

import './landing-site.css';

// Three levels up: src/features/landing-site/ -> src/features/ -> src/ -> repo root.
// Typed asset imports, so Vite fingerprints these and emits them into dist/.
import mapUrl from '../../../Assets/images/landing-site/map.webp';
import arcadiaUrl from '../../../Assets/images/landing-site/arcadia.webp';
import jezeroUrl from '../../../Assets/images/landing-site/jezero.webp';
import olympusUrl from '../../../Assets/images/landing-site/olympus.webp';
import vallesUrl from '../../../Assets/images/landing-site/valles.webp';
import argyreUrl from '../../../Assets/images/landing-site/argyre.webp';

/** Thumbnail image per region id, matching `data-landing-pin` values. */
const THUMBNAILS: Readonly<Record<string, string>> = {
  arcadia: arcadiaUrl,
  jezero: jezeroUrl,
  olympus: olympusUrl,
  valles: vallesUrl,
  argyre: argyreUrl,
};

/** How long the landing transition runs before navigating. */
const LANDING_MS = 600;

/** Fallback when a thumbnail image fails to load. */
const THUMBNAIL_FALLBACK_MS = 700;

/** How long the name/blurb crossfade holds each half. */
const PANEL_CROSSFADE_MS = 220;

/**
 * Resolve a child of the screen root, throwing if the markup and this file have
 * drifted apart. Far easier to debug than a null dereference on click.
 */
function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`landing-site: missing required element ${selector}`);
  }

  return element;
}

/**
 * Mount the screen into `root` and return a teardown.
 *
 * `run` may be null when the screen is opened directly by hash; in that case a
 * fresh run is created from the chosen region. Otherwise the chosen region is
 * merged into the existing run with `withState`.
 */
export function mountLandingSite(
  root: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  const stage = require<HTMLElement>(root, '[data-landing-stage]');
  const map = require<HTMLImageElement>(root, '[data-landing-map]');
  const name = require<HTMLHeadingElement>(root, '[data-landing-name]');
  const blurb = require<HTMLParagraphElement>(root, '[data-landing-blurb]');
  const thumbA = require<HTMLImageElement>(root, '[data-landing-thumb-a]');
  const thumbB = require<HTMLImageElement>(root, '[data-landing-thumb-b]');
  const summary = require<HTMLParagraphElement>(root, '[data-landing-summary]');
  const landButton = require<HTMLButtonElement>(root, '[data-landing-land]');
  const hint = require<HTMLParagraphElement>(root, '[data-landing-hint]');
  const nasaDataButton = require<HTMLButtonElement>(root, '[data-landing-nasa-data]');

  const pins = [...root.querySelectorAll<HTMLButtonElement>('[data-landing-pin]')];

  // The wrapper is the positioned ancestor for the two absolute thumbnail
  // layers. Requiring it makes a missing wrapper throw on mount instead of
  // letting the images anchor to .landing-site and cover the whole screen.
  require<HTMLElement>(root, '[data-landing-thumbnails]');

  const pinList = require<HTMLUListElement>(root, '[data-landing-pins]');

  // Each axis row ships an empty container; the five dots are built here so
  // the markup stays declarative and the count lives in one place.
  const scoreContainers: Record<string, HTMLElement> = {};
  const scoreDots: Record<string, HTMLSpanElement[]> = {};

  for (const axis of SITE_AXES) {
    const container = require<HTMLElement>(root, `[data-landing-score="${axis}"]`);
    container.setAttribute('role', 'img');

    const dots: HTMLSpanElement[] = [];

    for (let i = 0; i < 5; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'landing-site__dot';
      dot.style.setProperty('--i', `${i}`);
      container.append(dot);
      dots.push(dot);
    }

    scoreContainers[axis] = container;
    scoreDots[axis] = dots;
  }

  // The map fades up once it is ready. Resting state is already correct; the
  // opacity transition decorates the entrance.
  map.src = mapUrl;
  if (map.complete) {
    map.classList.add('is-ready');
  } else {
    map.addEventListener(
      'load',
      () => {
        map.classList.add('is-ready');
      },
      { once: true },
    );
  }

  // Thumbnail A starts as the front layer.
  thumbA.classList.add('is-front');

  let frontThumb: HTMLImageElement = thumbA;
  let selectedRegionId: string | null = null;
  let selectedPin: HTMLButtonElement | null = null;
  let landFirstSelection = true;
  let nasaDataOpen = false;
  let nasaDataOverlay: HTMLElement | null = null;

  const cleanups: Array<() => void> = [];
  const timers: number[] = [];

  function clearTimers(): void {
    for (const timer of timers) {
      window.clearTimeout(timer);
    }
    timers.length = 0;
  }

  /**
   * Roving tabindex: the five pins are one Tab stop, and the arrow keys move
   * both focus and the stop. Without this every pin is separately tabbable,
   * so crossing the group takes five presses.
   */
  function setRovingTabStop(index: number): void {
    for (const [i, pin] of pins.entries()) {
      pin.tabIndex = i === index ? 0 : -1;
    }
  }

  setRovingTabStop(0);

  function setHint(message: string): void {
    hint.textContent = message;
  }

  /**
   * Fill the five score dots for an axis according to the score (0-5).
   * Dots transition with a stagger so the fill reads left to right.
   */
  function setAxisDots(axis: string, score: number): void {
    const dots = scoreDots[axis];
    for (const [index, dot] of dots.entries()) {
      dot.classList.toggle('is-filled', index < score);
    }

    scoreContainers[axis].setAttribute('aria-label', `${score} out of 5`);
  }

  /**
   * Crossfade the panel text: fade out, replace, fade in.
   */
  function crossfadeText(element: HTMLElement, text: string): void {
    element.classList.remove('is-visible');
    const timer = window.setTimeout(() => {
      element.textContent = text;
      element.classList.add('is-visible');
    }, PANEL_CROSSFADE_MS / 2);
    timers.push(timer);
  }

  /**
   * Reveal the summary after the dots have filled.
   */
  function revealSummary(text: string): void {
    summary.textContent = text;
    const timer = window.setTimeout(() => {
      summary.classList.add('is-visible');
    }, PANEL_CROSSFADE_MS);
    timers.push(timer);
  }

  /**
   * Crossfade the thumbnail between the two stacked layers. The back layer
   * loads the new image; once it is ready (or after a 700 ms fallback) it
   * becomes the front layer.
   */
  function setThumbnail(regionId: string): void {
    const url = THUMBNAILS[regionId];
    const back = frontThumb === thumbA ? thumbB : thumbA;

    back.src = url;
    back.classList.remove('is-front');

    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      frontThumb.classList.remove('is-front');
      back.classList.add('is-front');
      frontThumb = back;
    };

    const fallback = window.setTimeout(finish, THUMBNAIL_FALLBACK_MS);
    timers.push(fallback);

    back.addEventListener(
      'load',
      () => {
        finish();
      },
      { once: true },
    );
  }

  /**
   * Show the real NASA picture of the chosen region, so the pin on the map is
   * a real place rather than a dot.
   *
   * The figure is rebuilt only when the region changes; a comparison between
   * two regions swaps the whole card rather than re-requesting the image.
   */
  /** Modal popup showing the real NASA data card for the selected region. */
  function buildNasaDataModal(): HTMLElement {
    const card = selectedRegionId ? regionCard(selectedRegionId) : null;
    const overlay = h('div', { class: 'landing-site__nasa-modal-overlay' });

    if (card === null) {
      overlay.appendChild(
        h('div', { class: 'landing-site__nasa-modal' }, h('p', { text: 'No NASA data available for this region.' })),
      );
      return overlay;
    }

    const modal = h(
      'div',
      { class: 'landing-site__nasa-modal' },
      h('button', {
        class: 'landing-site__nasa-modal-close',
        type: 'button',
        'aria-label': 'Close NASA data',
        text: '✕',
      }),
      nasaCard(card, 'A real NASA picture'),
    );
    overlay.appendChild(modal);

    const close = (): void => {
      nasaDataOpen = false;
      overlay.remove();
      nasaDataOverlay = null;
    };

    modal.querySelector('.landing-site__nasa-modal-close')!.addEventListener('click', close);
    overlay.addEventListener('click', (event: MouseEvent) => {
      if (event.target === overlay) close();
    });

    return overlay;
  }

  function onNasaDataClick(): void {
    if (nasaDataOpen) return;
    nasaDataOpen = true;
    nasaDataOverlay = buildNasaDataModal();
    root.appendChild(nasaDataOverlay);
    (nasaDataOverlay.querySelector('.landing-site__nasa-modal-close') as HTMLElement).focus();
  }

  /**
   * Select a region: move the reticle to its pin, re-render the panel, and
   * enable LAND HERE on the first selection.
   */
  function selectRegion(regionId: string, pin: HTMLButtonElement): void {
    if (selectedRegionId === regionId) return;

    // Reticle: previous pin reverts at the same moment.
    if (selectedPin !== null) {
      selectedPin.setAttribute('aria-pressed', 'false');
    }
    selectedPin = pin;
    selectedRegionId = regionId;
    pin.setAttribute('aria-pressed', 'true');
    pin.focus();
    setRovingTabStop(pins.indexOf(pin));

    const region = REGIONS.find((r) => r.id === regionId);

    if (region) {
      crossfadeText(name, region.name);
      name.classList.add('is-selected');
      crossfadeText(blurb, region.blurb);

      const score = scoreRegion(regionId);
      for (const axis of SITE_AXES) {
        setAxisDots(axis, score[axis]);
      }

      revealSummary(tradeoffSummary(score));
      setThumbnail(regionId);

      setHint(`Selected ${region.name}. Press Land here to commit.`);
    }

    // LAND HERE enables on the first selection only, with a brightness lift.
    if (landFirstSelection) {
      landFirstSelection = false;
      landButton.disabled = false;
      landButton.classList.add('is-first-selection');
    }
  }

  function onPinClick(event: MouseEvent): void {
    const pin = event.currentTarget as HTMLButtonElement;
    const regionId = pin.dataset.landingPin;

    if (!regionId || regionId === selectedRegionId) return;

    selectRegion(regionId, pin);
  }

  /**
   * Arrow-key roving between pins, plus Home/End. Enter and Space are left to
   * the browser's native button activation, which fires `click`.
   */
  function onPinKeydown(event: KeyboardEvent): void {
    const pin = event.target as HTMLElement;
    if (!(pin instanceof HTMLButtonElement) || !pins.includes(pin)) return;

    const index = pins.indexOf(pin);
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % pins.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index + pins.length - 1) % pins.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = pins.length - 1;
        break;
    }

    if (next === null) return;

    event.preventDefault();
    setRovingTabStop(next);
    pins[next].focus();
  }

  function onLandClick(): void {
    const regionId = selectedRegionId;
    if (!regionId || landButton.disabled) return;

    // Disable pins and button so a double click cannot queue two navigations.
    for (const pin of pins) {
      pin.setAttribute('disabled', 'true');
    }
    landButton.disabled = true;
    setHint('Landing...');

    // The push-in lands on the chosen pin.
    const pin = selectedPin!;
    const pinRect = pin.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const originX = ((pinRect.left + pinRect.width / 2) - stageRect.left) / stageRect.width * 100;
    const originY = ((pinRect.top + pinRect.height / 2) - stageRect.top) / stageRect.height * 100;

    stage.style.setProperty('--land-origin-x', `${originX}%`);
    stage.style.setProperty('--land-origin-y', `${originY}%`);
    stage.classList.add('is-landing');

    const timer = window.setTimeout(() => {
      commitLanding(regionId);
    }, LANDING_MS);
    timers.push(timer);
  }

  /**
   * Hand the chosen region to the shell as run state, then navigate to the
   * next stop. `landAt` sets the region and applies region-adjusted starting
   * stores — `withState(run, { regionId })` left the stores at defaults, which
   * made the landing choice cosmetic (ISS-040).
   */
  function commitLanding(regionId: string): void {
    const next = run === null ? newRun(regionId) : landAt(run, regionId);
    setRun(next);

    const stop = nextStop('landing-site');

    if (stop !== null) {
      navigate(stop);
    }
  }

  for (const pin of pins) {
    const regionId = pin.dataset.landingPin;
    if (!regionId) continue;

    // Place each pin at its authored position on the map, in stage
    // percentages, so it stays on the same feature at any window size.
    const region = REGIONS.find((r) => r.id === regionId);

    if (region) {
      pin.style.setProperty('--pin-x', `${region.pin.x}%`);
      pin.style.setProperty('--pin-y', `${region.pin.y}%`);
    }

    pin.addEventListener('click', onPinClick);
    cleanups.push(() => {
      pin.removeEventListener('click', onPinClick);
    });
  }

  // One delegated listener owns arrow-key roving for the whole pin group.
  pinList.addEventListener('keydown', onPinKeydown);
  cleanups.push(() => {
    pinList.removeEventListener('keydown', onPinKeydown);
  });

  landButton.addEventListener('click', onLandClick);
  cleanups.push(() => {
    landButton.removeEventListener('click', onLandClick);
  });

  nasaDataButton.addEventListener('click', onNasaDataClick);
  cleanups.push(() => {
    nasaDataButton.removeEventListener('click', onNasaDataClick);
  });

  setHint('Choose a landing site.');

  return () => {
    clearTimers();

    if (nasaDataOverlay !== null) {
      nasaDataOverlay.remove();
      nasaDataOverlay = null;
      nasaDataOpen = false;
    }

    if (selectedPin !== null) {
      selectedPin.setAttribute('aria-pressed', 'false');
    }

    for (const pin of pins) {
      pin.removeAttribute('disabled');
    }

    stage.classList.remove('is-landing');
    stage.style.removeProperty('--land-origin-x');
    stage.style.removeProperty('--land-origin-y');

    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
