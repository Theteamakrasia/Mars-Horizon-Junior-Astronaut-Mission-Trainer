import { describe, expect, it } from 'vitest';

import { formatSigned, formatStore, eventsOn } from './model';

describe('formatSigned', () => {
  it('formats positive values with a plus sign', () => {
    expect(formatSigned(45)).toBe('+45');
    expect(formatSigned(0)).toBe('+0');
  });

  it('formats negative values with a minus sign', () => {
    expect(formatSigned(-30)).toBe('-30');
    expect(formatSigned(-1)).toBe('-1');
  });
});

describe('formatStore', () => {
  it('formats stores as whole percents', () => {
    expect(formatStore(46)).toBe('46%');
    expect(formatStore(0)).toBe('0%');
    expect(formatStore(100)).toBe('100%');
  });
});

describe('eventsOn', () => {
  it('returns the storm warning on sol 2', () => {
    const events = eventsOn(2);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('storm-warning');
    expect(events[0].approximate).toBe(true);
  });

  it('returns the storm on sol 5', () => {
    const events = eventsOn(5);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('storm');
  });

  it('returns an empty array for a sol with no events', () => {
    expect(eventsOn(1)).toEqual([]);
  });

  it('every returned event is approximate', () => {
    for (const event of eventsOn(10)) {
      expect(event.approximate).toBe(true);
    }
  });
});
