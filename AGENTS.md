# AGENTS.md

**If a tool looks for `CLAUDE.md`, `CONTRIBUTING.md` or `.cursorrules`, point it at this
file. Do not create those files.**

## 1. What this project is

Mars Horizon is a space-survival strategy game for ages 8-16: you run a Martian outpost
and balance five resources that never stop draining — power, oxygen, water, food,
radiation shielding. NASA Space Apps Challenge entry. Feature freeze **Nov 8 2026**,
demo **Nov 14-15**.

**The one invariant: `sim/` and each feature's `model.ts` are pure — no `document`, no
`window`, no network.**

That is what lets 1051 tests run in a few seconds with no browser and no mocks, so the game
can be asserted on rather than eyeballed. Everything else here exists to protect it. If
you are unsure where code goes: if it touches the DOM it is not pure.

**Current reality: the whole journey is built.** The **naming menu is the entry route** —
the player names their astronaut and presses START MISSION, which flows through
`briefing → supply → launch → interior → landing-site → base → act → debrief`. `base` is
the outpost (build modules, read the storm warning), `act` advances one sol per press, and
`debrief` explains a win or loss from the per-sol ledger. The polished landing page still
works behind it and is what BACK TO MAIN MENU returns to.

**The game is a Papers Please game about Mars** (D-060). Each sol the player is the duty
officer at the outpost: three **work orders** land on the desk, each with two readings to
check and a tool to work it with, and the player approves one. The **standing orders** are
a rule book that grows two rules a sol until there are twenty-four, and they are the five
learning goals in the order the player meets them. The orders live in `sim/activities.ts`,
the rules in `sim/standingOrders.ts`, the tools in `sim/minigames.ts`, and the how-to-play
guide in `sim/guide.ts`.

**The five goals are the project's learning outcomes, not a score** (D-061). Surviving
twelve sols is the only outcome. The goals are the science, and the debrief prints the
standing orders you worked under as the keepsake. The counters that used to grade them are
gone: `sim/goals.ts` now reports what you kept running, and for how long.

**The rover is part of the run** (D-062). It is sent out by a work order like any other,
it drives on sol time, and it comes back with a document on the desk: a real NASA picture,
a place from the past, or a rare rock to log, take or leave. Its state is in
`RunState.rover`; its rules and its catalogue are both in `sim/rover.ts`. It touches no
resource, so it cannot change how a run is won or lost.

**Every sol now has a main activity** (D-051). On the eight calm sols `act` offers three
and the player picks one; on a crisis sol the crisis replaces the activity panel, so the
crisis *is* that day's activity. The rules are in `sim/activities.ts`, the cost and gain
are applied by `sim/sol.ts`, and the science points they earn give the run a score and a
rank (D-052) that the debrief reports. **Working an order with a tool wins stars**, and
the stars multiply the science the order is worth — they never touch a store, so the
balance of a run does not depend on how well the player did (D-063).

**The balance is checked, not assumed** (D-064). `npm run balance` plays every legal
build at every landing site over several forecast seeds and fails when a site cannot
hold all five systems or when too few builds can win. It exists because the game was
unwinnable for a long time and no test said so.

What is still a **stub**: nothing in the journey. `data/spaceweather.ts` is implemented and
live: it reads solar flares from NASA DONKI, falls through to NOAA SWPC when DONKI is
unreachable or throttled, and finally to an empty list, from which `sim/forecast.ts`
draws typical flares marked `approximate`. `data/nasaDaily.ts` is live too: it reads
NASA's Astronomy Picture of the Day and falls back to the saved gallery. **One device-local
save** exists (D-081): the run is written to this browser as it changes and read back before
the router starts, so the menu greets the astronaut by name and offers CONTINUE — Supabase is
still deferred (D-003), and a different browser is a different run. The forecast's *timing* is
rolled per run from a seed (`sim/forecast.ts`, D-048), so only the flare *size* comes from the
network (D-033, D-037, D-053).

**A stub is not an implementation.** If a file says STUB, calling it throws. That is
deliberate: it fails loudly instead of silently returning `undefined`.

## 2. Rules

"Enforced" means `npm run check` or `npm test` fails if you break it. "Convention" means a
human upholds it and nothing catches you.

| # | Rule | Status | Enforced by |
| --- | --- | --- | --- |
| R-1 | `sim/` imports only `sim/` | **enforced** | `layer-boundary` |
| R-2 | `data/` imports only `data/`, `sim/` | **enforced** | `layer-boundary` |
| R-3 | `dom/` imports only `dom/`, `data/`, `sim/` | **enforced** | `layer-boundary` |
| R-4 | `ui/` imports only `ui/`, `dom/`, `data/`, `sim/` | **enforced** | `layer-boundary` |
| R-4b | Only `ui/registry.ts` may import a feature's `view.ts` | **enforced** | `layer-boundary` |
| R-5 | **A feature never imports another feature** | **enforced** | `cross-feature` |
| R-6 | `model.ts`, `types.ts`, `constants.ts`, `*.test.ts` stay pure | **enforced** | `no-dom-in-pure-zone` |
| R-7 | A `model.ts` may not import its own `view.ts` | **enforced** | `purity-inversion` |
| R-8 | No `fetch`/`XHR`/`WebSocket`/`EventSource` outside `data/` | **enforced** | `no-network-outside-data` |
| R-9 | No `alert`/`confirm`/`prompt`, anywhere | **enforced** | `no-alert` |
| R-10 | No `on*="..."` inline handlers in markup | **enforced** | `no-inline-handler` |
| R-11 | A relative import that resolves to nothing is an error | **enforced** | `unresolved-import`, `unresolved-asset` |
| R-12 | Typecheck clean; `strict`, `noUnusedLocals` | **enforced** | `npm run check` |
| R-13 | Tests pass (1051 today) | **enforced** | `npm test`, watch ISS-015 |
| R-14 | No `index.ts` barrel files — import concrete paths | convention | nothing |
| R-15 | Feature CSS is imported by its own `view.ts`, never added to `style.css` | convention | nothing |
| R-16 | Files are UTF-8, LF, no BOM. Preserve a file's existing endings | convention | **nothing** — ISS-005 |
| R-17 | Branch per person. Never commit to `main` | convention | nothing |
| R-18 | One commit per step, `type(scope): message` | convention | nothing |
| R-19 | Log a bug in `docs/team/issues.md` before fixing it | convention | nothing |
| R-20 | No violence, no death, no enemies. Losing costs resources, never a life | convention | nothing |
| R-21 | Never commit an API key or `.env*` | convention | **nothing** — ISS-006 open |

**R-5 is the one that keeps this modular.** Two screens that need each other's data take
it from `RunState`, passed explicitly from `main.ts` — not through imports.

**R-14 matters more than it looks.** A barrel is the one file every feature edits and
nobody owns. With six people that is guaranteed conflict, invisible in review.

R-13, R-16 and R-21 are the ones that will bite you. R-20 is a hard product constraint
with no automated check; it is on every reviewer.

## 3. Data flow

```
main.ts → { createStarfield, startFloatingAstronaut, startRouter }
startFloatingAstronaut → rAF tick → stepAstronaut (pure) → render transforms
stepAstronaut → stepDrift (bounce maths) + stepDeform (spring maths)

startRouter → location.hash → parseRoute (pure) → onRoute
            → registry.resolveScreen → features/<screen>/view.ts
            → unmount the previous screen first
            → factory(root, run, setRun); run is the in-memory RunState
```

The menu's rotation is **CSS keyframes**, not JS — no `requestAnimationFrame`, so no
loop to leak when you navigate away.

**The day's loop, and where each piece of it lives:**

```
act → the hub: five buttons, six once a sol has run       features/act/model.ts
    → today's tasks opens the three work orders for today  sim/activities.ts
      (locked until the crew has done two training games    sim/training.ts
       — the six games live on the Standing orders sheet)
    → the player checks the two readings on each and may work one with a tool
      (the stars only multiply the science the order is worth)  sim/minigames.ts
    → advanceSol applies the cost and the gain, deploys the rover if the
      order was the exploring one, and grows the board by two
                                                   sim/standingOrders.ts
    → the review button carries the sol's net change as chips, and the guide
      (sim/guide.ts) is an icon button in the header
```

**The guide is a popup, and it is mounted on `document.body`** (D-073). Not inside
the screen: both `base` and `act` redraw themselves when the live space weather
arrives, and a popup that lived in the screen was rebuilt on every redraw, which
threw a child reading page three back to page one (ISS-077). Outside the screen, a
redraw behind it changes nothing.

**One device-local save, and two live network paths.** The whole run — name, region,
stores, modules, the science score, the rover's finds and the per-sol ledger — lives in
`main.ts` memory, and is **written to this browser as it changes** (`ui/save.ts`, key
`mars-horizon.save.v1`). It is read back before the router starts, so a closed tab is
resumed: the menu greets the astronaut by name and offers CONTINUE, which returns to the
screen they left, and START OVER, which forgets the run (D-081). This is one machine's
`localStorage`, not an account — Supabase stays deferred (D-003), and no other browser can
see it.

The two requests outside the landing page are both in `data/`:

- **Space weather.** `base` and `act` call `dom/forecastLoader` → `data/spaceweather.ts`,
  which tries NASA DONKI, then NOAA SWPC, then an empty list, from which
  `sim/forecast.ts` draws typical flares marked approximate. The event *schedule* is
  rolled per run from a seed in `sim/forecast.ts` (D-048); only the flare size is live.
- **NASA's daily pictures.** `act` calls `dom/dailyFactLoader` → `data/nasaDaily.ts`, which
  asks NASA's Astronomy Picture of the Day for Mars pictures and falls back to the saved
  gallery in `data/nasaGallery.ts` (D-053). This is an **enrichment layer on top of** the
  saved gallery, never a replacement — the game is complete without a network, and the
  screen says which of the two it is showing.

## 4. Boot order

1. `index.html` parses; five visual layers exist.
2. Google Fonts request — the only network request on the page (ISS-007).
3. `/src/main.ts` loads as a module; imports `style.css` first.
4. Vite resolves `floating.png` to a fingerprinted URL.
5. `bootstrap()` waits for `DOMContentLoaded` if still loading, otherwise runs now.
6. Four elements resolved by id via `requireElement`, which **throws** if one is missing.
7. `astronautImg.src` set; `draggable = false` so the browser cannot hijack the drag.
8. `createStarfield()` appends 140 stars in one fragment.
9. `?motion=force`/`?motion=reduce` parsed; OS `prefers-reduced-motion` read.
10. `startFloatingAstronaut()` starts the loop; teardown handle stored.
11. The motion `change` listener attaches **only** without a URL override.
12. First `requestAnimationFrame` scheduled.
13. The saved run is read (`readSave` in `ui/save.ts`) and put back into `run` **before**
    anything mounts, so a browser that restored a tab on `#/act` gets the desk with its run
    rather than the desk's "no run" fallback (D-081).
14. `startScreenRouter()` resolves the hash — **defaulting to `naming`** — mounts that
    screen, and hides the landing layers behind it. Mounting a journey screen writes the
    save again, so the resume point follows the player (D-081).
15. In a dev build with `?editlayout=1`, `main.ts` loads `ui/baseLayoutEditor` with a
    dynamic import. The editor is attached to whichever screen is mounted, and to
    nothing in a production build (D-065).
16. In a dev build, a layout file with problems in it is listed in the console
    (D-068). The game still starts: it falls back to what it can.

`BACK TO MAIN MENU` returns to `landing`, which keeps running behind the menu.

## 5. Doc update matrix

Same commit, always.

| If you changed | Then update | Why |
| --- | --- | --- |
| Anything in `sim/` | `docs/architecture.md` module contracts | exports are a public contract |
| Added/moved/renamed a file | `docs/architecture.md` file tree + **its empty/partial/complete mark** | a tree entry is a claim about reality |
| A module's exports or signatures | `docs/architecture.md` contract table | callers break silently otherwise |
| Boot order or element ids | this file §4, and `index.html` comments | `requireElement` throws on drift |
| A rule or a checker rule id | this file §2 table | a rule with no enforcer is a suggestion |
| Layering or the allow-list | `docs/architecture.md` + `scripts/check-imports.mjs` | they must agree |
| A choice someone might relitigate | `docs/team/decisions.md`, newest first | **including the Rejected line** |
| Any bug, before fixing it | `docs/team/issues.md` — get an id first | an unlogged fix has no history |
| Fixed an issue | flip its `status`, set `fix-in` to the commit | |
| A `KNOWN` entry in the checker | delete it **in the fixing commit** | the set is self-cleaning; a stale entry fails `check` |
| Worked on something | `docs/team/progress-log.md`, newest on top, all four bullets | |
| Took on / finished a task | `docs/team/tasks.md` owner and status | an unowned task is an unowned task |
| Project status or setup | `README.md` — keep it true, D-041 | |
| The pitch, audience or deadline | `README.md`, `docs/architecture.md` §intro | |

**If a change genuinely needs no doc update, say so explicitly in your final report.
Silence is indistinguishable from forgetting.**

## 6. End-of-change checklist

- [ ] `npm run check` passes
- [ ] `npm test` passes — and I watched the whole run, because it is 40% flaky
- [ ] Does any test I touched depend on `Math.random()`? Pin the input.
- [ ] Did I add an `index.ts`? Delete it (R-14).
- [ ] Did I import another feature? Pass `RunState` instead (R-5).
- [ ] Doc matrix §5 satisfied, or you said why not
- [ ] Any bug I hit is logged with an id **before** I fixed it
- [ ] New files are UTF-8 / LF / no BOM — verified with a decoder, not by eye
- [ ] I edited a CRLF file and did not convert it to LF wholesale
- [ ] No key, no `.env*`, no `node_modules`, no `dist/` staged
- [ ] Not on `main`
- [ ] Commit message is `type(scope): message`

## 7. Git conventions

- Branch per person: `git checkout -b <initials>-<what>` e.g. `jk-act-phase`
- **Never commit to `main`.** Open a PR.
- One commit per step. A commit that does two things is two commits.
- `type(scope): message` — `feat(sim):`, `fix(debrief):`, `docs(team):`, `test(base):`,
  `chore(deps):`, `refactor(ui):`. Types: `feat` `fix` `docs` `test` `chore` `refactor`.
- Never commit `dist/`, `node_modules/`, `.env*`. All already in `.gitignore` **except**
  `.env*` (ISS-006).

## 8. Where things live

**Structure rule: one folder per screen. Depth never exceeds 2. Four files per feature:
`model.ts`, `model.test.ts`, `view.ts`, `<feature>.css`.** Pick up any open task by
opening its folder — that is the whole point of the layout.

| To change | Open |
| --- | --- |
| Drift, bounce, throw, speed | `src/sim/drift.ts` |
| Squash-and-stretch feel, spring constants | `src/sim/deform.ts` |
| How drift and deformation combine per frame | `src/sim/frame.ts` |
| Resource drain, power/O2/water/food/shielding | `src/sim/resources.ts` — complete, 7 tests |
| Advancing a sol, resolving events, detecting loss | `src/sim/sol.ts` — complete, 53 tests |
| Run state shape and progression | `src/sim/run.ts` — complete, 11 tests |
| Module catalogue, build costs, upkeep | `src/sim/modules.ts` — complete, 14 tests |
| The forecast, its seeded timetable, flare intensity | `src/sim/forecast.ts` — 15 tests |
| **Never two events back to back** | `src/sim/forecast.ts` — `MIN_CLEAR_SOLS`, `forecastIsSpaced` |
| Crisis choices and what each one costs | `src/sim/crises.ts` |
| **The day's activity, its cost and its gain** | `src/sim/activities.ts` — complete, 18 tests |
| **The science score and the rank ladder** | `src/sim/science.ts` — complete, 11 tests |
| **The five science goals and their live state** | `src/sim/goals.ts` — complete, 23 tests |
| **The standing orders — the rule book the player works to** | `src/sim/standingOrders.ts` — complete, 7 tests |
| **The six tools, and how they are graded** | `src/sim/minigames.ts` — complete, 23 tests |
| **The six training games, and the two-a-sol rule that locks today's tasks** | `src/sim/training.ts` — complete, 27 tests; one pure module per game beside it (`trainingMerge`, `trainingMemory`, `trainingRover`, `trainingSolar`, `trainingCargo`, `trainingAsteroid`) |
| **The training section, the game dialog, and the day's record** | `src/ui/training.ts` — built; the six games are drawn in `src/ui/training*.ts` and the contract is `src/ui/trainingGame.ts` |
| **The how-to-play guide** | `src/sim/guide.ts` — complete, 6 tests |
| **The mission-day tracker** (the day in play, the total, twelve pips) | `src/ui/dayTracker.ts` — complete, 10 tests; the CSS in `src/ui/day-tracker.css` |
| **The patches a run earns** | `src/sim/patches.ts` — complete, 7 tests |
| **The notes that land on the desk** | `src/sim/deskNotes.ts` — complete, 8 tests |
| **What a lesson is about** (power, dust, water, food, radiation, missions) | `src/sim/topics.ts` |
| Earth-Mars delay, "can Earth answer in time" | `src/sim/comms.ts` |
| Every tuning number | `src/sim/modules.ts` — edit here to retune |
| The rAF loop, transforms, resize, reduced motion | `src/dom/floatAstronaut.ts` |
| Pointer grab, throw velocity, pointer capture | `src/dom/pointerGrab.ts` |
| Star generation and twinkle randomness | `src/dom/starfield.ts` |
| Hash routing, route table | `src/ui/router.ts`, `src/ui/routes.ts` |
| Route → screen mapping | `src/ui/registry.ts` — **the only file that imports a feature's view** |
| **The player's name, and the entry screen** | `src/features/naming/` — **built** |
| Name length, trimming, emoji, validation | `src/features/naming/model.ts` — pure, 28 tests |
| The rotating Mars-behind-astronaut stage | `src/features/naming/naming.css` |
| **The save: writing the run down, and reading it back** | `src/ui/save.ts` — the key, the reads, `resumeScreen`; the only file that touches `localStorage`. The format itself is `src/sim/save.ts` — pure, versioned, 19 tests (D-081) |
| **The returning player's two lines** ("Welcome back, …") | `returningMenu` in `src/features/naming/model.ts`; CONTINUE and START OVER are wired in `src/features/naming/view.ts` (D-081) |
| **Choosing where to land on Mars** | `src/features/landing-site/` — **built** (TASK-028 done) |
| **The landing film, between the map and the outpost** | `src/features/landing-cinematic/` — **built** (TASK-108). The whole timeline is one config object in `model.ts` (pure, 48 tests); the view plays it from one `requestAnimationFrame` loop and writes only `transform` and `opacity`. The NASA facts are in `src/data/landingFacts.ts`, each with its NASA page. The frames are WebP, fetched at startup by `src/ui/landingFrames.ts`, and the black curtain the outpost comes up through is `src/ui/handoffFade.ts` (D-085) |
| **Building the outpost between sols** | `src/features/base/` — **built**, 23 tests |
| **The landing window, where the supplies are bought** | `src/features/base/setupPopup.ts` — built; the popup over the build screen, mounted on `document.body` (D-082). The CSS in `src/features/base/setupPopup.css` |
| **Advancing a sol, and picking the day's activity** | `src/features/act/` — **built**, 38 tests |
| **The desk as a hub of buttons, and what each one says** | `src/features/act/model.ts` — `hubTiles`; pure words, no icons (D-070) |
| **The NASA layer on the act screen** (pictures, live space weather, facts) | `src/features/act/view.ts` — the "Real data" sheet (D-071) |
| **Why the run was won or lost, and the science score** | `src/features/debrief/` — **built**, 32 tests |
| **Reading what each module does, with NASA facts** | `src/features/encyclopedia/` — **built** |
| **Where each copy of a module stands on the outpost panel** | `src/ui/baseLayout.json` — a pose list per kind; drag them on the real screen with `?editlayout=1` (D-065, D-066). A pose may be mirrored (`flip`). The stacking order is a rule in `ui/baseLayout.ts` (D-069), not a number in the file: the copies of a kind recede from the camera, so the first copy is the nearest. The editor opens showing the file on disk, and a file with problems is listed in the console (D-068) |
| The placement editor itself | `src/ui/baseLayoutEditor.ts` — dev-only, compiled out of a production build |
| **The rover, and what it finds** | `src/sim/rover.ts` — **built**, 31 tests; its state is `RunState.rover` |
| **The work-order player and the six tools** | `src/ui/activityPlayer.ts`, `src/sim/minigames.ts` — **built** |
| **The how-to-play guide** | `src/ui/guide.ts`, `src/sim/guide.ts` — **built**; a **popup** with the astronaut on the left and a speech bubble on the right, one step per page (D-073); the `?` icon beside Menu |
| **The pictograms** (the 56 supplied drawings, the five stores, the five ranks, the eight modules) | `src/ui/icons.ts` — `IconName`, `ICON_PATHS`, `RESOURCE_ICON`, `RANK_ICON`, `MODULE_ICON`, `icon()`; read from `Assets/icons/` at build time and drawn through `src/dom/svg.ts` (D-070, D-083) |
| **A section opened over a screen** (the desk's six buttons) | `src/ui/sheet.ts` — backdrop, header, scrolling body, close, `Escape` and a Tab trap (D-070) |
| **The header's book / help / Menu, and the panel's corner fact** | `src/ui/gameLoop.ts` — `HeaderOptions`, `ScreenOptions.help`, `ScreenOptions.showEncyclopedia`, `PanelOptions.corner`. The book is **opt-in**: it is earned by reaching the outpost, and `hasReachedOutpost` (`sim/run.ts`) is how the three screens ask (D-080) |
| **Is the game still winnable?** | `npm run balance` — `tools/balance-check.mts`; fails if a site cannot hold all five systems |
| **Checking the build screen and the desk in a real browser** | `tools/browser-check-build.mjs` — the limits, the reasons, the tools, the guide |
| **Checking the whole journey in a real browser** | `tools/browser-check-journey.mjs` — naming to the outpost, with no console errors |
| **Checking the save in a real browser** | `tools/browser-check-save.mjs` — the run is written, a reload greets by name, CONTINUE returns to the screen they left, START OVER forgets it (D-081) |
| **Shrinking the rover's animation** | `tools/compress-rover-assets.py` — the PNG to WebP, and a check that the animation still has its frames |
| **Checking the rover in a real browser** | `tools/browser-check-rover.mjs` — headless Chrome; stamps the order, waits for the document, answers it, watches the science go up |
| Where START MISSION goes | `onSubmit` in `src/features/naming/view.ts` — flows to `briefing`; with a save on the device the same screen shows CONTINUE and START OVER instead of the form (D-081) |
| Boot, element lookup, `?motion=`, mounting screens | `src/main.ts` |
| Page structure, element ids, font link | `index.html` |
| Landing-page colours and tokens | `src/styles/base.css` |
| Astronaut transforms, cursor, sway/breathe | `src/styles/astronaut.css` |
| Title, cursor blink, vignette, reduced motion | `src/styles/message.css` |
| Star layers, twinkle keyframes | `src/styles/starfield.css` |
| Landing-page stylesheet entry | `src/style.css` |
| Build output, asset handling, offline base | `vite.config.ts` |
| Strictness, module resolution, compiled files | `tsconfig.json` |
| Layer rules, banned APIs, the `KNOWN` set | `scripts/check-imports.mjs` |
| Joining live flares to the forecast | `src/dom/forecastLoader.ts` |
| Joining live NASA pictures to the screen | `src/dom/dailyFactLoader.ts` |
| **Any NASA-API call** | `src/data/spaceweather.ts` — live; NASA DONKI → NOAA SWPC → baked. `strongestFlares` orders the readings for a screen (D-071) |
| **NASA's daily picture of the day** | `src/data/nasaDaily.ts` — live; APOD → the saved gallery |
| **The saved NASA cards and facts** | `src/data/nasaGallery.ts` — twelve cards, five region photos, forty tagged facts |
| A game screen | `src/features/<name>/` — every journey screen is built |
| What a screen is meant to contain | the `README.md` in that screen's folder |
| **Every decision, the sol loop, what is built, where a new event plugs in** | `docs/game-flow.md` |
| Per-screen pure logic / DOM / styles | `model.ts` / `view.ts` / `<name>.css` |

## 9. Commands

```bash
npm install
npm run dev        # Vite dev server
npm run check      # layer + banned-API check, then tsc --noEmit   <- run this
npm test           # vitest, 1051 tests                            <- 40% flaky, ISS-015
npm run build      # to dist/
npm run preview    # serve the build
npm run balance    # is the game still winnable?  <- run this after touching sim/
npm run typecheck  # tsc alone
```

Run `npm run check` **and** `npm test` before every commit. Run `npm run balance` too when
you touch `sim/` — it is the only thing that catches the game becoming unwinnable, and
the game was unwinnable for a long time before it existed.

## 10. Out of scope — stop and ask

Do not build any of these. Stop, ask, and get a decision recorded in
`docs/team/decisions.md`.

- **Supabase auth or cloud save state.** Deferred (D-003). The device-local save in
  `ui/save.ts` is the one exception, and it is not an account (D-081).
- **Any API key handling.** Until ISS-006 is fixed. One line in `.gitignore`.
- **Live DONKI fetching** until ISS-008 is answered in a real browser.
- **A plan phase.** Act is built without one — confirmed by the owner. Do not add
  `features/plan/` unasked.
- **A login page in front of `naming`.** Intended, not built — Supabase is deferred and
  unowned (D-003, TASK-022).
- **A save that follows the player between machines or browsers.** `ui/save.ts` writes one
  `localStorage` key on one device (D-081). Anything wider needs a backend, which is
  Supabase and still deferred (D-003).
- Moving the landing page out of `src/` root — it is live code until the game is 30%
  built (D-008).
- Multiplayer, leaderboards, analytics, telemetry. No backend.
- Native mobile packaging.
- Normalising line endings repo-wide without agreement.
- A framework, a state library, a build tool, or **any runtime dependency**. The project
  has zero today; adding one is an architecture change.

## 11. Where the detail is

| Question | File |
| --- | --- |
| Annotated file tree, layering, module contracts, known simplifications | `docs/architecture.md` |
| Why things are the way they are, and what was rejected | `docs/team/decisions.md` |
| What is broken, and how badly | `docs/team/issues.md` |
| What "done" means | `docs/team/goals.md` |
| Who is doing what | `docs/team/tasks.md` |
| What happened last, and what went wrong | `docs/team/progress-log.md` |

**Read those. Do not duplicate them here** — duplication is what makes docs rot, and this
repo already has one file (the README) that disagrees with the code.