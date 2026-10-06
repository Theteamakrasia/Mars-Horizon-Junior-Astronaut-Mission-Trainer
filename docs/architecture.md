# Architecture

The annotated truth about this repository as of 2026-10-06. Everything here was read
from the files, not inferred from intent. Where a file is empty or does not exist, it
says so — **an empty file is a promise, not an implementation.**

Read [`../AGENTS.md`](../AGENTS.md) first. This document is the detail behind it.

## What this project is

A Mars outpost survival-strategy game for ages 8-16, in which a child balances five
draining resources — power, oxygen, water, food, radiation shielding — over a
sol-based plan/act loop. Students are NASA Space Apps Challenge entrants; Nov 14-15
2026 is the demo and Nov 8 is the feature freeze.

**The single most important invariant:** the physics core (`src/core/`) is pure and
DOM-free. That is what makes the game feel testable and what makes it possible to
assert on a simulation instead of on a screenshot. Everything else in the architecture
exists to protect that.

## The invariant, and why it is enforced

`src/core/` must never touch `document`, `window`, or the network. This is not a style
preference — it is the reason 79 tests run in 15ms with no browser, no jsdom, and no
mocks. If core grew a DOM reference it would still work, and the cost would appear
later as an untestable bug.

`npm run check` enforces it as rule `no-dom-outside-dom`.

## Annotated file tree

Legend: **complete** = does what its name says, verified. **partial** = real code with
a real gap. **empty** = zero bytes, a promise only. **does not exist** = planned.

```
Mars-Horizon-Junior-Astronaut-Mission-Trainer/
│
├── index.html                          complete   54 lines. All five visual layers and the
│                                                  <script type=module> entry. Contains an
│                                                  external Google Fonts request — see ISS-007.
├── package.json                        complete   5 scripts: dev, build, preview, typecheck,
│                                                  test, check. Zero runtime dependencies.
├── package-lock.json                   complete   generated, do not edit
├── tsconfig.json                       complete   strict, noUnusedLocals, bundler resolution
├── vite.config.ts                      complete   publicDir:false, base:'./', target es2020
├── LICENSE                             complete   MIT, "Team Akrasia 2026". Not mirrored into
│                                                  package.json — see ISS-004.
├── .gitignore                          partial    4 lines. Missing .env* — see ISS-006.
├── .gitattributes                      DOES NOT EXIST   See ISS-005. This is the single
│                                                  cheapest thing to add and it is missing.
│
├── Assets/
│   ├── images/floating.png             complete   145 KB astronaut sprite, imported from TS so
│   │                                             Vite fingerprints it into dist/
│   └── README_ref/*.png                complete   6 UI mockups, ~2.4 MB total. Never bundled
│                                                 (publicDir:false exists to exclude them).
│
├── scripts/
│   └── check-imports.mjs               complete   Layer + banned-API checker. KNOWN set is
│                                                 empty; self-cleaning staleness rule tested.
│                                                 See "Layering" below.
│
├── docs/
│   ├── architecture.md                 this file
│   └── team/
│       ├── decisions.md                complete   numbered, newest first
│       ├── issues.md                   complete   15 issues, ISS-001..ISS-015
│       ├── goals.md                    complete
│       ├── tasks.md                    complete
│       └── progress-log.md             complete
│
├── AGENTS.md                           complete   the orientation file
├── README.md                           STALE      accurate about the game, WRONG about the
│                                                 code — see ISS-001. Not rewritten in this pass.
│
└── src/
    ├── main.ts                         complete   89 lines. Composition root only: resolves four
    │                                             elements by id, wires starfield + astronaut,
    │                                             reads ?motion= override and the OS
    │                                             prefers-reduced-motion query, tears down and
    │                                             rebuilds the rAF loop on preference change.
    ├── style.css                       complete   5 lines. Imports the four stylesheets in DOM
    │                                             stacking order. Its only job.
    ├── vite-env.d.ts                   complete   1 line, `/// <reference types="vite/client" />`.
    │                                             Ambient declaration, exempt from layer rules.
    │
    ├── core/                           PURE. No DOM. No network. Fully unit tested.
    │   ├── drift.ts                    complete   247 lines. DVD-logo drift maths. Exports
    │   │                                         stepDrift, createInitialDrift, driftSpeedForViewport,
    │   │                                         clampToViewport, clampSpeed, rescaleSpeed and the
    │   │                                         constants MIN/MAX_DRIFT_SPEED (96/176),
    │   │                                         REDUCED_DRIFT_SPEED (34), MAX_THROW_SPEED (620).
    │   │                                         Substeps at 1/120s so a backgrounded tab cannot
    │   │                                         tunnel the sprite through a wall.
    │   ├── deform.ts                   complete   238 lines. Damped spring for squash-and-stretch.
    │   │                                         Exports createDeform, impact, stretch,
    │   │                                         releaseStretch, stepDeform, isDeformSettled,
    │   │                                         deformScale, STIFFNESS 340, DAMPING 11,
    │   │                                         MAX_COMPRESSION 0.19, MAX_DRAG_COMPRESSION 0.045,
    │   │                                         IMPULSE 3.5. Semistplicit Euler, substepped.
    │   ├── frame.ts                    complete   197 lines. Composes drift + deform into one frame
    │   │                                         with no DOM. Exports createAstronautFrame,
    │   │                                         stepAstronaut, releaseAstronaut, DRAG_FOLLOW_RATE 14,
    │   │                                         DRAG_STRETCH_SPEED 3400, MIN_THROW_SPEED 60.
    │   │                                         The load-bearing line is the unconditional
    │   │                                         `deform: stepDeform(...)` on return — a spring that is
    │   │                                         kicked but never integrated again stays deformed.
    │   ├── drift.test.ts               complete   30 tests. Contains a latent flake, see ISS-015
    │   │                                         context — the flaky assertion is in frame.test.ts.
    │   ├── deform.test.ts              complete   30 tests
    │   └── frame.test.ts               PARTIAL    19 tests, one of them 40% flaky — ISS-015.
    │
    ├── dom/                            BROWSER SIDE EFFECTS. May touch the DOM. Zero tests.
    │   ├── floatAstronaut.ts           complete   218 lines. The rAF loop, the two transforms, the
    │   │                                         resize handler, and the grab lifecycle. Exports
    │   │                                         startFloatingAstronaut(wrapper, options) returning a
    │   │                                         teardown function. Discards deltas over 50ms so a
    │   │                                         returning tab does not teleport the sprite.
    │   ├── pointerGrab.ts              complete   207 lines. Pointer events to GrabTarget. Exports
    │   │                                         attachGrab(target, handlers, options) returning a
    │   │                                         teardown. Velocity is a windowed average over 100ms
    │   │                                         smoothed by EMA, because the last pointermove before
    │   │                                         a pointerup is usually near-zero.
    │   └── starfield.ts                complete   63 lines. Generates 140 stars across three depth
    │                                             layers with randomised CSS custom properties.
    │                                             Suspect: layers animate with no looping copy —
    │                                             ISS-002, unverified in a browser.
    │
    ├── data/                           DOES NOT EXIST   Planned for this sprint. The only layer
    │                                                 permitted to fetch. Contract below.
    ├── ui/                             DOES NOT EXIST   Planned. Screen rendering. Deliberately left
    │                                                 uncreated: an empty directory cannot be tracked
    │                                                 by git, and a placeholder file would be read as
    │                                                 implemented work.
    │
    └── styles/                         plain CSS, one layer each
        ├── base.css                    complete   94 lines. Design tokens, reset, backdrop,
        │                                         nebulae. Comment at line 60 is stale — ISS-014.
        ├── starfield.css               complete   70 lines. Depth layers and twinkle keyframes.
        │                                         Carries the suspect ISS-002 animation.
        ├── astronaut.css               complete   82 lines. Three nested elements each owning one
        │                                         transform, plus the sway/breathe keyframes.
        └── message.css                 complete   125 lines. Extruded-slab title, cursor, vignette,
                                                  reduced-motion block. Lines 100-101 contradict
                                                  lines 110-113 — ISS-003.
```

## Layering

Enforced by `npm run check` → `scripts/check-imports.mjs`. Every violation prints
`file:line`.

| layer | may import | may not | contains |
| --- | --- | --- | --- |
| `core/` | `core` | everything else | pure maths, no DOM, no network |
| `data/` | `data`, `core` | `dom`, `ui` | the only place `fetch` may appear |
| `dom/` | `dom`, `core`, `data` | `ui` | rAF, DOM writes, pointer events |
| `ui/` | `ui`, `core`, `data`, `dom` | — | screens and rendering |
| `main.ts` | anything | — | composition root |

Banned APIs, independently of layer:

| rule | banned | allowed in |
| --- | --- | --- |
| `no-alert` | `alert`, `confirm`, `prompt` | nowhere — ever |
| `no-dom-outside-dom` | `document`, `window` | `dom/`, `ui/`, `main.ts` |
| `no-network-outside-data` | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon` | `data/` only |
| `no-inline-handler` | `on*="..."` attributes in markup | nowhere — ever |
| `layer-boundary` | any import not in the table above | — |
| `unresolved-import` | a relative path that resolves to nothing | — |
| `unknown-layer` | a file in `src/` outside any declared layer | — |

### The KNOWN set

`scripts/check-imports.mjs` holds a `KNOWN` set of pre-existing tolerated violations
keyed `"path:line:ruleId"`. **It is currently empty**, because after the layer fix there
are no outstanding violations. Seeding it with a speculative entry would be worse than
leaving it empty: a `KNOWN` entry that matches nothing is caught by the staleness rule
and fails the build, so a fabricated one would break `npm run check` immediately.

The staleness rule is implemented and was verified by running it: an entry that matches
no current violation produces `delete KNOWN entry: "..."` and exits 1. **Fix a KNOWN
violation and delete its entry in the same commit.**

## Data flow

```
URL ?motion=force|reduce ─┐
                          ├─> main.bootstrap ─> readMotionOverride + matchMedia
prefers-reduced-motion ───┘                            │
                                                   startFloatingAstronaut ─┐
createStarfield(starfield)  (one-off DOM build)                          │
                                                                          v
  rAF tick ─> stepAstronaut(frame, dt, grab, opts) ─> render ─> wrapper.style.transform
                                     │                                     deformLayer.style.transform
                                     │
             ┌───────────────────────┴────────────────────┐
             v                                            v
      stepDrift (position, bounces)              stepDeform (spring)
             │  impact {normal, speed}                 │
             └────────────────> impact()/stretch() <────┘
```

Two reads, zero network calls, zero storage. **This is the whole runtime today.** There
is no game state, no save, and no data layer — see "Planned contracts".

## Boot order

1. `index.html` parses. Five layers exist: `#starfield`, `#astronaut`, `.stage`,
   `.vignette`, plus `body::before`/`::after` backdrops.
2. `index.html` requests Orbitron from Google Fonts — the only network request on the
   page (ISS-007).
3. `<script type="module">` loads `/src/main.ts`, which imports `style.css` first.
4. Vite resolves `../Assets/images/floating.png` to a fingerprinted URL.
5. `main.ts` waits for `DOMContentLoaded` if `readyState === 'loading'`, else boots now.
6. `bootstrap()` resolves four elements by id via `requireElement`, which **throws** on a
   missing id rather than returning null.
7. `astronautImg.src` and `draggable = false` are set.
8. `createStarfield(starfield)` appends 140 stars in one `DocumentFragment`.
9. `readMotionOverride()` parses `?motion=`; `matchMedia` reads the OS preference.
10. `applyMotionPreference()` stops any previous loop, then calls
    `startFloatingAstronaut`, storing the teardown.
11. The `change` listener on the motion query is attached **only** when no URL override
    was requested, so an explicit `?motion=` is not overwritten by an OS toggle.
12. The first `requestAnimationFrame` is scheduled.

## Module contracts

Exported surface, as actually declared.

| module | exports | contract |
| --- | --- | --- |
| `main.ts` | none (side effects only) | composition root; throws on a missing element id |
| `core/drift` | `stepDrift` | `(state, dt, size, viewport) -> DriftResult`; reflects off walls, returns the fastest `Impact` or null |
| | `createInitialDrift` | `(size, viewport, speed) -> DriftState`; random 30-45 degree diagonal. **Calls `Math.random()` 5 times** |
| | `driftSpeedForViewport` | `(width) -> number`, clamped to 96..176 px/s |
| | `clampToViewport`, `clampSpeed`, `rescaleSpeed` | position/velocity utilities |
| | `REDUCED_DRIFT_SPEED` (34), `MIN_DRIFT_SPEED` (96), `MAX_DRIFT_SPEED` (176), `MAX_THROW_SPEED` (620) | tunables in px/s |
| `core/deform` | `createDeform` | zeroed `DeformState` |
| | `impact` | `(state, angle, strength, profile) -> DeformState`; velocity impulse, does not stack above full strength |
| | `stretch` | same shape; sets `target`, never an impulse |
| | `releaseStretch` | `(state) -> DeformState`; zeroes `target` |
| | `stepDeform` | `(state, dt) -> DeformState`; substepped semistplicit Euler |
| | `isDeformSettled` | `(state) -> boolean`; tolerance 0.0015 / 0.02 |
| | `deformScale` | `(state) -> {along, across}`; `across` is the exact reciprocal of `along`, conserving area |
| | `STIFFNESS` 340, `DAMPING` 11, `MAX_COMPRESSION` 0.19, `MAX_DRAG_COMPRESSION` 0.045, `IMPULSE` 3.5 | tunables |
| `core/frame` | `createAstronautFrame` | `(size, viewport, speed) -> AstronautFrame` |
| | `stepAstronaut` | `(frame, dt, grab, options) -> AstronautFrame`; steps the spring unconditionally |
| | `releaseAstronaut` | `(frame, release, options) -> AstronautFrame`; clamps into the viewport, discards throws under reduced motion |
| | `DRAG_FOLLOW_RATE` 14, `DRAG_STRETCH_SPEED` 3400, `MIN_THROW_SPEED` 60 | tunables |
| `dom/floatAstronaut` | `startFloatingAstronaut` | `(wrapper, {deformLayer, reducedMotion}) -> teardown()`; teardown cancels rAF, removes the resize listener, detaches the grab and clears the transform |
| `dom/pointerGrab` | `attachGrab` | `(target, handlers, options) -> teardown()`; handlers `onGrab`/`onDrag`/`onRelease`/`onCancel` |
| `dom/starfield` | `createStarfield` | `(container) => void`; appends, never clears |

## Planned contracts

Declared so the checker's allow-list and this document agree. **Not implemented, not
tested, and marked here so nobody reads them as existing.**

### `src/data/` — the network layer, this sprint

Intended to be the only place `fetch` appears. Two sources:

- **DONKI** (`ccmc.gsfc.nasa.gov`) for solar flares and coronal mass ejections, driving
  in-game storm warnings. Direct browser fetch plus a baked-in fallback.
  **Blocked on ISS-008: CORS is unverified.** Do not build this until someone opens
  DONKI in a real browser and reads the response headers.
- **api.nasa.gov** with `VITE_NASA_API_KEY`, falling back to `DEMO_KEY`. Confirmed
  reachable: HTTP 200 and `Access-Control-Allow-Origin` echoing the request origin.

Config belongs in `import.meta.env.VITE_*`, read only in `data/`. Requires ISS-006 to be
fixed first, or the key gets committed to a public repository.

### `src/ui/` — screens

Not created. Nothing to put in it yet.

## Known simplifications

Deliberate shortcuts, and why each was accepted.

1. **`src/core/` has no game state.** There is no resource model, no sol counter, no
   module graph. Accepted because none of it exists yet and inventing a shape for it
   would be guesswork baked into architecture. The layer rule already guarantees the
   maths lands somewhere testable.
2. **`data/` and `ui/` are declared but absent.** Accepted because git cannot track an
   empty directory, and a placeholder file is worse than an honest gap — it reads as
   implemented work. The cost is that two of the five layers are untested by the
   checker until code lands in them.
3. **No persistence of any kind.** No `localStorage`, no `sessionStorage`, no cookie.
   Accepted for this sprint: Supabase is explicitly deferred (D-003), and the landing
   page has nothing to persist.
4. **`MAX_SUBSTEP_SECONDS` is duplicated as `1/120` in both `drift.ts` and `deform.ts`.**
   Accepted because the two integrators are independent and could legitimately diverge;
   extracting a shared constant would couple modules that have no other relationship.
   Worth revisiting if either rate changes.
5. **Two `sample`-style locals in `pointerGrab.ts` are capped by `MAX_SAMPLES = 8` rather
   than time.** Accepted as a cheap bound; the 100ms window discards the rest anyway.
6. **`starfield.ts` uses `Math.random()` with no seeding option.** Accepted because the
   field is decorative and variety per load is the goal. The cost is that it is not
   snapshot-testable, which is part of ISS-011.
7. **Frame-rate independence is approximated by substepping rather than a fixed
   timestep accumulator.** Accepted because substepping is simpler and the drift maths
   is linear. `deform.test.ts` asserts one long frame matches six short ones.
8. **No CI.** Accepted as a deferral, not a virtue — see ISS-012. `npm run check` and
   `npm test` both work locally and are wired for CI whenever someone adds it.
9. **The `KNOWN` set is empty.** Accepted deliberately, per the reasoning above.
10. **No DOM test coverage.** Accepted only because there is no jsdom yet — see ISS-011
    and ISS-013. This is the largest real gap in the repository.