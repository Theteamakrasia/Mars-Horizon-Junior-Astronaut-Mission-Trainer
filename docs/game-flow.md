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
| `terminal` (blue) | A screen you can leave the loop from |

The run is turn-based: a sol advances only when the player presses the button. The only
timer in the whole game is the 10-second crisis countdown.

> GitHub renders Mermaid in the browser. If a diagram shows **"Unable to render rich
> display"**, reload the page: the renderer occasionally times out before it draws. The
> diagrams are kept small and few on purpose so this stays rare.

---

## 1. The journey, end to end

```mermaid
flowchart TD
    Naming["naming<br/>name your astronaut"]:::impl
    Briefing["briefing<br/>why we go + five resources"]:::impl
    Supply["supply<br/>RATION CHECK"]:::gate
    Launch["launch<br/>cinematic + tour"]:::impl
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
    classDef terminal fill:#dbe9ff,stroke:#2b5b9e,color:#10233d
```

The landing page still renders behind the journey, but it is no longer a stop: `naming` is the
main menu (D-021) and the default route. `landing` remains a valid deep link (`#/landing`),
and `nextStop('naming')` goes straight to `briefing`.

---

## 2. Every decision, in one table

| # | Decision | Screen | Trigger | Options | If the timer runs out | Stored in `RunState` | Debrief verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Astronaut name | `naming` | Start Mission | non-empty after trimming; 24 characters max; runs of whitespace collapse | cannot submit empty | `astronautName` | — |
| D2 | Ration packets | `supply` | answer the maths question | four numbers worked out from the question on screen: the answer, plus the three mistakes (forgot the crew, forgot the packet size, forgot both) | must be solved; CONTINUE stays hidden | not stored (the screen is a gate) | — |
| D3 | Landing region | `landing-site` | Land here | Arcadia · Jezero · Olympus · Valles · Argyre | cannot skip | `regionId` | — |
| D4 | Build loadout | `base` | Land &amp; start sol 1 | 8 module kinds, 14 build points, site rules and slot limits | allowed to launch with nothing extra | `modules` | — |
| D5 | Flare response | `act` | sol 3 and sol 10 | `shelter` · `shield-up` · `carry-on` | `carry-on`, `timedOut = true` | `decisions[]` | `solved` / `caught` |
| D6 | Dust-storm response | `act` | sol 7 | `retract` · `retract-save` · `expose` | `expose`, `timedOut = true` | `decisions[]` | `solved` / `mixed` / `caught` |
| D7 | Supply cargo | `act` | sol 5 | `food` · `water` · `spares` | `food`, `timedOut = true` | `decisions[]` | `mixed` (no special rule) |

D1–D4 are **pre-run gates**: they shape the starting state. D5–D7 are **in-run crises**: they
are recorded and replayed by the debrief.

### The event calendar never doubles up

The forecast is fixed, and **two events never happen back to back** (D-056). Each event
starts `MIN_CLEAR_SOLS` sols after the previous one has *ended*, so there is always at least
one quiet sol between any two of them:

| Sol | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Event | | | ☀ flare | | 📦 pod | | 🌪 storm | 🌪 storm | | ☀ flare | | |
| Crisis? | | | yes | | yes | | yes | | | yes | | |
| Activity | pick | pick | — | pick | — | pick | — | pick | pick | — | pick | pick |

The storm is the only event that lasts more than one sol, and the quiet sol on sol 9 is
what keeps it from running straight into the second flare. The sols are *worked out* from
the schedule in `sim/forecast.ts` rather than typed in, so adding a fifth event cannot land
it on top of another one. `forecastIsSpaced(forecast)` is exported so the rule can be
asserted, and `src/sim/forecast.test.ts` does exactly that.

The other eight sols are the player's: they pick an activity and the day is theirs.

---

## 3. Inside `act`: the sol loop

```mermaid
flowchart TD
    A["Press Run sol N"] --> P["Pick the day's activity<br/>(three offered, one chosen)"]
    P --> B{"pendingCrisis<br/>(run)?"}
    B -->|"yes"| C["Open the crisis panel<br/>nothing advances yet"]
    C --> D["decide() records the choice"]
    D --> E["advanceSol()"]
    B -->|"no"| E
    E --> E2["Apply the activity:<br/>power draw, store deltas,<br/>panel repair, science points"]
    E2 --> F["Power by day:<br/>solar + nuclear - load"]
    F --> G{"battery below 0?"}
    G -->|"yes"| H["unmet kWh; life support<br/>and greenhouse slow down"]
    G -->|"no"| I["full power"]
    H --> J["Crew and plants:<br/>oxygen, water, food, shielding"]
    I --> J
    J --> K{"a life store at 0?"}
    K -->|"yes"| L["status = lost"]
    K -->|"no"| M{"sol >= 12?"}
    M -->|"yes"| N["status = won"]
    M -->|"no"| A
    L --> O["debrief"]
    N --> O

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    classDef gate fill:#fff2c7,stroke:#a97a00,color:#3a2b00
    class A,P,C,D,E,E2,F,H,I,J,L,N,O impl
    class B,G,K,M gate
```

Order matters and is the model: **cargo arrives, the Sun comes up, the night drains the
batteries, and whatever power could not be found slows life support.** Power is deliberately
**not** a life store: a flat battery causes a blackout, and the blackout is what runs oxygen,
water and food down.

### 3a. The five science goals

Everything in the game is one of five things, and the game says so on every sol (D-058).
The rules live in `src/sim/goals.ts`; the act screen shows the five rows and the debrief
reports how each ended.

| Goal | What it is about | The rule that owns it | The player's decision |
| --- | --- | --- | --- |
| **Martian Dust Storm** | Dust cuts the sunlight reaching the solar panels and can affect the equipment | `stormOpacity`, `panelHealth` | Fold the panels away, or leave them out and lose a quarter of their output for good |
| **Life Support** | Keeping oxygen, water and a safe living environment | `oxygenGenerated`, `waterRecycling`, `electrolysisWater` | `air-check`, `recycle-tune`, `dig-ice`, `ice-store` |
| **Radiation Exposure** | Protecting the crew from harmful space radiation | `shieldingChange`, `FLARE_DRAIN` | `shelter`, `shield-up` or `carry-on`; and `stack-shielding`, `mend-suits` |
| **Power Shortage** | Keeping enough electricity for the systems that matter | `extraPowerCost`, the blackout | Every activity costs power, and so does every crisis choice |
| **Food Production** | Making sure the crew has food they can count on | `foodGrown`, `GREENHOUSE_FOOD` | `grow-extra`, and building a greenhouse at all |

Each goal carries a NASA fact filed under a topic of its own, so the dust goal never
shows the same fact as the power goal.

### 3b. The day's activity
Every sol has a main activity (D-051). On the eight calm sols `act` offers three and the
player picks one; on a crisis sol the crisis replaces the activity panel, so the crisis *is*
that day's activity. The catalogue and the twelve sol plans live in `src/sim/activities.ts`.

| Step | What happens |
| --- | --- |
| Offer | `offerFor(run, sol)` returns the three activities for that sol, each marked available or locked with the reason |
| Pick | the choice is kept on `RunState.chosenActivity`; the picked card is ticked and bordered |
| Apply | `advanceSol` adds the activity's kWh to `extraPowerCost`, its store deltas to the sol's net, and its repair to `panelHealth` |
| Score | the activity's science points are added to `RunState.science`, and the sol is recorded on `SolRecord.activity` |

The activity's power draw goes through the **same** `extraPowerCost` path as a flare's
shielding digger, so an activity competes with life support for the same kWh. Spend 25 kWh
on a rover survey with a flat battery and the sol runs in a blackout.

| Activity | Costs | Gives | Science | Locked when |
| --- | --- | --- | --- | --- |
| `rest` | — | — | 3 | never |
| `survey` | 25 kWh | — | 4 | never |
| `experiment` | 15 kWh | — | 6 | never |
| `map-site` | 14 kWh | — | 4 | never |
| `sample-rock` | 10 kWh | — | 4 | never |
| `sweep-panels` | 10 kWh | panel +0.25 | 2 | the panels are already clean |
| `grow-extra` | 8 kWh, 5% water | +6% food | 2 | no greenhouse |
| `dig-ice` | 20 kWh | +6% water | 3 | no ice miner |
| `recycle-tune` | 10 kWh | +3% water | 2 | never |
| `stack-shielding` | 18 kWh | +8% shielding | 3 | never |
| `mend-suits` | 8 kWh | +6% shielding | 2 | never |
| `air-check` | 12 kWh | +6% oxygen | 2 | never |

The best possible run — the best activity on each of the eight calm sols, plus the day
logs — scores 52.

### 3c. The science score

`RunState.science` totals the points; `src/sim/science.ts` turns the total into a rank.

| Points | Rank |
| --- | --- |
| 0-13 | Explorer |
| 14-27 | Field Scientist |
| 28-40 | Research Lead |
| 41-49 | Senior Scientist |
| 50+ | Chief Martian Scientist |

The bands are set by what a run can actually earn, so a player who chose nothing is still
an Explorer and the top rank is one good run away. **The rank measures the science, not the
outcome:** a run that did a great deal of science and then ran out of water still did the
science. The debrief keeps the two apart — the outcome section explains whether the crew
got home, the score section is about the work.

---

## 4. How a crisis is presented

| Fact | Value |
| --- | --- |
| Countdown | 10 seconds, flare and storm only; the supply pod has none |
| "Take your time" | Stops the countdown for that crisis |
| Timeout | The default option is applied and `timedOut = true` |
| Earth advice | Shown only if the reply arrives before the problem does |
| Comms delay | `oneWayMinutes(sol) = min(22, 6 + sol)`, so round trip is `2 x that` |

| Crisis | Window | Round trip | Can Earth answer? |
| --- | --- | --- | --- |
| Flare on sol 3 | 15 min | 18 min | **No** |
| Supply pod on sol 5 | 24 h | 22 min | Yes |
| Storm on sol 7 | 10 min | 26 min | **No** |
| Flare on sol 10 | 15 min | 32 min | **No** |

The fast, dangerous problems are the ones the crew must solve alone. The supply pod is the
one decision there is time to ask about.

---

## 5. The three crisis decisions

```mermaid
flowchart TD
    F["Solar flare — sols 3 and 10"] --> FB["Shielding damage: 6 / 12 / 20"]
    FB --> F1["Shelter: x0.4 → 2 / 5 / 8<br/>greenhouse paused"]
    FB --> F2["Extra soil: x0.6 → 4 / 7 / 12<br/>costs 60 kWh"]
    FB --> F3["Carry on: x1.0 → 6 / 12 / 20<br/>default on timeout"]

    S["Dust storm — sol 7, two sols"] --> S1["Fold panels:<br/>no solar for 2 sols"]
    S --> S2["Fold + pause greenhouse:<br/>saves 8 kW, no food"]
    S --> S3["Leave out: some power,<br/>panelHealth -25% for good<br/>default on timeout"]

    P["Supply pod — sol 5"] --> P1["+30 food"]
    P --> P2["+30 water"]
    P --> P3["+20 shielding<br/>panelHealth +0.2"]

    classDef impl fill:#d7f5dd,stroke:#2f7d4f,color:#12351f
    class F,FB,F1,F2,F3,S,S1,S2,S3,P,P1,P2,P3 impl
```

Flare intensity comes from the live flare class: `X = 3`, `M = 2`, `C or below = 1`.

Debrief rules:

- Flare: `shelter` and `shield-up` are `solved`; `carry-on` is `caught`.
- Storm: `retract-save` is `solved`; `retract` is `mixed`; `expose` is `caught`.
- Supply: no special rule, so all three stay `mixed`. Earth's advice is computed from
  days-of-food versus days-of-water, not scripted.

Storm strength depends on the site:
`stormOpacity(dust) = clamp(0.95 - 0.12 x dust, 0.2, 0.95)`. A dust score of 5 still blocks
35%; a dust score of 2 blocks 71%.

---

## 6. What the levers move

| Lever | Improves | Costs |
| --- | --- | --- |
| Solar array | 25 kW while the Sun is up, x site sun x panelHealth x storm factor | 2 points; dust storms cut it |
| Battery bank | 100 kWh of night storage | 2 points; only helps if the panels fill it |
| Nuclear unit | 10 kW day and night, weather-proof | 4 of the 14 build points |
| Greenhouse | 12 food per sol | 8 kW and 5 water per sol |
| Ice miner | water = 3 x site water score | 6 kW; needs a site with water >= 3 |
| Regolith shield | +30 starting shielding each | 2 points; needs terrain >= 2 |
| Life support | 14 oxygen, recycles 90% of water | 8 kW, plus water for electrolysis |
| Crisis choices | stores, panel health, or a paused greenhouse | power, food, water or shielding |

The coupling is the game: every module improves one line and loads another. A greenhouse grows
food but costs power and water; a nuclear unit is reliable but eats the build budget.

---

## 7. Run status

```mermaid
stateDiagram-v2
    [*] --> active: newRun / startOutpost
    active --> active: advanceSol, life stores above 0, sol below 12
    active --> won: reaches sol 12 with life stores above 0
    active --> lost: oxygen, water, food or shielding hits 0
    won --> [*]
    lost --> [*]
```

Both terminal states route to `debrief`. There is no third state, and losing never costs a
life (R-20).

---

## 8. The five landing regions

| Region | Water | Sun | Terrain | Dust | Temp | Total | Practical effect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Arcadia Planitia | 5 | 3 | 5 | 3 | 2 | 18 | Most room, most ice; coldest nights |
| Jezero Crater | 4 | 4 | 3 | 3 | 3 | 17 | Balanced, no standout |
| Olympus Mons | 2 | 5 | 2 | 4 | 3 | 16 | Best sun, least room, no ice miner |
| Valles Marineris | 4 | 3 | 2 | 4 | 3 | 16 | Storm-sheltered, cramped ground |
| Argyre Basin | 4 | 3 | 4 | 2 | 4 | 17 | Mildest, but dustiest storms |

Two site rules are hard gates on modules:

- **Ice miner** needs `water >= 3` (rules out Olympus Mons).
- **Regolith shield** needs `terrain >= 2`.

Build room is `terrain + 3` extra modules. Every site totals within 1 of 17/25, so there is
no perfect landing spot.

---

## 9. Implementation status

| Area | Status | Where the logic lives | Where the effect is applied |
| --- | --- | --- | --- |
| Name entry | Built | `features/naming/model.ts` | `sim/run.ts` (`astronautName`) |
| Ration gate | Built | `features/supply/model.ts` | view only; no run state |
| Region choice | Built | `sim/regions.ts` | `sim/run.ts` (`landAt`) |
| Module build | Built | `sim/modules.ts`, `features/base/model.ts` | `sim/run.ts` (`startOutpost`) |
| Daily activity | Built | `sim/activities.ts` | `sim/sol.ts` (`advanceSol`), `sim/run.ts` (`chosenActivity`) |
| Science score and rank | Built | `sim/science.ts` | `sim/run.ts` (`science`), `features/debrief/model.ts` |
| Flare crisis | Built | `sim/crises.ts` | `sim/sol.ts` (`FLARE_DRAIN`, factors) |
| Storm crisis | Built | `sim/crises.ts`, `sim/forecast.ts` | `sim/sol.ts` (`stormFactor`, panel damage) |
| Supply pod | Built | `sim/crises.ts`, `sim/forecast.ts` | `sim/sol.ts` (`SUPPLY_AMOUNT`, spares) |
| Earth advice | Built | `sim/crises.ts`, `sim/comms.ts` | view only |
| Live NASA daily pictures | Built | `data/nasaDaily.ts` | `features/act/view.ts`, `ui/nasaFeedCard.ts` |
| Debrief verdicts | Built | `features/debrief/model.ts` | read only |
| Save / resume | **Not built** | — | D-003: run is memory only |
| Login before `naming` | **Not built** | — | D-003, TASK-022 |
| Planning phase | **Not built** | — | D-029: do not add unasked |
| New forecast events | **Not built** | — | this file, §10 |

### The NASA layer

Two things in this game come from NASA, and they behave differently on purpose.

**Space weather.** The forecast's timetable is rolled per run (D-048) and the *size* of
each flare comes from live data: NASA DONKI first, then NOAA SWPC, then the long-run
record of real M and X flares when neither answers. `data/spaceweather.ts` is the only
place allowed to make that request.

**The daily picture.** Every sol also carries a real NASA picture and its written
explanation, read live from the Astronomy Picture of the Day, filtered to Mars
(D-053). `data/nasaDaily.ts` is the only place allowed to make *that* request.

The daily picture is an **enrichment layer on top of** a saved gallery of twelve checked
NASA cards, never a replacement. When NASA is busy, slow or offline, the saved card stays
on screen and the game says why. That is the same rule the space-weather chain follows,
and for the same reason: **the game is complete without a network**, and the player is
never shown a number or a picture whose source cannot be named.

Beside them, forty short NASA facts are filed under six topics — power, dust, water,
food, radiation and missions — and one topic per science goal. That is what lets the
act screen put the fact about water next to the activity that touches water, and the
fact about radiation next to the one that piles soil on the habitat.

---

## 10. Adding a new event

The forecast's timetable is rolled per run (D-048); adding a new event *kind* touches
six places, in this order. Nothing here needs a network call; only flare *size* is live.

| Step | File | What to add |
| --- | --- | --- |
| 1 | `src/sim/forecast.ts` | A `ForecastKind` member, a branch in `planEvents()` and a warning window in `WARNING_SOLS`, plus a builder in `createForecast()` |
| 2 | `src/sim/run.ts` | The `SolEvent['kind']` union member, so the timeline and debrief accept it |
| 3 | `src/sim/crises.ts` | A branch in `crisisForEvent()`: title, prompt, `urgent`, `countdownSeconds`, `windowMinutes`, `options`, `defaultOptionId`, `science` |
| 4 | `src/sim/sol.ts` | Read `chosen(run, event.id)` in the `eventsStartingOn` loop and change `net`, `panelHealth` or `greenhousePaused` |
| 5 | `src/features/debrief/model.ts` | A `crisis.kind === ...` verdict block in `reviewDecisions()` |
| 6 | tests + docs | Pin the option ids and store deltas; record the choice in `docs/team/decisions.md`, including the **Rejected** line |

Event patterns you can copy:

| Pattern | Copy from | Effect shape |
| --- | --- | --- |
| Timed choice that damages shielding | flare, `sim/sol.ts` | `shieldingChange -= base * factor` |
| Timed choice that trades power for safety | storm, `sim/sol.ts` | `stormFactor`, `greenhousePaused` |
| Untimed choice that adds stores | supply pod, `sim/sol.ts` | `foodChange += ...`, `waterChange += ...` |
| Choice that repairs hardware | supply spares | `panelHealth = min(1, panelHealth + 0.2)` |
| Choice that costs battery | flare `shield-up` | `extraPowerCost += 60` |

Planned ideas, none of them built:

| Idea | Kind | Decision it creates | Files it would touch | Cost |
| --- | --- | --- | --- | --- |
| Communications blackout | new | Spend power to retry, or wait a sol | `forecast.ts`, `crises.ts`, `sol.ts` | Small |
| Micrometeorite hit | new | Patch the hull now, or seal a room | `crises.ts`, `sol.ts` | Medium |
| Crew illness | new | Ration medicine, or isolate and lose a worker | `crises.ts`, `sol.ts` | Medium |
| Ice miner breakdown | reuse supply shape | Repair, or run on stored water | `forecast.ts`, `crises.ts` | Small |
| Second supply pod | reuse supply shape | Two cargo choices in one run | `forecast.ts` only | Very small |
| Warning-window solar storm | reuse flare + comms | Act now, or wait for a better forecast | `crises.ts`, `comms.ts` | Medium |

Before any of these: log it in `docs/team/tasks.md`, and record the design choice in
`docs/team/decisions.md`. A new event changes the balance, so update the acceptance tests too.

---

## 11. Adding a new activity

An activity is a choice inside a sol, not a forecast event (D-051). Adding one touches
four places, in this order.

| Step | File | What to add |
| --- | --- | --- |
| 1 | `src/sim/activities.ts` | An `ActivitySpec` in `ACTIVITY_CATALOGUE`: the cost, the gain, the science points, the topic, and any `requires` gate with its reason |
| 2 | `src/sim/activities.ts` | The activity's id in one sol plan's `activityIds`, if it should be offered that day |
| 3 | tests | Pin the catalogue's integrity: unique ids, a known topic, at least one available option on every sol, and the exact store deltas |
| 4 | docs | The activity in `docs/game-flow.md` §3a and in `docs/architecture.md`; record the choice in `docs/team/decisions.md` if it changes the rules |

The sim applies the activity already: `advanceSol` reads `RunState.chosenActivity` and
applies `powerCostKwh`, `storeDelta` and `panelRepair`. A new kind of effect needs a new
field on `ActivitySpec` and one more line in `sim/sol.ts`.

Keep the costs honest. An activity that gives more for less than another one on the same
sol makes the other one pointless — that is how `ice-store` was removed in favour of
`sample-rock`.

---

## 12. What is deliberately absent

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

## 13. Where to look next

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
