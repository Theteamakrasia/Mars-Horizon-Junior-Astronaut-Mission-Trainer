import { describe, expect, it } from 'vitest';

import { newRun, startOutpost, withState } from '../../sim/run';
import { CORE_MODULES } from '../../sim/modules';
import { WIN_SOL, advanceSol } from '../../sim/sol';
import {
  activityCosts,
  activityRows,
  boardRows,
  changeRows,
  ledgerRows,
  deskNote,
  floorWarning,
  hubTiles,
  meterRows,
  missionHeadline,
  orderChecks,
  powerReceipt,
  powerToday,
  progressPercent,
  scienceSentence,
  scienceSummary,
  secondsLeft,
  toneFor,
  type HubSection,
  type HubTile,
} from './model';

const run = startOutpost(newRun('jezero', 'Test'), CORE_MODULES);

/** More load than the lander's one battery carries through a night. */
const overloaded = startOutpost(newRun('jezero', 'Test'), [...CORE_MODULES, 'greenhouse', 'ice-miner']);

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

  it('looks worried under the goal line and alarmed under the floor line', () => {
    expect(toneFor(60)).toBe('ok');
    expect(toneFor(39)).toBe('low');
    expect(toneFor(29)).toBe('critical');
  });

  it('warns that a store has one sol left before the crew is brought home', () => {
    expect(floorWarning(run)).toBeNull();

    const low = advanceSol(withState(run, { stores: { ...run.stores, water: 26 } }));
    const warned = floorWarning(low);

    expect(warned?.name).toBe('water');
    expect(warned?.text).toContain('One more sol');
  });

  it('does not show a red power meter every morning', () => {
    /* The bank is nearly empty at dawn on every sol, because the night took
       it. A meter that judged power by its level would be red every morning
       of the run and teach the player that the game was broken. Power is
       worried about the day, not the level. */
    const after = advanceSol(run);
    const power = meterRows(after).find((row) => row.name === 'power');

    expect(power?.percent).toBeLessThan(30);
    expect(power?.tone).toBe('ok');
  });

  it('counts progress as a share of the run', () => {
    expect(progressPercent({ ...run, sol: 6 })).toBe(50);
  });

  it('counts the clock down to zero and stops', () => {
    expect(secondsLeft(10, 0)).toBe(10);
    expect(secondsLeft(10, 3500)).toBe(7);
    expect(secondsLeft(10, 99999)).toBe(0);
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
      topic: 'missions',
      science: 2,
      powerCostKwh: 8,
      storeDelta: { food: 6, water: -5 },
    });

    expect(costs.costs).toEqual(['−8 kWh', '−5 Water']);
    expect(costs.gains).toEqual(['+6 Food', '+2 science']);
  });

  it('gives every order two things to check', () => {
    for (const row of activityRows(run, 1)) {
      expect(orderChecks(run, row)).toHaveLength(2);
    }
  });

  it('checks the power against what the outpost has for today', () => {
    const survey = activityRows(run, 2).find((row) => row.id === 'survey');
    const checks = survey === undefined ? [] : orderChecks(run, survey);
    const power = checks[0];

    expect(power?.label).toBe('Power');
    expect(power?.value).toContain('kWh');
  });

  it('says when an order is more than the outpost can pay for', () => {
    /* No stored power and no sunlight: there is nothing left to spend. */
    const flat = withState(run, { stores: { ...run.stores, power: 0 }, panelHealth: 0 });
    const survey = activityRows(flat, 2).find((row) => row.id === 'survey');
    const power = survey === undefined ? undefined : orderChecks(flat, survey)[0];

    expect(power?.ok).toBe(false);
    expect(power?.why).toContain('power');
  });

  it('checks the system an order looks after', () => {
    const sweep = activityRows(run, 1).find((row) => row.id === 'sweep-panels');
    const checks = sweep === undefined ? [] : orderChecks(run, sweep);

    expect(checks[1]?.label).toBe('Panels');
    expect(checks[1]?.value).toBe('100%');
  });

  it('says when an order is only for the science points', () => {
    const rest = activityRows(run, 1).find((row) => row.id === 'rest');
    const checks = rest === undefined ? [] : orderChecks(run, rest);

    expect(checks[1]?.value).toContain('science points');
  });

  it('puts a note on some sols and not on others', () => {
    expect(deskNote(2)).not.toBeNull();
    expect(deskNote(2)?.minutes).toBeGreaterThan(0);
    expect(deskNote(1)).toBeNull();
  });

  it('puts the standing orders on the board and marks the new ones', () => {
    /* Sol 1 done means sol 2 is the day being played: four orders on the
       board, the two that arrived on sol 2 marked new. */
    const rows = boardRows(withState(run, { sol: 1 }));

    expect(rows.length).toBe(4);
    expect(rows.filter((row) => row.isNew)).toHaveLength(2);
    expect(rows[0]?.isNew).toBe(false);
  });
});

describe('the power the crew can spend', () => {
  it('says what the panels make, what the outpost needs, and what is left over', () => {
    /* The three numbers a sol is made of. The spare is the one that says
       whether the build is sound: negative means the outpost runs down. */
    const picture = powerToday(run);

    expect(picture.generated).toBeGreaterThan(0);
    expect(picture.demand).toBeGreaterThan(0);
    expect(picture.spare).toBe(picture.generated - picture.demand);
  });

  it('reports the level in the batteries separately from the day budget', () => {
    /* ISS-078: the projection saturates at the battery capacity, so a card
       drawn from it read the same number every sol. The level has to be its
       own reading - and after a bare sol it is the one that reaches zero. */
    const after = advanceSol(run);
    const picture = powerToday(after);

    expect(picture.stored).toBe(Math.round(after.stores.power));
    expect(picture.stored).toBeLessThan(picture.capacity);
    expect(picture.spendable).toBeGreaterThan(picture.stored);
  });

  it('names the night on every order, because the night is where the power goes', () => {
    const rows = activityRows(run, 1);
    const row = rows[0];

    if (row === undefined) throw new Error('no order for sol 1');

    const checks = orderChecks(run, row);

    expect(checks[0]?.label).toBe('Power');
    expect(checks[0]?.value).toContain('night needs');
  });

  it('says the night is not covered when the batteries cannot hold it', () => {
    expect(powerToday(overloaded).nightCovered).toBe(false);
    expect(powerToday(run).nightCovered).toBe(true);
  });

  it('says the night is covered when there are enough batteries and panels', () => {
    const built = powerToday(
      startOutpost(newRun('jezero', 'Test'), [...CORE_MODULES, 'solar-array', 'solar-array', 'batteries', 'batteries', 'batteries']),
    );

    expect(built.nightCovered).toBe(true);
  });

  it('drops to nothing while the panels are folded against a storm', () => {
    const storming = withState(overloaded, {
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

    expect(powerToday(storming).spendable).toBe(0);
  });

  it('says nothing about power before the first sol', () => {
    expect(powerReceipt(run)).toBe('');
  });

  it('says what the last sol made, what the night took and where it ended', () => {
    const after = advanceSol(overloaded);
    const line = powerReceipt(after);
    const record = after.log[0];

    if (record === undefined) throw new Error('no record for the sol');

    expect(line).toContain('kWh');
    expect(line).toContain(`made ${Math.round(record.powerGenerated)} kWh`);
    expect(line).toContain(`night ${Math.round(record.powerNight)}`);
    expect(line).toContain(`ended ${Math.round(record.stores.power)} kWh`);
  });

  it('names the blackout when the batteries ran flat', () => {
    const after = advanceSol(overloaded);

    expect(after.log[0].blackout).toBeGreaterThan(0);
    expect(powerReceipt(after)).toContain('ran flat');
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

describe('the hub', () => {
  const context = { nasaToday: false, pictures: 2, liveFlares: 0 };
  const find = (tiles: readonly HubTile[], id: HubSection): HubTile | undefined =>
    tiles.find((tile) => tile.id === id);

  it('is five buttons before a sol has run, because the review has nothing to review', () => {
    const tiles = hubTiles(run, context);

    expect(tiles.map((tile) => tile.id)).toEqual(['tasks', 'desk', 'orders', 'stats', 'data']);
    expect(find(tiles, 'review')).toBeUndefined();
  });

  it('gives every button a label and one line of state', () => {
    for (const tile of hubTiles(run, context)) {
      expect(tile.label.length, tile.id).toBeGreaterThan(2);
      expect(tile.status.length, tile.id).toBeGreaterThan(0);
    }
  });

  it('asks for attention before an order is stamped, and stops once one is', () => {
    /* The orders are behind the training, so the tile is only alive once the
       crew has trained. */
    const trained = withState(run, {
      training: {
        sol: 1,
        completed: [
          { gameId: 'resource-merge', points: 3, performance: 'good' },
          { gameId: 'memory-match', points: 3, performance: 'good' },
        ],
        pointsToday: 6,
      },
    });

    expect(find(hubTiles(trained, context), 'tasks')?.attention).toBe(true);
    expect(find(hubTiles(trained, context), 'tasks')?.status).toContain('choose one');

    const picked = hubTiles(withState(trained, { chosenActivity: 'rest' }), context);

    expect(find(picked, 'tasks')?.attention).toBe(false);
    expect(find(picked, 'tasks')?.status).toContain('one stamped');
  });

  it('locks the orders until the crew has trained', () => {
    const tile = find(hubTiles(run, context), 'tasks');

    expect(tile?.locked).toBe(true);
    expect(tile?.status).toContain('Locked');
    expect(tile?.attention).toBe(false);
  });

  it('names the lowest store on the stats button', () => {
    /* 35% is under the goal line but above the floor: the button is worth a
       look, not an alarm. */
    const drained = withState(run, { stores: { ...run.stores, water: 35 } });
    const stats = find(hubTiles(drained, context), 'stats');

    expect(stats?.status).toContain('Water');
    expect(stats?.status).toContain('35%');
    expect(stats?.attention).toBe(false);
  });

  it('says what is behind the data button: how many pictures, and whether they are live', () => {
    expect(find(hubTiles(run, { nasaToday: true, pictures: 3, liveFlares: 5 }), 'data')?.status).toBe('3 pictures · 5 live flares');
    expect(find(hubTiles(run, { nasaToday: true, pictures: 2, liveFlares: 0 }), 'data')?.status).toBe('2 pictures · live today');
    expect(find(hubTiles(run, { nasaToday: false, pictures: 2, liveFlares: 0 }), 'data')?.status).toBe('2 pictures · saved');
  });

  it('adds the review once a sol has run, and prints its net change on the button', () => {
    const after = hubTiles(advanceSol(run), context);
    const review = find(after, 'review');

    /* Six buttons, and the review's label names the sol it is about rather
       than saying "Review" and making the player open it to find out. */
    expect(after).toHaveLength(6);
    expect(review?.label).toContain('in review');
    expect(review?.status.length).toBeGreaterThan(0);
    expect(review?.attention).toBe(false);
  });

  it('keeps flat changes off the review button, because a chip that says 0 is noise', () => {
    const review = find(hubTiles(advanceSol(run), context), 'review');

    expect(review?.chips.every((chip) => chip.tone !== 'flat')).toBe(true);
  });
});

describe('the ledger of a sol', () => {
  it('shows what each store made, used and changed by', () => {
    const record = advanceSol(run).log[0];
    const rows = ledgerRows(record);

    expect(rows.map((row) => row.name)).toEqual(['power', 'oxygen', 'water', 'food', 'shielding']);

    const oxygen = rows.find((row) => row.name === 'oxygen');

    expect(oxygen?.made).toBe(`${Math.round(record.produced.oxygen)}%`);
    expect(oxygen?.used).toBe(`${Math.round(record.consumed.oxygen)}%`);
    expect(rows.find((row) => row.name === 'power')?.made).toContain('kWh');
  });

  it('shows a dash rather than a zero, and names wasted sunlight', () => {
    const rows = ledgerRows(advanceSol(run).log[0]);

    /* No greenhouse, so no food is made. */
    expect(rows.find((row) => row.name === 'food')?.made).toBe('–');
    expect(rows.find((row) => row.name === 'power')?.note).toContain('wasted');
  });
});
