/**
 * Presentation helpers for the act screen.
 *
 * Deliberately thin: every simulation rule — drain, events, loss — lives in
 * `src/sim/sol.ts`, where it is tested. This file only decides how a run is
 * worded and which meters look worrying.
 */

import { RESOURCE_NAMES, percentOf, type ResourceName, type ResourceStores } from '../../sim/resources';
import type { RunState } from '../../sim/run';
import { systemsFor } from '../../sim/modules';
import { WIN_SOL } from '../../sim/sol';

/** A headline and a line under it for the sol about to be played. */
export interface ActPresentation {
  readonly title: string;
  readonly subtitle: string;
}

/**
 * The ten missions from the README, spread over the run's sols.
 *
 * They are the story of the outpost growing, shown as the headline. They do not
 * change the rules — the rules are the forecast and the resources.
 */
export const MISSIONS: readonly { readonly title: string; readonly subtitle: string }[] = [
  { title: 'Mission 1: Establish Outpost', subtitle: 'Nothing works without power. Watch the batteries.' },
  { title: 'Mission 2: Survey the Environment', subtitle: 'Read your site before trusting it.' },
  { title: 'Mission 3: Robotic Operations', subtitle: 'Rovers do the routine jobs so people do not have to.' },
  { title: 'Mission 4: First EVA', subtitle: 'Suits, airlocks and the clock: every spacewalk is on a budget.' },
  { title: 'Mission 5: Find Resources', subtitle: 'What you can find here is cargo you do not have to launch.' },
  { title: 'Mission 6: Make Water (ISRU)', subtitle: 'Turn local ice and dirt into supplies.' },
  { title: 'Mission 7: First Harvest', subtitle: 'Food you grow is food you do not launch.' },
  { title: 'Mission 8: Survive a Major Hazard', subtitle: 'A dust storm tests everything you prepared.' },
  { title: 'Mission 9: Science Expedition', subtitle: 'Research is the whole point of being here.' },
  { title: 'Mission 10: Expand the Outpost', subtitle: 'Grow without losing stability.' },
];

/** The mission for a sol (1-based). Sols past the tenth keep the last mission. */
export function missionHeadline(run: RunState): ActPresentation {
  const sol = Math.min(WIN_SOL, run.sol + 1);
  const index = Math.min(MISSIONS.length - 1, Math.max(0, Math.round(((sol - 1) / (WIN_SOL - 1)) * (MISSIONS.length - 1))));

  return MISSIONS[index];
}

export type MeterTone = 'ok' | 'low' | 'critical';

export interface MeterRow {
  readonly name: ResourceName;
  readonly label: string;
  readonly emoji: string;
  readonly percent: number;
  readonly tone: MeterTone;
}

export const RESOURCE_LABELS: Readonly<Record<ResourceName, { readonly label: string; readonly emoji: string }>> = {
  power: { label: 'Power', emoji: '⚡' },
  oxygen: { label: 'Oxygen', emoji: '🫁' },
  water: { label: 'Water', emoji: '💧' },
  food: { label: 'Food', emoji: '🍞' },
  shielding: { label: 'Shielding', emoji: '🛡️' },
};

/** How worried a meter should look. Below a quarter is low; below a tenth is critical. */
export function toneFor(percent: number): MeterTone {
  if (percent < 10) return 'critical';
  if (percent < 25) return 'low';

  return 'ok';
}

/** One row per store, ready to draw. */
export function meterRows(run: RunState): readonly MeterRow[] {
  const capacity = systemsFor(run.modules, run.regionId).batteryKwh;

  return RESOURCE_NAMES.map((name) => {
    const percent = percentOf(name, run.stores, capacity);

    return { name, ...RESOURCE_LABELS[name], percent, tone: toneFor(percent) };
  });
}

/** One line of the "what this sol changed" strip. */
export interface ChangeRow {
  readonly name: ResourceName;
  readonly label: string;
  readonly emoji: string;
  /** Signed and unit-bearing, e.g. `+14 kWh` or `−3%`. */
  readonly text: string;
  readonly tone: 'gain' | 'cost' | 'flat';
}

/**
 * Turn a sol's net change into five readable rows.
 *
 * Power is kWh in the batteries; the other four are percentage points of a
 * tank. A rounded zero says "no change" rather than `−0`, which a child would
 * read as a loss that did not happen.
 */
export function changeRows(net: ResourceStores): readonly ChangeRow[] {
  return RESOURCE_NAMES.map((name) => {
    const value = Math.round(net[name]);
    const unit = name === 'power' ? ' kWh' : '%';
    const text = value === 0 ? 'no change' : `${value > 0 ? '+' : '−'}${Math.abs(value)}${unit}`;

    return {
      name,
      ...RESOURCE_LABELS[name],
      text,
      tone: value > 0 ? 'gain' : value < 0 ? 'cost' : 'flat',
    };
  });
}

/** How far through the run the player is, 0-100. */
export function progressPercent(run: RunState): number {
  return Math.round((run.sol / WIN_SOL) * 100);
}

/** Whole seconds left, never negative. */
export function secondsLeft(totalSeconds: number, elapsedMs: number): number {
  return Math.max(0, Math.ceil(totalSeconds - elapsedMs / 1000));
}

/** Words for a night-power picture, so it can be read aloud as well as seen. */
export function powerSentence(generatedKw: number, storedKwh: number, nightDrainKw: number): string {
  return `The arrays make ${generatedKw} kW while the Sun is up. ${storedKwh} kWh is stored. Night costs ${nightDrainKw} kW for 12 hours.`;
}
