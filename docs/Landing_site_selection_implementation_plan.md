# Landing site selection: implementation plan

Mars Horizon, TASK-028 (G-4). Feature freeze: Nov 8 2026.

**Before starting:** log a decision as D-029 for the region table, and take ISS-036 for the START MISSION / Choose landing dead end if you want it closed formally.

## 1. Decisions to record first (15 min)

| Decision | Recommendation | Why |
| --- | --- | --- |
| Where the region table lives | `src/sim/regions.ts` | `base` and `act` need terrain, sun and dust, and R-5 stops them importing `landing-site` |
| Score direction | Every axis is higher = better (Dust 5 = safe, Temp 5 = mild) | The mockup's "Dust 2/5" is ambiguous |
| Totals | All five regions within about ±1 of 17/25 | There must be no perfect site |
| Default state | Nothing selected, LAND HERE disabled | Doesn't imply Jezero is the right answer |
| Sol stepping | Turn-based | Unblocks `base`, `act` and the slice |

## 2. Build order

### Step 1: Data and model (pure, tested)

- `src/sim/regions.ts`: `Region` (id, name, blurb, pin `{x, y}` as stage %, scores). Five regions with authored numbers and no randomness.
- `landing-site/model.ts`: replace the stubs with `scoreRegion`, `tradeoffSummary` (names the best and worst axis, never a "recommended" site), `totalScore` and `strengthAndWeakness`.
- `landing-site/model.test.ts`: literal inputs only. Cover:
  - every region has all five axes, each in 0-5 and an integer
  - totals stay within the agreed spread
  - the summary never contains "best" or "recommended"
  - an unknown id returns a safe result rather than throwing
  - the pin positions are inside 0-100

### Step 2: Markup

- Add `<section id="landing-site">` to `index.html`, placed outside `#landing` and with no hook shared with other screens.
- Hooks needed: stage, map image, `data-landing-pin` ×5 (as `<button>`s), panel, name, blurb, thumbnail A and B, five axis rows, summary, land button, hint.
- Run `npm run check` early. `check-markup` rule 6 fails if a queried hook isn't inside this section.

### Step 3: View and CSS

- `view.ts` imports `./landing-site.css` (R-15) and the map and thumbnail WebPs. It takes the `(root, run, setRun)` signature, so update the stub's signature from `(mount, run)` and register it.
- The stage is locked to 16:9 like `supply` and `interior`, with pins positioned in stage percentages so they stay on the same map feature at any window size.
- Pins are real buttons with `aria-pressed`, visible focus rings, and arrow-key roving between them. The panel is `aria-live="polite"`.
- Don't use `pointer-events: none` in this stylesheet. `check-markup` rule 8 bans it.
- Teardown removes every listener and clears every timer.

### Step 4: Registry and handoff

- Add `landing-site` to `SCREEN_MOUNTS` and `SCREENS` in `registry.ts`.
- Update `registry.test.ts`: `nextStop('interior')` becomes `'landing-site'`, and `nextStop('landing-site')` stays `'landing'` until `base` exists.
- LAND HERE calls `setRun(...)`. If `run` is null (opened by hash), use `newRun(regionId)`. Otherwise use `withState(run, { regionId })`. Then navigate to `nextStop('landing-site')`.

### Step 5: Docs, same commit

`decisions.md` (D-029), `tasks.md` (owner and status), `issues.md` (flip ISS-017 to partly fixed), `progress-log.md` (all four bullets), and `architecture.md` (file tree marks, contract table, plus `sim/regions.ts`). Update `AGENTS.md` §1 and §8 too, since "one screen" is now wrong.

## 3. Assets

- **Map:** one WebP at 16:9, targeting 300 KB or less.
- **Thumbnails:** five WebPs, about 800×450, 60 KB or less each. Only Jezero exists in the mockup.
- **Optional:** a short descent still for the landing transition. Skip it if you're short on time.

## 4. Animation guidance

All CSS, with no `requestAnimationFrame`, so there's no loop to leak. This matches the `naming` and `launch` screens.

### Rules that apply to every effect

They come from past bugs in this repo.

1. **Never load-bearing.** The element's resting CSS must already be the correct visible state. Animations only decorate. This is the briefing and launch lesson.
2. **Timers over `transitionend`** for anything that sequences content (`supply` does this), with a fallback so a suppressed transition can't strand the screen.
3. **`var()` doesn't work inside `@keyframes`.** Use transitions with custom properties for anything data-driven, such as the score dot delay `--i`.
4. **Opacity and transform only**, so nothing triggers layout.
5. **No flashing.** Nothing may flash more than three times a second (WCAG 2.3.1). Pulses should be slow, 2s or longer.
6. **Reduced motion:** a `@media (prefers-reduced-motion: reduce)` block that removes continuous motion (pin pulse, reticle spin) and makes the discrete changes instant. Don't skip content.

### The effects

| Moment | Effect | Timing | Notes |
| --- | --- | --- | --- |
| Screen enters | Map fades up, pins pop in with a stagger | 400 ms fade, 80 ms per pin | Pins are clickable immediately, not after the animation |
| Idle pins | Slow ring pulse (opacity and scale) | 2.4 s loop | Removed under reduced motion |
| Hover or focus | Label brightens, crosshair scales to 1.15 | 140 ms | Same treatment for keyboard focus |
| Selecting a pin | Reticle snaps to it, label turns orange | 180 ms | The previous pin reverts at the same moment |
| Panel update | Name and blurb crossfade, thumbnail crossfades between two stacked layers | 220 ms | Reuse the `supply__scene` front/back pattern, and swap only once the image is ready, with a 700 ms fallback |
| Score dots | Fill left to right, 60 ms stagger per dot | 120 ms each | Use `transition-delay: calc(var(--i) * 60ms)`. Resting state is the correct fill, so the dots never wait on the animation |
| Panel summary | Fades in after the dots | 200 ms |  |
| LAND HERE | Enables with a brief brightness lift on first selection only | 200 ms | No bouncing or looping |
| Landing | Map scales 1.0 to 1.08 toward the chosen pin and fades to black, then navigate | 600 ms | Navigate on a timer, tracked and cancelled in teardown. Under reduced motion, navigate immediately |

### The landing transition

- Disable the pins and button the moment LAND HERE is pressed, so a double click can't queue two navigations.
- Keep the timer handle and clear it in teardown. A navigation firing after the player has left is the "random jump" bug.
- Set `transform-origin` to the chosen pin's percentage position so the push-in lands on it.

## 5. Acceptance checklist

- [ ] `npm run check` and `npm test` pass, and I watched the whole test run (ISS-015 note)
- [ ] No test uses `Math.random` or the clock
- [ ] Interior's "Choose landing site" opens this screen, and LAND HERE moves on
- [ ] Works by keyboard only: Tab or arrows to a pin, Enter to select, Tab to LAND HERE
- [ ] Works by touch
- [ ] Opening `#/landing-site` directly doesn't throw
- [ ] Back and forward don't leave two screens visible
- [ ] `prefers-reduced-motion` verified, and `?motion=` isn't involved
- [ ] No new network request and no `index.ts`
- [ ] The text is readable by an eight-year-old: short lines, no jargon

## 6. Order and time

| Slot | Work |
| --- | --- |
| Day 1 | Steps 1 and 2, then the static view with selection and panel |
| Day 2 | Animation, registry and handoff, docs, then a real browser pass |

The browser pass matters. The repo has no DOM tests (ISS-013), so keyboard and animation behaviour can only be checked by eye.
