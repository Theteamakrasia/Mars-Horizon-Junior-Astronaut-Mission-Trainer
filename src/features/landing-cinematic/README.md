# `landing-cinematic/` — the landing sequence

**Built.** The film that plays between the landing-site map and the outpost: the
approach to Mars, a black beat, the parachute coming down closer and closer, and
the landing. Then the outpost, which is where the player has been going the
whole time.

See `../README.md` for the layout rules and
[`../../../docs/architecture.md`](../../../docs/architecture.md) for the whole picture.

## What the screen does

The player has just chosen a landing site and pressed **Land here**. The map
fades to black, the film plays, and the outpost arrives out of the dark.

The film is **seventeen seconds** long and is built from five supplied frames,
played as one shot rather than five cuts:

| beat | what is on screen |
| --- | --- |
| the approach | the spacecraft flying toward Mars, the sun flaring at the edge of the frame |
| the black beat | nothing but one fact, and the words `ENTRY · DESCENT · LANDING` |
| the descent | the parachute, three times, each closer than the one before |
| the landing | the capsule over the ground, the dust thickening, and the flash of touchdown |

The region the player chose is on the screen throughout: its name on the
approach, its own NASA fact on the landing.

**One way down.** Every frame of the descent grows from the **bottom** of the
frame, and the scale only ever rises (1.00 → 1.06 → 1.08 → 1.10 → 1.15), so the
ground stays where it is while the capsule comes down towards it. The landing
frame used to grow from a different point than the frame before it, and the
dissolve read as the camera pulling back — one origin for the whole descent is
the fix (D-085).

## What `model.ts` must contain

**The whole timeline, in one object.** Every number the film uses is here —
the beats, their times, the camera moves, the captions and the fact ids — and
nothing is typed twice. The file is pure: no DOM, no clock, no randomness, so
the film can be tested without a browser.

The pure helpers in it are what the view reads every frame: `imageOpacityAt`,
`cameraTransformAt`, `shakeAt`, `swayAt`, `hazeOpacityAt`, `flashOpacityAt` and
`captionOpacityAt`. The camera is interpolated rather than keyframed, so the
easing (`cubic-bezier(.22, .61, .36, 1)`) is worked out in arithmetic and can
be tested.

## What `view.ts` must contain

**One clock.** A single `requestAnimationFrame` loop and one number — the
milliseconds of film that have been played — and everything on screen is written
from that one moment. Nothing is animated by a second timer, so skipping,
pausing and cleaning up are all one line each.

**Only `transform` and `opacity` are ever written.** The frames are NASA's, and
the game's job is to show them, not to grade them: there is no filter anywhere
in this feature. The decoration on top of the frames — the engine glow, the sun
flare, the dust, the haze — is drawn in the palette of the picture it sits on,
and none of it is over the subject of the shot.

**The pictures are decoded before the clock starts**, so the film never opens on
a half-drawn frame and never flashes white between two scenes. The wait happens
behind black, which is what is on screen anyway.

**One way out.** The Skip button, `Escape` and `Enter` all cut the film, and
they all end the same way: on black, and then the outpost. Reduced motion takes
the movement away and leaves the film exactly as long.

**The Skip button is in the top right corner**, which is where the launch reel's
is as well (`.launch__skip`). The game has two films, and the one control that
ends a film is in the same corner of both of them (D-086, ISS-102).

## What it does NOT contain

- **No route of its own for the hand-off.** The film is a screen in the journey:
  `landing-site` hands to it and it hands to `base`, both through
  `nextStop`. The outpost is not behind it and does not need to be.
- **No filter on the images.** Not a hue-rotate, not a saturate, not a blur.
- **No network request.** The facts are read from `src/data/landingFacts.ts`,
  which was checked against NASA before it was written down and works offline.
- **No new dependency.** The project has none, and a film of five stills does
  not need one.

## The frames

The five pictures are **WebP**, converted from the supplied JPEG by
`tools/compress-cinematic-frames.py` at quality 84 — about 41 dB against the
JPEG, which is where the difference stops being visible, and about half the
weight. The originals are kept in `source/` beside them, and the tool fails
loudly if a frame does not come out smaller.

The frames are fetched at startup by `ui/landingFrames.ts`, so they are in the
cache, and decoded, long before the player reaches the map.

## Handoff

The region comes off the `RunState`, which `landing-site` has already set with
`landAt`. The film reads it and never imports `landing-site` (R-5), and it
never writes to the run: it is a film, not a decision.
