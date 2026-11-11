import { describe, expect, it } from 'vitest';

import { SCIENCE_GOALS } from './goals';
import { STANDING_ORDERS, orderById, ordersForSol, ordersThrough } from './standingOrders';
import { SCIENCE_TOPICS } from './topics';

/*
 * The standing orders are the rule book, and they are also the curriculum: the
 * twenty-four of them are the five learning goals, in the order the player
 * meets them. These tests hold that together.
 */
describe('the standing orders', () => {
  it('posts two orders every sol', () => {
    expect(STANDING_ORDERS).toHaveLength(24);

    for (let sol = 1; sol <= 12; sol += 1) {
      expect(ordersForSol(sol)).toHaveLength(2);
    }
  });

  it('has a unique id for every order', () => {
    const ids = STANDING_ORDERS.map((order) => order.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('says something for every order, in one short sentence', () => {
    for (const order of STANDING_ORDERS) {
      expect(order.text.length).toBeGreaterThan(15);
      expect(order.text.length).toBeLessThan(90);
      expect(order.text.endsWith('.')).toBe(true);
    }
  });

  it('covers all five goals', () => {
    const goals = new Set(STANDING_ORDERS.map((order) => order.goal));

    expect(goals.size).toBe(SCIENCE_GOALS.length);

    for (const goal of SCIENCE_GOALS) {
      expect(goals.has(goal.id)).toBe(true);
    }
  });

  it('files every order under a topic that has a NASA fact to go with it', () => {
    for (const order of STANDING_ORDERS) {
      expect(SCIENCE_TOPICS).toContain(order.topic);
    }
  });

  it('keeps the board growing, and stops at the whole set', () => {
    expect(ordersThrough(0)).toHaveLength(0);
    expect(ordersThrough(1)).toHaveLength(2);
    expect(ordersThrough(6)).toHaveLength(12);
    expect(ordersThrough(12)).toHaveLength(24);
    expect(ordersThrough(99)).toHaveLength(24);
  });

  it('is found by id', () => {
    expect(orderById('dust-fold')?.goal).toBe('dust-storm');
    expect(orderById('nothing-like-this')).toBeNull();
  });
});
