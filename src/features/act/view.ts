/**
 * `act/` view: advance one sol, then resolve the outcome.
 *
 * Owns the DOM only. Simulation lives in `src/sim/sol.ts` (advanceSol) and
 * `src/sim/modules.ts` (upkeepFor). Never imports `base/` or `debrief/` (R-5).
 *
 * What the screen shows:
 * - Sol counter and a day/night scene (`data-phase`)
 * - **Advance sol** and **Back to base** buttons
 * - The Power Surplus picture built from live numbers:
 *   sun → arrays → +N kW → storing M kW → night drain −K kW
 * - Location Conditions panel from the region scores
 * - Event log for the sol, with `approximate` events tagged (D-033)
 *
 * Behaviour:
 * - Advance calls `advanceSol` and plays the sol transition
 * - On `status !== 'active'`, `setRun`, then navigate to `debrief`
 * - Buttons are disabled during a transition so a double press cannot advance twice
 *
 * Accessibility: keyboard operable, no `on*` inline handlers.
 *
 * Styles go in ./act.css, imported here (AGENTS.md R-15).
 */

import { advanceSol } from '../../sim/sol';
import { newRun, type RunState } from '../../sim/run';
import { upkeepFor } from '../../sim/modules';
import { REGIONS } from '../../sim/regions';
import {
  NIGHT_DRAIN_BASE,
  SOLAR_POWER_PER_SUN_SCORE,
} from '../../sim/constants';
import type { SolEvent } from '../../sim/events';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import { eventsOn, formatSigned } from './model';

import './act.css';

function require<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`act: missing required element ${selector}`);
  }

  return element;
}

/** How long the sol transition holds the "resolving" state. */
const ADVANCE_MS = 700;

/** How long the outcome is held before the debrief takes over. */
const OUTCOME_MS = 600;

/**
 * Mount the screen into `root` and return a teardown.
 *
 * `run` is null when opened directly by hash; `newRun` creates a default run
 * so the screen still works.
 */
export function mountAct(
  root: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  let state = run ?? newRun('jezero');
  setRun(state);

  const solCounter = require<HTMLElement>(root, '[data-act-sol]');
  const phaseLayer = require<HTMLElement>(root, '[data-act-phase]');
  const advanceButton = require<HTMLButtonElement>(root, '[data-act-advance]');
  const backButton = require<HTMLButtonElement>(root, '[data-act-back]');
  const surplusPanel = require<HTMLElement>(root, '[data-act-surplus]');
  const conditionsPanel = require<HTMLElement>(root, '[data-act-conditions]');
  const eventLog = require<HTMLElement>(root, '[data-act-events]');

  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  let resolving = false;
  let disposed = false;

  render(state);
  renderEvents(eventsOn(state.sol));

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);
      timers.add(timer);
    });

  const onAdvance = async (): Promise<void> => {
    if (resolving || state.status !== 'active') return;

    resolving = true;
    advanceButton.disabled = true;
    backButton.disabled = true;
    phaseLayer.setAttribute('data-act-phase', 'resolving');

    await wait(ADVANCE_MS);
    if (disposed) return;

    const result = advanceSol(state);
    const entry = result.ledger[result.ledger.length - 1];

    state = {
      ...state,
      sol: entry.sol,
      stores: result.stores,
      status: result.status,
      ledger: result.ledger,
    };
    setRun(state);

    render(state);
    renderEvents(result.events);

    resolving = false;
    advanceButton.disabled = false;
    backButton.disabled = false;

    if (state.status === 'active') return;

    phaseLayer.setAttribute('data-act-phase', state.status);
    await wait(OUTCOME_MS);
    if (disposed) return;

    const stop = nextStop('act');
    if (stop !== null) {
      navigate(stop);
    }
  };

  const onBack = (): void => {
    navigate('base');
  };

  advanceButton.addEventListener('click', onAdvance);
  backButton.addEventListener('click', onBack);

  cleanups.push(
    () => advanceButton.removeEventListener('click', onAdvance),
    () => backButton.removeEventListener('click', onBack),
  );

  return () => {
    disposed = true;
    for (const timer of timers) {
      window.clearTimeout(timer);
    }
    timers.clear();
    for (const cleanup of cleanups) {
      cleanup();
    }
  };

  // ---- rendering --------------------------------------------------------

  function render(current: RunState): void {
    solCounter.textContent = `Sol ${current.sol}`;
    phaseLayer.setAttribute(
      'data-act-phase',
      current.status === 'active' ? 'day' : current.status,
    );
    renderSurplus(current);
    renderConditions(current);
  }

  function renderSurplus(current: RunState): void {
    const region = REGIONS.find((r) => r.id === current.regionId);
    const { powerDraw, solarArrays } = upkeepFor(current.modules);
    const sun = region ? region.scores.sun : 3;
    const generation = solarArrays * sun * SOLAR_POWER_PER_SUN_SCORE;
    const temp = region ? region.scores.temp : 3;
    const nightDrain = Math.max(1, NIGHT_DRAIN_BASE - temp);
    const surplus = generation - powerDraw - nightDrain;

    surplusPanel.innerHTML = `
      <div class="act__surplus-step">sun ${sun}</div>
      <div class="act__surplus-step">arrays ${solarArrays}</div>
      <div class="act__surplus-step generation">${formatSigned(generation)} kW</div>
      <div class="act__surplus-step draw">${formatSigned(-powerDraw)} kW</div>
      <div class="act__surplus-step night">${formatSigned(-nightDrain)} kW</div>
      <div class="act__surplus-step result">
        storing ${formatSigned(Math.max(0, surplus))} kW
      </div>
    `;
  }

  function renderConditions(current: RunState): void {
    const region = REGIONS.find((r) => r.id === current.regionId);
    const scores = region
      ? region.scores
      : { water: 3, sun: 3, terrain: 3, dust: 3, temp: 3 };

    conditionsPanel.innerHTML = `
      <div class="act__condition"><span class="act__condition-label">Water</span><span class="act__condition-value">${scores.water} / 5</span></div>
      <div class="act__condition"><span class="act__condition-label">Sun</span><span class="act__condition-value">${scores.sun} / 5</span></div>
      <div class="act__condition"><span class="act__condition-label">Terrain</span><span class="act__condition-value">${scores.terrain} / 5</span></div>
      <div class="act__condition"><span class="act__condition-label">Dust</span><span class="act__condition-value">${scores.dust} / 5</span></div>
      <div class="act__condition"><span class="act__condition-label">Temp</span><span class="act__condition-value">${scores.temp} / 5</span></div>
    `;
  }

  function renderEvents(events: readonly SolEvent[]): void {
    if (events.length === 0) {
      eventLog.innerHTML = '<div class="act__event-none">No events this sol.</div>';
      return;
    }

    eventLog.innerHTML = events
      .map(
        (event) => `
        <div class="act__event">
          <span class="act__event-kind">${formatEventKind(event.kind)}</span>
          <span class="act__event-summary">${event.summary}</span>
          ${event.approximate ? '<span class="act__event-approx">Estimated</span>' : ''}
        </div>
      `,
      )
      .join('');
  }

  function formatEventKind(kind: string): string {
    return kind
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
