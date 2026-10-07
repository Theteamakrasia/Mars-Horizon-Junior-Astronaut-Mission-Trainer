/**
 * The launch cinematic: two stills, five seconds, and the camera moves between them.
 *
 * Pure: no DOM, no timer, no randomness. Every test input is a literal, so this
 * file cannot flake â€” the defect recorded as ISS-015.
 *
 * Where the camera points, and why
 * -------------------------------
 * Both frames were measured by eye against the artwork, and the numbers below are
 * in the file on purpose. A camera move is only as good as the reading of the
 * picture behind it, and a reader arriving in six weeks has no way to check those
 * numbers against anything. Recording the measurements next to the values means
 * the next person can verify the framing rather than trust it.
 *
 *   press conference (1670x942)
 *     the astronaut who speaks   x  29-53%   y 30-90%   centre ~ (41%, 58%)
 *     the press                  along the bottom edge, y 74-100%
 *     therefore: push in on him, and flash from below.
 *
 *   walk to rocket (1670x942)
 *     the rocket                 x  58-68%   y 13-81%   centre ~ (63%, 47%)
 *     the four astronauts        x  12-59%   y 52-99%   centre ~ (35%, 76%)
 *     therefore: the camera travels left and down, off the rocket and onto them.
 *     In a CSS transform that means the *image* moves right and up.
 *
 * On the timings
 * --------------
 * There is no skip. The screen's only exit is the single timer in view.ts, which
 * makes the total the most load-bearing number in the feature â€” hence
 * TOTAL_DURATION_MS being derived from the shots rather than typed alongside them,
 * where the two could disagree.
 */

/** One beat of the sequence. */
export interface Shot {
  readonly id: string;
  /** Where this shot sits in the sequence. Used for CSS nth-child and nothing else. */
  readonly index: 1 | 2;
  /**
   * How long this shot holds, in milliseconds.
   *
   * A shot's fade-in is inside its own duration rather than added to it, so the
   * numbers below read as "how long you look at this" and sum to the real runtime.
   */
  readonly durationMs: number;
  /** How long the dissolve from whatever came before takes, at the start. */
  readonly fadeMs: number;
  /** The still, imported by view.ts. Keyed here so the model stays DOM-free. */
  readonly image: 'press' | 'walk';
  /**
   * What is in the picture, for anyone who cannot see it.
   *
   * Not empty and not a caption. Supply's frames are decorative backdrops and are
   * hidden from assistive technology; these two *are* the content of the scene, so
   * the description is the only version of it some players will get.
   */
  readonly alt: string;
  /** The Ken Burns move, as a CSS transform and its origin. */
  readonly camera: CameraMove;
  /** True for the one shot that has a press to flash. */
  readonly hasPress?: boolean;
}

/**
 * A slow move on a still: transform plus the point it grows from.
 *
 * Both are CSS strings rather than numbers so nothing here has to re-derive how a
 * translate composes with a scale, and so the keyframes in launch.css stay trivial.
 */
export interface CameraMove {
  readonly from: string;
  readonly to: string;
  readonly origin: string;
}

/** How long the dissolve at the head of each shot is. One value, two uses. */
export const FADE_MS = 350;

/** The black card before the mission starts. */
export const TITLE = 'THE MISSION BEGINS';

/** How long the title holds on its own, with no picture behind it. */
export const TITLE_DURATION_MS = 900;

/** When the title text fades in and out, inside TITLE_DURATION_MS. */
export const TITLE_FADE_MS = 200;

/** How long the letterbox bars take to slide in. */
export const BARS_MS = 500;

export const SHOTS: readonly Shot[] = [
  {
    id: 'press',
    index: 1,
    // 350ms dissolve in from black, then 1700ms of push-in with the flashes.
    durationMs: 2050,
    fadeMs: FADE_MS,
    image: 'press',
    alt:
      'Four astronauts in white NASA suits stand behind a bank of microphones in front of a ' +
      'crowd of press. The tallest of them stands in the middle with both arms open, speaking. ' +
      'Behind them is a large sign reading MARS MISSION, and a rocket on a launch tower stands ' +
      'to the right.',
    camera: {
      // Grows from a little wider than the frame toward the speaker at (41%, 58%).
      from: 'scale(1.04)',
      to: 'scale(1.16)',
      origin: '41% 58%',
    },
    hasPress: true,
  },
  {
    id: 'walk',
    index: 2,
    // 350ms cross-dissolve from the press, then 1950ms of pan.
    durationMs: 2300,
    fadeMs: FADE_MS,
    image: 'walk',
    alt:
      'Four astronauts seen from behind walk across the launch pad toward a rocket standing on ' +
      'its launch tower. The sky is bright blue with scattered cloud, and a building carrying a ' +
      'NASA logo and a Mars Mission poster stands to the left.',
    camera: {
      // Starts on the rocket at (63%, 47%) and drifts left and down onto the crew at
      // (35%, 76%). A camera moving left and down means the image moves right and up,
      // which is why both percentages below climb.
      from: 'scale(1.1) translate(1.5%, -1%)',
      to: 'scale(1.16) translate(5%, -4%)',
      origin: '50% 50%',
    },
  },
];

/**
 * A camera flash: white at the centre of the circle, nothing at the rim.
 *
 * A gradient rather than a flat overlay, because a flat white wash reads as the
 * screen switching off, while a soft-edged flare reads as a photograph. Radial so
 * it can be anchored on the crowd rather than fired from the middle of the screen.
 */
export const FLASH_RADIAL =
  'radial-gradient(ellipse 78% 58% at 50% 108%, rgba(255, 255, 255, 0.98) 0%, ' +
  'rgba(255, 255, 255, 0.6) 34%, rgba(255, 255, 255, 0.22) 60%, rgba(255, 255, 255, 0) 78%)';

/**
 * When each flash fires, as a percentage through the press shot.
 *
 * Fixed, and asserted to be spaced. Photosensitive players are a real group and a
 * children's game is the wrong place to gamble on it: WCAG 2.3.1 puts three flashes
 * per second at the threshold, and these land roughly 0.4s apart, so the burst
 * stays well under it. Any fourth flash, or a tighter gap, fails the test rather
 * than shipping.
 */
export const FLASH_TIMES: readonly number[] = [12, 33, 59];

/**
 * A flash's rise and fall, as a percentage of the press shot.
 *
 * Rise is the climb to full brightness, fall is the decay after it. One flash
 * therefore occupies `FLASH_RISE_PCT + FLASH_FALL_PCT` of the timeline from its
 * start, which is what the spacing test and check-markup both work from. Getting
 * that arithmetic wrong is how a hand-written keyframe ends up 9% short of where
 * the model says the flash ends - which is exactly what the first draft did.
 */
export const FLASH_RISE_PCT = 4;
export const FLASH_FALL_PCT = 9;

/** The press shot, which is the only one with a crowd in it. */
export const PRESS_SHOT = SHOTS[0];

/**
 * The whole runtime, title included.
 *
 * Derived, so it cannot drift from the shots. view.ts sets exactly one timer from
 * this number, and it is the only way off the screen.
 *
 * Note there is no separate reduced-motion duration, and that is deliberate.
 * Reduced motion removes the movement, not the information: each shot is held
 * still for exactly as long as it would have moved, so both pictures and the
 * title are seen for the same time by everyone. A shorter static hold would give
 * a motion-sensitive player less of the scene than everyone else gets, which is
 * the opposite of what the accommodation is for. An earlier version had a
 * REDUCED_MOTION_MS constant for exactly that and a test failed on it.
 */
export const TOTAL_DURATION_MS =
  TITLE_DURATION_MS + SHOTS.reduce((total, shot) => total + shot.durationMs, 0);