# `act/` — advance a sol, resolve a mission

**Built.** Task: **TASK-030**, extended by **TASK-065**. Goal: **G-4**. The simulation
lives in `src/sim/resources.ts` and `src/sim/sol.ts`; the day's activity lives in
`src/sim/activities.ts`.

See `../README.md` for the layout rules.

## What the screen does

This screen runs a sol and shows what happened. **There is no planning phase** — see
decision D-018, confirmed by the project owner.

**But every sol now has a main activity** (D-049). On the eight calm sols the screen
offers three activities and the player picks one; the activity's cost and gain are
applied by `advanceSol`. On a crisis sol the crisis replaces the activity panel
(D-040), so the crisis *is* that day's activity.

The difference from D-018 is deliberate and worth stating plainly, because it is easy
to build the wrong thing here: **an activity is a choice inside the sol, not a planning
phase before it.** The player never sees the coming sol's numbers before choosing, and
there is no separate screen to plan on. A new *phase* still needs a decision recorded in
`docs/team/decisions.md` first — an activity inside the sol has one (D-049).

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

An activity draws from the same budget. Its kWh joins the same `extraPowerCost` path a
flare's shielding digger uses, so spending 25 kWh on a rover survey with a flat battery
runs the sol in a blackout — and that is the trade-off, not a decoration.

## What `model.ts` must contain

**Nothing that is a rule.** The activity catalogue, the sol plans, the science score and
the rank all live in `src/sim/`, where they are tested.

`src/sim/` owns: applying per-sol drain to the five stores, firing forecast events,
applying the chosen activity, awarding science points, and deciding whether the run has
ended. It is pure and returns a new state.

`act/model.ts` stays thin — the activity cards' wording, the score card's wording, and
the meters' appearance. If you find yourself writing simulation rules here, they belong
in `src/sim/`, and putting them there means they get tested like `drift.ts` already is.

## Sol stepping is decided: turn-based

One sol advances per button press, resolved by `advanceSol` in `src/sim/sol.ts` (D-030).
There is no clock abstraction and no ticker. The screen disables both buttons while a sol
resolves, so a double press cannot advance twice.

## What `view.ts` must contain

The day's activity cards, the active mission with its trade-off visualiser, the science
score card in the world panel, the recap of what the last sol changed, and the control
that commits the sol. Then navigate to `debrief` when the run ends.

Use `nextStop` from `src/ui/registry.ts` for navigation, not a hand-written path — the
route order lives in exactly one place.