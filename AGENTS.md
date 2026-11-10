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

That is what lets 568 tests run in a few seconds with no browser and no mocks, so the game
can be asserted on rather than eyeballed. Everything else here exists to protect it. If
you are unsure where code goes: if it touches the DOM it is not pure.

**Current reality: the whole journey is built.** The **naming menu is the entry route** —
the player names their astronaut and presses START MISSION, which flows through
`briefing → supply → launch → interior → landing-site → base → act → debrief`. `base` is
the outpost (build modules, read the storm warning), `act` advances one sol per press, and
`debrief` explains a win or loss from the per-sol ledger. The polished landing page still
works behind it and is what BACK TO MAIN MENU returns to.

**Every sol now has a main activity** (D-051). On the eight calm sols `act` offers three
and the player picks one; on a crisis sol the crisis replaces the activity panel, so the
crisis *is* that day's activity. The rules are in `sim/activities.ts`, the cost and gain
are applied by `sim/sol.ts`, and the science points they earn give the run a score and a
rank (D-052) that the debrief reports.

What is still a **stub**: nothing in the journey. `data/spaceweather.ts` is implemented and
live: it reads solar flares from NASA DONKI, falls through to NOAA SWPC when DONKI is
unreachable or throttled, and finally to an empty list, from which `sim/forecast.ts`
draws typical flares marked `approximate`. `data/nasaDaily.ts` is live too: it reads
NASA's Astronomy Picture of the Day and falls back to the saved gallery. There is **no
save** — the run lives in memory only — and the forecast's *timing* is rolled per run
from a seed (`sim/forecast.ts`, D-048), so only the flare *size* comes from the network
(D-033, D-037, D-053).

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
| R-11 | A relative import that resolves to nothing is an error | **enforced** | `unresolved-import` |
| R-12 | Typecheck clean; `strict`, `noUnusedLocals` | **enforced** | `npm run check` |
| R-13 | Tests pass (568 today) | **enforced** | `npm test`, watch ISS-015 |
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

**No save, and two live network paths.** The whole run — name, region, stores, modules,
the science score and the per-sol ledger — lives in `main.ts` memory only and is lost on
refresh.

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
13. `startScreenRouter()` resolves the hash — **defaulting to `naming`** — mounts that
    screen, and hides the landing layers behind it.

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
| **The day's activity, its cost and its gain** | `src/sim/activities.ts` — complete, 17 tests |
| **The science score and the rank ladder** | `src/sim/science.ts` — complete, 9 tests |
| **The five science goals and their live state** | `src/sim/goals.ts` — complete, 17 tests |
| **What a lesson is about** (power, dust, water, food, radiation, missions) | `src/sim/topics.ts` |
| Earth-Mars delay, "can Earth answer in time" | `src/sim/comms.ts` |
| Every tuning number | `src/sim/modules.ts` — edit here to retune |
| The rAF loop, transforms, resize, reduced motion | `src/dom/floatAstronaut.ts` |
| Pointer grab, throw velocity, pointer capture | `src/dom/pointerGrab.ts` |
| Star generation and twinkle randomness | `src/dom/starfield.ts` |
| Hash routing, route table | `src/ui/router.ts`, `src/ui/routes.ts` |
| Route → screen mapping | `src/ui/registry.ts` — **the only file that imports a feature's view** |
| **The player's name, and the entry screen** | `src/features/naming/` — **built** |
| Name length, trimming, emoji, validation | `src/features/naming/model.ts` — pure, 21 tests |
| The rotating Mars-behind-astronaut stage | `src/features/naming/naming.css` |
| **Choosing where to land on Mars** | `src/features/landing-site/` — **built** (TASK-028 done) |
| **Building the outpost between sols** | `src/features/base/` — **built**, 11 tests |
| **Advancing a sol, and picking the day's activity** | `src/features/act/` — **built**, 20 tests |
| **Why the run was won or lost, and the science score** | `src/features/debrief/` — **built**, 25 tests |
| Where START MISSION goes | `onSubmit` in `src/features/naming/view.ts` — flows to `briefing` |
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
| **Any NASA-API call** | `src/data/spaceweather.ts` — live; NASA DONKI → NOAA SWPC → baked |
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
npm test           # vitest, 568 tests                            <- 40% flaky, ISS-015
npm run build      # to dist/
npm run preview    # serve the build
npm run typecheck  # tsc alone
```

Run `npm run check` **and** `npm test` before every commit.

## 10. Out of scope — stop and ask

Do not build any of these. Stop, ask, and get a decision recorded in
`docs/team/decisions.md`.

- **Supabase auth or save state.** Deferred (D-003). No owner, no schedule.
- **Any API key handling.** Until ISS-006 is fixed. One line in `.gitignore`.
- **Live DONKI fetching** until ISS-008 is answered in a real browser.
- **A plan phase.** Act is built without one — confirmed by the owner. Do not add
  `features/plan/` unasked.
- **A login page in front of `naming`.** Intended, not built — Supabase is deferred and
  unowned (D-003, TASK-022).
- **Persisting the player's name.** In memory only. Adding storage without Supabase is
  a decision to make deliberately, not a convenience.
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