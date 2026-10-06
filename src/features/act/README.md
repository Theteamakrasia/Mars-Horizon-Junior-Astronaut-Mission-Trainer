# `act/` — advance a sol, resolve a mission

**Not implemented.** Task: **TASK-030**. Goal: **G-4**. Blocked on **TASK-015** and
**TASK-016** (`src/sim/resources.ts`, `src/sim/sol.ts`).

See `../README.md` for the layout rules.

## What the screen does, and what it deliberately does not

This screen runs a sol and shows what happened. **There is no planning phase** — see
decision D-018, confirmed by the project owner. The player's decisions happen at build
time in `base/`, not here.

The consequence is worth stating plainly, because it is easy to build the wrong thing:
**`act/` is a simulation runner, not a decision screen.** If someone asks you to add a
"choose your action" panel here, that is the plan phase, and it needs a decision recorded
in `docs/team/decisions.md` first.

## The trade-off, shown with a picture instead of a paragraph

The README's Power Surplus mission is the clearest statement of the game's thesis, and
it is a picture rather than a wall of text:

```
sun -> arrays -> +45 kW/h -> storing 12 kW/h -> night drain -30 kW/h
```

Excellent sunlight, and you still cannot win — because Mars night lasts about 12 hours
and the panels make nothing the whole time. The 45 kW collected by day has to survive a
night costing 30 kW, **and** charge the batteries for the next night, **and** power life
support and the greenhouse.

That is not an invented puzzle. It is why NASA's rovers and habitats lean heavily on
nuclear power rather than solar alone.

## What `model.ts` must contain

Nothing. **All of it belongs in `src/sim/sol.ts`.**

`sol.ts` owns: applying per-sol drain to the five stores, firing forecast events, applying
mission effects, and deciding whether the run has ended. It is pure and returns a new
state.

`act/model.ts` should stay thin — a small pure helper for this screen's own presentation
logic at most. If you find yourself writing simulation rules here, they belong in
`src/sim/`, and putting them there means they get tested like `drift.ts` already is.

## Sol stepping is UNDECIDED

Turn-based (resolved on button press) or real-time (clock-driven) has not been settled by
the team. The structure supports both: if real-time wins, `sim/` gains a clock abstraction
and `dom/` a ticker.

**Get the answer before writing this screen.** Real-time would require a fake clock to
keep the existing pure tests meaningful, and would change how `RunState` is threaded.

## What `view.ts` must contain

The active mission with its trade-off visualiser, a Location Conditions panel, and the
control that commits the sol. Then navigate to `debrief` when the run ends.

Use `nextRoute` from `src/ui/routes.ts` for navigation, not a hand-written path — the
route order lives in exactly one place.