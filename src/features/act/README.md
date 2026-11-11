# `act/` — the desk: advance a sol, resolve a mission

**Built.** Task: **TASK-030**, extended by **TASK-065** and by the desk loop (D-060).
Goal: **G-4**. The simulation lives in `src/sim/resources.ts` and `src/sim/sol.ts`; the
day's work orders live in `src/sim/activities.ts`, the rule book in
`src/sim/standingOrders.ts`, the tools in `src/sim/minigames.ts` and the how-to-play guide
in `src/sim/guide.ts`.

See `../README.md` for the layout rules.

## What the screen does

This screen runs a sol and shows what happened. **There is no planning phase** — see
decision D-018, confirmed by the project owner.

**Every sol is a desk** (D-060). On the eight calm sols the screen offers three **work
orders**, each with **two readings** to check and sometimes a **tool** to work it with;
the player approves one, and the order's cost and gain are applied by `advanceSol`. On a
crisis sol the crisis replaces the desk (D-040), so the crisis *is* that day's order.

The difference from D-018 is deliberate and worth stating plainly, because it is easy
to build the wrong thing here: **an order is a choice inside the sol, not a planning
phase before it.** The player never sees the coming sol's numbers before choosing, and
there is no separate screen to plan on. A new *phase* still needs a decision recorded in
`docs/team/decisions.md` first — an order inside the sol has one (D-051, D-060).

**Stars multiply science and nothing else** (D-063). Working a tool well never gives back
a kWh, so the balance of a run cannot depend on how well the minigame was played.

**The recap comes first.** The review of what the last sol did is the first thing in the
panel, so a change is never something you have to hunt for (ISS-057).

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

An order draws from the same budget. Its kWh joins the same `extraPowerCost` path a
flare's shielding digger uses, so spending 25 kWh on a rover survey with a flat battery
runs the sol in a blackout — and that is the trade-off, not a decoration.

## What `model.ts` must contain

**Nothing that is a rule.** The order catalogue, the sol plans, the standing orders, the
tools, the science score and the rank all live in `src/sim/`, where they are tested.

`src/sim/` owns: applying per-sol drain to the five stores, firing forecast events,
applying the chosen order, awarding science points, and deciding whether the run has
ended. It is pure and returns a new state.

`act/model.ts` stays thin — the order cards' wording, the score card's wording, and
the meters' appearance. If you find yourself writing simulation rules here, they belong
in `src/sim/`, and putting them there means they get tested like `drift.ts` already is.

## Sol stepping is decided: turn-based

One sol advances per button press, resolved by `advanceSol` in `src/sim/sol.ts` (D-030).
There is no clock abstraction and no ticker. The screen disables both buttons while a sol
resolves, so a double press cannot advance twice.

## What `view.ts` must contain

The desk — the three work orders with their two readings each, the board of standing
orders, the note from home, the rover's document, and the work-order player — then the
recap of what the last sol changed, and the control that commits the sol. Then navigate
to `debrief` when the run ends.

Use `nextStop` from `src/ui/registry.ts` for navigation, not a hand-written path — the
route order lives in exactly one place.