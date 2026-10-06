# AGENTS.md

**If a tool looks for `CLAUDE.md`, `CONTRIBUTING.md` or `.cursorrules`, point it at this
file. Do not create those files.**

## 1. What this project is

Mars Horizon is a space-survival strategy game for ages 8-16: you run a Martian outpost
and balance five resources that never stop draining — power, oxygen, water, food,
radiation shielding — over a sol-based plan/act loop. There are no enemies; the hardest
thing you fight is a budget. NASA Space Apps Challenge entry. Feature freeze **Nov 8
2026**, demo **Nov 14-15**.

**The one invariant: `src/core/` is pure — no `document`, no `window`, no network.**

That is what lets 79 tests run in ~15ms with no browser and no mocks, so the game can be
asserted on rather than eyeballed. Everything else here exists to protect it. If you are
unsure where code goes: if it touches the DOM it is not core.

**Current reality, stated plainly: there is no game code.** What exists is a polished
landing page and a tested physics core for a drifting, grabbable astronaut. No resource
model, no sol loop, no save, no network call. The README describes the game; the code is
the landing page.

## 2. Rules

"Enforced" means `npm run check` or `npm test` fails if you break it. "Convention" means
a human upholds it and nothing will catch you.

| # | Rule | Status | Enforced by |
| --- | --- | --- | --- |
| R-1 | `core/` imports nothing outside `core/` | **enforced** | `check` → `layer-boundary` |
| R-2 | `data/` imports `data/` and `core/` only | **enforced** | `check` → `layer-boundary` |
| R-3 | `dom/` imports `dom/`, `core/`, `data/` only | **enforced** | `check` → `layer-boundary` |
| R-4 | `ui/` may import any layer; `main.ts` may import anything | **enforced** | `check` → `layer-boundary` |
| R-5 | No `fetch`/`XHR`/`WebSocket`/`EventSource` outside `data/` | **enforced** | `check` → `no-network-outside-data` |
| R-6 | No `document`/`window` outside `dom/`, `ui/`, `main.ts` | **enforced** | `check` → `no-dom-outside-dom` |
| R-7 | No `alert`/`confirm`/`prompt`, anywhere | **enforced** | `check` → `no-alert` |
| R-8 | No `on*="..."` inline handlers in markup | **enforced** | `check` → `no-inline-handler` |
| R-9 | A relative import that resolves to nothing is an error | **enforced** | `check` → `unresolved-import` |
| R-10 | Typecheck is clean; `strict`, `noUnusedLocals` | **enforced** | `npm run check` |
| R-11 | Tests pass. **Currently violated ~40% of the time** | **enforced** | `npm test`, ISS-015 |
| R-12 | Files are UTF-8, LF, no BOM. Preserve a file's existing endings when editing | convention | **nothing** — ISS-005 |
| R-13 | Branch per person. Never commit to `main` | convention | nothing |
| R-14 | One commit per step, `type(scope): message` | convention | nothing |
| R-15 | Log a bug in `docs/team/issues.md` before fixing it | convention | nothing |
| R-16 | No violence, no death, no enemies. Losing costs resources, never a life | convention | nothing |
| R-17 | Never commit an API key or `.env*` | convention | **nothing** — ISS-006 is open |

R-11, R-12 and R-17 are the ones that will bite you. R-16 is a hard product constraint
with no automated check; it is on every reviewer.

## 3. Data flow

```
index.html → main.ts → { createStarfield, startFloatingAstronaut }
startFloatingAstronaut → rAF tick → stepAstronaut (pure) → render transforms
stepAstronaut → stepDrift (bounce maths) + stepDeform (spring maths)
```

Two DOM reads, **zero network calls, zero storage**. That is the entire runtime today.
There is no game state.

## 4. Boot order

1. `index.html` parses; five visual layers exist.
2. Google Fonts request — the only network request on the page (ISS-007).
3. `/src/main.ts` loads as a module; imports `style.css` first.
4. Vite resolves `floating.png` to a fingerprinted URL.
5. `bootstrap()` waits for `DOMContentLoaded` if still loading, otherwise runs now.
6. Four elements resolved by id via `requireElement`, which **throws** if one is missing.
7. `astronautImg.src` set; `draggable = false` so the browser cannot hijack the drag.
8. `createStarfield()` appends 140 stars in one fragment.
9. `?motion=force`/`?motion=reduce` parsed; OS `prefers-reduced-motion` read.
10. `startFloatingAstronaut()` starts the loop; teardown handle stored.
11. The motion `change` listener attaches **only** without a URL override, so `?motion=`
    is not clobbered by an OS toggle mid-session.
12. First `requestAnimationFrame` scheduled.

## 5. Doc update matrix

Same commit, always.

| If you changed | Then update | Why |
| --- | --- | --- |
| Anything in `core/` | `docs/architecture.md` module contracts | exports are a public contract |
| Added/moved/renamed a file | `docs/architecture.md` file tree + **its empty/partial/complete mark** | a tree entry is a claim about reality |
| A module's exports or signatures | `docs/architecture.md` contract table | callers break silently otherwise |
| Boot order or element ids | this file §4, and `index.html` comments | `requireElement` throws on drift |
| A rule or a `check` script rule id | this file §2 table | a rule with no enforcer is a suggestion |
| Layering or the allow-list | `docs/architecture.md` + `scripts/check-imports.mjs` | they must agree |
| A choice someone might relitigate | `docs/team/decisions.md`, newest first | **including the Rejected line** |
| Any bug, before fixing it | `docs/team/issues.md` — get an id first | an unlogged fix has no history |
| Fixed an issue | flip its `status`, set `fix-in` to the commit | |
| A `KNOWN` entry in the checker | delete it **in the fixing commit** | the set is self-cleaning; a stale entry fails `check` |
| Worked on something | `docs/team/progress-log.md`, newest on top, all four bullets | |
| Took on / finished a task | `docs/team/tasks.md` owner and status | an unowned task is an unowned task |
| Project status or setup | `README.md` — and ISS-001 is still open | |
| The pitch, audience or deadline | `README.md`, `docs/architecture.md` §intro | |

**If a change genuinely needs no doc update, say so explicitly in your final report.
Silence is indistinguishable from forgetting.**

## 6. End-of-change checklist

- [ ] `npm run check` passes
- [ ] `npm test` passes — and I watched the whole run, because it is 40% flaky
- [ ] Did I add a `Math.random()` dependency to any test? Pin the input.
- [ ] Doc matrix §5 satisfied, or you said why not
- [ ] Any bug I hit is logged with an id **before** I fixed it
- [ ] New files are UTF-8 / LF / no BOM — verified with a decoder, not by eye
- [ ] I edited a CRLF file and did not convert it to LF wholesale
- [ ] No key, no `.env*`, no `node_modules`, no `dist/` staged
- [ ] Not on `main`
- [ ] Commit message is `type(scope): message`

## 7. Git conventions

- Branch per person: `git checkout -b <initials>-<what>` e.g. `jk-resource-state`
- **Never commit to `main`.** Open a PR.
- One commit per step. A commit that does two things is two commits.
- `type(scope): message` — `feat(core):`, `fix(drift):`, `docs(team):`, `test(data):`,
  `chore(deps):`, `refactor(ui):`. Types: `feat` `fix` `docs` `test` `chore` `refactor`.
- Never commit `dist/`, `node_modules/`, `.env*`. All already in `.gitignore` **except**
  `.env*` (ISS-006).

## 8. Where things live

| To change | Open |
| --- | --- |
| Game maths: drift, bounce, throw, speed | `src/core/drift.ts` |
| Squash-and-stretch feel, spring constants | `src/core/deform.ts` |
| How drift and deformation combine per frame | `src/core/frame.ts` |
| The rAF loop, transforms, resize, reduced motion | `src/dom/floatAstronaut.ts` |
| Pointer grab, throw velocity, pointer capture | `src/dom/pointerGrab.ts` |
| Star generation and twinkle randomness | `src/dom/starfield.ts` |
| Boot, element lookup, `?motion=` | `src/main.ts` |
| Page structure, element ids, font link | `index.html` |
| Colours, tokens, sizing, `prefers-reduced-motion` | `src/styles/base.css` |
| Astronaut transforms, cursor, sway/breathe | `src/styles/astronaut.css` |
| Title, cursor blink, vignette, reduced motion | `src/styles/message.css` |
| Star layers, twinkle keyframes | `src/styles/starfield.css` |
| Which stylesheet loads first | `src/style.css` |
| Build output, asset handling, offline base | `vite.config.ts` |
| Strictness, module resolution, which files compile | `tsconfig.json` |
| Layer rules, banned APIs, the `KNOWN` set | `scripts/check-imports.mjs` |
| **Anything NASA-API related** | `src/data/` — **does not exist yet** |
| **Any game screen** | `src/ui/` — **does not exist yet** |

## 9. Commands

```bash
npm install
npm run dev        # Vite dev server
npm run check      # layer + banned-API check, then tsc --noEmit   <- run this
npm test           # vitest, 79 tests                             <- 40% flaky, ISS-015
npm run build      # to dist/
npm run preview    # serve the build
npm run typecheck  # tsc alone
```

Run `npm run check` **and** `npm test` before every commit.

## 10. Out of scope — stop and ask

Do not build any of these. Stop, ask, and get a decision recorded in
`docs/team/decisions.md`.

- **Supabase auth or save state.** Deferred (D-003). No owner, no schedule. The most
  dangerous item here: it looks like a small feature and is not.
- **Any API key handling.** Until ISS-006 is fixed. One line in `.gitignore`.
- **Live DONKI fetching** until ISS-008 is answered in a real browser.
- Multiplayer, leaderboards, analytics, telemetry. No backend.
- Native mobile packaging.
- Replacing the landing page before the game is 30% built (D-008).
- Rewriting `README.md`'s status section unasked — ISS-001 is deferred by decision, not
  forgotten.
- Normalising line endings repo-wide without agreement — one-time, everyone's diff.
- A framework, a state library, a build tool, or **any runtime dependency**. The project
  has zero today; adding one is an architecture change.

## 11. Where the detail is

| Question | File |
| --- | --- |
| Full annotated file tree, layering, module contracts, known simplifications | `docs/architecture.md` |
| Why things are the way they are, and what was rejected | `docs/team/decisions.md` |
| What is broken, and how badly | `docs/team/issues.md` |
| What "done" means | `docs/team/goals.md` |
| Who is doing what | `docs/team/tasks.md` |
| What happened last, and what went wrong | `docs/team/progress-log.md` |

**Read those. Do not duplicate them here** — duplication is what makes docs rot, and this
repo already has one file (the README) that disagrees with the code.