/*
 * The balance check: is the game still winnable, and can the five science
 * systems still be held?
 *
 *   npm run balance
 *
 * This is a check, not a test: `npm test` stays free of a search, because a
 * search is slow and a test should be fast and certain. It drives the real
 * sim over every legal build, several forecast seeds and all five landing
 * sites, and it fails when the game stops being playable.
 *
 * It exists because the balance was broken for a long time without anybody
 * noticing: fourteen build points could not buy a night of power at any
 * landing site, so no build could survive and no run could end with all five
 * goals satisfied. Nothing in the test suite said so, because every test
 * asked about one function at a time.
 *
 * Run it after changing anything in `src/sim/`.
 */

import { activityById, offerFor } from '../src/sim/activities';
import { crisisForEvent } from '../src/sim/crises';
import { createForecast, eventsStartingOn } from '../src/sim/forecast';
import { goalProgress } from '../src/sim/goals';
import {
  BUILD_BUDGET,
  CORE_MODULES,
  extraSlots,
  pointsSpent,
  specOf,
  type ModuleKind,
} from '../src/sim/modules';
import { REGIONS, siteScore } from '../src/sim/regions';
import { newRun, startOutpost, withState, type RunState } from '../src/sim/run';
import { advanceSol, WIN_SOL } from '../src/sim/sol';

/** The modules a player can add. The four core ones come with the lander. */
const BUILDABLE: readonly ModuleKind[] = [
  'solar-array',
  'batteries',
  'greenhouse',
  'ice-miner',
  'regolith-shield',
  'nuclear-unit',
];

/** Forecast seeds. More seeds means a more certain answer and a slower run. */
const SEEDS: readonly number[] = (process.env.SEEDS ?? '1,2,3,4').split(',').map(Number);

/** How many plays to keep at each sol. Wider means a better answer and slower. */
const BEAM = Number(process.env.BEAM ?? 10);

/**
 * How many sols a system has to hold for to count as held.
 *
 * The goals are not a score any more - they are the project's learning
 * outcomes - so the check asks the honest question: can the crew keep a
 * system running for most of the run?
 */
const HELD_FOR = 10;

/** The bar: a run has to be winnable, and every site has to be able to hold all five systems. */
const MIN_WIN_RATE = 0.2;
const GOALS_TO_EARN = 5;

/** Every build the player is allowed to make at a site. */
function legalBuilds(regionId: string): readonly ModuleKind[][] {
  const score = siteScore(regionId);
  const slots = extraSlots(regionId);
  const limits = new Map<ModuleKind, number>();

  for (const kind of BUILDABLE) {
    const fromLander = CORE_MODULES.includes(kind) ? 1 : 0;

    limits.set(kind, Math.max(0, specOf(kind).maxCount - fromLander));
  }

  const found: ModuleKind[][] = [];

  const walk = (index: number, acc: ModuleKind[]): void => {
    if (index === BUILDABLE.length) {
      const all = [...CORE_MODULES, ...acc];

      if (acc.length > slots) return;
      if (pointsSpent(all) > BUILD_BUDGET) return;
      if (acc.includes('ice-miner') && score.water < 3) return;
      if (acc.includes('regolith-shield') && score.terrain < 2) return;

      found.push([...acc]);

      return;
    }

    const kind = BUILDABLE[index] as ModuleKind;

    for (let count = 0; count <= (limits.get(kind) ?? 0); count += 1) {
      walk(index + 1, [...acc, ...Array<ModuleKind>(count).fill(kind)]);
    }
  };

  walk(0, []);

  return found;
}

/** Every way the next sol can be played from this state. */
function candidates(state: RunState): readonly RunState[] {
  const nextSol = state.sol + 1;
  const starting = eventsStartingOn(state.forecast, nextSol);

  /* A sol with a forecast event is a crisis sol: the event is the day's work
     and the activity does not run. */
  if (starting.length > 0) {
    const event = starting[0];

    if (event === undefined) return [advanceSol(state)];

    return crisisForEvent(event).options.map((option) =>
      advanceSol(
        withState(state, {
          decisions: [
            ...state.decisions.filter((entry) => entry.crisisId !== event.id),
            { sol: event.sol, crisisId: event.id, optionId: option.id, timedOut: false },
          ],
        }),
      ),
    );
  }

  const offers = offerFor(state, nextSol).filter((offer) => offer.available);

  if (offers.length === 0) return [advanceSol(state)];

  return offers.map((offer) => advanceSol(withState(state, { chosenActivity: offer.spec.id })));
}

/**
 * Play the run, keeping the best few plays alive at each sol.
 *
 * Survival comes first: a run that ends early is worth less than one that
 * reaches the last sol, however tidy its first few sols were. The goal count
 * breaks the tie.
 */
function bestPlay(start: RunState): RunState {
  let beam: { state: RunState; score: number }[] = [{ state: start, score: 0 }];
  let best = start;

  for (let sol = 0; sol < WIN_SOL; sol += 1) {
    const next: { state: RunState; score: number }[] = [];

    for (const node of beam) {
      if (node.state.status !== 'active') {
        next.push(node);

        continue;
      }

      for (const played of candidates(node.state)) {
        const earned = goalProgress(played).filter((objective) => objective.held >= HELD_FOR).length;
        const life = played.status === 'won' ? 100000 : played.status === 'lost' ? -100000 : 0;

        next.push({ state: played, score: node.score + life + earned * 1000 });
      }
    }

    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, BEAM);

    for (const node of beam) {
      if (node.state.status === 'won' && best.status !== 'won') best = node.state;
    }

    if (beam.every((node) => node.state.status !== 'active')) break;
  }

  return beam[0]?.state ?? best;
}

interface SiteReport {
  readonly id: string;
  readonly name: string;
  readonly builds: number;
  readonly wins: number;
  readonly tries: number;
  readonly winRate: number;
  /** The most goals any build managed to earn at this site. */
  readonly bestGoals: number;
  /** The build that earned the most, so a failure can be looked at. */
  readonly bestBuild: readonly string[];
}

const reports: SiteReport[] = [];

for (const region of REGIONS) {
  const builds = legalBuilds(region.id);
  let wins = 0;
  let tries = 0;
  let bestGoals = 0;
  let bestBuild: readonly string[] = [];

  for (const build of builds) {
    for (const seed of SEEDS) {
      const forecast = createForecast([], seed, siteScore(region.id).dust);
      const start = withState(startOutpost(newRun(region.id, 'Check'), [...CORE_MODULES, ...build]), { forecast });
      const played = bestPlay(start);

      tries += 1;

      if (played.status === 'won') wins += 1;

      const earned = goalProgress(played).filter((objective) => objective.held >= HELD_FOR).length;

      if (earned > bestGoals) {
        bestGoals = earned;
        bestBuild = [...build];
      }
    }
  }

  reports.push({
    id: region.id,
    name: region.name,
    builds: builds.length,
    wins,
    tries,
    winRate: tries === 0 ? 0 : wins / tries,
    bestGoals,
    bestBuild,
  });
}

console.log(`\nThe balance check — ${SEEDS.length} seeds, beam ${BEAM}, ${WIN_SOL} sols\n`);
console.log('site              builds   win rate   systems held   best build');

for (const report of reports) {
  console.log(
    `${report.name.padEnd(17)} ${String(report.builds).padStart(5)}   ` +
      `${(report.winRate * 100).toFixed(1).padStart(5)}%   ` +
      `${`${report.bestGoals}/${GOALS_TO_EARN}`.padStart(10)}   ` +
      `${report.bestBuild.join(', ') || '(none)'}`,
  );
}

const problems: string[] = [];

for (const report of reports) {
  if (report.winRate < MIN_WIN_RATE) {
    problems.push(
      `${report.name}: only ${(report.winRate * 100).toFixed(1)}% of builds can win a run (the bar is ${(MIN_WIN_RATE * 100).toFixed(0)}%)`,
    );
  }

  if (report.bestGoals < GOALS_TO_EARN) {
    problems.push(
      `${report.name}: no build can hold all ${GOALS_TO_EARN} systems (the best holds ${report.bestGoals}). The best build was: ${report.bestBuild.join(', ') || '(none)'}`,
    );
  }
}

console.log('');

if (problems.length > 0) {
  console.error('FAIL — the game is not playable as it stands:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exitCode = 1;
} else {
  const mean = reports.reduce((sum, report) => sum + report.winRate, 0) / Math.max(1, reports.length);

  console.log(`PASS — every site can hold all ${GOALS_TO_EARN} systems, and ${(mean * 100).toFixed(1)}% of builds can win on average.`);
}
