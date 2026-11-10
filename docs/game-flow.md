# Game flow and decision map

A single picture of **every decision the game asks the player**, what each answer changes,
and what is actually built. Use it to plan new events without breaking the loop.

Source of truth is the code. Where this file and the code disagree, the code wins — and this
file is wrong. The numbers below were read from `src/sim/` on 2026-11-10.

**Legend**

| Mark | Meaning |
| --- | --- |
| `impl` (green) | Built, wired into the journey, covered by tests |
| `gate` (amber) | A hard stop: the journey cannot continue until this is satisfied |
| `planned` (grey, dashed) | Wanted, **not built** — do not assume it works |
| `terminal` (blue) | A screen you can leave the loop from |

The run is turn-based: a sol advances only when the player presses the button. The only
timer in the whole game is the 10-second crisis countdown.

---

## 1. The journey, end to end

```mermaid
flowchart TD
    Naming["naming<br/>name your astronaut"]:::impl
    Briefing["briefing<br/>why we go + the five resources"]:::impl
    Supply["supply<br/>RATION CHECK<br/>2 months x 4 crew x 3 days per packet"]:::gate
    Launch["launch<br/>cinematic + spacecraft tour"]:::impl
    Interior["interior<br/>visit all six rooms"]:::gate
    Site["landing-site<br/>pick 1 of 5 regions"]:::gate
    Base["base<br/>spend 14 build points"]:::gate
    Act["act<br/>run one sol at a time"]:::impl
    Pending{"event due<br/>on sol + 1?"}:::impl
    Crisis["crisis panel<br/>one of three decisions"]:::gate
    Debrief["debrief<br/>verdict for every choice"]:::terminal

    Naming -->|"Start Mission"| Briefing
    Briefing -->|"YES, or auto after the last beat"| Supply
    Supply -->|"correct answer reveals CONTINUE"| Launch
    Launch -->|"film ends"| Interior
    Interior -->|"every room visited"| Site
    Site -->|"select a pin + Land here"| Base
    Base -->|"Land &amp; start sol 1"| Act
    Act --> Pending
    Pending -->|"yes, not yet decided"| Crisis
    Crisis -->|"option chosen, or countdown reaches 0"| Act
    Pending -->|"no"| Act
    Act -->|"status is won or lost"| Debrief
    Debrief -->|"Try a different outpost"| Site
    Debrief -->|"Main menu"| Naming

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    classDef planned fill:#eeeeee,stroke:#999999,color:#444444,stroke-dasharray:4 3
    classDef terminal fill:#dbe9ff,stroke:#2b5b9e,color:#10233d
```

The landing page still renders behind the journey, but it is no longer a stop: `naming` is the
main menu (D-021) and the default route. `landing` remains a valid deep link (`#/landing`), and
`nextStop('naming')` goes straight to `briefing`; the under-construction interstitial is only
inserted for a route that has no screen registered.

---

## 2. Every decision, in one table

| # | Decision | Screen | Trigger | Options | If the timer runs out | Stored in `RunState` | Debrief verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Astronaut name | `naming` | Start Mission | non-empty after trimming; 24 characters max; runs of whitespace collapse | cannot submit empty | `astronautName` | — |
| D2 | Ration packets | `supply` | answer the maths question | 20 · **80** · 240 · 720 | must be solved; CONTINUE stays hidden | not stored (the screen is a gate) | — |
| D3 | Landing region | `landing-site` | Land here | Arcadia · Jezero · Olympus · Valles · Argyre | cannot skip | `regionId` | — |
| D4 | Build loadout | `base` | Land &amp; start sol 1 | 8 module kinds, 14 build points, site rules and slot limits | allowed to launch with nothing extra | `modules` | — |
| D5 | Flare response | `act` | sol 3 and sol 10 | `shelter` · `shield-up` · `carry-on` | `carry-on`, `timedOut = true` | `decisions[]` | `solved` / `caught` |
| D6 | Dust-storm response | `act` | sol 7 | `retract` · `retract-save` · `expose` | `expose`, `timedOut = true` | `decisions[]` | `solved` / `mixed` / `caught` |
| D7 | Supply cargo | `act` | sol 5 | `food` · `water` · `spares` | `food`, `timedOut = true` | `decisions[]` | `mixed` (no special rule) |

D1–D4 are **pre-run gates**: they shape the starting state. D5–D7 are **in-run crises**: they
are recorded and replayed by the debrief.

---

## 3. Inside `act`: the sol loop

```mermaid
flowchart TD
    A["Press Run sol N"] --> B{"pendingCrisis(run)?"}
    B -->|"yes"| C["Open the crisis panel<br/>nothing advances yet"]
    C --> D["decide(): record the option in decisions[]"]
    D --> E["advanceSol()"]
    B -->|"no"| E
    E --> F["1. Apply this sol's event choices"]
    F --> G["2. Storm factor from the site's dust score"]
    G --> H["3. Power by day<br/>solar + half the nuclear - load"]
    H --> I{"battery below 0?"}
    I -->|"yes"| J["unmet kWh recorded, level = 0"]
    I -->|"no"| K["cap at battery capacity"]
    J --> L["4. Power by night<br/>half the nuclear - night load"]
    K --> L
    L --> M["blackout = unmet / demand<br/>powered = 1 - blackout"]
    M --> N["5. Crew and plants<br/>oxygen, water, food, shielding"]
    N --> O["6. Clamp every store to its tank"]
    O --> P{"a life store at 0?"}
    P -->|"yes"| Q["status = lost"]
    P -->|"no"| R{"sol >= 12?"}
    R -->|"yes"| S["status = won"]
    R -->|"no"| T["status = active"]
    Q --> U["navigate to debrief"]
    S --> U
    T --> V["act re-renders"]
    V --> A

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class A,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,V impl
    class B gate
```

Order matters and is the model: **cargo arrives, the Sun comes up, the night drains the
batteries, and whatever power could not be found slows life support.** Everything else
follows from how much of the sol the lights stayed on.

Power is deliberately **not** a life store. A flat battery is not a loss; it causes a
blackout, and the blackout is what runs oxygen, water and food down.

---

## 4. How a crisis is presented and recorded

```mermaid
flowchart TD
    S["Forecast event on sol + 1"] --> U{"urgent?"}
    U -->|"flare or storm"| Clock["10 s countdown<br/>Take your time can stop it"]
    U -->|"supply pod"| NoClock["No countdown"]
    Clock --> Ask{"Ask Mission Control?"}
    NoClock --> Ask
    Ask -->|"reply arrives in time"| Advice["Earth recommends one option<br/>but does not press the button"]
    Ask -->|"reply too late"| Alone["Only the delay is shown<br/>the crew decides alone"]
    Advice --> Pick["Player chooses an option"]
    Alone --> Pick
    Clock -->|"countdown reaches 0"| Default["Default option applied<br/>timedOut = true"]
    NoClock --> Pick
    Default --> Record["decide()<br/>DecisionRecord { sol, crisisId, optionId, timedOut }"]
    Pick --> Record
    Record --> Resolve["advanceSol() applies the effect"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class S,Clock,NoClock,Ask,Advice,Alone,Pick,Default,Record,Resolve impl
    class U gate
```

The comms delay makes the "ask Earth" button honest: `oneWayMinutes(sol) = min(22, 6 + sol)`,
so the round trip is `2 x that`.

| Crisis | Window | Round trip | Can Earth answer? |
| --- | --- | --- | --- |
| Flare on sol 3 | 15 min | 18 min | **No** |
| Supply pod on sol 5 | 24 h | 22 min | Yes |
| Storm on sol 7 | 10 min | 26 min | **No** |
| Flare on sol 10 | 15 min | 32 min | **No** |

That asymmetry is intentional: the fast, dangerous problems are the ones you must solve
yourself.

---

## 5. The three crisis decision trees

### 5.1 Solar flare — sol 3 and sol 10

```mermaid
flowchart TD
    E["Solar flare<br/>intensity from the live flare class<br/>X = 3, M = 2, C or below = 1"] --> Base["Shielding damage before your choice<br/>6 / 12 / 20 points"]
    Base --> Shelter["Shelter in the storm room<br/>x0.4 -> 2 / 5 / 8 points<br/>greenhouse paused this sol"]
    Base --> ShieldUp["Pile on extra soil<br/>x0.6 -> 4 / 7 / 12 points<br/>costs 60 kWh"]
    Base --> Carry["Carry on working<br/>x1.0 -> 6 / 12 / 20 points<br/>default on timeout"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class E,Base,Shelter,ShieldUp,Carry impl
```

Debrief: `shelter` and `shield-up` are `solved`; `carry-on` is `caught`.

### 5.2 Dust storm — sol 7, two sols long

```mermaid
flowchart TD
    S["Dust storm arrives on sol 7<br/>lasts sols 7 and 8"] --> O{"Panel decision"}
    O --> R["Fold the panels away<br/>no solar power for 2 sols<br/>greenhouse keeps running"]
    O --> RS["Fold and pause the greenhouse<br/>no solar, saves 8 kW<br/>no food grows"]
    O --> Ex["Leave the panels out<br/>some power still comes in<br/>panelHealth -25%, permanent, floor 25%<br/>default on timeout"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class S,R,RS,Ex impl
    class O gate
```

Debrief: `retract-save` is `solved`, `retract` is `mixed`, `expose` is `caught`.

Storm strength is site-dependent: `stormOpacity(dust) = clamp(0.95 - 0.12 x dust, 0.2, 0.95)`.
A dust score of 5 still blocks 35%; a dust score of 2 blocks 71%.

### 5.3 Supply pod — sol 5

```mermaid
flowchart TD
    P["Supply pod lands on sol 5<br/>unpack exactly one kind"] --> F["Food<br/>+30 food"]
    P --> W["Water<br/>+30 water"]
    P --> Sp["Spare parts<br/>+20 shielding<br/>panelHealth +0.2, capped at 1.0"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class P,F,W,Sp impl
```

Debrief rules do not single out any supply option, so all three stay `mixed`. Mission
Control's advice is computed, not scripted: it compares days-of-food against days-of-water
and recommends whichever runs out first; if both hold, it recommends spares.

---

## 6. What the decisions actually move

```mermaid
flowchart LR
    Solar["Solar arrays<br/>25 kW each x site sun<br/>x panelHealth x stormFactor"] --> Power["power"]
    Nuke["Nuclear unit<br/>10 kW day and night"] --> Power
    Banks["Battery banks<br/>100 kWh each"] --> Power
    Load["Load<br/>habitat 4 + life support 8<br/>+ greenhouse 8 + ice miner 6<br/>+ heating (5 - temp) kW"] --> Power
    Power --> Blackout{"blackout?"}
    Blackout -->|"yes"| Slow["life support, recycling,<br/>greenhouse, ice miner slow down"]
    Blackout -->|"no"| Full["everything at full power"]
    Slow --> O2["oxygen"]
    Full --> O2
    Slow --> H2O["water"]
    Full --> H2O
    Life["life support<br/>generates 14 O2, recycles 90% water"] --> O2
    Life --> H2O
    Ice["ice miner<br/>3 x site water points"] --> H2O
    Green["greenhouse<br/>12 food, 5 water per sol"] --> Food["food"]
    Green --> H2O
    Crew["4 crew every sol<br/>3.5 O2, 2 water, 2.5 food each"] --> O2
    Crew --> H2O
    Crew --> Food
    Crises["crisis choices"] --> Food
    Crises --> H2O
    Crises --> Shield["shielding"]
    Erosion["1 point of erosion per sol"] --> Shield
    Regolith["regolith shields +30 each"] --> Shield
    O2 --> Ends{"any life store at 0?"}
    H2O --> Ends
    Food --> Ends
    Shield --> Ends
    Ends -->|"yes"| Lost["run lost"]
    Ends -->|"no"| Alive["run continues"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    classDef bad fill:#ffe0e0,stroke:#a33,color:#3a0000
    class Solar,Nuke,Banks,Load,Power,Life,Ice,Green,Crew,Crises,Erosion,Regolith,O2,H2O,Food,Shield,Alive impl
    class Blackout,Slow,Full,Ends gate
    class Lost bad
```

The coupling is the game: every module improves one line and loads another. A greenhouse
grows 12 food but costs 8 kW and 5 water; a nuclear unit adds 10 kW around the clock but
costs 4 of the 14 build points.

---

## 7. Run status

```mermaid
stateDiagram-v2
    [*] --> active: newRun / startOutpost
    active --> active: advanceSol, life stores above 0, sol below 12
    active --> won: advanceSol reaches sol 12 with life stores above 0
    active --> lost: advanceSol leaves oxygen, water, food or shielding at or below 0
    won --> [*]
    lost --> [*]
```

Both terminal states route to `debrief`. There is no third state, and losing never costs a
life (R-20).

---

## 8. The five landing regions and what they change

| Region | Water | Sun | Terrain | Dust | Temp | Total | Practical effect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Arcadia Planitia | 5 | 3 | 5 | 3 | 2 | 18 | Most room, most ice; coldest nights |
| Jezero Crater | 4 | 4 | 3 | 3 | 3 | 17 | Balanced, no standout |
| Olympus Mons | 2 | 5 | 2 | 4 | 3 | 16 | Best sun, least room, no ice miner |
| Valles Marineris | 4 | 3 | 2 | 4 | 3 | 16 | Storm-sheltered, cramped ground |
| Argyre Basin | 4 | 3 | 4 | 2 | 4 | 17 | Mildest, but dustiest storms |

Two site rules are hard gates on modules:

- **Ice miner** needs `water >= 3` (rules out Olympus Mons).
- **Regolith shield** needs `terrain >= 2` (rules out... nothing today, but the check exists).

Build room is `terrain + 3` extra modules. Every site totals within 1 of 17/25, so there is
no perfect landing spot.

---

## 9. Implementation status

Everything in the journey is built. The table lists the decision surface and where its
effect lives, so a new event can copy an existing pattern.

| Area | Status | Where the logic lives | Where the effect is applied |
| --- | --- | --- | --- |
| Name entry | Built | `features/naming/model.ts` | `sim/run.ts` (`astronautName`) |
| Ration gate | Built | `features/supply/model.ts` | view only; no run state |
| Region choice | Built | `sim/regions.ts` | `sim/run.ts` (`landAt`) |
| Module build | Built | `sim/modules.ts`, `features/base/model.ts` | `sim/run.ts` (`startOutpost`) |
| Flare crisis | Built | `sim/crises.ts` | `sim/sol.ts` (`FLARE_DRAIN`, factors) |
| Storm crisis | Built | `sim/crises.ts`, `sim/forecast.ts` | `sim/sol.ts` (`stormFactor`, panel damage) |
| Supply pod | Built | `sim/crises.ts`, `sim/forecast.ts` | `sim/sol.ts` (`SUPPLY_AMOUNT`, spares) |
| Earth advice | Built | `sim/crises.ts`, `sim/comms.ts` | view only |
| Debrief verdicts | Built | `features/debrief/model.ts` | read only |
| Save / resume | **Not built** | — | D-003: run is memory only |
| Login before `naming` | **Not built** | — | D-003, TASK-022 |
| Planning phase | **Not built** | — | D-029: do not add unasked |
| New forecast events | **Not built** | — | this file, §10 |

---

## 10. Adding a new event

The forecast is fixed and authored. Adding an event touches five places, in this order.
Nothing here needs a network call; only flare *size* is live.

### 10.1 The checklist

```mermaid
flowchart TD
    A["1. sim/forecast.ts<br/>add the kind, its sol, its summary"] --> B["2. sim/run.ts<br/>widen the SolEvent kind union if it is new"]
    B --> C["3. sim/crises.ts<br/>crisisForEvent() branch<br/>options, default, countdown"]
    C --> D["4. sim/sol.ts<br/>apply the effect inside advanceSol()"]
    D --> E["5. features/debrief/model.ts<br/>verdict rule for the choice"]
    E --> F["6. tests<br/>sim/*.test.ts + features/*/model.test.ts"]
    F --> G["7. docs/team/decisions.md<br/>record the choice and the rejected alternative"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef planned fill:#eeeeee,stroke:#999999,color:#444444,stroke-dasharray:4 3
    class A,B,C,D,E,F,G impl
```

### 10.2 The touchpoints, concretely

| Step | File | What to add |
| --- | --- | --- |
| 1 | `src/sim/forecast.ts` | A `ForecastKind` member, a `*_SOL` constant, one entry in `createForecast()` |
| 2 | `src/sim/run.ts` | The `SolEvent['kind']` union member, so the timeline and debrief accept it |
| 3 | `src/sim/crises.ts` | A branch in `crisisForEvent()` returning title, prompt, `urgent`, `countdownSeconds`, `windowMinutes`, `options`, `defaultOptionId`, `science` |
| 4 | `src/sim/sol.ts` | Read `chosen(run, event.id)` in the `eventsStartingOn` loop and change `net` / `panelHealth` / `greenhousePaused` |
| 5 | `src/features/debrief/model.ts` | A `crisis.kind === ...` verdict block in `reviewDecisions()` |
| 6 | tests | Pin the option ids and the exact store deltas; never depend on `Math.random()` |
| 7 | `docs/team/decisions.md` | Newest first, including the **Rejected** line |

### 10.3 Event patterns you can copy

| Pattern | Copy from | Effect shape |
| --- | --- | --- |
| Timed choice that damages shielding | flare, `sim/sol.ts` | `shieldingChange -= base * factor` |
| Timed choice that trades power for safety | storm, `sim/sol.ts` | `stormFactor`, `greenhousePaused` |
| Untimed choice that adds stores | supply pod, `sim/sol.ts` | `foodChange += ...`, `waterChange += ...` |
| Choice that repairs hardware | supply spares | `panelHealth = min(1, panelHealth + 0.2)` |
| Choice that costs battery | flare `shield-up` | `extraPowerCost += 60` |

### 10.4 Planned event ideas (not built)

These are sketches, not commitments. None of them is in the code.

| Idea | Kind | Decision it creates | Files it would touch | Cost of building |
| --- | --- | --- | --- | --- |
| Communications blackout | new | Spend power to retry, or wait a sol | `forecast.ts`, `crises.ts`, `sol.ts` | Small: a store cost and a one-sol delay |
| Micrometeorite hit | new | Patch the hull now, or seal the room and lose space | `crises.ts`, `sol.ts` | Medium: needs a new outpost state |
| Crew illness | new | Ration medicine, or isolate and lose a worker | `crises.ts`, `sol.ts` | Medium: crew count is currently a constant |
| Ice miner breakdown | reuse `supply-pod` shape | Repair, or run on stored water | `forecast.ts`, `crises.ts` | Small: same option/cost pattern |
| Second supply pod | reuse `supply-pod` | Two cargo choices in one run | `forecast.ts` only | Very small: add a second entry |
| Solar storm with a warning window | reuse `flare` + comms | Act now, or wait for a better forecast | `crises.ts`, `comms.ts` | Medium: needs a delayed resolution |

Before any of these: log it in `docs/team/issues.md` or `docs/team/tasks.md`, and record the
design choice in `docs/team/decisions.md`. A new event changes the balance, so update the
acceptance tests too.

---

## 11. What is deliberately absent

| Thing | Why | Where it is recorded |
| --- | --- | --- |
| A planning phase | The loop is turn-based on purpose | D-029 |
| Save / resume | No persistence; Supabase deferred | D-003 |
| Login before `naming` | Same deferral | D-003, TASK-022 |
| Persisting the astronaut name | A deliberate decision, not a convenience | D-003 |
| Multiplayer, leaderboards, telemetry | No backend | AGENTS.md §10 |
| Runtime dependencies | Zero today; adding one is an architecture change | AGENTS.md §10 |

If a new event needs any of these, stop and get the decision recorded first.

---

## 12. Where to look next

| Question | File |
| --- | --- |
| Every tuning number | `src/sim/modules.ts` |
| Event schedule and flare intensity | `src/sim/forecast.ts` |
| Crisis copy, options, defaults, Earth advice | `src/sim/crises.ts` |
| Sol resolution order | `src/sim/sol.ts` |
| Run state shape | `src/sim/run.ts` |
| Region trade-offs | `src/sim/regions.ts` |
| Why a decision was scored the way it was | `src/features/debrief/model.ts` |
| Architecture and module contracts | `docs/architecture.md` |
| Decisions and rejected alternatives | `docs/team/decisions.md` |
