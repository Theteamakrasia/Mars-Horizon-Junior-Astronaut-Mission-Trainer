import { describe, expect, it } from 'vitest';

import { newRun, withState, type RunState } from './run';
import {
  TRAINING_DAILY_LIMIT,
  TRAINING_GAMES,
  TRAINING_REWARDS,
  canStartTraining,
  completeTraining,
  emptyTraining,
  makeRandom,
  trainingDay,
  trainingDayFor,
  trainingDayRecord,
  trainingSeed,
  trainingTier,
  trainingUnlocked,
  withTrainingDay,
  EMPTY_TRAINING_RECORD,
} from './training';

/*
 * The daily rule, and the eight acceptance cases it has to hold.
 *
 * The rule is the one thing in the training system a player can lose to, so
 * it is tested here rather than in a screen: two games a sol, each game
 * once a sol, the points landing on the science score, and the day's
 * progress starting again on a new sol.
 */

/** A run with the outpost built, on the sol before the first. */
function aRun(): RunState {
  return withState(newRun('jezero', 'Tester'), { modules: ['habitat', 'life-support', 'solar-array', 'batteries'] });
}

/** Finish a game the way the screen does. */
function finish(run: RunState, gameId: (typeof TRAINING_GAMES)[number]['id'], performance: 'basic' | 'good' | 'excellent' = 'good'): RunState {
  const outcome = completeTraining(run, gameId, performance);

  expect(outcome.ok).toBe(true);

  return outcome.run;
}

describe('a new sol', () => {
  it('starts with nothing done and the tasks locked', () => {
    const day = trainingDay(aRun());

    expect(day.completedCount).toBe(0);
    expect(day.tasksUnlocked).toBe(false);
    expect(day.pointsToday).toBe(0);
    expect(day.remaining).toBe(TRAINING_DAILY_LIMIT);
  });

  it('offers all six games', () => {
    const day = trainingDay(aRun());

    expect(TRAINING_GAMES).toHaveLength(6);
    expect(day.games).toHaveLength(6);
    expect(day.games.every((game) => game.status === 'available')).toBe(true);
  });

  it('says which sol it is on', () => {
    expect(trainingDay(aRun()).sol).toBe(1);
  });
});

describe('finishing a game', () => {
  it('pays the points onto the science score', () => {
    const run = finish(aRun(), 'resource-merge', 'good');

    expect(run.science).toBe(TRAINING_REWARDS.good);
  });

  it('counts as one of the two', () => {
    const day = trainingDay(finish(aRun(), 'resource-merge'));

    expect(day.completedCount).toBe(1);
    expect(day.tasksUnlocked).toBe(false);
  });

  it('unlocks the tasks on the second game', () => {
    const day = trainingDay(finish(finish(aRun(), 'resource-merge'), 'memory-match'));

    expect(day.completedCount).toBe(2);
    expect(day.tasksUnlocked).toBe(true);
  });

  it('marks the game it finished and no other', () => {
    const day = trainingDay(finish(aRun(), 'resource-merge'));

    expect(day.games.find((game) => game.id === 'resource-merge')?.status).toBe('completed');
    expect(day.games.find((game) => game.id === 'memory-match')?.status).toBe('available');
  });

  it('counts the points of the day', () => {
    const day = trainingDay(finish(finish(aRun(), 'resource-merge', 'good'), 'memory-match', 'excellent'));

    expect(day.pointsToday).toBe(TRAINING_REWARDS.good + TRAINING_REWARDS.excellent);
  });
});

describe('the daily limit', () => {
  it('refuses a third game and says why', () => {
    const run = finish(finish(aRun(), 'resource-merge'), 'memory-match');
    const start = canStartTraining(run, 'rover-parking');

    expect(start.ok).toBe(false);
    expect(start.ok === false && start.reason).toBe('limit');
    expect(start.ok === false && start.message).toContain('next sol');
  });

  it('refuses to pay for a third game', () => {
    const run = finish(finish(aRun(), 'resource-merge'), 'memory-match');
    const outcome = completeTraining(run, 'rover-parking', 'excellent');

    expect(outcome.ok).toBe(false);
    expect(outcome.run.science).toBe(run.science);
  });

  it('locks every game once the two are done', () => {
    const run = finish(finish(aRun(), 'resource-merge'), 'memory-match');
    const day = trainingDay(run);

    expect(day.games.filter((game) => game.status === 'completed')).toHaveLength(2);
    expect(day.games.filter((game) => game.status === 'locked')).toHaveLength(4);
  });
});

describe('playing the same game twice', () => {
  it('can be played again, for practice', () => {
    const run = finish(aRun(), 'resource-merge');

    expect(canStartTraining(run, 'resource-merge').ok).toBe(true);
  });

  it('pays nothing the second time', () => {
    const run = finish(aRun(), 'resource-merge', 'excellent');
    const outcome = completeTraining(run, 'resource-merge', 'excellent');

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.reason).toBe('already');
    expect(outcome.run.science).toBe(run.science);
    expect(trainingDay(outcome.run).completedCount).toBe(1);
  });
});

describe('a game that was walked away from', () => {
  it('is not counted and pays nothing', () => {
    const run = aRun();
    const start = canStartTraining(run, 'cargo-sorting');

    expect(start.ok).toBe(true);
    expect(trainingDay(run).completedCount).toBe(0);
    expect(run.science).toBe(0);
  });
});

describe('a new sol', () => {
  it('starts the training again', () => {
    const played = finish(finish(aRun(), 'resource-merge'), 'memory-match');
    const next = withState(played, { sol: 1 });
    const day = trainingDay(next);

    expect(day.sol).toBe(2);
    expect(day.completedCount).toBe(0);
    expect(day.pointsToday).toBe(0);
    expect(day.tasksUnlocked).toBe(false);
    expect(day.games.every((game) => game.status === 'available')).toBe(true);
  });

  it('does not take the points away', () => {
    const played = finish(finish(aRun(), 'resource-merge'), 'memory-match');
    const next = withState(played, { sol: 1 });

    expect(next.science).toBe(played.science);
  });

  it('happens once, however often the day is read', () => {
    const played = finish(aRun(), 'resource-merge');
    const next = withState(played, { sol: 1 });

    expect(trainingDay(next).completedCount).toBe(0);
    expect(trainingDay(next).completedCount).toBe(0);
    expect(next.training.completed).toHaveLength(1);
  });
});

describe('the points', () => {
  it('are worth more the better the game went', () => {
    expect(TRAINING_REWARDS.excellent).toBeGreaterThan(TRAINING_REWARDS.good);
    expect(TRAINING_REWARDS.good).toBeGreaterThan(TRAINING_REWARDS.basic);
  });

  it('fall back to the smallest band for a stray value', () => {
    expect(trainingTier('excellent')).toBe('excellent');
    expect(trainingTier('good')).toBe('good');
    expect(trainingTier('nonsense')).toBe('basic');
  });

  it('are not worth enough to climb the rank ladder on their own', () => {
    /* The science rank ladder tops out at fifty, and a run is twelve sols. */
    const wholeRun = TRAINING_DAILY_LIMIT * 12 * TRAINING_REWARDS.excellent;

    expect(wholeRun).toBeLessThan(100);
  });
});

describe('the day as it is written down', () => {
  it('keeps a sol and gives it back', () => {
    const run = finish(aRun(), 'solar-power-up');
    const record = withTrainingDay(EMPTY_TRAINING_RECORD, 1, trainingDayRecord(run.training));
    const day = trainingDayFor(record, 1);

    expect(day?.completed).toHaveLength(1);
    expect(day?.pointsToday).toBe(TRAINING_REWARDS.good);
  });

  it('has nothing for a sol that was never played', () => {
    expect(trainingDayFor(EMPTY_TRAINING_RECORD, 4)).toBeNull();
  });
});

describe('the generator', () => {
  it('gives the same numbers for the same seed', () => {
    const first = makeRandom(trainingSeed(3, 'memory-match'));
    const second = makeRandom(trainingSeed(3, 'memory-match'));

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('gives different numbers for different games', () => {
    const first = makeRandom(trainingSeed(3, 'memory-match'));
    const second = makeRandom(trainingSeed(3, 'cargo-sorting'));

    expect(first()).not.toBe(second());
  });

  it('stays inside zero and one', () => {
    const random = makeRandom(trainingSeed(1, 'rover-parking'));

    for (let index = 0; index < 200; index += 1) {
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('the lock', () => {
  it('is on until two games are finished', () => {
    const run = aRun();

    expect(trainingUnlocked(run)).toBe(false);
    expect(trainingUnlocked(finish(run, 'resource-merge'))).toBe(false);
    expect(trainingUnlocked(finish(finish(run, 'resource-merge'), 'memory-match'))).toBe(true);
  });
});

describe('an empty day', () => {
  it('knows which sol it belongs to', () => {
    expect(emptyTraining(4)).toEqual({ sol: 4, completed: [], pointsToday: 0 });
  });
});
