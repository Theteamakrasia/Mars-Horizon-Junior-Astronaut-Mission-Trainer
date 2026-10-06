# `debrief/` — explain why the run was won or lost

**Not implemented.** Task: **TASK-031**. Goal: **G-4**. Blocked on **TASK-016**
(`src/sim/sol.ts`).

See `../README.md` for the layout rules.

## This screen is load-bearing, not polish

Because there is no planning phase (D-018), **the debrief is the only place a player learns
why they lost.** Everything else on the screen is convention; this one is the game's
teaching promise.

The project README states it directly: *a run that ends badly is the most educational run
in the game.* If the debrief is thin, the game has no teaching left. Budget it accordingly
— do not treat it as a results table to be added last.

## What the screen must show

From the README, three things:

- **What you used and what you wasted** — resources consumed, tasks completed
- **Which problems you solved early and which ones caught you**
- **The real science behind whatever went wrong**

That third one is the difference between this and a generic score screen. "You ran out of
oxygen" is a result. "Your panels produced nothing for the 12-hour night, and your
batteries were sized for one night rather than two" is a lesson.

## The rule this screen must not break

**No game-over screen that just says "you failed."**

The README rules out a dead end explicitly. A losing run gets a debrief explaining the
actual cause. There is no life to lose, no enemy, nothing shoots at you — failures cost
resources and time, never a life. That is a hard product constraint (AGENTS.md R-20), it
has no automated check, and it is on every reviewer.

Tone matters as much as content: ages 8-16, no violence, no fantasy. The failure should
read as a diagnosis, not a punishment.

## What `model.ts` must contain

Pure attribution logic: given a finished run and the events that produced its end state,
work out **which decision caused the loss**.

This is the hardest pure function in the game and the one most worth testing. A run can
end for several interacting reasons — low power two sols before a dust storm is not the
same failure as no shielding when one hits — so the attribution has to reason over the
event history, not just the final numbers.

If that proves too hard to do honestly, **show the timeline and let the player draw the
conclusion.** A correct timeline beats a confident wrong explanation. Do not ship a
plausible-sounding guess; the README's whole argument is that faking precision teaches
kids to trust data that is not real.

## What `view.ts` must contain

The outcome, the breakdown of resources consumed, completed tasks, the lessons, and a way
back to replay.

## Honesty about approximations

Where the game uses an estimated value rather than a measured one, **the UI must say so.**
The README promises players are told when something is an approximation. If the run used
baked-in fallback data because `api.nasa.gov` was throttled, surface that here — which is
also the natural place to explain what a real DONKI storm would have added. See
`src/data/README.md` and ISS-009.