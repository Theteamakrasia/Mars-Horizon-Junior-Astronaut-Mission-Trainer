/**
 * The save format: what a run looks like written down, and what survives being
 * read back.
 *
 * Pure, like everything in `sim/`: no browser, no storage, no `Math.random`.
 * The storage key and the resume point live in `ui/save.ts`, and are tested
 * there without touching storage either.
 */

import { describe, expect, it } from 'vitest';

import { MODULE_CATALOGUE, type ModuleKind } from './modules';
import { createInitialStores } from './resources';
import { ROVER_FINDS } from './rover';
import { newRun, withState, type RunState, type SolRecord } from './run';
import { decodeRun, encodeRun } from './save';
import { TRAINING_GAMES } from './training';

/** One sol, with every field a record carries. */
const RECORD: SolRecord = {
  sol: 1,
  stores: { power: 50, oxygen: 90, water: 80, food: 70, shielding: 60 },
  // Deliberately mixed signs: a sol makes some things and loses others.
  net: { power: -10, oxygen: -2, water: -1, food: 3, shielding: -0.5 },
  powerGenerated: 100,
  powerUsed: 110,
  powerWasted: 4,
  powerNight: 55,
  powerExtra: 20,
  blackout: 0.1,
  panelHealth: 0.95,
  greenhousePaused: false,
  produced: { power: 100, oxygen: 14, water: 5, food: 12, shielding: 2 },
  consumed: { power: 110, oxygen: 16, water: 6, food: 9, shielding: 2.5 },
  used: { oxygen: 14, water: 8, food: 10 },
  activity: { id: 'dust-sweep', title: 'Sweep the panels', science: 12 },
  events: [{ sol: 1, kind: 'storm', summary: 'A dust storm rolls in.', approximate: false }],
  notes: ['The panels are dusty.'],
};

/** A run with a little of everything in it, so a round trip exercises the parts. */
function fullRun(): RunState {
  const base = newRun('arcadia', 'Ada Lovelace');

  return {
    ...base,
    sol: 3,
    stores: { power: 120, oxygen: 66, water: 55, food: 44, shielding: 33 },
    modules: ['habitat', 'life-support', 'solar-array', 'batteries'],
    panelHealth: 0.7,
    science: 42,
    chosenActivity: 'dust-sweep',
    inspections: [{ sol: 2, activityId: 'dust-sweep', stars: 2 }],
    rover: {
      ...base.rover,
      phase: 'exploring',
      returnsOn: 4,
      pending: ROVER_FINDS[0],
      found: [ROVER_FINDS[0].id],
      visited: [],
      collected: [],
      left: [],
    },
    forecast: [
      {
        id: 'storm-2',
        sol: 2,
        kind: 'storm',
        durationSols: 2,
        intensity: 0,
        summary: 'A dust storm is on its way.',
        approximate: true,
      },
    ],
    log: [RECORD],
    decisions: [{ sol: 2, crisisId: 'storm-2', optionId: 'seal', timedOut: false }],
    training: {
      sol: 4,
      completed: [{ gameId: TRAINING_GAMES[0].id, points: 3, performance: 'good' }],
      pointsToday: 3,
    },
  };
}

describe('encodeRun', () => {
  it('produces something JSON can hold', () => {
    const encoded = encodeRun(fullRun());

    // The round trip through text is the whole claim: no function, no cycle, and
    // nothing the storage layer would silently drop.
    expect(JSON.parse(JSON.stringify(encoded))).toEqual(encoded);
  });

  it('is a copy, not the run itself', () => {
    const run = fullRun();
    const encoded = encodeRun(run);

    expect(encoded).not.toBe(run);
  });
});

describe('decodeRun', () => {
  it('brings a full run back exactly as it went in', () => {
    const run = fullRun();

    expect(decodeRun(encodeRun(run))).toEqual(run);
  });

  it('survives the text a storage layer actually stores', () => {
    const run = fullRun();
    const text = JSON.stringify(encodeRun(run));

    expect(decodeRun(JSON.parse(text))).toEqual(run);
  });

  it('keeps a name that is not plain ASCII', () => {
    const run = withState(newRun('arcadia', 'Zoë 🚀'), { sol: 2 });

    expect(decodeRun(encodeRun(run))?.astronautName).toBe('Zoë 🚀');
  });

  it('refuses anything that is not an object', () => {
    expect(decodeRun(null)).toBeNull();
    expect(decodeRun('a run')).toBeNull();
    expect(decodeRun(42)).toBeNull();
    expect(decodeRun([])).toBeNull();
  });

  it('refuses a run with no sol to stand on', () => {
    const { sol: _sol, ...withoutSol } = encodeRun(fullRun()) as Record<string, unknown>;

    expect(decodeRun(withoutSol)).toBeNull();
  });

  it('refuses a run whose stores are gone', () => {
    const { stores: _stores, ...withoutStores } = encodeRun(fullRun()) as Record<string, unknown>;

    expect(decodeRun(withoutStores)).toBeNull();
  });

  it('refuses a status it does not know', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;

    expect(decodeRun({ ...run, status: 'abandoned' })).toBeNull();
    expect(decodeRun({ ...run, status: 'won' })?.status).toBe('won');
  });

  it('pulls a store back inside its tank', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;
    const stores = { power: -5, oxygen: 140, water: 90, food: 80, shielding: 20 };

    expect(decodeRun({ ...run, stores })?.stores).toEqual({ power: 0, oxygen: 100, water: 90, food: 80, shielding: 20 });
  });

  it('pulls panel health back between 0 and 1', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;

    expect(decodeRun({ ...run, panelHealth: 4 })?.panelHealth).toBe(1);
    expect(decodeRun({ ...run, panelHealth: -2 })?.panelHealth).toBe(0);
  });

  it('keeps a sol record’s losses negative', () => {
    /* A record's `net` and `consumed` are differences, not levels. Clamping them
       at zero would turn every loss into a gain and make the debrief lie. */
    const decoded = decodeRun(encodeRun(fullRun()));

    expect(decoded?.log[0].net.power).toBe(-10);
    expect(decoded?.log[0].net.shielding).toBe(-0.5);
  });

  it('drops a module this build does not know, and keeps the rest', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;
    const modules = ['habitat', 'moon-base', 'batteries'];

    expect(decodeRun({ ...run, modules })?.modules).toEqual(['habitat', 'batteries']);
  });

  it('keeps every module in the catalogue', () => {
    const modules: ModuleKind[] = MODULE_CATALOGUE.map((spec) => spec.kind);
    const run = encodeRun(fullRun()) as Record<string, unknown>;

    expect(decodeRun({ ...run, modules })?.modules).toEqual(modules);
  });

  it('drops a sol record that lost a field, and keeps the ones that did not', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;
    const broken = { ...RECORD, blackout: 'a lot' };

    const decoded = decodeRun({ ...run, log: [broken, RECORD] });

    expect(decoded?.log).toHaveLength(1);
    expect(decoded?.log[0]).toEqual(RECORD);
  });

  it('drops a rover find it cannot draw, without losing the rover', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;
    const rover = { ...(run.rover as Record<string, unknown>), pending: { id: 'half-a-find' } };

    const decoded = decodeRun({ ...run, rover });

    expect(decoded?.rover.pending).toBeNull();
    expect(decoded?.rover.returnsOn).toBe(4);
    expect(decoded?.rover.found).toEqual([ROVER_FINDS[0].id]);
  });

  it('starts the day’s training again when the record cannot be read', () => {
    const run = encodeRun(fullRun()) as Record<string, unknown>;
    const decoded = decodeRun({ ...run, training: { sol: 'yesterday' } });

    // `RunState` keeps the day as sol + 1 — see `newRun`.
    expect(decoded?.training).toEqual({ sol: 4, completed: [], pointsToday: 0 });
  });

  it('resumes a run written before a field existed', () => {
    /* The version is bumped for a shape change the decoder cannot absorb. Any
       other missing half is repaired from a fresh run, because losing the run
       over a rover the player does not have yet would be absurd. */
    const run = encodeRun(fullRun()) as Record<string, unknown>;

    const decoded = decodeRun({
      sol: run.sol,
      regionId: run.regionId,
      astronautName: run.astronautName,
      stores: run.stores,
      status: run.status,
      modules: run.modules,
      panelHealth: run.panelHealth,
      science: run.science,
    });

    expect(decoded).not.toBeNull();
    expect(decoded?.sol).toBe(3);
    expect(decoded?.rover.found).toEqual([]);
    expect(decoded?.log).toEqual([]);
    expect(decoded?.stores).toEqual(createInitialStores({ power: 120, oxygen: 66, water: 55, food: 44, shielding: 33 }));
  });

  it('reads a run that never left the menu', () => {
    const run = newRun('', '');

    expect(decodeRun(encodeRun(run))).toEqual(run);
  });
});
