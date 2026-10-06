# Decisions

Every choice someone might otherwise relitigate. **Newest first.**

The **Rejected** line is the point of this file. It is what stops the same dead end
being re-explored in week four. If you are about to propose something that appears
under Rejected below, read that entry first.

Format: number · who decided · **Choice** · **Why** · **Rejected** · **Consequence**.

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