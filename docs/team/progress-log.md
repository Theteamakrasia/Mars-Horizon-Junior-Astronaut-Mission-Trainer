# Progress log

Newest entry on top. Four bullets: **Did**, **Files**, **Problems**, **Next**.

**Problems is the one people skip and the one that matters.** If a change went cleanly,
say so and say why — a clean change with an unexplained problem underneath it is worse
than a documented one.

---

## 2026-10-07 — PR #1 review document

**Did**

- Wrote a detailed PR description covering both workflows, HTML validation behavior, the
  deterministic test fix, deployment prerequisites, and command results.
- Kept application source unchanged; the document records the previously validated scope.

**Files**

- Added: `docs/pull-requests/001-ci-deployment-gates.md`.
- Updated: architecture tree, codebase structure map, and TASK-033 tracking.

**Problems**

- GitHub Pages still requires repository-level setup before a successful workflow can
  publish; the PR document calls out that prerequisite.

**Next**

- Add this document to PR #1 and use its full description as the PR body.

**Doc updates made:** architecture file tree, codebase structure map, task TASK-033, and
this progress log.

## 2026-10-07 — CI gates, HTML validation, and Pages deployment

**Did**

- Added a pull-request and `main` CI workflow for imports/typecheck, tests, HTML validation,
  and the production build. Added a separate Pages workflow that runs only after CI succeeds.
- Added HTML validation with inline style attributes and `<style>` elements allowed, a
  changelog, and workflow badges in the project README.
- Narrowed the HTML validator exception to the astronaut image populated by `main.ts`, and
  removed randomness from the existing open-space physics test without relaxing it.
- Mapped the repository into seven evidence-backed documents under `docs/codebase/`.

**Files**

- Added: `.github/workflows/{ci,deploy}.yml`, `.htmlvalidate.json`, `docs/CHANGELOG.md`,
  and `docs/codebase/*.md`.
- Updated: `package.json`, `package-lock.json`, `README.md`, architecture and team tracking
  documents. ISS-012/ISS-015 are fixed; TASK-004/TASK-011/TASK-032 are done.

**Problems**

- No hosting provider was previously configured. GitHub Pages is now the declared target;
  repository Pages settings must be enabled before deployments can publish.
- Dependency installation reported three audit findings (one moderate, two critical),
  which need separate review before treating dependency security as clean.

**Next**

- Commit and push this branch, then open a PR against `main`.
- Enable Pages in repository settings if the team wants the gated workflow to publish.

**Doc updates made:** changelog, architecture file tree, decisions D-021, issue ISS-012,
task TASK-011/TASK-032, and this progress log. README badges added.

## 2026-10-06 — Typed stubs across the whole planned structure

Fourth pass. Smallest change, and the one that was asked for three times before I got it
right.

**Did**

- Replaced "folders with README contracts" with **typed stubs** across the entire planned
  structure: `sim/{resources,sol,run}.ts`, `ui/registry.ts`, `data/spaceweather.ts`, and
  `model.ts` / `view.ts` / `<name>.css` for all four features. 17 new files.
- Every export has a real type and a real signature taken from the project README — the
  five Site Analysis axes, the four starting modules, `ResourceStores`, `RunState`,
  `SolEvent`. **Every function body throws `STUB: ...`.**
- Verified the stubs compile and behave: `npm run check` passes and now scans **27** files
  (was 14), `tsc --noEmit` clean under `strict` + `noUnusedLocals`, `npm run build`
  unchanged because no stub is imported by `main.ts`. Then probed three stubs with a
  throwaway test to confirm they throw rather than return `undefined`, and deleted it.

**Files**

- Added: `sim/{resources,sol,run}.ts`, `ui/registry.ts`, `data/spaceweather.ts`,
  `features/{landing-site,base,act,debrief}/{model.ts,view.ts,<name>.css}`
- Updated for the change: `AGENTS.md` §1 and §8, `docs/architecture.md` (legend, file
  tree, known simplification #2), `docs/team/decisions.md` (D-020)

**Problems**

1. **I gave three progressively smaller answers to one request.** Absent folders, then
   README contracts, then stubs. Each was defensible on its own merits and none of them
   was what was being asked for — the ask was always *put the files in the tree*. The
   cost was three rounds of the owner not being able to see the structure. Logged as
   D-020 rather than quietly fixed.
2. **Stubs are not implementations, and that is a real risk.** A stub that returns
   `undefined` is a trap three weeks later. Mitigated four ways: STUB on line 1 of every
   file, `architecture.md` marks them **stub** rather than complete, `AGENTS.md` §1 states
   it in bold, and every body throws.
3. **No `*.test.ts` stubs, deliberately.** Vitest fails a test file containing no tests,
   so creating `model.test.ts` placeholders would have broken `npm test` — turning a
   cosmetic request into a red build. Checked before writing, not after.
4. **`ui/registry.ts` imports no feature, on purpose.** Wiring it to import all four
   views would have made it claim to route to screens that throw. It stays a stub until
   the first screen is real.
5. **ISS-015 still fires.** This run failed at `src/sim/frame.test.ts:78` rather than
   line 81 — the sibling assertion in the same test, which is the same root cause and a
   good confirmation of the diagnosis. 93 of 94 passed.

**Next**

- **ISS-015.** It has now failed on both assertions in that test, which is enough
  evidence. Pin the test's input; do not loosen the tolerance.
- Fill in `sim/resources.ts` first (TASK-015). Everything else depends on it and it is
  pure, tested work.
- `features/landing-site/model.ts` (TASK-028) is the best screen to start — but the
  resource model underneath it does not exist yet.
- ISS-006 before anyone creates a `.env.local`.

**Doc updates made:** `AGENTS.md` §1 and §8, `docs/architecture.md` (legend, file tree,
known simplification #2), `docs/team/decisions.md` (D-020). `README.md` unchanged — still
wrong about the code, ISS-001, still deferred by D-011.

---

## 2026-10-06 — Placeholder READMEs so the folders are visible

Third pass, same branch. Small change, but it reverses a recommendation I made twice.

**Did**

- The owner reported that five of the seven new paths were not showing in their editor.
  Diagnosed rather than guessed: **19 files were on the branch and never pushed**, and two
  paths (`src/features/`, `src/data/`) did not exist on disk at all.
- Demonstrated git's behaviour directly: created an empty `src/features/demo/`, and
  `git status` reported **nothing**. An empty directory is invisible to git, so "the folder
  does not exist" and "the feature is not built" looked identical to anyone opening the repo.
- Added six `README.md` files: one for `features/`, one per screen folder
  (`landing-site`, `base`, `act`, `debrief`), and one for `data/`. Each states what belongs
  in `model.ts` and `view.ts`, taken from the project README — the five scoring axes, the
  four starting modules, the Power Surplus trade-off, the debrief's teaching promise.
- Chose `README.md` over `.gitkeep` after the owner asked for placeholders: same
  visibility, but it carries the contract. Used the owner's decision, my own framing.

**Files**

- Added: `src/features/README.md`, `src/features/{landing-site,base,act,debrief}/README.md`,
  `src/data/README.md`
- Updated for the change: `AGENTS.md` §1 and §8, `docs/architecture.md` file tree and
  known simplification #2, `docs/team/decisions.md` (D-019)
- No source file added. `npm run check` still scans 14 files — the checker ignores `.md`.

**Problems**

1. **I reported a folder as created when I had deliberately not created it.** The
   folder-structure pass said `src/features/` was "does not exist, by design", then
   summarised itself as building the folder structure. Those two statements are
   incompatible, and I did not flag the difference. The owner spent time debugging a
   missing folder that I had chosen to omit and then failed to say was omitted in the
   summary. Logged as D-019 rather than quietly fixed.
2. **I had recommended against placeholders twice, and the cost was real but asymmetric.**
   My worry — that a placeholder reads as implemented — is now handled by putting
   "Not implemented" in the first line of every README and marking the folders
   "contracts only" in the architecture tree. The owner's cost — an invisible structure
   that looks like a broken checkout — was paid immediately and repeatedly.
3. **Second cause, still outstanding: nothing has been pushed.** The branch
   `docs/agent-orientation` has no upstream. Nine commits before this pass and six more
   with it exist only in this working directory. Anyone on another machine, or looking at
   GitHub, sees the old `src/core/` layout and none of this work.
4. **ISS-015 still fires.** `npm test` is still red roughly 40% of the time on
   `src/sim/frame.test.ts:81`.

**Next**

- Push the branch, or say it stays local. This is the only reason the work is invisible
  outside this folder.
- Close ISS-015.
- Build `features/landing-site/` — the folder and its contract now exist, so it is
  `model.ts`, `model.test.ts`, `view.ts`, `landing-site.css` and nothing else.
- Fix ISS-006 before anyone creates a `.env.local` for `data/`.

**Doc updates made:** `AGENTS.md` §1 and §8, `docs/architecture.md` (file tree, known
simplification #2), `docs/team/decisions.md` (D-019). `README.md` unchanged — still wrong
about the code, ISS-001, still deferred by D-011.

---

## 2026-10-06 — Folder structure for the game, `sim/` rename, hash routing

Second pass on the same branch. All decisions confirmed by the owner first, including
two that change the architecture.

**Did**

- Asked before drawing anything. Five questions established: features for the game with
  `sim/` kept, hash routing, and — after two rounds — that **act is built with no plan
  phase** and that the team picks up tasks one at a time.
- Renamed `src/core/` → `src/sim/`. All three files moved together so their internal
  relative imports stayed valid; only four import lines in `dom/` needed changing.
- Rewrote `scripts/check-imports.mjs` around **zones** — a layer plus, for features, a
  role. Added `cross-feature` (a feature never imports another feature) and
  `purity-inversion` (a `model.ts` may not import its own `view.ts`).
- Added `src/ui/routes.ts` (pure) + `routes.test.ts` (15 tests) + `router.ts` (browser
  glue). Test count 79 → 94.
- Verified the checker both ways with temporary fixtures: legitimate feature code reports
  **zero** violations, and five injected violations each fire with the correct `file:line`.
  Re-verified the `KNOWN` staleness rule against the new rule ids. All fixtures deleted.

**Files**

- Renamed: `src/core/*` → `src/sim/*` (6 files, `git mv`, history intact)
- Added: `src/ui/routes.ts`, `src/ui/routes.test.ts`, `src/ui/router.ts`
- Rewritten: `scripts/check-imports.mjs`, `AGENTS.md`, `docs/architecture.md`
- Edited: `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts` (import paths),
  `docs/team/{issues,decisions,tasks}.md`
- **Not** created: `src/features/`, `src/data/`, `src/sim/{resources,sol,run}.ts`,
  `src/ui/registry.ts` — all marked *does not exist*

**Problems**

1. **I broke my own checker with a comment.** I wrote `features/*/model.ts` inside a
   `/** */` block comment; the `*/` terminated the comment early and the file failed to
   parse with a syntax error. Caught by running it. Ironic, because guarding against
   exactly this class of bug is written into the file two functions below where I
   tripped over it.
2. **Three consecutive false positives in the feature-role classifier**, logged as
   ISS-016. Both of my first two designs rejected valid code: `model.ts` could not import
   its own `types.ts`, and then the same import was misread as a purity inversion. Root
   cause was using filename-inferred role to do two jobs — deciding purity *and*
   deciding import permissions. Fixed by splitting them. This is the failure mode that
   matters most for a checker: a false positive teaches the team to add `KNOWN` entries
   for correct code, which is precisely how a `KNOWN` list grows forever.
3. **`ui/router.ts` is deliberately not wired.** It is implemented and its pure half is
   tested, but `main.ts` does not import it. Half-wiring a router with no features to
   switch to could break the landing page, and the DOM half cannot be verified without a
   browser. Labelled **not wired** in three places so nobody assumes navigation works.
4. **`ui/registry.ts` deferred to the first feature.** It maps routes to feature views, so
   creating it now would mean a file importing modules that do not exist — which the
   checker correctly flags as `unresolved-import`.
5. **Act has no plan phase** (owner-confirmed). Worth recording the consequence plainly:
   debrief is now the only place a player learns why they lost. It is load-bearing, not
   polish, and it carries the README's central teaching promise.
6. **ISS-015 still fires.** `npm test` failed on this pass at `src/sim/frame.test.ts:81`.
   93 of 94 passed. Untouched and unrelated to this pass.

**Next**

- Close ISS-015 before anything else. Still the priority.
- Build `features/landing-site/` (TASK-028) — the best first task: one folder, four
  files, no dependency on the resource model.
- Wire the router only once a feature exists to route to (TASK-027).
- Write `sim/resources.ts` and `sim/sol.ts` (TASK-015, TASK-016) with every test input
  pinned literal, so the ISS-015 pattern is not inherited.
- Sol stepping is still undecided. Whoever takes TASK-016 needs the team's answer first.

**Doc updates made:** `AGENTS.md` (rules table R-1..R-21, data flow, structure rule, where
things live), `docs/architecture.md` (file tree, zone table, contracts, known
simplifications), `docs/team/decisions.md` (D-013..D-018), `docs/team/tasks.md`
(TASK-025..TASK-031), `docs/team/issues.md` (ISS-016, plus path corrections for the
`core/` → `sim/` rename). `README.md` unchanged — still wrong about the code, ISS-001,
still deferred by D-011.

---

## 2026-10-06 — Documentation and workflow system, and the `core/` split

Branch `docs/agent-orientation`. Off `main`, never committed to it.

**Did**

- Interviewed the project owner across two rounds before writing anything, because the
  brief's description of the stack did not match the repository.
- Measured every tracked file: 23 text files, all valid UTF-8, no BOM, **none empty**.
  Ran `npm test` (79 pass) and `tsc --noEmit` (clean) before documenting either.
- Built the documentation system: `AGENTS.md`, `docs/architecture.md`, and
  `docs/team/{decisions,issues,goals,tasks,progress-log}.md`.
- Wrote `scripts/check-imports.mjs` and wired it as `npm run check`. It enforces layer
  boundaries, DOM confinement, network confinement, and inline-handler bans, printing
  `file:line` on every violation.
- Split `src/core/` into a pure `core/` (3 tested modules) and `dom/` (3 untested
  browser modules) with `git mv`, so the layer boundary the checker enforces is real
  rather than aspirational.
- Verified the checker by injecting deliberate violations into temporary fixtures:
  confirmed all six rules fire with correct `file:line`, that `fetchWeather` is *not*
  matched as `fetch`, that a matching `KNOWN` entry is tolerated, and that a stale
  `KNOWN` entry fails the build with a "delete this in the same commit" instruction.
  All fixtures deleted; `git status` confirms none remain.

**Files**

- Added: `AGENTS.md`, `scripts/check-imports.mjs`, `docs/architecture.md`,
  `docs/team/*.md` (5 files)
- Moved: `src/core/{floatAstronaut,pointerGrab,starfield}.ts` → `src/dom/`
- Edited: `package.json` (+`check` script), `src/main.ts` (2 import paths),
  `src/dom/floatAstronaut.ts` and `src/dom/pointerGrab.ts` (3+1 import paths now
  `../core/`)
- Untouched: all 3 core modules, all 3 test files, `index.html`, `vite.config.ts`,
  `tsconfig.json`, every CSS file, `README.md`

**Problems**

1. **The brief described a stack the repository does not have.** It said "vanilla ES
   modules, no bundler"; the repo is TypeScript 5.9 strict with Vite 7.3.6 and Vitest.
   Vite is load-bearing. Surfaced and re-confirmed with the owner rather than documenting
   either story unasked. Recorded as D-001.
2. **`README.md` claims no installable build exists.** It does not: 10 source files, 79
   passing tests, a working build. This is the single most expensive rot in the repo —
   it makes working work look absent to exactly the audience that reads a README first.
   Logged as ISS-001, deliberately not fixed (D-011).
3. **Found a 40%-flaky test nobody knew about.** `frame.test.ts:81` fails in 8 of 20
   consecutive runs, because the test seeds itself from `createAstronautFrame`, which
   calls `Math.random()` five times, while asserting a settled spring to within 1e-5. The
   sprite can bounce off a wall late in the 120-frame window. Confirmed pre-existing:
   `git diff main -- src/core/` is empty for the whole failing path. Logged as ISS-015,
   **not fixed**.
4. **My own first measurement of that flake was wrong.** An initial 30-run loop reported
   zero failures. It was a false negative: the detection regex used `×`, and a
   PowerShell round-trip had mangled that codepoint so the pattern never matched. Re-run
   with ASCII-only detection: 40%. A measurement that reports zero because the detector
   is broken is worse than no measurement — the same class of error as a green test suite
   where everything is mocked.
5. **Two bugs in my own checker, caught only by running it.** First run failed: `dom/`
   could not import `dom/`, and `src/src/...` double-prefixed in a message. A third bug
   surfaced from fixture testing — an extensionless relative import that resolves to
   nothing was silently skipped instead of reported. All three fixed and re-verified.
6. **`tsc` caught a break I introduced.** Moving the DOM modules left `floatAstronaut.ts`
   and `pointerGrab.ts` importing `./deform`, `./drift` and `./frame`, which had become
   `../core/`. Four import paths fixed. Worth noting this is precisely the class of error
   the new checker is meant to catch going forward — it would have flagged all four.
7. **Line endings are already split and git is actively making it worse.** 17 files CRLF,
   6 LF, `core.autocrlf = true`, no `.gitattributes`. Git warned mid-session that
   `pointerGrab.ts` will be rewritten to CRLF the next time it touches the file. All new
   files here are LF. Logged as ISS-005; adding the attributes file was deferred (D-012).
8. **DONKI's CORS behaviour could not be verified.** `ccmc.gsfc.nasa.gov` resolves here
   to a link-local address and times out; `donki.nasa.gov` does not resolve. No response
   means no `Access-Control-Allow-Origin` header was ever observed. D-005 therefore rests
   on an assumption, and ISS-008 blocks the data layer until a human checks it in a real
   browser. By contrast `api.nasa.gov` with `DEMO_KEY` returned 200 with a correct CORS
   header, which *is* verified.
9. **A possible visual bug found by reading, unverified.** `starfield.css` translates each
   layer to `-50%` while `starfield.ts` generates one set of stars per layer with no
   looping duplicate, so the field should drain away over ~70s. Logged as ISS-002 and
   explicitly marked unverified — a browser check may show otherwise.
10. **`.gitignore` omits `.env*`.** Latent today, live the moment anyone creates
    `.env.local` for the data layer — and this is a **public** repository. Logged as
    ISS-006, unowned, high severity.

**Next**

- Close ISS-015 before anything else: a red suite trains six people to ignore red, and it
  blocks CI (TASK-011).
- Close ISS-005 and ISS-006 — both are one-line fixes, both are cheap, and ISS-006 becomes
  a secret disclosure the moment TASK-020 starts.
- One person with a browser answers ISS-008 and ISS-002 in a single session; between them
  they unblock the entire data layer and the largest DOM question.
- Start resource state (TASK-015). It is pure functions with tests, it is the whole game,
  and it is the work this codebase's existing strength is best suited to.
- Decide Supabase (TASK-022). Deferred with no owner and no date against a Nov 8 freeze.
- **The page was never opened in a browser.** The `core/` → `core/`/`dom/` split is
  verified by `npm run check`, `npm test` and `vite build`, and by nothing else. If the
  astronaut does not drift after this lands, the move is the first suspect.

**Doc updates made in this pass:** `AGENTS.md` and everything under `docs/` are new.
`README.md` was **not** updated — its project-status section is wrong (ISS-001) and that
edit was explicitly deferred. No existing documentation file was modified, so no doc was
left stale by this change beyond what was already stale.
