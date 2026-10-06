# `landing-site/` — choose a landing region

**Not implemented.** This folder holds its contract so the person who picks it up does
not have to reconstruct it. See `../README.md` for the layout rules and
[`../../../docs/architecture.md`](../../../docs/architecture.md) for the whole picture.

Task: **TASK-028**. Goal: **G-4**. The best first task in the project — no dependency on
the resource model.

## What the screen does

The player's first real decision. A rocket is in orbit and five regions are marked on
the map. **There is no perfect choice** — each is strong in some ways and dangerous in
others. The README makes the lesson explicit: a site with perfect water and terrible sun
will kill you as surely as one with great sun and no water.

That is why NASA picked Jezero Crater — not because it is the *best* place, but because
its combination of ancient river deposits and workable terrain makes it the most
*interesting* place to explore.

## What `model.ts` must contain

Pure scoring over the five axes, and nothing else. Score each **0-5**:

| axis | question |
| --- | --- |
| water | is there ice nearby? can you make your own? |
| sun | how much power will the panels actually get? |
| terrain | flat and safe, or steep and hard to build on? |
| dust | will storms bury the equipment? |
| temp | how much energy will you burn just staying warm? |

Five regions, from the project README: Arcadia Planitia, Jezero Crater, Olympus Mons,
Valles Marineris, Argyre Basin.

Keep it pure and deterministic: a function from `(region) -> Score`, with the region
table as `constants.ts`. No randomness — a randomised score would make the screen
unrepeatable for a demo and untestable without pinning a seed.

## What `view.ts` must contain

The map, the five selectable regions, and the Site Analysis panel showing the selected
region's five scores. Clicking a region re-renders the panel.

Accessibility: the regions must be reachable and operable by keyboard, and the panel must
read out the selected region. Five click targets that only work with a mouse is not shippable
for an ages 8-16 audience.

## What it does NOT contain

- No resource drain. That is `src/sim/sol.ts`, which does not exist yet.
- No persistence. There is none in this project (see D-003).
- No `fetch`. Site data is authored, not fetched.

## Handoff

The chosen region becomes part of `RunState`, owned by `main.ts` and passed into the next
screen. **Do not import the `base/` feature to read it** — the `cross-feature` rule will
fail the build, and it is there for a reason.