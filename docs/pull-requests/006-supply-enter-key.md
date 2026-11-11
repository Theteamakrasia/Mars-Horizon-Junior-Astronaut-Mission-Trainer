# PR — Make Enter advance the supply screen like NEXT does

**Branch:** `hw-supply-enter-key`  
**Target:** `main`

## Summary

The supply screen now answers the Enter key exactly as NEXT does. It used to ignore Enter completely until
NEXT had been clicked with a mouse, and even then it only worked because the click left the focus on the
button — the browser activates a focused button on Enter. A key that only works after a click reads as
broken, which is how it was reported from the deployed build.

The briefing screen has answered Enter this way since D-046 (*"NEXT (or the Enter key) swaps in the next
line"*). The supply screen never got the same treatment.

Chasing the report turned up a second defect with the same root cause. The screen's markup is static, so
everything it shows survived a visit: a second trip to `#/supply` came back with NEXT hidden, the answer
buttons still on screen, and **eight** answer options instead of four, because the old ones were never
removed. That was also why Enter would have gone quiet again on every revisit. The screen now resets itself
when it mounts.

## Changes

- `src/features/supply/model.ts`
  - `isPlainEnter(key, modifiers)` — true only for an unmodified Enter. Alt+Enter, Ctrl+Enter and the
    Windows key belong to the browser and the operating system, and answering them would move the beat on
    under a key nobody meant to press.
  - `focusHandlesEnter(tagName)` — true for a focused `BUTTON`, `A`, `INPUT`, `TEXTAREA` or `SELECT`.
    Enter on a focused button already fires a click, so handling it as well would advance twice on one
    press, and on the question screen twice means a wrong answer.
  - Both are pure, with no DOM in the model (R-6). The rules live there because a rule that cannot be
    asserted is a rule the next person to tidy the view file will break.
- `src/features/supply/model.test.ts` — seven new tests, every input a literal, no clock and no randomness
  (ISS-015).
- `src/features/supply/view.ts`
  - One `window` keydown listener, mirroring the briefing's handler in shape and in voice.
  - It advances **only while NEXT is visible**, so a stray Enter cannot answer the ration question for the
    player. The answer buttons are still picked with Enter in the normal way, because the browser does that
    when one of them has the focus.
  - The listener is removed in the teardown, so it cannot go on advancing a screen the player has left, and
    it cannot fight the briefing's own Enter handler.
  - The screen now resets its state on mount: NEXT visible, the answers, the retry, the continue and the
    working hidden, the result empty, and the answer list cleared with `replaceChildren()` (the idiom the
    other screens use).
- `docs/team/issues.md` — **ISS-047**: the triage row and the full entry, logged with an id before the fix
  (R-19) and flipped to fixed in the fix commit.
- `docs/team/decisions.md` — **D-050**: the choice, with the alternatives that were rejected.
- `docs/team/progress-log.md`, `docs/team/tasks.md` (**TASK-065**), `docs/architecture.md` (the supply tree
  rows and the contract table) and `docs/CHANGELOG.md` (a `### Fixed` section).

No other screen's view or model was touched.

## Why not more

- **No shared `ui/` helper for the Enter rule.** The briefing has the same rule inline; extracting it would
  touch a screen that is not part of this fix. It can be done once two screens want it.
- **Enter does not answer the question.** A stray press must never pick an answer for a child. Tab reaches
  the answer buttons.
- **No auto-advance timer**, unlike the briefing. It would take the beat away while it is still being read.
- **The other screens were left alone.** `launch`, `base`, `act` and `debrief` have no Enter handler either.
  Same class of gap, but out of scope here, and recorded so it is on the record rather than forgotten.

## Validation

- `npm run check` — passed (import layers, banned APIs, markup, typecheck).
- `npm test` — passed (441 tests, 19 files; 434 before, seven new).
- `npm run build` — passed, warning-free.
- Driven in a real browser in headless Chrome, with real key and mouse events rather than synthetic ones:
  - Enter advances the first beat with nothing focused — Power → Oxygen.
  - Enter with NEXT focused advances **exactly once** per press; the native click fires and the handler
    stands down, so there is no double-advance.
  - Enter on the question phase does nothing: the beat does not change and no answer is picked.
  - Enter on a focused answer still picks it (the browser's own behaviour, unchanged).
  - Leaving the screen and coming back starts clean — NEXT visible, the answers hidden, four answer
    buttons — and Enter works again.
  - On the briefing, Enter advances the briefing's own line, and the hidden supply screen is not mutated,
    which is how the listener's removal from the teardown was verified.
  - Before the fix, the same script showed Enter doing nothing on the first beat and the answer buttons
    accumulating 4 → 8 → 12 across visits.

There is no DOM test setup in this repo (ISS-011 / ISS-013, TASK-009 open — jsdom is deferred), so the
behaviour was verified in the browser rather than in jsdom. The two rules that decide it are pure and are
covered by unit tests.

**Not yet done:** the screen has not been looked at on the owner's own device beyond the check that
prompted this.

## Review checklist

- [x] Work is on a feature branch; `main` is unchanged.
- [x] `npm run check` and `npm test` pass on the branch.
- [x] The bug was logged with an id before it was fixed (ISS-047).
- [x] Enter advances the facts, and only the facts — it cannot answer the question.
- [x] Enter never double-advances when NEXT already has the focus.
- [x] The keydown listener is removed when the screen unmounts.
- [x] The screen starts from a known state on every mount.
- [x] No new runtime dependency; no DOM in `model.ts`.
- [x] The rules are covered by unit tests.
- [x] The other screens are untouched.
- [ ] Checked on the owner's own device.