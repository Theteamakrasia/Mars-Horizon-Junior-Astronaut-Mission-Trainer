import { describe, expect, it } from 'vitest';

import { earthCanAnswerInTime, oneWayMinutes, roundTripMinutes } from './comms';
import { crisisForEvent, earthAdvice, earthIsInTime, pendingCrisis } from './crises';
import { createForecast, flareIntensity, stormOn, stormOpacity } from './forecast';
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

function outpost(region: string, extras: readonly ModuleKind[], flares = FLARES): RunState {
  const base = withState(newRun(region, 'Test'), { forecast: createForecast(flares) });

  return startOutpost(base, [...CORE_MODULES, ...extras]);
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

  it('puts the flares on sols 3 and 10, the pod on 5 and the storm on 7', () => {
    const forecast = createForecast(FLARES);

    expect(forecast.map((event) => `${event.kind}@${event.sol}`)).toEqual([
      'flare@3',
      'supply-pod@5',
      'storm@7',
      'flare@10',
    ]);
  });

  it('carries the approximate flag from the data to the event the player sees', () => {
    const live = createForecast([{ classType: 'X1.0', approximate: false, when: 'today' }]);

    expect(live.find((event) => event.kind === 'flare')?.approximate).toBe(false);
    expect(createForecast([]).find((event) => event.kind === 'flare')?.approximate).toBe(true);
  });

  it('keeps the storm over two sols and blocks less sun at a calmer site', () => {
    const forecast = createForecast(FLARES);

    expect(stormOn(forecast, 7)?.kind).toBe('storm');
    expect(stormOn(forecast, 8)?.kind).toBe('storm');
    expect(stormOn(forecast, 9)).toBeNull();
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

    for (let i = 0; i < 7; i += 1) run = advanceSol(run);

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
});

describe('crisis decisions', () => {
  it('asks about each forecast event exactly once, on the sol before it begins', () => {
    let run = outpost('jezero', SOLAR_FIRST);

    expect(pendingCrisis(run)).toBeNull();
    run = advanceSol(advanceSol(run));
    expect(pendingCrisis(run)?.id).toBe('flare-3');

    run = decide(run, 'flare-3', 'shelter');
    expect(pendingCrisis(run)).toBeNull();
  });

  it('keeps one decision per crisis even if it is answered twice', () => {
    let run = outpost('jezero', SOLAR_FIRST);

    run = decide(run, 'flare-3', 'shelter');
    run = decide(run, 'flare-3', 'carry-on');
    expect(run.decisions).toHaveLength(1);
    expect(run.decisions[0].optionId).toBe('carry-on');
  });

  it('throws on a crisis or option that does not exist', () => {
    const run = outpost('jezero', []);

    expect(() => decide(run, 'flare-99', 'shelter')).toThrow(RangeError);
    expect(() => decide(run, 'flare-3', 'teleport')).toThrow(RangeError);
  });

  it('makes sheltering cost less shielding than carrying on, but pause the greenhouse', () => {
    const base = outpost('jezero', SOLAR_FIRST);
    const run = (choice: string): RunState => {
      let state = decide(base, 'flare-3', choice);

      for (let i = 0; i < 3; i += 1) state = advanceSol(state);

      return state;
    };

    expect(run('shelter').stores.shielding).toBeGreaterThan(run('carry-on').stores.shielding);
    expect(run('shelter').log[2].greenhousePaused).toBe(true);
    expect(run('carry-on').log[2].greenhousePaused).toBe(false);
  });

  it('makes a bigger flare hit harder', () => {
    expect(FLARE_DRAIN[3]).toBeGreaterThan(FLARE_DRAIN[2]);
    expect(FLARE_DRAIN[2]).toBeGreaterThan(FLARE_DRAIN[1]);
  });

  it('keeps panels clean when folded away, and ruins them for good when left out', () => {
    const play = (choice: string): number => {
      let run = decide(outpost('jezero', SOLAR_FIRST), 'storm-7', choice);

      for (let i = 0; i < 9; i += 1) run = advanceSol(run);

      return run.panelHealth;
    };

    expect(play('retract')).toBe(1);
    expect(play('expose')).toBeLessThan(1);
  });

  it('lets the supply pod refill what the player picks', () => {
    const base = outpost('jezero', SOLAR_FIRST);
    const water = (choice: string): number => {
      let run = decide(base, 'supply-5', choice);

      for (let i = 0; i < 5; i += 1) run = advanceSol(run);

      return run.stores.water;
    };

    expect(water('water')).toBeGreaterThan(water('food'));
  });
});

describe('Earth and the delay', () => {
  it('refuses to wait for Earth on a fast crisis but can on a slow one', () => {
    const run = outpost('jezero', SOLAR_FIRST);
    const flare = crisisForEvent(run.forecast[0]);
    const pod = crisisForEvent(run.forecast[1]);

    expect(earthIsInTime(withState(run, { sol: 2 }), flare)).toBe(false);
    expect(earthIsInTime(withState(run, { sol: 4 }), pod)).toBe(true);
  });

  it('advises sheltering from a flare, and food or water depending on what runs out first', () => {
    const run = outpost('jezero', []);

    expect(earthAdvice(run, crisisForEvent(run.forecast[0])).optionId).toBe('shelter');
    expect(['food', 'water']).toContain(earthAdvice(run, crisisForEvent(run.forecast[1])).optionId);
  });
});

describe('ending a run', () => {
  it('wins by living to the last sol', () => {
    const run = playOut(outpost('jezero', SOLAR_FIRST), SMART);

    expect(run.status).toBe('won');
    expect(run.sol).toBe(WIN_SOL);
  });

  it('loses when there is no greenhouse, and says food was what ran out', () => {
    const run = playOut(outpost('jezero', ['solar-array', 'solar-array', 'batteries', 'batteries', 'regolith-shield']), SMART);

    expect(run.status).toBe('lost');
    expect(endedBy(run)).toContain('food');
  });

  it('loses to a big flare nobody took cover from, with no shielding built', () => {
    const run = playOut(
      outpost('jezero', ['solar-array', 'batteries', 'greenhouse'], [{ classType: 'X9.3', approximate: true, when: 'in 2017' }]),
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
