# `base/` — establish the outpost

**Not implemented.** Task: **TASK-029**. Goal: **G-4**. Blocked on **TASK-015**
(`src/sim/resources.ts`).

See `../README.md` for the layout rules.

## What the screen does

The player touches down and lays out the first modules. This is the outpost overview
screen, and it is the home base for the rest of the run.

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
five stores as percentages, the incoming-weather warning, and the Build New Module
control.

## Undecided, and it affects this screen

Whether adding a module is an immediate choice or opens a per-sol decision is **not
decided**, because sol stepping itself is undecided — turn-based or real-time. Recorded
in `docs/architecture.md` under known simplifications. Ask before assuming.

Whoever builds `act/` (TASK-030) and this screen must agree on it. If sol stepping turns
out to be real-time, placement becomes a timing problem rather than a single decision,
and the state shape changes with it.