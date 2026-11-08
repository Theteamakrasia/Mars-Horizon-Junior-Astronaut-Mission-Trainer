/**
 * `debrief/` view: explain why the run was won or lost.
 *
 * Owns the DOM only. Attribution lives in ./model.ts. Never imports `base/`
 * or `act/` (R-5).
 *
 * What the screen shows:
 * - The outcome headline and detail (won or lost, never "you failed")
 * - A sol-by-sol timeline of the five stores, drawn with CSS bars
 * - Resources used, and weather damage that preparation could have reduced
 * - The real cause, attributed from ledger changes, with a confidence note
 * - An honesty note: the weather is baked in, not a live NASA feed (D-033)
 * - A way back to replay (navigate to `landing-site` to land again)
 *
 * R-20: no game-over screen that just says "you failed." A losing run gets a
 * debrief explaining the actual cause. Failures cost resources, never a life.
 *
 * Accessibility: keyboard operable, every bar has a text label, no `on*`
 * inline handlers.
 *
 * Styles go in ./debrief.css, imported here (AGENTS.md R-15).
 */

import { type RunState } from '../../sim/run';
import type { ResourceStores } from '../../sim/resources';
import { navigate } from '../../ui/router';

import {
  explainOutcome,
  consumptionSummary,
  type ConsumptionSummary,
  type Explanation,
} from './model';

import './debrief.css';

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`debrief: missing required element ${selector}`);
  }

  return element;
}

/** The five stores, in panel order. */
const STORE_ORDER: ReadonlyArray<{
  key: keyof ResourceStores;
  label: string;
}> = [
  { key: 'power', label: 'Power' },
  { key: 'oxygen', label: 'Oxygen' },
  { key: 'water', label: 'Water' },
  { key: 'food', label: 'Food' },
  { key: 'shielding', label: 'Shielding' },
];

/**
 * Mount the screen into `root` and return a teardown.
 *
 * `run` is null when opened directly by hash; fall back to an empty run so the
 * screen still renders rather than throwing.
 */
export function mountDebrief(
  root: HTMLElement,
  run: RunState | null,
  _setRun: (_next: RunState | null) => void,
): () => void {
  const current = run ?? newEmptyRun();

  const outcomePanel = require<HTMLElement>(root, '[data-debrief-outcome]');
  const timelinePanel = require<HTMLElement>(root, '[data-debrief-timeline]');
  const summaryPanel = require<HTMLElement>(root, '[data-debrief-summary]');
  const lessonPanel = require<HTMLElement>(root, '[data-debrief-lesson]');
  const backButton = require<HTMLButtonElement>(root, '[data-debrief-back]');

  const cleanups: Array<() => void> = [];

  const explanation = explainOutcome(current, []);
  const summary = consumptionSummary(current, []);

  renderOutcome(outcomePanel, explanation, current);
  renderTimeline(timelinePanel, current);
  renderSummary(summaryPanel, summary);
  renderLesson(lessonPanel, explanation, current);

  const onBack = (): void => {
    // Replay from the landing-site choice. The run keeps the astronaut's name;
    // `landAt` resets stores, sol, modules and ledger on the next landing.
    navigate('landing-site');
  };

  backButton.addEventListener('click', onBack);
  cleanups.push(() => backButton.removeEventListener('click', onBack));

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };

  // ---- rendering --------------------------------------------------------

  function renderOutcome(
    panel: HTMLElement,
    explanation: Explanation,
    state: RunState,
  ): void {
    const won = state.status === 'won';
    panel.classList.toggle('debrief__outcome--won', won);
    panel.classList.toggle('debrief__outcome--lost', !won);

    panel.innerHTML = `
      <h2 class="debrief__headline">${won ? 'Mission complete.' : 'The mission ended.'}</h2>
      <p class="debrief__detail">${explanation.detail}</p>
      <p class="debrief__confidence">
        ${explanation.confident ? 'The game is confident about this cause.' : 'The game is not certain — read the timeline and decide for yourself.'}
      </p>
    `;
  }

  function renderTimeline(panel: HTMLElement, state: RunState): void {
    const entries = state.ledger;

    if (entries.length === 0) {
      panel.innerHTML =
        '<div class="debrief__timeline-empty">No sols were completed.</div>';
      return;
    }

    panel.innerHTML = `
      <h3 class="debrief__section-title">Sol by sol</h3>
      <ul class="debrief__timeline">
        ${entries.map((entry) => renderSol(entry.sol, entry.stores)).join('')}
      </ul>
      <p class="debrief__note">
        Space-weather events are estimated from baked-in data, not a live NASA feed.
      </p>
    `;
  }

  function renderSol(sol: number, stores: ResourceStores): string {
    const bars = STORE_ORDER.map(({ key, label }) => {
      const value = Math.max(0, Math.min(100, stores[key]));
      return `
        <span class="debrief__bar debrief__bar--${key}" style="--value: ${value}" title="${label} ${value}%">
          <span class="debrief__bar-fill"></span>
        </span>
      `;
    }).join('');

    return `
      <li class="debrief__timeline-sol">
        <span class="debrief__timeline-sol-label">Sol ${sol}</span>
        <span class="debrief__bars" aria-label="Sol ${sol} stores">${bars}</span>
        <span class="debrief__timeline-sol-values">
          ${STORE_ORDER.map(({ key, label }) => `${label} ${stores[key]}%`).join(' · ')}
        </span>
      </li>
    `;
  }

  function renderSummary(
    panel: HTMLElement,
    summary: ConsumptionSummary,
  ): void {
    panel.innerHTML = `
      <h3 class="debrief__section-title">Resources</h3>
      <div class="debrief__summary-row">
        <span class="debrief__summary-label">Total used</span>
        <span class="debrief__summary-value">${summary.used}</span>
      </div>
      <div class="debrief__summary-row">
        <span class="debrief__summary-label">Lost to weather</span>
        <span class="debrief__summary-value">${summary.wasted}</span>
      </div>
      <p class="debrief__note">
        Weather damage is what a radiation shelter or more power would have absorbed.
      </p>
    `;
  }

  function renderLesson(
    panel: HTMLElement,
    explanation: Explanation,
    state: RunState,
  ): void {
    const won = state.status === 'won';
    const modules = state.modules.join(', ') || 'none';

    panel.innerHTML = `
      <h3 class="debrief__section-title">${won ? 'Self-sustaining outpost' : 'What to try next time'}</h3>
      <p class="debrief__lesson-cause">${explanation.headline}</p>
      <p class="debrief__lesson-detail">${explanation.detail}</p>
      <p class="debrief__lesson-modules">
        Modules on the outpost: ${modules}.
      </p>
    `;
  }
}

function newEmptyRun(): RunState {
  return {
    sol: 0,
    regionId: '',
    astronautName: '',
    stores: { power: 0, oxygen: 0, water: 0, food: 0, shielding: 0 },
    status: 'active',
    modules: [],
    ledger: [],
  };
}
