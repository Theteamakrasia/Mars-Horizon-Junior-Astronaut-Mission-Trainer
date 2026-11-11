import { describe, expect, it } from 'vitest';

import { CORE_MODULES, SHIELDING_BASE, SHIELDING_PER_REGOLITH } from './modules';
import { newRun, landAt, startOutpost, withState, type RunState } from './run';

/*
 * The run state is the only thing shared between screens, so a change to it
 * changes every screen. These tests are about the shape of that state and the
 * promises the three constructors make (ISS-053).
 */

describe('a new run', () => {
  it('starts at sol zero, with nothing built and nothing logged', () => {
    const run = newRun('jezero', 'Tester');

    expect(run.sol).toBe(0);
    expect(run.modules).toEqual([]);
    expect(run.log).toEqual([]);
    expect(run.decisions).toEqual([]);
    expect(run.status).toBe('active');
  });

  it('keeps the astronaut name and the region', () => {
    const run = newRun('arcadia', 'Tester');

    expect(run.astronautName).toBe('Tester');
    expect(run.regionId).toBe('arcadia');
  });

  it('starts with no science and no activity chosen', () => {
    const run = newRun('jezero', 'Tester');

    expect(run.science).toBe(0);
    expect(run.chosenActivity).toBeNull();
  });

  it('starts with the panels clean', () => {
    expect(newRun('jezero', 'Tester').panelHealth).toBe(1);
  });
});

describe('landing', () => {
  it('keeps the astronaut name and starts the run fresh', () => {
    const started = newRun('', 'Tester');
    const landed = landAt(started, 'olympus');

    expect(landed.regionId).toBe('olympus');
    expect(landed.astronautName).toBe('Tester');
    expect(landed.sol).toBe(0);
    expect(landed.log).toEqual([]);
  });

  it('does not mutate the run it is given', () => {
    const run = newRun('jezero', 'Tester');
    const frozen = JSON.stringify(run);

    landAt(run, 'argyre');
    expect(JSON.stringify(run)).toBe(frozen);
  });
});

describe('replacing part of the state', () => {
  it('changes only what it is asked to change', () => {
    const run = newRun('jezero', 'Tester');
    const next = withState(run, { science: 12 });

    expect(next.science).toBe(12);
    expect(next.regionId).toBe('jezero');
    expect(next.astronautName).toBe('Tester');
  });

  it('does not mutate the run it is given', () => {
    const run = newRun('jezero', 'Tester');
    const frozen = JSON.stringify(run);

    withState(run, { science: 99, chosenActivity: 'survey' });
    expect(JSON.stringify(run)).toBe(frozen);
  });
});

describe('landing the outpost', () => {
  it('starts at sol zero with the modules the player built', () => {
    const landed = startOutpost(newRun('jezero', 'Tester'), [...CORE_MODULES, 'greenhouse']);

    expect(landed.sol).toBe(0);
    expect(landed.modules).toHaveLength(CORE_MODULES.length + 1);
    expect(landed.status).toBe('active');
  });

  it('fills the batteries and gives the shielding those modules give', () => {
    const landed = startOutpost(newRun('jezero', 'Tester'), [...CORE_MODULES, 'regolith-shield']);

    expect(landed.stores.power).toBe(100);
    expect(landed.stores.shielding).toBe(SHIELDING_BASE + SHIELDING_PER_REGOLITH);
  });

  it('resets anything a previous attempt left behind', () => {
    const played: RunState = {
      ...newRun('jezero', 'Tester'),
      sol: 7,
      status: 'lost',
      science: 30,
      chosenActivity: 'survey',
      panelHealth: 0.5,
      log: [{ sol: 1 } as never],
      decisions: [{ sol: 1 } as never],
    };

    const landed = startOutpost(played, [...CORE_MODULES]);

    expect(landed.sol).toBe(0);
    expect(landed.status).toBe('active');
    expect(landed.science).toBe(0);
    expect(landed.chosenActivity).toBeNull();
    expect(landed.panelHealth).toBe(1);
    expect(landed.log).toEqual([]);
    expect(landed.decisions).toEqual([]);
  });
});
