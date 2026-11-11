# Architecture

The annotated truth about this repository as of 2026-11-11. Everything here was read
from the files, not inferred from intent. Where a file is empty or does not exist, it
says so — **an empty file is a promise, not an implementation.**

Read [`../AGENTS.md`](../AGENTS.md) first. This document is the detail behind it.

## What this project is

A Mars outpost survival-strategy game for ages 8-16, in which a child balances five
draining resources — power, oxygen, water, food, radiation shielding — over a
sol-based loop. Students are NASA Space Apps Challenge entrants; Nov 8 2026 is the
feature freeze and Nov 14-15 is the demo.

**The single most important invariant:** `sim/` and each feature's `model.ts` are pure —
no `document`, no `window`, no network. That is what makes the game assertable rather
than eyeballed, and it is what `npm run check` protects.

## The invariant, and why it is enforced

503 tests run in a few seconds with no browser, no jsdom, and no mocks. If `sim/` grew a DOM
reference it would still work, and the cost would surface later as an untestable bug.
Enforced as `no-dom-in-pure-zone`.

## Annotated file tree

Legend: **complete** = does what its name says, verified. **partial** = real code with a
real gap. **stub** = typed signature present, every function body throws. **does not
exist** = planned, nothing written.

```
Mars-Horizon-Junior-Astronaut-Mission-Trainer/
│
├── index.html                          complete   54 lines. All five visual layers and the
│                                                  <script type=module> entry. Contains an
│                                                  external Google Fonts request — see ISS-007.
├── package.json                        complete   6 scripts: dev, build, preview, typecheck,
│                                                  test, check. Zero runtime dependencies.
├── package-lock.json                   complete   generated, do not edit
├── tsconfig.json                       complete   strict, noUnusedLocals, bundler resolution
├── vite.config.ts                      complete   publicDir:false, base:'./', target es2020
├── LICENSE                             complete   MIT, "Team Akrasia 2026". Not mirrored into
│                                                  package.json — see ISS-004.
├── .gitignore                          partial    4 lines. Missing .env* — see ISS-006.
├── .gitattributes                      DOES NOT EXIST   See ISS-005. Cheapest thing to add.
│
├── Assets/
│   ├── images/floating.png             complete   145 KB astronaut sprite, imported from TS so
│   │                                             Vite fingerprints it into dist/
│   ├── images/briefing/                complete   astronaut.webp (203 KB). The cheerful astronaut
│   │                                             between Earth and Mars; the briefing screen's
│   │                                             scene. Imported from TS so Vite fingerprints it.
│   ├── images/launch/                  complete   launch-cinematic.mp4 (6.9 MB, the launch film) and
│   │                                             launch-poster.webp (90 KB, the pad frame the film
│   │                                             is parked on). Both imported from TS so Vite
│   │                                             fingerprints them.
│   ├── images/docking/                 complete   3 WebP stills, ~150 KB each: the separated
│   │                                             spacecraft, the docked craft and the assembled
│   │                                             station. Read by tools/render-docking.py.
│   ├── images/parts/                   complete   5 WebP stills: the all-parts overview and one
│   │                                             per part (propulsion, habitat, logistics,
│   │                                             Orion), each with a different part outlined and a
│   │                                             baked label card. Read by tools/render-parts.py.
│   └── README_ref/*.png                complete   6 UI mockups, ~2.4 MB. Never bundled
│                                                 (publicDir:false exists to exclude them).
├── Assets/video/
│   ├── docking.mp4                     complete   1.7 MB. 3.0s, 1920x1080, 30fps, H.264, silent.
│   │                                             The rendered docking clip. Built by
│   │                                             tools/render-docking.py.
│   ├── docking-poster.webp             complete   97 KB. The finished joint with its latch ring lit,
│   │                                             used as the clip's poster while it buffers. Built by
│   │                                             tools/extract-posters.py.
│   ├── parts.mp4                       complete   5.5 MB. 12.0s, 1920x1080, 30fps, H.264, silent.
│   │                                             The "meet the spacecraft" segment: title, four
│   │                                             labelled parts with descriptions, overview outro.
│   │                                             Each part holds 2.0s so its description can be
│   │                                             read; the lower-third sits below the panels.
│   │                                             Built by tools/render-parts.py.
│   └── parts-poster.webp               complete   98 KB. The tour's "MEET THE SPACECRAFT" title card,
│                                                 used as the clip's poster while it buffers. The first
│                                                 frame would be black, so the poster is a frame in.
│                                                 Built by tools/extract-posters.py.
│
├── tools/
│   ├── extract-posters.py              complete   ~55 lines. PyAV. Writes one WebP poster per film at a
│   │                                             chosen frame, so a clip that is still buffering shows
│   │                                             a picture rather than black. The tour's poster is its
│   │                                             title card, because the clip opens on black.
│   ├── render-docking.py               complete   241 lines. PIL + numpy + OpenCV + PyAV. Cuts the head out
│   │                                             of the separated frame, rebuilds the black space
│   │                                             behind it, and moves the sprite across a headless
│   │                                             background while the camera pushes in.
│   └── render-parts.py                 complete   300+ lines. PIL + numpy + OpenCV + PyAV. Cross-dissolves the
│                                                 four part stills under a push-in, with staggered
│                                                 description bars and fade-through-black bookends.
│
│   All three are dev tools: not scanned by `npm run check`, and they add no runtime dependency.
│
├── scripts/
│   └── check-imports.mjs               complete   Zone + banned-API checker, 9 rule ids.
│                                                 KNOWN set empty; staleness rule verified by
│                                                 running it. See "Layering".
│
├── docs/
│   ├── architecture.md                 this file
│   ├── CHANGELOG.md                    unreleased and deployed project changes
│   ├── game-flow.md                    complete   Mermaid map of every player decision, the
│   │                                             sol loop, what is built, and where a new
│   │                                             event plugs in
│   ├── pull-requests/                   detailed PR descriptions
│   │   ├── 001-ci-deployment-gates.md
│   │   ├── 002-readme-polish.md
│   │   └── 003-vercel-deployment-gate.md
│   ├── codebase/                       evidence-backed repository map
│   │   ├── STACK.md, STRUCTURE.md, ARCHITECTURE.md
│   │   ├── CONVENTIONS.md, INTEGRATIONS.md, TESTING.md, CONCERNS.md
│   └── team/
│       ├── decisions.md                complete   numbered, newest first
│       ├── issues.md                   complete   every logged issue, ISS-001..ISS-040
│       ├── goals.md  tasks.md  progress-log.md
├── .github/workflows/
│   ├── ci.yml                          PR/main checks: typecheck, tests, HTML, build
│   └── deploy.yml                      fails its gate on failed checks; deploys validated default-branch commit to Vercel
├── vercel.json                         disables native Git deployments; Actions owns the deployment gate
├── .htmlvalidate.json                  HTML rules; inline CSS is allowed
│
├── AGENTS.md                           complete   the orientation file
├── README.md                           complete   front page: pitch, science, setup, structure
│                                                 and links to every doc
│
└── src/
    ├── main.ts                         complete   composition root. Resolves the landing elements
    │                                             by id, wires starfield + astronaut, reads
    │                                             ?motion= and prefers-reduced-motion, then starts
    │                                             the router. Owns the single in-memory `RunState`
    │                                             and hands it to screens as (root, run, setRun).
    ├── style.css                       complete   5 lines. Landing-page entry only. Imports the
    │                                             four stylesheets in DOM stacking order.
    ├── vite-env.d.ts                   complete   1 line. Ambient declaration, exempt from
    │                                             zone classification.
    │
    ├── sim/                            PURE. No DOM. No network. Fully unit tested.
    │   │                               Renamed from core/ this pass. "core" described
    │   │                               neither squash-and-stretch nor resource depletion.
    │   ├── drift.ts                    complete   247 lines. DVD-logo drift maths. Exports
    │   │                                         stepDrift, createInitialDrift, driftSpeedForViewport,
    │   │                                         clampToViewport, clampSpeed, rescaleSpeed;
    │   │                                         MIN/MAX_DRIFT_SPEED 96/176, REDUCED_DRIFT_SPEED 34,
    │   │                                         MAX_THROW_SPEED 620. Substeps at 1/120s.
    │   │                                         createInitialDrift calls Math.random() 5 times.
    │   ├── deform.ts                   complete   238 lines. Damped spring for squash-and-stretch.
    │   │                                         Exports createDeform, impact, stretch,
    │   │                                         releaseStretch, stepDeform, isDeformSettled,
    │   │                                         deformScale; STIFFNESS 340, DAMPING 11,
    │   │                                         MAX_COMPRESSION 0.19, MAX_DRAG_COMPRESSION 0.045,
    │   │                                         IMPULSE 3.5.
    │   ├── frame.ts                    complete   197 lines. Composes drift + deform per frame.
    │   │                                         Exports createAstronautFrame, stepAstronaut,
    │   │                                         releaseAstronaut, DRAG_FOLLOW_RATE 14,
    │   │                                         DRAG_STRETCH_SPEED 3400, MIN_THROW_SPEED 60.
    │   ├── drift.test.ts               complete   30 tests
    │   ├── deform.test.ts              complete   30 tests
    │   ├── frame.test.ts               complete   19 tests; open-space trajectory is deterministic
    │   ├── resources.ts                complete   ResourceName, ResourceStores, StoreChange,
    │   │                                         DrainResult, drainForSol, depletedStores,
    │   │                                         createInitialStores. Pure arithmetic, never
    │   │                                         mutates its argument. 18 tests.
    │   ├── sol.ts                      complete   LedgerEntry, SolResult, advanceSol, isRunOver.
    │   │                                         Solar generation, module draw + night drain,
    │   │                                         crew use offset by modules, events,
    │   │                                         clamp/cap, ledger, status. Turn-based (D-030).
    │   │                                         12 tests.
    │   ├── run.ts                      complete   RunStatus, RunState, newRun, landAt, withState,
    │   │                                         applyBuild. RunState is the only thing shared
    │   │                                         between screens; it carries `modules` and the
    │   │                                         per-sol `ledger`. 19 tests.
    │   ├── constants.ts                complete   every tuning number: starting stores, crew use,
    │   │                                         solar per sun score, night drain, storm severity,
    │   │                                         build costs, target sol (20), power cap,
    │   │                                         battery charge. Edit here to retune.
    │   ├── modules.ts                  complete   ModuleKind, ModuleSpec, MODULE_CATALOGUE,
    │   │                                         STARTING_MODULES, canBuild, adjustedBuildCost,
    │   │                                         buildPreview, upkeepFor, extraBatteryCount.
    │   │                                         Catalogue in `sim/` because `act` needs it and
    │   │                                         cannot import `base` (D-032). 25 tests.
    │   ├── forecast.ts                 complete   ForecastEvent, FlareInput, ForecastKind,
    │   │                                         flareIntensity, createForecast(flares, seed?,
    │   │                                         dustScore?), createSeededRandom, planEvents,
    │   │                                         randomSolBetween, stormChance, visibleForecast,
    │   │                                         eventsStartingOn, stormOn, stormOpacity.
    │   │                                         The timetable is seeded per run (D-048); only
    │   │                                         the flare size comes from data/.
    │   ├── crises.ts                   complete   Crisis, CrisisOption, crisisForEvent,
    │   │                                         pendingCrisis, optionOf, decide, earthIsInTime,
    │   │                                         earthAdvice. Each forecast event stops the
    │   │                                         clock and asks for a choice (D-029).
    │   ├── comms.ts                    complete   REAL_MIN/MAX_ONE_WAY_MINUTES, oneWayMinutes,
    │   │                                         roundTripMinutes, earthCanAnswerInTime. A
    │   │                                         simplified rising delay over the real range.
    │   ├── balance.test.ts             complete   9 acceptance tests: default survives the storm,
    │   │                                         default cannot win, a thoughtful build wins
    │   │                                         three of five regions, over-building loses,
    │   │                                         sun-vs-water failures differ.
    │   └── regions.ts                  complete   The five landing regions: id, name,
    │                                             blurb, pin {x, y} as stage %, and five
    │                                             axis scores (0-5). Pure authored data,
    │                                             no randomness. Exports SiteAxis,
    │                                             SITE_AXES, SiteScore, Region, REGIONS,
    │                                             totalScore. Read by landing-site, base
    │                                             and act without cross-feature imports.
    │
    ├── ui/                             CROSS-SCREEN BROWSER GLUE. No framework, so no components.
    │   ├── routes.ts                   complete   Pure route table and hash parsing. Exports
    │   │                                         Route, ROUTE_ORDER, DEFAULT_ROUTE, parseRoute,
    │   │                                         routeToHash, nextRoute, previousRoute. No DOM,
    │   │                                         so it is unit tested like sim/.
    │   ├── routes.test.ts              complete   19 tests. Every input literal — no Math.random,
    │   │                                         no clock, so it cannot flake.
    │   ├── registry.test.ts            complete   13 tests over the route → screen tables
    │   ├── router.ts                   complete   startRouter(options) -> teardown, and
    │   │                                         navigate(route). Reads location.hash, listens for
    │   │                                         hashchange, normalises an unknown hash to the
    │   │                                         default via replaceState, and mounts/unmounts
    │   │                                         exactly one screen. Stops any read-aloud before
    │   │                                         a route change. Wired into `main.ts`.
    │   │                                         DOM behaviour UNVERIFIED in a browser.
    │   ├── button-strip.ts             complete   createButtonStrip(root, options) -> ButtonStripSpec;
    │   │                                         full-width fixed-height bottom strip owning Next /
    │   │                                         Prev / action buttons; teardown mandatory.
    │   ├── button-strip.css            complete   structural styles only (flex row, gap, padding);
    │   │                                         features theme colours in their own CSS.
    │   ├── readAloud.ts               complete   canReadAloud(), readAloud(text, onDone?),
    │   │                                         stopReading(). Browser speechSynthesis only:
    │   │                                         no audio file, no network, hidden where
    │   │                                         unsupported. Cancels any playing passage
    │   │                                         before starting a new one (D-043).
    │   ├── readButton.ts              complete   readButton(getText, options?) -> button |
    │   │                                         null. Shared toggle around readAloud: label
    │   │                                         flips, aria-pressed tracks state, and a
    │   │                                         cancelled passage cannot reset a newer one.
    │   │                                         `getText` runs at click time so a screen can
    │   │                                         read what it has revealed so far.
    │   ├── nasaCard.ts                complete   nasaCard(card, kicker?) -> figure. One image,
    │   │                                         caption, fact, credit and source link, plus
    │   │                                         the shared read-aloud control when the browser
    │   │                                         has speech. Static data only: no runtime fetch.
    │   ├── nasa-card.css              complete   card frame, caption type scale, action row.
    │   ├── registry.ts                 complete   the one composition seam. Exports ScreenFactory,
    │   │                                         screenMount, resolveScreen, nextStop,
    │   │                                         allScreenMounts. Maps all ten built routes onto
    │   │                                         feature views; the only file permitted to import
    │   │                                         them. `ScreenFactory` is (root, run, setRun) ->
    │   │                                         teardown. Returns null for routes with nothing
    │   │                                         built, so the router can fall through.
    │   ├── baseLayout.json             complete   where every copy of every module stands on
    │   │                                         the outpost panel: a list of poses per kind,
    │   │                                         {left, bottom, width, flip?} each, in
    │   │                                         percent. The nth entry is where the nth copy of
    │   │                                         that kind stands. The file a developer produces
    │   │                                         with the placement editor (D-065, D-066). The
    │   │                                         stacking order is not here — it is a rule
    │   │                                         (D-069).
    │   ├── baseLayout.ts               complete   loads and validates baseLayout.json. Exports
    │   │                                         ModuleSpot, ModulePoses, SPOT_BAND,
    │   │                                         PANEL_RIGHT_EDGE, DEFAULT_POSES, MODULE_POSES,
    │   │                                         LAYOUT_PROBLEMS, clamp, clampSpot, roundSpot,
    │   │                                         resolvePoses, describeLayoutProblems,
    │   │                                         buildLayoutJson, pointToPercent, poseFor. A
    │   │                                         kind the file cannot supply falls back to
    │   │                                         DEFAULT_POSES; an out-of-range number is
    │   │                                         clamped, not discarded.
    │   ├── baseLayout.test.ts          complete   54 tests. Every input literal.
    │   ├── gameLoop.test.ts            complete   9 tests — the first for this file. Where each
    │   │                                         copy of a module stands, which way round it
    │   │                                         faces, and the order they are stacked in.
    │   ├── baseLayoutEditor.ts         complete   the placement editor (D-065, D-066, D-067,
    │   │                                         D-068). Exports startLayoutEditor(root) ->
    │   │                                         teardown. Dev-only: a developer drags the
    │   │                                         fifteen copies of the modules on the real
    │   │                                         outpost panel with ?editlayout=1, resizes them
    │   │                                         with the corner grip, mirrors them, and
    │   │                                         downloads baseLayout.json. It opens showing the
    │   │                                         layout on disk, and warns about a file with
    │   │                                         problems in it. Loaded by a dynamic import in
    │   │                                         main.ts, so it is compiled out of a
    │   │                                         production build entirely.
    │   ├── base-layout-editor.css      complete   the editor's overlay: the drag handles, the
    │   │                                         guide band and the toolbar. Imported by
    │   │                                         baseLayoutEditor.ts only.
    │   └── gameLoop.ts                 complete   the shared game-loop chrome from the Figma
    │                                             frames (D-038): gameHeader, gameHud, gameDock,
    │                                             gameWorld, gamePanel, gameScreen, gameSection,
    │                                             moduleFigures. Presentation only — every word
    │                                             and number arrives as an argument, and it owns
    │                                             the shared artwork imports so base, act and
    │                                             debrief do not copy them. `gameHeader` takes an
    │                                             optional `onLeave`: with it the right-hand label
    │                                             becomes a Menu button opening an in-screen
    │                                             leave dialog (D-044); without it the old plain
    │                                             label stays. The module layout comes from
    │                                             `baseLayout.ts`, not from a literal here.
    │
    ├── dom/                            landing-page side effects only. Untested (ISS-011).
    │   ├── floatAstronaut.ts           complete   218 lines. The rAF loop, the two transforms, the
    │   │                                         resize handler, the grab lifecycle. Exports
    │   │                                         startFloatingAstronaut -> teardown. Discards deltas
    │   │                                         over 50ms.
    │   ├── forecastLoader.ts           complete   LoadedForecast; loadForecast(signal?, seed?,
    │   │                                         dustScore?) fetches the flares and runs
    │   │                                         createForecast. The join between data/ and sim/,
    │   │                                         shared by base and act without a cross-feature
    │   │                                         import. Never rejects.
    │   ├── pointerGrab.ts              complete   207 lines. Exports attachGrab -> teardown.
    │   │                                         Velocity is a 100ms windowed average, EMA smoothed.
    │   └── starfield.ts                complete   63 lines. 140 stars across three depth layers.
    │                                             Suspect: layers animate with no looping copy —
    │                                             ISS-002, unverified in a browser.
    │
    ├── data/                           COMPLETE. The only zone allowed to fetch.
    │   ├── README.md                   the quarantine rules and the live-source chain
    │   ├── spaceweather.ts             complete   SpaceWeatherEvent, SpaceWeatherSource
    │   │                                         ('donki' | 'noaa' | 'fallback'),
    │   │                                         parseFlares, parseNoaaFlares,
    │   │                                         fetchSpaceWeather, lastSource, lastDetail,
    │   │                                         describeWhen. NASA DONKI -> NOAA SWPC ->
    │   │                                         an empty fallback, in that order; every
    │   │                                         flare is kept, not just the strongest.
    │   └── spaceweather.test.ts        complete   25 tests; every fetch is injected
    │   ├── nasaGallery.ts             complete   Twelve sol cards plus a closing card,
    │   │                                         five real region photos and a rotating
    │   │                                         fact list. Static by choice (D-042):
    │   │                                         no runtime image API, and the words
    │   │                                         are unit tested here.
    │   └── nasaGallery.test.ts        complete   20 tests; ids resolve, credits and links
    │                                             present, length caps enforced, facts
    │                                             wrap deterministically.
    │
    ├── features/                       one folder per screen. Every journey screen is built.
    │   │                               There are no feature stubs left.
    │   ├── README.md                   the layout contract: four files, depth 2, which rules are
    │   │                               enforced vs convention
    │   ├── naming/                     COMPLETE   Scene one. The entry screen.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   104 lines. Exports MAX_NAME_LENGTH (24),
    │   │   │                                     NameProblem, NameCheck, normaliseName,
    │   │   │                                     checkName, displayName. Pure; length counted in
    │   │   │                                     code points so an emoji costs 1, not 2.
    │   │   ├── model.test.ts            complete   21 tests, every input a literal
    │   │   ├── view.ts                  complete   mountNaming(root, run, setRun) -> teardown.
    │   │   │                                     Validates on every keystroke; START MISSION
    │   │   │                                     disabled until the name is usable.
    │   │   └── naming.css               complete   measured palette + naming-mars-turn (150s) and
    │   │                                         naming-astronaut-float (9s), both removed under
    │   │                                         prefers-reduced-motion
    │   ├── briefing/                   COMPLETE   The mission briefing.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   BEATS, beatsThrough, greetingFor. Pure.
    │   │   ├── model.test.ts            complete   literal-input tests
    │   │   ├── view.ts                  complete   mountBriefing(root, run, setRun) -> teardown.
    │   │   │                                     One beat at a time under the artwork; NEXT or
    │   │   │                                     Enter advances, Enter confirms on the last beat.
    │   │   └── briefing.css             complete   aspect-locked artwork + message bubble
    │   ├── supply/                     COMPLETE   The ration-check puzzle.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   SUPPLY_BEATS, packsFor, judge, hintFor,
    │   │   │                                     workingSentence, approximateTotalKg. 49 tests.
    │   │   ├── model.test.ts            complete   49 literal-input tests
    │   │   ├── view.ts                  complete   mountSupply(root, run, setRun) -> teardown
    │   │   └── supply.css               complete   beats and the ration check
    │   ├── launch/                     COMPLETE   The launch reel and spacecraft tour.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   TITLE, SHOTS, PARTS, beat durations,
    │   │   │                                     resolveBeatStart. 32 tests.
    │   │   ├── model.test.ts            complete   32 literal-input tests
    │   │   ├── view.ts                  complete   mountLaunch(root, run, setRun) -> teardown;
    │   │   │                                     media-driven beats, poster frames
    │   │   └── launch.css               complete   film stage, parts tour, reduced motion
    │   ├── interior/                   COMPLETE   Walk the station and visit every room.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   ROOMS, walker stepping, sprite mapping,
    │   │   │                                     visited tracking. 42 tests.
    │   │   ├── model.test.ts            complete   42 literal-input tests
    │   │   ├── view.ts                  complete   mountInterior(root, run, setRun) -> teardown
    │   │   └── interior.css             complete   room stage, walker and exit prompts
    │   ├── landing-site/               COMPLETE   TASK-028. Choose a landing region, score 5 axes.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                           complete   REGIONS, scoreRegion,
    │   │   │                                       tradeoffSummary, totalScore,
    │   │   │                                       strengthAndWeakness. Pure, 11 tests.
    │   │   ├── model.test.ts                      complete   11 literal-input tests
    │   │   ├── view.ts                            complete   mountLandingSite(root, run, setRun) -> teardown
    │   │   └── landing-site.css                   complete   16:9 stage, five pins, Site Analysis panel
    │   ├── base/                       COMPLETE   TASK-029. Outpost overview and build panel.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   BUILDABLE, canPlace, addModule,
    │   │   │                                     removeModule, pointsLeft, upkeepFor,
    │   │   │                                     previewFor, previewSummary, upcomingWarnings.
    │   │   │                                     Re-exports the `sim/modules.ts` catalogue
    │   │   │                                     (D-032).
    │   │   ├── model.test.ts            complete   14 literal-input tests
    │   │   ├── view.ts                  complete   mountBase(root, run, setRun) -> teardown.
    │   │   │                                     Rebuilt on the game-loop shell (D-038): the
    │   │   │                                     outpost on Mars, the catalogue, five cards.
    │   │   └── base.css                 complete   the budget line and card reasons only
    │   ├── act/                        COMPLETE   TASK-030. Turn-based sol control (D-030).
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   MISSIONS, missionHeadline, meterRows,
    │   │   │                                     toneFor, progressPercent, secondsLeft,
    │   │   │                                     powerSentence. Pure, 8 tests.
    │   │   ├── model.test.ts            complete   8 literal-input tests
    │   │   ├── view.ts                  complete   mountAct(root, run, setRun) -> teardown.
    │   │   │                                     Advance sol -> advanceSol; on a finished run,
    │   │   │                                     setRun then navigate to `debrief`. A crisis
    │   │   │                                     replaces the mission panel (D-040).
    │   │   └── act.css                  complete   crisis option artwork only; the frame is shared
    │   └── debrief/                    COMPLETE   TASK-031. Why the run was won or lost.
    │       ├── README.md                           the contract
    │       ├── model.ts                 complete   Explanation, ConsumptionSummary, NextStep,
    │       │                                     explainOutcome, consumptionSummary,
    │       │                                     blackoutSols, reviewDecisions, timeline,
    │       │                                     lowestPoints, usedApproximateData,
    │       │                                     nextSteps, wentEmpty. Conservative ledger
    │       │                                     attribution. 18 tests.
    │       ├── model.test.ts            complete   18 literal-input tests
    │       ├── view.ts                  complete   mountDebrief(root, run, setRun) -> teardown.
    │       │                                     Results panel, plus the journal as a mode
    │       │                                     (D-039): decisions, sol table, honesty note.
    │       └── debrief.css              complete   tip cards, journal entries, two-link footer
    │   ├── encyclopedia/             COMPLETE   Equipment reference: one line per item,
    │   │   │                           expand to full detail with a real NASA fact.
    │   │   ├── README.md                           the contract
    │   │   ├── model.ts                 complete   entries(), entryFor(), one line per
    │   │   │                                     module kind plus a NASA fact index.
    │   │   ├── model.test.ts            complete   6 literal-input tests
    │   │   ├── view.ts                  complete   mountEncyclopedia(root, run, setRun)
    │   │   │                                     inside the game-loop shell
    │   │   └── encyclopedia.css         complete   list and expandable cards
    │
    └── styles/                         shared CSS: the landing page, the game-loop frame
        ├── base.css                    complete   94 lines. Tokens, reset, backdrop, nebulae.
        │                                         Comment at line 60 is stale — ISS-014.
        ├── starfield.css               complete   70 lines. Carries the suspect ISS-002 animation.
        ├── astronaut.css               complete   82 lines. Three nested elements each owning one
        │                                         transform, plus sway/breathe keyframes.
        ├── message.css                 complete   125 lines. Title, cursor, vignette, reduced-motion
        │                                         block. Lines 100-101 contradict 110-113 — ISS-003.
        └── game-loop.css               complete   the `.gl` frame for base, act and debrief (D-038):
                                                  header, HUD cards, world, dock, panel, cards,
                                                  choices, clock, journal; imported by each
                                                  feature's view.ts (R-15)
```

### The shape of a feature

```
src/features/<name>/
├── model.ts         pure. Game rules for this screen. Unit tested.
├── model.test.ts    every input literal — never Math.random, never the clock
├── view.ts          DOM only. Imports its own model.ts. Nothing else.
└── <name>.css       imported by view.ts, never added to style.css
```

Rules the checker enforces: no feature imports another (`cross-feature`); a `model.ts`
may not import its own `view.ts` (`purity-inversion`); `model.ts`, `types.ts`,
`constants.ts` and `*.test.ts` stay pure (`no-dom-in-pure-zone`).

## Layering

Enforced by `npm run check`. Every violation prints `file:line`. Zones:

| zone | may import | may not | contains |
| --- | --- | --- | --- |
| `sim/` | `sim/` | everything else | pure maths, tested |
| `data/` | `data/`, `sim/` | `dom/`, `ui/`, features | the only place `fetch` may appear |
| `dom/` | `dom/`, `data/`, `sim/` | `ui/`, features | rAF, DOM writes, pointer events |
| `ui/` | `ui/`, `dom/`, `data/`, `sim/` | features | routing and screen registry |
| `features/<f>/model.ts` | same feature, `sim/` | DOM, network, other features | pure rules |
| `features/<f>/view.ts` | same feature, `ui/`, `dom/`, `data/`, `sim/` | other features | one screen's DOM |
| `main.ts` | anything | — | composition root, owns `RunState` |

Two rules sit outside the zone table:

- **`cross-feature`** — a feature may not import another feature. Zone names are shared
  by all features, so the table alone cannot say "my own model but not someone else's".
  State crosses screens through `RunState`, passed explicitly from `main.ts`.
- **`purity-inversion`** — a `model.ts` may not import its own `view.ts`. Intra-feature
  imports are otherwise unrestricted, because a model legitimately needs its own
  `types.ts` and a view legitimately needs its own model.

Banned APIs:

| rule | banned | allowed in |
| --- | --- | --- |
| `no-alert` | `alert`, `confirm`, `prompt` | nowhere |
| `no-dom-in-pure-zone` | `document`, `window` | `dom/`, `ui/`, feature `view.ts`, `main.ts` |
| `no-network-outside-data` | `fetch`, `XHR`, `WebSocket`, `EventSource`, `sendBeacon` | `data/` only |
| `no-inline-handler` | `on*="..."` in markup | nowhere |
| `layer-boundary` | any import not in the table above | — |
| `cross-feature` | `features/a/` importing `features/b/` | — |
| `purity-inversion` | a `model.ts` importing its own `view.ts` | — |
| `unresolved-import` | a relative path resolving to nothing | — |
| `unknown-layer` | a file in `src/` outside every declared zone | — |

### The KNOWN set

`KNOWN` in `scripts/check-imports.mjs` holds pre-existing tolerated violations keyed
`"path:line:ruleId"`. **It is currently empty** — after the zone split there are no
outstanding violations. Seeding it with a speculative entry would be worse than leaving
it empty, because an entry matching nothing is caught by the staleness rule and fails the
build immediately.

The staleness rule is implemented and verified by running it: an entry matching no
current violation prints `delete KNOWN entry: "..."` and exits 1. **Fix a KNOWN violation
and delete its entry in the same commit.**

## Data flow

```
index.html → main.ts → { createStarfield, startFloatingAstronaut }
startFloatingAstronaut → rAF tick → stepAstronaut (pure) → render transforms
                                     │
             ┌───────────────────────┴────────────────────┐
             v                                            v
      stepDrift (position, bounces)              stepDeform (spring)
             │  impact {normal, speed}                 │
             └────────────────> impact()/stretch() <────┘

ui/router.ts → location.hash → parseRoute (pure) → onRoute(route) → main.ts
             → registry.resolveScreen → features/*/view.ts → teardown on navigate away
             → (dev build, ?editlayout=1) ui/baseLayoutEditor overlays the outpost panel
```

The rotation behind the menu is **CSS keyframes**, not JavaScript: `naming-mars-turn`
(150s) and `naming-astronaut-float` (9s), both removed under
`prefers-reduced-motion`. No `requestAnimationFrame` is involved, so there is no loop
to leak on navigation and the menu needs no teardown for them.

The planet rotates **in the image plane** (`rotate()`), not on a 3D axis. This is
forced by the asset: a sphere spun about its own axis looks identical, so a `rotateY`
would appear to do nothing (D-020).

Zero storage and no backend. The only state is the in-memory `RunState` that
`main.ts` owns and passes to each screen as `(root, run, setRun)`; a refresh loses it,
because persistence is deferred (D-003).

The one network path outside the landing page is space weather. `base` and `act` call
`dom/forecastLoader` → `data/spaceweather`, which tries NASA DONKI, then NOAA SWPC, then
an empty fallback. The event *schedule* is seeded per run in `sim/forecast.ts` (D-048);
the flare *size* is the part that comes from the network.

Where the modules stand on the outpost panel is **data, not code**. `ui/baseLayout.json`
holds it — a pose list per kind, one entry per copy the player could build — and
`ui/baseLayout.ts` validates it; `ui/gameLoop.ts` places the modules with it. A developer
produces that file by dragging the modules on the real screen with `?editlayout=1`
(D-065, D-066). The editor is a developer tool, not a screen: it has no route, no mount
point and no registry entry, and `main.ts` loads it with a dynamic import behind
`import.meta.env.DEV`, so it is compiled out of a production build entirely.

## Boot order

1. `index.html` parses. Five layers exist: `#starfield`, `#astronaut`, `.stage`,
   `.vignette`, plus `body::before`/`::after` backdrops.
2. Google Fonts request — the only network request (ISS-007).
3. `<script type="module">` loads `/src/main.ts`, which imports `style.css` first.
4. Vite resolves `floating.png` to a fingerprinted URL.
5. `main.ts` waits for `DOMContentLoaded` if `readyState === 'loading'`, else boots now.
6. `bootstrap()` resolves four elements by id via `requireElement`, which **throws** on a
   missing id rather than returning null.
7. `astronautImg.src` and `draggable = false` are set.
8. `createStarfield(starfield)` appends 140 stars in one `DocumentFragment`.
9. `readMotionOverride()` parses `?motion=`; `matchMedia` reads the OS preference.
10. `applyMotionPreference()` stops any previous loop, then calls
    `startFloatingAstronaut`, storing the teardown.
11. The `change` listener attaches **only** when no URL override was requested.
12. The first `requestAnimationFrame` is scheduled.
13. `main.ts` collects the landing page's own layers into `landingLayers`, then
    `startScreenRouter()` calls `startRouter`, which resolves the hash — defaulting to
    `naming` — and mounts that screen, hiding the landing layers behind it.
14. In a dev build with `?editlayout=1`, `main.ts` loads `ui/baseLayoutEditor` with a
    dynamic import. The editor is attached to whichever screen is mounted, and to
    nothing in a production build (D-065).
15. In a dev build, a layout file with problems in it is listed in the console
    (D-068). The game still starts: it falls back to what it can.

Routing is last so every screen it can mount is already defined. `BACK TO MAIN MENU`
returns to `landing`, which keeps running behind the mounted screen.

## Module contracts

| module | exports | contract |
| --- | --- | --- |
| `main.ts` | none (side effects) | composition root; throws on a missing element id. Also the one place that starts the placement editor, and only in a dev build with `?editlayout=1` (D-065) |
| `dom/forecastLoader` | `LoadedForecast`, `loadForecast` | `(signal?, seed = Date.now(), dustScore = NEUTRAL_SCORE.dust) -> Promise<LoadedForecast>`; never rejects. Fetches flares through `data/spaceweather`, then runs `sim/forecast.createForecast`. Sits in `dom/` because it joins `data/` and `sim/`, and both `base` and `act` need it without importing each other (R-5) |
| `data/spaceweather` | `SpaceWeatherEvent`, `SpaceWeatherSource` | a flare as the game uses it; source is `'donki' \| 'noaa' \| 'fallback'` |
| | `fetchSpaceWeather` | `(options?) -> Promise<SpaceWeatherEvent[]>`; never rejects. Tries NASA DONKI, then NOAA SWPC, then the empty `FALLBACK_FLARES`. Every flare is kept, not just the strongest. Remembers one answer so two screens cost one request; an answer abandoned by its caller is not remembered |
| | `parseFlares`, `parseNoaaFlares` | `(json) -> SpaceWeatherEvent[]`; validate every field and drop anything malformed rather than trusting the wire |
| | `lastSource`, `lastDetail`, `resetSpaceWeather` | what the UI reports; reset is for tests |
| | `describeWhen` | `(peakTime) -> string`, e.g. `11 May 2024`; `'recently'` on a bad date |
| `data/nasaGallery` | `NasaFigure`, `NasaCard`, `RegionCard`, `NASA_CARDS`, `NEXT_HORIZON_CARD`, `REGION_CARDS`, `NasaFact`, `FACTS`, `cardForSol`, `regionCard`, `factFor` | twelve curated sol cards plus one closing artist concept; five region photos; a rotating fact list. Every card carries an id, alt text, caption, fact, credit and source link. `cardForSol(sol)` and `regionCard(id)` return the card or `null`; `factFor(seed)` wraps deterministically so a screen can rotate facts without `Math.random` |
| `ui/readAloud` | `canReadAloud`, `readAloud`, `stopReading` | `(text, onDone?) -> boolean`; false when unsupported or the text is empty. Starts cancel any current passage first, and `stopReading()` is safe when nothing plays. Browser speech only (D-043) |
| `ui/readButton` | `readButton` | `(getText, options?) -> HTMLButtonElement \| null`; a toggle whose label, `aria-pressed` and pause hooks (`onStart`, `onStop`) are shared by every screen that reads aloud. Returns null where speech is unavailable |
| `ui/nasaCard` | `nasaCard` | `(card: NasaFigure, kicker?) -> figure`; picture, alt, caption, "Did you know?", credit and source link, plus the shared read-aloud control only when `canReadAloud()` is true. The kicker defaults to the sol for a `NasaCard` and to a plain NASA label otherwise |
| `sim/drift` | `stepDrift` | `(state, dt, size, viewport) -> DriftResult`; reflects off walls, returns the fastest `Impact` or null |
| | `createInitialDrift` | `(size, viewport, speed) -> DriftState`; random 30-45 degree diagonal. **5 `Math.random()` calls** |
| | `driftSpeedForViewport` | `(width) -> number`, clamped 96..176 px/s |
| | `clampToViewport`, `clampSpeed`, `rescaleSpeed` | position/velocity utilities |
| | `REDUCED_DRIFT_SPEED` 34, `MIN_DRIFT_SPEED` 96, `MAX_DRIFT_SPEED` 176, `MAX_THROW_SPEED` 620 | tunables, px/s |
| `sim/deform` | `createDeform` | zeroed `DeformState` |
| | `impact` | `(state, angle, strength, profile) -> DeformState`; velocity impulse, does not stack above full strength |
| | `stretch` | same shape; sets `target`, never an impulse |
| | `releaseStretch` | zeroes `target` |
| | `stepDeform` | `(state, dt) -> DeformState`; substepped semistplicit Euler |
| | `isDeformSettled` | tolerance 0.0015 / 0.02 |
| | `deformScale` | `(state) -> {along, across}`; `across` is the exact reciprocal, conserving area |
| | `STIFFNESS` 340, `DAMPING` 11, `MAX_COMPRESSION` 0.19, `MAX_DRAG_COMPRESSION` 0.045, `IMPULSE` 3.5 | tunables |
| `sim/frame` | `createAstronautFrame` | `(size, viewport, speed) -> AstronautFrame` |
| | `stepAstronaut` | `(frame, dt, grab, options) -> AstronautFrame`; steps the spring unconditionally |
| | `releaseAstronaut` | clamps into the viewport; discards throws under reduced motion |
| | `DRAG_FOLLOW_RATE` 14, `DRAG_STRETCH_SPEED` 3400, `MIN_THROW_SPEED` 60 | tunables |
| `sim/regions` | `SiteAxis` | `'water' \| 'sun' \| 'terrain' \| 'dust' \| 'temp'` |
| | `SITE_AXES` | the five axes in order |
| | `SiteScore` | `readonly water, sun, terrain, dust, temp` (each 0-5) |
| | `Region` | `id, name, blurb, pin {x, y}, scores` — the five authored regions |
| | `REGIONS` | `readonly Region[]` — Arcadia, Jezero, Olympus, Valles, Argyre |
| | `totalScore` | `(score) -> number`, sum of the five axes, 0-25 |
| `sim/constants` | tuning constants | `CREW`, `TARGET_SOL` 20, `BASE_STORES`, per-sol crew use, solar per sun score, night drain, storm severity, build costs, power cap, battery charge. **Every number lives here** — edit here to retune, then re-run the balance tests |
| `sim/resources` | `ResourceName`, `ResourceStores` | the five stores as 0-100 percentages; `readonly` |
| | `StoreChange` | `{ store, cause, delta }` — one line of the ledger |
| | `drainForSol` | `(stores, sol, powerDraw, solarArrays, modules, region) -> DrainResult`; pure, never mutates its argument. Takes pre-computed draw/arrays so `resources` never imports `modules` |
| | `depletedStores` | `(stores) -> ResourceName[]`; the stores at or below zero |
| | `createInitialStores` | `() -> ResourceStores` |
| `sim/modules` | `ModuleKind` | the nine catalogue kinds |
| | `MODULE_CATALOGUE`, `STARTING_MODULES` | every spec, and the modules a run begins with |
| | `canBuild` | `(kind, modules, stores, terrain) -> boolean` |
| | `adjustedBuildCost` | `(kind, terrain) -> number` |
| | `buildPreview` | `(kind, modules, stores, terrain) -> preview \| null`; null for an unknown kind |
| | `upkeepFor` | `(modules) -> {powerDraw, solarArrays}` |
| | `extraBatteryCount` | `(modules) -> number` |
| `sim/forecast` | `ForecastEvent`, `FlareInput`, `ForecastKind` | the run's forecast events; `intensity` is 1-3 for a flare and 0 for the pod and storm |
| | `flareIntensity` | `(classType) -> 1 \| 2 \| 3`; X = 3, M = 2, C and below = 1 |
| | `createForecast` | `(flares, seed = DEFAULT_SEED, dustScore = NEUTRAL_SCORE.dust) -> ForecastEvent[]`; the timetable is seeded, sols 2-10, one event at a time, at least one flare and two events. Flare sizes come from the M/X pool, or from the long-run NOAA mix when it is empty |
| | `createSeededRandom`, `planEvents`, `randomSolBetween`, `stormChance` | the pure sampler; `planEvents(random, dustScore)` decides the storm, pod and flare sols |
| | `visibleForecast`, `WARNING_SOLS` | what the crew can see on a given sol: pod always, storm 3 sols ahead, flare 1 sol ahead |
| | `eventsStartingOn`, `stormOn`, `stormOpacity` | lookups over the forecast; opacity is a calm-site curve, 0.2-0.95 |
| `sim/crises` | `Crisis`, `CrisisOption`, `crisisForEvent`, `pendingCrisis` | the moment a forecast event stops the clock and what is asked |
| | `optionOf`, `decide`, `earthIsInTime`, `earthAdvice` | option lookup, the recorded choice, and the "Earth cannot answer in time" copy |
| `sim/comms` | `REAL_MIN_ONE_WAY_MINUTES`, `REAL_MAX_ONE_WAY_MINUTES` | the real 3-22 minute range, for the approximation note |
| | `oneWayMinutes`, `roundTripMinutes`, `earthCanAnswerInTime` | a simplified rising delay over the run; labelled approximate in the UI |
| `sim/sol` | `advanceSol` | `(run) -> SolResult`; solar generation, module draw + night drain, crew use, events, clamp/cap, ledger entry, status. **Turn-based: one sol per call** (D-030) |
| | `LedgerEntry`, `SolResult` | one sol's stores and `changes`; the new stores, status, events and ledger |
| | `isRunOver` | `(run) -> boolean` |
| `sim/run` | `RunState` | `sol, regionId, astronautName, stores, status, modules, ledger` — the only thing shared between screens |
| | `newRun` | `(regionId, astronautName?) -> RunState` |
| | `landAt` | `(run, regionId) -> RunState`; sets the region and its region-adjusted starting stores |
| | `applyBuild` | `(run, kind) -> RunState \| null`; null when the build is blocked |
| | `withState` | `(run, patch) -> RunState` |
| `ui/routes` | `Route` | `'naming' \| 'briefing' \| 'supply' \| 'launch' \| 'interior' \| 'landing' \| 'landing-site' \| 'base' \| 'act' \| 'debrief' \| 'encyclopedia'` |
| | `ROUTE_ORDER` | the routes in play order, `naming` first |
| | `DEFAULT_ROUTE` | `'naming'` — the entry screen (D-021) |
| | `parseRoute` | `(hash) -> Route \| null`; tolerant of missing/duplicated `/`, whitespace, case, query string. Returns null rather than throwing |
| | `routeToHash` | `(route) -> '#/<route>'` |
| | `nextRoute`, `previousRoute` | `(route) -> Route \| null`; null at the ends |
| `ui/router` | `startRouter` | `({onRoute, onUnknownHash?}) -> teardown`; fires `onRoute` once immediately and on every `hashchange`; normalises an unknown hash via `replaceState` |
| | `navigate` | `(route) => void`; assigns `location.hash` so Back works. `startRouter` calls `stopReading()` on every route change so a voice cannot follow the player into the next screen |
| `ui/registry` | `screenMount` | `(route) => selector \| null`; null when nothing is built for that route |
| | `resolveScreen` | `(route) => ScreenFactory \| null`; null when nothing is built |
| | `nextStop` | `(route) => Route \| null`; the next built screen, or the placeholder when the next is unbuilt |
| | `allScreenMounts` | `() => string[]`; every mount selector, for the shell to hide |
| | `ScreenFactory` | `(root, run, setRun) => teardown`; teardown is mandatory, not optional |
| `features/naming/model` | `MAX_NAME_LENGTH` | 24, counted in code points |
| | `normaliseName` | trims and collapses whitespace runs |
| | `checkName` | `(raw) -> {ok, value, problem}`; returns the normalised value so a caller never normalises twice |
| | `displayName` | strips control characters and caps length — the one string interpolated into markup |
| `features/naming/view` | `mountNaming` | `(root, run, setRun) -> teardown`; START MISSION disabled until the name is usable |
| `features/landing-site/model` | `REGIONS` | the five authored regions, re-exported from `sim/regions` |
| | `scoreRegion` | `(regionId) -> SiteScore`; all-zero safe score for an unknown id, never throws |
| | `tradeoffSummary` | `(score) -> string`; names strongest and weakest axis, never "recommended" |
| | `totalScore` | `(score) -> number`, 0-25 |
| | `strengthAndWeakness` | `(score) -> {strength, weakness}` axes |
| `features/landing-site/view` | `mountLandingSite` | `(root, run, setRun) -> teardown`; map + five pins + Site Analysis panel, LAND HERE calls `landAt` then navigates to `nextStop('landing-site')`. Selecting a pin also shows that region's real NASA photo and fact (`regionCard`) |
| `ui/gameLoop` | `gameScreen`, `gameWorld`, `gamePanel` | the shared frame from the Figma frames (D-038): one `.gl` root, the illustrated world panel, and the scrolling right-hand panel. Every word, number and variant arrives in an options object; no `sim/` rule is applied here |
| | `gameHeader`, `gameHud`, `gameDock` | `gameHeader(sub?, onLeave?)`: without `onLeave` the right-hand label is plain decorative text; with it, it is a Menu button opening an in-screen leave dialog with Keep playing / Leave mission (D-044). `gameHud` draws the five resource cards (`HudStat`) and `gameDock` the three-tab dock. The pause/settings/BUILD pills and the dock are `aria-hidden` spans, not buttons (D-038) |
| | `gameSection` | `(label, ...content) -> section`; an uppercase label and its body |
| | `moduleFigures`, `moduleArt`, `MODULE_ART`, `WORLD_BACKGROUND`, `ASTRONAUT_SPRITE` | artwork placement and the bundled asset URLs; the only import site for the figures base, act and debrief share. The module layout comes from `ui/baseLayout` (D-065), one pose per copy (D-066), a pose may be mirrored (D-067), and the stacking order is a rule (D-069) |
| `ui/baseLayout` | `ModuleSpot`, `ModulePoses` | `{left, bottom, width, flip?}` for one module; and where every copy of every kind stands — one list per kind, in build order. `flip` is optional and means mirrored left to right |
| | `DEPTH_ORDER`, `depthFor` | what stands in front of what, farthest first, and the stacking level of one module copy (D-069). A rule in code, not a number in the file: the order is a property of the outpost, and a file of fifteen positions cannot be trusted to keep a stacking order straight. The copies of a kind recede from the camera as they are added, so the first copy is the nearest; the two regolith shields share one depth |
| | `SPOT_BAND` | how far a module may be placed: left 2-92, bottom 2-32, width 6-24. The single source of truth; `styles/game-loop.css` clamps with the same numbers and `check-markup` Rule 11 fails the build if the two ever disagree |
| | `PANEL_RIGHT_EDGE` | 100 — a module is never wider than the gap between where it starts and the right-hand edge of the panel |
| | `DEFAULT_POSES` | the authored layout, used when `baseLayout.json` cannot supply one. One pose per copy the player can build |
| | `MODULE_POSES` | the validated layout the game places modules with; every kind has one pose per copy, and every pose is inside the band |
| | `LAYOUT_PROBLEMS` | what is wrong with the layout file, in words; empty when the file is good. Printed at boot behind `import.meta.env.DEV`, and shown in a banner at the top of the placement editor's toolbar (D-068) |
| | `resolvePoses`, `describeLayoutProblems` | `(source) -> ModulePoses` and `(source) -> string[]`; the old single-pose shape reads as a list of one, a short list is padded by derivation, a long one is cut, and a kind the file cannot supply falls back to the default |
| | `poseFor` | `(poses, kind, copy) -> ModuleSpot`; where the nth copy of a kind stands, derived from the last pose when the file has no entry for it |
| | `clamp`, `clampSpot`, `roundSpot` | pull a number or a whole spot into the band, and round to one decimal so the toolbar and the file quote the same numbers |
| | `buildLayoutJson` | `(poses) -> string`; the layout file, in catalogue order, one list per kind, two-space indented. `flip` is written only for a module that is mirrored |
| | `pointToPercent` | `(point, panelRect) -> {left, bottom}`; where a pointer is inside the outpost panel |
| `ui/baseLayoutEditor` | `startLayoutEditor` | `(root) -> teardown`; the placement editor (D-065, D-066). Fifteen draggable handles — one per copy of every module — a corner grip on each that changes its width, a toolbar with the numbers and the JSON, and Download / Copy / Reset / Done. Dev-only: `main.ts` loads it with a dynamic import behind `import.meta.env.DEV`, so it never reaches a production bundle. The flag check lives in `main.ts`, which cannot import this module statically without pulling it into the bundle |
| `features/base/model` | `BUILDABLE`, `canPlace`, `addModule`, `removeModule`, `pointsLeft` | build rules over the `sim/modules.ts` catalogue (D-032) |
| | `previewFor`, `previewSummary`, `upkeepFor`, `upcomingWarnings` | the calm-sol projection. `previewSummary` gives the five resource cards one number each, from the same projection as the sentences |
| `features/base/view` | `mountBase` | `(root, run, setRun) -> teardown`; the outpost on Mars, the catalogue steppers, and Land & start sol 1 → `startOutpost` then `act`. Holds a mutable local `extras` so a second build is not applied to stale data; it also shows a rotating NASA fact beside the build panel from `factFor` |
| `features/act/model` | `missionHeadline`, `meterRows`, `secondsLeft`, `powerSentence` | presentation helpers over `sim/sol`; `meterRows` carries `percent`, `tone` and `emoji` for the HUD |
| `features/act/view` | `mountAct` | `(root, run, setRun) -> teardown`; Advance sol calls `advanceSol`, then `setRun`; a finished run navigates to `debrief`. A crisis replaces the mission panel in place, with its countdown and "take your time" switch (D-040) |
| `features/debrief/model` | `explainOutcome` | `(run) -> {headline, detail, confident}`; conservative ledger attribution — only claims a cause when a logged fact establishes it, otherwise `confident: false` and the screen points at the timeline |
| | `consumptionSummary`, `lowestPoints`, `blackoutSols`, `reviewDecisions`, `timeline` | arithmetic over the log; per-decision verdicts from fixed option rules; one row per sol |
| | `nextSteps`, `wentEmpty`, `usedApproximateData` | what to try next, each step tied to a fact from this run and carrying an `art` hint; the store that ended the run; whether any flare size was approximate |
| `features/debrief/view` | `mountDebrief` | `(root, run, setRun) -> teardown`; the results panel, and the journal as a mode reached from "View my Mars story" (D-039). "Try a new outpost" calls `newRun` then `landing-site`; it shows a rotating NASA fact next to the closing card from `factFor` |
| `features/launch/model` | `TITLE` | `'THE MISSION BEGINS'` — the card that holds before the first still |
| | `TITLE_DURATION_MS` | 900 — the card alone; 200ms in and out leaves 500ms of readability |
| | `FADE_MS` | 350 — every dissolve: the title lift, each shot, the film's arrival |
| | `SHOTS` | the two stills, press then walk, with their camera moves and alt copy |
| | `FLASH_TIMES`, `FLASH_RISE_PCT`, `FLASH_FALL_PCT` | the press flashes; spacing is a photosensitivity guarantee, cross-checked against `launch.css` |
| | `VIDEO_DURATION_MS` | 5000 — the rendered launch film, matched frame-for-frame |
| | `VIDEO_DESCRIPTION` | what the launch film shows, for screen readers |
| | `DOCKING_DURATION_MS` | 3000 — the rendered docking clip, matched frame-for-frame |
| | `DOCKING_DESCRIPTION` | what the docking clip shows, for screen readers |
| | `PARTS` | five tour slides: overview then one named part at a time, each with name, description and accent colour |
| | `PARTS_DESCRIPTION` | all four parts the tour names, for screen readers |
| | `TOTAL_DURATION_MS` | title + shots + both films; the reel's *nominal* runtime, not a timer — the screen exits at the Continue button in the parts tour, or when the last film ends |
| | `resolveBeatStart` | `(earliestMs, readyAtMs) -> ms`; a beat starts at the later of its slot and its clip's readiness |
| `features/launch/view` | `mountLaunch` | `(root, run) -> teardown`; plays the stills, then the launch film and the docking clip, then opens the interactive parts tour. Beats are media-driven: only the launch film loads up front, the docking clip loads when the film's beat starts, each has a poster, and a beat waits for its clip rather than being skipped. Reduced motion holds the stills and both films. The parts tour is static images and text — Prev / Next move between parts, disabled at the boundaries, Continue hands off. The parts tour also shows a rotating NASA fact per part from `factFor(index)` into `[data-launch-parts-fact]`, so the tour teaches while it shows. |
| `dom/floatAstronaut` | `startFloatingAstronaut` | `(wrapper, {deformLayer, reducedMotion}) -> teardown`; cancels rAF, removes the resize listener, detaches the grab, clears the transform |
| `dom/pointerGrab` | `attachGrab` | `(target, handlers, options) -> teardown` |
| `dom/starfield` | `createStarfield` | `(container) => void`; appends, never clears |
| `ui/button-strip` | `createButtonStrip` | `(root, options) -> ButtonStripSpec`; full-width fixed-height bottom strip holding Next / Prev / action buttons; teardown is mandatory |

## The data layer

`src/data/` is the only zone allowed to `fetch` (R-8). It is implemented and tested.

`fetchSpaceWeather()` tries three sources in order and names the one that answered:

1. **NASA DONKI**, through `api.nasa.gov/DONKI/FLR` — the NASA source. The API portal is
   browser-callable (`Access-Control-Allow-Origin` verified). It uses
   `VITE_NASA_API_KEY` if set, otherwise the shared `DEMO_KEY`.
2. **NOAA SWPC**, `services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json` —
   `Access-Control-Allow-Origin: *`, and the GOES measurements DONKI itself mirrors. It is
   second because the game promises NASA data, but it keeps the demo live when DONKI 503s
   or throttle-limits the shared key (ISS-008, ISS-009).
3. **Baked history**, `FALLBACK_FLARES` — famous flares, each marked `approximate`.

A failure at any step falls through rather than showing an empty screen. `lastDetail()`
returns a sentence naming what happened, and `lastSource()` drives the approximate label.
`.env*` is git-ignored (ISS-006) and `.env.example` documents the key name without storing
a value.

## Known simplifications

Deliberate shortcuts, and why each was accepted.

1. **`src/sim/` now carries the game model.** Five stores with per-sol drain
   (`resources.ts`), module catalogue and build rules (`modules.ts`), the forecast
   (`forecast.ts`), crisis choices (`crises.ts`), comms delay (`comms.ts`), sol advance and
   win/loss (`sol.ts`), and `RunState` (`run.ts`). The earlier version of this file said
   there was no game state; that stopped being true when the loop was built (D-030-D-035).
2. **The data layer is live; the forecast's timing is seeded, not fixed.** `data/spaceweather.ts`
   supplies live flare sizes, and `sim/forecast.ts` rolls which sols the events land on from a
   seed (D-048). All nine journey screens are built. The old "data is a stub" entry applied to
   the pre-loop tree and is no longer accurate.
3. **`ui/router.ts` is wired into `main.ts`.** Its DOM half still cannot be tested without
   jsdom (ISS-013), so the pure half (`routes.ts`) carries the tests. The browser
   behaviour is unverified (TASK-049).
4. **Routing is hash-based rather than a state machine.** Costs a URL bar and a
   `hashchange` listener. Rejected multi-page because there is no persistence, so a
   navigation would lose the run state a multi-mission loop needs.
5. **No persistence of any kind.** No `localStorage`, no cookie, no backend. Accepted:
   Supabase is deferred (D-003).
6. **`MAX_SUBSTEP_SECONDS` is duplicated as `1/120` in `drift.ts` and `deform.ts`.**
   Accepted because the integrators are independent and could legitimately diverge.
7. **`starfield.ts` uses `Math.random()` with no seeding option.** The field is decorative
   and variety per load is the goal. The cost is it is not snapshot-testable — part of
   ISS-011.
8. **Frame-rate independence by substepping rather than a fixed-timestep accumulator.**
   Simpler, and the drift maths is linear. `deform.test.ts` asserts one long frame matches
   six short ones.
9. **Sol stepping is turn-based (D-030).** One sol advances per button press in `act`;
   there is no clock abstraction and no ticker. The pure `advanceSol` transition is also
   the right seam if real-time is ever wanted, but that is not in scope.
10. **The `KNOWN` set is empty.** Deliberate, per the reasoning above.
11. **No DOM test coverage.** Accepted only because there is no jsdom yet — ISS-011,
    ISS-013. The largest real gap in the repository.
