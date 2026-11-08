/**
 * Balance acceptance tests (GAME_LOOP_PLAN.md section 5).
 *
 * These are the reason every number lives in `sim/constants.ts`. They script
 * real runs through `newRun`, `applyBuild` and `advanceSol`, with no
 * randomness, so tuning a constant shows up as a failing test rather than as
 * a difficulty change nobody noticed.
 *
 * Build scripts are explicit lists. A "thoughtful" player is modelled as
 * building each module once, in priority order, as soon as they can afford it
 * while keeping a small power buffer.
 */

import { describe, expect, it } from 'vitest';

import { advanceSol } from './sol';
import { applyBuild, newRun, type RunState } from './run';
import { REGIONS } from './regions';
import {
  adjustedBuildCost,
  MODULE_CATALOGUE,
  type ModuleKind,
} from './modules';
import { BASE_STORES, TARGET_SOL } from './constants';
import { depletedStores, type ResourceName, type ResourceStores } from './resources';

/** Power kept in reserve before a build is attempted. */
const BUILD_BUFFER = 5;

/** Every region id, in table order. */
const REGION_IDS = REGIONS.map((r) => r.id);

interface Outcome {
  readonly status: 'active' | 'lost' | 'won';
  readonly sol: number;
  readonly stores: ResourceStores;
  readonly firstDepleted: ResourceName | null;
}

function terrainFor(regionId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.scores.terrain ?? 3;
}

/**
 * Build `kind` if the run can afford it while keeping `BUILD_BUFFER` power.
 * Returns null when it cannot.
 */
function tryBuild(run: RunState, kind: ModuleKind): RunState | null {
  const cost = adjustedBuildCost(kind, terrainFor(run.regionId));
  if (run.stores.power - cost < BUILD_BUFFER) return null;
  return applyBuild(run, kind);
}

/**
 * Run a scripted game.
 *
 * At the start of every sol, try to build each pending module once, in order.
 * Then advance one sol. Stop at `maxSols`, or as soon as the run ends.
 */
function simulate(
  regionId: string,
  buildOrder: readonly ModuleKind[] = [],
  maxSols: number = TARGET_SOL,
): Outcome {
  let run = newRun(regionId, 'Test Astronaut');
  const pending = [...buildOrder];

  for (let step = 0; step < maxSols; step += 1) {
    // Build phase: one attempt per pending module, in priority order.
    for (let i = 0; i < pending.length; ) {
      const next = tryBuild(run, pending[i]);
      if (next) {
        run = next;
        pending.splice(i, 1);
      } else {
        i += 1;
      }
    }

    const result = advanceSol(run);
    const entry = result.ledger[result.ledger.length - 1];
    run = {
      ...run,
      sol: entry.sol,
      stores: result.stores,
      status: result.status,
      ledger: result.ledger,
    };

    if (result.status !== 'active') {
      return {
        status: result.status,
        sol: entry.sol,
        stores: result.stores,
        firstDepleted:
          result.status === 'lost' ? (depletedStores(result.stores)[0] ?? null) : null,
      };
    }
  }

  return {
    status: run.status,
    sol: run.sol,
    stores: run.stores,
    firstDepleted: null,
  };
}

/** The plan's thoughtful build: battery, shelter, extractor, greenhouse. */
const THOUGHTFUL_BUILD: readonly ModuleKind[] = [
  'extra-batteries',
  'radiation-shelter',
  'water-extractor',
  'greenhouse',
];

/** A power-heavy build, used to prove no region is unwinnable. */
const POWER_BUILD: readonly ModuleKind[] = [
  'extra-solar-array',
  'extra-solar-array',
  'extra-batteries',
  'radiation-shelter',
  'water-extractor',
  'greenhouse',
];

describe('balance: default build', () => {
  it('survives through the storm warning and first storm in every region', () => {
    for (const regionId of REGION_IDS) {
      const outcome = simulate(regionId, [], 5);
      expect(
        outcome.status,
        `${regionId} should survive to sol 5, lost on sol ${outcome.sol}`,
      ).toBe('active');
      expect(outcome.sol).toBe(5);
    }
  });

  it('never reaches the target sol in any region', () => {
    for (const regionId of REGION_IDS) {
      const outcome = simulate(regionId);
      expect(outcome.status, `${regionId} should not win with no building`).toBe('lost');
      expect(outcome.sol, `${regionId} lost too late`).toBeLessThan(TARGET_SOL);
    }
  });
});

describe('balance: thoughtful build', () => {
  it('wins in at least three of five regions', () => {
    const outcomes = REGION_IDS.map((id) => ({ id, outcome: simulate(id, THOUGHTFUL_BUILD) }));
    const winners = outcomes.filter(({ outcome }) => outcome.status === 'won');

    expect(
      winners.length,
      `thoughtful build won in: ${winners.map((w) => w.id).join(', ') || 'none'}; ` +
        outcomes
          .filter(({ outcome }) => outcome.status !== 'won')
          .map(({ id, outcome }) => `${id} lost on ${outcome.firstDepleted} at sol ${outcome.sol}`)
          .join('; '),
    ).toBeGreaterThanOrEqual(3);
  });

  it('does not win every region', () => {
    const winners = REGION_IDS.filter(
      (id) => simulate(id, THOUGHTFUL_BUILD).status === 'won',
    );
    expect(winners.length).toBeLessThan(REGION_IDS.length);
  });
});

describe('balance: no perfect region', () => {
  it('leaves no region winnable with zero building effort', () => {
    for (const regionId of REGION_IDS) {
      expect(simulate(regionId, []).status).toBe('lost');
    }
  });

  it('leaves no region unwinnable', () => {
    for (const regionId of REGION_IDS) {
      const outcome = simulate(regionId, POWER_BUILD);
      expect(
        outcome.status,
        `${regionId} should be winnable with a power-heavy build, ended at sol ${outcome.sol} on ${outcome.firstDepleted}`,
      ).toBe('won');
    }
  });
});

describe('balance: over-building', () => {
  it('cannot afford every buildable module immediately in any region', () => {
    for (const regionId of REGION_IDS) {
      const terrain = terrainFor(regionId);
      const total = MODULE_CATALOGUE.filter((m) => !m.startsBuilt).reduce(
        (sum, m) => sum + adjustedBuildCost(m.kind, terrain),
        0,
      );
      expect(
        total,
        `${regionId} can afford every module at once (${total} power)`,
      ).toBeGreaterThan(BASE_STORES.power);
    }
  });

  it('a build that spends everything leaves no power margin', () => {
    // Greenhouse and extractor cost 20 each; 10 power is left, not enough for
    // the 15-power shelter.
    const run = newRun('jezero');
    const afterGreenhouse = applyBuild(run, 'greenhouse');
    expect(afterGreenhouse).not.toBeNull();
    const afterExtractor = applyBuild(afterGreenhouse!, 'water-extractor');
    expect(afterExtractor).not.toBeNull();
    expect(afterExtractor!.stores.power).toBe(10);
    expect(applyBuild(afterExtractor!, 'radiation-shelter')).toBeNull();
  });
});

describe('balance: sun versus water', () => {
  it('Olympus fails on water and Arcadia fails on power for the same shape of build', () => {
    // Olympus: high sun, low water. Fix food and shelter, do not fix water.
    const olympus = simulate('olympus', [
      'extra-batteries',
      'radiation-shelter',
      'greenhouse',
    ]);
    expect(olympus.status).toBe('lost');
    expect(olympus.firstDepleted).toBe('water');

    // Arcadia: high water, low sun. Fix water and food, do not add power.
    const arcadia = simulate('arcadia', [
      'extra-batteries',
      'radiation-shelter',
      'water-extractor',
      'greenhouse',
    ]);
    expect(arcadia.status).toBe('lost');
    expect(arcadia.firstDepleted).toBe('power');
  });
});
