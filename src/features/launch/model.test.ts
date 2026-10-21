import { describe, expect, it } from 'vitest';

import {
  DOCKING_DESCRIPTION,
  DOCKING_DURATION_MS,
  FLASH_FALL_PCT,
  FLASH_RISE_PCT,
  FLASH_TIMES,
  PARTS_DESCRIPTION,
  PARTS,
  PRESS_SHOT,
  resolveBeatStart,
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

describe('the clips that follow the film', () => {
  it('matches the rendered docking clip frame-for-frame', () => {
    // 90 frames at 30fps. The timer is derived from this, so a re-render at a
    // different length has to update it.
    expect(DOCKING_DURATION_MS).toBe(3000);
  });

  it('describes the docking clip for anyone who cannot see it', () => {
    // The clip is content, so an empty description would leave a screen-reader
    // user with nothing at all.
    expect(DOCKING_DESCRIPTION.trim().length).toBeGreaterThan(60);
  });

  it('describes the parts tour for anyone who cannot see it', () => {
    expect(PARTS_DESCRIPTION.trim().length).toBeGreaterThan(60);
  });

  it('names all four parts in the tour description', () => {
    for (const part of ['propulsion', 'habitat', 'logistics', 'Orion']) {
      expect(PARTS_DESCRIPTION).toContain(part);
    }
  });
});

describe('TOTAL_DURATION_MS', () => {
  it('is the title, every shot and both films', () => {
    const shots = SHOTS.reduce((total, shot) => total + shot.durationMs, 0);
    expect(TOTAL_DURATION_MS).toBe(
      TITLE_DURATION_MS + shots + VIDEO_DURATION_MS + DOCKING_DURATION_MS,
    );
  });

  it('stays under half a minute, which is the promise to the player', () => {
    // There is no skip, and two films plus the stills is already a long sit.
    expect(TOTAL_DURATION_MS).toBeGreaterThan(5000);
    expect(TOTAL_DURATION_MS).toBeLessThan(30000);
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

describe('PARTS', () => {
  it('is five slides: overview then one part at a time', () => {
    expect(PARTS).toHaveLength(5);
    expect(PARTS.map((part) => part.id)).toEqual([
      'overview',
      'propulsion',
      'habitat',
      'logistics',
      'orion',
    ]);
  });

  it('gives every part a name, description and accent colour', () => {
    for (const part of PARTS) {
      expect(part.name.trim().length).toBeGreaterThan(0);
      expect(part.description.trim().length).toBeGreaterThan(10);
      expect(part.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('names all four spacecraft parts plus the overview', () => {
    const names = PARTS.map((part) => part.name.toLowerCase());
    expect(names).toContain('assembled craft');
    expect(names.some((name) => name.includes('propulsion'))).toBe(true);
    expect(names.some((name) => name.includes('habitat'))).toBe(true);
    expect(names.some((name) => name.includes('logistics'))).toBe(true);
    expect(names.some((name) => name.includes('orion'))).toBe(true);
  });
});

describe('resolveBeatStart', () => {
  it('starts on its slot when the clip is ready early', () => {
    // A clip buffered before its beat is due does not hold the reel up.
    expect(resolveBeatStart(5000, 1000)).toBe(5000);
  });

  it('waits for the clip when it becomes ready late', () => {
    // The beat cannot start before there is a frame to show.
    expect(resolveBeatStart(5000, 8000)).toBe(8000);
  });

  it('starts on its slot when readiness is not yet known', () => {
    // Before the clip signals, the earliest slot is all the caller has.
    expect(resolveBeatStart(5000, null)).toBe(5000);
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
