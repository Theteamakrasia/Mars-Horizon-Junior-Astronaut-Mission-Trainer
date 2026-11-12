# `base/` — establish the outpost

**Built.** Task: **TASK-029**. Goal: **G-4**. Model rules come from
`src/sim/modules.ts` (D-032), not from this folder.

See `../README.md` for the layout rules.

## What the screen does

The player touches down and lays out the first modules. This is the outpost overview
screen, and it is the home base for the rest of the run.

**The supply list is in the landing window, not in the panel** (D-082). `setupPopup.ts`
draws a popup over this screen — the site, the five site goals, all six supplies and the
points — and it opens by itself when the crew lands. The panel keeps the state of the
build (the points bar, the goals, the NASA fact) and a **"Choose your extras"** button
that opens the window, so the two are never on screen at once. The window is mounted on
`document.body`, like the guide, because this screen redraws itself on every press and a
popup inside the screen was rebuilt each time (ISS-090).

The first four modules come from the project README:

| module | what it provides |
| --- | --- |
| habitat | shelter for the crew |
| life support | air and water recycling |
| solar array | power, in daylight only |
| batteries | power storage for the 12-hour Martian night |

**Build New Module is the core of the whole strategy layer.** Every module added improves
one system and increases what every other system has to support. That coupling is the
game — it is the same trade-off real NASA engineers face, and it must be visible and
legible to an eight-year-old.

This screen is also where the warning lives: *"solar storm approaching in sol 2."* You
have just landed and you already have a problem. That warning is the game teaching the
player to read ahead, so it should be present here rather than only at the debrief.

## What `model.ts` must contain

Pure, and the arithmetic is the interesting part:

- the module catalogue and what each one costs in **power** and requires to **support** it
- placement validity — can this go here, given terrain from `landing-site`?
- the derived upkeep: total power draw, total oxygen generation, recycling efficiency

Costs and upkeep belong in `constants.ts` so the tuning is visible in one file.

**Read the incoming region from the `RunState` argument, never by importing
`landing-site/`.** The `cross-feature` rule enforces this.

## What `view.ts` must contain

The outpost overview: placed modules, the Life Support and Resources panel showing the
five stores as percentages, the incoming-weather warning, the points and the goals of the
build, the button that opens the landing window, and the control that starts the run.

**The cards are not here.** They are in `setupPopup.ts`, which draws the landing window:
the site, the five goals, the six supplies and the points. `view.ts` owns the build
(`extras`) and the window draws it, so the two cannot disagree. The window's button and
the panel's call the same `land()`, so there is one way the run starts.

**And the feedback that makes the build legible** (ISS-054, ISS-055, ISS-056):

- the card counts the **extras** against `extraLimitOf()` — the same limit the game uses,
  so `3/3` means three is the most and not "nearly enough"
- when the button is dead, the card says **why**, in words a child can read
- the HUD carries a **Day power** card that moves as the panels go in, so deploying
  something visibly does something

**The how-to-play guide opens here the first time** (D-060): this is the first screen with
a mission bar and the first one where the player has to decide something. A `?` button in
the mission bar brings it back on any later sol.

## Sol stepping is decided

Turn-based: one sol advances per **Start sols / Advance sol** press (D-030). Adding a
module is an immediate choice on this screen, not a per-sol decision. There is no clock
abstraction and no ticker.

## The budget is checked, not assumed

`npm run balance` plays every legal build at every landing site over several forecast
seeds and **fails** when a site cannot hold all five systems (D-064). The game was
unwinnable at 14 points and no unit test said so; run the check after touching anything
in `src/sim/modules.ts`.