# Progress log

Newest entry on top. Four bullets: **Did**, **Files**, **Problems**, **Next**.

**Problems is the one people skip and the one that matters.** If a change went cleanly,
say so and say why - a clean change with an unexplained problem underneath is worse
than a documented one.

---

## 2026-11-10 — Give every sol a main activity, a science score and a live NASA picture

**Did**

- **Every sol now has a main activity** (D-048). On the eight calm sols `act` offers three
  activities and the player picks one; on a crisis sol the crisis replaces the activity
  panel, so the crisis *is* that day's activity. Twelve activities, each with a real cost,
  in the new pure module `src/sim/activities.ts` alongside the twelve sol plans.
- The activity's kWh joins the same `extraPowerCost` path a flare's shielding digger uses,
  so **an activity competes with life support for the same energy**: spend 25 kWh on a
  rover survey with a flat battery and that sol runs in a blackout. No new machinery was
  needed for this — it fell out of the model that was already there.
- **Science points and a rank** (D-049). `RunState.science` totals the points, and the new
  `src/sim/science.ts` turns the total into a rank: Explorer, Field Scientist, Research
  Lead, Senior Scientist, Chief Martian Scientist. The bands are set by what a run can
  actually earn, so a player who chose nothing is still an Explorer and the top rank is one
  good run away. The debrief reports the score, the rank and every activity the crew chose.
- **A live NASA picture per sol** (D-050). The new `src/data/nasaDaily.ts` reads NASA's
  Astronomy Picture of the Day, filtered to Mars, and falls back to the saved gallery when
  NASA is busy — an enrichment layer on top of the curated gallery, never a replacement,
  exactly as D-037 established for space weather. The static facts grew from 15 to 40 and
  every one is tagged with a topic, so the day's activity is paired with a fact about its
  own system.
- The cosmetic `MISSIONS` array is gone. It claimed a headline that disagreed with the
  forecast — sol 8 read "Mission 7: First Harvest" while the storm was on sol 7 — and it
  had no effect on the simulation at all. It is now `SOL_PLANS`, twelve real headlines each
  carrying its three activities.
- The suite went from 424 tests in 19 files to **517 tests in 24 files**. `src/sim/run.test.ts` and
  `src/sim/balance.test.ts` were added as well: ISS-047 recorded that the run state had no test file
  at all, and the activity loop changes exactly that state and the balance it depends on.

**Files**

- New: `src/sim/activities.ts`, `src/sim/science.ts`, `src/sim/topics.ts`,
  `src/data/nasaDaily.ts`, `src/dom/dailyFactLoader.ts`, `src/ui/nasaFeedCard.ts`,
  `docs/game-plan-update.md`
- Changed: `src/sim/{run,sol}.ts`, `src/features/act/{model,view}.ts`,
  `src/features/act/act.css`, `src/features/debrief/{model,view}.ts`,
  `src/data/nasaGallery.ts`, `src/data/README.md`, `docs/architecture.md`,
  `docs/game-flow.md`, `AGENTS.md`, `README.md`, `docs/team/{decisions,issues,tasks}.md`

**Problems**

- `ice-store` gave more water for less power than `dig-ice` and earned fewer points, so on
  sol 5 it made `dig-ice` pointless. It became `sample-rock`, a distinct science activity.
  The fix is its own commit rather than a quiet rewrite.
- The first set of rank bands put a run that chose nothing at "Field Scientist", because
  twelve day-log points were enough. The bands were recalibrated against what a run can
  actually earn.
- The debrief's `crisisSols` list was wrong at first: a sol with no activity is not
  necessarily a crisis sol. It now separates crisis sols from sols where nothing was
  chosen, using the logged events as the evidence.
- **NASA's APOD endpoint rate-limits the shared `DEMO_KEY`.** It answered `429` on every
  attempt while this was written (ISS-049). The saved gallery is the guaranteed layer, so
  the demo is safe either way, but a personal key (TASK-008) is the fix.
- The NASA Mars Rover Photos API returned `404` for every rover and sol tried from this
  machine, so it was left out rather than shipped unverified. It is the most striking
  possible feature and is worth retrying after the demo.
- Not yet verified in a real browser. `npm run check` and `npm test` are clean and
  `npm run build` succeeds, but nobody has watched a player pick an activity yet.

**Next**

- A human browser pass of the whole journey, especially the activity cards on a touch
  screen and the crisis countdown with the new panel (TASK-049).
- Register a personal `api.nasa.gov` key before the demo (TASK-008, ISS-009).

---

## 2026-11-10 — Rotate NASA facts onto the supply and launch screens

**Did**

- The supply screen now shows a rotating NASA fact while the player works the ration
  question: `[data-supply-fact]`, set from `factFor(SUPPLY_BEATS.length)`, styled as
  `.supply__fact`, sitting under the working line and never covering the choices.
- The launch parts tour now shows a rotating NASA fact per part: `renderPart` sets
  `[data-launch-parts-fact]` from `factFor(index)`.
- No new tests: the facts were already covered by the gallery tests; the screens only
  pick a seed.

**Files**

- `index.html`, `src/features/supply/{view.ts,supply.css}`,
  `src/features/launch/{view.ts}`, `docs/team/{tasks,decisions,progress-log}.md`,
  `docs/architecture.md`

**Problems**

- None blocking. `npm run check` and `npm run build` clean; `npm test` still 424 in 19
  files. Not yet verified in a real browser; that is the next step before any commit.

**Next**

- Human browser pass (`TASK-049`) on the supply and launch screens, then the production
  build browser check; then submit for the demo.

---

## 2026-11-10 — Put the briefing under the astronaut artwork, one line at a time

**Did**

- Replaced the briefing's stacked beat cards with the astronaut-between-Earth-and-Mars artwork
  (`Assets/images/briefing/astronaut.webp`, converted from a 2.2 MB PNG to a 208 KB WebP) and a
  single message that swaps one line at a time. The artwork is locked to its own aspect ratio
  as the backdrop — the supply screen's stage approach — so it is never cropped; an earlier
  attempt used `object-fit: cover` over the whole viewport, which zoomed the picture and cut
  the astronaut, and was replaced.
- NEXT and the Enter key both advance; Enter confirms on the last line. Enter is ignored while
  a button or link has focus, so one press cannot advance twice.
- The YES!! button and the ~2.6 s auto-advance are unchanged, as are `model.ts` and its tests.
- Updated `docs/architecture.md`, `README.md` §2, `docs/team/decisions.md` (D-046) and this log
  in the same change.

**Files**

- `Assets/images/briefing/astronaut.webp` (new), `index.html`, `src/features/briefing/view.ts`,
  `src/features/briefing/briefing.css`, `README.md`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/progress-log.md`

**Problems**

- None blocking. `npm run check`, `npm test` (401 tests on that branch) and `npm run build` all
  pass; the new WebP bundles at 208 KB. The source PNG is 2.2 MB, so the conversion is what
  keeps the bundle honest — the other screens' assets are WebP for the same reason.
- Not yet verified in a real browser; that is the next step before any commit.
- The branch was 13 commits behind `main`; merging `main` in moved the briefing decision from
  D-042 to D-046 because D-042 was already the NASA gallery decision. The read-aloud control
  was re-wired to read the single on-screen message instead of a stack of beats.

**Next**

- Human browser pass on `#/briefing`: artwork visible, messages swap on NEXT and Enter, Enter
  does not double-advance from a focused button, YES!! and the auto-advance still fire.

---

## 2026-11-10 — Put a real NASA photo on every landing region, and rotate facts

**Did**

- Added five real NASA photos to the landing-site panel: one per region, each
  verified against NASA's image API and credited. Selecting a pin now shows the
  place itself, not just a dot on the map. Recorded as D-045.
- Added a rotating list of fifteen short NASA facts, with `factFor(seed)` so a
  screen can pick one deterministically. Base shows a fact beside the build
  panel; the debrief shows one beside the closing card.
- Reused `nasaCard` for the region photo, so the credit line, source link and
  read-aloud control came with it. Ten new tests cover region ids, image URLs,
  credits, length caps and fact wrapping.

**Files**

- `src/data/nasaGallery.ts` + test, `src/ui/nasaCard.ts`,
  `src/features/landing-site/{view.ts,landing-site.css}`,
  `src/features/base/view.ts`, `src/features/debrief/view.ts`, `index.html`,
  `docs/architecture.md`, `docs/team/{decisions,tasks,progress-log}.md`,
  `README.md`, `AGENTS.md`

**Problems**

- The region photos are fetched from `images-assets.nasa.gov` at runtime. A card
  whose image fails keeps its caption, fact and credit, but there is no bundled
  fallback image.
- Jezero's picture is an artist's idea of the ancient lake, not a photograph;
  the caption says so, because it is the one region image a child could mistake
  for a real photo.

**Next**

- Human browser pass (`TASK-049`); then decide whether to extend the fact list
  to the supply and launch screens.

---

## 2026-11-10 — Add the NASA learning layer, read-aloud, and a real way out of a run

**Did**

- Curated gallery: twelve real NASA images, one per sol, plus a closing artist concept on the
  debrief. Every card has a NASA id, alt text, caption, fact, credit and source link, and ten
  tests enforce those fields. Recorded as D-042.
- Read-aloud on the NASA cards, the briefing and the crisis prompt, using the browser's own
  `speechSynthesis`. Shared toggle in `ui/readButton.ts`, engine in `ui/readAloud.ts`, and the
  router stops the voice on every navigation. Recorded as D-043.
- "What this sol changed" strip on `act`: all five stores, signed deltas, `+15 kWh` / `−14%` /
  `no change`, with a note that power is stored energy and the rest are tank percentages.
- A safe leave dialog on base, act and debrief (Menu → Keep playing / Leave mission), and
  naming's dead "Back to Main Menu" relabelled "Start over", which resets the form and the run.
  Recorded as D-044.
- Fixed the briefing's crew count (`CREW_SIZE = 4`), the page title/description, and updated the
  docs to match: architecture tree and contracts, test counts, issues, decisions and tasks.

**Files**

- `src/data/nasaGallery.ts` + test, `src/ui/nasaCard.ts`, `src/ui/nasa-card.css`,
  `src/ui/readAloud.ts`, `src/ui/readButton.ts`, `src/ui/gameLoop.ts`,
  `src/styles/game-loop.css`, `src/ui/router.ts`, `src/features/{act,briefing,debrief,base,naming}`,
  `index.html`, `docs/architecture.md`, `docs/team/{decisions,issues,tasks,progress-log}.md`,
  `README.md`, `AGENTS.md`

**Problems**

- The briefing's closing hand-off would have cut off a reading mid-sentence, so the read button
  pauses that timer and restarts it only when the passage finishes naturally.
- `speechSynthesis` is unavailable in the Vitest node environment, so read-aloud has no automated
  test; the control is hidden where the API is missing and the rest is code-reading plus the
  browser pass.
- NASA image URLs point at `images-assets.nasa.gov`. A card whose image fails to load still shows
  the caption, fact and credit, but no offline fallback image is bundled.

**Next**

- Human browser acceptance pass (`TASK-049`) and a `npm run preview` check of `dist/`.
- Optional: self-host the fonts (TASK-012) and remove the unused 12 MB of cinematic PNGs
  (ISS-018).

---

## 2026-11-10 — Make the README describe the project that actually exists

**Did**

- Rewrote the README's technical half against the code: the status row, the real route chain,
  a nine-step walkthrough of the nine built screens, a project-status table, setup commands,
  the real `src/` tree, and a documentation table linking `AGENTS.md`, `docs/architecture.md`,
  `docs/game-flow.md` and the team records.
- Corrected the walkthrough where it described screens that do not exist: there is no plan
  phase (D-029), no separate "Final" screen (D-035), no **Build New Module** button, and the
  images are design mockups rather than captures.
- Closed ISS-001 and recorded D-041: the README is now maintained as a technical document, not
  frozen.

**Files**

- `README.md`, `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`,
  `docs/team/tasks.md`, `docs/team/progress-log.md`

**Problems**

- The README had drifted for five weeks because D-011 froze it deliberately. Rewriting it
  uncovered smaller disagreements: the "Ten Missions" table describes an arc that is not
  implemented, and the plan-phase mockup shows a screen the build never had. Both are now
  labelled as design intent rather than current behaviour.
- `src/features/README.md` is stale in the same way — it says the folder is empty and that
  `sim/` "does not exist yet". It was outside this change and needs its own pass.
- `index.html` still calls the page "Under Construction" in its `<title>` and meta
  description. That predates the build and was not touched here; it is a one-line fix for
  the next pass.
- No gameplay code changed. `npm run check` passes and the unit suite is green; the test
  count in the README was updated from a real run, not from memory.

**Next**

- Rewrite `src/features/README.md` against the nine built features and the four-file contract.
- Keep the README's status table and test count current in the same commit as any change that
  invalidates them (D-041).

---

## 2026-11-10 — Map the decisions so new events have somewhere to land

**Did**

- Read the decision logic out of `sim/crises.ts`, `sim/sol.ts`, `sim/forecast.ts`,
  `sim/modules.ts` and `sim/regions.ts` rather than from the docs, then wrote
  `docs/game-flow.md`: the journey, the sol loop, the three crisis trees with their exact
  numbers, the resource cause-and-effect chain, the run-status machine, a status table, and
  a checklist for adding a new event.
- Marked what is built and what is not: every journey screen is built; save, login, a plan
  phase and any new event kind are not. Planned event ideas are sketches only.
- Validated the Mermaid blocks by rendering them locally. The first version had nine
  diagrams; GitHub's renderer only drew the last few before timing out and showed "Unable to
  render rich display" over the rest, so the page was cut back to four compact diagrams and
  re-checked. The README now links to the map from its index and project-status section.

**Files**

- `docs/game-flow.md` (new)
- `docs/architecture.md` (docs tree)
- `README.md` (index + project-status link)
- `docs/team/tasks.md`, `docs/team/progress-log.md`

**Problems**

- No Mermaid parser is installed and adding one would be a runtime dependency, so the
  diagrams were rendered through a local headless browser and an external service instead.
  The repo still has zero dependencies.
- GitHub renders Mermaid client-side and silently gives up on a page with many diagrams:
  nine diagrams produced five "Unable to render rich display" panels even though every block
  parsed cleanly. This is a host limit, not a syntax error; four smaller diagrams avoid it.
- The existing docs still name `sim/events.ts`, `sim/constants.ts` and `sim/balance.test.ts`,
  which do not exist; the real files are `sim/forecast.ts` and `sim/modules.ts`. The new
  map points at the real ones and does not repeat the stale names.

**Next**

- Pick an event from §10.4, log it as a task, and record the design choice in
  `docs/team/decisions.md` before writing code.

---

## 2026-11-10 — Rebuild base, act and debrief from the Figma game-loop frames (D-038, D-039, D-040)

**Did**

- Pulled the seven Figma nodes (`66:14`, `66:20`, `66:26`, `66:32`, `66:38`, `66:44`, `66:50`) through the Figma MCP and rebuilt the three screens on the shared chrome they draw: navy header, five resource cards, illustrated Mars world with the crewmate, cream interaction panel and dock.
- Added `src/ui/gameLoop.ts` + `src/styles/game-loop.css` as the one place the frame is drawn. Features pass in words and numbers; the shell knows no `sim/` rule.
- `base` now shows the outpost on Mars with module artwork and a build catalogue with steppers. `previewSummary()` gives the five cards their numbers from the same calm-sol projection the sentences use.
- `act` keeps the turn-based loop, and a crisis now replaces the mission panel in place (`66:26`, `66:32`, `66:38`) with the countdown, Earth reply and "take your time" switch intact.
- `debrief` is the results panel from `66:44`, and its journal is the `66:50` frame: decisions with verdicts, the full sol table and the honesty note, reached from "View my Mars story". `nextSteps()` and `wentEmpty()` are new pure helpers, with 6 new tests.
- Checked the rendered screens in headless Chrome at 1600×900 against the frame exports, then deleted the temporary harness.

**Files**

- `src/ui/gameLoop.ts`, `src/styles/game-loop.css`, `index.html` (Outfit/Nunito/Orbitron)
- `src/features/{base,act,debrief}/view.ts`, their `.css`, and `base/model.ts`, `debrief/model.ts`
- `docs/architecture.md`, `docs/team/{decisions,progress-log}.md`

**Problems**

- The frames show Pause, Settings and BUILD, and a working Outpost/Inventory/Journal dock. None of those screens or controls exist, so they are decorative `<span>`s marked `aria-hidden` (D-038). A BUILD button on `act` would call `startOutpost` and wipe the run.
- The journal frame has no room for the sol table or the honesty note. Both live below the decision entries in the same scrolling panel, so the debrief can still show its reasoning and the timing caveat.
- Icons are emoji, not the frame's custom glyphs: there are no SVG exports for them and the project carries no icon dependency. Module and resource artwork is real.
- `src/styles/game.css` is now imported by nobody. Left in place in this change; removing it is a separate commit.
- The visual harness needed Chrome's `--headless=new --screenshot`; no Playwright/Puppeteer is installed and adding one is a dependency change, so it stays a manual check.

**Next**

- Human browser pass of the whole journey at laptop and phone widths (TASK-049).
- Retune `base`'s forecast card if three banner events in one sentence reads too long on a laptop.

---

## 2026-11-09 — Hook live space weather up to a second source (ISS-043, D-037)

**Did**

- Verified the existing client is really live: a headless browser on `#/base` sends
  `GET https://api.nasa.gov/DONKI/FLR?...&api_key=DEMO_KEY`, and NASA answered `503
  upstream connect error`, then `429 OVER_RATE_LIMIT`. The run fell back to two baked
  flares, so the "live forecast" was history.
- Added NOAA SWPC's GOES X-ray feed as the second live source, after NASA and before the
  baked fallback. `SpaceWeatherSource` is now `'donki' | 'noaa' | 'fallback'`, and the
  detail sentence names the agency that answered.
- Stopped caching a request the caller aborted, so a screen closed mid-fetch cannot leave
  the next screen with a stale fallback.
- Re-verified in headless Chrome: `#/base` now shows an M3.5 flare "seen on 5 November
  2026" with the note "Live flares from NOAA's space-weather centre, last 7 days" and no
  `approximate` tag.
- Closed ISS-006 (`.env*` ignored, `.env.example` added), ISS-008 (CORS verified; the
  remaining problem is service availability, not CORS) and corrected the stale docs
  (ISS-042).

**Files**

- `src/data/spaceweather.ts`, `src/data/spaceweather.test.ts`, `src/data/README.md`
- `src/dom/forecastLoader.ts`, `src/sim/forecast.ts`, `src/features/base/view.ts`
- `.gitignore`, `.env.example`
- `AGENTS.md`, `docs/architecture.md`
- `docs/team/{issues,decisions,tasks,progress-log}.md`

**Problems**

- DONKI is not usable right now from this network: 503 on the first calls, then 429 for
  `DEMO_KEY`. That is why the change is two sources rather than a NASA-only fix; the NASA
  path is still first in the chain.
- The live NOAA feed often tops out at M-class, so flare intensity is usually 2, not the 3
  the baked X-class fallback produced. That is the honest number, but balance will feel
  gentler on a quiet week.
- The summary used to say "like the one NASA recorded", which would have been a lie when
  NOAA answered. Reworded to "about the strength of one seen on …".
- `AGENTS.md` and `architecture.md` had drifted further than the data layer: they referenced
  `sim/events.ts`, `sim/constants.ts` and `sim/balance.test.ts`, none of which exist. Fixed
  the parts touched here; the wider tree audit is still ISS-024.

**Next**

- Obtain a personal `VITE_NASA_API_KEY` before the demo so DONKI is the usual source
  (ISS-009).
- Human browser pass of `base` → `act` → `debrief` with live data (TASK-049).

---

## 2026-11-09 — Fix the launch parts tour clipping its controls (ISS-041)

**Did**

- Moved `.launch__parts-panel` out of `.launch__stage` so it is a direct child of
  `.launch` and covers the whole viewport, instead of inheriting the 16:9 letterboxed
  stage box.
- Capped `.launch__parts-image` by viewport height (`max-height: 52vh`, tightened to
  `44vh` under 560px) so the card fits short windows.
- Verified in headless Chrome at 545x645 and 1000x720: the tour opens on its own, the
  part name and description are visible, Continue is hit-testable, and clicking it
  navigates to `#/interior`.

**Files**

- `index.html`, `src/features/launch/launch.css`
- `docs/team/{issues,decisions,tasks,progress-log}.md`

**Problems**

- The first headless check forced the panel open, which bypassed `openPartsPanel` and
  left the button without its click listener — the click did nothing. Re-tested against
  the real media-driven flow, where the tour opens on its own and Continue navigates.
- No DOM tests exist for the launch view (ISS-013), so this is verified in a browser
  rather than the suite.

**Next**

- Human browser pass of the whole journey (TASK-049).

---

## 2026-11-08 — Build the `base → act → debrief` game loop

**Did**

- Implemented the pure simulation: `sim/constants.ts` (all tuning numbers),
  `sim/modules.ts` (catalogue, build rules, upkeep), `sim/events.ts` (baked schedule,
  every event `approximate: true`), real `sim/resources.ts` (`drainForSol`,
  `depletedStores`), `sim/sol.ts` (`advanceSol`, per-sol ledger, win/loss detection) and
  `sim/run.ts` (`modules`, `ledger`, `landAt`, `applyBuild`).
- Built the three screens: `base` (placed modules, five stores, storm warning, build
  panel with cost/effect previews, Start sols), `act` (turn-based Advance sol, Power
  Surplus picture from live numbers, location conditions, event log) and `debrief`
  (outcome, CSS-bar timeline, used/weather-damage summary, ledger attribution with an
  explicit not-confident path, Play again).
- Registered all nine screens in `registry.ts`, added the three `<section>`s to
  `index.html`, and fixed ISS-040 by making `landing-site` call `landAt`.
- Added the loop's sim tests (modules 25, events 16, resources 18, sol 12, run 19,
  balance 9) plus screen-model tests; the sim suite is 178 tests and the whole suite is
  410.

**Files**

- `src/sim/{constants,modules,events,resources,sol,run}.ts` and their tests,
  `src/sim/balance.test.ts`
- `src/features/{base,act,debrief}/{model,model.test,view}.ts` and `*.css`
- `src/features/landing-site/view.ts`, `src/ui/registry.ts`, `src/ui/registry.test.ts`,
  `index.html`
- `docs/team/{decisions,issues,tasks}.md`, `docs/architecture.md`, `AGENTS.md`

**Problems**

- The first pass of `base/view.ts` and `act/view.ts` captured `run` once and kept using
  the stale value, so a second build or a second sol acted on the original state. Both
  now hold a local mutable `state` and update it after every change.
- `check-markup` requires every `data-*` hook in a view to exist statically inside that
  view's section. Dynamically created build buttons needed a hidden placeholder in
  `#base`.
- The debrief originally named a cause from a single ledger entry. It now sums the last
  five sols and only claims a cause when it is more than half the loss, per the plan's
  attribution rule; otherwise it says it is not sure.
- No browser automation is installed, so the real-browser acceptance pass (TASK-049) is
  still outstanding. `npm run check`, `npx vitest run` (410 passing) and `npm run build`
  all pass.

**Next**

- Human browser pass: naming → briefing → supply → launch → interior → landing-site →
  base → act → debrief → Play again, plus keyboard-only and reduced-motion.
- Decide whether to keep the cut sprites/cutscenes (TASK-047) or ship the loop as is.

---

## 2026-11-07 — Fix the landing-site panel, scores and keyboard (ISS-036 to ISS-039)

**Did**

- Wrapped the two thumbnail layers in the missing `.landing-site__thumbnails`
  positioned container and required it in the view. Without that wrapper the
  absolute images anchored to `.landing-site` (`position: fixed`) and covered the
  whole viewport, swallowing pin clicks; selecting a region then showed the
  thumbnail full-screen. Moved the preview above the site name to match the
  reference panel.
- Made the pin labels visible at rest (they were `opacity: 0`, so the map read as
  nameless) and orange when selected.
- Replaced the per-pin key handlers with one delegated roving-tabindex group:
  the five pins are one Tab stop, `←/→/↑/↓` cycle, `Home/End` jump, and native
  button activation handles Enter/Space.
- Built the five score dots per axis on mount (the markup had empty containers
  and the view toggled `is-filled` on the container itself, so no score ever
  showed) and added `role="img"` + `aria-label="N out of 5"`.
- Fixed two `check-markup` bugs that had hidden this screen: the mounts regex now
  accepts quoted keys, so `landing-site` is validated; Rule 6 now resolves each
  mount id to its view through `registry.ts` instead of searching view files for
  `"#id"` (which only matched interior). `check` now reports six routed screens.

**Files**

- Updated: `index.html` (thumbnail wrapper, pin-list hook), `src/features/landing-site/view.ts`,
  `src/features/landing-site/landing-site.css`, `scripts/check-markup.mjs`,
  `docs/team/issues.md`, `docs/team/progress-log.md`.

**Problems**

- The screen had never been exercised in a real browser: every check was green
  because `check-markup` skipped `landing-site` entirely (ISS-037) and its
  section-scoping rule only ever checked `interior` (ISS-038). Both are fixed.
- The supplied map and thumbnails are 1300×800 and 480–800 KB each, well over the
  plan's 16:9 / 60 KB target. Pin positions are stage percentages, so
  `object-fit: cover` crops the 1.625:1 map inside a 16:9 stage and can drift
  pins off their features. Resize/crop the assets or set the stage to 13:8.

**Next**

- Real-browser acceptance pass on `#/landing-site`: click every pin, confirm the
  panel populates and LAND HERE enables, rove with arrows, test reduced motion
  and back/forward. Resize the map and thumbnails afterwards.

---

## 2026-11-06 — Build the landing-site choice screen (TASK-028, ISS-017)

**Did**

- Added `src/sim/regions.ts`: pure authored table of the five regions (Arcadia
  Planitia, Jezero Crater, Olympus Mons, Valles Marineris, Argyre Basin) with
  pin positions as stage percentages and five axis scores (0-5 integers, higher
  = better). Totals stay within ±1 of 17/25, no perfect site, no randomness.
- Replaced the `features/landing-site/` stubs: `model.ts` now exports
  `scoreRegion`, `tradeoffSummary`, `totalScore` and `strengthAndWeakness`
  (importing the region table from `sim/regions.ts`); added `model.test.ts`
  with 11 literal-input tests covering axes, totals spread, summary wording,
  unknown-id safety and pin bounds.
- Added `features/landing-site/view.ts` (`mountLandingSite(root, run, setRun)`
  → teardown), `landing-site.css`, and the `<section id="landing-site">`
  markup in `index.html` outside `#landing`. Map fades up, five pins are
  keyboard-operable buttons with `aria-pressed` and arrow-key roving, the panel
  is `aria-live="polite"`, score dots fill with a 60 ms stagger, LAND HERE
  enables on first selection, and the landing transition scales the map toward
  the chosen pin then navigates on a tracked timer cleared in teardown.
- Registered `landing-site` in `src/ui/registry.ts` (`SCREEN_MOUNTS` and
  `SCREENS`). `nextStop('interior')` now resolves to `landing-site`; `nextStop('landing-site')`
  stays `landing` until `base` exists. Updated `registry.test.ts` (12 tests).

**Files**

- Added: `src/sim/regions.ts`, `src/features/landing-site/model.test.ts`,
  `src/features/landing-site/view.ts`, `src/features/landing-site/landing-site.css`.
- Updated: `src/features/landing-site/model.ts` (stubs replaced), `index.html`
  (added `#landing-site`), `src/ui/registry.ts`, `src/ui/registry.test.ts`,
  `docs/team/decisions.md` (D-029), `docs/team/tasks.md` (TASK-028 done),
  `docs/team/issues.md` (ISS-017 fixed), `docs/team/progress-log.md`,
  `docs/architecture.md`, `AGENTS.md` §1 and §8.

**Problems**

- None; `npm run check` (imports + markup + tsc) and `npm test` pass cleanly.
  No browser is connected to this session, so keyboard/animation behaviour has
  not been eyeballed in a real browser (ISS-013); the acceptance checklist in
  the plan still needs a browser pass.
- Assets: `Assets/images/landing-site/map.webp` plus five thumbnail WebPs were
  placed by the user before this work; the view imports them as typed assets.

**Next**

- Open `#/landing-site` in a real browser: Tab/arrows to a pin, Enter to select,
  Tab to LAND HERE; confirm the landing transition navigates and back/forward do
  not leave two screens visible. Verify `prefers-reduced-motion` removes the pin
  pulse and reticle spin.

---

## 2026-10-22 — Make the player try again on the ration check, on purpose (ISS-034, ISS-035)

**Did**

- Replaced the timed revert on a wrong answer with a TRY AGAIN button. The alarm frame
  now stays up until the player presses it; pressing it takes the room back to the
  question frame, re-enables the choices that were not retired, and asks the question
  again in the bubble. The retired option stays struck through and stays retired.
- Removed `RETRY_DELAY_MS` from `supply/view.ts` — the timer is gone, and
  `noUnusedLocals` would have failed the typecheck on the dead constant.
- Left the answer out of the working while the player is still trying
  (`workingSentenceBlanked`: "…so 240 divided by 3 is ___ packets.") and completed it
  once the answer has been earned. Both sentences are built from one `workingText`
  helper, so the two versions cannot drift apart.
- Gave no directional hint on the first wrong answer — the alarm frame, the blanked
  working and the question still in the bubble. From the second wrong answer on, the
  hint appears. A direction on the first attempt answers the question of which way to
  go before the method has been used.
- Moved focus to the TRY AGAIN button when a wrong answer lands. Every choice button is
  disabled at that moment, so focus would otherwise fall back to the body and a keyboard
  player would have nowhere to be.

**Files**

- Updated: `src/features/supply/model.ts`, `src/features/supply/model.test.ts`,
  `src/features/supply/view.ts`, `src/features/supply/supply.css`, `index.html`,
  `docs/team/issues.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, this log.
- Added: nothing. No new file, so `docs/architecture.md`'s file tree is unchanged — and
  the supply feature is still missing from its contract table, which is ISS-024.

**Problems**

- `node_modules` was not installed on this machine, so `npm run check` and `npm test`
  could not run at all until `npm install` was run. No dependency was added; the
  install only fetched the dev dependencies already in `package.json`.
- The rail is now one button taller on the right-answer path, because the completed
  working stays up beside CONTINUE where it used to be cleared. It is bottom-anchored
  and 20% wide on the right of the stage, so it grows upward over the wall rather than
  over the astronaut or the checklist — but this has not been looked at in a browser.
- There is still no way to test any of this in the repo. The view is DOM code and Vitest
  runs in node with no DOM (ISS-013), so the flow was checked with a throwaway DOM stub
  — mounted the view, clicked through the six facts, picked a wrong answer, confirmed no
  hint was given and the question was still up, waited past the old 1100ms and confirmed
  nothing moved on its own, pressed TRY AGAIN and confirmed the room went back to the
  question with the wrong option still retired, picked wrong again and confirmed the
  hint arrived that time, then answered correctly and confirmed the completed working.
  The harness was deleted rather than committed: hand-rolled DOM stubs are not a pattern
  this repo has agreed to, and TASK-009 (jsdom) is the right home for it. The model half
  is covered by five new tests on `workingSentenceBlanked`.

**Next**

- Open `#/supply` in a browser and play it through: pick a wrong answer, confirm the
  alarm frame stays, press TRY AGAIN, confirm the question comes back and the struck-
  through option stays dead, then answer correctly and confirm the completed working
  and CONTINUE. Check the rail against the artwork at the same time, since that is the
  one thing that could look wrong — the DOM stub cannot see how it looks.

---

## 2026-10-22 — Replace the parts tour video with an interactive parts panel (ISS-033)

**Did**

- Replaced the `parts.mp4` beat in the launch reel with an interactive parts tour panel: overview slide first, then one named part at a time.
- Each slide shows the part image (from `Assets/images/parts/*.webp`, each with one part outlined in colour), the part name as text, and the part description as text.
- Added Prev / Next buttons between slides, disabled at the boundaries so the player can look back; a Continue button hands off to the next screen.
- Panel is the whole screen: title (accent dot + name), marked-up part image, description, and Prev / Next / Continue at the bottom.
- Cinematic shots/clips are hidden (`visibility: hidden`) behind the panel via a `launch__cinematic-dimmed` class on `root`, so nothing leaks at the edges.
- Moved the Prev/Next/Continue row up (tighter card gap and control margin).
- Added a subtle shake animation (`launch-parts-shake`, 0.4s infinite) on the part image only — text stays still; disabled under reduced motion.
- Navigation wraps from Orion back to the overview once (`partsLooped` flag); fixed `partsNext.disabled` so Next is enabled on Orion (previously disabled, blocking the wrap); shows the "all together" slide one final time with Prev enabled / Next disabled.
- Shake reduced to subtle vibration: scale(0.998/1.002) replaces translateX, creating a whole-rocket trembling feeling without left-right oscillation (was ±4px / ±0.5deg / 0.4s which slid sideways).
- Visual leak fixed: `launch__cinematic-dimmed` CSS now also hides `.launch__video` (the main launch film carrying the walk image) and `.launch__flash`, not just `.launch__shot` and `.launch__clip`.
- Removed `PARTS_DURATION_MS` from the model; `TOTAL_DURATION_MS` is now title + shots + both films only.
- Added `PARTS` interface and array to `launch/model.ts`, with tests.

**Files**

- Updated: `src/features/launch/model.ts`, `src/features/launch/view.ts`, `src/features/launch/launch.css`, `src/features/launch/model.test.ts`, `index.html`, `docs/architecture.md`, `docs/team/issues.md`, this log.

**Problems**

- None; `npm run check` (imports + markup + tsc), `npm test` (263/263), and `npm run build` all pass cleanly. The build drops `parts.mp4`/`parts-poster.webp`/`docked_info.jpg` from the bundle and bundles the five part WebPs instead.

**Next**

- A real browser playthrough of the launch reel (no browser is connected to this session).

---

## 2026-10-21 — Make the launch reel stream smoothly on a slow connection (ISS-032)

**Did**

- Re-encoded the three films at 1280x720, H.264 main, `yuv420p`, with `+faststart` and no
  audio track. The reel is now 2.16 MB instead of 14.10 MB; the frame counts and timings are
  unchanged, so the schedule in `launch/model.ts` still matches the media.
- Checked the new files with PyAV: launch 5.000s/150 frames/1.42 Mb/s, docking
  3.000s/90 frames/0.76 Mb/s, tour 12.000s/360 frames/0.66 Mb/s. The `moov` atom is before
  `mdat` in all three.
- Compared source and encoded frames side by side at the launch, docking and each tour
  caption. The text in the tour is still legible at 720p.

**Files**

- Updated: `Assets/images/launch/launch-cinematic.mp4`, `Assets/video/docking.mp4`,
  `Assets/video/parts.mp4`, `docs/team/issues.md`, this log.

**Problems**

- No browser is connected to this session, so the reel still needs a real slow-network
  playthrough. The build proves the new assets are fingerprinted into `dist/`; it cannot
  prove the user's link now stays ahead of playback.
- 720p is a deliberate trade: smaller and cheaper to decode than the 1080p originals, at the
  cost of some fine detail on a large display. The originals remain in git history.

**Next**

- Deploy the new bundle and test the launch on the same connection that produced the
  slideshow. If it still stutters, the next step is a lower-resolution 540p variant rather
  than another schedule change.

---

## 2026-10-21 — Stop the launch reel showing black and skipping on a slow connection (ISS-030)

**Did**

- Serialised the three films: only the launch film is assigned a `src` at mount; the docking
  clip and the tour load when the beat before them starts, so one film is on the wire at a
  time instead of ~13.8 MB at once.
- Gave each clip a poster frame (`tools/extract-posters.py`, ~90–98 KB each): the pad for the
  film, the finished joint for the docking clip, and the tour's title card — not its first
  frame, which is black.
- Made the reel media-driven: a beat starts at the later of its slot and its clip's readiness
  (`resolveBeatStart`, now in the model and tested), each beat chains on the previous clip's
  `ended`, and the hand-off fires when the tour ends rather than at a fixed 25.25s. A clip
  that errors keeps its poster and advances on its nominal duration.
- The video fade is a class-triggered transition instead of a delayed animation, so the
  dissolve starts when there is a picture rather than on the clock.

**Files**

- Updated: `src/features/launch/view.ts`, `src/features/launch/launch.css`,
  `src/features/launch/model.ts`, `src/features/launch/model.test.ts`, `index.html`,
  `tools/extract-posters.py`, `Assets/images/launch/launch-poster.webp`,
  `Assets/video/docking-poster.webp`, `Assets/video/parts-poster.webp`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/issues.md`, `docs/team/tasks.md`, this log.

**Problems**

- No browser is connected to this session, so the reel could not be watched play. Verified at
  the build layer instead: the built HTML carries `preload="none"` on the two later clips, the
  bundle contains the new logic, the three posters are fingerprinted into `dist/`, and
  `npm run check` + `npm test` (216) pass. The DOM half is untestable here (ISS-013) — the
  media-driven schedule needs a real slow-network check before it is called done.
- The poster frames were chosen by eye from the rendered frames: 0.5s and 2.4s are the frames
  reduced motion already holds, and the tour's is its title card at 0.3s.

**Next**

- Open the launch route on a throttled connection and confirm no black frame, no cut and no
  skip, and that the hand-off waits for the tour. That is the one check this change still
  needs.

## 2026-10-21 — Play the docking clip and the tour after the launch film (ISS-028, ISS-029)

**Did**

- Wired `Assets/video/docking.mp4` and `Assets/video/parts.mp4` into the launch screen: the
  launch film, then the docking clip, then the tour, all from one hand-off. The two start
  times are derived from the three lengths in `launch/model.ts`, so the runtime is 25.25s and
  no clip can overlap the one before it.
- Found that both clips were MPEG-4 Part 2 (`mp4v`), which Chrome and Edge will not decode,
  and switched both renderers to H.264 (`libx264`, `yuv420p`, CRF 18) through PyAV. The
  re-render is the same 90 and 360 frames, silent, and smaller: 1.7 MB and 5.5 MB.
- Reduced motion holds the launch film and the docking clip on a frame and plays the tour,
  because the tour's content is four captions in sequence.

**Files**

- Updated: `src/features/launch/model.ts`, `src/features/launch/view.ts`,
  `src/features/launch/launch.css`, `src/features/launch/model.test.ts`, `index.html`,
  `tools/render-docking.py`, `tools/render-parts.py`, `Assets/video/docking.mp4`,
  `Assets/video/parts.mp4`, `docs/architecture.md`, `docs/team/decisions.md`,
  `docs/team/issues.md`, `docs/team/tasks.md`, this log.

**Problems**

- The codec was the real reason the clips would not have played, and it was invisible from
  the source: `cv2.VideoWriter` accepts `mp4v` and the files open in a desktop player. It
  only shows up when the fourcc is read back or the video is opened in a browser. Logged as
  ISS-029 and fixed before wiring.
- No desktop browser in this session, so the reel was verified at the HTTP layer (both MP4s
  served as `video/mp4`) and from decoded frames, not by watching it play.

**Next**

- The player walks `naming -> briefing -> supply -> launch` and watches the full 25.25s; the
  pacing is three constants in `launch/model.ts` if it drags.

## 2026-10-21 — Retime the parts segment (ISS-027)

**Did**

- Replaced the hand-written segment table with a builder driven by `BEAT_S`, so the runtime
  is derived from the pacing instead of typed beside it. Each part now holds 2.0s, so
  `parts.mp4` is 12.0s / 360 frames, up from 6.6s / 198.
- Measured where the hanging solar panels end (y 0.856–0.859 of the frame across the five
  stills) and moved the lower-third bar from 0.80 to 0.87, so the text sits below the craft.

**Files**

- Updated: `tools/render-parts.py`, `Assets/video/parts.mp4`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- The panel extent could not be read by eye — the panels are thin and the frame is dark.
  Found it by masking blue, low-brightness pixels in the panel column. That measurement is
  now the comment on `BAR_TOP`, so the next person does not have to guess it again.

**Next**

- The player re-watches and says whether 2.0s a part is enough; it is one constant to change.

---

## 2026-10-21 — Render the "meet the spacecraft" segment (D-024)

**Did**

- Measured the five stills. The four part stills are one base render (1364x768) with a
  different part outlined and a baked label card; the overview is a separate render
  (1671x941). The craft is the same scale in both (height 0.932 vs 0.931 of the frame), so
  only the baked cards differ.
- Wrote `tools/render-parts.py`: cross-dissolves the four part stills under a slow push-in,
  draws a lower-third description bar for each, and fades through black in and out of the
  overview. Encodes `Assets/video/parts.mp4` (6.6s, 1920x1080, 30fps, mp4v, silent).
- Added the four descriptions (propulsion, habitat, logistics/safe haven, Orion).
- Converted the five source images to WebP in `Assets/images/parts/`.

**Files**

- Added: `tools/render-parts.py`, `Assets/images/parts/{overview,propulsion,habitat,logistics,orion}.webp`,
  `Assets/video/parts.mp4`, and the docs below.
- Updated: `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- I mapped the four source filenames to the wrong parts — the names carry no hint — so the
  first render paired each description with the wrong image. Caught by viewing the
  keyframes; logged as ISS-025 and fixed by regenerating the assets.
- Two description bars overlapped during a cross-dissolve, because both shots' bars sit at
  the same place. Fixed by staggering the bar fades so only one is ever on screen.
- The overview is a different render, so cross-dissolving it with the stills ghosted both
  sets of baked label cards. Fixed with a fade-through-black for the two overview
  transitions.

**Next**

- The player checks the segment in their editor and confirms the descriptions.
- If a description needs rewording, it is one line in `PARTS` in `tools/render-parts.py`,
  then re-render.

---

## 2026-10-21 — Render the 3-second docking clip (D-023)

**Did**

- Measured the three stills (all 1670x942): the head's bounding box, the ~90px separated gap,
  the ~100px closing shift, and the joint at (66.5%, 52.0%). Sampled pixels rather than
  eyeballing; the head sits entirely over pure black space (R0 G0 B1-9), so its background can
  be rebuilt by inpainting with no Earth reconstruction.
- Wrote `tools/render-docking.py`: cuts the head out as an RGBA sprite (luminance ramp +
  connected-component filter so stars do not ride along), rebuilds the background by
  inpainting the head's *shape*, and moves the sprite across a camera push-in. Encodes
  `Assets/video/docking.mp4` (1920x1080, 30fps, 3.0s, mp4v, silent).
- Effects: a smoothstep approach, a warm glow that builds as the head closes, a contact flash
  and an expanding shockwave ring at 1.80s, a couple of pixels of settle, then a held docked
  frame with a breathing latch ring.
- Converted the three source PNGs to WebP in `Assets/images/docking/`.

**Files**

- Added: `tools/render-docking.py`, `Assets/images/docking/{separated,docked,station}.webp`,
  `Assets/video/docking.mp4`, and the docs below.
- Updated: `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- The first render showed a hard black rectangle where the head had been. The bounding-box fill
  was pure black while the surrounding space carries a subtle gradient, so the rectangle was
  visible. Fixed by inpainting the head's shape instead of filling the box (ISS-023).
- The docking shift came from a cross-correlation whose minimum is flat between 96 and 114px.
  The rendered joint was checked against the reference `docked.webp` crop and lines up, but the
  number is a starting point, not a measurement — tune it against a render if the seam ever
  shows.
- The `architecture.md` file tree predates the launch, briefing and supply features and their
  images, so it does not describe the tree as it is (ISS-024). Only the new entries were added
  here.

**Next**

- The player checks the clip in their editor and confirms the look.
- If docking is ever built as an in-game screen, port the script's geometry constants into a
  `features/docking/` cinematic.

---

## 2026-10-07 - Restore the stills ahead of the film (ISS-022)

**Did**

- Restored the press conference and walk-to-rocket stills verbatim: same shots,
  camera moves, flashes, model tests and markup checker rule.
- Added the film as the final beat: it cross-dissolves in over the walk shot
  starting one fade before the walk ends, playback begins when the walk ends,
  and the hand-off fires the moment the film does.
- Reduced motion now keeps every opacity fade (they are how the sequence is
  timed) and removes only the camera moves and flashes; the film is parked on
  the pad frame for its full duration.

**Files**

- Updated: `src/features/launch/{model,model.test,view}.ts`, `launch.css`,
  `index.html`, `scripts/check-markup.mjs`, `docs/architecture.md`,
  `docs/team/issues.md`, this log.

**Problems**

- The first cut of this fix (ISS-021) deleted the stills outright. Caught by the
  player before any commit; see ISS-022. The lesson is the one the stand-in
  comment already said: a stand-in that looks finished gets removed by the next
  person who arrives, so the stills should have been marked as content, not
  placeholder.

**Next**

- The player confirms the full sequence on the demo machine: title, conference,
  walk, film, hand-off.

---

## 2026-10-07 — Replace Pages deployment with a Vercel CI gate

**Did**

- Replaced GitHub Pages publishing with a Vercel CLI deployment that runs only after the
  `Code checks` workflow succeeds for a push to the default branch.
- Made the deploy workflow fail its gate when checks fail, and prevented native Vercel Git
  deployments from creating an ungated parallel deployment.
- Updated README workflow badges to point to the original repository and Vercel workflow.

**Files**

- Updated: `.github/workflows/deploy.yml`, `README.md`, `docs/CHANGELOG.md`, architecture
  and codebase deployment docs, task TASK-032/TASK-035, and this log.
- Added: `vercel.json` with Git integration deployments disabled and
  `docs/pull-requests/003-vercel-deployment-gate.md`.

**Problems**

- Deployment requires the Vercel project identifiers and API token to be configured as
  GitHub repository secrets. The workflow fails with a direct setup message if any is absent.

**Next**

- Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in the original repository,
  link its Vercel project, then verify a passing default-branch run deploys successfully.

**Doc updates made:** changelog, deployment decision D-022, architecture/codebase contracts,
PR description, tasks, and this progress log.

---


## 2026-10-07 - Wire the launch film into the launch screen (ISS-021)

**Did**

- Moved the rendered film to `Assets/images/launch/launch-cinematic.mp4`, the
  feature's own asset folder.
- Rebuilt the launch screen around it: the title card holds for 900ms, lifts,
  and the film plays once underneath; the hand-off fires at
  `TOTAL_DURATION_MS` (title + film, derived in the model).
- Reduced motion holds one frame of the film (0.5s, the pad) for the same
  runtime instead of playing it.
- Removed the two-still CSS cinematic: the shots, the camera moves, the press
  flashes, and the checker rule that cross-checked their timings.

**Files**

- Updated: `src/features/launch/{model,model.test,view}.ts`, `launch.css`,
  `index.html`, `scripts/check-markup.mjs`, `docs/architecture.md`,
  `docs/team/issues.md`, this log.
- Moved: `Assets/images/launch-cinematic.mp4` -> `Assets/images/launch/launch-cinematic.mp4`.

**Problems**

- The Gyan FFmpeg build has no `-filter_complex_script`, so the filter graph
  was passed inline as a variable instead. No effect on the output.
- `press.webp` and `walk.webp` are now unused. Left in place rather than
  deleted — removing assets is the owner's call.

**Next**

- The player confirms the film plays after the title on the demo machine.
- If the stills are wanted again, they are one import away in `view.ts`.

---

## 2026-10-07 — README header order for PR #2

**Did**

- Reordered the README header to title, astronaut image, badges, short description, then
  index, as requested.
- Moved the existing four-sentence opening description intact; other README prose remains
  unchanged.

**Files**

- Updated: `README.md`, `docs/pull-requests/002-readme-polish.md`, this log, and TASK-034.

**Problems**

- None. The reordering leaves all index IDs and targets unchanged.

**Next**

- Push the update to PR #2 and refresh its description.

**Doc updates made:** PR description, task TASK-034, and this progress log.

## 2026-10-07 — README polish on a separate PR branch

**Did**

- Confirmed the merged CI PR did not include the proposed README polish, then branched from
  the updated `origin/main` to prepare a separate PR.
- Added TypeScript, Vite, Vitest, and MIT badges, the existing astronaut sprite, and an
  index for the existing README sections. Left existing prose untouched.

**Files**

- Updated: `README.md`, `docs/CHANGELOG.md`, this log, and TASK-034 in `docs/team/tasks.md`.
- Added: `docs/pull-requests/002-readme-polish.md`.

**Problems**

- Emoji and numbered headings make generated anchors inconsistent; explicit IDs are used
  for reliable index navigation.

**Next**

- Commit and push this branch, then create PR #2 against `main`.

**Doc updates made:** changelog, PR description, task TASK-034, and this progress log.

## 2026-10-07 — PR #1 review document

**Did**

- Wrote a detailed PR description covering both workflows, HTML validation behavior, the
  deterministic test fix, deployment prerequisites, and command results.
- Kept application source unchanged; the document records the previously validated scope.

**Files**

- Added: `docs/pull-requests/001-ci-deployment-gates.md`.
- Updated: architecture tree, codebase structure map, and TASK-033 tracking.

**Problems**

- GitHub Pages still requires repository-level setup before a successful workflow can
  publish; the PR document calls out that prerequisite.

**Next**

- Add this document to PR #1 and use its full description as the PR body.

**Doc updates made:** architecture file tree, codebase structure map, task TASK-033, and
this progress log.

## 2026-10-07 — CI gates, HTML validation, and Pages deployment

**Did**

- Added a pull-request and `main` CI workflow for imports/typecheck, tests, HTML validation,
  and the production build. Added a separate Pages workflow that runs only after CI succeeds.
- Added HTML validation with inline style attributes and `<style>` elements allowed, a
  changelog, and workflow badges in the project README.
- Narrowed the HTML validator exception to the astronaut image populated by `main.ts`, and
  removed randomness from the existing open-space physics test without relaxing it.
- Mapped the repository into seven evidence-backed documents under `docs/codebase/`.

**Files**

- Added: `.github/workflows/{ci,deploy}.yml`, `.htmlvalidate.json`, `docs/CHANGELOG.md`,
  and `docs/codebase/*.md`.
- Updated: `package.json`, `package-lock.json`, `README.md`, architecture and team tracking
  documents. ISS-012/ISS-015 are fixed; TASK-004/TASK-011/TASK-032 are done.

**Problems**

- No hosting provider was previously configured. GitHub Pages is now the declared target;
  repository Pages settings must be enabled before deployments can publish.
- Dependency installation reported three audit findings (one moderate, two critical),
  which need separate review before treating dependency security as clean.

**Next**

- Commit and push this branch, then open a PR against `main`.
- Enable Pages in repository settings if the team wants the gated workflow to publish.

**Doc updates made:** changelog, architecture file tree, decisions D-021, issue ISS-012,
task TASK-011/TASK-032, and this progress log. README badges added.

## 2026-10-06 — Typed stubs across the whole planned structure

Fourth pass. Smallest change, and the one that was asked for three times before I got it
right.

**Did**

- Replaced "folders with README contracts" with **typed stubs** across the entire planned
  structure: `sim/{resources,sol,run}.ts`, `ui/registry.ts`, `data/spaceweather.ts`, and
  `model.ts` / `view.ts` / `<name>.css` for all four features. 17 new files.
- Every export has a real type and a real signature taken from the project README — the
  five Site Analysis axes, the four starting modules, `ResourceStores`, `RunState`,
  `SolEvent`. **Every function body throws `STUB: ...`.**
- Verified the stubs compile and behave: `npm run check` passes and now scans **27** files
  (was 14), `tsc --noEmit` clean under `strict` + `noUnusedLocals`, `npm run build`
  unchanged because no stub is imported by `main.ts`. Then probed three stubs with a
  throwaway test to confirm they throw rather than return `undefined`, and deleted it.

**Files**

- Added: `sim/{resources,sol,run}.ts`, `ui/registry.ts`, `data/spaceweather.ts`,
  `features/{landing-site,base,act,debrief}/{model.ts,view.ts,<name>.css}`
- Updated for the change: `AGENTS.md` §1 and §8, `docs/architecture.md` (legend, file
  tree, known simplification #2), `docs/team/decisions.md` (D-020)

**Problems**

1. **I gave three progressively smaller answers to one request.** Absent folders, then
   README contracts, then stubs. Each was defensible on its own merits and none of them
   was what was being asked for — the ask was always *put the files in the tree*. The
   cost was three rounds of the owner not being able to see the structure. Logged as
   D-020 rather than quietly fixed.
2. **Stubs are not implementations, and that is a real risk.** A stub that returns
   `undefined` is a trap three weeks later. Mitigated four ways: STUB on line 1 of every
   file, `architecture.md` marks them **stub** rather than complete, `AGENTS.md` §1 states
   it in bold, and every body throws.
3. **No `*.test.ts` stubs, deliberately.** Vitest fails a test file containing no tests,
   so creating `model.test.ts` placeholders would have broken `npm test` — turning a
   cosmetic request into a red build. Checked before writing, not after.
4. **`ui/registry.ts` imports no feature, on purpose.** Wiring it to import all four
   views would have made it claim to route to screens that throw. It stays a stub until
   the first screen is real.
5. **ISS-015 still fires.** This run failed at `src/sim/frame.test.ts:78` rather than
   line 81 — the sibling assertion in the same test, which is the same root cause and a
   good confirmation of the diagnosis. 93 of 94 passed.

**Next**

- **ISS-015.** It has now failed on both assertions in that test, which is enough
  evidence. Pin the test's input; do not loosen the tolerance.
- Fill in `sim/resources.ts` first (TASK-015). Everything else depends on it and it is
  pure, tested work.
- `features/landing-site/model.ts` (TASK-028) is the best screen to start — but the
  resource model underneath it does not exist yet.
- ISS-006 before anyone creates a `.env.local`.

**Doc updates made:** `AGENTS.md` §1 and §8, `docs/architecture.md` (legend, file tree,
known simplification #2), `docs/team/decisions.md` (D-020). `README.md` unchanged — still
wrong about the code, ISS-001, still deferred by D-011.

---

## 2026-10-06 — Placeholder READMEs so the folders are visible

Third pass, same branch. Small change, but it reverses a recommendation I made twice.

**Did**

- The owner reported that five of the seven new paths were not showing in their editor.
  Diagnosed rather than guessed: **19 files were on the branch and never pushed**, and two
  paths (`src/features/`, `src/data/`) did not exist on disk at all.
- Demonstrated git's behaviour directly: created an empty `src/features/demo/`, and
  `git status` reported **nothing**. An empty directory is invisible to git, so "the folder
  does not exist" and "the feature is not built" looked identical to anyone opening the repo.
- Added six `README.md` files: one for `features/`, one per screen folder
  (`landing-site`, `base`, `act`, `debrief`), and one for `data/`. Each states what belongs
  in `model.ts` and `view.ts`, taken from the project README — the five scoring axes, the
  four starting modules, the Power Surplus trade-off, the debrief's teaching promise.
- Chose `README.md` over `.gitkeep` after the owner asked for placeholders: same
  visibility, but it carries the contract. Used the owner's decision, my own framing.

**Files**

- Added: `src/features/README.md`, `src/features/{landing-site,base,act,debrief}/README.md`,
  `src/data/README.md`
- Updated for the change: `AGENTS.md` §1 and §8, `docs/architecture.md` file tree and
  known simplification #2, `docs/team/decisions.md` (D-019)
- No source file added. `npm run check` still scans 14 files — the checker ignores `.md`.

**Problems**

1. **I reported a folder as created when I had deliberately not created it.** The
   folder-structure pass said `src/features/` was "does not exist, by design", then
   summarised itself as building the folder structure. Those two statements are
   incompatible, and I did not flag the difference. The owner spent time debugging a
   missing folder that I had chosen to omit and then failed to say was omitted in the
   summary. Logged as D-019 rather than quietly fixed.
2. **I had recommended against placeholders twice, and the cost was real but asymmetric.**
   My worry — that a placeholder reads as implemented — is now handled by putting
   "Not implemented" in the first line of every README and marking the folders
   "contracts only" in the architecture tree. The owner's cost — an invisible structure
   that looks like a broken checkout — was paid immediately and repeatedly.
3. **Second cause, still outstanding: nothing has been pushed.** The branch
   `docs/agent-orientation` has no upstream. Nine commits before this pass and six more
   with it exist only in this working directory. Anyone on another machine, or looking at
   GitHub, sees the old `src/core/` layout and none of this work.
4. **ISS-015 still fires.** `npm test` is still red roughly 40% of the time on
   `src/sim/frame.test.ts:81`.

**Next**

- Push the branch, or say it stays local. This is the only reason the work is invisible
  outside this folder.
- Close ISS-015.
- Build `features/landing-site/` — the folder and its contract now exist, so it is
  `model.ts`, `model.test.ts`, `view.ts`, `landing-site.css` and nothing else.
- Fix ISS-006 before anyone creates a `.env.local` for `data/`.

**Doc updates made:** `AGENTS.md` §1 and §8, `docs/architecture.md` (file tree, known
simplification #2), `docs/team/decisions.md` (D-019). `README.md` unchanged — still wrong
about the code, ISS-001, still deferred by D-011.

---

## 2026-10-06 — Folder structure for the game, `sim/` rename, hash routing

Second pass on the same branch. All decisions confirmed by the owner first, including
two that change the architecture.

**Did**

- Asked before drawing anything. Five questions established: features for the game with
  `sim/` kept, hash routing, and — after two rounds — that **act is built with no plan
  phase** and that the team picks up tasks one at a time.
- Renamed `src/core/` → `src/sim/`. All three files moved together so their internal
  relative imports stayed valid; only four import lines in `dom/` needed changing.
- Rewrote `scripts/check-imports.mjs` around **zones** — a layer plus, for features, a
  role. Added `cross-feature` (a feature never imports another feature) and
  `purity-inversion` (a `model.ts` may not import its own `view.ts`).
- Added `src/ui/routes.ts` (pure) + `routes.test.ts` (15 tests) + `router.ts` (browser
  glue). Test count 79 → 94.
- Verified the checker both ways with temporary fixtures: legitimate feature code reports
  **zero** violations, and five injected violations each fire with the correct `file:line`.
  Re-verified the `KNOWN` staleness rule against the new rule ids. All fixtures deleted.

**Files**

- Renamed: `src/core/*` → `src/sim/*` (6 files, `git mv`, history intact)
- Added: `src/ui/routes.ts`, `src/ui/routes.test.ts`, `src/ui/router.ts`
- Rewritten: `scripts/check-imports.mjs`, `AGENTS.md`, `docs/architecture.md`
- Edited: `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts` (import paths),
  `docs/team/{issues,decisions,tasks}.md`
- **Not** created: `src/features/`, `src/data/`, `src/sim/{resources,sol,run}.ts`,
  `src/ui/registry.ts` — all marked *does not exist*

**Problems**

1. **I broke my own checker with a comment.** I wrote `features/*/model.ts` inside a
   `/** */` block comment; the `*/` terminated the comment early and the file failed to
   parse with a syntax error. Caught by running it. Ironic, because guarding against
   exactly this class of bug is written into the file two functions below where I
   tripped over it.
2. **Three consecutive false positives in the feature-role classifier**, logged as
   ISS-016. Both of my first two designs rejected valid code: `model.ts` could not import
   its own `types.ts`, and then the same import was misread as a purity inversion. Root
   cause was using filename-inferred role to do two jobs — deciding purity *and*
   deciding import permissions. Fixed by splitting them. This is the failure mode that
   matters most for a checker: a false positive teaches the team to add `KNOWN` entries
   for correct code, which is precisely how a `KNOWN` list grows forever.
3. **`ui/router.ts` is deliberately not wired.** It is implemented and its pure half is
   tested, but `main.ts` does not import it. Half-wiring a router with no features to
   switch to could break the landing page, and the DOM half cannot be verified without a
   browser. Labelled **not wired** in three places so nobody assumes navigation works.
4. **`ui/registry.ts` deferred to the first feature.** It maps routes to feature views, so
   creating it now would mean a file importing modules that do not exist — which the
   checker correctly flags as `unresolved-import`.
5. **Act has no plan phase** (owner-confirmed). Worth recording the consequence plainly:
   debrief is now the only place a player learns why they lost. It is load-bearing, not
   polish, and it carries the README's central teaching promise.
6. **ISS-015 still fires.** `npm test` failed on this pass at `src/sim/frame.test.ts:81`.
   93 of 94 passed. Untouched and unrelated to this pass.

**Next**

- Close ISS-015 before anything else. Still the priority.
- Build `features/landing-site/` (TASK-028) — the best first task: one folder, four
  files, no dependency on the resource model.
- Wire the router only once a feature exists to route to (TASK-027).
- Write `sim/resources.ts` and `sim/sol.ts` (TASK-015, TASK-016) with every test input
  pinned literal, so the ISS-015 pattern is not inherited.
- Sol stepping is still undecided. Whoever takes TASK-016 needs the team's answer first.

**Doc updates made:** `AGENTS.md` (rules table R-1..R-21, data flow, structure rule, where
things live), `docs/architecture.md` (file tree, zone table, contracts, known
simplifications), `docs/team/decisions.md` (D-013..D-018), `docs/team/tasks.md`
(TASK-025..TASK-031), `docs/team/issues.md` (ISS-016, plus path corrections for the
`core/` → `sim/` rename). `README.md` unchanged — still wrong about the code, ISS-001,
still deferred by D-011.

---

## 2026-10-06 — Documentation and workflow system, and the `core/` split

Branch `docs/agent-orientation`. Off `main`, never committed to it.

**Did**

- Interviewed the project owner across two rounds before writing anything, because the
  brief's description of the stack did not match the repository.
- Measured every tracked file: 23 text files, all valid UTF-8, no BOM, **none empty**.
  Ran `npm test` (79 pass) and `tsc --noEmit` (clean) before documenting either.
- Built the documentation system: `AGENTS.md`, `docs/architecture.md`, and
  `docs/team/{decisions,issues,goals,tasks,progress-log}.md`.
- Wrote `scripts/check-imports.mjs` and wired it as `npm run check`. It enforces layer
  boundaries, DOM confinement, network confinement, and inline-handler bans, printing
  `file:line` on every violation.
- Split `src/core/` into a pure `core/` (3 tested modules) and `dom/` (3 untested
  browser modules) with `git mv`, so the layer boundary the checker enforces is real
  rather than aspirational.
- Verified the checker by injecting deliberate violations into temporary fixtures:
  confirmed all six rules fire with correct `file:line`, that `fetchWeather` is *not*
  matched as `fetch`, that a matching `KNOWN` entry is tolerated, and that a stale
  `KNOWN` entry fails the build with a "delete this in the same commit" instruction.
  All fixtures deleted; `git status` confirms none remain.

**Files**

- Added: `AGENTS.md`, `scripts/check-imports.mjs`, `docs/architecture.md`,
  `docs/team/*.md` (5 files)
- Moved: `src/core/{floatAstronaut,pointerGrab,starfield}.ts` → `src/dom/`
- Edited: `package.json` (+`check` script), `src/main.ts` (2 import paths),
  `src/dom/floatAstronaut.ts` and `src/dom/pointerGrab.ts` (3+1 import paths now
  `../core/`)
- Untouched: all 3 core modules, all 3 test files, `index.html`, `vite.config.ts`,
  `tsconfig.json`, every CSS file, `README.md`

**Problems**

1. **The brief described a stack the repository does not have.** It said "vanilla ES
   modules, no bundler"; the repo is TypeScript 5.9 strict with Vite 7.3.6 and Vitest.
   Vite is load-bearing. Surfaced and re-confirmed with the owner rather than documenting
   either story unasked. Recorded as D-001.
2. **`README.md` claims no installable build exists.** It does not: 10 source files, 79
   passing tests, a working build. This is the single most expensive rot in the repo —
   it makes working work look absent to exactly the audience that reads a README first.
   Logged as ISS-001, deliberately not fixed (D-011).
3. **Found a 40%-flaky test nobody knew about.** `frame.test.ts:81` fails in 8 of 20
   consecutive runs, because the test seeds itself from `createAstronautFrame`, which
   calls `Math.random()` five times, while asserting a settled spring to within 1e-5. The
   sprite can bounce off a wall late in the 120-frame window. Confirmed pre-existing:
   `git diff main -- src/core/` is empty for the whole failing path. Logged as ISS-015,
   **not fixed**.
4. **My own first measurement of that flake was wrong.** An initial 30-run loop reported
   zero failures. It was a false negative: the detection regex used `×`, and a
   PowerShell round-trip had mangled that codepoint so the pattern never matched. Re-run
   with ASCII-only detection: 40%. A measurement that reports zero because the detector
   is broken is worse than no measurement — the same class of error as a green test suite
   where everything is mocked.
5. **Two bugs in my own checker, caught only by running it.** First run failed: `dom/`
   could not import `dom/`, and `src/src/...` double-prefixed in a message. A third bug
   surfaced from fixture testing — an extensionless relative import that resolves to
   nothing was silently skipped instead of reported. All three fixed and re-verified.
6. **`tsc` caught a break I introduced.** Moving the DOM modules left `floatAstronaut.ts`
   and `pointerGrab.ts` importing `./deform`, `./drift` and `./frame`, which had become
   `../core/`. Four import paths fixed. Worth noting this is precisely the class of error
   the new checker is meant to catch going forward — it would have flagged all four.
7. **Line endings are already split and git is actively making it worse.** 17 files CRLF,
   6 LF, `core.autocrlf = true`, no `.gitattributes`. Git warned mid-session that
   `pointerGrab.ts` will be rewritten to CRLF the next time it touches the file. All new
   files here are LF. Logged as ISS-005; adding the attributes file was deferred (D-012).
8. **DONKI's CORS behaviour could not be verified.** `ccmc.gsfc.nasa.gov` resolves here
   to a link-local address and times out; `donki.nasa.gov` does not resolve. No response
   means no `Access-Control-Allow-Origin` header was ever observed. D-005 therefore rests
   on an assumption, and ISS-008 blocks the data layer until a human checks it in a real
   browser. By contrast `api.nasa.gov` with `DEMO_KEY` returned 200 with a correct CORS
   header, which *is* verified.
9. **A possible visual bug found by reading, unverified.** `starfield.css` translates each
   layer to `-50%` while `starfield.ts` generates one set of stars per layer with no
   looping duplicate, so the field should drain away over ~70s. Logged as ISS-002 and
   explicitly marked unverified — a browser check may show otherwise.
10. **`.gitignore` omits `.env*`.** Latent today, live the moment anyone creates
    `.env.local` for the data layer — and this is a **public** repository. Logged as
    ISS-006, unowned, high severity.

**Next**

- Close ISS-015 before anything else: a red suite trains six people to ignore red, and it
  blocks CI (TASK-011).
- Close ISS-005 and ISS-006 — both are one-line fixes, both are cheap, and ISS-006 becomes
  a secret disclosure the moment TASK-020 starts.
- One person with a browser answers ISS-008 and ISS-002 in a single session; between them
  they unblock the entire data layer and the largest DOM question.
- Start resource state (TASK-015). It is pure functions with tests, it is the whole game,
  and it is the work this codebase's existing strength is best suited to.
- Decide Supabase (TASK-022). Deferred with no owner and no date against a Nov 8 freeze.
- **The page was never opened in a browser.** The `core/` → `core/`/`dom/` split is
  verified by `npm run check`, `npm test` and `vite build`, and by nothing else. If the
  astronaut does not drift after this lands, the move is the first suspect.

**Doc updates made in this pass:** `AGENTS.md` and everything under `docs/` are new.
`README.md` was **not** updated — its project-status section is wrong (ISS-001) and that
edit was explicitly deferred. No existing documentation file was modified, so no doc was
left stale by this change beyond what was already stale.
