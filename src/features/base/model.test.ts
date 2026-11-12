import { describe, expect, it } from 'vitest';

import { createForecast } from '../../sim/forecast';

import {
  addModule,
  allModules,
  arrayNote,
  buildCards,
  canPlace,
  goalPreview,
  pointsLeft,
  powerDials,
  previewFor,
  previewSummary,
  removeModule,
  upcomingWarnings,
  upkeepFor,
  BUILD_BUDGET,
  CORE_MODULES,
  specOf,
  type ModuleKind,
} from './model';

describe('base model', () => {
  it('lands with the four core modules and the whole budget free', () => {
    expect(allModules([])).toEqual(CORE_MODULES);
    expect(pointsLeft([])).toBe(BUILD_BUDGET);
  });

  it('spends build points as modules are added and gives them back on removal', () => {
    const one = addModule([], 'greenhouse', 'jezero');

    expect(pointsLeft(one)).toBe(BUILD_BUDGET - specOf('greenhouse').cost);
    expect(pointsLeft(removeModule(one, 'greenhouse'))).toBe(BUILD_BUDGET);
  });

  it('lets an ice miner be built at every site, even one with little ice', () => {
    expect(canPlace('ice-miner', [], 'olympus').ok).toBe(true);
    expect(canPlace('ice-miner', [], 'arcadia').ok).toBe(true);
  });

  it('refuses a regolith shield on ground that is too steep', () => {
    expect(canPlace('regolith-shield', [], 'valles').ok).toBe(true);
    expect(canPlace('regolith-shield', [], 'olympus').ok).toBe(true);
  });

  it('refuses a second greenhouse, and anything past the limit', () => {
    const one = addModule([], 'greenhouse', 'arcadia');

    expect(canPlace('greenhouse', one, 'arcadia').ok).toBe(false);
    expect(addModule(one, 'greenhouse', 'arcadia')).toEqual(one);
  });

  it('refuses what the budget cannot pay for', () => {
    let extras: readonly ModuleKind[] = [];

    extras = addModule(extras, 'nuclear-unit', 'arcadia');
    extras = addModule(extras, 'greenhouse', 'arcadia');
    extras = addModule(extras, 'ice-miner', 'arcadia');
    extras = addModule(extras, 'solar-array', 'arcadia');

    const check = canPlace('nuclear-unit', extras, 'arcadia');

    expect(check.ok).toBe(false);
    expect(pointsLeft(extras)).toBeLessThanOrEqual(BUILD_BUDGET);
  });

  it('runs out of room sooner on steep ground than on a plain', () => {
    /* Enough modules that the room runs out before the budget does. */
    const fill = (region: string): number => {
      let extras: readonly ModuleKind[] = [];

      for (const kind of [
        'solar-array',
        'batteries',
        'solar-array',
        'batteries',
        'solar-array',
        'batteries',
        'greenhouse',
        'ice-miner',
        'regolith-shield',
      ] as const) {
        extras = addModule(extras, kind, region);
      }

      return extras.length;
    };

    expect(fill('olympus')).toBeLessThan(fill('arcadia'));
  });

  it('counts the lander\'s own battery and panel, and shows that a loaded outpost needs more', () => {
    const bare = upkeepFor([], 'jezero');
    const loaded = upkeepFor(['greenhouse', 'ice-miner'], 'jezero');
    const bigger = upkeepFor(['greenhouse', 'ice-miner', 'batteries', 'batteries', 'solar-array', 'solar-array'], 'jezero');

    /* The lander's one battery and one array are counted without buying anything. */
    expect(bare.batteryKwh).toBeGreaterThan(0);
    expect(bare.dayGeneration).toBeGreaterThan(0);
    expect(bare.nightHoursCovered).toBe(12);
    expect(loaded.nightHoursCovered).toBeLessThan(12);
    expect(bigger.nightHoursCovered).toBeGreaterThan(loaded.nightHoursCovered);
    expect(bigger.dayGeneration).toBeGreaterThan(loaded.dayGeneration);
  });

  it('counts a nuclear unit as covering the whole night by itself', () => {
    const upkeep = upkeepFor(['nuclear-unit', 'nuclear-unit' as ModuleKind], 'jezero');

    expect(upkeep.nightHoursCovered).toBeGreaterThan(upkeepFor(['greenhouse', 'ice-miner'], 'jezero').nightHoursCovered);
  });

  it('shows the three dials of the power economy, each with a verdict', () => {
    const dials = powerDials([], 'jezero');

    expect(dials.map((dial) => dial.label)).toEqual(['Make', 'Store', 'Use']);
    expect(dials.every((dial) => dial.text.length > 0)).toBe(true);

    /* A dim site cannot pay for itself on the lander's one array, and the
       "Make" dial says so rather than leaving the player to work it out. */
    expect(powerDials([], 'arcadia').find((dial) => dial.label === 'Make')?.tone).toBe('bad');
    expect(powerDials([], 'olympus').find((dial) => dial.label === 'Make')?.tone).toBe('ok');
  });

  it('names what draws the power', () => {
    const dial = powerDials(['greenhouse'], 'jezero').find((entry) => entry.label === 'Use');

    expect(dial?.text).toContain('greenhouse');
    expect(dial?.text).toContain('kW');
  });

  it('warns that a second array has nowhere to put its sunlight', () => {
    /* The player reported that a second array "did not generate". It does:
       the outpost was already making more power than it could use, and the
       batteries had no room for the rest. */
    const wasted = arrayNote([], 'jezero');

    expect(wasted).toContain('spill');
    expect(wasted).toContain('Another array');
  });

  it('says a second array is the answer where the outpost is short', () => {
    /* Arcadia cannot pay for itself on the lander's one array, so another
       array is exactly what is missing. */
    const short = arrayNote([], 'arcadia');

    expect(short).toContain('short');
    expect(short).not.toContain('spill');
  });

  it('warns about food on a bare outpost, and about power on an overloaded one', () => {
    const lines = previewFor([], 'jezero');
    const loaded = previewFor(['greenhouse', 'ice-miner'], 'jezero');

    expect(lines.find((line) => line.label === 'Power')?.tone).not.toBe('bad');
    expect(loaded.find((line) => line.label === 'Power')?.tone).not.toBe('ok');
    expect(lines.find((line) => line.label === 'Food')?.tone).toBe('bad');
  });

  it('is happy about food once there is a greenhouse', () => {
    const lines = previewFor(['solar-array', 'solar-array', 'batteries', 'batteries', 'greenhouse'], 'jezero');

    expect(lines.find((line) => line.label === 'Food')?.tone).toBe('ok');
  });

  it('shows nothing before the forecast has loaded', () => {
    expect(upcomingWarnings([])).toEqual([]);
  });

  it('never shows a flare at landing: flares give almost no warning', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const warnings = upcomingWarnings(createForecast([], seed));

      expect(warnings.some((event) => event.kind === 'flare')).toBe(false);
    }
  });

  it('summarises a build in the four numbers the resource cards show', () => {
    const bare = previewSummary([], 'jezero');
    const built = previewSummary(['solar-array', 'solar-array', 'batteries', 'batteries', 'greenhouse'], 'jezero');

    expect(bare.nightHours).toBe(upkeepFor([], 'jezero').nightHoursCovered);
    expect(bare.foodDays).toBeLessThan(20);
    expect(built.foodDays).toBe(Number.POSITIVE_INFINITY);
    expect(built.nightHours).toBeGreaterThanOrEqual(bare.nightHours);
    expect(built.shielding).toBeGreaterThan(0);
  });

  it('reports a steady water supply as Infinity rather than a made-up number of sols', () => {
    const summary = previewSummary(['ice-miner'], 'arcadia');

    expect(Number.isFinite(summary.waterDays)).toBe(false);
  });

  it('shows the day power, which is the number that moves when a panel is added', () => {
    const bare = previewSummary([], 'arcadia');
    const built = previewSummary(['solar-array', 'solar-array', 'solar-array'], 'arcadia');

    expect(built.dayKwh).toBeGreaterThan(bare.dayKwh);
    expect(bare.dayKwh).toBeGreaterThan(0);
  });
});

describe('the build cards', () => {
  it('shows the count and the limit on every card', () => {
    const cards = buildCards([], 'arcadia');

    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      expect(card.limit).toBeGreaterThan(0);
      expect(card.have).toBe(0);
      expect(card.atLimit).toBe(false);
      expect(card.blocked).toBe('');
    }
  });

  it('counts the lander copy in the total but not in the count the player adds', () => {
    /* Four solar arrays are allowed and the lander brings one, so the player
       can add three. The old screen said "3" with a dead button. */
    const solar = buildCards([], 'arcadia').find((card) => card.kind === 'solar-array');

    expect(solar?.limit).toBe(3);
    expect(solar?.total).toBe(1);
  });

  it('draws the number the outpost has, over the catalogue maximum', () => {
    /* ISS-077: `have` over `limit` made a solar array read 0 / 3 while the
       outpost had one. The card's number is `total` over `maxCount`, and the
       lander's copy is marked so the count explains itself. */
    const solar = buildCards([], 'arcadia').find((card) => card.kind === 'solar-array');

    expect(solar?.total).toBe(1);
    expect(solar?.maxCount).toBe(4);
    expect(solar?.fromLander).toBe(1);
  });

  it('says why the add button is dead, once the player owns some', () => {
    const cards = buildCards(['solar-array', 'solar-array', 'solar-array'], 'arcadia');
    const solar = cards.find((card) => card.kind === 'solar-array');

    expect(solar?.atLimit).toBe(true);
    expect(solar?.blocked).toContain('solar arrays');
  });

  it('says nothing is wrong while the module can still be added', () => {
    const solar = buildCards(['solar-array'], 'arcadia').find((card) => card.kind === 'solar-array');

    expect(solar?.atLimit).toBe(false);
    expect(solar?.blocked).toBe('');
  });
});

describe('the goals a build can earn', () => {
  /* A build that closes the loop: power, storage, food, water and shielding. */
  const CLOSED_LOOP: readonly ModuleKind[] = [
    'solar-array',
    'solar-array',
    'solar-array',
    'batteries',
    'batteries',
    'batteries',
    'greenhouse',
    'ice-miner',
    'regolith-shield',
  ];

  it('says a bare outpost still lacks food and shielding', () => {
    const goals = goalPreview([], 'arcadia');
    const missing = goals.filter((goal) => !goal.ok).map((goal) => goal.id);

    expect(missing).toContain('food');
    expect(missing).toContain('radiation');
  });

  it('says a build that closes the loop can hold all five', () => {
    const goals = goalPreview(CLOSED_LOOP, 'arcadia');

    expect(goals.filter((goal) => !goal.ok)).toEqual([]);
  });

  it('names what is missing', () => {
    const goals = goalPreview([], 'arcadia');
    const food = goals.find((goal) => goal.id === 'food');
    const radiation = goals.find((goal) => goal.id === 'radiation');

    expect(food?.ok).toBe(false);
    expect(food?.why).toContain('greenhouse');
    expect(radiation?.why).toContain('shielding');
  });

  it('blames the flat batteries, and names the fix, when a greenhouse overloads the lander', () => {
    /* ISS-079: the sentence used to be the fixed string "No water source",
       which named neither the cause nor the cure. */
    const life = goalPreview(['greenhouse'], 'arcadia').find((goal) => goal.id === 'life-support');

    expect(life?.ok).toBe(false);
    expect(life?.why).toContain('batteries');
    expect(life?.why).toContain('battery bank');
  });

  it('does not fail the water goal for a greenhouse, because life support recycles its water', () => {
    const life = goalPreview(['greenhouse', 'batteries'], 'olympus').find((goal) => goal.id === 'life-support');

    expect(life?.ok).toBe(true);
  });
});
