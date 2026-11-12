/**
 * The mission-day tracker: the header's "DAY 3 OF 12 DAYS" and its twelve pips.
 *
 * Lives in `ui/` because three screens need it — the build screen, the desk and
 * the debrief — and a feature may never import another feature (R-5). It knows
 * nothing about how a sol is run: the run arrives as an argument and the model
 * below reads it.
 *
 * The model is pure and separate from the markup on purpose. The number in the
 * header is the one thing a child will read on every screen, and it has to agree
 * with the run every time. `dayModel()` is therefore the whole truth of the
 * tracker, and it is testable without a browser.
 *
 * One rule decides everything: `run.sol` counts the sols already flown, so the
 * day in play is `sol + 1`. The first day is day 1, the day after the first sol
 * is day 2, and a run that is over has no day in play at all.
 */

import { h } from '../dom/h';
import type { RunState } from '../sim/run';
import { WIN_SOL } from '../sim/sol';

import './day-tracker.css';

/** Where one day sits in the mission. */
export type DayState = 'done' | 'current' | 'upcoming';

/** Everything the tracker draws, worked out from a run. */
export interface DayModel {
  /** The day in play, 1-based. The last day reached once the run is over. */
  readonly day: number;
  /** Days already flown. */
  readonly done: number;
  /** Days in the mission. */
  readonly total: number;
  /** One entry per day, in order. */
  readonly states: readonly DayState[];
  /** The sol that was just flown, so the tracker can flash it. 0 for none. */
  readonly advanced: number;
}

/**
 * The tracker's model for a run.
 *
 * Pure. A missing run is day 1 of 12 with nothing done, which is what the
 * build screen shows before the first sol.
 *
 * `advanced` is the sol that has just been flown, so the tracker can flash that
 * one pip. The caller owns it: the run itself does not record which pip the
 * player was looking at a moment ago.
 */
export function dayModel(run: RunState | null, advanced = 0): DayModel {
  const total = WIN_SOL;
  const done = clamp(run?.sol ?? 0, 0, total);

  /* A run that is over has no day in play. Showing a live pip for a day that
     never happened would be a lie, so the last day reached stands as the day. */
  const finished = run !== null && run.status !== 'active';
  const day = finished ? Math.max(done, 1) : Math.min(done + 1, total);

  const states: DayState[] = [];

  for (let index = 1; index <= total; index += 1) {
    if (index <= done) states.push('done');
    else if (index === day && !finished) states.push('current');
    else states.push('upcoming');
  }

  return { day, done, total, states, advanced };
}

/**
 * The tracker itself: the day, the total, and one pip per mission day.
 *
 * The words are written in sentence case and uppercased in the stylesheet, so a
 * screen reader says "Day 2 of 12 days" instead of shouting it. The pips are
 * decoration for a reader and hidden from one; the sentence underneath says in
 * words what the pips say in shape.
 */
export function dayTracker(model: DayModel): HTMLElement {
  const track = h('span', {
    class: 'gl__day-track',
    'aria-hidden': 'true',
    style: `--gl-day-total:${model.total}; --gl-day-index:${model.day}`,
  });

  model.states.forEach((state, index) => {
    const day = index + 1;

    track.append(
      h('span', {
        class: 'gl__day-pip',
        'data-state': state,
        'data-advanced': model.advanced === day ? 'true' : null,
      }),
    );
  });

  const complete = model.done === 1 ? '1 day complete.' : `${model.done} days complete.`;

  return h(
    'div',
    { class: 'gl__day' },
    h('span', { class: 'gl__day-word', text: 'Day' }),
    h('span', { class: 'gl__day-number', text: String(model.day) }),
    h('span', { class: 'gl__day-total', text: `of ${model.total} days` }),
    track,
    h('span', { class: 'gl__sr-only', text: complete }),
  );
}

/** A number inside a range. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high));
}
