# Architecture

The annotated truth about this repository as of 2026-10-06. Everything here was read
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

94 tests run in about 15ms with no browser, no jsdom, and no mocks. If `sim/` grew a DOM
reference it would still work, and the cost would surface later as an untestable bug.
Enforced as `no-dom-in-pure-zone`.

## Annotated file tree

Legend: **complete** = does what its name says, verified. **partial** = real code with a
real gap. **empty** = zero bytes. **does not exist** = planned, nothing written.

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
│   └── README_ref/*.png                complete   6 UI mockups, ~2.4 MB. Never bundled
│                                                 (publicDir:false exists to exclude them).
│
├── scripts/
│   └── check-imports.mjs               complete   Zone + banned-API checker, 9 rule ids.
│                                                 KNOWN set empty; staleness rule verified by
│                                                 running it. See "Layering".
│
├── docs/
│   ├── architecture.md                 this file
│   └── team/
│       ├── decisions.md                complete   numbered, newest first
│       ├── issues.md                   complete   15 issues, ISS-001..ISS-015
│       ├── goals.md  tasks.md  progress-log.md
│
├── AGENTS.md                           complete   the orientation file
├── README.md                           STALE      accurate about the game, WRONG about the
│                                                 code — see ISS-001. Not rewritten (D-011).
│
└── src/
    ├── main.ts                         complete   89 lines. Composition root only: resolves four
    │                                             elements by id, wires starfield + astronaut,
    │                                             reads ?motion= and prefers-reduced-motion.
    │                                             **Does not import ui/router.ts** — routing is
    │                                             implemented but not wired, see ui/ below.
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
    │   ├── frame.test.ts               PARTIAL    19 tests, one 40% flaky — ISS-015
    │   ├── resources.ts                DOES NOT EXIST   resource drain, 5 stores
    │   ├── sol.ts                      DOES NOT EXIST   advance one sol, resolve events, loss
    │   └── run.ts                      DOES NOT EXIST   RunState shape, newRun, isLost
    │
    ├── ui/                             CROSS-SCREEN BROWSER GLUE. No framework, so no components.
    │   ├── routes.ts                   complete   Pure route table and hash parsing. Exports
    │   │                                         Route, ROUTE_ORDER, DEFAULT_ROUTE, parseRoute,
    │   │                                         routeToHash, nextRoute, previousRoute. No DOM,
    │   │                                         so it is unit tested like sim/.
    │   ├── routes.test.ts              complete   15 tests. Every input literal — no Math.random,
    │   │                                         no clock, so it cannot flake.
    │   └── router.ts                   PARTIAL    startRouter(options) -> teardown, and
    │                                             navigate(route). Reads location.hash, listens for
    │                                             hashchange, normalises an unknown hash to the
    │                                             default via replaceState. **NOT WIRED into
    │                                             main.ts** — no features exist to route to, and
    │                                             half-wiring it could break the landing page.
    │                                             DOM behaviour UNVERIFIED in a browser.
    │   # registry.ts                   DOES NOT EXIST   route -> feature view map. Arrives with
    │                                                 the first feature, so it never imports
    │                                                 something that does not exist.
    │
    ├── dom/                            landing-page side effects only. Untested (ISS-011).
    │   ├── floatAstronaut.ts           complete   218 lines. The rAF loop, the two transforms, the
    │   │                                         resize handler, the grab lifecycle. Exports
    │   │                                         startFloatingAstronaut -> teardown. Discards deltas
    │   │                                         over 50ms.
    │   ├── pointerGrab.ts              complete   207 lines. Exports attachGrab -> teardown.
    │   │                                         Velocity is a 100ms windowed average, EMA smoothed.
    │   └── starfield.ts                complete   63 lines. 140 stars across three depth layers.
    │                                             Suspect: layers animate with no looping copy —
    │                                             ISS-002, unverified in a browser.
    │
    ├── data/                           DOES NOT EXIST   The only zone allowed to fetch. Blocked on
    │                                                 ISS-008. Contract below.
    ├── features/                       DOES NOT EXIST   One folder per screen. Not created empty:
    │                                                 git cannot track an empty directory, and a
    │                                                 .gitkeep reads as implemented work.
    │
    └── styles/                         plain CSS, landing page only
        ├── base.css                    complete   94 lines. Tokens, reset, backdrop, nebulae.
        │                                         Comment at line 60 is stale — ISS-014.
        ├── starfield.css               complete   70 lines. Carries the suspect ISS-002 animation.
        ├── astronaut.css               complete   82 lines. Three nested elements each owning one
        │                                         transform, plus sway/breathe keyframes.
        └── message.css                 complete   125 lines. Title, cursor, vignette, reduced-motion
                                                  block. Lines 100-101 contradict 110-113 — ISS-003.
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
             ╰─ NOT CONNECTED: main.ts does not import router.ts yet
```

Zero network calls, zero storage. There is no game state.

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

Routing does not appear here because it is not wired. When it is: start the router after
the landing page is up, and let `main.ts` own `RunState` and pass it to each screen.

## Module contracts

| module | exports | contract |
| --- | --- | --- |
| `main.ts` | none (side effects) | composition root; throws on a missing element id |
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
| `ui/routes` | `Route` | `'landing' \| 'landing-site' \| 'base' \| 'act' \| 'debrief'` |
| | `ROUTE_ORDER` | the five routes in play order |
| | `DEFAULT_ROUTE` | `'landing'` |
| | `parseRoute` | `(hash) -> Route \| null`; tolerant of missing/duplicated `/`, whitespace, case, query string. Returns null rather than throwing |
| | `routeToHash` | `(route) -> '#/<route>'` |
| | `nextRoute`, `previousRoute` | `(route) -> Route \| null`; null at the ends |
| `ui/router` | `startRouter` | `({onRoute, onUnknownHash?}) -> teardown`; fires `onRoute` once immediately and on every `hashchange`; normalises an unknown hash via `replaceState` |
| | `navigate` | `(route) => void`; assigns `location.hash` so Back works |
| `dom/floatAstronaut` | `startFloatingAstronaut` | `(wrapper, {deformLayer, reducedMotion}) -> teardown`; cancels rAF, removes the resize listener, detaches the grab, clears the transform |
| `dom/pointerGrab` | `attachGrab` | `(target, handlers, options) -> teardown` |
| `dom/starfield` | `createStarfield` | `(container) => void`; appends, never clears |

## Planned contracts

Declared so the checker and this document agree. **Not implemented, not tested, and
marked here so nobody reads them as existing.**

### `src/data/` — the network layer

The only zone allowed to `fetch`. Two sources:

- **DONKI** (`ccmc.gsfc.nasa.gov`) for solar flares and CMEs, driving in-game storm
  warnings. Direct browser fetch plus a baked-in fallback. **Blocked on ISS-008: CORS
  unverified.** Do not build before a human checks it in a real browser.
- **api.nasa.gov** with `VITE_NASA_API_KEY`, falling back to `DEMO_KEY`. Confirmed
  reachable: HTTP 200, `Access-Control-Allow-Origin` echoing the request origin.

Config read only in `data/`. Requires ISS-006 first, or the key is committed to a public
repository.

### `src/features/` — one folder per screen

Four screens in scope before the freeze: `landing-site`, `base`, `act`, `debrief`. There
is deliberately **no `plan/`** — act is built without one, confirmed by the owner.

### `src/sim/{resources,sol,run}.ts` — the game model

The pure simulation: five stores with per-sol drain, advancing a sol and resolving
events, and the `RunState` that `main.ts` owns and passes to every screen. This is the
largest unstarted body of work and the natural home for the 79-test pattern.

## Known simplifications

Deliberate shortcuts, and why each was accepted.

1. **`src/sim/` has no game state.** No resource model, no sol counter, no module graph.
   Accepted because none of it exists yet and inventing a shape would be guesswork baked
   into architecture.
2. **`data/`, `features/`, `sim/{resources,sol,run}.ts` and `ui/registry.ts` are declared
   but absent.** Accepted because git cannot track an empty directory and a `.gitkeep`
   reads as implemented work. The cost is that several declared zones are untested by the
   checker until code lands in them.
3. **`ui/router.ts` is implemented, tested in part, and not wired.** Half-wiring it with
   no features to switch to could break the landing page, and the DOM half cannot be
   tested without jsdom (ISS-013). Accepted deliberately: the pure half
   (`routes.ts`, 15 tests) carries the logic worth protecting.
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
9. **Sol stepping is undecided.** Turn-based or real-time, the tree works either way,
   because pure transition functions are correct for turn-based *and* are the right seam
   for real-time. If real-time wins, `sim/` gains a clock abstraction and `dom/` a ticker.
   Nothing in this structure forecloses it.
10. **The `KNOWN` set is empty.** Deliberate, per the reasoning above.
11. **No DOM test coverage.** Accepted only because there is no jsdom yet — ISS-011,
    ISS-013. The largest real gap in the repository.