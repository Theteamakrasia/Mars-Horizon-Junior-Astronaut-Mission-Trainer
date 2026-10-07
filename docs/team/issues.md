# Issues

Every known problem, logged **before** it is fixed. An issue gets an id the moment it
is noticed, even if it is fixed in the same breath. If you fixed something without an
id, the history is now wrong — add the id retroactively rather than skipping it.

Status values: `open`, `fixed` (with the commit), `accepted` (won't fix, on purpose),
`blocked` (waiting on someone outside the code).

## Triage

| id | title | severity | owner | status | fix-in |
| --- | --- | --- | --- | --- | --- |
| ISS-015 | `frame.test.ts:81` fails ~40% of runs (flaky) | high | agent | fixed | this branch |
| ISS-001 | README claims no installable build exists | high | unassigned | open | — |
| ISS-006 | `.gitignore` omits `.env*`, leaking API keys | high | unassigned | open | — |
| ISS-008 | DONKI CORS and reachability unverified | high | unassigned | blocked | needs a browser check |
| ISS-002 | Starfield layers drift out and never refill | medium | unassigned | open | — |
| ISS-005 | Mixed CRLF/LF line endings, no `.gitattributes` | medium | unassigned | open | — |
| ISS-007 | Google Fonts CDN defeats the offline `dist/` goal | medium | unassigned | open | — |
| ISS-009 | `DEMO_KEY` is shared and rate-limited | medium | unassigned | open | — |
| ISS-011 | All three DOM modules have zero test coverage | medium | unassigned | open | — |
| ISS-003 | `message.css` comment contradicts itself | low | unassigned | open | — |
| ISS-004 | `package.json` has no `license` field | low | unassigned | open | — |
| ISS-010 | `src/core/` held DOM modules - name did not match | low | unassigned | fixed | this branch |
| ISS-016 | Feature-role classifier produced false positives | low | agent | fixed | this branch |
| ISS-012 | No CI; nothing runs checks on push | low | agent | fixed | this branch |
| ISS-013 | Vitest runs node-env, no jsdom, so DOM is untestable | low | unassigned | open | — |
| ISS-014 | `base.css` calls the page non-interactive while draggable | low | unassigned | open | — |

---

## ISS-015 — `frame.test.ts:81` fails about 40% of runs

- **Reported by:** running the suite repeatedly during the documentation pass,
  2026-10-06
- **Where:** `src/sim/frame.test.ts` lines 74-83, the assertion on line 81. (Logged as
  `src/core/frame.test.ts`; the directory was renamed to `sim/` afterwards.)
- **Problem:** the test `produces no deformation while drifting through open space`
  fails intermittently. Measured failure rate: **8 of 20 consecutive `npm test` runs
  (40%)**. A separate 20 000-iteration probe of the same scenario failed 5 295 times
  (26.5%), with the deformed axis reaching 0.81 instead of 1.0 — i.e. 19% compression,
  the full `MAX_COMPRESSION`, still applied.
- **Measured failure:** `expected 0.9998075720934599 to be close to 1, received
  difference is 0.00019242790654006026, but expected 0.000005`.
- **Cause:** the test builds its starting state with `createAstronautFrame`, which
  calls `createInitialDrift`, which calls `Math.random()` **five times** (drift.ts
  lines 183, 185, 186, 190, 191) to pick a random launch heading, a random quadrant
  and a random position. Over 120 frames at 176 px/s the sprite covers roughly 350 px
  diagonally inside a 900x700 play area, so it frequently bounces off a wall — often
  late in the window. The test's name asserts "no deformation", but its assertions
  actually demand a settled spring to within 1e-5, which cannot be guaranteed when the
  sprite is allowed to hit something at a random moment. The two assertions also
  disagree with each other: `isDeformSettled` on line 78 tolerates 0.0015 and passes,
  while `toBeCloseTo(1, 5)` on line 81 tolerates 0.000005 and fails on the same value.
- **Pre-existing:** confirmed. `git diff main -- src/core/` (now `src/sim/`) is empty for
  `frame.test.ts`, `frame.ts`, `drift.ts` and `deform.ts`. Nothing in the failing path
  was touched by the documentation pass. This flake has been live since the file was
  written.
- **Risk:** high, and worse than the maths suggests. A suite that is red 40% of the time
  teaches six people to ignore red output. Once `npm test` is noise, ISS-011 (no DOM
  coverage) and every future regression hide inside it, and nobody can tell a real
  failure from the flake. It also blocks CI (ISS-012) — a 40% flaky job gets disabled.
- **Fix (proposed, not applied):** remove the randomness from the test rather than
  loosening the tolerance. Start from an explicit pinned `AstronautFrame` with a known
  velocity, as `afterImpact` on line 64 already does for the sibling tests, and assert
  open-space behaviour on a trajectory that provably cannot reach a wall. Widening
  `toBeCloseTo` would hide a real regression instead: if the spring ever stopped
  relaxing, a loose tolerance would let that pass. If the intent really was "any
  bounce eventually settles", then the honest test is to advance until settled and
  assert on the trajectory, not on a fixed 120 frames.
- **Verification note:** the 40% and 26.5% figures above are measured, not estimated.
  An earlier attempt to measure this reported zero failures across 30 runs; that
  result was wrong, caused by a non-ASCII `×` in a PowerShell regex being mangled into
  a different codepoint so the failure pattern never matched. Re-measured with an
  ASCII-only pattern, the failure rate is real.
- **Resolution:** replaced the randomized launch state with a known open-space trajectory.
  The test keeps its settled and scale assertions at their original tolerances; all 94
  tests passed on this branch.

## ISS-016 — Feature-role classifier produced false positives

- **Reported by:** fixture testing of the new checker, 2026-10-06, during the folder
  structure pass
- **Where:** `scripts/check-imports.mjs`, the `zoneOf` role classifier and the
  intra-feature import rule
- **Problem:** two consecutive designs for classifying a feature file as pure or
  DOM-bearing both rejected valid code. First, treating any filename that was not
  `model.ts` or `*.test.ts` as a view made `model.ts` unable to import its own
  `types.ts`. Then allowing intra-feature imports unconditionally made that same
  import look like a purity inversion instead. Three false positives in a row, each
  only visible because legitimate fixture code was run through the checker.
- **Cause:** the checker inferred role from filename, and role was doing two jobs at
  once — deciding purity, and deciding import permissions. Pure files with
  unrecognised names fall through to "view", and then a pure file cannot import them.
- **Risk:** high for a checker, because a false positive trains the team to add
  `KNOWN` entries for code that is actually correct. That is how a `KNOWN` list grows
  forever — the exact failure this project set out to avoid.
- **Fix:** split the two jobs. `PURE_BASENAMES = {model.ts, types.ts, constants.ts}`
  plus any `*.test.ts` decides purity only. Intra-feature imports are then governed by
  one rule — a pure file may not import a DOM-bearing one (`purity-inversion`) — and
  everything else inside a feature is permitted.
- **Verification:** legitimate fixture code (a model importing `sim/` and its own
  types, a view importing its model and using `document`, a colocated test) now reports
  zero violations, while five injected violations each fire with the correct
  `file:line`.
- **Consequence:** a pure file with a name outside `PURE_BASENAMES` is treated as
  DOM-bearing, so it may not be imported by that feature's `model.ts`. That is the
  conservative direction: it prompts a rename rather than silently permitting DOM into
  pure logic.

## ISS-001 — README claims no installable build exists

- **Reported by:** repository measurement, 2026-10-06, before this documentation pass
- **Where:** `README.md` line 354, and the file tree at lines 358-368
- **Problem:** The README states *"There is no installable build or playable release at
  this time — when one is ready, this section will be replaced with setup and run
  instructions."* The tree beneath it lists only `README.md` and `Assets/README_ref/`.
- **Measured truth:** 10 TypeScript source files, 3 test suites, 79 tests passing,
  `tsc --noEmit` clean, and a successful Vite build into `dist/` (index.html, a
  fingerprinted PNG, JS and CSS bundles). `package.json` has runnable `dev` and `test`
  scripts.
- **Cause:** the README was written before the code and never updated. Nobody was
  assigned to keep it true.
- **Risk:** A judge, teacher or new teammate reads this and concludes there is nothing
  to run. It is the single most expensive kind of documentation rot, because it makes
  working work look absent. NASA Space Apps judging starts from exactly this file.
- **Fix:** Rewrite the "Project Status" section to the measured state and point it at
  `docs/architecture.md` and `AGENTS.md`. **Deliberately not done in this pass** — see
  decisions D-009.

## ISS-006 — `.gitignore` omits `.env*`, leaking API keys

- **Reported by:** repository measurement, 2026-10-06
- **Where:** `.gitignore` (4 lines: `node_modules/`, `dist/`, `*.local`, `.DS_Store`)
- **Problem:** The `data/` layer is in scope this sprint and will read
  `import.meta.env.VITE_NASA_API_KEY` (D-006). Vite injects `VITE_`-prefixed values into
  the client bundle at build time, so the key must live in an untracked `.env.local`.
  Nothing currently stops `.env`, `.env.local`, or `.env.production` from being
  committed. `*.local` does **not** cover `.env.local` — it matches the whole name, not
  a suffix.
- **Cause:** no env file has ever existed in this repo, so the ignore rule was never
  needed.
- **Risk:** a NASA API key is committed to a **public** repository. That is an
  irreversible disclosure once pushed — git history keeps it even if the file is later
  removed. It is a shared-key revocation problem for DEMO_KEY and a personal-key
  problem for a registered key.
- **Fix:** add `.env` and `.env*.local` to `.gitignore`, and ship `.env.example`
  listing `VITE_NASA_API_KEY=` with no value. **Not done in this pass** (D-009) — flag it
  as the first thing to do before anyone writes `src/data/`.
- **Note on severity:** latent today, not live. No key exists in the repo yet. It becomes
  live the moment someone creates `.env.local` and commits without this rule.

## ISS-008 — DONKI CORS and reachability unverified

- **Reported by:** network probe, 2026-10-06
- **Where:** proposed `src/data/` space-weather module
- **Problem:** D-005 commits to fetching DONKI directly from the browser. I could not
  establish that this is possible. `ccmc.gsfc.nasa.gov` (DONKI's real host) resolves here
  to `169.254.198.65` — a link-local address — and TCP connect times out on both HTTPS
  and HTTP. The `donki.nasa.gov` and `api.donki.nasa.gov` hosts do not resolve at all.
  No `Access-Control-Allow-Origin` header was ever observed, because no response was
  ever received.
- **Contrast:** `api.nasa.gov` with `DEMO_KEY` returned **200** and did echo the
  request `Origin` back in `Access-Control-Allow-Origin`, so that host is confirmed
  browser-callable.
- **Cause:** unknown. Either the sandbox network cannot route to NASA's CCMC range, or
  the service is unreachable from a browser origin.
- **Risk:** if DONKI sends no CORS header, a direct browser fetch fails at runtime. The
  demo would show dead space weather in front of judges on Nov 14 with no error the team
  anticipated.
- **Fix:** unblocked. Open `https://ccmc.gsfc.nasa.gov/donkinisearch/search?...` in a real
  browser with devtools open and read the response headers. Record the result here. If
  there is no ACAO header, D-005 must be revisited in favour of a proxy (D-005's
  rejected alternative) or baked-in data. **Do not build the data layer before this is
  answered.**

## ISS-002 — Starfield layers drift out and never refill

- **Reported by:** reading `starfield.css` against `starfield.ts`, 2026-10-06
- **Where:** `src/styles/starfield.css` lines 14-39, `src/dom/starfield.ts` lines 25-62
- **Problem:** each `.star-layer` runs `layer-drift`, translating from
  `translate3d(0,0,0)` to `translate3d(0,-50%,0)` over 70s / 120s / 190s. Layers are
  `inset: -10%`, so -50% of layer height is -60% of viewport height. But
  `createStarfield` generates exactly **one** set of stars per layer — there is no
  duplicated copy scrolled alongside it. Nothing ever scrolls in from below.
- **Cause:** a parallax loop normally needs two copies of the content, or the layer
  pattern must wrap. Neither is present.
- **Risk:** the starfield visibly thins out and empties over roughly 70 seconds, on a
  page whose entire content is the starfield. High visibility, low severity.
- **Fix:** duplicate each layer's stars, or wrap the offset so it tiles. **Not done in
  this pass** (D-009) and **not verified in a browser** — the reasoning is from code
  reading only. Confirm visually before fixing; a browser check may show the stars
  staying on screen because of the `inset:-10%` bleed, which would make this a
  non-issue.

## ISS-005 — Mixed CRLF/LF line endings, no `.gitattributes`

- **Reported by:** byte-level encoding audit, 2026-10-06
- **Where:** repository-wide
- **Problem:** 17 tracked text files use CRLF; 6 use LF: `src/sim/deform.ts`,
  `src/sim/frame.ts`, `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts`,
  `src/sim/deform.test.ts`, `src/sim/frame.test.ts`. (Logged before the `core/` →
  `sim/` rename; the same six files.) There is no `.gitattributes`, so
  git has no normalisation policy and depends on each developer's `core.autocrlf`.
- **Measured:** every one of the 23 files decodes as **valid UTF-8, no BOM**. So this is
  not yet a corruption problem — it is a pending-corruption problem.
- **Cause:** files authored on different machines with different editor defaults, with
  nothing recording the intent. Confirmed mechanism: `core.autocrlf = true` in this
  clone's git config and no `.gitattributes`, so the working tree is governed by a
  per-developer setting rather than by the repository. git actively warns during normal
  operations — `warning: in the working copy of 'src/dom/pointerGrab.ts', LF will be
  replaced by CRLF the next time Git touches it` — so the drift is ongoing, not
  historical.
- **Risk:** a contributor with `core.autocrlf=true` commits one of the LF files, and the
  diff shows every line changed. Two developers with different settings produce
  unreviewable diffs and merge conflicts on files nobody edited. This is the documented
  mechanism by which a Windows editor silently rewrites a whole file.
- **Fix:** add `.gitattributes` with `* text=auto eol=lf`, then renormalise once in a
  dedicated commit. **Not done in this pass** (D-009). New files created by this
  documentation pass are LF, so they are already on the correct side of the fix.

## ISS-007 — Google Fonts CDN defeats the offline `dist/` goal

- **Reported by:** reading `index.html`, 2026-10-06
- **Where:** `index.html` lines 17-22
- **Problem:** the page unconditionally requests `fonts.googleapis.com` (two
  `preconnect` hints plus a stylesheet link) for the Orbitron display face.
  `vite.config.ts` sets `base: './'` with the stated intent that a built `dist/` opens
  straight from the filesystem with no server. `base: './'` makes module and asset URLs
  relative; it does nothing about third-party requests.
- **Cause:** the offline-friendly `base` setting was chosen deliberately; the font link
  predates or was overlooked alongside it.
- **Risk:** opening `dist/index.html` by double-click with no network renders in the
  `system-ui` fallback instead of Orbitron, which visibly changes the extruded-slab
  title treatment that `message.css` carefully builds. Three render-blocking external
  requests for one font.
- **Fix:** self-host the font under `Assets/fonts/` and import it through CSS, or accept
  the fallback and say so in the README. **Not done in this pass** (D-009).

## ISS-009 — `DEMO_KEY` is shared and rate-limited

- **Reported by:** interview, 2026-10-06 ("no idea" who owns a key)
- **Where:** proposed `src/data/` NASA module
- **Problem:** D-006 falls back to `DEMO_KEY`, which is a public shared key. I confirmed
  it returns 200 with working CORS, but I did **not** measure its rate limit and am not
  quoting a number I have not observed.
- **Cause:** nobody has registered a personal key at `api.nasa.gov`.
- **Risk:** a shared key can be throttled or revoked at any time, including during the
  Nov 14-15 demo. Six developers hitting it during testing compounds the problem.
- **Fix:** register a personal key before Nov 8 feature freeze and put it in
  `.env.local` (see ISS-006). Ship baked-in fallback data so a throttled key degrades to
  static numbers rather than an empty screen.

## ISS-011 — All three DOM modules have zero test coverage

- **Reported by:** test-run measurement, 2026-10-06
- **Where:** `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts`, `src/dom/starfield.ts`
- **Problem:** all 79 tests cover only the pure mathematics. The three modules that touch
  the DOM — the rAF loop, the resize handler, the pointer grab with velocity sampling,
  and the starfield generator — have no tests.
- **Measured:** `deform.test.ts` 30 tests, `drift.test.ts` 30, `frame.test.ts` 19. Zero
  elsewhere.
- **Cause:** they need a DOM, and there is none available (ISS-013).
- **Risk:** the teardown path returned by `startFloatingAstronaut` and the velocity
  sampling in `pointerGrab` are the most likely places for a leak or a stuck grab, and
  neither is checked by anything.
- **Fix:** add `jsdom` or `happy-dom` as a devDependency and set a per-file Vitest
  environment. Then test that teardown removes every listener and that a cancel mid-drag
  resumes drift.

## ISS-003 — `message.css` comment contradicts itself

- **Reported by:** reading `message.css`, 2026-10-06
- **Where:** `src/styles/message.css` lines 100-101 versus 110-113
- **Problem:** line 101 says the astronaut's drift *"is paused by JavaScript (see
  floatAstronaut.ts), which recentres the sprite."* Twelve lines later the same block
  says the opposite: *"he is no longer parked in the centre, which read as a broken
  page."* The code agrees with the second statement — `floatAstronaut.ts` lines 36-43
  and `main.ts` lines 60-62 both document that reduced motion slows the drift rather than
  stopping it.
- **Cause:** a bug fix updated one comment and missed the other.
- **Risk:** low, but this is the accessibility file. Someone fixing reduced motion will
  read the stale line, believe the behaviour is a parked sprite, and reintroduce the bug
  that was already fixed. Documented behaviour is being contradicted by documentation.
- **Fix:** delete lines 100-101. **Not done in this pass** (D-009).

## ISS-004 — `package.json` has no `license` field

- **Reported by:** repository measurement, 2026-10-06
- **Where:** `package.json`
- **Problem:** a `LICENSE` file exists at the root declaring MIT, Copyright (c) 2026
  Team Akrasia. `package.json` has no `license` key, so `npm` reports the package as
  unlicensed. It is `"private": true`, so npm never publishes it.
- **Cause:** the LICENSE was committed before `package.json`, or copied in from a
  template.
- **Risk:** cosmetic and near-harmless while `private: true`. It matters only if the
  project is ever forked or published, and the NASA attribution requirements make the
  licence worth stating unambiguously.
- **Fix:** add `"license": "MIT"`. **Not done in this pass** (D-009).

## ISS-010 — `src/core/` held DOM modules; the name did not match

- **Reported by:** reading the import graph, 2026-10-06
- **Where:** `src/core/` before this branch
- **Problem:** `core/` contained six modules. Three (`drift`, `deform`, `frame`) are
  pure, DOM-free, and unit tested. The other three (`floatAstronaut`, `pointerGrab`,
  `starfield`) all touch `document`, `window`, `requestAnimationFrame`, or pointer
  events. A layer named `core` whose contents disagree with the universal meaning of
  "core" is what makes an architecture unenforceable: any check script written against
  it would have to whitelist the files it was supposed to police.
- **Cause:** the directory was created when the first pure module landed and never
  revisited as the project grew toward the DOM.
- **Risk:** the false label is what allowed a layer boundary to be unenforceable in the
  first place. Left alone, the next person adds game state and rendering to `core/` too.
- **Fix:** moved the three DOM modules to `src/dom/`, leaving `core/` genuinely pure and
  genuinely tested. Done in this branch. No test imported any of the three, so no test
  changed. **Runtime effect unverified** — the build was re-run but the page was not
  opened in a browser.

## ISS-012 — No CI; nothing runs the checks on push

- **Reported by:** repository measurement, 2026-10-06
- **Where:** no `.github/` directory exists
- **Problem:** `npm test` and `tsc --noEmit` both pass today, but nothing runs them
  automatically. Six developers on the pre-freeze branch is the worst case for this.
- **Cause:** never set up; greenfield repositories usually start without it.
- **Risk:** a broken import or a failing test is discovered by a teammate, not by the
  author, usually at the worst moment.
- **Fix:** add a GitHub Actions workflow running `npm run check` and `npm test` on push
  and pull request. Cheap, and the `check` script already exists to call.
- **Resolution:** `.github/workflows/ci.yml` runs those checks plus HTML validation and
  a production build on pull requests and pushes to `main`. `.github/workflows/deploy.yml`
  deploys only after successful checks on `main`.

## ISS-013 — Vitest runs node-env, so DOM modules cannot be tested

- **Reported by:** test-run output, 2026-10-06 (`environment 0ms`)
- **Where:** `vite.config.ts` (no `test` block), `package.json`
- **Problem:** Vitest defaults to the `node` environment. There is no jsdom or
  happy-dom dependency. Any test touching `document` or `window` fails on import.
- **Cause:** every current test is pure mathematics, which needs no DOM.
- **Risk:** this is the root cause blocking ISS-011. Until it is resolved, the DOM layer
  cannot be tested at all, which means the layer the check script treats as "allowed to
  touch the DOM" is also the layer nothing verifies.
- **Fix:** add a devDependency and annotate the files that need it with a per-file
  `@vitest-environment jsdom` docblock, keeping the pure tests fast.

## ISS-014 — `base.css` calls the page non-interactive while it is draggable

- **Reported by:** reading `base.css`, 2026-10-06
- **Where:** `src/styles/base.css` lines 59-62, `index.html` line 36
- **Problem:** the comment reads *"The page is intentionally non-interactive; block stray
  selections."* The `user-select: none` and `overflow: hidden` are correct, but the page
  is not non-interactive: the astronaut is explicitly pick-up-able and draggable, and
  `index.html` gives it `alt="Cartoon astronaut floating in space, draggable"`.
- **Cause:** the comment described the page as it was before the grab feature shipped.
- **Risk:** cosmetic, but it invites someone to disable pointer events or add an inert
  overlay over a region that is meant to be draggable.
- **Fix:** reword to "block stray text selection; the only interactive element is the
  astronaut." **Not done in this pass** (D-009).

---

**Next free id: ISS-017.**
