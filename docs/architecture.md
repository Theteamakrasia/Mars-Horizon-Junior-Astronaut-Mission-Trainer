# Architecture

The annotated truth about this repository as of 2026-11-08. Everything here was read
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

517 tests run in a few seconds with no browser, no jsdom, and no mocks. If `sim/` grew a DOM
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
│   ├── images/naming/                  complete   mars.webp (358 KB, 1818x1860) and
│   │                                             astronaut.webp (130 KB, 1240x1236): the
│   │                                             planet and the astronaut of the start
│   │                                             screen. Both are drawn full-screen, so both
│   │                                             are enlarged from the originals by
│   │                                             tools/upscale-naming-assets.py.
│   │   └── source/                     complete   the untouched originals (606x620 and
│   │                                             620x618), kept so the enlargement can be
│   │                                             re-run at any size. Read by
│   │                                             tools/upscale-naming-assets.py.
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
│   ├── render-parts.py                 complete   300+ lines. PIL + numpy + OpenCV + PyAV. Cross-dissolves the
│   │                                                 four part stills under a push-in, with staggered
│   │                                                 description bars and fade-through-black bookends.
│   └── upscale-naming-assets.py        complete   ~85 lines. PIL. Enlarges the start screen's planet and
│   │                                             astronaut with a Lanczos resample and a light
│   │                                             unsharp mask, from the untouched originals in
│   │                                             Assets/images/naming/source/. They are drawn
│   │                                             full-screen, so the 606px originals turned to
│   │                                             mush at 1920px wide.
│
│   All four are dev tools: not scanned by `npm run check`, and they add no runtime dependency.
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
    │   ├── resources.ts                complete   ResourceName, ResourceStores, clampStores, drainForSol,
    │   │                                         depletedStores, createInitialStores, percentOf,
    │   │                                         LIFE_STORES. Pure arithmetic, never mutates its
    │   │                                         argument. 7 tests.
    │   ├── sol.ts                      complete   advanceSol, decide, projectSol, powerPicture,
    │   │                                         isRunOver, lostStores, isSelfSustaining,
    │   │                                         endedBy, WIN_SOL. Solar generation, module draw +
    │   │                                         night drain, crew use offset by modules, forecast
    │   │                                         events, the chosen activity, science points,
    │   │                                         clamp/cap, status. Turn-based (D-030). 40 tests.
    │   ├── run.ts                      complete   RunStatus, RunState, SolEvent, DecisionRecord,
    │   │                                         SolRecord, SolActivity, newRun, landAt, withState,
    │   │                                         startOutpost. RunState is the only thing shared
    │   │                                         between screens; it carries `modules`, `science`
    │   │                                         and `chosenActivity`.
    │   ├── activities.ts               complete   ActivitySpec, ActivityOffer, ActivityStores,
    │   │                                         ActivityRequirement, SolPlan, ACTIVITY_CATALOGUE,
    │   │                                         SOL_PLANS, activityById, planForSol, lockedReason,
    │   │                                         offerFor, offerForSpec. The twelve activities and
    │   │                                         the twelve sol plans (D-051, D-054). 17 tests.
    │   ├── science.ts                  complete   ScienceRank, SCIENCE_RANKS, SOL_LOG_POINTS,
    │   │                                         rankFor, rankProgress. The score and the rank
    │   │                                         ladder (D-052). 9 tests.
    │   ├── goals.ts                    complete   ScienceGoal, GoalSpec, GoalReading,
    │   │                                         GoalStatus, SCIENCE_GOALS, goalById,
    │   │                                         goalReadings. The five science goals the
    │   │                                         mission is about, and how each is doing
    │   │                                         right now (D-058). 17 tests.
    │   ├── topics.ts                   complete   ScienceTopic, SCIENCE_TOPICS, TOPIC_LABEL,
    │   │                                         isScienceTopic. The vocabulary the activities and
    │   │                                         the NASA facts share.
    │   ├── run.test.ts                  complete   11 tests
    │   ├── balance.test.ts              complete   7 acceptance tests: a good build wins, a
    │   │                                         careless one does not, the activity loop does
    │   │                                         not make the game unwinnable, and more than one
    │   │                                         region can be played.
    │   ├── activities.test.ts          complete   17 tests
    │   ├── science.test.ts             complete   9 tests
    │   ├── goals.test.ts               complete   17 tests
    │   ├── modules.ts                  complete   ModuleKind, ModuleSpec, MODULE_CATALOGUE,
    │   │                                         CORE_MODULES, specOf, countOf, systemsFor, extrasOf,
    │   │                                         pointsSpent, extraSlots, extraModuleCount. Catalogue
    │   │                                         in `sim/` because `act` needs it and cannot import
    │   │                                         `base` (D-032). 14 tests.
    │   ├── forecast.ts                 complete   ForecastEvent, FlareInput, ForecastKind,
    │   │                                         flareIntensity, createForecast(flares, seed?,
    │   │                                         dustScore?), createSeededRandom, planEvents,
    │   │                                         randomSolBetween, stormChance, visibleForecast,
    │   │                                         eventsStartingOn, stormOn, stormOpacity,
    │   │                                         MIN_CLEAR_SOLS, forecastIsSpaced. The timetable
    │   │                                         is seeded per run (D-048) and two events can
    │   │                                         never touch (D-056); only the flare size comes
    │   │                                         from data/.
    │   ├── forecast.test.ts            complete   15 tests; the event spacing is asserted here
    │   ├── crises.ts                   complete   Crisis, CrisisOption, COUNTDOWN_SECONDS,
    │   │                                         crisisForEvent, pendingCrisis, optionOf,
    │   │                                         earthIsInTime, earthAdvice. Each forecast event
    │   │                                         stops the clock and asks for a choice (D-029).
    │   ├── comms.ts                    complete   REAL_MIN/MAX_ONE_WAY_MINUTES, oneWayMinutes,
    │   │                                         roundTripMinutes, earthCanAnswerInTime. A
    │   │                                         simplified rising delay over the real range.

    │   └── regions.ts                  complete   The five landing regions: id, name,
    │                                             blurb, pin {x, y} as stage %, and five
    │                                             axis scores (0-5). Pure authored data,
    │                                             no randomness. Exports SiteAxis,
    │                                             SITE_AXES, SiteScore, Region, REGIONS,
    │                                             NEUTRAL_SCORE, totalScore, regionById,
    │                                             siteScore. Read by landing-site, base
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
    │   ├── nasaFeedCard.ts             complete   nasaFeedCard(fact, kicker?) -> figure. One live
    │   │                                         NASA picture with its story, credit and date, in the
    │   │                                         same card as the curated one. The picture is
    │   │                                         optional: a video day keeps its words.
    │   ├── nasa-card.css              complete   card frame, caption type scale, action row.
    │   ├── registry.ts                 complete   the one composition seam. Exports ScreenFactory,
    │   │                                         screenMount, resolveScreen, nextStop,
    │   │                                         allScreenMounts. Maps all nine built routes onto
    │   │                                         feature views; the only file permitted to import
    │   │                                         them. `ScreenFactory` is (root, run, setRun) ->
    │   │                                         teardown. Returns null for routes with nothing
    │   │                                         built, so the router can fall through.
    │   └── gameLoop.ts                 complete   the shared game-loop chrome from the Figma
    │                                             frames (D-038): gameHeader, gameHud,
    │                                             gameWorld, gamePanel, gameScreen,
    │                                             gameSection, moduleFigures, moduleArt,
    │                                             MODULE_ART, WORLD_BACKGROUND,
    │                                             ASTRONAUT_SPRITE. Presentation only — every word
    │                                             and number arrives as an argument, and it owns
    │                                             the shared artwork imports so base, act and
    │                                             debrief do not copy them. `gameHeader` takes an
    │                                             optional `onLeave`: with it the right-hand label
    │                                             becomes a Menu button opening an in-screen
    │                                             leave dialog (D-044); without it the old plain
    │                                             label stays.
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
    │   ├── dailyFactLoader.ts          complete   LoadedDailyFacts; loadDailyFacts(signal) fetches
    │   │                                         the NASA daily pictures. The join between data/ and
    │   │                                         sim/, shared by act and debrief without a
    │   │                                         cross-feature import. Never rejects.
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
    │   │                                         five real region photos and forty tagged
    │   │                                         facts. Static by choice (D-042): no
    │   │                                         runtime image API, and the words are
    │   │                                         unit tested here. `factForTopic`
    │   │                                         picks the fact about one system.
    │   ├── nasaDaily.ts                complete   DailyFact, DailyFactSource, parseApod,
    │   │                                         cleanExplanation, fetchDailyFacts, lastDailySource,
    │   │                                         lastDailyDetail, resetDailyFacts, savedFactFor.
    │   │                                         NASA's Astronomy Picture of the Day, filtered to
    │   │                                         Mars. An enrichment layer on top of the saved
    │   │                                         gallery, never a replacement (D-053). 17 tests.
    │   ├── nasaGallery.test.ts         complete   25 tests; ids resolve, credits and links
    │   │                                         present, length caps enforced, facts wrap
    │   │                                         deterministically, every topic has facts.
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
    │   │   └── naming.css               complete   the full-bleed scene: the stage is the
    │   │                                         backdrop for the whole window, the
    │   │                                         astronaut stands left, Mars fills the right
    │   │                                         and the menu column sits over it. Outfit
    │   │                                         type, translucent panels, a radial scrim
    │   │                                         for legibility. naming-mars-turn (150s) and
    │   │                                         naming-astronaut-float (9s), both removed
    │   │                                         under prefers-reduced-motion. D-049
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
    │   │   │                                     workingSentence, approximateTotalKg, seedFrom,
    │   │   │                                     questionFor, choicesFor, promptFor,
    │   │   │                                     puzzleFor, isPlainEnter, focusHandlesEnter.
    │   │   │                                     The question and its four options change
    │   │   │                                     every run, seeded from the astronaut name
    │   │   │                                     (D-057); the keyboard rules are here so they
    │   │   │                                     can be asserted. 71 tests.
    │   │   ├── model.test.ts            complete   71 literal-input tests
    │   │   ├── view.ts                  complete   mountSupply(root, run, setRun) -> teardown.
    │   │   │                                     Enter advances while NEXT is visible, and
    │   │   │                                     the screen resets its state on mount.
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
    │   │   ├── model.ts                 complete   missionHeadline, meterRows, toneFor,
    │   │   │                                     changeRows, progressPercent, secondsLeft,
    │   │   │                                     powerSentence, activityCosts,
    │   │   │                                     activityRows, scienceSummary,
    │   │   │                                     scienceSentence. Pure, 20 tests.
    │   │   ├── model.test.ts            complete   20 literal-input tests
    │   │   ├── view.ts                  complete   mountAct(root, run, setRun) -> teardown.
    │   │   │                                     Three activity cards per calm sol (D-051),
    │   │   │                                     a science card in the world panel, and
    │   │   │                                     the live NASA daily picture. Run sol ->
    │   │   │                                     advanceSol; on a finished run, setRun then
    │   │   │                                     navigate to `debrief`. A crisis replaces the
    │   │   │                                     mission panel (D-040).
    │   │   └── act.css                  complete   crisis option artwork and the activity cards
    │   └── debrief/                    COMPLETE   TASK-031. Why the run was won or lost.
    │       ├── README.md                           the contract
    │       ├── model.ts                 complete   Explanation, ConsumptionSummary, NextStep,
    │       │                                     ScienceReport, ScienceRow, explainOutcome,
    │       │                                     consumptionSummary, blackoutSols,
    │       │                                     reviewDecisions, timeline, lowestPoints,
    │       │                                     usedApproximateData, nextSteps,
    │       │                                     wentEmpty, scienceReport, scienceHeadline,
    │       │                                     scienceDetail, scienceSentence.
    │       │                                     Conservative ledger attribution. 25 tests.
    │       ├── model.test.ts            complete   25 literal-input tests
    │       ├── view.ts                  complete   mountDebrief(root, run, setRun) -> teardown.
    │       │                                     Results panel, plus the journal as a mode
    │       │                                     (D-039): decisions, sol table, honesty note.
    │       └── debrief.css              complete   tip cards, journal entries, two-link footer
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
```

The rotation behind the menu is **CSS keyframes**, not JavaScript: `naming-mars-turn`
(150s) and `naming-astronaut-float` (9s), both removed under
`prefers-reduced-motion`. No `requestAnimationFrame` is involved, so there is no loop
to leak on navigation and the menu needs no teardown for them.

The stage is the backdrop for the whole screen, not a panel inside the menu: it is the
first child of the `naming` section and covers the window, so the planet runs off the
top and right edges and the header sits on top of it. The menu column sits on the right
over the planet (D-049).

The planet rotates **in the image plane** (`rotate()`), not on a 3D axis. This is
forced by the asset: a sphere spun about its own axis looks identical, so a `rotateY`
would appear to do nothing (D-020).

Zero storage and no backend. The only state is the in-memory `RunState` that
`main.ts` owns and passes to each screen as `(root, run, setRun)`; a refresh loses it,
because persistence is deferred (D-003).

There are two network paths outside the landing page, both in `data/`.

**Space weather.** `base` and `act` call `dom/forecastLoader` → `data/spaceweather`, which
tries NASA DONKI, then NOAA SWPC, then an empty fallback. The event *schedule* is seeded
per run in `sim/forecast.ts` (D-048); the flare *size* is the part that comes from the
network.

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
13. `main.ts` collects the landing page's own layers into `landingLayers`, then
    `startScreenRouter()` calls `startRouter`, which resolves the hash — defaulting to
    `naming` — and mounts that screen, hiding the landing layers behind it.

Routing is last so every screen it can mount is already defined. `BACK TO MAIN MENU`
returns to `landing`, which keeps running behind the mounted screen.

## Module contracts

| module | exports | contract |
| --- | --- | --- |
| `main.ts` | none (side effects) | composition root; throws on a missing element id |
| `dom/forecastLoader` | `LoadedForecast`, `loadForecast` | `(signal?, seed = Date.now(), dustScore = NEUTRAL_SCORE.dust) -> Promise<LoadedForecast>`; never rejects. Fetches flares through `data/spaceweather`, then runs `sim/forecast.createForecast`. Sits in `dom/` because it joins `data/` and `sim/`, and both `base` and `act` need it without importing each other (R-5) |
| `dom/dailyFactLoader` | `LoadedDailyFacts`, `loadDailyFacts` | `(signal?) -> Promise<LoadedDailyFacts>`; never rejects. Fetches NASA's daily pictures through `data/nasaDaily` and reports the source. In `dom/` for the same reason as the forecast loader: `act` and `debrief` both want it and R-5 stops them importing each other |
| `data/spaceweather` | `SpaceWeatherEvent`, `SpaceWeatherSource` | a flare as the game uses it; source is `'donki' \| 'noaa' \| 'fallback'` |
| | `fetchSpaceWeather` | `(options?) -> Promise<SpaceWeatherEvent[]>`; never rejects. Tries NASA DONKI, then NOAA SWPC, then the empty `FALLBACK_FLARES`. Every flare is kept, not just the strongest. Remembers one answer so two screens cost one request; an answer abandoned by its caller is not remembered |
| | `parseFlares`, `parseNoaaFlares` | `(json) -> SpaceWeatherEvent[]`; validate every field and drop anything malformed rather than trusting the wire |
| | `lastSource`, `lastDetail`, `resetSpaceWeather` | what the UI reports; reset is for tests |
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
| `ui/readAloud` | `canReadAloud`, `readAloud`, `stopReading` | `(text, onDone?) -> boolean`; false when unsupported or the text is empty. Starts cancel any current passage first, and `stopReading()` is safe when nothing plays. Browser speech only (D-043) |
| `ui/readButton` | `readButton` | `(getText, options?) -> HTMLButtonElement \| null`; a toggle whose label, `aria-pressed` and pause hooks (`onStart`, `onStop`) are shared by every screen that reads aloud. Returns null where speech is unavailable |
| `ui/nasaCard` | `nasaCard` | `(card: NasaFigure, kicker?) -> figure`; picture, alt, caption, "Did you know?", credit and source link, plus the shared read-aloud control only when `canReadAloud()` is true. The kicker defaults to the sol for a `NasaCard` and to a plain NASA label otherwise |
| `ui/nasaFeedCard` | `nasaFeedCard` | `(fact: DailyFact, kicker?) -> figure`; the live NASA picture in the same card as the curated one. The picture is optional — a video day keeps its words |
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
| | `ModuleSpec`, `MODULE_CATALOGUE` | every spec: name, cost, max count, what it gives, what it needs, and any build gate |
| | `CORE_MODULES` | the four the lander brings: habitat, life-support, solar-array, batteries |
| | `specOf` | `(kind) -> ModuleSpec`; throws a `RangeError` on an unknown kind |
| | `countOf` | `(modules, kind) -> number` |
| | `systemsFor` | `(modules, regionId) -> Systems`; the whole outpost as one object: solar, battery, load, what the crew gets and what it costs |
| | `extrasOf`, `pointsSpent`, `extraSlots`, `extraModuleCount` | what the player built beyond the core, what it cost, and how many more would fit |
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
| `sim/activities` | `ActivitySpec`, `ActivityOffer`, `ActivityStores`, `ActivityStoreName`, `ActivityRequirement`, `SolPlan` | one activity the crew can spend a sol on, and the shape of a sol plan |
| | `ACTIVITY_CATALOGUE` | the twelve activities: cost, gain, science points, topic, the science goal it serves, and the build gate that can lock one |
| | `SOL_PLANS` | the twelve sol plans: headline, subtitle, and the three activity ids offered. The schedule is fixed, so a demo repeats |
| | `activityById`, `planForSol` | lookups; both return `null` for something unknown |
| | `lockedReason`, `offerForSpec`, `offerFor` | whether the outpost is ready for an activity today, and the three offered on a sol (D-051) |
| `sim/science` | `ScienceRank`, `SCIENCE_RANKS`, `SOL_LOG_POINTS` | the rank ladder and the point for a sol log |
| | `rankFor` | `(points) -> ScienceRank`; never throws, a broken score is the bottom rank |
| | `rankProgress` | `(points) -> { current, next, percent, toNext }`; the road to the next rank, with no NaN at the top (D-052) |
| `sim/topics` | `ScienceTopic`, `SCIENCE_TOPICS`, `TOPIC_LABEL`, `isScienceTopic` | the vocabulary the activities and the NASA facts share, so a screen can show the fact about the system it is teaching. One topic per science goal, plus `missions` for the science that is not about a system |
| `sim/goals` | `ScienceGoal`, `GoalSpec`, `GoalReading`, `GoalStatus` | the five science goals and one reading of each |
| | `SCIENCE_GOALS`, `goalById` | the five goals in the order they are shown: dust storm, life support, radiation, power, food. Each carries its own question and its own NASA fact topic (D-058) |
| | `goalReadings` | `(run) => GoalReading[]`; how each goal is doing right now, worked out from the sim — the storm actually running, the panels' real output, the stores as they stand, the last sol's blackout |
| `sim/comms` | `REAL_MIN_ONE_WAY_MINUTES`, `REAL_MAX_ONE_WAY_MINUTES` | the real 3-22 minute range, for the approximation note |
| | `oneWayMinutes`, `roundTripMinutes`, `earthCanAnswerInTime` | a simplified rising delay over the run; labelled approximate in the UI |
| `sim/sol` | `advanceSol` | `(run) -> RunState`; solar generation, module draw + night drain, crew use, forecast events, the chosen activity, science points, clamp/cap, status. **Turn-based: one sol per call** (D-030) |
| | `decide` | `(run, crisisId, optionId, timedOut?) -> RunState`; records the player's crisis choice. Throws on an unknown crisis or option |
| | `projectSol` | `(run) -> SolRecord`; what a calm sol would do, for the trade-off preview and Mission Control's advice |
| | `powerPicture` | `(run) -> { generatedKw, storedKwh, nightDrainKw, capacityKwh }`; the README's power picture |
| | `isRunOver`, `lostStores`, `endedBy` | whether the run has ended, and which life store ended it. Power is not a life store |
| | `isSelfSustaining` | `(run) -> boolean`; a calm sol leaves air, water and food level or better |
| | `WIN_SOL` | 12 — the run is won by living through this many sols |
| `sim/run` | `RunState` | `sol, regionId, astronautName, stores, status, modules, panelHealth, science, chosenActivity, forecast, log, decisions` — the only thing shared between screens |
| | `RunStatus`, `SolEvent`, `DecisionRecord`, `SolRecord`, `SolActivity` | what a sol did: the stores, the net, the blackout, the activity, the events and the notes |
| | `newRun` | `(regionId, astronautName?) -> RunState` |
| | `landAt` | `(run, regionId) -> RunState`; sets the region, keeping the astronaut's name |
| | `startOutpost` | `(run, modules) -> RunState`; lands the outpost with full batteries and the shielding those modules give, and resets the score |
| | `withState` | `(run, patch) -> RunState` |
| `ui/routes` | `Route` | `'naming' \| 'briefing' \| 'supply' \| 'launch' \| 'interior' \| 'landing' \| 'landing-site' \| 'base' \| 'act' \| 'debrief'` |
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
| `features/landing-site/view` | `mountLandingSite` | `(root, run, setRun) -> teardown`; map + five pins + Site Analysis panel, LAND HERE calls `landAt` then navigates to `nextStop('landing-site')`. Selecting a pin also shows that region's real NASA photo and fact (`regionCard`) |
| `ui/gameLoop` | `gameScreen`, `gameWorld`, `gamePanel`, `gameSection`, `gameHeader`, `gameHud` | the shared frame from the Figma frames (D-038): one `.gl` root, the illustrated world panel, and the scrolling right-hand panel. Every word, number and variant arrives in an options object; no `sim/` rule is applied here |
| | `moduleFigures`, `moduleArt`, `MODULE_ART`, `WORLD_BACKGROUND`, `ASTRONAUT_SPRITE` | the artwork the world panel draws, owned here so `base`, `act` and `debrief` do not copy the imports |
| | `gameHeader`, `gameHud`, `gameDock` | `gameHeader(sub?, onLeave?)`: without `onLeave` the right-hand label is plain decorative text; with it, it is a Menu button opening an in-screen leave dialog with Keep playing / Leave mission (D-044). `gameHud` draws the five resource cards (`HudStat`) and `gameDock` the three-tab dock. The pause/settings/BUILD pills and the dock are `aria-hidden` spans, not buttons (D-038) |
| | `gameSection` | `(label, ...content) -> section`; an uppercase label and its body |
| | `moduleFigures`, `moduleArt`, `MODULE_ART`, `WORLD_BACKGROUND`, `ASTRONAUT_SPRITE` | artwork placement and the bundled asset URLs; the only import site for the figures base, act and debrief share |
| `features/base/model` | `BUILDABLE`, `canPlace`, `addModule`, `removeModule`, `pointsLeft` | build rules over the `sim/modules.ts` catalogue (D-032) |
| | `previewFor`, `previewSummary`, `upkeepFor`, `upcomingWarnings` | the calm-sol projection. `previewSummary` gives the five resource cards one number each, from the same projection as the sentences |
| `features/base/view` | `mountBase` | `(root, run, setRun) -> teardown`; the outpost on Mars, the catalogue steppers, and Land & start sol 1 → `startOutpost` then `act`. Holds a mutable local `extras` so a second build is not applied to stale data; it also shows a rotating NASA fact beside the build panel from `factFor` |
| `features/supply/model` | `SUPPLY_BEATS`, `packsFor`, `judge`, `hintFor`, `workingSentence`, `approximateTotalKg` | the ration check over `sim/modules.ts`; the crew size is read from the sim, not typed in, so it agrees with the briefing (ISS-044) |
| | `seedFrom`, `questionFor`, `choicesFor`, `promptFor`, `puzzleFor` | the question and its four options for one run. The mission length, the answer and the button order all vary, seeded from the astronaut name so a demo repeats and a test can pin it (D-057) |
| `features/act/model` | `missionHeadline`, `meterRows`, `changeRows`, `toneFor`, `secondsLeft`, `powerSentence` | presentation helpers over `sim/sol`; `meterRows` carries `percent`, `tone` and `emoji` for the HUD |
| | `activityRows`, `activityCosts` | the three activities offered on a sol, and what each costs and gives |
| | `scienceSummary`, `scienceSentence` | the score, the rank, and the road to the next one |
| `features/act/view` | `mountAct` | `(root, run, setRun) -> teardown`; three activity cards per calm sol (D-051), a science card in the world panel, and the live NASA daily picture. Run sol calls `advanceSol`, then `setRun`; a finished run navigates to `debrief`. A crisis replaces the mission panel in place, with its countdown and "take your time" switch (D-040) |
| `features/debrief/model` | `explainOutcome` | `(run) -> {headline, detail, confident}`; conservative ledger attribution — only claims a cause when a logged fact establishes it, otherwise `confident: false` and the screen points at the timeline |
| | `scienceReport`, `scienceHeadline`, `scienceDetail`, `scienceSentence` | what science the run did, the rank it earned, and every activity the crew chose. Measures the science, not the outcome (D-052) |
| | `consumptionSummary`, `lowestPoints`, `blackoutSols`, `reviewDecisions`, `timeline` | arithmetic over the log; per-decision verdicts from fixed option rules; one row per sol |
| | `nextSteps`, `wentEmpty`, `usedApproximateData` | what to try next, each step tied to a fact from this run and carrying an `art` hint; the store that ended the run; whether any flare size was approximate |
| `features/debrief/view` | `mountDebrief` | `(root, run, setRun) -> teardown`; the results panel with the Mars Science Score, and the journal as a mode reached from "View my Mars story" (D-039). "Try a new outpost" calls `newRun` then `landing-site`; it shows a rotating NASA fact next to the closing card from `factFor` |
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
