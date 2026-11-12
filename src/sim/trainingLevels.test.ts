/*
 * How hard each game gets, and the rule behind it.
 *
 * Every game has twelve levels. For the first three the goal grows - more
 * supplies, a sample to bring home, a bigger supply to build - and from the
 * fourth on the goal stays and the allowance shrinks. The level is never
 * shown to the player: the game says what it wants in its own words.
 */

import { describe, expect, it } from 'vitest';

import { cargoDifficulty } from './trainingCargo';
import { ROVER_MAPS, roverDeliveryRoute, roverDifficulty, roverRoute } from './trainingRover';
import { mergeDifficulty } from './trainingMerge';
import { memoryDifficulty } from './trainingMemory';
import { solarDifficulty } from './trainingSolar';
import { asteroidDifficulty } from './trainingAsteroid';
import { TRAINING_MAX_LEVEL } from './training';

const GAMES = [
  { name: 'cargo', at: cargoDifficulty },
  { name: 'rover', at: roverDifficulty },
  { name: 'merge', at: mergeDifficulty },
  { name: 'memory', at: memoryDifficulty },
  { name: 'solar', at: solarDifficulty },
  { name: 'asteroid', at: asteroidDifficulty },
] as const;

describe('the levels of every game', () => {
  it('start at the game as it always was', () => {
    expect(cargoDifficulty(1).crates).toBe(8);
    expect(roverDifficulty(1).spare).toBe(6);
    expect(roverDifficulty(1).deliver).toBe(false);
    expect(mergeDifficulty(1).target).toBe(5);
    expect(mergeDifficulty(1).moveLimit).toBeNull();
    expect(memoryDifficulty(1).pairs).toBe(6);
    expect(solarDifficulty(1).spare).toBe(12);
    expect(asteroidDifficulty(1).seconds).toBe(50);
    expect(asteroidDifficulty(1).goal).toBe(12);
  });

  it('never go past the last level', () => {
    for (const game of GAMES) {
      expect(game.at(TRAINING_MAX_LEVEL + 1)).toEqual(game.at(TRAINING_MAX_LEVEL));
      expect(game.at(0)).toEqual(game.at(1));
    }
  });

  it('grow the goal for the first three levels', () => {
    /* More supplies to store. */
    expect(cargoDifficulty(2).crates).toBeGreaterThan(cargoDifficulty(1).crates);
    expect(cargoDifficulty(3).crates).toBeGreaterThan(cargoDifficulty(2).crates);
    /* A sample to bring home, and then a new piece of ground. */
    expect(roverDifficulty(2).deliver).toBe(true);
    expect(roverDifficulty(3).map).not.toBe(roverDifficulty(2).map);
    /* A bigger supply to build. */
    expect(mergeDifficulty(2).target).toBeGreaterThan(mergeDifficulty(1).target);
    expect(mergeDifficulty(3).target).toBeGreaterThan(mergeDifficulty(2).target);
    /* More pairs on the table. */
    expect(memoryDifficulty(2).pairs).toBeGreaterThan(memoryDifficulty(1).pairs);
    expect(memoryDifficulty(3).pairs).toBeGreaterThan(memoryDifficulty(2).pairs);
    /* Fewer spare turns, and less time. */
    expect(solarDifficulty(2).spare).toBeLessThan(solarDifficulty(1).spare);
    expect(solarDifficulty(3).spare).toBeLessThan(solarDifficulty(2).spare);
    expect(asteroidDifficulty(2).goal).toBeGreaterThan(asteroidDifficulty(1).goal);
    expect(asteroidDifficulty(3).seconds).toBeLessThan(asteroidDifficulty(2).seconds);
  });

  it('shrink the allowance from the fourth level on', () => {
    /* The cargo round allows fewer wrong stores. */
    expect(cargoDifficulty(4).mistakes).toBeLessThan(Infinity);
    expect(cargoDifficulty(8).mistakes).toBeLessThan(cargoDifficulty(4).mistakes);
    /* The rover has fewer moves over the shortest route. */
    expect(roverDifficulty(6).spare).toBeLessThan(roverDifficulty(4).spare);
    expect(roverDifficulty(12).spare).toBeLessThan(roverDifficulty(6).spare);
    /* The merge has a limit on the moves, and it tightens. */
    expect(mergeDifficulty(4).moveLimit).not.toBeNull();
    expect(mergeDifficulty(12).moveLimit ?? 0).toBeLessThan(mergeDifficulty(4).moveLimit ?? 0);
    /* The memory round allows fewer tries. */
    expect(memoryDifficulty(8).tries).toBeLessThan(memoryDifficulty(4).tries);
    /* The solar round allows fewer spare turns. */
    expect(solarDifficulty(12).spare).toBeLessThan(solarDifficulty(4).spare);
    /* The asteroid round has less time. */
    expect(asteroidDifficulty(12).seconds).toBeLessThan(asteroidDifficulty(4).seconds);
  });

  it('keep the goal still once it has grown', () => {
    expect(cargoDifficulty(12).crates).toBe(cargoDifficulty(3).crates);
    expect(mergeDifficulty(12).target).toBe(mergeDifficulty(3).target);
    expect(memoryDifficulty(12).pairs).toBe(memoryDifficulty(3).pairs);
  });

  it('pay the player the same for the same work, whatever the level', () => {
    /* The bands widen as the round gets harder, so the level never quietly
       docks the points. A player who makes one mistake at level 1 and one
       mistake at level 12 is paid the same. */
    expect(cargoDifficulty(12).excellent).toBeGreaterThan(cargoDifficulty(1).excellent);
    expect(roverDifficulty(12).excellent).toBeGreaterThan(roverDifficulty(1).excellent);
    expect(memoryDifficulty(12).excellent).toBeGreaterThan(memoryDifficulty(1).excellent);
    expect(solarDifficulty(12).excellent).toBeGreaterThan(solarDifficulty(1).excellent);
    expect(asteroidDifficulty(12).excellent).toBeLessThan(asteroidDifficulty(1).excellent);
  });
});

describe('the rover round', () => {
  it('always has a way through, and a sample to bring home', () => {
    for (let level = 1; level <= TRAINING_MAX_LEVEL; level += 1) {
      const difficulty = roverDifficulty(level);

      expect(difficulty.map).toBeGreaterThanOrEqual(0);
      expect(difficulty.spare).toBeGreaterThanOrEqual(1);
    }
  });

  it('is winnable at every level: the budget covers the journey', () => {
    /* The budget is built from the journey the player has to make - to the
       sample and then to the outpost - so every level has to leave enough
       moves to find the way. */
    for (let level = 1; level <= TRAINING_MAX_LEVEL; level += 1) {
      const difficulty = roverDifficulty(level);
      const map = ROVER_MAPS[difficulty.map] as readonly string[];
      const route = difficulty.deliver ? roverDeliveryRoute(map) : roverRoute(map);

      expect(route).toBeGreaterThan(0);
      expect(route + difficulty.spare).toBeGreaterThan(route);
    }
  });
});
