import { describe, expect, it } from 'vitest';

import { makeRandom } from './training';
import {
  CARGO_BOXES,
  CARGO_EXCELLENT_MISTAKES,
  CARGO_GOOD_MISTAKES,
  CARGO_ITEMS,
  CARGO_ROUND,
  cargoPerformance,
  dealCargoRound,
} from './trainingCargo';

/*
 * A round with an empty store would teach the player that some stores do
 * not matter, so every store gets at least one crate.
 */

describe('a round of supplies', () => {
  it('has the right number of crates', () => {
    const round = dealCargoRound(makeRandom(1));

    expect(round.items).toHaveLength(CARGO_ROUND);
  });

  it('puts at least one crate in every store', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const round = dealCargoRound(makeRandom(seed));

      for (const box of CARGO_BOXES) {
        expect(round.items.filter((item) => item.box === box.id).length).toBeGreaterThan(0);
      }
    }
  });

  it('never deals the same crate twice', () => {
    const round = dealCargoRound(makeRandom(2));
    const ids = round.items.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only deals crates that belong to a store', () => {
    const round = dealCargoRound(makeRandom(3));

    for (const item of round.items) {
      expect(CARGO_BOXES.some((box) => box.id === item.box)).toBe(true);
    }
  });

  it('deals the same round for the same seed', () => {
    const first = dealCargoRound(makeRandom(8));
    const second = dealCargoRound(makeRandom(8));

    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
  });

  it('has a store for every crate in the catalogue', () => {
    for (const item of CARGO_ITEMS) {
      expect(CARGO_BOXES.some((box) => box.id === item.box)).toBe(true);
    }
  });
});

describe('the band a finished round falls into', () => {
  it('is excellent with no mistakes', () => {
    expect(cargoPerformance(CARGO_EXCELLENT_MISTAKES)).toBe('excellent');
  });

  it('is good with a couple', () => {
    expect(cargoPerformance(CARGO_EXCELLENT_MISTAKES + 1)).toBe('good');
    expect(cargoPerformance(CARGO_GOOD_MISTAKES)).toBe('good');
  });

  it('is basic for more than that', () => {
    expect(cargoPerformance(CARGO_GOOD_MISTAKES + 1)).toBe('basic');
  });
});
