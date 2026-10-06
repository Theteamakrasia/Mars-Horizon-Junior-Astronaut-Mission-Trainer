# Goals

Sprint goal: **a demonstrable Mars Horizon entry by the Nov 8 2026 feature freeze, demoed
Nov 14-15.**

Everything below is written as a done-when list, not a wish. "Done" means someone else
could verify it without asking you. The baseline is the measured state on 2026-10-06:
a polished landing page, a tested physics core, and **no game code at all**.

---

## G-1 — The landing page stays shippable

The "Under Construction" page is the shipped artefact until the game reaches 30% (D-008).

- [ ] Someone other than the author can run `npm install && npm run dev` and see the
      astronaut drift, on a machine that has never seen this repo
- [ ] `npm run check` passes on a fresh clone
- [ ] `npm test` passes **reliably**, not 60% of the time — blocked by ISS-015
- [ ] A built `dist/` opens by double-click with no server and no network (ISS-007)
- [ ] Works with `prefers-reduced-motion: reduce` honoured, including the `?motion=force`
      and `?motion=reduce` overrides
- [ ] Works by touch drag, not mouse only

## G-2 — Physics core is trustworthy

- [ ] `src/core/` stays DOM-free and network-free, enforced by `npm run check`
- [ ] Every exported constant in `drift.ts`, `deform.ts` and `frame.ts` has at least one
      test asserting its *purpose*, not just its value — the existing tests do this well
      and the pattern should continue
- [ ] ISS-015 fixed by removing randomness from the test, **not** by loosening tolerance
- [ ] Suite passes 50 consecutive runs with zero failures
- [ ] `frame.test.ts:81`'s intent is written down: does "open space" mean a pinned
      trajectory, or any trajectory that eventually settles?

## G-3 — The DOM layer is verified, not just written

- [ ] `jsdom` or `happy-dom` added as a devDependency (ISS-013)
- [ ] `startFloatingAstronaut`'s teardown removes every listener and cancels the rAF loop —
      tested (ISS-011)
- [ ] A drag cancelled mid-gesture (`pointercancel`, window blur) resumes drift —
      tested
- [ ] ISS-002 resolved: the starfield either refills or the animation is removed, decided
      **after** someone looks at it in a browser
- [ ] No test depends on unseeded `Math.random()` without pinning its input

## G-4 — The sol plan/act loop exists and is playable

The core loop. This is the largest unstarted body of work.

- [ ] Resource state exists as pure functions in `src/core/` — power, oxygen, water,
      food, shielding, each with a per-sol drain, **with tests**
- [ ] A sol advances: drain applies, forecast events fire, failure states are reachable
- [ ] Plan phase: the player sees the forecast and assigns crew before anything is
      committed
- [ ] Act phase: choices are committed and resolved against the state
- [ ] Losing is informative — a debrief explaining the actual cause, per the README's
      design promise. No "you failed" dead end
- [ ] No violence, no death, no enemies, anywhere — the only loss is resources and time.
      This is a **hard constraint**, not a preference
- [ ] Text is readable by an 8-year-old: no unexplained jargon (README's stated promise)
- [ ] A full run is completable start to debrief without a developer in the room

## G-5 — NASA data is real or honestly labelled

The README's central claim is that the science is real. That claim is currently
**unsubstantiated in code** — there are zero network calls.

- [ ] ISS-008 answered: DONKI's CORS behaviour established in a real browser, result
      written into issues.md
- [ ] `src/data/` is the only layer containing `fetch`, enforced by `npm run check`
- [ ] api.nasa.gov key is read from `VITE_NASA_API_KEY`, never from the repo
- [ ] ISS-006 fixed **before** any `.env.local` is created
- [ ] Every throttled or failed request degrades to baked-in values with a visible
      "approximate" marker — the README promises players are told when something is an
      approximation, and that promise must hold in the UI, not just the README
- [ ] A sol is 24h 39m 35.2s per the GISS source the README cites

## G-6 — The repository is safe to work in with six people

- [ ] `.gitattributes` added and the repo renormalised once (ISS-005)
- [ ] ISS-006 closed: `.env*` ignored, `.env.example` committed with no values
- [ ] CI running `npm run check` and `npm test` on every push (ISS-012)
- [ ] Every file is UTF-8, LF, verified by decoder and not by eye
- [ ] AGENTS.md read by a new contributor who has never seen the project

## G-7 — Ship it

- [ ] Feature freeze Nov 8: only bug fixes after it
- [ ] `dist/` builds, opens from the filesystem, and is the artefact actually submitted
- [ ] NASA attribution present and clearly not implying endorsement (README lines 22-26)
- [ ] Someone who did not write the game can play it and explain the trade-off it taught

---

## Explicitly not goals this sprint

- Supabase auth or save-state (D-003) — no owner, no schedule
- Multiplayer, leaderboards, analytics
- Native mobile packaging
- Replacing the landing page before the game is 30% built (D-008)