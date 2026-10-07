import { describe, expect, it } from 'vitest';

import {
  FLASH_FALL_PCT,
  FLASH_RISE_PCT,
  FLASH_TIMES,
  PRESS_SHOT,
  SHOTS,
  TITLE,
  TITLE_DURATION_MS,
  TITLE_FADE_MS,
  TOTAL_DURATION_MS,
  VIDEO_DESCRIPTION,
  VIDEO_DURATION_MS,
} from './model';

/**
 * Every input is a literal. Nothing here reads the clock or Math.random, so this
 * file cannot flake, which is the defect recorded as ISS-015.
 */

describe('SHOTS', () => {
  it('is two shots, in order', () => {
    expect(SHOTS).toHaveLength(2);
    expect(SHOTS.map((shot) => shot.index)).toEqual([1, 2]);
  });

  it('uses each image exactly once', () => {
    const images = SHOTS.map((shot) => shot.image);
    expect(new Set(images).size).toBe(images.length);
    expect(images).toEqual(['press', 'walk']);
  });

  it('gives every shot a positive duration and a fade', () => {
    for (const shot of SHOTS) {
      expect(shot.durationMs).toBeGreaterThan(0);
      expect(shot.fadeMs).toBeGreaterThan(0);
    }
  });

  it('leaves time on screen after each dissolve, or the picture never appears', () => {
    // A shot whose whole duration is its fade would never be seen. That is a real
    // possibility when the two numbers are edited independently.
    for (const shot of SHOTS) {
      expect(shot.fadeMs).toBeLessThan(shot.durationMs);
    }
  });

  it('describes every picture, for anyone who cannot see it', () => {
    // Supply's frames are hidden from assistive technology as decoration. These two
    // are the content of the scene, so an empty alt would leave a screen-reader
    // user with nothing at all.
    for (const shot of SHOTS) {
      expect(shot.alt.trim().length).toBeGreaterThan(60);
    }
  });

  it('does not repeat one description across both shots', () => {
    expect(SHOTS[0].alt).not.toBe(SHOTS[1].alt);
  });

  it('gives every shot a complete camera move', () => {
    for (const shot of SHOTS) {
      expect(shot.camera.from).toMatch(/^scale\(/);
      expect(shot.camera.to).toMatch(/^scale\(/);
      expect(shot.camera.origin).toMatch(/^\d+% \d+%$/);
    }
  });

  it('moves the camera by more than a rounding error', () => {
    // A move that starts and ends in the same place is a still with extra steps.
    for (const shot of SHOTS) {
      expect(shot.camera.from).not.toBe(shot.camera.to);
    }
  });

  it('marks only the shot that has a press in it', () => {
    expect(SHOTS.filter((shot) => shot.hasPress === true)).toHaveLength(1);
    expect(PRESS_SHOT.hasPress).toBe(true);
  });
});

describe('the walk camera', () => {
  it('drifts left and down onto the crew, which means the image moves right and up', () => {
    // The camera goes from the rocket at (63%, 47%) to the crew at (35%, 76%).
    // A camera moving left and down pushes the image right and up, so both
    // translate percentages climb. If this ever inverts, the pan runs backwards.
    const to = SHOTS[1].camera.to;
    const [, x, y] = to.match(/translate\(([-\d.]+)%,\s*([-\d.]+)%\)/) ?? [];

    expect(Number(x)).toBeGreaterThan(0);
    expect(Number(y)).toBeLessThan(0);
  });
});

describe('the film', () => {
  it('is the rendered launch video', () => {
    // 150 frames at 30fps. The hand-off timer is derived from this, so a
    // re-render at a different length has to update it.
    expect(VIDEO_DURATION_MS).toBe(5000);
  });

  it('describes the film for anyone who cannot see it', () => {
    // The film is the content of the scene, so an empty description would leave
    // a screen-reader user with nothing at all.
    expect(VIDEO_DESCRIPTION.trim().length).toBeGreaterThan(60);
  });
});

describe('TOTAL_DURATION_MS', () => {
  it('is the title, every shot and the film', () => {
    const shots = SHOTS.reduce((total, shot) => total + shot.durationMs, 0);
    expect(TOTAL_DURATION_MS).toBe(TITLE_DURATION_MS + shots + VIDEO_DURATION_MS);
  });

  it('lands near the ten seconds the sequence was specified at', () => {
    // Guards against a shot being added and the runtime quietly doubling. It is the
    // only exit off this screen, so its length is a promise to the player.
    expect(TOTAL_DURATION_MS).toBeGreaterThan(9000);
    expect(TOTAL_DURATION_MS).toBeLessThan(12000);
  });

  it('holds every shot long enough to read with nothing moving', () => {
    /*
     * Reduced motion uses the same durations, holding each shot still, so a
     * motion-sensitive player sees both pictures and the title for exactly as long
     * as everyone else. That only works if a still frame is long enough to take in
     * on its own - a shot paced for a moving camera can be far too brief when the
     * movement is what was carrying the eye.
     */
    for (const shot of SHOTS) {
      const visible = shot.durationMs - shot.fadeMs;
      expect(visible).toBeGreaterThan(1200);
    }
  });
});

describe('the title card', () => {
  it('says the mission begins', () => {
    expect(TITLE).toBe('THE MISSION BEGINS');
  });

  it('is long enough to read', () => {
    // 900ms with 200ms in and 200ms out leaves 500ms of actual visibility. For
    // seventeen characters that is about right for a title card, not for a sentence.
    expect(TITLE_DURATION_MS - TITLE_FADE_MS * 2).toBeGreaterThan(300);
    expect(TITLE.length).toBeLessThan(30);
  });
});

describe('the camera flashes', () => {
  it('fires three times', () => {
    expect(FLASH_TIMES).toHaveLength(3);
  });

  it('never fires more than three times per second', () => {
    /*
     * WCAG 2.3.1 puts the limit at three flashes a second. This is a children's
     * game, so it is not a nice-to-have: assert it, so a fourth flash or a tighter
     * spacing fails the build instead of shipping.
     */
    const shotLength = PRESS_SHOT.durationMs;
    const gaps: number[] = [];

    for (let i = 1; i < FLASH_TIMES.length; i++) {
      gaps.push(((FLASH_TIMES[i] - FLASH_TIMES[i - 1]) / 100) * shotLength);
    }

    // Every gap must be at least a third of a second, which caps the rate at 3/s.
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(1000 / 3);
    }
  });

  it('fires in ascending order, all inside the shot', () => {
    expect([...FLASH_TIMES].sort((a, b) => a - b)).toEqual([...FLASH_TIMES]);
    for (const at of FLASH_TIMES) {
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(100);
    }
  });

  it('does not overlap its own flashes', () => {
    // Two flashes whose rises and falls overlap read as one long smear rather
    // than as separate pops.
    for (let i = 1; i < FLASH_TIMES.length; i++) {
      const span = FLASH_RISE_PCT + FLASH_FALL_PCT;
      expect(FLASH_TIMES[i] - FLASH_TIMES[i - 1]).toBeGreaterThan(span);
    }
  });

  it('finishes each flash before the shot does', () => {
    const lastEnd = FLASH_TIMES[FLASH_TIMES.length - 1] + FLASH_RISE_PCT + FLASH_FALL_PCT;
    expect(lastEnd).toBeLessThan(100);
  });
});
