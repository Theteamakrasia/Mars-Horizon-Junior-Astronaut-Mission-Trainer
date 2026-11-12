# PR — Move the supply list into the landing window

**Branch:** `feat/landing-setup-popup`  
**Target:** `main`

## Summary

The build screen's right-hand panel held the supply list, and there was no landing popup at
all. Now there is one: a window opens over the build screen when the crew lands, and it
holds the whole decision — the site and its picture, the five site goals with what is still
missing, **all six supplies** with their art, description, cost, count and both steppers,
the points and the extras count, and the six numbers of the outpost. The panel keeps the
state of the build — the points bar, the goals, the NASA fact — and a **"Choose your
extras"** button that opens the window, so the supplies are never on screen at once.

This is a relocation, not a redesign. **No rule changed**: no price, no budget, no goal,
no survival condition. `npm run balance` still passes at every site, and the game's own
note still holds — *"You can land with nothing extra. It is allowed, and you will see why
it is hard."*

**One state, one set of rules.** `extras` stays in `mountBase`; the window calls the same
`addModule`, `removeModule` and `canPlace` the panel used to call, and hands the new build
back. The window's "Land & start sol 1" and the panel's call the same `land()`, so there is
one way the run starts.

**The cards in the window are the game's own cards.** The window carries the `gl--base`
class, so the same rules draw them — not a second design, and not a copy to drift.

## Changes

- `src/features/base/setupPopup.ts` (new) — the window, and `siteGoals()`, the five goal
  rows the panel and the window share.
- `src/features/base/setupPopup.css` (new) — the window in the game's own tokens: the
  header, the progress row, the six numbers, the two columns, the footer. The card is
  cream at 92% with an 18px backdrop blur, so the outpost shows through as soft shape and
  colour and the window reads as glass over the place rather than a wall in front of it.
- `src/features/base/view.ts` — the card loop is gone from the panel; `land()`,
  `openSetup()`, `closeSetup()` and the "Choose your extras" button are new. The six
  outpost numbers are now computed once and drawn twice. The window is mounted on
  `document.body` and taken off again on unmount.
- `src/styles/game-loop.css` — one rung in the stacking ladder: **130, the setup window,
  over the how-to-play popup**. The window waits for the guide to close, so the two are
  never on screen together.
- `tools/browser-check-setup-popup.mjs` (new) — 141 checks over the five landing regions.
- `tools/browser-check-build.mjs` — follows the cards into the window, and its scroll
  check now watches the window's own scroller (ISS-097).
- `docs/` — D-081 with the rejected alternatives, ISS-095, TASK-104, the progress-log
  entry, the architecture tree and contract table, the `AGENTS.md` row, and the build
  screen's README.

`src/sim/**` is **not** touched, so no balance number, goal or survival rule moved.

## Validation

- `npm run check` — passed (import layers, banned APIs, markup, typecheck).
- `npm test` — passed (962 tests, 46 files).
- `npm run build` — passed.
- `npm run balance` — passed: every site can still hold all five systems, 45.7% of builds
  win on average.
- `tools/browser-check-setup-popup.mjs` — **141/141** over all five landing regions: the
  window opens by itself when the crew lands, it shows that site's own name, picture and
  description, all six supplies are in it with their art, cost, count and both steppers,
  a `+` raises the count, spends exactly the cost and counts the extra, a `-` puts it
  all back, a blocked `+` says why, the goals move with the build, the panel behind it has
  **no** supply cards, and the window's button lands the outpost.
- `tools/browser-check-build.mjs` — 67/67 (the card behaviour, the scroll that must not
  jump, the guide, the goals, the lander's copy).
- `tools/browser-check-day.mjs` — 29/29, `tools/browser-check-rover.mjs` — 10/10,
  `tools/browser-check-journey.mjs` — no console errors.
- Rendered the real game in headless Chrome at 1600x1000, 900x780 and 520x760 and looked
  at the window at each size: the header, the points and the button stay put, the depot
  scrolls, and the text is comfortable over the outpost behind it.

**Known and pre-existing:** `tools/browser-check-training.mjs` reports 37/40. It was
checked against a clean `origin/main` and **fails there in the same way** — it drives the
act screen, which this PR does not touch. It is not fixed here.

**Also pre-existing on `main`, and not touched here:** `tools/browser-check-save.mjs`
reports 7/15. It is main's own new check, and it fails the same way on a clean
`origin/main` — the run is not being written down where the check looks. It is left for
whoever owns the save feature.

## Merged main

`main` moved while this branch was open (the save feature, the power economy, the
training fixes), so `main` is merged in here. Three conflicts, all resolved by keeping
both sides:

- the build panel: the supply cards leave the panel for the window, and main's new power
  dials stay on the panel;
- the decision, issue, task and progress-log entries: main allocated the same ids, so
  ours move up — **D-082, ISS-097, TASK-105** — and both entries are kept in each file;
- the window's cards now draw main's new **card note** (the line that says what a second
  solar array would do with the sunlight it makes), so that feature survives the move.

Everything below is re-verified **after** the merge: `npm run check`, `npm test`
(1046 tests, 49 files), `npm run build`, `npm run balance`, and the browser checks —
setup-popup 141/141, build 69/69, day 29/29, rover 10/10, journey no errors.

## Review checklist

- [x] Work is on a feature branch; `main` is unchanged.
- [x] `npm run check` and `npm test` pass on the branch.
- [x] No rule changed — prices, budget, goals, survival conditions and scoring are
      untouched, and `npm run balance` still passes.
- [x] One state: the panel and the window read the same build and call the same rules.
- [x] The supply list is in one place only; the panel never shows it twice.
- [x] The cards in the window are the game's own cards, drawn by the same rules.
- [x] The window is mounted on `document.body`, so a redraw behind it cannot reset the
      page the player is reading.
- [x] The window and the how-to-play guide are never on screen at the same time.
- [x] All five landing regions work: each shows its own name, picture, description, goals
      and supplies.
- [x] The layout holds from 520px wide to 1600px wide.
- [x] No new runtime dependency; no file in `src/sim/` changed.
- [ ] Checked on the owner's own device.
- [ ] The reference mock showed a **lock** on the window's button until all five site
      goals were ready. It is not built: the game deliberately lets a crew land with a
      goal unmet, and a lock would have been a new mechanic (D-082). The footer reports
      "3 of 5 site goals are ready" and the button always works. If the owner wants the
      lock, it is one `disabled` and one line of copy.