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

import { activityById, canAfford, offerFor, type ActivityOffer } from '../src/sim/activities';
import { availableOptions, crisisForEvent } from '../src/sim/crises';
import { createForecast, eventsStartingOn, stormOn } from '../src/sim/forecast';
import { goalProgress } from '../src/sim/goals';
import {
  BUILD_BUDGET,
  CORE_MODULES,
  NIGHT_HOURS,
  SUN_HOURS,
  extraSlots,
  pointsSpent,
  specOf,
  systemsFor,
  type ModuleKind,
} from '../src/sim/modules';
import { REGIONS, siteScore } from '../src/sim/regions';
import { FLOORED_STORES, type ResourceName } from '../src/sim/resources';
import { newRun, startOutpost, withState, type RunState } from '../src/sim/run';
import { advanceSol, WIN_SOL } from '../src/sim/sol';
import { completeTraining, type TrainingGameId } from '../src/sim/training';

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
/**
 * The other end of the bar.
 *
 * A check that only catches "too hard" catches half the problem. If nearly
 * every build wins, the five stores are decoration: there is no decision that
 * can go wrong, and a child learns nothing from a run that could not be lost.
 * The band between the two numbers is the game being moderately challenging on
 * purpose.
 */
const MAX_WIN_RATE = 0.75;

/** The game that fills each store. One per store except power, which has two. */
const GAME_FOR_STORE: Readonly<Record<ResourceName, TrainingGameId>> = {
  power: 'solar-power-up',
  oxygen: 'memory-match',
  water: 'resource-merge',
  food: 'cargo-sorting',
  shielding: 'asteroid-defender',
};

/**
 * Play the day's two training games the way a competent player would.
 *
 * Training is not optional — today's work orders stay locked until two games
 * are done — so the stores it pays are part of the economy and a check that
 * ignored them would understate how survivable the game is. Power is compared
 * as a share of the batteries the crew actually built, because its tank is as
 * big as they made it.
 *
 * The player is modelled as sensible, not optimal: they top up the two
 * weakest stores, at the middle 'good' band.
 */
function withTraining(state: RunState): RunState {
  const capacity = Math.max(1, systemsFor(state.modules, state.regionId).batteryKwh);
  const share = (name: ResourceName): number =>
    FLOORED_STORES.includes(name) ? state.stores[name] : (state.stores.power / capacity) * 100;

  const weakest = [...FLOORED_STORES, 'power' as ResourceName]
    .sort((a, b) => share(a) - share(b))
    .slice(0, 2);

  let trained = state;

  for (const name of weakest) {
    const outcome = completeTraining(trained, GAME_FOR_STORE[name], 'good');

    if (outcome.ok) trained = outcome.run;
  }

  return trained;
}

/**
 * What the day looked like, across every play the search made.
 *
 * The win rate says whether the game is playable. These say whether it is a
 * *choice*: a sol where the crew could only afford one job is a sol where the
 * player had nothing to weigh, and sunlight that spilled out of a full
 * battery is power the player made and never got to use.
 */
const economy = {
  /** Sols played. */
  sols: 0,
  /** Sols where at least two jobs were affordable. */
  choices: 0,
  /** Sols where only the free job was affordable while the bank was healthy. */
  blind: 0,
};

/**
 * The bar for "the power economy left the player a choice".
 *
 * Half the sols have to offer a real decision, and a sol where the batteries
 * are still healthy must never be a sol where nothing can be paid for.
 */
const MIN_CHOICE_SHARE = 0.5;
const MAX_BLIND_SHARE = 0.02;

/**
 * The bar for "the player is not making power they cannot use".
 *
 * A quarter of everything generated may spill. More than that and the solar
 * arrays are decoration.
 */
const MAX_SPILL_SHARE = 0.25;

/**
 * True when the batteries alone could pay for the whole sol.
 *
 * The sol's own draw is the day, the night and the reactor's share. When the
 * bank covers that much on its own, the outpost is in good shape, and a sol
 * on which the crew can afford nothing but rest is the power economy's
 * fault rather than the build's.
 */
function bankCoversSol(state: RunState): boolean {
  const systems = systemsFor(state.modules, state.regionId);
  const day = systems.loadKw * SUN_HOURS;
  const night = Math.max(0, systems.loadKw - systems.nuclearKw) * NIGHT_HOURS;
  const reactor = systems.nuclearKw * (SUN_HOURS + NIGHT_HOURS);

  return state.stores.power + reactor >= day + night;
}

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
  /* Two training games come first, because the day's work orders are locked
     until they are done and the stores they pay are part of the economy. */
  const trained = withTraining(state);
  const nextSol = trained.sol + 1;
  const starting = eventsStartingOn(trained.forecast, nextSol);

  /* A sol with a forecast event is a crisis sol: the event is the day's work
     and the activity does not run. */
  if (starting.length > 0) {
    const event = starting[0];

    if (event === undefined) return [advanceSol(trained)];

    return availableOptions(trained, crisisForEvent(event)).map((option) =>
      advanceSol(
        withState(trained, {
          decisions: [
            ...trained.decisions.filter((entry) => entry.crisisId !== event.id),
            { sol: event.sol, crisisId: event.id, optionId: option.id, timedOut: false },
          ],
        }),
      ),
    );
  }

  const offers = offerFor(trained, nextSol);
  const affordable = offers.filter((offer) => offer.available);

  /* How much of a choice the day really was.
   *
   * A sol where the power stopped the crew from doing anything they could
   * have done is a sol the power economy took away — provided the batteries
   * could have carried the outpost on their own. A job locked because the
   * outpost is not built for it (no greenhouse, no ice miner) is the build's
   * doing, not the economy's, so it is not counted here.
   *
   * A sol under a dust storm is left out too: the panels are folded, the
   * batteries are the only power there is, and a crew working on what it has
   * is the storm's lesson rather than a failure of the economy.
   */
  if (stormOn(trained.forecast, nextSol) === null) {
    economy.sols += 1;
    if (affordable.length >= 2) economy.choices += 1;

    const powerStopped = offers.some((offer) => powerLocked(offer, trained));

    if (powerStopped && bankCoversSol(trained)) economy.blind += 1;
  }

  if (affordable.length === 0) return [advanceSol(trained)];

  return affordable.map((offer) => advanceSol(withState(trained, { chosenActivity: offer.spec.id })));
}

/**
 * True when the only reason an activity is locked is the power.
 *
 * An activity the outpost is not built for is locked whatever the batteries
 * hold, and that is the player's build to answer for.
 */
function powerLocked(offer: ActivityOffer, state: RunState): boolean {
  if (offer.available) return false;

  const requires = offer.spec.requires;

  if (requires !== undefined) {
    if (requires.kind === 'module' && !state.modules.includes(requires.module)) return false;
    if (requires.kind === 'dirty-panels' && state.panelHealth >= 1) return false;
  }

  return !canAfford(offer.spec, state);
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
  /** The least sunlight any build holding all five systems had to throw away. */
  readonly cleanSpill: number;
  /** The build that threw away the least. */
  readonly cleanBuild: readonly string[];
}

const reports: SiteReport[] = [];

for (const region of REGIONS) {
  const builds = legalBuilds(region.id);
  let wins = 0;
  let tries = 0;
  let bestGoals = 0;
  let bestBuild: readonly string[] = [];
  let cleanSpill = Number.POSITIVE_INFINITY;
  let cleanBuild: readonly string[] = [];

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

      /* The tidiest build that holds all five systems: the one that throws
         away the least of the sunlight it makes. A build that holds
         everything and spills half its power is a build the game should not
         be pointing a player at. */
      if (earned >= GOALS_TO_EARN) {
        const generated = played.log.reduce((sum, record) => sum + record.powerGenerated, 0);
        const spilled = played.log.reduce((sum, record) => sum + record.powerWasted, 0);
        const share = generated === 0 ? 0 : spilled / generated;

        if (share < cleanSpill) {
          cleanSpill = share;
          cleanBuild = [...build];
        }
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
    cleanSpill,
    cleanBuild,
  });
}

console.log(`\nThe balance check — ${SEEDS.length} seeds, beam ${BEAM}, ${WIN_SOL} sols\n`);
console.log('site              builds   win rate   systems held   spilled   best build');

for (const report of reports) {
  console.log(
    `${report.name.padEnd(17)} ${String(report.builds).padStart(5)}   ` +
      `${(report.winRate * 100).toFixed(1).padStart(5)}%   ` +
      `${`${report.bestGoals}/${GOALS_TO_EARN}`.padStart(10)}   ` +
      `${(report.cleanSpill * 100).toFixed(1).padStart(5)}%   ` +
      `${report.bestBuild.join(', ') || '(none)'}`,
  );
}

const choiceShare = economy.sols === 0 ? 0 : economy.choices / economy.sols;
const blindShare = economy.sols === 0 ? 0 : economy.blind / economy.sols;
const worstSpill = reports.reduce(
  (worst, report) => Math.max(worst, report.cleanSpill),
  0,
);

console.log(
  `\nThe economy: ${(choiceShare * 100).toFixed(1)}% of sols offered a real choice, ` +
    `${(blindShare * 100).toFixed(1)}% offered only the free job with a healthy bank, ` +
    `and the tidiest full build spills ${(worstSpill * 100).toFixed(1)}% of its sunlight.\n`,
);

const problems: string[] = [];

for (const report of reports) {
  if (report.winRate < MIN_WIN_RATE) {
    problems.push(
      `${report.name}: only ${(report.winRate * 100).toFixed(1)}% of builds can win a run (the bar is ${(MIN_WIN_RATE * 100).toFixed(0)}%)`,
    );
  }

  if (report.winRate > MAX_WIN_RATE) {
    problems.push(
      `${report.name}: ${(report.winRate * 100).toFixed(1)}% of builds can win a run, which is too easy to teach anything (the ceiling is ${(MAX_WIN_RATE * 100).toFixed(0)}%)`,
    );
  }

  if (report.bestGoals < GOALS_TO_EARN) {
    problems.push(
      `${report.name}: no build can hold all ${GOALS_TO_EARN} systems (the best holds ${report.bestGoals}). The best build was: ${report.bestBuild.join(', ') || '(none)'}`,
    );
  }
}

if (choiceShare < MIN_CHOICE_SHARE) {
  problems.push(
    `only ${(choiceShare * 100).toFixed(1)}% of sols offered more than one affordable job (the bar is ${(MIN_CHOICE_SHARE * 100).toFixed(0)}%): the power economy is taking the choice away`,
  );
}

if (blindShare > MAX_BLIND_SHARE) {
  problems.push(
    `${(blindShare * 100).toFixed(1)}% of sols offered nothing but the free job while the batteries were still healthy (the ceiling is ${(MAX_BLIND_SHARE * 100).toFixed(0)}%)`,
  );
}

if (worstSpill > MAX_SPILL_SHARE) {
  problems.push(
    `no build holds all ${GOALS_TO_EARN} systems without throwing away more than ${(MAX_SPILL_SHARE * 100).toFixed(0)}% of the sunlight it makes (the tidiest throws away ${(worstSpill * 100).toFixed(1)}%): the arrays are decoration`,
  );
}

console.log('');

if (problems.length > 0) {
  console.error('FAIL — the game is not playable as it stands:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exitCode = 1;
} else {
  const mean = reports.reduce((sum, report) => sum + report.winRate, 0) / Math.max(1, reports.length);

  console.log(
    `PASS — every site can hold all ${GOALS_TO_EARN} systems, ${(mean * 100).toFixed(1)}% of builds can win on average, ` +
      `and ${(choiceShare * 100).toFixed(1)}% of sols offered a real choice.`,
  );
}
