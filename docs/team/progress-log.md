# Progress log

Newest entry on top. Four bullets: **Did**, **Files**, **Problems**, **Next**.

**Problems is the one people skip and the one that matters.** If a change went cleanly,
say so and say why — a clean change with an unexplained problem underneath it is worse
than a documented one.

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