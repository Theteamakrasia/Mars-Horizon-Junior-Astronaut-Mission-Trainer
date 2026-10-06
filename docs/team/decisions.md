# Decisions

Every choice someone might otherwise relitigate. **Newest first.**

The **Rejected** line is the point of this file. It is what stops the same dead end
being re-explored in week four. If you are about to propose something that appears
under Rejected below, read that entry first.

Format: number · who decided · **Choice** · **Why** · **Rejected** · **Consequence**.

---

**D-019 — project owner · 2026-10-06**
**Choice:** `src/features/` and `src/data/` each get a `README.md` per folder, so the
structure is visible in the repository. One `README.md` for the `features/` directory
plus one per screen folder, and one for `data/`.
**Why:** The owner asked for placeholders after finding the folders invisible. **The
agent had recommended against it, twice, and was wrong about the cost.** An earlier pass
left the folders absent and reported that as deliberate; the owner reasonably read "I
created the folder structure" and could not find two of the seven new paths. Verified
afterwards: an empty directory produces *no* `git status` output at all, so
"the folder does not exist" and "the feature is not built" were indistinguishable to
anyone opening the repository — including the person who had just asked for the work.
**Rejected:** `.gitkeep`. Rejected because it makes the folder visible while saying
nothing; a `README.md` does the same job and states what belongs there. Also rejected:
leaving the folders absent, on the grounds that the annotated file tree in
`architecture.md` already showed them — which is true, and irrelevant to someone looking
at their editor.
**Consequence:** the folders now appear, and each README states "Not implemented" in its
first line so a contract cannot be mistaken for code. `architecture.md` marks them
**contracts only**, and `AGENTS.md` §1 and §8 updated. The checker's zone classifier
ignores `.md` files, so no rule changed — verified, still 14 files scanned. **The lesson
worth keeping: a documented decision to leave something absent is not the same thing as
the thing being visibly absent.** Absence reads as "nothing happened", not as "decided".

---

**D-018 — agent, on the owner's confirmation · 2026-10-06**
**Choice:** The game is built **without a plan phase**. The four in-scope screens are
`landing-site`, `base`, `act`, `debrief`.
**Why:** The owner confirmed this twice, including when asked directly what the act
screen resolves if plan does not exist. The player's decisions happen at build time
rather than each sol.
**Rejected:** Adding `features/plan/` because the README calls plan "the heart of the
game". The README describes the intended product; the owner decides the sprint.
**Consequence:** **`debrief` is now load-bearing, not optional polish.** With no
per-sol planning, the debrief is the only place a player learns *why* a run was lost,
which is the README's central promise ("a run that ends badly is the most educational
run in the game"). If debrief is weak, the game has no teaching left. `act` becomes the
simulation runner rather than a decision screen. `src/ui/routes.ts` deliberately has no
`plan` route.

---

**D-017 — no problem · 2026-10-06**
**Choice:** A feature may not import another feature (`cross-feature`), enforced.
State crosses screens through `RunState`, passed explicitly from `main.ts`.
**Why:** Six people picking up tasks one at a time will otherwise couple features by
import convenience. Enforcing isolation is what keeps "pick a folder, work in it" true.
**Rejected:** Allowing cross-feature imports for shared helpers, with the shared code
moved to `sim/` when duplication appears. That is strictly better for discoverability
and is the intended migration path; the rule just makes it explicit rather than
discretionary.
**Consequence:** two screens that genuinely need each other's types must put the shared
shape in `sim/` or in `main.ts`. The checker's error message says so, so the fix is
discoverable at the point of failure.

---

**D-016 — agent, for "whoever is free, task by task" · 2026-10-06**
**Choice:** No `index.ts` barrel files anywhere. Import concrete paths. Feature CSS is
imported by that feature's own `view.ts`, never added to a central `style.css`.
**Why:** A barrel is the single file every feature edits and nobody owns. With six
people and no per-folder context, that is guaranteed merge conflict and invisible in
review. A central stylesheet has the same problem one layer down.
**Rejected:** Barrels, for import ergonomics. Rejected because the ergonomics gain is
paid by everyone and the conflict cost is paid by everyone.
**Consequence:** a long import path is the correct trade. Both rules are conventions, not
enforced — nothing checks for a barrel today. Worth noting `tsc` would not catch one
either. They live in `AGENTS.md` R-14 and R-15.

---

**D-015 — agent · 2026-10-06**
**Choice:** Features are a fixed four-file layout: `model.ts`, `model.test.ts`,
`view.ts`, `<feature>.css`. Depth never exceeds two levels. Tests are colocated.
**Why:** The team works task-by-task, so someone opening a folder must find everything
for that screen without a map. Colocated tests match the repo's existing
`sim/*.test.ts` pattern, so nothing new has to be learned.
**Rejected:** Grouping all tests under a top-level `tests/` mirror of the tree, and
grouping all CSS centrally. Both rejected for the same reason as D-016: they trade a
stranger's ability to find things for tidiness that only a regular of the codebase
values.
**Consequence:** four folders in flight means at most sixteen files, and each folder is
self-contained. Purity is enforced by filename (`model.ts`, `types.ts`,
`constants.ts`, `*.test.ts`), which means an unrecognised pure filename is treated as
DOM-bearing — conservative, and it prompts a rename rather than a silent hole.

---

**D-014 — agent · 2026-10-06**
**Choice:** Hash routing, with the pure parsing split from the DOM glue:
`ui/routes.ts` (pure, 15 tests) and `ui/router.ts` (browser). **Not wired into
`main.ts` yet.**
**Why:** Deep-linkable screens matter for a Nov 14 demo — six people need to jump
straight to `#/debrief` rather than play there. Splitting the pure half means the
routing logic gets real coverage while the repo still has no jsdom (ISS-013).
**Rejected:** A single-page state machine with no routing, because it forces the demo to
be played from the start. Also rejected: multiple HTML entry points — **not a
preference, a dead end** — since there is no persistence anywhere in the project, so a
navigation would lose the run state a multi-mission loop needs.
**Consequence:** `ui/router.ts` is implemented, partly tested, and deliberately
inert. Half-wiring it with nothing to switch to could break the landing page, and the
DOM half cannot be verified without a browser. It is marked **not wired** in
`architecture.md`, `AGENTS.md` §3 and §10, so nobody assumes navigation works.

---

**D-013 — agent, approved by owner · 2026-10-06**
**Choice:** Rename `src/core/` to `src/sim/`.
**Why:** "core" described neither of the two things the folder would hold — astronaut
squash-and-stretch and resource depletion. `sim/` says "deterministic, pure, tested",
which is the property the folder exists to guarantee. It also gives the astronaut
physics an honest burial date: it is landing-page-only and goes when the landing page
is replaced (D-008).
**Rejected:** Full feature slices that would have moved the physics under
`features/landing/physics/`. Rejected on cost, not principle — it moves six files and
ninety-four tests in the week before the freeze, for naming consistency. Also rejected:
keeping `core/` on the grounds that a rename is churn; the rename costs four import
lines, which is not churn.
**Consequence:** all three files move together, so their internal relative imports stay
valid and only four import lines in `dom/` needed changing. `git log --follow` still
traces every file. Issue paths in `issues.md` were updated to match.

---

**D-012 — no problem · 2026-10-06**
**Choice:** No `.gitattributes` and no line-ending normalisation in this pass.
**Why:** Interview answer was that `AGENTS.md` is readable as-is, which is a statement
about new files, not about the existing mixed-EOL problem. `core.autocrlf = true` with no
attributes file means the drift continues.
**Rejected:** Adding `* text=auto eol=lf` plus a one-time renormalisation commit. Rejected
only because the standing instruction this pass was to log problems rather than fix
them; nothing about the idea is wrong.
**Consequence:** ISS-005 stays open and the drift is actively getting worse — git warned
mid-session that `pointerGrab.ts` will be rewritten to CRLF. All new files from this
pass are LF, so they are on the correct side of the eventual fix. **This is the single
cheapest issue on the board to close.**

---

**D-011 — no problem · 2026-10-06**
**Choice:** `README.md` is left completely untouched; its false project-status section
becomes ISS-001 instead of an edit.
**Why:** The standing instruction was to log the four measured problems rather than fix
them. The README's 399 lines of game design, NASA data sources and attribution are
valuable and non-technical-reader-friendly, and it already serves as the front page the
brief asked for — it just makes one false claim about the code.
**Rejected:** Rewriting the "Project Status" section. Rejected on instruction, not on
merit. It is the right fix and should be the first content change after the freeze
planning.
**Consequence:** Anyone reading only the README still concludes there is nothing to run.
ISS-001 is a judgement call about **timing**, not about whether the README is wrong.

---

**D-010 — no problem · 2026-10-06**
**Choice:** The layer fix moves files; the four measured defects stay unfixed.
**Why:** Moving `floatAstronaut`, `pointerGrab` and `starfield` to `src/dom/` was
explicitly approved as part of the tree proposal. The four defects (ISS-001 to ISS-004)
were explicitly deferred.
**Rejected:** Doing the starfield fix while already touching those three files.
**Consequence:** `src/dom/` is new and **runtime-unverified** — `npm run check`,
`npm test` and `vite build` all pass, but the page was never opened in a browser. If the
astronaut fails to drift after this lands, the move is the first suspect.

---

**D-009 — no problem · 2026-10-06**
**Choice:** Measured defects are logged, not fixed.
**Why:** Explicit instruction: "Just log all four."
**Rejected:** Bundling obvious one-line fixes (a stale comment, a `license` field) with
the documentation work, on the reasoning that they are free. Rejected because a
documentation pass that silently also edits product code is harder to review than one
that only adds documentation.
**Consequence:** ISS-001 through ISS-004 and ISS-006 through ISS-014 are all open and
unowned. Several are one-line fixes that nobody has claimed.

---

**D-008 — project owner · 2026-10-06**
**Choice:** The current `index.html` "Under Construction" landing page is what ships
until the game is at least 30% built.
**Why:** Stated by the project owner. It gives the team a working, demonstrable artefact
at any point, which matters with a Nov 8 freeze and a Nov 14 demo.
**Rejected:** Replacing the landing page now with a half-built game. Rejected because a
broken game front page is strictly worse than an honest "under construction" page, and
because a 30% threshold gives an objective point at which to switch.
**Consequence:** The landing page is a shipped artefact with its own maintenance burden,
not scaffolding. ISS-007 (Google Fonts defeating offline use) matters more than it would
if this page were throwaway. The switch is currently a manual edit, not a flag — if the
team wants a runtime toggle instead, that is a change to record here.

---

**D-007 — project owner · 2026-10-06**
**Choice:** Feature freeze Nov 8 2026; demo Nov 14-15 2026.
**Why:** Confirmed by the project owner. Six people, ~39 days from the documentation
pass.
**Rejected:** Freezing on the demo date itself. Rejected because six developers
discovering breakage on Nov 13 leaves no working day to fix it.
**Consequence:** Roughly 33 working days of build time. Data-layer work that depends on
ISS-008 must be resolved well before Nov 8 or it gets cut.

---

**D-006 — agent, on "do what you think is best" · 2026-10-06**
**Choice:** `data/` reads `import.meta.env.VITE_NASA_API_KEY`, falls back to `DEMO_KEY`,
and the repo stores no key.
**Why:** Verified that `api.nasa.gov` with `DEMO_KEY` returns HTTP 200 and sends
`Access-Control-Allow-Origin` echoing the request origin, so it is browser-callable.
Storing a key in the repo would be a disclosure (ISS-006).
**Rejected:** Committing a key. Rejected outright — public repository.
**Consequence:** `DEMO_KEY` is shared and rate-limited, so the data layer must degrade
to baked-in values rather than showing an empty screen when throttled. Nobody currently
owns a personal key: ISS-009.

---

**D-005 — project owner · 2026-10-06**
**Choice:** DONKI is fetched directly from the browser, with a baked-in fallback.
**Why:** Simplest path with no backend, and Supabase is deferred this sprint so there is
nothing to host a proxy.
**Rejected:** A Supabase Edge Function proxy — technically the most robust answer to a
CORS problem, but it requires the backend that D-003 defers. Also rejected: baking in
DONKI data and dropping live space weather, which forfeits the "real NASA data" claim
the README makes.
**Consequence:** **This decision rests on an unverified assumption.** DONKI's CORS
behaviour could not be established (ISS-008). If it sends no ACAO header this decision
must be revisited, and revisiting it late is expensive.

---

**D-004 — project owner · 2026-10-06**
**Choice:** When Supabase arrives, only the anon/publishable key ships in the client
bundle, protected by Row Level Security.
**Why:** The standard, intended Supabase model. The publishable key is designed to be
public; RLS is the actual authorisation boundary.
**Rejected:** `service_role` in the client — it bypasses RLS entirely and would hand any
visitor full database access. Also rejected: shipping no key at all, which rules out
client-side reads completely.
**Consequence:** Recorded now so the answer exists before someone writes auth code under
pressure. Nothing ships this sprint. RLS policies become part of the Supabase work and
are **not yet written** — an unenforced RLS policy is an open database.

---

**D-003 — project owner · 2026-10-06**
**Choice:** Supabase is out of scope for this sprint.
**Why:** Stated by the project owner, despite login and save-state being known future
requirements.
**Rejected:** Building auth now. Rejected because the landing page has no state to save,
and auth is the largest single piece of unstarted work in the project.
**Consequence:** `@supabase/supabase-js` is **not** a dependency and the project keeps
zero runtime dependencies. Auth and persistence are unowned and unscheduled against a
Nov 8 freeze. If they are in the demo, that decision needs revisiting immediately.

---

**D-002 — project owner · 2026-10-06**
**Choice:** Split `src/core/` into a pure `core/` and a `dom/` holding the three
browser-facing modules.
**Why:** `core/` was a lie — three of its six modules touched `document`, `window`,
`requestAnimationFrame` and pointer events. A layer named "core" that violates the
universal meaning of "core" is precisely what makes an architecture unenforceable: any
checker written against it would have to exempt the files it was meant to police.
**Rejected:** Leaving the flat structure. Rejected because the boundary would remain
unenforceable and the next contributor would add game state and rendering to `core/` too.
Also rejected: a full layered tree including `config/` and `game/` up front, on the
grounds that greenfield structure tends to exceed what gets built.
**Consequence:** `core/` is now genuinely pure and genuinely tested; `dom/` is untested
(ISS-011) but is the honest name for what those files do. No test imported any of the
three moved files, so no test changed. Runtime effect unverified.

---

**D-001 — project owner · 2026-10-06**
**Choice:** Keep Vite + TypeScript. Do not migrate to buildless vanilla ES modules.
**Why:** The original brief described the stack as "vanilla ES modules, plain CSS, no
framework, no bundler, no runtime dependencies". Measured reality contradicted two of
those four: the project is TypeScript 5.9 strict with Vite 7.3.6 and Vitest 3.2.7. Vite
is load-bearing — it fingerprints `floating.png` and `publicDir: false` is what keeps
2.4 MB of mockups out of `dist/`.
**Rejected:** Migrating to no-build ESM, which would mean losing asset fingerprinting,
dropping `tsconfig`, and rewriting 10 working, tested files. Also rejected: dropping
TypeScript while keeping Vite.
**Consequence:** The docs describe the measured stack. The "no bundler" clause of the
original brief does not apply to this repository and should not be reintroduced into any
later brief without re-measuring.

---

**D-000 — baseline, established by measurement · 2026-10-06**
**Choice:** Document what the code *does*, not what it was intended to do.
**Why:** The README asserted no installable build existed while 10 source files, 79
passing tests and a working build sat in the repo. Intention-based documentation is
how that README came to exist.
**Rejected:** Writing the architecture the README describes. Rejected because none of the
ten-mission loop, the resource model or the NASA data integration exists in code.
**Consequence:** `docs/architecture.md` marks `data/` and `ui/` as **does not exist**
rather than describing them as planned-and-empty, and this file records that no game
logic has been written yet.