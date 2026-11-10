# Game plan update — activities, science score and NASA facts

**Written:** 2026-11-10 · **Branch:** `feat/daily-activities` · **Status:** shipped
**Decisions:** D-049 … D-053 · **Issues:** ISS-047 … ISS-050 · **Tasks:** TASK-066 … TASK-074

> **What actually shipped** is in §8 at the bottom. The plan below is the plan as it was
> written, so the difference between the two is visible rather than buried.

---

## 1. Why this work exists

`act` gives the player a decision on **4 of its 12 sols** — the crisis sols
(3, 5, 7, 10). The other eight are *read five numbers, press "Run sol N"*.

Three things make that feel like a science class rather than a game:

| Problem | Today | Fix |
| --- | --- | --- |
| No agency on most days | 8 of 12 sols are a single button press | a **main activity** every sol, each with a real cost |
| Nothing to be good at | the only outcome is survived / lost | **science points and a rank** |
| One NASA beat per sol, static | `data/nasaGallery.ts` holds 12 fixed cards | a **live NASA daily feed** plus ~40 tagged static facts |

The `MISSIONS` array in `features/act/model.ts` is the clearest symptom: ten
headlines with **zero** effect on the simulation, and misaligned with the
forecast (sol 8 reads "Mission 7: First Harvest" while the dust storm is on
sol 7). This plan replaces it with something real.

---

## 2. The main activity, every sol

### Where it lives

Inside `act`. The rules live in a new pure module `src/sim/activities.ts`; the
choice lives on `RunState`; `sim/sol.ts` applies it.

```
act  →  three activity cards  →  player picks one  →  "Run sol N"
     →  advanceSol applies the activity  →  recap says what the crew did
```

**On a crisis sol the crisis *is* the activity.** It replaces the panel exactly
as D-040 already describes. Every one of the twelve sols therefore has a
decision.

### The catalogue

Twelve activities. Points are the science score (D-050). Costs are applied to
the sol: `powerCostKwh` joins the existing `extraPowerCost` path, so **an
activity can cause a blackout** — spend 25 kWh on a rover survey with a flat
battery and life support slows down. That is the existing sim model, not new
machinery.

| id | Title | Costs | Gains | Points | Topic | Locked when |
| --- | --- | --- | --- | --- | --- | --- |
| `rest` | Rest and watch the sunset | — | — | 3 | missions | never (the free option) |
| `survey` | Send the rover out to survey | 25 kWh | — | 4 | missions | never |
| `experiment` | Run a science experiment | 15 kWh | — | 6 | missions | never |
| `map-site` | Map the ground around the outpost | 14 kWh | — | 4 | missions | never |
| `sweep-panels` | Clean the solar panels | 10 kWh | panel +0.25 | 2 | power | panels already clean |
| `grow-extra` | Grow an extra crop | 8 kWh, 5% water | +8% food | 2 | food | no greenhouse |
| `dig-ice` | Dig for water ice | 20 kWh | +8% water | 3 | water | no ice miner |
| `ice-store` | Store water ice for later | 12 kWh, 6% water | +10% water | 1 | water | no ice miner |
| `recycle-tune` | Tune the water recycler | 10 kWh | +5% water | 2 | water | never |
| `stack-shielding` | Pile soil on the habitat | 18 kWh | +10% shielding | 3 | radiation | never |
| `mend-suits` | Mend the spacesuits | 8 kWh | +8% shielding | 2 | radiation | never |
| `air-check` | Test the airlock and the suits | 12 kWh | +6% oxygen | 2 | missions | never |

### The twelve sol plans

`SOL_PLANS` replaces the cosmetic `MISSIONS` array (D-052).

| Sol | Headline | Activities |
| --- | --- | --- |
| 1 | Land and make camp | `rest` · `sweep-panels` · `experiment` |
| 2 | Read the ground | `survey` · `map-site` · `rest` |
| 3 | **First solar flare** | ⚡ crisis |
| 4 | First spacewalk | `air-check` · `mend-suits` · `experiment` |
| 5 | **The supply pod** | 📦 crisis |
| 6 | Make water from ice | `dig-ice` · `recycle-tune` · `experiment` |
| 7 | **The dust storm** | 🌪 crisis |
| 8 | Repair and grow | `sweep-panels` · `grow-extra` · `rest` |
| 9 | Water and power | `recycle-tune` · `sweep-panels` · `map-site` |
| 10 | **The second flare** | ⚡ crisis |
| 11 | Grow and test | `grow-extra` · `air-check` · `experiment` |
| 12 | The last push | `survey` · `dig-ice` · `map-site` |

Every sol has at least one unlocked option — `rest` is free and never locked.
Sol 8's `sweep-panels` unlocks only if the player left the panels out in the
sol-7 storm, which links two decisions the player made earlier.

---

## 3. Science points and rank

New pure module `src/sim/science.ts`.

| Points | Rank | Icon |
| --- | --- | --- |
| 0–7 | Explorer | 🌱 |
| 8–15 | Field Scientist | 🔬 |
| 16–23 | Research Lead | 🧪 |
| 24–31 | Senior Scientist | 🛰️ |
| 32+ | Chief Martian Scientist | 🏅 |

The best pick on each of the eight activity sols is 39 points, so the top rank
is reachable but takes good choices. A player who never picks an activity
stays at 0 and stays an Explorer.

**New `RunState` fields:** `science: number`, `chosenActivity: string | null`.
**New `SolRecord` field:** `activity: { id; title; science } | null`.

`projectSol` keeps the pending activity, so the base preview and Mission
Control's advice stay honest about what the player chose.

**Where the score shows:** the `act` panel kicker (`Sol 4 of 12 · 11 points ·
Field Scientist`), a three-card row for points / rank / progress to the next
rank, and a "Mars Science Score" callout in the debrief with a per-activity
breakdown.

---

## 4. The NASA fact layer

### Static — the guaranteed layer

`data/nasaGallery.ts` gains a `topic` on every fact, grows `FACTS` from 15 to
about 40, and gains `factForTopic(topic, seed)`. Each activity shows a fact
about its own system.

The topic type lives in a new tiny pure module `src/sim/topics.ts`, because
`sim/` is the only layer every other layer may import (R-1, R-2).

### Live — the enrichment layer

New `src/data/nasaDaily.ts`, built on the pattern D-037 already established for
space weather: **NASA → curated fallback**, with the source always reported.

- Endpoint: `api.nasa.gov/planetary/apod?search=Mars&thumbs=true&api_key=…`
- One request per session (memoised like `data/spaceweather.ts`), 4 s timeout,
  `fetchFn` injected in tests
- Falls through to the curated gallery and says so
- Reuses `VITE_NASA_API_KEY` — no new key, no new env var, no ISS-006 change

New `src/dom/dailyFactLoader.ts` joins `data/` and `sim/`, mirroring
`dom/forecastLoader.ts`, because `act` and `debrief` both want the feed and
R-5 stops them importing each other.

**UI:** a "NASA's daily feed" strip in `act` — one live APOD per sol, with the
picture, the title, two sentences, the date and the credit. When the feed is
empty the curated card appears instead, with an honest line saying NASA's
picture service is busy.

---

## 5. Decisions

| id | Choice |
| --- | --- |
| **D-049** | Every sol has a main activity: three offered, one chosen, cost and gain applied by `advanceSol`. On a crisis sol the crisis is the activity. |
| **D-050** | Activities award science points; `RunState.science` totals them; the debrief shows a score and a rank. |
| **D-051** | A live NASA APOD layer **on top of** the curated gallery, never replacing it, falling back and labelled. |
| **D-052** | The cosmetic `MISSIONS` array becomes `SOL_PLANS` in `sim/activities.ts` — twelve real headlines aligned with the baked crisis sols. |
| **D-053** | **Post-freeze scope exception.** The Nov 8 freeze allowed only bug fixes; this is new gameplay, taken as an explicit recorded exception so the demo has a game in it. |

The full entries, with the **Rejected** lines the repo requires, live in
`docs/team/decisions.md`.

---

## 6. Commit sequence

Branch `feat/daily-activities`. One commit per step, `type(scope): message`,
`npm run check` and `npm test` green at each one.

| # | Commit | Touches |
| --- | --- | --- |
| 1 | `docs(team): record the activity loop, science score and NASA fact layer` | decisions, issues, tasks |
| 2 | `feat(sim): add the activity catalogue and the twelve sol plans` | **new** `sim/activities.ts`, **new** `sim/topics.ts` |
| 3 | `feat(sim): score science points and apply the chosen activity` | **new** `sim/science.ts`, `sim/run.ts`, `sim/sol.ts` |
| 4 | `feat(act): offer the daily activity and show the science score` | `act/model.ts`, `act/view.ts`, `act/act.css` |
| 5 | `feat(nasa): fetch the live NASA daily facts and tag the static ones` | **new** `data/nasaDaily.ts`, `data/nasaGallery.ts`, **new** `dom/dailyFactLoader.ts` |
| 6 | `feat(act): show NASA's daily picture and fact` | `act/view.ts`, `act/act.css` |
| 7 | `feat(debrief): add the science report and the rank` | `debrief/model.ts`, `debrief/view.ts` |
| 8 | `docs(architecture): update the tree, the contracts and the game flow` | `architecture.md`, `game-flow.md`, `AGENTS.md`, `README.md`, `progress-log.md` |
| 9 | `test(sim): cover the run state and the activity round trip` | **new** `sim/run.test.ts` |

---

## 7. Risks

1. **`DEMO_KEY` is throttled.** APOD returned `429` twice while this plan was
   being written — ISS-009 is live. The static layer is the guarantee; the
   live layer is enrichment. Register a personal key before the demo
   (TASK-008, `.env.example` already exists).
2. **Balance will shift.** Some of the 32 `sim/sol.test.ts` assertions may need
   updating. That is expected and will be recorded in the commit, not quietly
   rewritten.
3. **Stale docs.** `docs/architecture.md` has about seven stale contract rows,
   and `sim/run.ts`, `sim/forecast.ts`, `sim/crises.ts` and `sim/comms.ts` have
   no test files at all. Both pre-date this work; ISS-053 and ISS-050 record
   them and this pass fixes the rows it touches.
4. **The Mars rover photos idea is parked.** NASA's Mars Photos API did not
   answer from this machine. It is the single most striking possible feature
   and is worth retrying with a personal key after the demo.
5. **Cut for now:** badges/milestones, research levels, crew morale. All three
   are cheap to add on top of the score once it exists.

---

## 8. What shipped

Everything in the plan landed, with three changes made along the way.

| # | Commit | What |
| --- | --- | --- |
| 1 | `docs(team): record the activity loop, science score and NASA fact layer` | D-049 … D-053, ISS-047 … ISS-050, TASK-066 … TASK-074 |
| 2 | `feat(sim): add the activity catalogue and the twelve sol plans` | `sim/activities.ts`, `sim/topics.ts` |
| 3 | `feat(sim): score science points and apply the chosen activity` | `sim/science.ts`, `RunState.science` and `chosenActivity`, `advanceSol` |
| 4 | `fix(sim): replace the weak ice activity and let growing food cost water` | `ice-store` → `sample-rock`; `grow-extra` now costs water |
| 5 | `feat(act): offer the daily activity and show the science score` | the three activity cards, the science card, `MISSIONS` retired |
| 6 | `feat(nasa): fetch the live NASA daily facts and tag the static ones` | `data/nasaDaily.ts`, `dom/dailyFactLoader.ts`, forty tagged facts |
| 7 | `feat(act): show NASA's daily picture and fact` | `ui/nasaFeedCard.ts`, the live picture on every sol |
| 8 | `feat(debrief): add the science report and the rank` | the score, the rank and every activity the crew chose |
| 9 | `docs(architecture): update the tree, the contracts and the game flow` | architecture, game flow, AGENTS, README, the team records |
| 10 | `fix(sim): guarantee the forecast never puts two events back to back` | the event sols are worked out from a schedule, with a quiet sol between every pair (D-054) |
| 11 | `feat(supply): make the ration question change every run` | the mission length, the answer and the button order all vary now (D-055) |
| 12 | `test(sim): guard the balance after the activity loop` | `sim/balance.test.ts` and the crisis rule made explicit in the sim |
| 13 | `feat(sim): name the five science goals and read their state` | `sim/goals.ts`; the five goals and their live state |
| 14 | `feat(act): show the five science goals on every sol` | the five rows on the act panel, each with its own NASA fact |
| 15 | `feat(debrief): report how each science goal fared` | the run read back as science rather than as numbers |

**The three changes from the plan as written:**

1. **`ice-store` became `sample-rock`.** It gave more water for less power than
   `dig-ice` and earned fewer points, so on sol 5 it made `dig-ice` pointless. It
   is its own commit, not a quiet rewrite.
2. **`grow-extra` now costs 5% water** as well as power. The plan said it would;
   the first version of the catalogue had it as a gain only, and the trade-off
   was the point.
3. **The rank bands moved.** The plan's bands put a run that chose nothing at
   "Field Scientist", because twelve day-log points were enough to clear the
   first rung. The bands are now set by what a run can actually earn: 0-13
   Explorer, 14-27 Field Scientist, 28-40 Research Lead, 41-49 Senior Scientist,
   50+ Chief Martian Scientist.

**Still to do:** a human browser pass (TASK-049), a personal NASA key before the
demo (TASK-008, ISS-009), and test files for `sim/forecast.ts`, `sim/crises.ts`
and `sim/comms.ts` (ISS-053). `src/sim/run.test.ts` and `src/sim/balance.test.ts`
were added with this work: the activity loop changed the balance, and the
balance needed a guard.
