# Tasks

Owners are GitHub handles, not roles. **Six people, one owner per row, no "team".** An
unowned task is an unowned task — assign one before starting.

Status: `open` · `in progress` · `blocked` · `done` · `cut`

| id | task | goal | owner | status | blocked by | notes |
| --- | --- | --- | --- | --- | --- | --- |
| TASK-064 | Move the outpost module layout out of source into a JSON file, with a developer placement editor | G-4 | agent | done | - | D-049; `src/ui/baseLayout.json`, `baseLayout.ts`, `baseLayoutEditor.ts`; `?editlayout=1`; 471 tests. Verified in headless Chrome, including the file round trip |
| TASK-063 | Grid the outpost modules, cut catalogue cards to one line, add an encyclopedia | G-4 | agent | done | - | `MODULE_SPOT` 4×2 grid in `ui/gameLoop.ts`; new `features/encyclopedia/`; 440 tests. Browser check outstanding (TASK-049) |
| TASK-062 | Roll each mission's hazards from a seed instead of a fixed schedule | G-4 | agent | done | - | D-048; `sim/forecast.ts`, `dom/forecastLoader.ts`, `data/spaceweather.ts`, base + act wiring; 434 tests |
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
| TASK-046 | Balance acceptance tests and tuning | G-4 | agent | done | — | `sim/balance.test.ts`, 9 tests; numbers in `sim/constants.ts` |
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

**Task ids were duplicated before this pass.** TASK-035/036/037 each appeared twice
(CI/deploy work and the naming/routing/cutout work). The older naming/routing/cutout rows
are now TASK-043/044/045, and the loop work uses TASK-046 onward. The plan's proposed
TASK-042–050 mapping is superseded by this table.
