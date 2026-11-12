# Architecture

The annotated truth about this repository as of 2026-11-11. Everything here was read
from the files, not inferred from intent. Where a file is empty or does not exist, it
says so — **an empty file is a promise, not an implementation.**

Read [`../AGENTS.md`](../AGENTS.md) first. This document is the detail behind it.

## What this project is

A Mars outpost survival-strategy game for ages 8-16, in which a child balances five
draining resources — power, oxygen, water, food, radiation shielding — over a
sol-based loop. It is a **Papers Please game about Mars** (D-060): each sol the player
is the duty officer at the outpost, three work orders land on the desk, each carries
two readings to check and a tool to work it with, and the player approves one. The
**standing orders** are the rule book that grows two rules a sol, and they are the
five learning goals in the order the player meets them (D-061). Students are NASA
Space Apps Challenge entrants; Nov 8 2026 is the feature freeze and Nov 14-15 is
the demo.

**The single most important invariant:** `sim/` and each feature's `model.ts` are pure —
no `document`, no `window`, no network. That is what makes the game assertable rather
than eyeballed, and it is what `npm run check` protects.

## The invariant, and why it is enforced

1051 tests run in a few seconds with no browser, no jsdom, and no mocks. If `sim/` grew a DOM
reference it would still work, and the cost would surface later as an untestable bug.
Enforced as `no-dom-in-pure-zone`.

## Annotated file tree

Legend: **complete** = does what its name says, verified. **partial** = real code with a
real gap. **stub** = typed signature present, every function body throws. **does not
exist** = planned, nothing written.

```
Mars-Horizon-Junior-Astronaut-Mission-Trainer/
 
├── index.html                          complete   54 lines. All five visual layers and the
                                                   <script type=module> entry. Contains an
                                                   external Google Fonts request — see ISS-007.
├── package.json                        complete   6 scripts: dev, build, preview, typecheck,
                                                   test, check. Zero runtime dependencies.
├── package-lock.json                   complete   generated, do not edit
├── tsconfig.json                       complete   strict, noUnusedLocals, bundler resolution
├── vite.config.ts                      complete   publicDir:false, base:'./', target es2020
├── LICENSE                             complete   MIT, "Team Akrasia 2026". Not mirrored into
                                                   package.json — see ISS-004.
├── .gitignore                          partial    4 lines. Missing .env* — see ISS-006.
├── .gitattributes                      DOES NOT EXIST   See ISS-005. Cheapest thing to add.
 
├── Assets/
    ├── images/floating.png             complete   145 KB astronaut sprite, imported from TS so
                                                  Vite fingerprints it into dist/
    ├── images/briefing/                complete   astronaut.webp (203 KB). The cheerful astronaut
                                                  between Earth and Mars; the briefing screen's
                                                  scene. Imported from TS so Vite fingerprints it.
    ├── images/launch/                  complete   launch-cinematic.mp4 (6.9 MB, the launch film) and
                                                  launch-poster.webp (90 KB, the pad frame the film
                                                  is parked on). Both imported from TS so Vite
                                                  fingerprints them.
    ├── images/docking/                 complete   3 WebP stills, ~150 KB each: the separated
                                                  spacecraft, the docked craft and the assembled
                                                  station. Read by tools/render-docking.py.
    ├── images/guide/                   complete   astronaut.png (74 KB, 260x340): the cutout
                                                  that stands beside the speech bubble in the
                                                  how-to-play popup. Imported from TS so Vite
                                                  fingerprints it. A transparent background is
                                                  what makes it work: the figure has to sit on
                                                  the dimmed screen, not inside a box.
    ├── images/naming/                  complete   mars.webp (358 KB, 1818x1860) and
                                                  astronaut.webp (130 KB, 1240x1236): the
                                                  planet and the astronaut of the start
                                                  screen. Both are drawn full-screen, so both
                                                  are enlarged from the originals by
                                                  tools/upscale-naming-assets.py.
        └── source/                     complete   the untouched originals (606x620 and
                                                  620x618), kept so the enlargement can be
                                                  re-run at any size. Read by
                                                  tools/upscale-naming-assets.py.
    ├── images/parts/                   complete   5 WebP stills: the all-parts overview and one
                                                  per part (propulsion, habitat, logistics,
                                                  Orion), each with a different part outlined and a
                                                  baked label card. Read by tools/render-parts.py.
    ├── images/rover/                    complete   rbutton.webp (58 KB, 512x512) and
                                                  mars_rover_seamless_loop.gif (810 KB, 380x250,
                                                  16 frames): the rover's button and its loop. Both
                                                  imported from TS so Vite fingerprints them. The
                                                  loop is the original GIF, shipped as it is: GIF
                                                  is the one format every browser plays without
                                                  argument, and it is only fetched when the player
                                                  opens the rover's status window.
    ├── images/rover/source/             complete   the untouched button original (a 1254x1254
                                                  PNG), kept so the conversion can be re-run. Read
                                                  by tools/compress-rover-assets.py.
    └── README_ref/*.png                complete   6 UI mockups, ~2.4 MB. Never bundled
                                                  (publicDir:false exists to exclude them).
├── Assets/video/
    ├── docking.mp4                     complete   1.7 MB. 3.0s, 1920x1080, 30fps, H.264, silent.
                                                  The rendered docking clip. Built by
                                                  tools/render-docking.py.
    ├── docking-poster.webp             complete   97 KB. The finished joint with its latch ring lit,
                                                  used as the clip's poster while it buffers. Built by
                                                  tools/extract-posters.py.
    ├── parts.mp4                       complete   5.5 MB. 12.0s, 1920x1080, 30fps, H.264, silent.
                                                  The "meet the spacecraft" segment: title, four
                                                  labelled parts with descriptions, overview outro.
                                                  Each part holds 2.0s so its description can be
                                                  read; the lower-third sits below the panels.
                                                  Built by tools/render-parts.py.
    └── parts-poster.webp               complete   98 KB. The tour's "MEET THE SPACECRAFT" title card,
                                                  used as the clip's poster while it buffers. The first
                                                  frame would be black, so the poster is a frame in.
                                                  Built by tools/extract-posters.py.
 
├── tools/
    ├── extract-posters.py              complete   ~55 lines. PyAV. Writes one WebP poster per film at a
                                                  chosen frame, so a clip that is still buffering shows
                                                  a picture rather than black. The tour's poster is its
                                                  title card, because the clip opens on black.
    ├── render-docking.py               complete   241 lines. PIL + numpy + OpenCV + PyAV. Cuts the head out
                                                  of the separated frame, rebuilds the black space
                                                  behind it, and moves the sprite across a headless
                                                  background while the camera pushes in.
    ├── render-parts.py                 complete   300+ lines. PIL + numpy + OpenCV + PyAV. Cross-dissolves the
                                                      four part stills under a push-in, with staggered
                                                      description bars and fade-through-black bookends.
    ├── upscale-naming-assets.py        complete   ~85 lines. PIL. Enlarges the start screen's planet and
                                                  astronaut with a Lanczos resample and a light
                                                  unsharp mask, from the untouched originals in
                                                  Assets/images/naming/source/. They are drawn
                                                  full-screen, so the 606px originals turned to
                                                  mush at 1920px wide.
    ├── compress-rover-assets.py        complete   ~120 lines. PIL. Rewrites the rover's button as
                                                  WebP from the untouched original in
                                                  Assets/images/rover/source/. The button was a 1.4 MB
                                                  PNG for a 56-84px circle; it is now 58 KB and
                                                  indistinguishable side by side. The animation is NOT
                                                  converted - it is shipped as the original GIF - but
                                                  the script checks that it still has its frames,
                                                  because a still frame there is a bug that looks
                                                  like a design choice.
    ├── balance-check.mts              complete   ~180 lines. TypeScript, run by tsx. Plays every
                                                      legal build at every landing site over several
                                                      forecast seeds and fails when a site cannot hold
                                                      all five systems, or when too few builds can win.
                                                      The game was unwinnable for a long time and no
                                                      test said so; this is the check that says so
                                                      (D-064). npm run balance.
        ├── browser-check-build.mjs        complete   Node only. Drives the real game in headless
                                                      Chrome: the build screen's limits and reasons,
                                                      the desk's three orders and six checks, the
                                                      standing orders on the board, the guide, a tool
                                                      worked for stars, and no console errors. 58 checks
                                                      (a few fewer when a crisis lands on the sol the
                                                      check runs).
        ├── browser-check-journey.mjs      complete   Node only. Drives the whole journey from the
                                                      naming screen to the outpost and asserts that no
                                                      console error appears on the way.
        ├── browser-check-training.mjs  complete  Node only. Drives the real game in headless Chrome: the
                                                  training section on the standing orders, all six games opening
                                                  and drawing themselves, two games won for points, the day's
                                                  two-game limit refusing a third, and the record surviving a
                                                  refresh. 40 checks.
        ├── browser-check-rover.mjs         complete   ~230 lines. Node only. Drives the real game in
                                                  headless Chrome over the DevTools Protocol: names the
                                                  astronaut, walks to the outpost, deploys the rover
                                                  and checks that the NASA picture really loads and
                                                  that the rover's animation really moves. A check,
                                                  not a test - `npm test` stays free of a browser.
                                                  Needs `npm run build && npm run preview`.
        └── browser-check-save.mjs          complete   Node only. Drives the save in headless Chrome:
                                                      a first visit is asked for a name, starting a
                                                      mission writes the run down, coming back to the
                                                      root shows the greeting and CONTINUE, CONTINUE
                                                      returns to the screen they left, a reload on the
                                                      hash gets its run back, and START OVER takes the
                                                      save away. 15 checks (D-081).
 
    All eleven are dev tools: not scanned by `npm run check`, and they add no runtime dependency.
 
├── scripts/
    └── check-imports.mjs               complete   Zone + banned-API checker, 9 rule ids.
                                                  KNOWN set empty; staleness rule verified by
                                                  running it. See "Layering".
 
├── docs/
    ├── architecture.md                 this file
    ├── CHANGELOG.md                    unreleased and deployed project changes
    ├── game-flow.md                    complete   Mermaid map of every player decision, the
                                                  sol loop, what is built, and where a new
                                                  event plugs in
    ├── pull-requests/                   detailed PR descriptions
        ├── 001-ci-deployment-gates.md
        ├── 002-readme-polish.md
        └── 003-vercel-deployment-gate.md
    ├── codebase/                       evidence-backed repository map
        ├── STACK.md, STRUCTURE.md, ARCHITECTURE.md
        ├── CONVENTIONS.md, INTEGRATIONS.md, TESTING.md, CONCERNS.md
    └── team/
        ├── decisions.md                complete   numbered, newest first
        ├── issues.md                   complete   every logged issue, ISS-001..ISS-063
        ├── goals.md  tasks.md  progress-log.md
├── .github/workflows/
    ├── ci.yml                          PR/main checks: typecheck, tests, HTML, build
    └── deploy.yml                      fails its gate on failed checks; deploys validated default-branch commit to Vercel
├── vercel.json                         disables native Git deployments; Actions owns the deployment gate
├── .htmlvalidate.json                  HTML rules; inline CSS is allowed
 
├── AGENTS.md                           complete   the orientation file
├── README.md                           complete   front page: pitch, science, setup, structure
                                                  and links to every doc
 
└── src/
    ├── main.ts                         complete   composition root. Resolves the landing elements
                                                  by id, wires starfield + astronaut, reads
                                                  ?motion= and prefers-reduced-motion, then starts
                                                  the router. Owns the single in-memory `RunState`
                                                  and hands it to screens as (root, run, setRun).
    ├── style.css                       complete   5 lines. Landing-page entry only. Imports the
                                                  four stylesheets in DOM stacking order.
    ├── vite-env.d.ts                   complete   1 line. Ambient declaration, exempt from
                                                  zone classification.
     
    ├── sim/                            PURE. No DOM. No network. Fully unit tested.
                                        Renamed from core/ this pass. "core" described
                                        neither squash-and-stretch nor resource depletion.
        ├── drift.ts                    complete   247 lines. DVD-logo drift maths. Exports
                                                  stepDrift, createInitialDrift, driftSpeedForViewport,
                                                  clampToViewport, clampSpeed, rescaleSpeed;
                                                  MIN/MAX_DRIFT_SPEED 96/176, REDUCED_DRIFT_SPEED 34,
                                                  MAX_THROW_SPEED 620. Substeps at 1/120s.
                                                  createInitialDrift calls Math.random() 5 times.
        ├── deform.ts                   complete   238 lines. Damped spring for squash-and-stretch.
                                                  Exports createDeform, impact, stretch,
                                                  releaseStretch, stepDeform, isDeformSettled,
                                                  deformScale; STIFFNESS 340, DAMPING 11,
                                                  MAX_COMPRESSION 0.19, MAX_DRAG_COMPRESSION 0.045,
                                                  IMPULSE 3.5.
        ├── frame.ts                    complete   197 lines. Composes drift + deform per frame.
                                                  Exports createAstronautFrame, stepAstronaut,
                                                  releaseAstronaut, DRAG_FOLLOW_RATE 14,
                                                  DRAG_STRETCH_SPEED 3400, MIN_THROW_SPEED 60.
        ├── drift.test.ts               complete   30 tests
        ├── deform.test.ts              complete   30 tests
        ├── frame.test.ts               complete   19 tests; open-space trajectory is deterministic
        ├── resources.ts                complete   ResourceName, ResourceStores, clampStores, drainForSol,
                                                  depletedStores, createInitialStores, percentOf,
                                                  LIFE_STORES. Pure arithmetic, never mutates its
                                                  argument. 7 tests.
        ├── sol.ts                      complete   advanceSol, decide, projectSol, powerPicture,
                                                  isRunOver, lostStores, isSelfSustaining,
                                                  endedBy, WIN_SOL. Solar generation, module draw +
                                                  night drain, crew use offset by modules, forecast
                                                  events, the chosen activity, science points,
                                                  clamp/cap, status. Turn-based (D-030). 53 tests.
        ├── run.ts                      complete   RunStatus, RunState, SolEvent, DecisionRecord,
                                                  SolRecord, SolActivity, newRun, landAt, withState,
                                                  startOutpost, answerRoverFind, recordInspection,
                                                  inspectionStars, Inspection. RunState is the only
                                                  thing shared between screens; it carries
                                                  `modules`, `science`, `chosenActivity`, `rover`
                                                  and `inspections`. The last two are what put the
                                                  rover and the tools inside the run (D-062).
        ├── save.ts                     complete   SAVE_VERSION, encodeRun, decodeRun: writing a run
                                                  down and reading it back. Pure, so the whole save
                                                  format is testable without a browser. The spine is
                                                  refused rather than guessed at, and everything past
                                                  it is repaired from a fresh run (D-081). 19 tests.
        ├── save.test.ts                complete   19 tests: the round trip, a refused spine, and the
                                                  repairs.
        ├── activities.ts               complete   ActivitySpec, ActivityOffer, ActivityStores,
                                                  ActivityRequirement, SolPlan, ACTIVITY_CATALOGUE,
                                                  SOL_PLANS, activityById, planForSol, lockedReason,
                                                  offerFor, offerForSpec. The twelve activities and
                                                  the twelve sol plans (D-051, D-054) — a curriculum,
                                                  not a random draw, which is why the orders are not
                                                  procedural (D-060). 18 tests. Carries no picture:
                                                  an activity's icon is mapped by id in
                                                  `features/act/view.ts`, because a model may not
                                                  import `ui/` (D-070).
        ├── standingOrders.ts           complete   StandingOrder, STANDING_ORDERS, ordersThrough,
                                                  ordersForSol, orderById. The twenty-four rules the
                                                  player works to, two arriving every sol (D-060).
                                                  They are the five learning goals in the order the
                                                  player meets them (D-061). 7 tests.
        ├── minigames.ts                complete   EngineKind, Grade, EngineOrder, EngineUnlockSol,
                                                  EngineName, engineUnlocked, gradeSequence,
                                                  gradeRadar, gradeTiming, gradeSort, PackItem,
                                                  gradePack, gradeMatch. The six tools and how each
                                                  is graded. Stars multiply science and never a
                                                  store (D-063). The tools unlock one a sol for the
                                                  first six, so every sol has at least one order
                                                  the player can work (ISS-065). 25 tests.
        ├── guide.ts                    complete   GuideWhere, GuideStep, GUIDE_STEPS, guideStep.
                                                  The how-to-play guide: ten steps, each saying
                                                  where it happens. The words live here so they can
                                                  be read and tested without a browser (D-060). 6 tests.
        ├── patches.ts                  complete   Patch, patchesFor, PATCH_COUNT. The ten badges a
                                                  run earns, worked out from the run itself. 7 tests.
                                                  No picture: `features/debrief/view.ts` maps a
                                                  patch id to an `IconName` (D-070).
        ├── deskNotes.ts                complete   NoteFrom, DeskNote, DESK_NOTES, noteForSol. The
                                                  notes from home and the crew that land on the desk.
                                                  8 tests.
        ├── science.ts                  complete   ScienceRank, SCIENCE_RANKS, SOL_LOG_POINTS,
                                                  rankFor, rankProgress. The score and the rank
                                                  ladder (D-052). 11 tests. No picture:
                                                  `ui/icons.ts`'s RANK_ICON maps a rank id to a
                                                  pictogram (D-070).
        ├── goals.ts                    complete   ScienceGoal, GoalSpec, GoalStatus, GoalReading,
                                                  GoalObjective, SCIENCE_GOALS, goalById, goalProgress,
                                                  goalReadings, GOAL_AIMS, and the floor constants.
                                                  The five science goals the mission is about, and
                                                  what the player kept running (D-058, D-061).
                                                  There is deliberately no target and no score: the
                                                  goals are the learning outcomes, not a second
                                                  win condition. 23 tests.
        ├── topics.ts                   complete   ScienceTopic, SCIENCE_TOPICS, TOPIC_LABEL,
                                                  isScienceTopic. The vocabulary the activities and
                                                  the NASA facts share.
        ├── run.test.ts                  complete   11 tests
        ├── balance.test.ts              complete   8 acceptance tests: a good build wins, a
                                                  careless one does not, the activity loop does
                                                  not make the game unwinnable, and more than one
                                                  region can be played.
        ├── activities.test.ts          complete   18 tests
        ├── science.test.ts             complete   11 tests
        ├── goals.test.ts               complete   23 tests
        ├── standingOrders.test.ts      complete   7 tests
        ├── minigames.test.ts           complete   25 tests, including the rule that every sol has
                                                  an order the player can work
        ├── training.ts                 complete  TrainingGameId, TrainingPerformance, TRAINING_GAMES,
                                                  TRAINING_DAILY_LIMIT, TRAINING_REWARDS, TrainingState,
                                                  TrainingCompletion, TrainingDay, TrainingGameRow,
                                                  TrainingStart, TrainingOutcome, emptyTraining, trainingSol,
                                                  trainingDay, trainingUnlocked, trainingTier, canStartTraining,
                                                  completeTraining, makeRandom, trainingSeed, TrainingRecord,
                                                  EMPTY_TRAINING_RECORD, trainingDayFor, withTrainingDay,
                                                  trainingDayRecord. The daily rule: two games a sol, each game
                                                  once a sol, and what a finished game is worth. The games are
                                                  handed a generator instead of Math.random, so a sol always
                                                  deals the same cards (D-075). 27 tests.
        ├── trainingMerge.ts            complete  MERGE_SIZE, MERGE_TARGET, MERGE_LEVEL_NAMES, slideMergeLine,
                                                  moveMerge, spawnMerge, canMerge, mergeBest, mergePerformance.
                                                  The merge board: sixteen crates, and two of a kind make one of
                                                  the next kind. 23 tests.
        ├── trainingMemory.ts           complete  MEMORY_FACES, MEMORY_PAIRS, dealMemoryDeck, memoryPerformance.
                                                  The deck of twelve cards, six pairs. 9 tests.
        ├── trainingRover.ts            complete  ROVER_SIZE, ROVER_MAPS, ROVER_EXTRA_MOVES, ROVER_STEPS,
                                                  roverCell, roverOpen, roverRoute, roverMovesAllowed,
                                                  roverPerformance. The ground the rover crosses, and the
                                                  shortest route over it. 20 tests.
        ├── trainingSolar.ts            complete  SOLAR_SIZE, SolarTile, SolarPuzzle, solarOpens,
                                                  rotateSolarTile, solarFlow, solarTapsNeeded,
                                                  generateSolarPuzzle, SOLAR_EXTRA_TAPS, solarPerformance. The
                                                  power board, generated so it is always winnable and never
                                                  starts solved. 16 tests.
        ├── trainingCargo.ts            complete  CARGO_BOXES, CARGO_ITEMS, CARGO_ROUND, dealCargoRound,
                                                  cargoPerformance. The supplies that land and the stores they
                                                  belong in. 9 tests.
        ├── trainingAsteroid.ts         complete  ASTEROID_SECONDS, ASTEROID_GOAL, asteroidDelay, asteroidLife,
                                                  asteroidIsDecoy, asteroidAccuracy, asteroidPerformance. The
                                                  round outside the outpost. 13 tests.
        ├── training.test.ts            complete  27 tests over the daily rule: two games a sol, one reward
                                                  each, the reset on a new sol, and a claim that is paid for
                                                  twice.
        ├── trainingMerge.test.ts       complete  23 tests
        ├── trainingMemory.test.ts      complete  9 tests
        ├── trainingRover.test.ts       complete  20 tests
        ├── trainingSolar.test.ts       complete  16 tests
        ├── trainingCargo.test.ts       complete  9 tests
        ├── trainingAsteroid.test.ts    complete  13 tests
        ├── guide.test.ts               complete   6 tests
        ├── patches.test.ts             complete   7 tests
        ├── deskNotes.test.ts           complete   8 tests
        ├── modules.ts                  complete   ModuleKind, ModuleSpec, MODULE_CATALOGUE,
                                                  CORE_MODULES, specOf, countOf, systemsFor, extrasOf,
                                                  pointsSpent, extraSlots, extraModuleCount,
                                                  extraLimitOf, plus every tuning number:
                                                  BUILD_BUDGET 18, LOAD_KW, GREENHOUSE_WATER 3,
                                                  SHIELDING_BASE 30, SHIELDING_EROSION 0.5.
                                                  Catalogue in `sim/` because `act` needs it and
                                                  cannot import `base` (D-032); `extraLimitOf` is
                                                  the limit minus the lander's copy, so the build
                                                  card and the limit count the same thing
                                                  (ISS-054). 14 tests.
        ├── rover.ts                    complete   RoverFind, RoverPhase, RoverState, newRover,
                                                  deployRover, recallRover, remainingFinds,
                                                  canDiscover, discover, logSite, collectMaterial,
                                                  leaveMaterial, pickForSol, FIND_SCIENCE,
                                                  FindAnswer, ROVER_FINDS. The rover's rules
                                                  AND its catalogue of real NASA finds: the
                                                  simulation owns the whole lifecycle, so the
                                                  catalogue lives here and not in `data/` (D-062).
                                                  It drives on sol time and touches no resource.
                                                  `rover.test.ts`: 31 tests.
        ├── forecast.ts                 complete   ForecastEvent, FlareInput, ForecastKind,
                                                  flareIntensity, createForecast(flares, seed?,
                                                  dustScore?), createSeededRandom, planEvents,
                                                  randomSolBetween, stormChance, visibleForecast,
                                                  eventsStartingOn, stormOn, stormOpacity,
                                                  MIN_CLEAR_SOLS, forecastIsSpaced. The timetable
                                                  is seeded per run (D-048) and two events can
                                                  never touch (D-056); only the flare size comes
                                                  from data/.
        ├── forecast.test.ts            complete   15 tests; the event spacing is asserted here
        ├── crises.ts                   complete   Crisis, CrisisOption, COUNTDOWN_SECONDS,
                                                  crisisForEvent, pendingCrisis, optionOf,
                                                  earthIsInTime, earthAdvice. Each forecast event
                                                  stops the clock and asks for a choice (D-029).
        ├── comms.ts                    complete   REAL_MIN/MAX_ONE_WAY_MINUTES, oneWayMinutes,
                                                  roundTripMinutes, earthCanAnswerInTime. A
                                                  simplified rising delay over the real range.

        └── regions.ts                  complete   The five landing regions: id, name,
                                                  blurb, pin {x, y} as stage %, and five
                                                  axis scores (0-5). Pure authored data,
                                                  no randomness. Exports SiteAxis,
                                                  SITE_AXES, SiteScore, Region, REGIONS,
                                                  NEUTRAL_SCORE, totalScore, regionById,
                                                  siteScore. Read by landing-site, base
                                                  and act without cross-feature imports.
     
    ├── ui/                             CROSS-SCREEN BROWSER GLUE. No framework, so no components.
        ├── routes.ts                   complete   Pure route table and hash parsing. Exports
                                                  Route, ROUTE_ORDER, DEFAULT_ROUTE, parseRoute,
                                                  routeToHash, nextRoute, previousRoute. No DOM,
                                                  so it is unit tested like sim/.
        ├── routes.test.ts              complete   19 tests. Every input literal — no Math.random,
                                                  no clock, so it cannot flake.
        ├── registry.test.ts            complete   13 tests over the route → screen tables
        ├── router.ts                   complete   startRouter(options) -> teardown, and
                                                  navigate(route). Reads location.hash, listens for
                                                  hashchange, normalises an unknown hash to the
                                                  default via replaceState, and mounts/unmounts
                                                  exactly one screen. Stops any read-aloud before
                                                  a route change. Wired into `main.ts`.
                                                  DOM behaviour UNVERIFIED in a browser.
        ├── save.ts                     complete   SavedGame, readSave, writeSave, clearSave,
                                                  isSaveableScreen, resumeScreen. The run in this
                                                  browser's storage: one versioned key, every read
                                                  wrapped, and where CONTINUE sends the player. The
                                                  only file that knows storage exists (D-081).
        ├── save.test.ts                complete   8 tests: which screens are worth resuming on, and
                                                  where CONTINUE falls back to when one is not.
        ├── button-strip.ts             complete   createButtonStrip(root, options) -> ButtonStripSpec;
                                                  full-width fixed-height bottom strip owning Next /
                                                  Prev / action buttons; teardown mandatory.
        ├── button-strip.css            complete   structural styles only (flex row, gap, padding);
                                                  features theme colours in their own CSS.
        ├── readAloud.ts               complete   canReadAloud(), readAloud(text, onDone?),
                                                  stopReading(). Browser speechSynthesis only:
                                                  no audio file, no network, hidden where
                                                  unsupported. Cancels any playing passage
                                                  before starting a new one (D-043).
        ├── readButton.ts              complete   readButton(getText, options?) -> button |
                                                  null. Shared toggle around readAloud: label
                                                  flips, aria-pressed tracks state, and a
                                                  cancelled passage cannot reset a newer one.
                                                  `getText` runs at click time so a screen can
                                                  read what it has revealed so far.
        ├── nasaCard.ts                complete   nasaCard(card, kicker?) -> figure. One image,
                                                  caption, fact, credit and source link, plus
                                                  the shared read-aloud control when the browser
                                                  has speech. Static data only: no runtime fetch.
        ├── nasaFeedCard.ts             complete   nasaFeedCard(fact, kicker?) -> figure. One live
                                                  NASA picture with its story, credit and date, in the
                                                  same card as the curated one. The picture is
                                                  optional: a video day keeps its words.
        ├── nasa-card.css              complete   card frame, caption type scale, action row.
        ├── activityPlayer.ts         complete   Inspection, InspectionResult, makeInspection.
                                                  Builds the work-order player for one order: which
                                                  tool it uses and the two readings it asks for.
                                                  The grading is in sim/minigames.ts (D-060).
        ├── guide.ts                  complete   guidePanel(onClose), guideButton(onOpen). The
                                                  how-to-play popup and the `?` icon button in
                                                  the header, beside Menu. The astronaut stands
                                                  on the left and the words are in a speech bubble
                                                  on the right, one step per page, with Next,
                                                  Back, page dots and Read aloud (D-073).
                                                  `guidePanel` returns the BACKDROP, so the
                                                  caller mounts it on document.body and a redraw
                                                  cannot reset the page (ISS-077). The words
                                                  themselves come from sim/guide.ts.
        ├── guide.css                 complete   the backdrop, the astronaut's stage, the bubble
                                                  and its tail, the header pill, the page dots and
                                                  the footer row. `position: fixed`, so it is
                                                  not affected by the panel's own scroll.
                                                  Imported by guide.ts only.
        ├── icons.ts                  complete   IconName, ICON_PATHS, RESOURCE_ICON, RANK_ICON,
                                                  MODULE_ICON, icon(name, label?). The game's
                                                  whole pictogram set: the 56 drawings supplied
                                                  in Assets/icons/, read at build time and
                                                  parsed into path data, drawn into the SVG
                                                  namespace by dom/svg.ts. Filled and coloured,
                                                  so they carry their own paint rather than
                                                  following currentColor. The data and the
                                                  drawing live in one file so a test can read the
                                                  paths without a browser (D-070, D-083).
        ├── icons.css                 complete   an icon is 1.55em square — the drawings ink
                                                  about 57% of their box — plus the rule for a
                                                  link's arrow, which points both ways.
                                                  Imported by icons.ts only.
        ├── icons.test.ts             complete   11 tests: every name draws something, every
                                                  shape is painted, no shape holds an emoji, and
                                                  the five stores, the five ranks and the eight
                                                  modules each get their own pictogram.
        ├── sheet.ts                  complete   sheet(options) -> backdrop, sheetCloseButton.
                                                  One section of a screen, opened as a dialog over
                                                  it: a header bar, a scrolling body, a closing
                                                  button, plus Escape, backdrop-click and a Tab
                                                  trap. The act desk's six buttons open into it
                                                  (D-070).
        ├── sheet.css                 complete   the backdrop and the card. `position: fixed`, so
                                                  a sheet is not affected by the panel's own
                                                  scroll or its one-column collapse. The body
                                                  scrolls, so its children are told not to
                                                  shrink (ISS-076). Two backdrops: a section
                                                  sheet at 105, and one opened over it at
                                                  108 (D-079).
        ├── training.ts                 complete  trainingSection(run, options) -> HTMLElement,
                                                  openTrainingGame(id, options) -> TrainingGameScreen | null,
                                                  readTrainingRecord, writeTrainingDay, applyTrainingRecord. The
                                                  ASTRONAUT TRAINING section at the top of the Standing orders
                                                  sheet, the dialog a game is played in, and the one thing the
                                                  browser is good at: the record of the day's training, which
                                                  is cleared when a new run begins (D-081).
        ├── trainingGame.ts             complete  TrainingGameContext, TrainingGameHandle, TrainingGameMount.
                                                  The contract every training game keeps: a status line, a
                                                  completion callback, a generator, and a destroy that stops
                                                  every timer the game started.
        ├── trainingMerge.ts            complete  mountMerge. The merge board on the screen: a swipe, the arrow
                                                  keys, and the keypad for a touch screen.
        ├── trainingMemory.ts           complete  mountMemory. Twelve cards face down, and the clock beside the
                                                  tries.
        ├── trainingRover.ts            complete  mountRover. The rover on the ground, driven by the keys or the
                                                  keypad. Bumping a rock costs no move.
        ├── trainingSolar.ts            complete  mountSolar. The power board, with the power that reaches the
                                                  battery drawn in the sun's colour.
        ├── trainingCargo.ts            complete  mountCargo. The crates and the stores. A crate can be dragged
                                                  in, or tapped and then tapped in, because a tablet and a
                                                  laptop are both being used to play this.
        ├── trainingAsteroid.ts         complete  mountAsteroid. What drifts past the outpost, and what the
                                                  player cleared, missed and should have left alone.
        ├── training.css                complete  the training section and the game dialog, in the game's own
                                                  colours: cream paper, navy ink, one orange. Imported by
                                                  training.ts only.
        ├── registry.ts                 complete   the one composition seam. Exports ScreenFactory,
                                                  screenMount, resolveScreen, nextStop,
                                                  allScreenMounts. Maps all nine built routes onto
                                                  feature views; the only file permitted to import
                                                  them. `ScreenFactory` is (root, run, setRun) ->
                                                  teardown. Returns null for routes with nothing
                                                  built, so the router can fall through.
        ├── baseLayout.json             complete   where every copy of every module stands on
                                                  the outpost panel: a list of poses per kind,
                                                  {left, bottom, width, flip?} each, in percent.
                                                  The nth entry is where the nth copy of that
                                                  kind stands. The file a developer produces with
                                                  the placement editor (D-065, D-066). The
                                                  stacking order is not here — it is a rule
                                                  (D-069).
        ├── baseLayout.ts               complete   loads and validates baseLayout.json. Exports
                                                  ModuleSpot, ModulePoses, SPOT_BAND,
                                                  PANEL_RIGHT_EDGE, DEFAULT_POSES, MODULE_POSES,
                                                  LAYOUT_PROBLEMS, DEPTH_ORDER, depthFor, clamp,
                                                  clampSpot, roundSpot, resolvePoses,
                                                  describeLayoutProblems, buildLayoutJson,
                                                  pointToPercent, poseFor. A kind the file cannot
                                                  supply falls back to DEFAULT_POSES; an
                                                  out-of-range number is clamped, not discarded.
        ├── baseLayout.test.ts          complete   55 tests. Every input literal.
        ├── dayTracker.ts               complete   the mission-day tracker in the header (D-077).
                                                  Exports DayState, DayModel, dayModel,
                                                  dayTracker. `dayModel(run, advanced?)` is
                                                  pure and reads the day in play off the run
                                                  (`sol + 1`), so the tracker cannot disagree
                                                  with the simulation. `dayTracker(model)` draws
                                                  the day, the total and one pip per mission
                                                  day. Lives in `ui/` because base, act and
                                                  debrief all draw it and one feature may never
                                                  import another (R-5).
        ├── dayTracker.test.ts          complete   10 tests. The model only: there is no jsdom
                                                  yet (ISS-013), so the DOM half is checked in
                                                  a real browser by tools/browser-check-day.mjs.
        ├── day-tracker.css             complete   the tracker's own rules: the day in the
                                                  game's tokens, the twelve pips, the rail
                                                  between them, and the two animations (the
                                                  day in play breathes, the day just flown
                                                  flashes). The pips are filled stations on one
                                         rail and the words sit on the number's baseline
                                         (D-071). Imported by dayTracker.ts only, the
                                                  way nasa-card.css sits next to nasaCard.ts
                                                  (R-15).
        ├── baseLayoutEditor.ts         complete   the placement editor (D-065 to D-069). Exports
                                                  startLayoutEditor(root) -> teardown. Dev-only:
                                                  a developer drags the fifteen copies of the
                                                  modules on the real outpost panel with
                                                  ?editlayout=1, resizes them with the corner
                                                  grip, mirrors them, and downloads
                                                  baseLayout.json. It opens showing the layout on
                                                  disk, and warns about a file with problems in
                                                  it. Loaded by a dynamic import in main.ts, so it
                                                  is compiled out of a production build entirely.
        ├── base-layout-editor.css      complete   the editor's overlay: the drag handles, the
                                                  guide band and the toolbar. Imported by
                                                  baseLayoutEditor.ts only.
        └── gameLoop.ts                 complete   the shared game-loop chrome from the Figma
                                                  frames (D-038): gameHeader, gameHud,
                                                  gameWorld, gamePanel, gameScreen,
                                                  gameSection, moduleFigures, moduleArt,
                                                  MODULE_ART, WORLD_BACKGROUND,
                                                  ASTRONAUT_SPRITE. Presentation only — every word
                                                  and number arrives as an argument, and it owns
                                                  the shared artwork imports so base, act and
                                                  debrief do not copy them. `gameHeader` takes an
                                                  optional `onLeave`: with it the right-hand label
                                                  becomes a book, the screen's own help button and
                                                  a Menu button opening an in-screen leave dialog
                                                  (D-044, D-070); without it the old plain label
                                                  stays. `gamePanel` takes an optional `corner` for
                                                  the one fact in the head's top right. The HUD,
                                                  the signals and the weather pill take an
                                                  `IconName`, not a glyph.
     
    ├── dom/                            landing-page side effects, and the keyboard rules the
                                        screens share. Mostly untested (ISS-011).
        ├── keys.ts                     complete   The keyboard rules more than one screen needs:
                                                  KeyModifiers; isPlainEnter(key, modifiers);
                                                  focusHandlesEnter(tagName). Pure. They used to
                                                  live in features/supply/model.ts, where the launch
                                                  parts tour could not have them (R-5).
        ├── keys.test.ts                complete   7 tests: a plain Enter, an Enter with a
                                                  modifier, and a focused control that deals with
                                                  Enter itself.
        ├── floatAstronaut.ts           complete   218 lines. The rAF loop, the two transforms, the
                                                  resize handler, the grab lifecycle. Exports
                                                  startFloatingAstronaut -> teardown. Discards deltas
                                                  over 50ms.
        ├── forecastLoader.ts           complete   LoadedForecast; loadForecast(signal?, seed?,
                                                  dustScore?) fetches the flares and runs
                                                  createForecast. The join between data/ and sim/,
                                                  shared by base and act without a cross-feature
                                                  import. Never rejects. It also carries the
                                                  raw readings out in `flares`, because the
                                                  forecast is the game's reading of them and
                                                  the data sheet shows NASA's own (D-071).
        ├── dailyFactLoader.ts          complete   LoadedDailyFacts; loadDailyFacts(signal) fetches
                                                  the NASA daily pictures. The join between data/ and
                                                  sim/, shared by act and debrief without a
                                                  cross-feature import. Never rejects.
        ├── pointerGrab.ts              complete   207 lines. Exports attachGrab -> teardown.
                                                  Velocity is a 100ms windowed average, EMA smoothed.
        ├── svg.ts                     complete   svg(shapes, attrs?). The one place that knows
                                                  the SVG namespace: an `<svg>` holding one path
                                                  per shape, built as nodes rather than parsed,
                                                  so an icon can never carry a string a player
                                                  typed. A shape carries its own paint — fill,
                                                  stroke, width, linecap, linejoin, fill-rule —
                                                  because the supplied drawings are filled and
                                                  coloured. Used by ui/icons.ts only.
        └── starfield.ts                complete   63 lines. 140 stars across three depth layers.
                                                  Suspect: layers animate with no looping copy —
                                                  ISS-002, unverified in a browser.
     
    ├── data/                           COMPLETE. The only zone allowed to fetch. The rover's
                                        catalogue is NOT here: it moved into sim/rover.ts,
                                        because the simulation now owns the rover's whole
                                        lifecycle and data/ is for things fetched from a
                                        network (D-062).
        ├── README.md                   the quarantine rules and the live-source chain
        ├── spaceweather.ts             complete   SpaceWeatherEvent, SpaceWeatherSource
                                                  ('donki' | 'noaa' | 'fallback'),
                                                  parseFlares, parseNoaaFlares,
                                                  fetchSpaceWeather, lastSource, lastDetail,
                                                  describeWhen, strongestFlares. NASA DONKI ->
                                                  NOAA SWPC -> an empty fallback, in that
                                                  order; every flare is kept, not just the
                                                  strongest. `strongestFlares` orders the
                                                  readings for a screen that cannot show
                                                  thirty days of them (D-071).
        ├── spaceweather.test.ts        complete   31 tests; every fetch is injected
        ├── nasaGallery.ts             complete   Twelve sol cards plus a closing card,
                                                  five real region photos and forty tagged
                                                  facts. Static by choice (D-042): no
                                                  runtime image API, and the words are
                                                  unit tested here. `factForTopic`
                                                  picks the fact about one system.
        ├── nasaDaily.ts                complete   DailyFact, DailyFactSource, parseApod,
                                                  cleanExplanation, fetchDailyFacts, lastDailySource,
                                                  lastDailyDetail, resetDailyFacts, savedFactFor.
                                                  NASA's Astronomy Picture of the Day, filtered to
                                                  Mars. An enrichment layer on top of the saved
                                                  gallery, never a replacement (D-053). 17 tests.
        └── nasaGallery.test.ts         complete   25 tests; ids resolve, credits and links
                                                  present, length caps enforced, facts wrap
                                                  deterministically, every topic has facts.
     
    ├── features/                       one folder per screen. Every journey screen is built.
                                        There are no feature stubs left.
        ├── README.md                   the layout contract: four files, depth 2, which rules are
                                        enforced vs convention
        ├── naming/                     COMPLETE   Scene one. The entry screen.
            ├── README.md                           the contract
            ├── model.ts                 complete   104 lines. Exports MAX_NAME_LENGTH (24),
                                                  NameProblem, NameCheck, normaliseName,
                                                  checkName, displayName. Pure; length counted in
                                                  code points so an emoji costs 1, not 2.
            ├── model.test.ts            complete   21 tests, every input a literal
            ├── view.ts                  complete   mountNaming(root, run, setRun) -> teardown.
                                                  Validates on every keystroke; START MISSION
                                                  disabled until the name is usable.
            └── naming.css               complete   the full-bleed scene: the stage is the
                                                  backdrop for the whole window, the
                                                  astronaut stands left, Mars fills the right
                                                  and the menu column sits over it. Outfit
                                                  type, translucent panels, a radial scrim
                                                  for legibility. naming-mars-turn (150s) and
                                                  naming-astronaut-float (9s), both removed
                                                  under prefers-reduced-motion. D-049
        ├── briefing/                   COMPLETE   The mission briefing.
            ├── README.md                           the contract
            ├── model.ts                 complete   BEATS, beatsThrough, greetingFor. Pure. The
                                                  briefing says what the job is and what a day
                                                  is before the player has to live one: three
                                                  work orders, approve one, the day happens
                                                  (D-060).
            ├── model.test.ts            complete   literal-input tests
            ├── view.ts                  complete   mountBriefing(root, run, setRun) -> teardown.
                                                  One beat at a time under the artwork; NEXT or
                                                  Enter advances, Enter confirms on the last beat.
            └── briefing.css             complete   aspect-locked artwork + message bubble
        ├── supply/                     COMPLETE   The ration-check puzzle.
            ├── README.md                           the contract
            ├── model.ts                 complete   SUPPLY_BEATS, packsFor, judge, hintFor,
                                                  workingSentence, approximateTotalKg, seedFrom,
                                                  questionFor, choicesFor, promptFor,
                                                  puzzleFor, isPlainEnter, focusHandlesEnter.
                                                  The question and its four options change
                                                  every run, seeded from the astronaut name
                                                  (D-057); the keyboard rules are here so they
                                                  can be asserted. 71 tests.
            ├── model.test.ts            complete   71 literal-input tests
            ├── view.ts                  complete   mountSupply(root, run, setRun) -> teardown.
                                                  Enter advances while NEXT is visible, and
                                                  the screen resets its state on mount.
            └── supply.css               complete   beats and the ration check
        ├── launch/                     COMPLETE   The launch reel and spacecraft tour.
            ├── README.md                           the contract
            ├── model.ts                 complete   TITLE, SHOTS, PARTS, beat durations,
                                                  resolveBeatStart. 32 tests.
            ├── model.test.ts            complete   32 literal-input tests
            ├── view.ts                  complete   mountLaunch(root, run, setRun) -> teardown;
                                                  media-driven beats, poster frames
            └── launch.css               complete   film stage, parts tour, reduced motion
        ├── interior/                   COMPLETE   Walk the station and visit every room.
            ├── README.md                           the contract
            ├── model.ts                 complete   ROOMS, walker stepping, sprite mapping,
                                                  visited tracking. 42 tests.
            ├── model.test.ts            complete   42 literal-input tests
            ├── view.ts                  complete   mountInterior(root, run, setRun) -> teardown
            └── interior.css             complete   room stage, walker and exit prompts
        ├── landing-site/               COMPLETE   TASK-028. Choose a landing region, score 5 axes.
            ├── README.md                           the contract
            ├── model.ts                           complete   REGIONS, scoreRegion,
                                                    tradeoffSummary, totalScore,
                                                    strengthAndWeakness. Pure, 11 tests.
            ├── model.test.ts                      complete   11 literal-input tests
            ├── view.ts                            complete   mountLandingSite(root, run, setRun) -> teardown
            └── landing-site.css                   complete   16:9 stage, five pins, Site Analysis panel
        ├── landing-cinematic/             COMPLETE   TASK-108. The landing sequence: the film between the map and the outpost.
            ├── README.md                           the contract
            ├── model.ts                           complete   BEATS, TOTAL_DURATION_MS, cameraTransformAt,
                                                    imageOpacityAt, shakeAt, swayAt, hazeOpacityAt,
                                                    flashOpacityAt, captionOpacityAt, easeInOut.
                                                    Pure, 48 tests.
            ├── model.test.ts                      complete   48 literal-input tests
            ├── view.ts                            complete   mountLandingCinematic(root, run, setRun) -> teardown
            └── landing-cinematic.css               complete   the stage, the frames, the lower third, the skip
        ├── base/                       COMPLETE   TASK-029. Outpost overview and build panel.
            ├── README.md                           the contract
            ├── model.ts                 complete   BUILDABLE, canPlace, addModule,
                                                  removeModule, pointsLeft, upkeepFor,
                                                  previewFor, previewSummary, upcomingWarnings.
                                                  Re-exports the `sim/modules.ts` catalogue
                                                  (D-032).
            ├── model.test.ts            complete   23 literal-input tests
            ├── view.ts                  complete   mountBase(root, run, setRun) -> teardown.
                                                  Rebuilt on the game-loop shell (D-038): the
                                                  outpost on Mars, the build panel, five cards.
                                                  The supply list is NOT here: it is in the
                                                  setup popup, and the panel opens that window
                                                  (D-082). Each card says what it does and
                                                  why the button is dead, and counts the extras
                                                  against the same limit the game uses
                                                  (ISS-054, ISS-055). The HUD carries a Day
                                                  power card that moves as the panels go in
                                                  (ISS-056). The guide opens here the first
                                                  time the player arrives (D-060).
            ├── setupPopup.ts            complete   createSetupPopup(options) -> SetupPopup,
                                                  siteGoals(goals, options). The landing window:
                                                  the site, the five goals, the supply depot and
                                                  the points. Mounted on document.body, so a
                                                  redraw behind it cannot reset the page
                                                  (ISS-090). One state: the build is the
                                                  caller's `extras`, and every rule comes from
                                                  ./model (D-082).
            ├── setupPopup.css           complete   the window: backdrop, head, progress row,
                                                  the six numbers, the two columns, the footer.
                                                  Imported by setupPopup.ts only.
            └── base.css                 complete   the budget line and card reasons only
        ├── act/                        COMPLETE   TASK-030. Turn-based sol control (D-030).
            ├── README.md                           the contract
            ├── model.ts                 complete   missionHeadline, meterRows, toneFor,
                                                  changeRows, progressPercent, secondsLeft,
                                                  powerSentence, activityCosts, activityRows,
                                                  scienceSummary, scienceSentence, powerToday,
                                                  hubTiles, HubSection, HubTile, HubContext.
                                                  Pure, 38 tests. It words the hub's buttons
                                                  and never touches an icon: a model may not
                                                  import ui/ (D-070). `HubContext` carries
                                                  what NASA answered — the count of pictures
                                                  and the count of live readings — because a
                                                  model may not import data/ (D-071).
            ├── model.test.ts            complete   38 literal-input tests
            ├── view.ts                  complete   mountAct(root, run, setRun) -> teardown.
                                                  **The desk is a hub of five or six buttons**,
                                                  each a label and one line of state, and each
                                                  opens its section as a sheet over the desk
                                                  (D-070): today's tasks, the desk, the standing
                                                  orders, the colony stats, NASA's real data, and
                                                  the review of the last sol. The review button
                                                  carries the sol's net-change chips, because a
                                                  change behind a button is still a change on
                                                  screen (ISS-057). The science points sit in the
                                                  panel head's top right, the sol count in its
                                                  kicker (ISS-073). Run sol -> advanceSol; on a
                                                  finished run, setRun then navigate to
                                                  `debrief`. A crisis replaces the hub (D-040).
                                                  Every pictogram is an `IconName`; the mapping
                                                  from an activity id to its icon lives here,
                                                  not in sim/. The **real data sheet is the
                                                  whole NASA layer** (D-071): NASA's live
                                                  daily picture, the saved card for the sol,
                                                  the landing region's own photograph, NASA's
                                                  own space-weather readings with their
                                                  source, and two NASA facts.
            └── act.css                  complete   the hub tiles and chips, the tool, the crisis
                                                      option artwork, the work-order cards and
                                                      the real-data sheet's flare rows
        └── debrief/                    COMPLETE   TASK-031. Why the run was won or lost.
            ├── README.md                           the contract
            ├── model.ts                 complete   Explanation, ConsumptionSummary, NextStep,
                                                  ScienceReport, ScienceRow, explainOutcome,
                                                  consumptionSummary, blackoutSols,
                                                  reviewDecisions, timeline, lowestPoints,
                                                  usedApproximateData, nextSteps,
                                                  wentEmpty, scienceReport, scienceHeadline,
                                                  scienceDetail, scienceSentence.
                                                  Conservative ledger attribution. 32 tests.
            ├── model.test.ts            complete   32 literal-input tests
            ├── view.ts                  complete   mountDebrief(root, run, setRun) -> teardown.
                                                  Results panel, plus the journal as a mode
                                                  (D-039): decisions, sol table, honesty note.
                                                  The certificate, the patches the run earned and
                                                  the standing orders the player worked under,
                                                  which is the keepsake (D-061).
            └── debrief.css              complete   tip cards, journal entries, two-link footer
     
    └── styles/                         shared CSS: the landing page, the game-loop frame
        ├── base.css                    complete   94 lines. Tokens, reset, backdrop, nebulae.
                                                  Comment at line 60 is stale — ISS-014.
        ├── starfield.css               complete   70 lines. Carries the suspect ISS-002 animation.
        ├── astronaut.css               complete   82 lines. Three nested elements each owning one
                                                  transform, plus sway/breathe keyframes.
        ├── message.css                 complete   125 lines. Title, cursor, vignette, reduced-motion
                                                  block. Lines 100-101 contradict 110-113 — ISS-003.
        └── game-loop.css               complete   the `.gl` frame for base, act and debrief (D-038):
                                                  header, HUD cards, world, dock, panel, cards,
                                                  choices, clock, journal, the header's icon
                                                  buttons and the how-to-play guide; imported by
                                                  each feature's view.ts (R-15)
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
                                      
             ┌───────────────────────┴────────────────────┐
             v                                            v
      stepDrift (position, bounces)              stepDeform (spring)
                impact {normal, speed}                  
             └────────────────> impact()/stretch() <────┘

ui/router.ts → location.hash → parseRoute (pure) → onRoute(route) → main.ts
             → registry.resolveScreen → features/*/view.ts → teardown on navigate away
             → (dev build, ?editlayout=1) ui/baseLayoutEditor overlays the outpost panel
```

Where the modules stand on the outpost panel is **data, not code**. `ui/baseLayout.json`
holds it — a pose list per kind, one entry per copy the player could build — and
`ui/baseLayout.ts` validates it; `ui/gameLoop.ts` places the modules with it. A developer
produces that file by dragging the modules on the real screen with `?editlayout=1`
(D-065 to D-069). The editor is a developer tool, not a screen: it has no route, no mount
point and no registry entry, and `main.ts` loads it with a dynamic import behind
`import.meta.env.DEV`, so it is compiled out of a production build entirely.

**The day's loop** — the part a player lives, and where each piece of it lives:

```
act → the hub: five buttons, or six once a sol has run     features/act/model.ts
    → today's tasks opens the three work orders for today    sim/activities.ts
      (locked until the crew has done two training games     sim/training.ts
       — the standing orders sheet holds the six games)
    → the player checks the two readings on each and may work one with a tool
      (the stars only multiply the science the order is worth)  sim/minigames.ts
    → advanceSol applies the cost and the gain, deploys the rover if the
      order was the exploring one, and grows the board by two
                                                   sim/standingOrders.ts
    → the review button carries the sol's net-change chips, and the
      guide (sim/guide.ts) is an icon button in the header
```

The rotation behind the menu is **CSS keyframes**, not JavaScript: `naming-mars-turn`
(150s) and `naming-astronaut-float` (9s), both removed under
`prefers-reduced-motion`. No `requestAnimationFrame` is involved, so there is no loop
to leak on navigation and the menu needs no teardown for them.

The stage is the backdrop for the whole screen, not a panel inside the menu: it is the
first child of the `naming` section and covers the window, so the planet runs off the
top and right edges. The menu column sits on the right over the planet (D-049).

There is **no navigation bar on the entry screen**. The app has one navigation bar, the
shared `.gl__header` drawn by `gameHeader()` in `ui/gameLoop.ts`, and it appears on
exactly the four screens a player reaches once they are under way: `landing-site`,
`base`, `act` and `debrief`. `naming` and `briefing` carry none, and neither do
`supply`, `launch` or `interior`. The header's encyclopedia book is on **three** of those
four: it is earned by reaching the outpost, so `landing-site` carries the same bar without
it (D-080). Before this pass the app had four separate headers
(`naming__header`, `briefing__header`, `landing-site__header` and `.gl__header`), each
sized and drawn differently.

The planet rotates **in the image plane** (`rotate()`), not on a 3D axis. This is
forced by the asset: a sphere spun about its own axis looks identical, so a `rotateY`
would appear to do nothing (D-020).

The only game state is the `RunState` that `main.ts` owns and passes to each screen as
`(root, run, setRun)`. It is also **written to this browser as it changes** and loaded
before the router starts, so a closed tab can be picked back up from the menu's CONTINUE
(D-081). There is still no backend: the save is one `localStorage` key, not an account, so
a different browser starts a different run and Supabase remains deferred (D-003).

There are two network paths outside the landing page, both in `data/`.

**Space weather.** `base` and `act` call `dom/forecastLoader` → `data/spaceweather`, which
tries NASA DONKI, then NOAA SWPC, then an empty fallback. The event *schedule* is seeded
per run in `sim/forecast.ts` (D-048); the flare *size* is the part that comes from the
network. The loader also carries the raw readings out in `LoadedForecast.flares`, so the
act screen's **real data sheet** can show NASA's own flare classes and dates and say
where they came from, not only the game's timetable (D-071).

**NASA's daily pictures.** `act` calls `dom/dailyFactLoader` → `data/nasaDaily`, which asks
NASA's Astronomy Picture of the Day for Mars pictures and falls back to the saved gallery
when NASA is busy (D-053). This is an **enrichment layer on top of** the saved gallery,
never a replacement: the game is complete without a network, and the screen always says
which of the two it is showing.

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
13. `main.ts` collects the landing page's own layers into `landingLayers`.
14. The saved run is read (`readSave` in `ui/save.ts`) and put back into `run` **before**
    anything mounts, so a browser that restored a tab on `#/act` gets the desk with its run
    rather than the desk's "no run" fallback (D-081).
15. `startScreenRouter()` calls `startRouter`, which resolves the hash — defaulting to
    `naming` — and mounts that screen, hiding the landing layers behind it. Mounting a
    journey screen writes the save again, so the resume point follows the player.
16. In a dev build with `?editlayout=1`, `main.ts` loads `ui/baseLayoutEditor` with a
    dynamic import. The editor is attached to whichever screen is mounted, and to
    nothing in a production build (D-065).
17. In a dev build, a layout file with problems in it is listed in the console
    (D-068). The game still starts: it falls back to what it can.

Routing is last so every screen it can mount is already defined. `BACK TO MAIN MENU`
returns to `landing`, which keeps running behind the mounted screen.

## Module contracts

| module | exports | contract |
| --- | --- | --- |
| `main.ts` | none (side effects) | composition root; throws on a missing element id |
| `dom/forecastLoader` | `LoadedForecast`, `loadForecast` | `(signal?, seed = Date.now(), dustScore = NEUTRAL_SCORE.dust) -> Promise<LoadedForecast>`; never rejects. Fetches flares through `data/spaceweather`, then runs `sim/forecast.createForecast`. Sits in `dom/` because it joins `data/` and `sim/`, and both `base` and `act` need it without importing each other (R-5). `LoadedForecast.flares` carries the raw readings out, so a screen can show NASA's own space weather and not only the game's timetable (D-071) |
| `dom/dailyFactLoader` | `LoadedDailyFacts`, `loadDailyFacts` | `(signal?) -> Promise<LoadedDailyFacts>`; never rejects. Fetches NASA's daily pictures through `data/nasaDaily` and reports the source. In `dom/` for the same reason as the forecast loader: `act` and `debrief` both want it and R-5 stops them importing each other |
| `dom/svg` | `svg` | `(shapes, attrs = {}) -> SVGSVGElement`; an `<svg>` holding one `<path>` per shape, each painted with the fill, stroke, width, linecap, linejoin and fill-rule its shape carries; the `viewBox` comes from the attributes. Built as nodes rather than parsed from a string, so the one place that knows the SVG namespace can never be handed markup. Used by `ui/icons.ts` only |
| `data/spaceweather` | `SpaceWeatherEvent`, `SpaceWeatherSource` | a flare as the game uses it; source is `'donki' \| 'noaa' \| 'fallback'` |
| | `fetchSpaceWeather` | `(options?) -> Promise<SpaceWeatherEvent[]>`; never rejects. Tries NASA DONKI, then NOAA SWPC, then the empty `FALLBACK_FLARES`. Every flare is kept, not just the strongest. Remembers one answer so two screens cost one request; an answer abandoned by its caller is not remembered |
| | `parseFlares`, `parseNoaaFlares` | `(json) -> SpaceWeatherEvent[]`; validate every field and drop anything malformed rather than trusting the wire |
| | `lastSource`, `lastDetail`, `resetSpaceWeather` | what the UI reports; reset is for tests |
| | `strongestFlares` | `(flares, count = 4) -> SpaceWeatherEvent[]`; the biggest readings first, by class (A<B<C<M<X, then the number). A live feed carries days of flares and a screen cannot show them all (D-071). Pure, and it does not touch the list it was given |
| | `describeWhen` | `(peakTime) -> string`, e.g. `11 May 2024`; `'recently'` on a bad date |
| `data/nasaGallery` | `NasaFigure`, `NasaCard`, `RegionCard`, `NASA_CARDS`, `NEXT_HORIZON_CARD`, `REGION_CARDS`, `NasaFact`, `FACTS` | twelve curated sol cards plus one closing artist concept; five region photos; forty tagged facts. Every card carries an id, alt text, caption, fact, credit and source link |
| | `cardForSol`, `regionCard` | the card for a sol or a region, or `null` for one outside the run |
| | `factFor` | `(seed) -> NasaFact`; wraps deterministically so a screen can rotate facts without `Math.random` |
| | `factForTopic` | `(topic, seed) -> NasaFact`; the fact about one system, so an activity can show the fact about its own subject (D-053) |
| `data/nasaDaily` | `DailyFact`, `DailyFactSource` | one live NASA picture and its story; source is `'apod' \| 'saved'` |
| | `parseApod` | `(json) -> DailyFact[]`; every field validated, a malformed entry dropped rather than trusted |
| | `cleanExplanation` | `(text) -> string`; flattens the whitespace, drops tomorrow's teaser, and cuts on a sentence or a word — never mid-word |
| | `fetchDailyFacts` | `(options?) => Promise<DailyFact[]>`; never rejects, one request per session, and an empty list when NASA is busy. The enrichment layer on top of the saved gallery (D-053) |
| | `lastDailySource`, `lastDailyDetail`, `resetDailyFacts` | what the UI reports, and the reset for tests |
| | `savedFactFor` | `(sol) -> DailyFact`; the saved fact to fall back on |
| `sim/rover` | `RoverFind`, `RoverState`, `RoverPhase`, `FindKind`, `FindAnswer` | what the rover can find and what it has done; a find waits as `pending` until the player answers it, and nothing is found twice |
| | `ROVER_FINDS` | the catalogue of real NASA finds: three historic sites and three rare rocks, each with a NASA picture, credit and source link. Static, no runtime fetch. Pictures are addressed on NASA's picture CDN, sized to the screen and never cropped. It lives in `sim/`, not `data/`, because the simulation owns the rover's whole lifecycle (D-062) |
| | `newRover`, `deployRover`, `recallRover` | `(state) -> state`; deploying when out, or recalling when home, returns the same object. A rover with a find waiting cannot be recalled: it is still driving towards it |
| | `discover`, `canDiscover`, `remainingFinds` | `(state, catalogue, pick 0-1) -> state`; a no-op at base, with a find already waiting, or when everything is found |
| | `logSite`, `collectMaterial`, `leaveMaterial` | answer the pending find; each is a no-op for the wrong kind or when nothing waits |
| | `pickForSol` | `(sol, remaining) -> number`; which find the rover brings back on this sol. The pick is derived from the sol, not from `Math.random`, so a mission repeats |
| | `FIND_SCIENCE` | 4 — the points a find is worth. It is the only thing a find gives: the rover touches no resource (D-062) |
| `ui/readAloud` | `canReadAloud`, `readAloud`, `stopReading` | `(text, onDone?) -> boolean`; false when unsupported or the text is empty. Starts cancel any current passage first, and `stopReading()` is safe when nothing plays. Browser speech only (D-043) |
| `ui/readButton` | `readButton` | `(getText, options?) -> HTMLButtonElement \| null`; a toggle whose label, `aria-pressed` and pause hooks (`onStart`, `onStop`) are shared by every screen that reads aloud. Returns null where speech is unavailable |
| `ui/nasaCard` | `nasaCard` | `(card: NasaFigure, kicker?) -> figure`; picture, alt, caption, "Did you know?", credit and source link, plus the shared read-aloud control only when `canReadAloud()` is true. The kicker defaults to the sol for a `NasaCard` and to a plain NASA label otherwise |
| `ui/nasaFeedCard` | `nasaFeedCard` | `(fact: DailyFact, kicker?) -> figure`; the live NASA picture in the same card as the curated one. The picture is optional — a video day keeps its words |
| `ui/activityPlayer` | `Inspection`, `InspectionResult`, `makeInspection` | `(engine, sol) -> Inspection`; the work-order player for one order: which tool it uses, what the two readings ask for, and how it is graded. The grading itself is in `sim/minigames.ts`, so the rules stay pure (D-060). `Inspection.done()` reports whether the player has finished; nothing gates on it yet, so the Finish button is always there |
| `ui/guide` | `guidePanel`, `guideButton` | `guidePanel(onClose) -> HTMLElement`; the how-to-play **popup**, returned as the **backdrop** so the caller can mount it on `document.body`. The astronaut stands on the left and the words are in a speech bubble on the right, **one step per page**, with a header pill, a tail pointing at him, Next, Back, page dots, Read aloud and a close button. It owns `Escape`, the backdrop click, a Tab trap, `ArrowLeft`/`ArrowRight` to turn pages, and hands the focus back to the `?` button when it closes. Mounted on the document rather than inside the screen, so a redraw behind it cannot reset the page (ISS-077). `guideButton(onOpen) -> HTMLButtonElement`; the `?` icon button in the header, beside Menu, on every screen that opts in with `ScreenOptions.help`. The words are in `sim/guide.ts` (D-060, D-070, D-073) |
| `ui/icons` | `IconName`, `ICON_PATHS`, `RESOURCE_ICON`, `RANK_ICON`, `MODULE_ICON`, `icon` | `ICON_PATHS: Record<IconName, readonly Shape[]>` — the game's pictogram set: the 56 drawings supplied in `Assets/icons/`, read with `?raw` and parsed into path data at build time, so the drawing on the screen is the drawing that was designed. Filled and coloured, in a 96-unit box, and drawn through `dom/svg.svg`. `icon(name, label?) -> SVGSVGElement`: decorative and hidden from a screen reader unless `label` is given, in which case it becomes an `img` with that name. `RESOURCE_ICON` maps the five stores, `RANK_ICON` the five science ranks and `MODULE_ICON` the eight module kinds — the one picture per thing, so a store looks the same on every screen. Pure data plus one DOM builder, so a test can read every path without a browser (D-070, D-083) |
| `ui/sheet` | `SheetOptions`, `sheet`, `sheetCloseButton` | `(options: {icon, kicker?, title, body, footer?, doneLabel?, layer?, onClose}) -> HTMLElement`; one section of a screen as a dialog over it: backdrop, card, header bar, scrolling `.sheet__body`, closing button, and one `onClose` for the close button, the done button, the backdrop and `Escape`. A Tab trap keeps focus inside. The body's children keep their own heights and the body scrolls, so a picture is never clipped by its own card (ISS-076). `layer` picks the rung of the stacking ladder: `section` (105) by default, `tool` (108) for a sheet opened **over** another sheet. `sheetCloseButton(mounted) -> HTMLElement \| null` finds the button to focus once it is in the document. The act hub's five or six tiles open into it (D-070) |
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
| `sim/resources` | `ResourceName`, `ResourceStores` | the five stores; `power` is kWh in the batteries and the other four are 0-100 percentages. `readonly` |
| | `STORE_CAPACITY`, `LIFE_STORES` | 100 for the four tanks; power is capped by the batteries built. `LIFE_STORES` is the four that end a run — power deliberately is not one of them |
| | `drainForSol` | `(stores, net, powerCapacity) -> ResourceStores`; pure, never mutates its argument. `net` is the change, positive or negative, so the same function covers a drain and a refill |
| | `clampStores` | `(stores, powerCapacity) -> ResourceStores`; keeps every store inside its tank |
| | `depletedStores` | `(stores) -> ResourceName[]`; the stores at or below zero |
| | `createInitialStores` | `(overrides?) -> ResourceStores` |
| | `percentOf` | `(name, stores, powerCapacity) -> number`; how full a store is, for the HUD |
| `sim/modules` | `ModuleKind` | the eight catalogue kinds |
| | `ModuleSpec`, `MODULE_CATALOGUE` | every spec: name, cost, max count, what it gives, what it needs, and any build gate. No pictogram: a pure model may not carry one, so the module's picture is `ui/icons.ts`'s `MODULE_ICON` (D-083) |
| | `CORE_MODULES` | the four the lander brings: habitat, life-support, solar-array, batteries |
| | `specOf` | `(kind) -> ModuleSpec`; throws a `RangeError` on an unknown kind |
| | `siteAllows` | `(kind, regionId) -> boolean`; whether the ground can host the module at all, so the build card and the water goal ask one function instead of answering the same `requires` rule twice (ISS-079) |
| | `countOf` | `(modules, kind) -> number` |
| | `systemsFor` | `(modules, regionId) -> Systems`; the whole outpost as one object: solar, battery, load, what the crew gets and what it costs |
| | `extrasOf`, `pointsSpent`, `extraSlots`, `extraModuleCount` | what the player built beyond the core, what it cost, and how many more would fit |
| | `extraLimitOf` | `(kind) -> number`; the limit minus the lander's copy, so the build card and the limit count the same thing (ISS-054) |
| | `BUILD_BUDGET` 18, `LOAD_KW`, `GREENHOUSE_WATER` 3, `SHIELDING_BASE` 30, `SHIELDING_EROSION` 0.5 | the balance. These five numbers are what made the game unwinnable once; `npm run balance` is what says so next time (ISS-061, D-064) |
| | `CREW_SIZE`, `SUN_HOURS`, `NIGHT_HOURS`, `OXYGEN_PER_CREW`, `WATER_PER_CREW`, `FOOD_PER_CREW` | the crew and the day; **every tuning number the sol maths uses** |
| `sim/forecast` | `ForecastEvent`, `FlareInput`, `ForecastKind` | the run's forecast events; `intensity` is 1-3 for a flare and 0 for the pod and storm |
| | `flareIntensity` | `(classType) -> 1 \| 2 \| 3`; X = 3, M = 2, C and below = 1 |
| | `createForecast` | `(flares, seed = DEFAULT_SEED, dustScore = NEUTRAL_SCORE.dust) -> ForecastEvent[]`; the timetable is seeded, sols 2-10, one event at a time, at least one flare and two events. Flare sizes come from the M/X pool, or from the long-run NOAA mix when it is empty |
| | `createSeededRandom`, `planEvents`, `randomSolBetween`, `stormChance` | the pure sampler; `planEvents(random, dustScore)` decides the storm, pod and flare sols |
| | `visibleForecast`, `WARNING_SOLS` | what the crew can see on a given sol: pod always, storm 3 sols ahead, flare 1 sol ahead |
| | `MIN_CLEAR_SOLS`, `forecastIsSpaced` | the quiet sols required between two events, and the check that a timetable honours it (D-056) |
| | `eventsStartingOn`, `stormOn`, `stormOpacity` | lookups over the forecast; opacity is a calm-site curve, 0.2-0.95 |
| `sim/crises` | `Crisis`, `CrisisOption`, `COUNTDOWN_SECONDS` | the moment a forecast event stops the clock and what is asked |
| | `crisisForEvent`, `pendingCrisis` | the crisis for a forecast event, and the one waiting before the next sol |
| | `optionOf` | `(crisis, optionId) -> CrisisOption \| null` |
| | `earthIsInTime`, `earthAdvice` | the "Earth cannot answer in time" copy, and what Mission Control would suggest |
| `sim/activities` | `ActivitySpec`, `ActivityOffer`, `ActivityStores`, `ActivityStoreName`, `ActivityRequirement`, `SolPlan` | one activity the crew can spend a sol on, and the shape of a sol plan. No `icon`: the pictogram is mapped by id in `features/act/view.ts` (D-070) |
| | `ACTIVITY_CATALOGUE` | the twelve activities: cost, gain, science points, topic, the science goal it serves, and the build gate that can lock one |
| | `SOL_PLANS` | the twelve sol plans: headline, subtitle, and the three activity ids offered. The schedule is fixed, so a demo repeats |
| | `activityById`, `planForSol` | lookups; both return `null` for something unknown |
| | `lockedReason`, `offerForSpec`, `offerFor` | whether the outpost is ready for an activity today, and the three offered on a sol (D-051) |
| `sim/science` | `ScienceRank`, `SCIENCE_RANKS`, `SOL_LOG_POINTS` | the rank ladder and the point for a sol log. A rank is an id, a title and a threshold — the pictogram is `ui/icons.ts`'s `RANK_ICON`, so this file stays free of the DOM (D-070) |
| | `rankFor` | `(points) -> ScienceRank`; never throws, a broken score is the bottom rank |
| | `rankProgress` | `(points) -> { current, next, percent, toNext }`; the road to the next rank, with no NaN at the top (D-052) |
| `sim/topics` | `ScienceTopic`, `SCIENCE_TOPICS`, `TOPIC_LABEL`, `isScienceTopic` | the vocabulary the activities and the NASA facts share, so a screen can show the fact about the system it is teaching. One topic per science goal, plus `missions` for the science that is not about a system |
| `sim/goals` | `ScienceGoal`, `GoalSpec`, `GoalReading`, `GoalStatus`, `GoalObjective` | the five science goals and one reading of each |
| | `SCIENCE_GOALS`, `goalById` | the five goals in the order they are shown: dust storm, life support, radiation, power, food. Each carries its own question and its own NASA fact topic (D-058) |
| | `goalReadings` | `(run) => GoalReading[]`; how each goal is doing right now, worked out from the sim — the storm actually running, the panels' real output, the stores as they stand, the last sol's blackout |
| | `goalProgress` | `(run) => GoalObjective[]`; what the player kept running and for how long. There is deliberately **no target and no score**: the goals are the learning outcomes, not a second win condition (D-061) |
| | `GOAL_AIMS` | the one line each goal says it is aiming at, printed in the debrief |
| `sim/standingOrders` | `StandingOrder`, `STANDING_ORDERS` | the twenty-four rules the player works to, two arriving every sol. They are the five learning goals in the order the player meets them (D-060, D-061) |
| | `ordersThrough`, `ordersForSol` | `(sol) => readonly StandingOrder[]`; the whole board so far, and the two that are new today |
| | `orderById` | `(id) => StandingOrder \| null` |
| `sim/minigames` | `EngineKind`, `Grade`, `ENGINE_ORDER`, `ENGINE_UNLOCK_SOL`, `ENGINE_NAME` | the six tools and when each becomes available: one a sol for the first six sols. The rule that matters is that **every sol has at least one order the player can work** (ISS-065) |
| | `engineUnlocked` | `(engine, sol) => boolean` |
| | `gradeSequence`, `gradeRadar`, `gradeTiming`, `gradeSort`, `gradePack`, `gradeMatch` | how each tool is graded, and how many stars it won. The stars multiply the science an order is worth and never touch a store (D-063) |
| `sim/guide` | `GuideWhere`, `GuideStep`, `GUIDE_STEPS`, `guideStep` | the how-to-play guide: ten steps, each saying where it happens and what to do about it. The words live here so they can be read and tested without a browser (D-060) |
| `sim/training` | `TrainingGameId`, `TrainingPerformance`, `TRAINING_GAMES`, `TRAINING_DAILY_LIMIT`, `TRAINING_REWARDS` | the six training games and the daily rule: **two games a sol, each game once a sol, and today's work orders open once they are done**. The rule is enforced here rather than by hiding a button, so a player who finds a way past the button is not paid for it (D-075) |
| | `TrainingState`, `TrainingCompletion`, `TrainingDay`, `TrainingGameRow` | what the crew has done in training today, and where each of the six games stands |
| | `trainingDay`, `trainingUnlocked`, `trainingSol` | `(run) => TrainingDay`; today's training read off the run. A new sol starts a new day, and that is the daily reset — it is derived from the sol rather than from a timer, so it happens exactly once per sol (D-075) |
| | `canStartTraining` | `(run, gameId) => TrainingStart`; may this game be played right now, and if not, the sentence the player reads. A game finished today can be played again for practice; finishing it pays nothing |
| | `completeTraining` | `(run, gameId, performance) => TrainingOutcome`; records the game and pays for it. The points go onto the science score, the one balance the game already has, and a second claim for the same game is refused (D-075) |
| | `makeRandom`, `trainingSeed` | the generator the games are handed instead of `Math.random`, so a sol always deals the same cards and a test can pin its input |
| | `TrainingRecord`, `EMPTY_TRAINING_RECORD`, `trainingDayFor`, `withTrainingDay`, `trainingDayRecord` | the shape of the record as it is written down. Pure: the storage itself is in `ui/training.ts`, which is the only layer that is allowed to know a browser exists (D-075) |
| `sim/trainingMerge` | `MERGE_SIZE`, `MERGE_TARGET`, `slideMergeLine`, `moveMerge`, `spawnMerge`, `canMerge`, `mergeBest`, `mergePerformance` | the merge board: sixteen crates, and two of a kind make one of the next kind. The colony pod is the top of the ladder (D-075) |
| `sim/trainingMemory` | `MEMORY_FACES`, `dealMemoryDeck`, `memoryMatch`, `memoryPerformance` | the deck of twelve cards, six pairs, dealt from the generator, and the rule that says whether two cards match (D-075) |
| `sim/trainingRover` | `ROVER_MAPS`, `roverRoute`, `roverMovesAllowed`, `roverPerformance` | the ground the rover crosses and the shortest route over it, found by a breadth-first search. The move budget is that route plus a few moves, so every map is winnable by construction (D-075) |
| `sim/trainingSolar` | `generateSolarPuzzle`, `solarFlow`, `rotateSolarTile`, `solarTapsNeeded`, `solarPerformance` | the power board, generated rather than written down: a route is carved and every tile on it is turned away from its answer, so the game is always winnable and never starts solved (D-075) |
| `sim/trainingCargo` | `CARGO_BOXES`, `CARGO_ITEMS`, `dealCargoRound`, `cargoPerformance` | the supplies that land and the stores they belong in. Every store gets at least one crate (D-075) |
| `sim/trainingAsteroid` | `ASTEROID_GOAL`, `ASTEROID_SECONDS`, `asteroidDelay`, `asteroidLife`, `asteroidIsDecoy`, `asteroidAccuracy`, `asteroidPerformance` | the round outside the outpost: what drifts past, how fast, and what a friendly satellite costs the player (D-075) |
| `ui/training` | `trainingSection`, `openTrainingGame`, `readTrainingRecord`, `writeTrainingDay`, `applyTrainingRecord`, `clearTrainingRecord` | the ASTRONAUT TRAINING section at the top of the Standing orders sheet, the dialog a game is played in, and the record of the day's training. The record is written to `localStorage` under one key, so a refresh does not hand the player the same two games again (D-075); it is cleared when a **new run** begins — naming the astronaut, or "play again" — and a refresh is not a new run any more, because the run itself is saved separately by `ui/save.ts` (D-081, D-084) |
| | `applyTrainingRecord` | `(run) => RunState`; puts the written-down training back onto a run that has not trained yet today. A run that has already trained keeps what it did — the session is the truer record, and a browser that refused to write must not take points away (D-075) |
| `ui/trainingGame` | `TrainingGameContext`, `TrainingGameHandle`, `TrainingGameMount` | the contract every training game keeps: a status line, a completion callback, a generator, and a `destroy` that stops every timer the game started (D-075) |
| `sim/patches` | `Patch`, `patchesFor`, `PATCH_COUNT` | the ten badges a run earns, worked out from the run itself; the debrief prints the ones that were earned (D-060). No `icon`: `features/debrief/view.ts` maps a patch id to an `IconName` (D-070) |
| `sim/deskNotes` | `NoteFrom`, `DeskNote`, `DESK_NOTES`, `noteForSol` | the notes from home and the crew that land on the desk; one per sol, and none twice |
| `sim/comms` | `REAL_MIN_ONE_WAY_MINUTES`, `REAL_MAX_ONE_WAY_MINUTES` | the real 3-22 minute range, for the approximation note |
| | `oneWayMinutes`, `roundTripMinutes`, `earthCanAnswerInTime` | a simplified rising delay over the run; labelled approximate in the UI |
| `sim/sol` | `advanceSol` | `(run) -> RunState`; solar generation, module draw + night drain, crew use, forecast events, the chosen activity, science points, clamp/cap, status. **Turn-based: one sol per call** (D-030) |
| | `decide` | `(run, crisisId, optionId, timedOut?) -> RunState`; records the player's crisis choice. Throws on an unknown crisis or option |
| | `projectSol` | `(run) -> SolRecord`; what a calm sol would do, for the trade-off preview and Mission Control's advice |
| | `powerPicture` | `(run) -> { generatedKw, storedKwh, nightDrainKw, capacityKwh }`; the README's power picture |
| | `isRunOver`, `lostStores`, `endedBy` | whether the run has ended, and which life store ended it. Power is not a life store |
| | `isSelfSustaining` | `(run) -> boolean`; a calm sol leaves air, water and food level or better |
| | `WIN_SOL` | 12 — the run is won by living through this many sols |
| `sim/run` | `RunState` | `sol, regionId, astronautName, stores, status, modules, panelHealth, science, chosenActivity, forecast, log, decisions, rover, inspections` — the only thing shared between screens |
| | `RunStatus`, `SolEvent`, `DecisionRecord`, `SolRecord`, `SolActivity`, `Inspection` | what a sol did: the stores, the net, the blackout, the activity, the events and the notes. `Inspection` is how many stars an order was worked for |
| | `newRun` | `(regionId, astronautName?) -> RunState` |
| | `landAt` | `(run, regionId) -> RunState`; sets the region, keeping the astronaut's name |
| | `hasReachedOutpost` | `(run: RunState \| null) -> boolean`; true once a landing site has been chosen, so the crew is on Mars. The one question a screen asks about how far a run has got — it gates the header's encyclopedia book, and `base`'s no-run fallback fails it on purpose (D-080) |
| | `startOutpost` | `(run, modules) -> RunState`; lands the outpost with full batteries and the shielding those modules give, and resets the score |
| | `withState` | `(run, patch) -> RunState` |
| | `answerRoverFind` | `(run, answer) -> RunState`; answers the find the rover brought back and adds `FIND_SCIENCE`. A no-op when nothing waits |
| | `recordInspection`, `inspectionStars` | how an order was worked, and how many stars it won (D-063) |
| `sim/save` | `SAVE_VERSION` | 1 — bumped when `RunState` changes shape in a way the decoder cannot repair, so an old save is ignored rather than half-read (D-081) |
| | `encodeRun` | `(run) -> unknown`; the run as something `JSON.stringify` can carry. A copy, so a later `withState` cannot reach into text already written |
| | `decodeRun` | `(unknown) -> RunState \| null`; the spine (sol, region, name, stores, status, modules, panel health, science) is required, and everything past it is repaired from a fresh run. Null when there is no run to resume |
| `ui/routes` | `Route` | `'naming' \| 'briefing' \| 'supply' \| 'launch' \| 'interior' \| 'landing' \| 'landing-site' \| 'landing-cinematic' \| 'base' \| 'act' \| 'debrief'` |
| | `ROUTE_ORDER` | the routes in play order, `naming` first |
| | `DEFAULT_ROUTE` | `'naming'` — the entry screen (D-021) |
| | `parseRoute` | `(hash) -> Route \| null`; tolerant of missing/duplicated `/`, whitespace, case, query string. Returns null rather than throwing |
| | `routeToHash` | `(route) -> '#/<route>'` |
| | `nextRoute`, `previousRoute` | `(route) -> Route \| null`; null at the ends |
| `ui/router` | `startRouter` | `({onRoute, onUnknownHash?}) -> teardown`; fires `onRoute` once immediately and on every `hashchange`; normalises an unknown hash via `replaceState` |
| | `navigate` | `(route) => void`; assigns `location.hash` so Back works. `startRouter` calls `stopReading()` on every route change so a voice cannot follow the player into the next screen |
| `ui/save` | `SavedGame` | `{ run, screen }` — the run and the screen the player left it on |
| | `readSave`, `writeSave`, `clearSave` | the one versioned key (`mars-horizon.save.v1`), every read wrapped. A browser that refuses storage costs the player nothing but the ability to come back (D-081) |
| | `isSaveableScreen` | `(route) -> boolean`; a stop in the journey, and not the menu that offers CONTINUE |
| | `resumeScreen` | `(save) -> Route`; the screen they left, or — for a save that cannot go there — the report, the desk or the briefing, in that order |
| `ui/registry` | `screenMount` | `(route) => selector \| null`; null when nothing is built for that route |
| | `resolveScreen` | `(route) => ScreenFactory \| null`; null when nothing is built |
| | `nextStop` | `(route) => Route \| null`; the next built screen, or the placeholder when the next is unbuilt |
| | `allScreenMounts` | `() => string[]`; every mount selector, for the shell to hide |
| | `ScreenFactory` | `(root, run, setRun) => teardown`; teardown is mandatory, not optional |
| `features/naming/model` | `MAX_NAME_LENGTH` | 24, counted in code points |
| | `normaliseName` | trims and collapses whitespace runs |
| | `checkName` | `(raw) -> {ok, value, problem}`; returns the normalised value so a caller never normalises twice |
| | `displayName` | strips control characters and caps length — the one string interpolated into markup |
| | `ReturningPlayer`, `ReturningMenu`, `returningMenu` | `({name, sol, landed, finished}) -> {greeting, note}`; the menu's two lines for a player with a run on this device — "Welcome back, Riley." and where they stopped (D-081) |
| `features/naming/view` | `mountNaming` | `(root, run, setRun) -> teardown`; START MISSION disabled until the name is usable. With a save on the device it shows the greeting, CONTINUE and START OVER instead of the form |
| `features/supply/model` | `SUPPLY_BEATS`, `CHOICES`, `CORRECT_ANSWER` | the six spoken facts, the four answer buttons and the right answer |
| | `packsFor`, `judge`, `hintFor` | the ration arithmetic and what to say about a wrong pick; no answer in the working until it is earned |
| | `isPlainEnter` | `(key, modifiers) -> boolean`; an unmodified Enter is the one key the screen answers |
| | `focusHandlesEnter` | `(tagName) -> boolean`; a focused button, link or field deals with Enter itself, so the screen must not answer it as well |
| `features/supply/view` | `mountSupply` | `(root, run, setRun) -> teardown`; one `window` keydown listener advances the beats while NEXT is visible, and the screen resets its state on mount because its markup is static (D-052) |
| `features/landing-site/model` | `REGIONS` | the five authored regions, re-exported from `sim/regions` |
| | `scoreRegion` | `(regionId) -> SiteScore`; all-zero safe score for an unknown id, never throws |
| | `tradeoffSummary` | `(score) -> string`; names strongest and weakest axis, never "recommended" |
| | `totalScore` | `(score) -> number`, 0-25 |
| | `strengthAndWeakness` | `(score) -> {strength, weakness}` axes |
| `features/landing-site/view` | `mountLandingSite` | `(root, run, setRun) -> teardown`; map + five pins + Site Analysis panel, LAND HERE calls `landAt` then navigates to `nextStop('landing-site')`. Selecting a pin also shows that region's real NASA photo and fact (`regionCard`). It also prepends the shared navigation bar (`gameHeader('LANDING SITE', …)`) and removes it on teardown, so this screen carries the same bar as `base`, `act` and `debrief` |
| `ui/gameLoop` | `gameScreen`, `gameWorld`, `gamePanel`, `gameSection`, `gameHeader`, `gameHud`, `HeaderOptions`, `PanelOptions`, `ScreenOptions`, `HudStat`, `SignalCard`, `WorldOptions` | the shared frame from the Figma frames (D-038): one `.gl` root, the illustrated world panel, and the scrolling right-hand panel. Every word, number and variant arrives in an options object; no `sim/` rule is applied here. `HudStat.icon`, `SignalCard.icon` and `WorldOptions.weatherIcon` are `IconName`, never a glyph (D-070) |
| | `moduleFigures`, `moduleArt`, `MODULE_ART`, `WORLD_BACKGROUND`, `ASTRONAUT_SPRITE` | the artwork the world panel draws, owned here so `base`, `act` and `debrief` do not copy the imports |
| | `gameHeader`, `gameHud`, `gameDock` | `gameHeader(options: HeaderOptions)`; without `onLeave` the right-hand label is plain decorative text; with it, the right side becomes the screen's own `help` button and a Menu button opening an in-screen leave dialog with Keep playing / Leave mission (D-044), plus the **encyclopedia book when the screen asks for it** — `showEncyclopedia` is off unless a screen passes true, and only `base`, `act` and `debrief` do, because the reference is earned at the outpost (D-080). `gameHud` draws the five resource cards (`HudStat`) and `gameDock` the three-tab dock. `day` puts the mission-day tracker in the bar, between the brand and the controls: a screen with a run in play passes one, and a screen without one leaves its bar unchanged (D-070). The pause/settings/BUILD pills and the dock are `aria-hidden` spans, not buttons (D-038) |
| | `gameSection` | `(label, ...content) -> section`; an uppercase label and its body |
| | `gameScreen` | `(options: ScreenOptions) -> section`; `help` carries the guide's `?` icon button in the header (D-060, D-070), and `panel.corner` puts the panel head's one right-hand fact in place (the science points, on `act`). There is no mission bar: it was removed in D-070, so the panel's own kicker names the day. `day?: DayModel` puts the mission-day tracker in the header (D-070). The rover button is gone: the rover is part of the run now, not a widget on the wall (D-062) |
| | `moduleFigures`, `moduleArt`, `MODULE_ART`, `WORLD_BACKGROUND`, `ASTRONAUT_SPRITE` | artwork placement and the bundled asset URLs; the only import site for the figures base, act and debrief share |
| `ui/dayTracker` | `dayModel`, `dayTracker` | `dayModel(run, advanced?) -> DayModel`: the mission-day tracker read off a run. Pure. The day in play is `sol + 1`, because `run.sol` counts the sols already flown; a finished run has no day in play. The total comes from `WIN_SOL`, never from a number typed here. `advanced` is the sol that has just been flown, which the act screen passes so one pip can flash (D-070) |
| | `DayModel`, `DayState` | `DayModel` is `{day, done, total, states, advanced}` — the day in play, the days flown, the length of the mission, one state per day (`done`, `current` or `upcoming`) and the sol that just moved. `DayState` is that per-day state |
| `features/landing-cinematic/model` | `BEATS`, `TOTAL_DURATION_MS` | the whole film: six beats, their times, the camera moves and the captions. One number for the runtime, so nothing can drift (D-085) |
| | `cameraTransformAt`, `imageOpacityAt`, `captionOpacityAt`, `shakeAt`, `swayAt`, `hazeOpacityAt`, `flashOpacityAt`, `easeInOut` | what the film looks like at one moment, worked out in arithmetic. The camera is interpolated rather than keyframed, so the easing lives here and can be tested |
| `features/landing-cinematic/view` | `mountLandingCinematic` | `(root, run, setRun) -> teardown`; plays the film for the region in the run and hands on to `base`. One `requestAnimationFrame` loop and one number - the milliseconds of film played - writes the whole screen, and only `transform` and `opacity` are ever written. The frames are decoded before the clock starts, a hidden tab pauses it, and SKIP, Escape and Enter all end it the same way: on black, and then the outpost |
| `data/landingFacts` | `LANDING_FACTS`, `ZONE_FACTS`, `factById`, `zoneFact` | the NASA facts the film teaches, each with the NASA page it came from, and the one about each landing region. No request at all: the game is complete without a network |
| `ui/landingFrames` | `LANDING_FRAME_URLS`, `preloadLandingFrames` | the five frames of the sequence, and the idle fetch that puts them in the cache before the player reaches them |
| `ui/handoffFade` | `playHandoffFade` | puts up the black curtain one screen hands over through, and lifts it again. The Day 1 screen is not touched by the hand-off (D-085) |
| `features/base/model` | `BUILDABLE`, `canPlace`, `addModule`, `removeModule`, `pointsLeft` | build rules over the `sim/modules.ts` catalogue (D-032). `canPlace` asks `siteAllows`, so the card and the goals panel cannot disagree about a site (ISS-079) |
| | `buildCards`, `BuildCard` | the catalogue as cards. `have`/`limit` drive the minus button; `total`/`maxCount` are the number on the card and its maximum, and `fromLander` marks the free copy the lander brought (ISS-089, ISS-054) |
| | `goalPreview`, `GoalPreview` | whether the build holds each of the five goals, and a sentence naming the cause when it does not. The water sentence is computed from the build and the site, not a fixed string (ISS-079) |
| | `RESTART_NOTE` | what the launch button says when the outpost has already landed and pressing it starts the run over (ISS-081) |
| | `previewFor`, `previewSummary`, `upkeepFor`, `upcomingWarnings` | the calm-sol projection. `previewSummary` gives the five resource cards one number each, from the same projection as the sentences |
| `features/base/view` | `mountBase` | `(root, run, setRun) -> teardown`; the outpost on Mars, the build panel, and Land & start sol 1 → `startOutpost` then `act`. Holds a mutable local `extras` so a second build is not applied to stale data; it also shows a rotating NASA fact beside the build panel from `factFor`. The HUD carries a Day power card that moves as the panels go in (ISS-056), and the guide opens here the first time the player arrives (D-060). A redraw records the panel's scroll offset and the focused control and restores both, and the toast removes its own node instead of redrawing (ISS-080). Once the outpost has landed the button reads "Land again from sol 1" and the note under it says the run resets (ISS-081). **The supply list is not here**: it is in the setup popup, and the panel's "Choose your extras" button opens that window, so the supplies are never on screen twice (D-082). The popup's button and the panel's button call the same `land()` |
| `features/base/setupPopup` | `createSetupPopup`, `siteGoals` | `createSetupPopup(options) -> SetupPopup`: the landing window — the site, the five goals, the six supplies and the points. The returned `element` is the **backdrop**, so the caller mounts it on `document.body` and a redraw behind it cannot reset the page (ISS-090). It owns `Escape`, the backdrop click and a Tab trap. The build is the caller's: `onChange(extras, message)` hands the new build back, `onLaunch` lands the outpost and `onClose` closes the window, so there is one state and one set of rules (D-082). `update(extras)` redraws it. `siteGoals(goals, options)` draws the five goals as the game's own rows, with the panel's rows and the window's |
| `features/supply/model` | `SUPPLY_BEATS`, `packsFor`, `judge`, `hintFor`, `workingSentence`, `approximateTotalKg` | the ration check over `sim/modules.ts`; the crew size is read from the sim, not typed in, so it agrees with the briefing (ISS-044) |
| | `seedFrom`, `questionFor`, `choicesFor`, `promptFor`, `puzzleFor` | the question and its four options for one run. The mission length, the answer and the button order all vary, seeded from the astronaut name so a demo repeats and a test can pin it (D-057) |
| `features/act/model` | `missionHeadline`, `meterRows`, `changeRows`, `toneFor`, `secondsLeft`, `powerSentence` | presentation helpers over `sim/sol`; `meterRows` carries `percent` and `tone` for the stats sheet |
| | `powerToday`, `TodayPower` | the sol's power picture: `stored` is the level in the batteries (the HUD meter), `available` is the day's budget after the chosen activity's draw (the "For today" mini card), and `nightCovered` says whether the bank covers the night (ISS-060, ISS-078) |
| | `lastPowerLine` | the last sol's generated/used figures, or its blackout percentage, as one sentence under the meters. Empty before the first sol (ISS-082) |
| | `activityRows`, `activityCosts` | the three work orders offered on a sol, and what each costs and gives |
| | `hubTiles(run, context)`, `HubSection`, `HubTile`, `HubContext` | the desk as five buttons, or six once a sol has run: each a label, one line of state, a `chips` list for the review, and whether it `attention`s. Pure words — no icon, because a model may not import `ui/` (D-070) |
| | `scienceSummary`, `scienceSentence` | the score, the rank, and the road to the next one |
| | `powerToday` | `(run) => number`; the power the crew can actually spend today — what is left after the panels have filled the batteries and the systems have taken their share. It is the number the order prices come out of, and the number the power card shows (ISS-060) |
| `features/act/view` | `mountAct` | `(root, run, setRun) -> teardown`; **the desk is a hub of five buttons, or six after a sol** (D-070): today's tasks, the desk, the standing orders, the colony stats, NASA's real data, and the review of the last sol. Each is a label and one line of state, and each opens its section as a `ui/sheet` over the desk. The review tile carries the sol's net-change chips, so a change is never only behind a button (ISS-057). The science points sit in the panel head's top right and `Sol N of 12` in its kicker (ISS-073). The **real data sheet is the whole NASA layer** (D-071): the live daily picture, the saved card for the sol, the landing region's own photograph, NASA's own space-weather readings with their source, and two NASA facts; the tile counts what is behind it. The **mini game opens in its own sheet**, over the orders it belongs to, and never inside the desk sheet (D-079, ISS-093). Run sol calls `advanceSol`, then `setRun`; a finished run navigates to `debrief`. A crisis replaces the hub in place, with its countdown and "take your time" switch (D-040). An activity's pictogram is mapped from its id here, not in `sim/` |
| `features/debrief/model` | `explainOutcome` | `(run) -> {headline, detail, confident}`; conservative ledger attribution — only claims a cause when a logged fact establishes it, otherwise `confident: false` and the screen points at the timeline |
| | `scienceReport`, `scienceHeadline`, `scienceDetail`, `scienceSentence` | what science the run did, the rank it earned, and every activity the crew chose. Measures the science, not the outcome (D-052) |
| | `consumptionSummary`, `lowestPoints`, `blackoutSols`, `reviewDecisions`, `timeline` | arithmetic over the log; per-decision verdicts from fixed option rules; one row per sol |
| | `nextSteps`, `wentEmpty`, `usedApproximateData` | what to try next, each step tied to a fact from this run and carrying an `art` hint; the store that ended the run; whether any flare size was approximate |
| `features/debrief/view` | `mountDebrief` | `(root, run, setRun) -> teardown`; the results panel with the Mars Science Score, and the journal as a mode reached from "View my Mars story" (D-039). "Try a new outpost" calls `newRun` then `landing-site`; it shows a rotating NASA fact next to the closing card from `factFor`. It also prints the certificate, the patches the run earned, and the standing orders the player worked under — the keepsake (D-061) |
| `features/launch/model` | `TITLE` | `'THE MISSION BEGINS'` — the card that holds before the first still |
| | `NASA_FACT` | one real fact about the rocket itself, which no shot is about: a rocket that goes far drops its empty fuel tanks partway up. Carried in the spoken description rather than as a beat, so the reel does not slow down for it |
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
| | `SKIP_LABEL`, `SKIP_DESCRIPTION` | the skip button's word and its aria text; the description says where the player goes, because "Skip" alone does not say skip *what* (D-072) |
| | `FILMS_BEGIN_MS` | the slot the films start at — title plus both stills, derived from them so the reel's timing cannot drift from its parts |
| | `SKIP_APPEARS_MS` | when the skip button turns up: halfway through the departure, derived from `FILMS_BEGIN_MS`. Up before the films, so the films can be cut, and up after the title card, which always plays (D-072) |
| | `TOTAL_DURATION_MS` | title + shots + both films; the reel's *nominal* runtime, not a timer — the screen exits at the Continue button in the parts tour, when the last film ends, or when the player skips |
| | `resolveBeatStart` | `(earliestMs, readyAtMs) -> ms`; a beat starts at the later of its slot and its clip's readiness |
| `features/launch/view` | `mountLaunch` | `(root, run) -> teardown`; plays the stills, then the launch film and the docking clip, then opens the interactive parts tour. Beats are media-driven: only the launch film loads up front, the docking clip loads when the film's beat starts, each has a poster, and a beat waits for its clip rather than being skipped. Reduced motion holds the stills and both films. A **SKIP** button appears halfway through the departure — whether or not the clip has buffered — and cuts the reel to the parts tour, which is where the reel ends anyway (D-072); the parts panel takes the focus when it opens, because the skip button vanishes under the player's finger. The parts tour is static images and text — Prev / Next move between parts, disabled at the boundaries, Continue hands off. The parts tour also shows a rotating NASA fact per part from `factFor(index)` into `[data-launch-parts-fact]`, so the tour teaches while it shows. |
| `dom/floatAstronaut` | `startFloatingAstronaut` | `(wrapper, {deformLayer, reducedMotion}) -> teardown`; cancels rAF, removes the resize listener, detaches the grab, clears the transform |
| `dom/keys` | `KeyModifiers`, `isPlainEnter`, `focusHandlesEnter` | `(key, modifiers) -> boolean` and `(tagName) -> boolean`. The shared keyboard rules: a plain Enter is the only key a screen answers, and a focused button, link or field keeps Enter for itself. Pure, and shared because a feature never imports another feature (R-5) |
| `dom/pointerGrab` | `attachGrab` | `(target, handlers, options) -> teardown` |
| `dom/starfield` | `createStarfield` | `(container) => void`; appends, never clears |
| `ui/button-strip` | `createButtonStrip` | `(root, options) -> ButtonStripSpec`; full-width fixed-height bottom strip holding Next / Prev / action buttons; teardown is mandatory |
| `ui/baseLayout` | `ModuleSpot`, `ModulePoses` | `{left, bottom, width, flip?}` for one module; and where every copy of every kind stands — one list per kind, in build order. `flip` is optional and means mirrored left to right |
| | `SPOT_BAND` | how far a module may be placed: left 2-92, bottom 2-32, width 6-24. The single source of truth; `styles/game-loop.css` clamps with the same numbers and `check-markup` Rule 11 fails the build if the two ever disagree |
| | `PANEL_RIGHT_EDGE` | 100 — a module is never wider than the gap between where it starts and the right-hand edge of the panel |
| | `DEFAULT_POSES` | the authored layout, used when `baseLayout.json` cannot supply one. One pose per copy the player can build |
| | `MODULE_POSES` | the validated layout the game places modules with; every kind has one pose per copy, and every pose is inside the band |
| | `LAYOUT_PROBLEMS` | what is wrong with the layout file, in words; empty when the file is good. Printed at boot behind `import.meta.env.DEV`, and shown in a banner at the top of the placement editor's toolbar (D-068) |
| | `DEPTH_ORDER`, `depthFor` | what stands in front of what, farthest first, and the stacking level of one module copy (D-069). A rule in code, not a number in the file: the order is a property of the outpost, and a file of fifteen positions cannot be trusted to keep a stacking order straight. The copies of a kind recede from the camera as they are added, so the first copy is the nearest; the two regolith shields share one depth |
| | `resolvePoses`, `describeLayoutProblems` | `(source) -> ModulePoses` and `(source) -> string[]`; the old single-pose shape reads as a list of one, a short list is padded by derivation, a long one is cut, and a kind the file cannot supply falls back to the default |
| | `poseFor` | `(poses, kind, copy) -> ModuleSpot`; where the nth copy of a kind stands, derived from the last pose when the file has no entry for it |
| | `clamp`, `clampSpot`, `roundSpot` | pull a number or a whole spot into the band, and round to one decimal so the toolbar and the file quote the same numbers |
| | `buildLayoutJson` | `(poses) -> string`; the layout file, in catalogue order, one list per kind, two-space indented. `flip` is written only for a module that is mirrored |
| | `pointToPercent` | `(point, panelRect) -> {left, bottom}`; where a pointer is inside the outpost panel |
| `ui/baseLayoutEditor` | `startLayoutEditor` | `(root) -> teardown`; the placement editor (D-065 to D-069). Fifteen draggable handles — one per copy of every module — a corner grip on each that changes its width, a toolbar with the numbers and the JSON, and Download / Copy / Reset / Done. Dev-only: `main.ts` loads it with a dynamic import behind `import.meta.env.DEV`, so it never reaches a production bundle. The flag check lives in `main.ts`, which cannot import this module statically without pulling it into the bundle |

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

`fetchDailyFacts()` is the same shape, one source shorter (D-053):

1. **NASA's Astronomy Picture of the Day**, `api.nasa.gov/planetary/apod?search=Mars` — a
   real NASA picture and story, dated, with NASA's own credit line.
2. **The saved gallery**, `data/nasaGallery.ts` — twelve checked NASA cards that are always
   there, whatever the network does.

The shared `DEMO_KEY` rate-limits this endpoint too (ISS-049), so the saved gallery is the
guaranteed layer and the live feed is the enrichment on top. `lastDailySource()` reports
which of the two answered, so the screen can say so rather than pretending.

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
   `hashchange` listener. Rejected multi-page because a navigation between HTML
   pages would still lose the in-memory run, and the save that could restore it is
   written on one origin (D-081). Hash routing also keeps the landing page alive
   behind the game and lets every screen be deep-linked for the demo.
5. **One device-local save, and no backend.** The run and the training day are written to
   `localStorage` under two versioned keys (`mars-horizon.save.v1`,
   `mars-horizon.training.v1`), so a closed tab can be resumed and two training games cannot
   be farmed by refreshing (D-075, D-081). No cookie, no account, no server: Supabase is
   still deferred (D-003), and clearing the cache is a new game.
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
    ISS-013. The largest real gap in the repository. The three headless-Chrome checks
    (`tools/browser-check-*.mjs`) cover some of it — the build screen, the desk, the
    rover and the whole journey — but they are checks, not tests: `npm test` stays
    free of a browser.
12. **The orders are a curriculum, not a random draw.** Each sol's three work orders
    are fixed, so a demo repeats and the teaching lands in a known order. Procedural
    orders were rejected (D-060) for exactly that reason: a random order would throw
    away the lesson each locked card teaches.
13. **The five goals are not scored.** `sim/goals.ts` reports what the player kept
    running and for how long, and there is deliberately no target and no counter
    (D-061). The cost is that the debrief cannot say "you did well at" — and the
    point is that it should not.
14. **The balance is checked, not unit-tested.** `npm run balance` plays every legal
    build at every site rather than asserting over the constants (D-064), because a
    test over the constants only proves the constants still do what they did — which
    is exactly what was wrong. The cost is that the check takes longer than the test
    suite and is a separate command.