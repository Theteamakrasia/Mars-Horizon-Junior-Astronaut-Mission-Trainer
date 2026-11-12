# Mars Horizon: Game Loop Implementation Plan

Covers `base → act → debrief`, the simulation under them, and the cutscenes, animations and sprites they need.

Written 2026-11-08. Baseline: naming → briefing → supply → launch → interior → landing-site are built. `base`, `act`, `debrief`, `sim/resources.ts`, `sim/sol.ts` and most of `sim/run.ts` are stubs that throw.

---

## 0. Read this first

1. **The feature freeze is Nov 8, which is today.** After it, only bug fixes. This plan is a vertical slice. If the team has not agreed to extend the freeze for the game loop, that conversation comes before any code. Without an extension, the loop cannot ship as a feature.
2. **Demo is Nov 14-15.** If the freeze is extended, the working target is: one full playthrough from naming to debrief, with no developer in the room (goal G-4).
3. **Everything numeric here is provisional.** Every number lives in one constants file and is tuned by balance tests (section 5), not by feel.
4. **Hard constraints that apply to every step** (AGENTS.md):
   - `sim/` and each `model.ts` stay pure: no DOM, no network, no `Math.random`, no clock (R-6, R-8).
   - No feature imports another feature (R-5). State travels through `RunState`.
   - No violence, death or enemies. Losing costs resources, never a life (R-20).
   - Every test input is a literal (ISS-015).
   - Text readable by an eight-year-old. The challenge brief says ages 7-12 and the repo says 8-16, so write for the lower bound.
   - Reduced motion honoured. Resting CSS state must be correct with no animation running.
   - No `pointer-events: none` in feature CSS (check-markup rule 8).

---

## 1. Decisions to record before code

Next free decision id is **D-030**. Each entry needs a **Rejected** line.

| id | Choice | Why | Rejected |
| --- | --- | --- | --- |
| D-030 | Sols are **turn-based**: one button press resolves one sol | Unblocks `sim/sol.ts` and `act`. Real-time needs a fake clock and a ticker | Real-time (more code, flakier tests, no time) |
| D-031 | The loop is `base ⇄ act → debrief`. `act` stays a simulation runner; the player returns to `base` between sols to build | Keeps D-018 (no plan phase) intact while still giving the player decisions | A `plan/` feature (needs a recorded decision per D-018 and is not in scope) |
| D-032 | Module catalogue lives in `sim/modules.ts`, not `features/base/model.ts` | `act` needs module effects and cannot import `base` (R-5). Same reasoning as D-029 | Duplicating the table in `act` |
| D-033 | Space-weather events are **baked-in and labelled approximate** | DONKI CORS is unverified (ISS-008, D-005). The README promises honesty about estimates | A live fetch (blocked), or unlabelled baked data |
| D-034 | Region scores drive the simulation (sun → power, water → starting water, dust → storm severity, temp → night drain, terrain → build cost) | Makes the landing choice matter. Currently `regionId` is stored and nothing reads it | Leaving the region cosmetic |
| D-035 | The Final screen is **cut as its own route**. A win is a panel on `debrief` | There is no route, task or art for it, and the freeze is today | Building a seventh screen |

Also log before fixing:

- **ISS-040** (next free issue id; `issues.md` says 036 but 039 is used): `landing-site` commits the region with `withState` and never sets region-dependent starting stores.
- **Task id hygiene:** `tasks.md` reuses TASK-032 to 034. Next free task id is **TASK-042**.

---

## 2. The player loop

```
landing-site → [LAND HERE] → base (sol 0, touchdown cutscene)
                               │  build modules, read storm warning
                               ▼
                        [START SOLS] → act ──[ADVANCE SOL]──┐
                               ▲           │                │ (repeat)
                               └─[BACK TO BASE]─┘           │
                                                            ▼
                              status = lost or won → debrief → [PLAY AGAIN] → landing-site
```

- One sol per button press. The player can go back to `base` between sols and build.
- The run ends on one of two conditions:
  - **Lost:** any of the five stores reaches zero. Never a death.
  - **Won:** reach the target sol (provisionally sol 20) with no store at zero.
- `RunState` is the only thing shared. `main.ts` owns it; screens receive `run` **at mount time only**. Each screen keeps its own current-run variable, calls `setRun(next)` on every change, then navigates. The next screen mounts with the updated run.
- `run === null` (direct hash visit): create a default run, as `landing-site` does.

---

## 3. Game content inventory

### 3.1 Modules (buildings)

All values provisional. `power` = draw per sol (negative = generation).

| Module | Starts built? | Provides | Needs | Build cost | Teaches |
| --- | --- | --- | --- | --- | --- |
| Habitat | yes | Shelter, crew capacity (3) | Power draw | n/a | Everything else supports it |
| Life support | yes | Oxygen and water recycling | Power, some water | n/a | Closed-loop living (ISS recycles about 90% of water) |
| Solar array | yes | Daytime power, scaled by region **sun** | Region **terrain** (build cost) | n/a (first one free) | Day/night problem |
| Batteries | yes | Night power storage (raises power cap) | None | n/a (first set free) | Why storage matters |
| Greenhouse | build | Food per sol | Water, power | medium | Growing food costs other resources |
| Water extractor | build | Water per sol, scaled by region **water** | Power | medium | ISRU: use what is on Mars |
| Radiation shelter | build | Shielding | None | medium | Margin before the crisis |
| Extra solar array | build | More daytime power | Terrain | low | Generation versus storage |
| Extra batteries | build | Higher power cap | None | low | Generation versus storage |

Optional, cut first: **comms dish** (enables the communication-delay event), **rover** (a one-sol survey action).

Rules:
- Build cost is paid immediately from the stores (power and water), shown **before** the player commits ("Greenhouse: food +3, water −2, power −4, build cost 15 power").
- Cap each buildable at a small number (for example 3) so no strategy is "build forever".
- Each module improves one system and increases what the others must support. That coupling is the game.

### 3.2 Resources (stores)

Five stores, kept as 0-100 percentages so the base panel and the debrief timeline render without conversion. The existing `createInitialStores` start (power 40, oxygen 100, water 90, food 80, shielding 20) is the baseline, adjusted by region.

| Store | Drains from | Restored by |
| --- | --- | --- |
| Power | Module draw, night drain | Solar arrays (daytime), supply pod |
| Oxygen | Crew (3) | Life support |
| Water | Crew, greenhouse, life support | Water extractor, life-support recycling, supply pod |
| Food | Crew | Greenhouse, supply pod |
| Shielding | Storms and flares | Radiation shelter |

### 3.3 Crew

Three astronauts, matching the briefing. The sim treats crew as a number that scales oxygen, water and food use. There are no per-crew tasks because there is no plan phase. The player's name comes from `RunState` and is shown in the event log and debrief.

### 3.4 Events (all baked, all `approximate: true`)

| Sol | Event | Effect |
| --- | --- | --- |
| 2 | Storm **warning** (shown on `base`) | None. Teaches reading ahead |
| 5 | Dust storm | Solar output reduced for 2 sols. Shielding reduces damage |
| 10 | Supply pod | Fixed bundle of water, food, power |
| 14 | Solar flare | Radiation hit. Shielding absorbs it |
| 12 (optional) | Communication delay | "Earth replies in 20 minutes. Decide now." Flavour only |
| 20 | Win check | Win if no store at zero |

A storm is predicted before it hits (forecast → event), so a player who builds margin early survives it.

---

## 4. Simulation design (`sim/`, pure, tested)

### 4.1 New and changed files

| File | Change |
| --- | --- |
| `sim/modules.ts` (new) | `ModuleKind`, `ModuleSpec`, `MODULE_CATALOGUE`, `canBuild`, `buildCost`, `upkeepFor`. Imports only `sim/` |
| `sim/constants.ts` (new) | All tuning numbers in one file |
| `sim/events.ts` (new) | Baked schedule, `eventsForSol(sol)`, `forecastFrom(sol, horizon)`. Every event `approximate: true` |
| `sim/resources.ts` | Real `drainForSol(stores, sol, modules, region)` and `depletedStores` |
| `sim/sol.ts` | Real `advanceSol` and `isRunOver`. Returns a per-store **ledger** (see 4.3) |
| `sim/run.ts` | Add `modules`, `ledger` (history), and `landAt(run, regionId)`. Remove the STUB header when done |
| `features/base/model.ts` | Becomes a thin re-export of `sim/modules.ts` plus presentation helpers |

### 4.2 Per-sol order of operations

`advanceSol(run)` does, in this order, so tests can assert each step:

1. Compute daytime power from arrays × region sun.
2. Subtract module draw and night drain (higher when region temp is low).
3. Apply oxygen, water and food use for the crew, offset by life support, extractor and greenhouse.
4. Apply that sol's events (storm damage reduced by shielding, supply pod, flare).
5. Clamp every store to 0-100 and cap power by battery capacity.
6. Record the ledger entry.
7. Decide `status`: lost if any store ≤ 0, won if sol ≥ target with none depleted, else active.

### 4.3 The ledger (what makes the debrief honest)

Every sol records, per store, a list of `{ cause, delta }` plus the store's value after the sol. Examples of causes: `crew`, `night-drain`, `module:greenhouse`, `storm`, `supply-pod`.

This is the one structural addition that matters. With no plan phase, the debrief is the only place a player learns why they lost, so it has to reason over history, not just final numbers. A ledger lets it say "your batteries could not carry the night" rather than "you ran out of power".

### 4.4 Region links (D-034)

| Axis | Drives |
| --- | --- |
| sun | Power per solar array |
| water | Starting water and extractor output |
| dust | Storm severity and solar loss during a storm |
| temp | Night power drain |
| terrain | Build cost multiplier |

`landAt(run, regionId)` sets `regionId` **and** region-adjusted starting stores. Change `landing-site/view.ts` `commitLanding` to call it instead of `withState(run, { regionId })` (one-line change plus a test). This is ISS-040.

### 4.5 Tests (all literal inputs)

- `modules.test.ts`: catalogue entries complete, costs positive, caps enforced, `upkeepFor` sums correctly.
- `events.test.ts`: schedule sorted, every event `approximate: true`, forecast window correct.
- `resources.test.ts`: each drain in isolation, clamping, depletion detection, never mutates its argument.
- `sol.test.ts`: order of operations, ledger entries, lost on zero, won at target sol, **never a death state**.
- `run.test.ts`: `newRun`, `landAt` for each region, state is immutable.
- Update `registry.test.ts` and `routes.test.ts` (see 6.5).

---

## 5. Balance acceptance tests

The slice is only fair if these hold. Write them as tests so tuning cannot silently break them.

1. **Default build is survivable for a while.** With only the four starting modules, a run survives at least the storm warning and the first storm (sol 5) in every region.
2. **Default build is not a free win.** The four starting modules alone do **not** reach sol 20 in any region.
3. **A thoughtful build wins.** A scripted sensible build (extra battery, shelter before sol 5, extractor, greenhouse) reaches sol 20 in at least three of five regions.
4. **No perfect region.** No region wins with zero building effort, and no region is unwinnable. This preserves the README lesson that there is no perfect choice.
5. **Over-building loses.** A build that adds every module immediately runs out of power. This is the trade-off in action.
6. **Sun versus water is real.** A high-sun, low-water region and a high-water, low-sun region fail for different reasons, visible in the ledger.

---

## 6. Screens

Each needs a `<section>` in `index.html` **outside** `#landing`, `data-*` hooks inside its own section (check-markup rules 5 and 6), registration in `SCREEN_MOUNTS` and `SCREENS` in `registry.ts`, `model.ts`, `model.test.ts`, `view.ts` and `<name>.css` imported by the view (R-15).

### 6.1 `base` (TASK-029)

**Shows**
- The outpost scene with placed modules as sprites.
- Life Support and Resources panel: five stores as percentages with icons.
- Incoming-weather warning ("Solar storm approaching in sol 5"), with an *Estimated* tag.
- **Build New Module** control: list of buildable modules, each with a cost and effect preview.
- **Start sols** button → `act`.

**Behaviour**
- Touchdown cutscene on first mount of a run (see 7).
- Building is immediate, pays cost, updates `run` via `setRun`.
- Disabled build buttons say why ("Not enough power").

**Model**: `canBuild`, `buildPreview(run, kind)`, `warningFor(run)`, panel formatting.

### 6.2 `act` (TASK-030)

**Shows**
- Sol counter and day/night scene (`data-phase`).
- **Advance sol** and **Back to base** buttons.
- The Power Surplus picture built from **live numbers**:
  `sun → arrays → +N kW → storing M kW → night drain −K kW`.
- Location Conditions panel from the region scores.
- Event log for the sol, with `approximate` events tagged.

**Behaviour**
- Advance calls `advanceSol` from `sim/sol.ts` and plays the sol transition.
- On `status !== 'active'`, `setRun`, then navigate to `debrief`.
- Keyboard operable. Buttons disabled during a transition so a double press cannot advance twice.

**Model**: thin. Headline copy and picture formatting only. Rules stay in `sim/`.

### 6.3 `debrief` (TASK-031)

**Shows**
1. Outcome header (won / lost) in calm, diagnostic language.
2. **Timeline first**: five store levels per sol with events marked. Draw it with inline SVG or CSS bars (no library; zero runtime dependencies).
3. What was **used** and what was **wasted**.
4. `explainOutcome`: attribution from the ledger.
5. Honesty note when any event came from baked-in data.
6. **Play again** → `landing-site`, keeping the astronaut's name.
7. A won run shows a "self-sustaining outpost" panel (D-035).

**Attribution rule (honest by construction)**
- Find the first store that hit zero.
- Sum the negative ledger causes for that store across the last N sols.
- If one cause is more than half the loss, `confident: true` and name it.
- Otherwise `confident: false`: show the timeline and say the game is not sure, so the player draws the conclusion.
- Never ship a plausible guess. A correct timeline beats a confident wrong explanation.

**Copy rules**: "Your batteries were sized for one night, not two" is a lesson. "You failed" is banned.

---

## 7. Cutscenes, animations and sprites

There is no new art. Everything is CSS or inline SVG, or reuses existing assets (`floating.png`, interior sprite strips, landing-site thumbnails).

### 7.1 Cutscenes (short, skippable, no new video)

| Moment | Where | Approach | Length |
| --- | --- | --- | --- |
| Touchdown | `base`, first mount of a run | Lander descends over the chosen region's thumbnail, dust puff on contact, then the base fades in | about 3s |
| Sol transition | `act` | Sky gradient shifts day → dusk → night → dawn, sun and moon move, then the numbers update | about 1.5s |
| Dust storm | `act`, storm sols | Slow opacity haze over the scene. **No flashing** | while active |
| Supply pod | `act`, sol 10 | Pod and parachute shape drop into frame | about 2s |
| Solar flare | `act`, sol 14 | Slow warm glow at the horizon, not a flash | about 2s |
| Win / lose banner | `debrief` | Header slides in. No dedicated cutscene | about 1s |

Rules, as for `launch`:
- **An animation is never load-bearing.** The resting CSS state is the correct final state.
- Photosensitivity: nothing flashes more than three times per second (WCAG 2.3.1). Prefer slow fades.
- Every cutscene has a **Skip** control, because a game that replays must not trap the player.
- Reduced motion: hold the final frame for the same duration, keep opacity fades, remove movement.

### 7.2 Sprites and scene art

| Asset | Source |
| --- | --- |
| Mars surface background | Chosen region's thumbnail (already imported in `landing-site`), or a CSS gradient fallback |
| Seven to nine module sprites | Inline SVG, one per module, shared sprite stylesheet in `base.css`, consistent colour per module |
| Astronaut figure | Existing `interior/sprite` strips or `floating.png`, placed by the habitat |
| Lander, dust puff | CSS shapes |
| Sky, sun, moon | CSS gradients driven by `data-phase` |
| Storm haze | CSS overlay |
| Supply pod and parachute | CSS or SVG |
| Five resource icons | Emoji or SVG |
| Power Surplus picture | Built in the DOM from live numbers |

Image budget (ISS-018 lesson): any new raster asset converts to WebP at about q82 and stays small. Prefer SVG and CSS so nothing is added to the bundle.

---

## 8. Files touched

**New**
- `src/sim/modules.ts`, `modules.test.ts`
- `src/sim/constants.ts`
- `src/sim/events.ts`, `events.test.ts`
- `src/sim/resources.test.ts`, `sol.test.ts`, `run.test.ts`
- `src/features/base/{model.test.ts, constants.ts?}`, `act/model.test.ts`, `debrief/model.test.ts`

**Rewritten (stubs → real)**
- `src/sim/resources.ts`, `sol.ts`, `run.ts`
- `src/features/base|act|debrief/{model.ts, view.ts, *.css}`

**Edited**
- `src/ui/registry.ts` (register three screens), `registry.test.ts`, `routes.test.ts`
- `src/features/landing-site/view.ts` (`commitLanding` → `landAt`)
- `index.html` (three new `<section>`s with data hooks)
- `scripts/check-markup.mjs` only if a new rule is needed (otherwise leave alone)

---

## 9. Work breakdown

IDs are proposed (next free is TASK-042). Parallelisable once TASK-042 lands.

| Task | Work | Depends on | Suggested owner |
| --- | --- | --- | --- |
| TASK-042 | Record D-030 to D-035 and ISS-040; fix task id hygiene | none | docs lead |
| TASK-015 | `sim/resources.ts`, `constants.ts`, tests | 042 | sim dev A |
| TASK-043 | `sim/modules.ts`, tests | 042 | sim dev A |
| TASK-044 | `sim/events.ts`, tests | 042 | sim dev B |
| TASK-016 | `sim/sol.ts` with ledger, tests | 015, 043, 044 | sim dev A |
| TASK-045 | `sim/run.ts` (`modules`, `ledger`, `landAt`) and landing-site hook-up | 043 | sim dev B |
| TASK-046 | Balance tests (section 5) and tuning | 016, 045 | sim dev A |
| TASK-029 | `base` screen | 043, 045 | UI dev C |
| TASK-030 | `act` screen | 016 | UI dev D |
| TASK-031 | `debrief` model + view | 016 | UI dev E |
| TASK-047 | Sprites, cutscenes, CSS animations, reduced-motion pass | 029, 030 | art/CSS dev F |
| TASK-048 | Registry, `index.html` sections, `registry.test.ts`/`routes.test.ts` updates | 029, 030, 031 | UI dev C |
| TASK-049 | Browser acceptance pass of the whole journey + `dist/` check | all | whole team |
| TASK-050 | Docs matrix: architecture, AGENTS §1 and §8, progress log, README status | all | docs lead |

**Critical path:** 042 → 015/043/044 → 016 → 030 → 049. The UI screens can be scaffolded against typed stubs while the sim lands, since the types already exist.

---

## 10. Order of work for a single developer

If one person does it:

1. D-030 to D-035, ISS-040.
2. `sim/modules.ts`, `constants.ts`, `events.ts` with tests.
3. `sim/resources.ts`, `sim/sol.ts`, `sim/run.ts` with tests, then the balance tests.
4. `base` (first thing the player sees after landing).
5. `act` (makes the loop playable).
6. `debrief` timeline, then attribution.
7. Register screens and update registry/routes tests.
8. Sprites and cutscenes, last, because the loop works without them.
9. Browser pass, `npm run build`, open `dist/`.

---

## 11. Cut list (in order)

If time runs out, cut from the top. **Keep the debrief timeline.**

1. Communication-delay event and comms dish
2. Rover
3. Solar-flare event and cutscene
4. Win panel (show a plain "you made it" line)
5. Module sprites (plain labelled boxes)
6. Storm haze and supply-pod animation (keep the event log text)
7. Region wiring beyond sun and water
8. Touchdown cutscene (cut to the base scene)

Never cut: turn-based loop, five stores, ledger, debrief timeline, the "approximate" label, reduced motion, keyboard operability.

---

## 12. Definition of done

- [ ] A player can go naming → debrief without a developer in the room (G-4)
- [ ] A losing run produces a debrief explaining the cause, never a bare "you failed"
- [ ] No violence, death or enemies anywhere (R-20)
- [ ] Baked-in events are labelled approximate on screen
- [ ] The five balance tests in section 5 pass
- [ ] `npm run check` and `npm test` pass; no test uses `Math.random` or the clock
- [ ] Reduced motion honoured on every new animation; nothing flashes
- [ ] Every new control works from the keyboard
- [ ] Real-browser pass done (no jsdom yet, ISS-013): every button clicked, back/forward does not leave two screens visible
- [ ] `npm run build` succeeds and `dist/` opens from the filesystem
- [ ] Docs matrix satisfied: decisions, tasks, issues, progress log, `architecture.md` file tree, AGENTS §1 and §8, `registry.test.ts`

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Freeze is today and the loop is the largest unstarted body of work | Decide freeze status first; follow the cut list |
| Balance is hard to get right without playtesting | Scripted balance tests, constants in one file |
| No DOM tests, so every view is checked by eye | Keep logic in `sim/` and `model.ts`; do a browser pass |
| The debrief gives a confident wrong explanation | Ledger-based attribution with an explicit `confident: false` path |
| Screens receive `run` only at mount time | Each screen keeps a local current-run variable and calls `setRun` before navigating |
| `ISS-008`/`ISS-009` unresolved | Baked-in events only (D-033). Do not build the DONKI client |
| Two screens visible at once | Keep sections outside `#landing`; rely on the `[hidden]` rule; run `check-markup` |
| Stub files read as implemented | Remove the STUB header from each file the moment it is real |

---

## 14. Open questions for the owner

1. Is the freeze extended for this work, or is it bug-fixes-only from today?
2. Is turn-based (D-030) confirmed?
3. Target length: 20 sols, or shorter for the demo (for example 12)?
4. Should starting food come from the player's answer on the ration check? It is a nice link, but `supply` does not currently write to `RunState`, so it is a stretch goal.
5. Is the communication-delay mechanic wanted, given the challenge brief names it?
