# PR — Let the player try again on the ration check

**Branch:** `feat/supply-try-again`  
**Target:** `main`

## Summary

A wrong answer on the ration check no longer takes the screen away on a timer. The
alarm frame now stays up until the player presses **TRY AGAIN**, the working is shown
with the answer left out while they are still trying, and the first wrong answer
gives no direction at all — only the question and the method. The hint ("too low —
think larger") arrives from the second wrong answer on.

## Changes

- `src/features/supply/view.ts`
  - Removed the `RETRY_DELAY_MS` timer that reverted the wrong frame to the question
    frame on its own. The alarm frame now stays up until the player presses TRY AGAIN.
  - Added the TRY AGAIN button, the only live control while the alarm frame is up.
    Pressing it takes the room back to the question frame, re-enables the choices that
    were not retired, and asks the question again in the bubble. The retired option
    stays struck through and stays retired.
  - Focus moves to the TRY AGAIN button when a wrong answer lands, because every
    choice button is disabled at that point and focus would otherwise fall back to
    the body.
  - A first wrong answer gives no hint: the bubble keeps the question so it can be
    read again. From the second wrong answer on the hint appears.
  - The view tracks the line the bubble is heading for (`currentLine`), set when a
    line is asked for rather than when it lands, so it is right even mid-crossfade.
    The retry re-asks the question only when it is not already up.
- `src/features/supply/model.ts` — added `ANSWER_BLANK` and `workingSentenceBlanked`.
  Both versions of the sentence are built from one `workingText` helper so they
  cannot drift apart.
- `src/features/supply/model.test.ts` — five new tests for the blanked working.
- `index.html` — the TRY AGAIN button in the supply rail, hidden until it is needed.
- `src/features/supply/supply.css` — the button's own style, in the alarm colour and
  deliberately distinct from the orange Continue button.
- `docs/team/` — D-028 (the decision, with the alternatives that were rejected),
  ISS-034 and ISS-035 (what was wrong), TASK-040 and TASK-041, and the progress log.

## Validation

- `npm run check` — passed.
- `npm test` — passed (264 tests).
- `npm run build` — passed.
- The flow was walked through with a throwaway DOM stub, because the repo has no DOM
  test setup yet (ISS-013): first wrong pick gave no hint and left the question in the
  bubble; nothing moved after 1500ms; TRY AGAIN returned to the question frame with
  the wrong option still retired; the second wrong pick produced the hint; the right
  answer completed the working and brought up CONTINUE. The stub was deleted rather
  than committed — TASK-009 (jsdom) is the right home for it.

**Not yet done:** the screen has not been looked at in a browser. The rail is one
button taller on the right-answer path, because the completed working now stays up
beside CONTINUE where it used to be cleared. It is bottom-anchored and grows upward
over the wall, but that is worth one pair of eyes.

## Review checklist

- [x] Work is on a feature branch; `main` is unchanged.
- [x] `npm run check` and `npm test` pass on the branch.
- [x] No timer removes a choice from the player.
- [x] The answer is not on screen before it is earned.
- [x] No hint is given on the first wrong answer.
- [x] The retired option stays retired after a retry.
- [ ] Played through in a browser, and the rail checked against the artwork.
