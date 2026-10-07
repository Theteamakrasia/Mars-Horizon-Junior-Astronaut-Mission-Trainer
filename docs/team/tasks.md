# Tasks

Owners are GitHub handles, not roles. **Six people, one owner per row, no "team".** An
unowned task is an unowned task — assign one before starting.

Status: `open` · `in progress` · `blocked` · `done` · `cut`

| id | task | goal | owner | status | blocked by | notes |
| --- | --- | --- | --- | --- | --- | --- |
| TASK-025 | Folder structure: `sim/` rename, feature zones, cross-feature rule | G-6 | agent | done | — | D-013..D-018. Branch `docs/agent-orientation` |
| TASK-026 | `src/ui/routes.ts` + `router.ts`, hash routing | G-4 | agent | done | — | 15 tests. **Not wired** — D-014 |
| TASK-027 | Write `ui/registry.ts`, wire the router into `main.ts` | G-4 | unassigned | open | TASK-028 | arrives with the first feature |
| TASK-028 | `features/landing-site/` — pick a region, score 5 axes | G-4 | unassigned | open | — | **now blocks START MISSION**, ISS-017 |
| TASK-032 | `features/naming/` — main menu, name entry, rotating stage | G-4 | agent | done | — | Scene one. D-021. Entry route |
| TASK-033 | Wire hash routing into `main.ts`, make naming the entry | G-4 | agent | done | — | registry.ts became real |
| TASK-034 | Split the cutout sheet into two WebP assets | G-1 | agent | done | — | 1.3 MB PNG → 125 KB WebP |
| TASK-029 | `features/base/` — place modules | G-4 | unassigned | open | TASK-015 | first place module placement appears |
| TASK-030 | `features/act/` — advance a sol, resolve the mission | G-4 | unassigned | open | TASK-015, TASK-016 | **no plan phase** — D-018 |
| TASK-031 | `features/debrief/` — explain why a run was won or lost | G-4 | unassigned | open | TASK-016 | load-bearing now, D-018 |
| TASK-001 | Documentation and workflow system (AGENTS.md, architecture, decisions, issues, goals, tasks, progress log) | G-6 | agent | done | — | first pass, same branch |
| TASK-002 | `scripts/check-imports.mjs` + `npm run check` | G-2, G-6 | agent | done | — | rewritten for zones; verified by fixtures |
| TASK-003 | Split `src/core/` into pure `core/` and `dom/` | G-2 | agent | done | — | ISS-010. Runtime unverified |
| TASK-004 | Fix ISS-015 flaky test (`frame.test.ts:81`) | G-2 | unassigned | open | — | 40% failure. Blocks CI and G-1 |
| TASK-005 | Add `.gitattributes`, renormalise once | G-6 | unassigned | open | — | ISS-005. Cheapest item on the board |
| TASK-006 | Add `.env*` to `.gitignore`, commit `.env.example` | G-5 | unassigned | open | — | ISS-006. **Before any `.env.local` exists** |
| TASK-007 | Establish DONKI CORS behaviour in a real browser | G-5 | unassigned | blocked | needs a human with a browser | ISS-008. Blocks all data-layer work |
| TASK-008 | Register a personal api.nasa.gov key | G-5 | unassigned | open | — | ISS-009 |
| TASK-009 | Add jsdom/happy-dom, test DOM teardown and cancel paths | G-3 | unassigned | open | — | ISS-011, ISS-013 |
| TASK-010 | Look at the starfield in a browser, then fix or drop ISS-002 | G-3 | unassigned | open | needs a human with a browser | do not fix blind |
| TASK-011 | Add CI running `npm run check` + `npm test` | G-6 | unassigned | open | TASK-004 | ISS-012. A 40% flaky job gets disabled |
| TASK-012 | Self-host the Orbitron font, drop the CDN request | G-1 | unassigned | open | — | ISS-007. Needed for offline `dist/` |
| TASK-013 | Rewrite README project-status section | G-6 | unassigned | open | — | ISS-001. Deferred by D-011 |
| TASK-014 | One-line cleanups: stale comments, `license` field, ISS-003/ISS-004/ISS-014 | G-6 | unassigned | open | — | four separate one-liners, all unowned |
| TASK-015 | Resource state as pure functions in `src/core/` with tests | G-4 | unassigned | open | — | **the whole game. biggest unstarted item** |
| TASK-016 | Sol advance: drain, forecast events, reachable failure | G-4 | unassigned | open | TASK-015 | |
| TASK-017 | Plan phase screen | G-4 | unassigned | open | TASK-015, TASK-016 | needs `ui/` |
| TASK-018 | Act phase screen | G-4 | unassigned | open | TASK-015, TASK-016 | needs `ui/` |
| TASK-019 | Debrief explaining the cause of a loss | G-4 | unassigned | open | TASK-016 | README's design promise |
| TASK-020 | `src/data/` — DONKI and api.nasa.gov clients with fallbacks | G-5 | unassigned | blocked | TASK-007, TASK-006 | ISS-008 |
| TASK-021 | Approximate-data marker in the UI | G-5 | unassigned | open | TASK-020 | README promises honesty about estimates |
| TASK-022 | Decision on Supabase before Nov 8 | — | unassigned | open | — | D-003. **No owner.** Escalate |
| TASK-023 | Feature freeze Nov 8 | G-7 | unassigned | open | — | |
| TASK-024 | Build and verify submission artefact | G-7 | unassigned | open | — | Nov 14-15 |

## Notes

**Do not create `features/<name>/` as an empty directory.** Git cannot track one, and a
`.gitkeep` reads as implemented work. Each folder appears with its first real file, and
until then `docs/architecture.md` marks it *does not exist*. The checker already knows
about the zone, so nothing needs adding when the code lands.

**TASK-028 is the best first task for a new person.** One folder, four files, no
dependency on the resource model, and it is the only screen whose rules are fully
specified by the README.

**TASK-004 is still the priority.** A test suite that fails 40% of the time trains six
people to ignore red, and it blocks TASK-011.

**TASK-022 has no owner and no date.** Supabase auth is a known requirement (login, save
state) explicitly deferred (D-003) with nothing scheduled against the Nov 8 freeze. If it
is in the demo, the current plan does not contain it.

**TASK-015 is the project.** Everything in G-4 depends on it. `sim/resources.ts` and
`sim/sol.ts` are pure functions — exactly the kind of work the existing 94 tests and the
`sim/` zone are built for.

**TASK-007 blocks TASK-020**, and TASK-020 is most of G-5. One browser session answers
ISS-008 and unblocks a sprint's worth of work.

**Sol stepping is undecided** (D-009 territory, recorded in `architecture.md` known
simplification 9). Whoever builds TASK-016 should get the answer from the team first. The
structure works either way.