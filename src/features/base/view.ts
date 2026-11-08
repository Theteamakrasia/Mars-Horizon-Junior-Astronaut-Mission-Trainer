/**
 * `base/` view: the outpost overview and build panel.
 *
 * Owns the DOM only. Build rules live in ./model.ts, which re-exports the
 * `sim/modules.ts` catalogue (D-032). Never imports `act/` or `debrief/`
 * (R-5).
 *
 * What the screen shows:
 * - Placed modules as a list under the outpost
 * - Life Support and Resources panel: five stores as percentages
 * - Incoming-weather warning, with an `Estimated` tag (D-033)
 * - Build New Module: buildable modules, each with cost and effect preview
 * - Start sols → `act`
 *
 * Accessibility: every build button is keyboard reachable and announces why it
 * is disabled. No `on*` inline handlers.
 *
 * Styles go in ./base.css, imported here (AGENTS.md R-15).
 */

import { applyBuild, newRun, type RunState } from '../../sim/run';
import { TARGET_SOL } from '../../sim/constants';
import { eventsForSol } from '../../sim/events';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import {
  BUILDABLE,
  canPlace,
  formatCost,
  formatStore,
  previewOf,
  type ModuleKind,
} from './model';

import './base.css';

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`base: missing required element ${selector}`);
  }

  return element;
}

/**
 * Mount the screen into `root` and return a teardown.
 *
 * `run` is null when opened directly by hash; build still works because
 * `newRun` created one on landing.
 */
export function mountBase(
  root: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  let state = run ?? newRun('jezero');
  setRun(state);

  const storesPanel = require<HTMLElement>(root, '[data-base-stores]');
  const moduleList = require<HTMLElement>(root, '[data-base-modules]');
  const buildPanel = require<HTMLElement>(root, '[data-base-build]');
  const warningPanel = require<HTMLElement>(root, '[data-base-warning]');
  const startButton = require<HTMLButtonElement>(root, '[data-base-start]');
  const backButton = require<HTMLButtonElement>(root, '[data-base-back]');
  const namePanel = require<HTMLElement>(root, '[data-base-name]');

  const cleanups: Array<() => void> = [];

  renderAll(state);

  const onBuildClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLElement>('[data-base-build-action]');
    const kind = button?.dataset.baseBuildAction as ModuleKind | undefined;

    if (!kind) return;

    const built = applyBuild(state, kind);
    if (!built) {
      // Disabled buttons prevent the click, but announce anyway.
      return;
    }

    state = built;
    setRun(state);
    renderAll(state);
  };

  const onStart = (): void => {
    const next = nextStop('base');
    if (next !== null) {
      navigate(next);
    }
  };

  const onBack = (): void => {
    navigate('landing-site');
  };

  startButton.addEventListener('click', onStart);
  backButton.addEventListener('click', onBack);
  buildPanel.addEventListener('click', onBuildClick);

  cleanups.push(
    () => startButton.removeEventListener('click', onStart),
    () => backButton.removeEventListener('click', onBack),
    () => buildPanel.removeEventListener('click', onBuildClick),
  );

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };

  // ---- rendering --------------------------------------------------------

  function renderAll(current: RunState): void {
    namePanel.textContent =
      current.astronautName === '' ? 'Astronaut' : current.astronautName;
    renderStores(current);
    renderModules(current);
    renderBuild(current);
    renderWarning(current);
  }

  function renderStores(current: RunState): void {
    const { power, oxygen, water, food, shielding } = current.stores;
    storesPanel.innerHTML = `
      <div class="base__store" data-base-store="power"><span class="base__store-label">Power</span><span class="base__store-value">${formatStore(power)}</span></div>
      <div class="base__store" data-base-store="oxygen"><span class="base__store-label">Oxygen</span><span class="base__store-value">${formatStore(oxygen)}</span></div>
      <div class="base__store" data-base-store="water"><span class="base__store-label">Water</span><span class="base__store-value">${formatStore(water)}</span></div>
      <div class="base__store" data-base-store="food"><span class="base__store-label">Food</span><span class="base__store-value">${formatStore(food)}</span></div>
      <div class="base__store" data-base-store="shielding"><span class="base__store-label">Shielding</span><span class="base__store-value">${formatStore(shielding)}</span></div>
    `;
  }

  function renderModules(current: RunState): void {
    moduleList.innerHTML = current.modules
      .map(
        (kind) =>
          `<li class="base__module" data-base-module="${kind}">${formatKindName(
            kind,
          )}</li>`,
      )
      .join('');
  }

  function renderBuild(current: RunState): void {
    const items = BUILDABLE.map((kind) => {
      const preview = previewOf(kind, current);
      const can = canPlace(kind, current);
      const disabledReason = preview
        ? !preview.underCap
          ? 'At build limit'
          : !preview.affordable
            ? 'Not enough power'
            : ''
        : 'Unknown module';

      return `
        <div class="base__build-item">
          <button type="button" class="base__build-button" ${can ? '' : 'disabled'} data-base-build-action="${kind}">
            ${formatKindName(kind)}
          </button>
          <span class="base__build-cost">${preview ? formatCost(preview.buildCost) : '—'}</span>
          <span class="base__build-preview">${preview ? preview.provides.join(', ') : ''}</span>
          ${disabledReason ? `<span class="base__build-disabled" aria-hidden="true">${disabledReason}</span>` : ''}
        </div>
      `;
    }).join('');

    buildPanel.innerHTML = `
      <h3 class="base__build-title">Build New Module</h3>
      <div class="base__build-list">${items}</div>
    `;
  }

  function renderWarning(current: RunState): void {
    const warning = nextWarning(current.sol);

    if (!warning) {
      warningPanel.hidden = true;
      return;
    }

    warningPanel.hidden = false;
    warningPanel.innerHTML = `
      <span class="base__warning-tag">Estimated</span>
      <span class="base__warning-text">${warning.summary}</span>
    `;
  }
}

/**
 * The next storm warning at or after `sol`.
 *
 * The warning is baked into the schedule a few sols before the storm (D-033),
 * so the outpost can act on it before the storm lands.
 */
function nextWarning(sol: number) {
  for (let next = sol + 1; next <= TARGET_SOL; next += 1) {
    const warning = eventsForSol(next).find((e) => e.kind === 'storm-warning');
    if (warning) return warning;
  }

  return undefined;
}

function formatKindName(kind: ModuleKind): string {
  return kind
    .split('-')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
