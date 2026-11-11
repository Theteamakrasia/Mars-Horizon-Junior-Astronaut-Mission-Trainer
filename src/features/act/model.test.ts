import { describe, expect, it } from 'vitest';

import { newRun, startOutpost, withState } from '../../sim/run';
import { CORE_MODULES } from '../../sim/modules';
import { WIN_SOL } from '../../sim/sol';
import {
  activityCosts,
  activityRows,
  changeRows,
  goalRows,
  meterRows,
  missionHeadline,
  powerSentence,
  powerToday,
  progressPercent,
  scienceSentence,
  scienceSummary,
  secondsLeft,
  toneFor,
} from './model';

const run = startOutpost(newRun('jezero', 'Test'), CORE_MODULES);

describe('act model', () => {
  it('starts on the first mission and ends on the last', () => {
    expect(missionHeadline(run).title).toContain('Mission 1');
    expect(missionHeadline({ ...run, sol: WIN_SOL - 1 }).title).toContain('Mission 12');
  });

  it('keeps the last mission if the sol is somehow past the end', () => {
    expect(missionHeadline({ ...run, sol: 99 }).title).toContain('Mission 12');
  });

  it('gives every mission a line under it', () => {
    for (let sol = 0; sol < WIN_SOL; sol += 1) {
      expect(missionHeadline({ ...run, sol }).subtitle.length).toBeGreaterThan(0);
    }
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
    expect(powerSentence(45, 12, 30)).toBe('45 kW in the Sun · 12 kWh stored · 30 kW at night');
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

describe('the daily activity', () => {
  it('offers three activities on the sol about to be played', () => {
    const rows = activityRows(run, 1);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id)).toEqual(['rest', 'sweep-panels', 'experiment']);
  });

  it('names the cost and the gain of each activity', () => {
    const rows = activityRows(run, 1);
    const survey = activityRows(run, 2).find((row) => row.id === 'survey');

    expect(rows.find((row) => row.id === 'experiment')?.costs).toEqual(['−15 kWh']);
    expect(rows.find((row) => row.id === 'experiment')?.gains).toEqual(['+6 science']);
    expect(survey?.costs).toEqual(['−25 kWh']);
  });

  it('shows a locked activity with the reason, rather than hiding it', () => {
    const rows = activityRows(run, 7);
    const grow = rows.find((row) => row.id === 'grow-extra');

    expect(grow?.available).toBe(false);
    expect(grow?.lockedReason).toContain('greenhouse');
  });

  it('marks the activity the player has already picked', () => {
    const picked = withState(run, { chosenActivity: 'experiment' });

    expect(activityRows(picked, 1).find((row) => row.id === 'experiment')?.chosen).toBe(true);
    expect(activityRows(picked, 1).find((row) => row.id === 'rest')?.chosen).toBe(false);
  });

  it('splits what an activity costs from what it gives', () => {
    const costs = activityCosts({
      id: 'test',
      title: 'Test',
      detail: 'Test',
      icon: '🧪',
      topic: 'missions',
      science: 2,
      powerCostKwh: 8,
      storeDelta: { food: 6, water: -5 },
    });

    expect(costs.costs).toEqual(['−8 kWh', '−5 Water']);
    expect(costs.gains).toEqual(['+6 Food', '+2 science']);
  });
});

describe('the five science goals', () => {
  it('shows all five, in order, every sol', () => {
    const rows = goalRows(run);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.title)).toEqual([
      'Martian Dust Storm',
      'Life Support',
      'Radiation Exposure',
      'Power Shortage',
      'Food Production',
    ]);
  });

  it('gives every goal a status and a line about it', () => {
    for (const row of goalRows(run)) {
      expect(['ok', 'watch', 'critical']).toContain(row.status);
      expect(row.detail.length).toBeGreaterThan(10);
    }
  });

  it('files each goal under a topic of its own, so two never share a fact', () => {
    const topics = goalRows(run).map((row) => row.topic);

    expect(new Set(topics).size).toBe(topics.length);
  });

  it('shows how much of each goal has been earned, and what it takes', () => {
    for (const row of goalRows(run)) {
      expect(row.held).toBe(0);
      expect(row.needed).toBeGreaterThan(0);
      expect(row.percent).toBe(0);
      expect(row.earned).toBe(false);
      expect(row.aim.length).toBeGreaterThan(3);
      expect(row.short.length).toBeLessThanOrEqual(6);
    }
  });
});

describe('the power the crew can spend', () => {
  it('shows what is left after the panels fill the batteries, not the level at dawn', () => {
    /* The batteries are drained through the night, so the level left at dawn
       is near zero even for a healthy outpost. Showing that as "Power 0%"
       while the player picks a 25 kWh activity reads as a broken game. */
    const picture = powerToday(run);

    expect(picture.available).toBeGreaterThan(0);
    expect(picture.capacity).toBeGreaterThan(0);
    expect(picture.nightNeed).toBeGreaterThan(0);
  });

  it('says the night is not covered when the batteries cannot hold it', () => {
    const bare = powerToday(run);

    expect(bare.nightCovered).toBe(false);
  });

  it('says the night is covered when there are enough batteries and panels', () => {
    const built = powerToday(
      startOutpost(newRun('jezero', 'Test'), [...CORE_MODULES, 'solar-array', 'solar-array', 'batteries', 'batteries', 'batteries']),
    );

    expect(built.nightCovered).toBe(true);
  });

  it('drops to nothing while the panels are folded against a storm', () => {
    const storming = withState(run, {
      sol: 1,
      forecast: [
        {
          id: 'storm-2',
          sol: 2,
          kind: 'storm',
          durationSols: 2,
          intensity: 0,
          summary: 'A storm.',
          approximate: false,
        },
      ],
    });

    expect(powerToday(storming).available).toBe(0);
  });
});

describe('the science score', () => {
  it('starts at zero and the bottom rank', () => {
    const summary = scienceSummary(run);

    expect(summary.points).toBe(0);
    expect(summary.rank.id).toBe('explorer');
  });

  it('moves up the ladder as the points come in', () => {
    expect(scienceSummary({ ...run, science: 30 }).rank.id).toBe('research-lead');
    expect(scienceSummary({ ...run, science: 52 }).rank.id).toBe('chief-scientist');
  });

  it('shows the road to the next rank', () => {
    const summary = scienceSummary({ ...run, science: 10 });

    expect(summary.next?.id).toBe('field-scientist');
    expect(summary.toNext).toBe(4);
  });

  it('writes the score as a sentence for screen readers', () => {
    const summary = scienceSummary({ ...run, science: 10 });

    expect(scienceSentence(summary)).toBe('10 science points. Your rank is Explorer. 4 more points to reach Field Scientist.');
    expect(scienceSentence(scienceSummary({ ...run, science: 52 }))).toContain('That is the top rank.');
  });
});
