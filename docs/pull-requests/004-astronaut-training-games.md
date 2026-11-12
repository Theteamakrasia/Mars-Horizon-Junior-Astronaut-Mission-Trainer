# PR — Six astronaut training games on the standing orders sheet

**Branch:** `feat/astronaut-training-games`  
**Target:** `main`

## Summary

The act desk gets an **ASTRONAUT TRAINING** section at the top of the Standing orders
sheet, with six real mini-games: Resource Merge, Memory Match, Rover Parking, Solar Panel
Power-Up, Cargo Sorting and Asteroid Defender.

The rule is **two games a sol, any two of them, and each game paid for once a sol**.
Today's work orders stay **locked** until the second game is finished. The points a game
earns are **science points** — the one balance the game already has, the `★ N points` in
the panel head — scaled down to 2 / 3 / 4 for a basic, good and excellent run.

The day's training is **written down** in `localStorage` under one key, so a refresh does
not hand the player the same two games again and the points they earned are still on the
score. Everything else in the run is still in memory, exactly as it was (D-003).

## Why it is shaped this way

- **In the Standing orders, not on a screen of its own.** That sheet is where a rule
  book lives, and the training is now a rule the crew works to, like the other
  twenty-four.
- **The lock is in the rules engine, not in the button.** `canStartTraining` refuses a
  third game and `completeTraining` refuses to pay for a game twice, so a player who
  finds a way past the button is not paid for it.
- **The game's own art.** The cream paper, the navy ink and one orange; the 24×24 line
  drawings from `ui/icons.ts` rather than emoji, which are drawn by the operating system
  and cannot follow the game's ink (D-070). A padlock joins the icon set.
- **The game's own currency.** There is no shop in this game to spend points in — the
  colony modules are bought on the build screen with a build-point budget, and that
  screen is only reachable before sol one — so science points are the currency, and they
  are scaled down because the rank ladder was set for a twelve-sol run of work.

## Changes

- `src/sim/training.ts` — the rules engine: the six games' words, `TRAINING_DAILY_LIMIT`,
  `TRAINING_REWARDS`, `trainingDay`, `canStartTraining`, `completeTraining`, `makeRandom`
  and `trainingSeed`.
- `src/sim/trainingMerge.ts`, `trainingMemory.ts`, `trainingRover.ts`, `trainingSolar.ts`,
  `trainingCargo.ts`, `trainingAsteroid.ts` — the rules of the six games, one pure module
  each, with a test file beside each. The power board is generated rather than written
  down, so it is always winnable and never starts solved; the rover's maps are proved
  solvable by a breadth-first search in the test, and the move budget is built from the
  shortest route.
- `src/sim/run.ts` — `RunState.training`: what the crew has done today. The only file
  that changes shape.
- `src/ui/training.ts` — the section, the game dialog, and the record in `localStorage`.
- `src/ui/trainingGame.ts` — the contract every game keeps. `src/ui/training*.ts` — the
  six games on the screen. `src/ui/training.css` — their styling.
- `src/features/act/model.ts`, `view.ts`, `act.css` — the lock on the tasks tile, the
  callout on the desk, and the section in the Standing orders sheet.
- `src/ui/icons.ts` — a padlock.
- `tools/browser-check-training.mjs` — the check.
- Docs: `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/game-flow.md`, and the team
  record (D-075, TASK-097, and the progress log).

## Validation

- `npm run check` — passed (no layer or banned-API violations; typecheck clean).
- `npm test` — passed (915 tests, 113 of them new).
- `npm run build` — passed.
- `node tools/browser-check-training.mjs` — 37 checks passed, against a served build in
  headless Chrome: the section on the standing orders, all six games opening and drawing
  themselves, the cargo round and the asteroid round played honestly for points, the
  day's two-game limit refusing a third with a message, and the record surviving a
  refresh with the points still on the score.
- The screen was looked at, not only asserted on: the desk with the lock callout, the
  training section, and all six games.

## Review checklist

- [x] Work is on a feature branch based on `origin/main`; `main` is unchanged.
- [x] `npm run check` and `npm test` pass.
- [x] No new runtime dependency; no `index.ts` barrel; no feature importing another.
- [x] The six games are pure in `sim/` and drawn in `ui/`, one module each.
- [x] New files are UTF-8, LF, no BOM.

## Open for the owner

- **What the points are spent on.** There is no shop in the game, so the points sit on the
  science score. The build screen's budget is spent before sol one, so a shop that can
  be used during the run would have to be built.
- **The science rank ladder was not re-based.** A player who trains every sol earns about
  ninety-six points over a run and the ladder tops out at fifty, so the debrief's rank now
  measures the training as well as the work. The five numbers are the `min` values in
  `sim/science.ts`.
- **The lock is hard.** A player who cannot finish two games cannot run the sol. A
  "skip training" button was offered and declined.
