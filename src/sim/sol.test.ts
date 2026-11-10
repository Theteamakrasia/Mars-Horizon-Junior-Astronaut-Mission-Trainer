import { describe, expect, it } from 'vitest';

import { earthCanAnswerInTime, oneWayMinutes, roundTripMinutes } from './comms';
import { crisisForEvent, earthAdvice, earthIsInTime, pendingCrisis } from './crises';
import {
  createForecast,
  DEFAULT_SEED,
  FIRST_EVENT_SOL,
  flareIntensity,
  forecastIsSpaced,
  LAST_EVENT_SOL,
  MAX_FLARES,
  MIN_EVENTS,
  stormChance,
  stormOn,
  stormOpacity,
  visibleForecast,
  type ForecastEvent,
} from './forecast';
import { CORE_MODULES, type ModuleKind } from './modules';
import { newRun, startOutpost, withState, type RunState } from './run';
import { SOL_LOG_POINTS } from './science';
import {
  advanceSol,
  decide,
  endedBy,
  FLARE_DRAIN,
  isRunOver,
  isSelfSustaining,
  lostStores,
  powerPicture,
  projectSol,
  WIN_SOL,
} from './sol';

const FLARES = [
  { classType: 'M5.0', approximate: true, when: 'in a test' },
  { classType: 'M5.0', approximate: true, when: 'in a test' },
];

function outpost(region: string, extras: readonly ModuleKind[], seed: number = DEFAULT_SEED, flares = FLARES): RunState {
  const base = withState(newRun(region, 'Test'), { forecast: createForecast(flares, seed) });

  return startOutpost(base, [...CORE_MODULES, ...extras]);
}

/**
 * A seed whose timetable has all three kinds of event.
 *
 * The timetable is rolled per run, so a test that needs a supply pod cannot
 * assume one is there. This finds the first seed that has all three, so the
 * test is about the rule and not about a magic number.
 */
function seedWithEveryKind(): number {
  for (let seed = 1; seed <= 500; seed += 1) {
    const kinds = new Set(createForecast(FLARES, seed).map((event) => event.kind));

    if (kinds.has('flare') && kinds.has('storm') && kinds.has('supply-pod')) return seed;
  }

  throw new Error('no seed has all three kinds of event');
}

/**
 * The event of a given kind, so a test can name a crisis without knowing which
 * sol the seed happened to put it on.
 */
function eventOfKind(forecast: readonly ForecastEvent[], kind: ForecastEvent['kind']): ForecastEvent {
  const event = forecast.find((entry) => entry.kind === kind);

  if (event === undefined) throw new Error(`No ${kind} in this forecast`);

  return event;
}

/** Play to the end, answering each crisis with the given picks. */
function playOut(run: RunState, picks: Record<string, string>): RunState {
  let state = run;

  while (state.status === 'active') {
    const crisis = pendingCrisis(state);

    if (crisis !== null) state = decide(state, crisis.id, picks[crisis.kind] ?? crisis.defaultOptionId);
    state = advanceSol(state);
  }

  return state;
}

const SOLAR_FIRST: readonly ModuleKind[] = [
  'solar-array',
  'solar-array',
  'batteries',
  'batteries',
  'greenhouse',
  'regolith-shield',
];
const SMART = { flare: 'shelter', storm: 'retract-save', 'supply-pod': 'water' };

/**
 * A build that closes the loop, so it survives whatever the dice roll.
 *
 * The timetable is rolled per run, and a run without an ice miner runs out of
 * water about a third of the time. That is the point of the ice miner, so the
 * test that says "you can win" uses a build that can.
 */
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

describe('comms', () => {
  it('makes the delay grow, and a round trip exactly twice a one-way trip', () => {
    expect(oneWayMinutes(10)).toBeGreaterThan(oneWayMinutes(1));
    expect(roundTripMinutes(4)).toBe(oneWayMinutes(4) * 2);
  });

  it('never exceeds the real 22 minute maximum', () => {
    expect(oneWayMinutes(500)).toBe(22);
  });

  it('only lets Earth answer if the reply beats the problem', () => {
    expect(earthCanAnswerInTime(3, 15)).toBe(false);
    expect(earthCanAnswerInTime(5, 1440)).toBe(true);
  });
});

describe('forecast', () => {
  it('maps NASA flare letters onto three intensities', () => {
    expect(flareIntensity('C2.1')).toBe(1);
    expect(flareIntensity('M4.2')).toBe(2);
    expect(flareIntensity('X5.8')).toBe(3);
    expect(flareIntensity('x1.0')).toBe(3);
  });

  it('places one event at a time, and always inside the run', () => {
    const forecast = createForecast(FLARES);

    expect(new Set(forecast.map((event) => event.sol)).size).toBe(forecast.length);

    for (const event of forecast) {
      expect(event.sol).toBeGreaterThanOrEqual(FIRST_EVENT_SOL);
      expect(event.sol).toBeLessThanOrEqual(LAST_EVENT_SOL);
    }
  });

  it('gives a different timetable for a different seed, and the same one for the same seed', () => {
    const timetables = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        createForecast(FLARES, seed)
          .map((event) => `${event.kind}@${event.sol}`)
          .join(','),
      ),
    );

    expect(timetables.size).toBeGreaterThan(1);
    expect(createForecast(FLARES, 7)).toEqual(createForecast(FLARES, 7));
  });

  it('never puts two events on the same sol, or inside the storm, across many seeds', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const forecast = createForecast(FLARES, seed);
      const sols = forecast.map((event) => event.sol);
      const storm = forecast.find((event) => event.kind === 'storm');

      expect(new Set(sols).size).toBe(sols.length);
      if (storm !== undefined) expect(sols).not.toContain(storm.sol + 1);
      expect(forecast.filter((event) => event.kind === 'storm').length).toBeLessThanOrEqual(1);
      expect(forecast.filter((event) => event.kind === 'supply-pod').length).toBeLessThanOrEqual(1);
    }
  });

  it('always has at least one flare and a few decisions, and never too many flares', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const forecast = createForecast(FLARES, seed);
      const flares = forecast.filter((event) => event.kind === 'flare').length;

      expect(flares).toBeGreaterThanOrEqual(1);
      expect(flares).toBeLessThanOrEqual(MAX_FLARES);
      expect(forecast.length).toBeGreaterThanOrEqual(MIN_EVENTS);
    }
  });

  it('does not fix the cast: the number of flares, storms and pods all change from mission to mission', () => {
    const forecasts = Array.from({ length: 300 }, (_, index) => createForecast(FLARES, index + 1));
    const flareCounts = new Set(forecasts.map((forecast) => forecast.filter((event) => event.kind === 'flare').length));

    expect(flareCounts.size).toBeGreaterThanOrEqual(3);
    expect(forecasts.some((forecast) => !forecast.some((event) => event.kind === 'storm'))).toBe(true);
    expect(forecasts.some((forecast) => forecast.some((event) => event.kind === 'storm'))).toBe(true);
    expect(forecasts.some((forecast) => !forecast.some((event) => event.kind === 'supply-pod'))).toBe(true);
  });

  it('lets flares come in bursts, but never on neighbouring sols', () => {
    const timetables = Array.from({ length: 300 }, (_, index) => createForecast(FLARES, index + 1));

    /* A burst is two flares close together. They still cannot touch: a crisis
       on the sol after a crisis gives the player no room to breathe. */
    const burst = timetables.some((forecast) => {
      const sols = forecast.filter((event) => event.kind === 'flare').map((event) => event.sol);

      return sols.some((sol) => sols.includes(sol + 2));
    });
    const touching = timetables.some((forecast) => {
      const sols = forecast.filter((event) => event.kind === 'flare').map((event) => event.sol);

      return sols.some((sol) => sols.includes(sol + 1));
    });

    expect(burst).toBe(true);
    expect(touching).toBe(false);
  });

  it('never puts two events back to back, across many seeds', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      expect(forecastIsSpaced(createForecast(FLARES, seed))).toBe(true);
    }
  });

  it('plans the same sols whatever flares are handed in', () => {
    const sols = (flares: Parameters<typeof createForecast>[0]): string =>
      createForecast(flares, 42).map((event) => `${event.kind}@${event.sol}`).join(',');

    expect(sols(FLARES)).toBe(sols([]));
    expect(sols(FLARES)).toBe(sols([{ classType: 'X9.3', approximate: false, when: 'in 2017' }]));
  });

  it('draws flare sizes only from the real M and X flares it is given', () => {
    const pool = [
      { classType: 'C9.0', approximate: false, when: 'last week' },
      { classType: 'X2.0', approximate: false, when: 'last week' },
    ];

    for (let seed = 1; seed <= 100; seed += 1) {
      for (const event of createForecast(pool, seed).filter((entry) => entry.kind === 'flare')) {
        expect(event.intensity).toBe(3);
        expect(event.approximate).toBe(false);
        expect(event.summary).toContain('X2.0');
      }
    }
  });

  it('follows the real record when there is no live data: about one big flare in twelve is an X', () => {
    let flares = 0;
    let bigOnes = 0;

    for (let seed = 1; seed <= 2000; seed += 1) {
      for (const event of createForecast([], seed).filter((entry) => entry.kind === 'flare')) {
        flares += 1;
        if (event.intensity === 3) bigOnes += 1;
        expect(event.approximate).toBe(true);
      }
    }

    expect(bigOnes / flares).toBeGreaterThan(0.05);
    expect(bigOnes / flares).toBeLessThan(0.12);
  });

  it('sends more dust storms to a dustier site', () => {
    const storms = (dustScore: number): number =>
      Array.from({ length: 500 }, (_, index) => createForecast(FLARES, index + 1, dustScore)).filter((forecast) =>
        forecast.some((event) => event.kind === 'storm'),
      ).length;

    expect(stormChance(2)).toBeGreaterThan(stormChance(5));
    expect(storms(1)).toBeGreaterThan(storms(5));
  });

  it('warns about each kind of event as far ahead as the real thing allows', () => {
    const forecast = createForecast(FLARES, seedWithEveryKind());
    const flare = eventOfKind(forecast, 'flare');
    const storm = eventOfKind(forecast, 'storm');
    const pod = eventOfKind(forecast, 'supply-pod');
    const kindsSeenOn = (sol: number): readonly string[] => visibleForecast(forecast, sol).map((event) => event.id);

    expect(kindsSeenOn(flare.sol - 1)).toContain(flare.id);
    expect(kindsSeenOn(flare.sol - 2)).not.toContain(flare.id);
    expect(kindsSeenOn(storm.sol - 3)).toContain(storm.id);
    expect(kindsSeenOn(storm.sol - 4)).not.toContain(storm.id);
    expect(kindsSeenOn(0)).toContain(pod.id);
    expect(kindsSeenOn(flare.sol)).not.toContain(flare.id);
  });

  it('carries the approximate flag from the data to the event the player sees', () => {
    const live = createForecast([{ classType: 'X1.0', approximate: false, when: 'today' }]);

    expect(live.find((event) => event.kind === 'flare')?.approximate).toBe(false);
    expect(createForecast([]).find((event) => event.kind === 'flare')?.approximate).toBe(true);
  });

  it('keeps the storm over two sols and blocks less sun at a calmer site', () => {
    const forecast = createForecast(FLARES);
    const storm = eventOfKind(forecast, 'storm');

    expect(stormOn(forecast, storm.sol)?.kind).toBe('storm');
    expect(stormOn(forecast, storm.sol + 1)?.kind).toBe('storm');
    expect(stormOn(forecast, storm.sol + 2)).toBeNull();
    expect(stormOpacity(4)).toBeLessThan(stormOpacity(2));
  });
});

describe('advancing a sol', () => {
  it('starts the outpost with full batteries', () => {
    expect(outpost('jezero', []).stores.power).toBe(100);
  });

  it('does not mutate the run it is given', () => {
    const run = outpost('jezero', SOLAR_FIRST);
    const frozen = JSON.stringify(run);

    advanceSol(run);
    expect(JSON.stringify(run)).toBe(frozen);
  });

  it('advances the sol counter and writes one record per sol', () => {
    const next = advanceSol(outpost('jezero', SOLAR_FIRST));

    expect(next.sol).toBe(1);
    expect(next.log).toHaveLength(1);
  });

  it('does nothing once the run has ended', () => {
    const ended = withState(outpost('jezero', []), { status: 'lost' });

    expect(advanceSol(ended)).toBe(ended);
  });

  it('wastes sunshine when the batteries are already full', () => {
    const record = advanceSol(outpost('jezero', ['solar-array', 'solar-array', 'solar-array'])).log[0];

    expect(record.powerWasted).toBeGreaterThan(0);
  });

  it('causes a blackout when the panels cannot feed the night', () => {
    const record = advanceSol(advanceSol(outpost('jezero', []))).log[1];

    expect(record.blackout).toBeGreaterThan(0);
  });

  it('slows oxygen generation during a blackout, which is how a power failure becomes an air failure', () => {
    const full = projectSol(outpost('jezero', SOLAR_FIRST)).net.oxygen;
    const starved = projectSol(withState(outpost('jezero', []), { stores: { ...outpost('jezero', []).stores, power: 0 } })).net.oxygen;

    expect(full).toBeGreaterThanOrEqual(0);
    expect(starved).toBeLessThan(full);
  });

  it('grows food only with a greenhouse', () => {
    expect(projectSol(outpost('jezero', [])).net.food).toBeLessThan(0);
    expect(projectSol(outpost('jezero', SOLAR_FIRST)).net.food).toBeGreaterThan(0);
  });

  it('lets a nuclear unit keep the lights on through the night with fewer batteries', () => {
    const nuclear = projectSol(outpost('jezero', ['nuclear-unit'])).net.power;
    const plain = projectSol(outpost('jezero', [])).net.power;

    expect(nuclear).toBeGreaterThan(plain);
  });

  it('treats a missing storm decision as the default: leaving the panels out', () => {
    let run = outpost('jezero', SOLAR_FIRST);
    const storm = eventOfKind(run.forecast, 'storm');

    for (let i = 0; i < storm.sol; i += 1) run = advanceSol(run);

    expect(run.status).not.toBe('lost');
    expect(run.panelHealth).toBeLessThan(1);
  });
});

describe('the main activity', () => {
  it('spends the chosen activity on the sol and records it', () => {
    const run = withState(outpost('jezero', SOLAR_FIRST), { chosenActivity: 'survey' });
    const next = advanceSol(run);

    expect(next.log[0].activity?.id).toBe('survey');
    expect(next.log[0].activity?.title).toBe('Send the rover out to survey');
  });

  it('awards the activity its science points, plus the point for the day', () => {
    const run = withState(outpost('jezero', SOLAR_FIRST), { chosenActivity: 'experiment' });

    expect(advanceSol(run).science).toBe(SOL_LOG_POINTS + 6);
  });

  it('gives a point for the day even when the sol was spent on a crisis', () => {
    expect(advanceSol(outpost('jezero', SOLAR_FIRST)).science).toBe(SOL_LOG_POINTS);
  });

  it('clears the choice once the sol has run, so it is never paid for twice', () => {
    const run = withState(outpost('jezero', SOLAR_FIRST), { chosenActivity: 'survey' });

    expect(advanceSol(run).chosenActivity).toBeNull();
  });

  it('adds what the activity makes to the stores', () => {
    const plain = advanceSol(outpost('jezero', SOLAR_FIRST)).stores.water;
    const tuned = advanceSol(withState(outpost('jezero', SOLAR_FIRST), { chosenActivity: 'recycle-tune' })).stores.water;

    expect(tuned).toBeGreaterThan(plain);
  });

  it('spends the activity power, so a flat battery runs that sol in a blackout', () => {
    const bare = outpost('jezero', []);
    const flat = withState(bare, { stores: { ...bare.stores, power: 0 } });

    const quiet = advanceSol(flat).log[0].blackout;
    const busy = advanceSol(withState(flat, { chosenActivity: 'survey' })).log[0].blackout;

    expect(busy).toBeGreaterThan(quiet);
  });

  it('restores the panels when the crew sweeps them, and never past full', () => {
    const dusty = withState(outpost('jezero', SOLAR_FIRST), { panelHealth: 0.5 });
    const swept = advanceSol(withState(dusty, { chosenActivity: 'sweep-panels' }));

    expect(swept.panelHealth).toBeGreaterThan(0.5);
    expect(swept.panelHealth).toBeLessThanOrEqual(1);
  });

  it('throws on an activity that does not exist', () => {
    const run = withState(outpost('jezero', SOLAR_FIRST), { chosenActivity: 'teleport' });

    expect(() => advanceSol(run)).toThrow(RangeError);
  });

  it('puts the activity aside on a crisis sol, because the crisis is that day', () => {
    const base = outpost('jezero', SOLAR_FIRST);
    const flare = eventOfKind(base.forecast, 'flare');

    let state = base;

    /* Play up to the sol before the flare. */
    while (state.sol < flare.sol - 1) {
      const crisis = pendingCrisis(state);

      if (crisis !== null) state = decide(state, crisis.id, SMART[crisis.kind] ?? crisis.defaultOptionId);
      state = advanceSol(state);
    }

    expect(pendingCrisis(state)).not.toBeNull();

    /* The player has picked an activity for the flare sol. The crisis takes
       the day, so the activity is not run alongside it. */
    state = withState(state, { chosenActivity: 'experiment' });
    state = advanceSol(state);

    expect(state.log[flare.sol - 1].activity).toBeNull();
    expect(state.log[flare.sol - 1].events.some((event) => event.kind === 'flare')).toBe(true);
  });
});

describe('crisis decisions', () => {
  it('asks about each forecast event exactly once, on the sol before it begins', () => {
    let run = outpost('jezero', SOLAR_FIRST);

    expect(pendingCrisis(run)).toBeNull();

    while (pendingCrisis(run) === null && run.status === 'active') run = advanceSol(run);

    const crisis = pendingCrisis(run);

    if (crisis === null) throw new Error('No crisis was ever asked');

    expect(crisis.sol).toBe(run.sol + 1);

    run = decide(run, crisis.id, crisis.defaultOptionId);
    expect(pendingCrisis(run)).toBeNull();
  });

  it('keeps one decision per crisis even if it is answered twice', () => {
    const start = outpost('jezero', SOLAR_FIRST);
    const flare = eventOfKind(start.forecast, 'flare');
    let run = decide(start, flare.id, 'shelter');

    run = decide(run, flare.id, 'carry-on');
    expect(run.decisions).toHaveLength(1);
    expect(run.decisions[0].optionId).toBe('carry-on');
  });

  it('throws on a crisis or option that does not exist', () => {
    const run = outpost('jezero', []);

    expect(() => decide(run, 'flare-999', 'shelter')).toThrow(RangeError);
    expect(() => decide(run, eventOfKind(run.forecast, 'flare').id, 'teleport')).toThrow(RangeError);
  });

  it('makes sheltering cost less shielding than carrying on, but pause the greenhouse', () => {
    const base = outpost('jezero', SOLAR_FIRST);
    const flare = eventOfKind(base.forecast, 'flare');
    const run = (choice: string): RunState => {
      let state = decide(base, flare.id, choice);

      for (let i = 0; i < flare.sol; i += 1) state = advanceSol(state);

      return state;
    };

    expect(run('shelter').stores.shielding).toBeGreaterThan(run('carry-on').stores.shielding);
    expect(run('shelter').log[flare.sol - 1].greenhousePaused).toBe(true);
    expect(run('carry-on').log[flare.sol - 1].greenhousePaused).toBe(false);
  });

  it('makes a bigger flare hit harder', () => {
    expect(FLARE_DRAIN[3]).toBeGreaterThan(FLARE_DRAIN[2]);
    expect(FLARE_DRAIN[2]).toBeGreaterThan(FLARE_DRAIN[1]);
  });

  it('keeps panels clean when folded away, and ruins them for good when left out', () => {
    const storm = eventOfKind(outpost('jezero', SOLAR_FIRST).forecast, 'storm');
    const play = (choice: string): number => {
      let run = decide(outpost('jezero', SOLAR_FIRST), storm.id, choice);

      for (let i = 0; i < storm.sol; i += 1) run = advanceSol(run);

      return run.panelHealth;
    };

    expect(play('retract')).toBe(1);
    expect(play('expose')).toBeLessThan(1);
  });

  it('lets the supply pod refill what the player picks', () => {
    const base = outpost('jezero', SOLAR_FIRST, seedWithEveryKind());
    const pod = eventOfKind(base.forecast, 'supply-pod');
    const water = (choice: string): number => {
      let run = decide(base, pod.id, choice);

      for (let i = 0; i < pod.sol; i += 1) run = advanceSol(run);

      return run.stores.water;
    };

    expect(water('water')).toBeGreaterThan(water('food'));
  });
});

describe('Earth and the delay', () => {
  it('refuses to wait for Earth on a fast crisis but can on a slow one', () => {
    const run = outpost('jezero', SOLAR_FIRST, seedWithEveryKind());
    const flare = eventOfKind(run.forecast, 'flare');
    const pod = eventOfKind(run.forecast, 'supply-pod');

    expect(earthIsInTime(withState(run, { sol: flare.sol - 1 }), crisisForEvent(flare))).toBe(false);
    expect(earthIsInTime(withState(run, { sol: pod.sol - 1 }), crisisForEvent(pod))).toBe(true);
  });

  it('advises sheltering from a flare, and food or water depending on what runs out first', () => {
    const run = outpost('jezero', [], seedWithEveryKind());

    expect(earthAdvice(run, crisisForEvent(eventOfKind(run.forecast, 'flare'))).optionId).toBe('shelter');
    expect(['food', 'water']).toContain(earthAdvice(run, crisisForEvent(eventOfKind(run.forecast, 'supply-pod'))).optionId);
  });
});

describe('ending a run', () => {
  it('wins by living to the last sol', () => {
    const run = playOut(outpost('jezero', CLOSED_LOOP), SMART);

    expect(run.status).toBe('won');
    expect(run.sol).toBe(WIN_SOL);
  });

  it('is lost without the water, because the timetable is rolled and the run is long', () => {
    const run = playOut(outpost('jezero', SOLAR_FIRST), SMART);

    expect(run.status).toBe('lost');
    expect(endedBy(run)).toContain('water');
  });

  it('loses when there is no greenhouse, and says food was what ran out', () => {
    const run = playOut(outpost('jezero', ['solar-array', 'solar-array', 'batteries', 'batteries', 'regolith-shield']), SMART);

    expect(run.status).toBe('lost');
    expect(endedBy(run)).toContain('food');
  });

  it('loses to a big flare nobody took cover from, with no shielding built', () => {
    const run = playOut(
      outpost('jezero', ['solar-array', 'batteries', 'greenhouse'], DEFAULT_SEED, [{ classType: 'X9.3', approximate: true, when: 'in 2017' }]),
      { ...SMART, flare: 'carry-on' },
    );

    expect(run.status).toBe('lost');
    expect(endedBy(run)).toContain('shielding');
  });

  it('does not end a run just because the battery is empty', () => {
    expect(isRunOver({ power: 0, oxygen: 50, water: 50, food: 50, shielding: 50 })).toBe(false);
    expect(lostStores({ power: 0, oxygen: 0, water: 5, food: 5, shielding: 5 })).toEqual(['oxygen']);
  });

  it('can tell a self-sustaining outpost from one living on its reserves', () => {
    const closedLoop: readonly ModuleKind[] = [
      'solar-array',
      'solar-array',
      'solar-array',
      'batteries',
      'batteries',
      'batteries',
      'greenhouse',
      'ice-miner',
    ];

    expect(isSelfSustaining(outpost('jezero', closedLoop))).toBe(true);
    // Power and food are fine, but nothing makes water: living on a tank that runs out.
    expect(isSelfSustaining(outpost('jezero', SOLAR_FIRST))).toBe(false);
    expect(isSelfSustaining(outpost('jezero', []))).toBe(false);
  });

  it('shows the README power picture: what the arrays make against what the night costs', () => {
    const picture = powerPicture(outpost('jezero', SOLAR_FIRST));

    expect(picture.generatedKw).toBeGreaterThan(0);
    expect(picture.nightDrainKw).toBeGreaterThan(0);
    expect(picture.capacityKwh).toBeGreaterThan(0);
  });
});
