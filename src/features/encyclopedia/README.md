# `encyclopedia/` — equipment reference

**Built.** New screen. Goal: reduce clutter on the build screen by moving
`needs` detail out of the catalogue card and into a dedicated reference.

## What the screen does

The encyclopedia lists every piece of equipment the outpost can build, each
with an emoji, its cost, and one short line of what it does. Tap an item to
expand it: the full `gives` / `needs`, plus a real NASA fact and credit about
the system it serves (dust and solar panels, frozen water and the ice miner,
radiation shielding and the habitat, and so on).

It is reached from the ☰ Mission Control menu on the base / act / debrief
screens. A **Back to outpost** button in the panel returns to `base`; the menu's
**Leave mission** option follows the other game-loop screens and returns to the
main menu.

## What `model.ts` must contain

Pure, no DOM, no network:

- one encyclopedia entry per module kind from `sim/modules.ts`
- the one-line summary (`gives`), the full `gives` / `needs`, and the cost
- a matched real NASA fact and credit from `data/nasaGallery.ts`

## What `view.ts` must contain

A list of expandable entries inside the shared game-loop shell (header +
panel), drawn via `gameScreen` / `gamePanel`. No model logic here.

## Routing

`encyclopedia` is a valid route (added to `Route` and `ALL_ROUTES` in
`src/ui/routes.ts`) but is not a journey step — it stays out of `ROUTE_ORDER`,
the same way `landing` is. It is registered in `src/ui/registry.ts` and has a
mount point `#encyclopedia` in `index.html`. The menu entry is a button in the
mission-control dialog in `src/ui/gameLoop.ts`.

## NASA data

Facts come from `src/data/nasaGallery.ts` (`FACTS`), which are real, credited
NASA facts. Images load through ordinary `` src attributes — there is no
`fetch` in `ui/` or `features/`, so R-8 is respected.
