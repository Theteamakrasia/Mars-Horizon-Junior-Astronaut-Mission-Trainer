# Tasks

Owners are GitHub handles, not roles. **Six people, one owner per row, no "team".** An
unowned task is an unowned task — assign one before starting.

Status: `open` · `in progress` · `blocked` · `done` · `cut`

| id | task | goal | owner | status | blocked by | notes |
| --- | --- | --- | --- | --- | --- | --- |
| TASK-105 | Draw every pictogram from the supplied icon set, and take the last of the emoji out of the game | G-4 | agent | in progress | - | D-082, ISS-097. `Assets/icons/` read at build time and drawn as inline SVG; `dom/svg.ts` learns colour; the module emoji leave `sim/`; the stars, the padlock, the tick and the points mark become drawings |
| TASK-104 | Make the training check follow the newest rule: a new run starts with no training done | G-7 | agent | done | - | D-081, ISS-095. The check asserted a refresh keeping the day's games and points; it now asserts 0/2, the orders locked, the six games playable and no points carried over |
| TASK-103 | Only offer the encyclopedia once the player has reached the outpost | G-4 | agent | done | - | D-080, ISS-094. `hasReachedOutpost(run)` in `sim/run.ts`; `showEncyclopedia` is off unless asked, and `base`, `act` and `debrief` ask. The browser check asserts the map has no book and the build screen has one |
| TASK-102 | Let the landing-site NASA dialog be dismissed, and stop the map leaving bands above and below it | G-4 | agent | done | - | ISS-091, ISS-092. One modal for both states, with the ✕ and the backdrop wired before the branch; the stage fills its cell and the picture crops |
| TASK-101 | Give the mini game its own sheet, so it never merges with the desk | G-4 | agent | done | - | D-079, ISS-093. The tool opens over the orders; the desk sheet holds no tool; the tool cannot outlive its section. 50 browser checks |
| TASK-100 | Make the how-to-play guide a popup with the astronaut reading it, one step per page | G-7 | agent | done | - | D-078, ISS-090. `ui/guide.ts` + `ui/guide.css`; the astronaut on the left, a speech bubble on the right, Next / Back / page dots / Read aloud; mounted on `document.body` so a redraw cannot reset the page; 801 tests |
| TASK-099 | Put the mission day in the header: the day in play, the total, and twelve pips | G-4 | agent | done | — | D-077. `ui/dayTracker.ts` — a pure model off the run and the tracker itself; `ui/day-tracker.css`; 10 model tests; `tools/browser-check-day.mjs` checks all five landing regions and that the day moves on when a sol runs |
| TASK-098 | Match the day tracker to the reference strip: filled pips, a lit path, and the words on the number's baseline | G-4 | agent | done | — | D-076. `src/ui/day-tracker.css` rebuilt to the reference; three `--gl-day-*` tokens in `styles/game-loop.css`; the pips shrink at 68rem and go at 44rem |
| TASK-097 | Six astronaut training mini-games in the Standing orders, with a two-a-sol rule that locks today's tasks until they are done | G-7 | agent | done | - | D-075. `sim/training.ts` plus six pure game modules, `ui/training.ts` plus six drawing modules; the points are science points scaled to 2/3/4; the day's record is written to localStorage so a refresh cannot farm it; 113 new tests and `tools/browser-check-training.mjs` (37 checks) |
| TASK-096 | Fix five play-test bugs: the build card's count, the power card, the water goal's words, the panel's scroll jump and the unexplained zero | G-7 | agent | done | - | ISS-077–ISS-082, D-073, D-074. `siteAllows`; `BuildCard.total/maxCount/fromLander`; `TodayPower.stored` and `lastPowerLine`; scroll and focus restored on `base` and `act`; no balance change; 810 tests |
| TASK-095 | Give the launch reel a skip, so a player can cut the films and get on with the mission | G-7 | agent | done | - | D-072; the button appears 2.6s in, halfway through the departure, and opens the parts tour; the reel stops properly and the tour takes the focus |
| TASK-094 | Make the "Real data" section the whole NASA layer, and stop the sheet squashing what is inside it | G-5 | agent | done | - | D-071, ISS-075, ISS-076. The region's own photo, NASA's live flare readings and two facts; `strongestFlares`; 795 tests |
| TASK-093 | Make the act screen's panel a hub of buttons, and draw every pictogram instead of borrowing one | G-4 | agent | done | - | D-070, ISS-057, ISS-072, ISS-073, ISS-074. `ui/sheet.ts`, `ui/icons.ts`, `dom/svg.ts`; the mission bar is gone; the emoji are out of `sim/`; 785 tests |
| TASK-092 | A fixed stacking order for the outpost modules, and the NASA button beside the region name | G-4 | agent | done | - | D-069; `DEPTH_ORDER` and `depthFor`; `z` out of the layout file; the NASA button moved and given the game's orange; 503 tests |
| TASK-091 | Warn when the layout file has a problem, and stop the editor from overwriting it | G-4 | agent | done | - | D-068; console warning + editor banner; the editor now opens from the file on disk; two bugs fixed. 492 tests |
| TASK-090 | Mirror a module in the placement editor | G-4 | agent | done | - | D-067; optional `flip` on a pose; Mirror button and F key; first tests for `ui/gameLoop.ts`; 492 tests |
| TASK-089 | A pose per module copy, and a way to resize a module | G-4 | agent | done | - | D-066; `baseLayout.json` holds a list per kind; the editor places and scales all 15 copies; crewmate sprite off the build screen; 480 tests |
| TASK-088 | Move the outpost module layout out of source into a JSON file, with a developer placement editor | G-4 | agent | done | - | D-065; `src/ui/baseLayout.json`, `baseLayout.ts`, `baseLayoutEditor.ts`; `?editlayout=1`; 471 tests. Verified in headless Chrome, including the file round trip |
| TASK-087 | Fix the tools: every sol has one to work, the sorting tool can earn three stars, and the browser check can drive any of them | G-4 | agent | done | — | ISS-064, ISS-065. The tools unlock one a sol for the first six; a test over the plan holds the rule |
| TASK-086 | Update the docs for the balance, the desk loop, the rover and the guide, and merge to `main` | G-6 | agent | done | — | AGENTS.md, `docs/architecture.md`, `docs/game-flow.md`, README, `src/data/README.md`, and the team docs; D-060…D-064, ISS-054…063 |
| TASK-085 | Fix what play testing turned up: the power card, the goal scroll, the build feedback, the limits, the recap and the word count | G-7 | agent | done | — | ISS-054…058, ISS-060, ISS-062. Six of the ten complaints in one pass |
| TASK-084 | Add `npm run balance` and the browser checks for the build screen, the rover and the whole journey | G-3 | agent | done | — | D-064. `tools/balance-check.mts` fails when a site cannot hold all five systems; three headless-Chrome checks |
| TASK-083 | Add a how-to-play guide and say what a day is in the briefing | G-7 | agent | done | — | ISS-059. `sim/guide.ts` (ten steps), `ui/guide.ts`, the mission bar's `?` button, and two new briefing beats |
| TASK-082 | Put the rover in the run: sol time, a work order to send it, and a document on the desk | G-7 | agent | done | — | D-062. `RunState.rover`; the catalogue moved from `data/` into `sim/rover.ts`; `ui/roverWidget.ts` deleted. Supersedes TASK-078's shape |
| TASK-081 | Make the five goals the learning outcomes rather than a score, and the standing orders the rule book | G-4 | agent | done | — | D-061. `GOAL_TARGETS`, `goalScore` and `goalsEarned` are gone; `sim/standingOrders.ts` holds twenty-four rules |
| TASK-080 | Turn the sol into a Papers Please desk: three work orders, two readings each, a tool, and one approval | G-4 | agent | done | — | D-060, D-063. `sim/activities.ts`, `sim/minigames.ts` (six tools), `ui/activityPlayer.ts`; stars multiply science only |
| TASK-079 | Make the game winnable: the balance made every build lose | G-4 | agent | done | — | ISS-061. Five constants in `sim/modules.ts`; win rate 20% → 43%; every site can hold all five systems |
| TASK-078 | Add the rover: a button on the outpost screens that finds real NASA places and rare rocks | G-7 | agent | done | — | D-059. `sim/rover.ts`, `data/roverFinds.ts`, `ui/roverWidget.ts`; 28 tests. **Superseded by TASK-082** — the rover is in the run now |
| TASK-077 | Name the five science goals, show them live on every sol and report how each fared | G-7 | agent | done | — | D-058. `sim/goals.ts`; the act screen and the debrief |
| TASK-076 | Guarantee the forecast never puts two events back to back | G-4 | agent | done | — | D-056. The quiet sol between every pair, whatever the dice roll |
| TASK-075 | Make the ration check ask a different question every run, with options derived from it | G-4 | agent | done | — | D-057. The answer was always 80; the mission length, the answer and the button order now move |
| TASK-074 | Cover the run state with `src/sim/run.test.ts` and correct AGENTS.md's test counts | G-3 | agent | done | — | ISS-053. The activity loop changes `RunState`, so the run state gets covered |
| TASK-073 | Update the architecture tree, the module contracts, the game flow and the README | G-6 | agent | done | — | ISS-050. The doc matrix §5 of `AGENTS.md` requires it in the same commit as the change |
| TASK-072 | Show the Mars Science Score, the rank and the activity breakdown in the debrief | G-4 | agent | done | — | D-052. Score, rank and a per-activity list; reuses the existing callout and stats table |
| TASK-071 | Show NASA's live daily picture and fact in `act` | G-5 | agent | done | — | D-053. One APOD per sol, with the curated card and an honest note as the fallback |
| TASK-070 | Add `data/nasaDaily.ts`, tag the static facts, and add `dom/dailyFactLoader.ts` | G-5 | agent | done | — | D-053, ISS-049. The `data/README.md` contract: injected fetch, never throws, always reports its source |
| TASK-069 | Offer the daily activity in `act` and show the science score | G-4 | agent | done | — | D-051, D-052. Three activity cards, a chosen one, the score in the world panel |
| TASK-068 | Record D-051 to D-055, the post-freeze scope exception, ISS-049 to ISS-050 and this task list | G-6 | agent | done | — | D-055. `docs/game-flow.md` is the document of record |
| TASK-067 | Score science points, rank the run, and apply the chosen activity in `advanceSol` | G-4 | agent | done | — | D-051, D-052. New `sim/science.ts`; `RunState.science` and `RunState.chosenActivity` |
| TASK-066 | Add the activity catalogue and the twelve sol plans to `sim/` | G-4 | agent | done | — | D-051, D-054. New `sim/activities.ts` and `sim/topics.ts`; replaces the cosmetic `MISSIONS` array |
| TASK-065 | Make Enter advance the supply screen like NEXT does | G-4 | agent | done | — | ISS-047, D-050; `isPlainEnter` and `focusHandlesEnter` in the model, one keydown listener in the view, and the screen resets its state on mount |
| TASK-064 | Enlarge the start screen's planet and astronaut so they stay sharp full-screen | G-4 | agent | done | — | `tools/upscale-naming-assets.py`; originals kept in `Assets/images/naming/source/`; Mars 3x, astronaut 2x |
| TASK-063 | Redesign the naming start screen as a full-bleed scene | G-4 | agent | done | — | D-049. Stage moved out of the body to be the window backdrop; menu column on the right over Mars; Outfit type, translucent panels, scrim. Mars rotation untouched. Owner checking on their device |
| TASK-062 | Roll each mission's hazards from a seed instead of a fixed schedule | G-4 | agent | done | — | D-048; `sim/forecast.ts`, `dom/forecastLoader.ts`, `data/spaceweather.ts`, base + act wiring; 434 tests |
| TASK-061 | Add rotating NASA facts to the supply and launch screens | G-7 | agent | done | - | D-045 follow-up; `factFor`, `[data-supply-fact]`, `[data-launch-parts-fact]` |
| TASK-060 | Add a real NASA photo to every landing region and rotating NASA facts to base and debrief | G-7 | agent | done | - | D-045; `REGION_CARDS`, `FACTS`, `factFor`; five region cards and ten new tests |
| TASK-059 | Document the NASA learning layer and read-aloud in the architecture tree and contracts | G-6 | agent | done | - | D-042, D-043, D-044; `nasaGallery`, `nasaCard`, `readAloud`, `readButton` |
| TASK-058 | Add a safe leave dialog to every run screen, and make "Start over" reset the run | G-7 | agent | done | - | D-044; ISS-046. Menu button with Keep playing / Leave mission |
| TASK-057 | Read-aloud for the briefing and the crisis prompt | G-7 | agent | done | - | D-043; shared `readButton`; router stops speech on navigation |
| TASK-056 | Show what each sol changed, signed, after the sol recap | G-7 | agent | done | - | `changeRows()` in `act/model.ts`, three tests; five-card strip |
| TASK-055 | Curated NASA gallery: one real image per sol plus a closing concept card | G-7 | agent | done | - | D-042; `data/nasaGallery.ts`, `ui/nasaCard.ts`, act + debrief wiring; 10 tests |
| TASK-054 | Bring the README up to date with the built project and link every doc | G-6 | agent | done | — | ISS-001, D-041. Real status, setup commands, `src/` tree, doc table |
| TASK-053 | Map every player decision and the event extension points in Mermaid | G-4 | agent | done | — | `docs/game-flow.md`; 4 diagrams (GitHub times out on many); linked from README; no gameplay change |
| TASK-042 | Record D-030 to D-035, log ISS-040, fix task id hygiene | G-4 | agent | done | — | decisions, issues, task ids |
| TASK-041 | Give no directional hint on the first wrong answer on the ration check | G-7 | agent | done | — | D-028, ISS-035. The bubble keeps the question on the first wrong pick; the hint appears from the second on. Browser check outstanding |
| TASK-040 | Make the player try again on the ration check instead of reverting on a timer | G-7 | agent | done | — | D-028, ISS-034. TRY AGAIN button; the working hides the answer until it is earned. Browser check outstanding |
| TASK-039 | Stop the launch reel showing black and skipping on a slow connection | G-7 | agent | done | — | D-027, ISS-030. Media-driven beats, lazy loading, poster frames; browser check outstanding |
| TASK-038 | Play the docking clip and the spacecraft tour after the launch film | G-7 | agent | done | — | D-025, D-026; ISS-028, ISS-029. `launch/model.ts` carries all three lengths |
| TASK-037 | Render the "meet the spacecraft" segment | G-7 | agent | done | — | D-024. `tools/render-parts.py` + `Assets/video/parts.mp4`; PIL/numpy/OpenCV + PyAV (H.264), no new dependency |
| TASK-036 | Render the 3-second docking clip | G-7 | agent | done | — | D-023. `tools/render-docking.py` + `Assets/video/docking.mp4`; PIL/numpy/OpenCV + PyAV (H.264), no new dependency |
| TASK-035 | Gate Vercel production deployment behind successful default-branch CI | G-6 | agent | done | Vercel secrets | No Pages; `vercel.json` disables Git auto-deploy; PR doc 003 |
| TASK-034 | Improve README badges, hero image, and linked index | G-6 | agent | done | — | `docs/pull-requests/002-readme-polish.md`; requested header order |
| TASK-033 | Write detailed Markdown description for PR #1 | G-6 | agent | done | — | `docs/pull-requests/001-ci-deployment-gates.md` |
| TASK-032 | Add CI quality gates, gated Vercel deploy, HTML checks, and changelog | G-6 | agent | done | — | ISS-012; Vercel gate in `deploy.yml` |
| TASK-025 | Folder structure: `sim/` rename, feature zones, cross-feature rule | G-6 | agent | done | — | D-013..D-018. Branch `docs/agent-orientation` |
| TASK-026 | `src/ui/routes.ts` + `router.ts`, hash routing | G-4 | agent | done | — | 19 tests. Wired into `main.ts` by TASK-027 |
| TASK-027 | Write `ui/registry.ts`, wire the router into `main.ts` | G-4 | agent | done | — | registry.ts real; router wired; entry is `naming` |
| TASK-028 | `features/landing-site/` — pick a region, score 5 axes | G-4 | agent | done | — | **Blocks START MISSION no longer** — ISS-017 fixed; chain flows naming → ... → landing-site |
| TASK-043 | `features/naming/` — main menu, name entry, rotating stage | G-4 | agent | done | — | Scene one. D-021. Entry route |
| TASK-044 | Wire hash routing into `main.ts`, make naming the entry | G-4 | agent | done | — | registry.ts became real |
| TASK-045 | Split the cutout sheet into two WebP assets | G-1 | agent | done | — | 1.3 MB PNG → 125 KB WebP |
| TASK-029 | `features/base/` — place modules | G-4 | agent | done | — | build panel, stores, storm warning, Start sols |
| TASK-030 | `features/act/` — advance a sol, resolve the mission | G-4 | agent | done | — | turn-based (D-030); Power Surplus picture; hands to debrief |
| TASK-031 | `features/debrief/` — explain why a run was won or lost | G-4 | agent | done | — | timeline bars, ledger attribution, confidence note, replay |
| TASK-046 | Balance acceptance tests and tuning | G-4 | agent | done | — | `sim/balance.test.ts`, 7 acceptance tests, added with the activity work; the tuning numbers live in `sim/modules.ts` |
| TASK-047 | Module sprites, cutscenes, storm haze | G-4 | unassigned | cut | — | cut list §11: the loop works without them; reduced-motion CSS kept |
| TASK-048 | Registry, `index.html` sections, registry/routes tests | G-4 | agent | done | — | 9 routed screens; `check-markup` passes |
| TASK-049 | Browser acceptance pass of the whole journey + `dist/` check | G-4 | unassigned | open | — | needs a human with a browser; `npm run build` passes |
| TASK-050 | Docs matrix: architecture, AGENTS §1/§8, progress log | G-6 | agent | done | — | README status stays stale (ISS-001, D-011) |
| TASK-052 | Make live space weather survive a NASA outage and close the key leak | G-2 | agent | done | — | ISS-006, ISS-008, ISS-043, D-037. NASA DONKI → NOAA SWPC → baked; `.env*` ignored, `.env.example` added; docs corrected (ISS-042) |
| TASK-051 | Stop the launch parts tour clipping its controls off-screen | G-7 | agent | done | — | ISS-041, D-036. Panel moved out of the 16:9 stage; image capped by viewport height |
| TASK-001 | Documentation and workflow system (AGENTS.md, architecture, decisions, issues, goals, tasks, progress log) | G-6 | agent | done | — | first pass, same branch |
| TASK-002 | `scripts/check-imports.mjs` + `npm run check` | G-2, G-6 | agent | done | — | rewritten for zones; verified by fixtures |
| TASK-003 | Split `src/core/` into pure `core/` and `dom/` | G-2 | agent | done | — | ISS-010. Runtime unverified |
| TASK-004 | Fix ISS-015 flaky test (`frame.test.ts:81`) | G-2 | agent | done | — | Deterministic open-space trajectory |
| TASK-005 | Add `.gitattributes`, renormalise once | G-6 | unassigned | open | — | ISS-005. Cheapest item on the board |
| TASK-006 | Add `.env*` to `.gitignore`, commit `.env.example` | G-5 | agent | done | - | ISS-006. **Before any `.env.local` exists** |
| TASK-007 | Establish DONKI CORS behaviour in a real browser | G-5 | agent | done | - | ISS-008. Answered from a browser: `api.nasa.gov/DONKI/FLR` sends `Access-Control-Allow-Origin: *`; availability, not CORS, is the remaining risk |
| TASK-008 | Register a personal api.nasa.gov key | G-5 | unassigned | open | — | ISS-009 |
| TASK-009 | Add jsdom/happy-dom, test DOM teardown and cancel paths | G-3 | unassigned | open | — | ISS-011, ISS-013 |
| TASK-010 | Look at the starfield in a browser, then fix or drop ISS-002 | G-3 | unassigned | open | needs a human with a browser | do not fix blind |
| TASK-011 | Add CI running `npm run check` + `npm test` | G-6 | agent | done | — | ISS-012. CI also validates HTML and builds |
| TASK-012 | Self-host the Orbitron font, drop the CDN request | G-1 | unassigned | open | — | ISS-007. Needed for offline `dist/` |
| TASK-013 | Rewrite README project-status section | G-6 | agent | done | - | ISS-001, D-041. Superseded by TASK-054 |
| TASK-014 | One-line cleanups: stale comments, `license` field, ISS-003/ISS-004/ISS-014 | G-6 | agent | done | - | all four fixed in one commit |
| TASK-015 | Resource state as pure functions in `sim/` with tests | G-4 | agent | done | — | `sim/resources.ts` + `constants.ts`, 18 tests |
| TASK-016 | Sol advance: drain, forecast events, reachable failure | G-4 | agent | done | — | `sim/sol.ts` + ledger, 12 tests; turn-based (D-030) |
| TASK-017 | Plan phase screen | G-4 | — | cut | — | no plan phase: act is built without one (confirmed by owner) |
| TASK-018 | Act phase screen | G-4 | agent | done | — | built as TASK-030 |
| TASK-019 | Debrief explaining the cause of a loss | G-4 | agent | done | — | built as TASK-031 |
| TASK-020 | `src/data/` - DONKI and api.nasa.gov clients with fallbacks | G-5 | agent | done | - | ISS-008, ISS-043, D-037. DONKI -> NOAA SWPC -> baked, in that order |
| TASK-021 | Approximate-data marker in the UI | G-5 | agent | done | - | ISS-043. The base warning, the act timeline and the debrief all mark approximate flare sizes |
| TASK-022 | Decision on Supabase before Nov 8 | — | unassigned | open | — | D-003. **No owner.** Escalate |
| TASK-023 | Feature freeze Nov 8 | G-7 | agent | done | - | passed; later work recorded as explicit scope exceptions |
| TASK-024 | Build and verify submission artefact | G-7 | unassigned | open | — | Nov 14-15 |

## Notes

**Do not create `features/<name>/` as an empty directory.** Git cannot track one, and a
`.gitkeep` reads as implemented work. Each folder appears with its first real file, and
until then `docs/architecture.md` marks it *does not exist*. The checker already knows
about the zone, so nothing needs adding when the code lands.

**TASK-028 is the reference example.** One folder, four files, no dependency on the
resource model, and its rules are fully specified by the README — read it before adding a
screen.

**TASK-004 is complete on this branch.** The open-space test uses a deterministic trajectory;
CI can run the suite without the known random launch causing false failures.

**TASK-022 has no owner and no date.** Supabase auth is a known requirement (login, save
state) explicitly deferred (D-003) with nothing scheduled against the Nov 8 freeze. If it
is in the demo, the current plan does not contain it.

**TASK-015 is done.** `sim/resources.ts`, `sim/modules.ts`, `sim/forecast.ts`, `sim/sol.ts`
and `sim/run.ts` are implemented and tested; the suite is 414 tests in 19 files.
(`sim/events.ts` is gone; its schedule moved into `sim/forecast.ts`.)

**TASK-007 is done, so TASK-020 is done too.** The browser answered ISS-008, and
`data/spaceweather.ts` now tries DONKI, then NOAA SWPC, then baked history (D-037,
ISS-043). A personal key (TASK-008) remains optional.

**Sol stepping is decided: turn-based (D-030).** `advanceSol` runs on a button press in
`act`; there is no clock abstraction and no ticker.

**TASK-066 to TASK-074 are one post-freeze exception (D-055).** The Nov 8 freeze allowed
only bug fixes. This pass adds a main activity to every sol, a science score with a rank,
and a live NASA daily-fact layer. `docs/game-flow.md` is the document of record, the
work is on branch `feat/daily-activities`, and the exception is recorded in
`docs/team/decisions.md` rather than taken quietly.

**TASK-079 to TASK-086 are the second post-freeze exception (D-060 to D-064).** The game
was unwinnable and unfollowable: 0 of 3,558 measured runs won, and a child could play
twelve sols without ever being told what a sol was. The exception covers the balance
fix, the Papers Please desk loop, the goals becoming learning outcomes, the rover
moving into the run, the how-to-play guide, the browser checks and `npm run balance`.
The branch is `feat/goal-objectives`; the decisions are recorded rather than taken
quietly.

**The five goals are not a score (D-061).** Any task that wants to "grade" them, count
them, or put a number on the player's progress against them is a task that contradicts
the decision. The goals are what the game is *about*; the run is how you show it.

**Task ids were duplicated before this pass.** TASK-035/036/037 each appeared twice
(CI/deploy work and the naming/routing/cutout work). The older naming/routing/cutout rows
are now TASK-043/044/045, and the loop work uses TASK-046 onward. The plan's proposed
TASK-042–050 mapping is superseded by this table.
