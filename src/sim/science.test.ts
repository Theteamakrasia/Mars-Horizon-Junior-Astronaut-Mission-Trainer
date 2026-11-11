import { describe, expect, it } from 'vitest';

import { rankFor, rankProgress, SCIENCE_RANKS, SOL_LOG_POINTS } from './science';

describe('the science score', () => {
  it('starts every player at the bottom rank', () => {
    expect(rankFor(0).id).toBe('explorer');
  });

  it('keeps the bands in order, with a gap between each of them', () => {
    for (let index = 1; index < SCIENCE_RANKS.length; index += 1) {
      const band = SCIENCE_RANKS[index];
      const below = SCIENCE_RANKS[index - 1];

      expect(band?.min).toBeGreaterThan(below?.min ?? 0);
    }
  });

  it('promotes only once the score reaches the next band', () => {
    for (const band of SCIENCE_RANKS.slice(1)) {
      expect(rankFor(band.min - 1).id).not.toBe(band.id);
      expect(rankFor(band.min).id).toBe(band.id);
    }
  });

  it('treats a broken score as no score at all', () => {
    expect(rankFor(Number.NaN).id).toBe('explorer');
    expect(rankFor(-5).id).toBe('explorer');
    expect(rankFor(Number.POSITIVE_INFINITY).id).toBe('explorer');
  });

  it('shows the road to the next rank', () => {
    const progress = rankProgress(0);

    expect(progress.current.id).toBe('explorer');
    expect(progress.next?.id).toBe('field-scientist');
    expect(progress.toNext).toBe(14);
    expect(progress.percent).toBe(0);
  });

  it('fills the band as the score rises, and starts again at the next one', () => {
    expect(rankProgress(7).percent).toBe(50);
    expect(rankProgress(14).current.id).toBe('field-scientist');
    expect(rankProgress(14).percent).toBe(0);
  });

  it('leaves a run that chose nothing on the bottom rung', () => {
    /* Twelve day-log points and nothing else: still an Explorer. */
    expect(rankFor(12).id).toBe('explorer');
  });

  it('leaves the top rung reachable by a good run', () => {
    /* The best possible run: the best activity on each calm sol, plus the
       day logs, scores 52. */
    expect(rankFor(52).id).toBe('chief-scientist');
    expect(rankFor(49).id).toBe('senior-scientist');
  });

  it('stops at the top rank instead of running off the end', () => {
    const top = rankProgress(1000);

    expect(top.current.id).toBe('chief-scientist');
    expect(top.next).toBeNull();
    expect(top.percent).toBe(100);
    expect(top.toNext).toBe(0);
  });

  it('never hands the screen a NaN to draw', () => {
    for (const points of [-1, 0, 5, 12, 14, 27, 28, 40, 41, 49, 50, 999]) {
      expect(Number.isNaN(rankProgress(points).percent)).toBe(false);
      expect(Number.isNaN(rankProgress(points).toNext)).toBe(false);
    }
  });

  it('gives one point for the sol log, so a day never scores nothing', () => {
    expect(SOL_LOG_POINTS).toBe(1);
  });
});
