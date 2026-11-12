import { describe, expect, it } from 'vitest';

import {
  BEATS,
  BLACK_BEAT,
  CAPTION_FADE_MS,
  FLASH_FROM_MS,
  FLASH_MS,
  SKIP_DESCRIPTION,
  SKIP_LABEL,
  TOTAL_DURATION_MS,
  cameraTransformAt,
  captionBeatAt,
  captionOpacityAt,
  easeInOut,
  flashOpacityAt,
  hazeOpacityAt,
  imageBeatAt,
  imageOpacityAt,
  shakeAt,
  swayAt,
  type Beat,
} from './model';

/**
 * Every input is a literal. Nothing here reads the clock or Math.random, so
 * this file cannot flake.
 */

const PICTURE_BEATS = BEATS.filter((beat) => beat.image !== null);

describe('the film', () => {
  it('is the five supplied frames and one black beat, in order', () => {
    expect(BEATS.map((beat) => beat.id)).toEqual([
      'approach',
      'black',
      'chuteFar',
      'chuteMid',
      'chuteNear',
      'landing',
    ]);
  });

  it('shows the frames in the order they were supplied', () => {
    // 02, then 03, 04, 05, 06. The black beat holds no picture at all.
    expect(PICTURE_BEATS.map((beat) => beat.image)).toEqual([
      'approach',
      'chuteFar',
      'chuteMid',
      'chuteNear',
      'chuteLanding',
    ]);
  });

  it('puts the black beat between the approach and the descent', () => {
    const approach = BEATS[0] as Beat;
    const black = BEATS[1] as Beat;
    const chute = BEATS[2] as Beat;

    expect(approach.endMs).toBeLessThanOrEqual(black.startMs);
    expect(black.endMs).toBeLessThanOrEqual(chute.startMs);
  });

  it('gives every picture a positive fade and a camera move', () => {
    for (const beat of PICTURE_BEATS) {
      expect(beat.fadeMs).toBeGreaterThan(0);
      expect(beat.camera).not.toBeNull();
      expect(beat.endMs).toBeGreaterThan(beat.startMs);
    }
  });

  it('ends with the landing frame fading out on the last beat', () => {
    const last = BEATS[BEATS.length - 1] as Beat;

    expect(last.fadeOutStartMs).not.toBeNull();
    expect((last.fadeOutStartMs ?? 0) + last.fadeOutMs).toBe(TOTAL_DURATION_MS);
  });

  it('runs for about seventeen seconds', () => {
    expect(TOTAL_DURATION_MS).toBe(17000);
  });

  it('is quick enough that nobody is waiting to skip it', () => {
    // The film used to run for half a minute. It is now a short sequence: the
    // player is on the map, and the outpost is the thing they want.
    expect(TOTAL_DURATION_MS).toBeLessThan(20000);
  });
});

describe('the camera', () => {
  it('never zooms the narrow frames past 1.12', () => {
    // 03, 04 and 05 are 1365 pixels wide. Past 1.12 they would show their
    // pixels on a large screen, and the sequence is meant to look like film.
    for (const beat of PICTURE_BEATS) {
      const camera = beat.camera;

      if (camera === null) continue;
      if (beat.image === 'approach' || beat.image === 'chuteLanding') continue;

      expect(camera.scaleTo).toBeLessThanOrEqual(1.12);
    }
  });

  it('never zooms the approach frame past 1.12 either', () => {
    const approach = BEATS[0] as Beat;

    expect(approach.camera?.scaleTo).toBeLessThanOrEqual(1.12);
  });

  it('keeps the landing frame at 1.15 or less', () => {
    const landing = BEATS[BEATS.length - 1] as Beat;

    expect(landing.camera?.scaleTo).toBeLessThanOrEqual(1.15);
  });

  it('rolls no more than a degree and a half', () => {
    for (const beat of PICTURE_BEATS) {
      const camera = beat.camera;

      if (camera === null) continue;

      expect(Math.abs(camera.rotateTo - camera.rotateFrom)).toBeLessThanOrEqual(1.5);
    }
  });

  it('starts each descent frame where the one before it ended', () => {
    // One continuous shot, split in three. A frame that restarted would jump
    // backwards at the dissolve.
    const descent = PICTURE_BEATS.slice(1);

    for (let i = 1; i < descent.length; i += 1) {
      const previous = descent[i - 1] as Beat;
      const current = descent[i] as Beat;

      expect(current.camera?.scaleFrom).toBeCloseTo(previous.camera?.scaleTo ?? 0, 5);
    }
  });

  it('grows the landing frame from the ground', () => {
    // The origin at the bottom is what makes the ground rise toward the
    // camera as the capsule comes down.
    const landing = BEATS[BEATS.length - 1] as Beat;

    expect(landing.camera?.origin).toBe('50% 100%');
  });

  it('grows the whole descent from one point, so the zoom never turns back', () => {
    /*
      The move that read as a zoom-out.

      The landing frame used to grow from the bottom of the frame while the
      chute frame before it grew from the middle, so the two disagreed about
      where the ground was and the dissolve showed the same picture at two
      different sizes. One origin for the whole descent is the fix: the ground
      stays where it is and the capsule comes down towards it.
    */
    for (const beat of PICTURE_BEATS.slice(1)) {
      expect(beat.camera?.origin).toBe('50% 100%');
    }
  });

  it('only ever grows', () => {
    for (const beat of PICTURE_BEATS) {
      const camera = beat.camera;

      if (camera === null) continue;

      expect(camera.scaleTo).toBeGreaterThanOrEqual(camera.scaleFrom);
    }
  });

  it('brings the ground up to meet the capsule on the last frame', () => {
    // The picture slides down as it grows, so the horizon moves down the frame
    // and there is more ground in it.
    const landing = BEATS[BEATS.length - 1] as Beat;

    expect(landing.camera?.translateYTo).toBeGreaterThan(0);
    expect(landing.camera?.translateYFrom).toBe(0);
  });
});
describe('easeInOut', () => {
  it('starts at the start and ends at the end', () => {
    expect(easeInOut(0)).toBeCloseTo(0, 6);
    expect(easeInOut(1)).toBeCloseTo(1, 6);
  });

  it('never goes backwards', () => {
    let previous = -1;

    for (let i = 0; i <= 20; i += 1) {
      const value = easeInOut(i / 20);

      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('holds inside the unit range', () => {
    for (let i = 0; i <= 20; i += 1) {
      const value = easeInOut(i / 20);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is the curve the game uses elsewhere', () => {
    // cubic-bezier(.22,.61,.36,1) is past halfway at the midpoint, because the
    // curve leaves slowly and arrives quickly.
    expect(easeInOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe('imageOpacityAt', () => {
  it('is nothing before the beat starts', () => {
    const approach = BEATS[0] as Beat;

    expect(imageOpacityAt(approach, 0)).toBe(0);
  });

  it('is fully there in the middle of the beat', () => {
    const approach = BEATS[0] as Beat;

    expect(imageOpacityAt(approach, 2500)).toBe(1);
  });

  it('is nothing once the picture has gone', () => {
    const approach = BEATS[0] as Beat;

    expect(imageOpacityAt(approach, 5400)).toBe(0);
  });

  it('fades in over the own fade', () => {
    const approach = BEATS[0] as Beat;

    expect(imageOpacityAt(approach, 175)).toBeCloseTo(0.5, 5);
  });

  it('leaves the picture before it fades out, so the dissolve is continuous', () => {
    // The next picture starts to arrive while this one is still there.
    const chuteFar = BEATS[2] as Beat;
    const chuteMid = BEATS[3] as Beat;

    expect(chuteMid.startMs).toBeLessThan(chuteFar.endMs);
    expect(imageOpacityAt(chuteFar, chuteMid.startMs)).toBe(1);
  });
});

describe('the black beat', () => {
  it('really is black', () => {
    // Nothing is on screen between the approach fading out and the first
    // chute picture arriving.
    const approach = BEATS[0] as Beat;
    const chuteFar = BEATS[2] as Beat;

    expect(imageOpacityAt(approach, 5400)).toBe(0);
    expect(imageOpacityAt(chuteFar, 6000)).toBe(0);
  });

  it('holds for about a second', () => {
    expect(BLACK_BEAT.endMs - BLACK_BEAT.startMs).toBeGreaterThanOrEqual(1000);
  });

  it('says what is happening', () => {
    expect(BLACK_BEAT.caption.headline).toBe('ENTRY · DESCENT · LANDING');
  });
});

describe('cameraTransformAt', () => {
  it('moves the frame between two states', () => {
    const approach = BEATS[0] as Beat;

    expect(cameraTransformAt(approach, 0)).not.toBe(cameraTransformAt(approach, 9000));
  });

  it('only ever moves, scales and rolls', () => {
    // Nothing that changes how the artwork looks. A filter would.
    const approach = BEATS[0] as Beat;

    expect(cameraTransformAt(approach, 4000)).toMatch(
      /^scale\([\d.]+\) translate\([\d.-]+%, [\d.-]+%\) rotate\([\d.-]+deg\)$/,
    );
  });

  it('says nothing for the black beat, which has no picture', () => {
    expect(cameraTransformAt(BLACK_BEAT, 6000)).toBe('none');
  });
});

describe('the caption', () => {
  it('is off before its time and on inside it', () => {
    const approach = BEATS[0] as Beat;

    expect(captionOpacityAt(approach, approach.captionFromMs - 1)).toBe(0);
    expect(captionOpacityAt(approach, 2500)).toBe(1);
    expect(captionOpacityAt(approach, approach.captionToMs + 1)).toBe(0);
  });

  it('fades in over its own time', () => {
    const approach = BEATS[0] as Beat;

    expect(captionOpacityAt(approach, approach.captionFromMs + CAPTION_FADE_MS / 2)).toBeCloseTo(
      0.5,
      5,
    );
  });

  it('knows which beat is speaking', () => {
    expect(captionBeatAt(2000)?.id).toBe('approach');
    expect(captionBeatAt(6000)?.id).toBe('black');
    expect(captionBeatAt(7500)?.id).toBe('chuteFar');
  });

  it('is off the screen between the beats', () => {
    // There is a moment between one caption and the next where nothing is
    // said, so the words never pile up.
    expect(captionBeatAt(5000)).toBeNull();
  });

  it('names the fact ids the data file has to answer for', () => {
    // The exact list the film asks for. A rename in the model fails here, and
    // the data file own test pins the other end of it.
    const ids = BEATS.flatMap((beat) => beat.caption.factIds);

    expect(ids).toEqual([
      'distance',
      'entry',
      'sol',
      'air',
      'parachute',
      'seven-minutes',
      'zone',
      'sunlight',
    ]);
  });
});

describe('the movement on top of the picture', () => {
  it('shakes the first chute frame by no more than two pixels', () => {
    const chuteFar = BEATS[2] as Beat;

    for (let t = chuteFar.startMs; t < chuteFar.endMs; t += 97) {
      const shake = shakeAt(chuteFar, t);

      expect(Math.abs(shake.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(shake.y)).toBeLessThanOrEqual(2);
    }
  });

  it('does not shake the other frames', () => {
    for (const beat of PICTURE_BEATS) {
      if (beat.id === 'chuteFar') continue;

      expect(shakeAt(beat, beat.startMs + 500)).toEqual({ x: 0, y: 0 });
    }
  });

  it('sways the landing frame by no more than six tenths of a degree', () => {
    const landing = BEATS[BEATS.length - 1] as Beat;

    for (let t = landing.startMs; t < landing.endMs; t += 113) {
      expect(Math.abs(swayAt(landing, t))).toBeLessThanOrEqual(0.6);
    }
  });

  it('sways nothing else', () => {
    for (const beat of PICTURE_BEATS) {
      if (beat.id === 'landing') continue;

      expect(swayAt(beat, beat.startMs + 500)).toBe(0);
    }
  });

  it('thickens the haze over the landing frame', () => {
    const landing = BEATS[BEATS.length - 1] as Beat;

    expect(hazeOpacityAt(landing, landing.startMs)).toBe(0);
    expect(hazeOpacityAt(landing, landing.endMs)).toBeGreaterThan(0.4);
  });

  it('puts no haze over the other frames', () => {
    const approach = BEATS[0] as Beat;

    expect(hazeOpacityAt(approach, 2500)).toBe(0);
  });

  it('flashes once, at the end of the landing', () => {
    expect(flashOpacityAt(FLASH_FROM_MS - 1)).toBe(0);
    expect(flashOpacityAt(FLASH_FROM_MS + FLASH_MS / 2)).toBeGreaterThan(0.2);
    expect(flashOpacityAt(FLASH_FROM_MS + FLASH_MS)).toBe(0);
  });

  it('flashes inside the film', () => {
    expect(FLASH_FROM_MS + FLASH_MS).toBeLessThanOrEqual(TOTAL_DURATION_MS);
  });
});

describe('imageBeatAt', () => {
  it('is the frame that owns the screen at that moment', () => {
    expect(imageBeatAt(2000)?.image).toBe('approach');
    expect(imageBeatAt(7500)?.image).toBe('chuteFar');
    expect(imageBeatAt(14500)?.image).toBe('chuteLanding');
  });

  it('is nothing before the film starts', () => {
    expect(imageBeatAt(-1)).toBeNull();
  });
});

describe('the skip button', () => {
  it('is labelled with one word, because it is a control', () => {
    expect(SKIP_LABEL).toBe('Skip');
    expect(SKIP_LABEL.length).toBeLessThanOrEqual(12);
  });

  it('says what it skips, for anyone who cannot see the label', () => {
    expect(SKIP_DESCRIPTION).toContain('landing');
    expect(SKIP_DESCRIPTION).toContain('outpost');
  });
});
