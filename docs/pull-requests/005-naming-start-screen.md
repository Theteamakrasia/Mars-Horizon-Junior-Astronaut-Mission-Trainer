# PR — Rebuild the start screen as a full-bleed scene

**Branch:** `hw-naming-start-screen`  
**Target:** `main`

## Summary

The start screen is now one picture edge to edge, to a new reference supplied by the
owner: the astronaut stands on the left, Mars fills the right and runs off the top and
right edges of the window, and the menu — title, name field, buttons, trainer card —
sits on the right over the planet.

Before this, the artwork lived in a bordered card on the right of the screen and the
menu sat in a column on the left, so the first thing a child saw was a small picture in
a box. The scene is also what made the planet look broken: the artwork was 606x620 and
the new layout draws it at roughly the width of the window, so on a 1920px screen it was
being stretched about three times over and the craters turned to mush. Both the planet
and the astronaut are now enlarged.

**The rotating planet is untouched.** `naming-mars-turn` is still 150s, linear, infinite,
and `naming-astronaut-float` is still 9s. Only the geometry around them moved.

## Changes

- `index.html`
  - The stage (the two images) moved out of `.naming__body` and became the first child
    of the section, so it is the backdrop for the whole window: the planet runs off the
    edges and the header sits on top of it. The `naming__card` frame is gone.
  - The title, greeting and form moved into a `.naming__content` wrapper, so the block
    can be centred in the space above the trainer card.
  - The brand mark lost its rocket glyph and is the plain orange square of the
    reference.
  - START MISSION carries the accent fill every other screen's primary button uses;
    "Start over" is the quiet one beside it.
- `src/features/naming/naming.css` — rewritten around the new composition: the stage
  covers the window, the panel is 44% wide on the right, the type is Outfit (already
  loaded for the rest of the site), the panels are translucent so the planet shows
  through, and a radial scrim keeps the menu legible on top of it. The keyframes are
  copied over unchanged.
- `Assets/images/naming/mars.webp` — 606x620 → 1818x1860 (358 KB).
- `Assets/images/naming/astronaut.webp` — 620x618 → 1240x1236 (130 KB).
- `Assets/images/naming/source/` — the untouched originals, so the enlargement can be
  re-run at any size.
- `tools/upscale-naming-assets.py` — rebuilds the shipped files from the sources: a
  Lanczos resample followed by a light unsharp mask, because Lanczos alone leaves the
  enlarged crater rims soft. A dev tool like the other three in `tools/`; it adds
  nothing to the bundle.
- `docs/team/` — D-048 (the decision, with the alternatives that were rejected),
  TASK-062 and TASK-063, and the progress log.

`src/features/naming/view.ts` and `model.ts` are **not** touched, so the name rules,
their 21 tests and the whole form behaviour are exactly as they were.

## Validation

- `npm run check` — passed (import layers, banned APIs, markup, typecheck).
- `npm test` — passed (424 tests, 19 files).
- `npm run build` — passed, warning-free.
- Rendered the real app in headless Chrome at 946x538 (the reference's own size),
  1366x768, 1920x1080 and 390x844, and compared 1:1 crops of the planet before and
  after the enlargement.
- Drove the form: typing enables START MISSION, submitting reaches the briefing, Start
  over clears the field again.
- Checked under `prefers-reduced-motion: reduce`: both animations are removed and the
  scene still renders.

**Not yet done:** the screen has not been looked at on a real device by the owner.

## Review checklist

- [x] Work is on a feature branch; `main` is unchanged.
- [x] `npm run check` and `npm test` pass on the branch.
- [x] The Mars rotation is unchanged — same keyframes, same duration, same easing.
- [x] No new runtime dependency; the asset tool is a dev tool like the others.
- [x] The screen still works the same way: the name rules, the disabled START MISSION,
  the submit hand-off to the briefing and the Start over reset.
- [x] The layout holds from 390px wide to 1920px wide.
- [ ] Checked on the owner's own device.
- [ ] The planet in the reference mockup is darker than the game's own asset. The real
      art is kept; if the mockup's mood is wanted instead, one `filter` line on
      `.naming__mars` is the change.
