import { describe, expect, it } from 'vitest';

import { newRun, startOutpost } from '../../sim/run';
import { CORE_MODULES } from '../../sim/modules';
import { WIN_SOL } from '../../sim/sol';
import { changeRows, MISSIONS, meterRows, missionHeadline, powerSentence, progressPercent, secondsLeft, toneFor } from './model';

const run = startOutpost(newRun('jezero', 'Test'), CORE_MODULES);

describe('act model', () => {
  it('has the ten missions from the README', () => {
    expect(MISSIONS).toHaveLength(10);
  });

  it('starts on the first mission and ends on the last', () => {
    expect(missionHeadline(run).title).toContain('Mission 1');
    expect(missionHeadline({ ...run, sol: WIN_SOL - 1 }).title).toContain('Mission 10');
  });

  it('keeps the last mission if the sol is somehow past the end', () => {
    expect(missionHeadline({ ...run, sol: 99 }).title).toContain('Mission 10');
  });

  it('shows all five stores, in order, as percentages', () => {
    const rows = meterRows(run);

    expect(rows.map((row) => row.name)).toEqual(['power', 'oxygen', 'water', 'food', 'shielding']);
    expect(rows.find((row) => row.name === 'power')?.percent).toBe(100);
  });

  it('looks worried below a quarter and alarmed below a tenth', () => {
    expect(toneFor(60)).toBe('ok');
    expect(toneFor(24)).toBe('low');
    expect(toneFor(9)).toBe('critical');
  });

  it('counts progress as a share of the run', () => {
    expect(progressPercent({ ...run, sol: 6 })).toBe(50);
  });

  it('counts the clock down to zero and stops', () => {
    expect(secondsLeft(10, 0)).toBe(10);
    expect(secondsLeft(10, 3500)).toBe(7);
    expect(secondsLeft(10, 99999)).toBe(0);
  });

  it('writes the power picture as a sentence for screen readers', () => {
    expect(powerSentence(45, 12, 30)).toBe('The arrays make 45 kW while the Sun is up. 12 kWh is stored. Night costs 30 kW for 12 hours.');
  });
});

describe('changeRows', () => {
  it('shows all five stores in the same order as the HUD', () => {
    const rows = changeRows({ power: 1, oxygen: 1, water: 1, food: 1, shielding: 1 });

    expect(rows.map((row) => row.name)).toEqual(['power', 'oxygen', 'water', 'food', 'shielding']);
  });

  it('signs and units power differently from the four tank stores', () => {
    const rows = changeRows({ power: 14.6, oxygen: -14.2, water: 0, food: -0.6, shielding: 3 });

    expect(rows.map((row) => row.text)).toEqual(['+15 kWh', '−14%', 'no change', '−1%', '+3%']);
    expect(rows.map((row) => row.tone)).toEqual(['gain', 'cost', 'flat', 'cost', 'gain']);
  });

  it('calls a rounded zero no change rather than showing a negative zero', () => {
    const rows = changeRows({ power: -0.4, oxygen: 0.4, water: 0, food: 0, shielding: 0 });
    const zeroes = rows.filter((row) => row.text === 'no change');

    expect(zeroes).toHaveLength(5);
    expect(rows.every((row) => row.tone === 'flat')).toBe(true);
  });
});
