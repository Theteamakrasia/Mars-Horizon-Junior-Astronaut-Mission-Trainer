# Progress log

Newest entry on top. Four bullets: **Did**, **Files**, **Problems**, **Next**.

**Problems is the one people skip and the one that matters.** If a change went cleanly,
say so and say why - a clean change with an unexplained problem underneath is worse
than a documented one.


## 2026-11-13 - The landing film's Skip button is in the top right, like the takeoff scene's

**Did**

- **Moved the landing film's Skip button to the top right.** The game has two films, and
  the one control that ends a film was in a different corner on each of them: the launch
  reel's Skip is in the top right (`top: 1rem; right: 1rem`), the landing film's was in
  the bottom right. It is now in the same corner as the launch reel's, at the same
  offsets, and the comment above the rule says why. The button itself did not change -
  same label, same `aria-label`, same focus, and the same three ways out of the film
  (the button, `Escape` and `Enter`).
- **Made the browser check hold the corner.** `tools/browser-check-landing-cinematic.mjs`
  already walked five window shapes to measure the stage; it now reads the Skip button's
  box and the caption panel's box there as well, and asserts that the button is in the
  top-right quarter of the screen and clear of the caption. 40 checks become 50.
- **Logged it before fixing it.** ISS-102 in `docs/team/issues.md` was opened before the
  CSS changed and flipped to fixed with the commit that fixed it (R-19). D-086 records
  the rule, so the corner is not relitigated later.
- **Verified it:** `npm run check`, 1051 tests, the build, and the landing cinematic's
  browser check in headless Chrome - 50/50, no console errors - plus a screenshot of each
  film, looked at.

**Files**

- `src/features/landing-cinematic/landing-cinematic.css` - the Skip button's corner
- `src/features/landing-cinematic/README.md` - where the button is, and why
- `tools/browser-check-landing-cinematic.mjs` - ten new checks
- `docs/team/{decisions,issues,tasks,progress-log}.md` - D-086, ISS-102, TASK-109

**Problems**

- **The launch reel's Skip is not inside its stage, and this one is.** The launch button
  is a direct child of the screen, because that stage used to be letterboxed and a
  button inside it would have been clipped (ISS-041). The landing cinematic's stage is
  the viewport - `inset: 0` inside a fixed screen - so the button inside it is measured
  against the window and not against a picture, and it fades with the stage when the
  film ends, which is what a button that is being pressed out of existence should do. It
  was left where it was.
- **A corner cannot be asserted by `npm test`.** The placement is CSS and the tests are
  pure, so the rule is held by the browser check instead. That is the same trade every
  other layout rule in the game makes.
- **Three other preview servers were already running** (4173, 4174 and 4175), so this
  build was served on 4176 and the check was pointed at it with `BASE_URL`. Nothing that
  was not mine was stopped.

**Next**

- Nothing is left over from this change. The landing film's Skip now sits where the
  launch reel's does, and the check says so at every window shape.


## 2026-11-12 — Drew every pictogram from the supplied icon set

**Did**

- **Replaced the 35 hand-drawn line icons with the 56 supplied drawings.** `Assets/icons/`
  is read at build time with `?raw` and parsed into path data, so the game still draws
  one inline `<svg>` per icon and `icon()` keeps its signature. `src/dom/svg.ts` learned
  colour: a shape now carries its own fill, stroke, width, linecap, linejoin and
  fill-rule, because the drawings are filled and coloured rather than stroked in ink.
- **Made one picture per thing.** `RESOURCE_ICON`, `RANK_ICON` and a new `MODULE_ICON`
  in `src/ui/icons.ts` are now the only maps from a thing to its drawing. The build
  screen, the desk and the debrief show the same water, food and radiation wall, and the
  cargo game's shelves wear the game's own stores. The first pass left the build screen
  drawing its own drop, leaf and shield next to the desk's bottle, carrot and wall — the
  owner saw it and it was wrong.
- **Took the last of the emoji out.** The module emoji left `sim/modules.ts` and the
  encyclopedia model; the stars, the padlock, the tick and the points mark became
  drawings; the speaker, the stop square and the door became plain words, because the
  supplied set has no counterpart for them. The `☰` on the Menu button stays a character:
  it is a dingbat, not an emoji, and it is drawn the same way on every machine.
- **Verified the tree**: `npm run check`, 1051 tests, build, `npm run balance`, and all
  five browser checks — plus screenshots of every screen, looked at.

**Files**

- `src/ui/icons.ts`, `src/ui/icons.css`, `src/ui/icons.test.ts` — the new set, the parser, 11 tests
- `src/dom/svg.ts` — a shape carries its paint
- `src/sim/modules.ts`, `src/features/encyclopedia/{model.ts,model.test.ts}` — the module emoji are gone
- `src/features/{base,act,debrief,encyclopedia,landing-site}/view.ts` — one picture per store; the arrows are chevrons
- `src/ui/{gameLoop,training,trainingCargo,trainingMerge,readButton,nasaCard,nasaFeedCard}.ts` — the last emoji
- `scripts/check-imports.mjs` — relative asset imports resolve, and a drawing nobody draws fails the check
- `docs/team/{decisions,issues,tasks,progress-log}.md` — D-083, ISS-099, TASK-106
- `docs/architecture.md`, `AGENTS.md`, `icons-list.md` — the icon set is described as it is

**Problems**

- **The new drawings are filled pictures, not strokes, so they cannot follow the ink.**
  Every rule that tinted an icon — `color:` on the card, the tile, the callout — is now
  dead, and the CSS had to be retuned: a filled 96-unit picture inks about 57% of its box,
  so the box is 1.55em wide and the ink lands about where the old line drawing did. The
  places where the icon size was in `em` of a wrapper's font-size needed checking one by
  one, and the training game's shelves needed their store pictures made bigger by hand.
- **The `close` drawing has no supplied counterpart**, so the X on the guide, the section
  sheet and the training dialog is still the old line drawing, scaled into the same box
  and keeping its `currentColor` stroke. It is the one icon in the set that is not from
  the folder, and the folder is checked against the code, so it had to be drawn by hand
  rather than imported.
- **The set and the code can drift apart.** The supplied folder was on disk with 56 files
  and the game drew 35 of its own; nothing would have said so. `check-imports.mjs` now
  fails a drawing in `Assets/icons/` that the game does not draw, and it resolves relative
  asset imports as well, so a mistyped asset path fails the check instead of the build.
- **The icons-list.md that came with the set was out of date**: it named `habitat.svg`
  where the file is `habitat-module.svg`, and it listed no `close`. It is rewritten to
  match the files on disk.

**Next**

- The eight module drawings are in the set and mapped, but nothing on screen uses them
  yet — the module artwork on the outpost panel and in the encyclopedia is still the PNG.
  Placing them is a separate decision (D-083, Rejected (g)).

---

## 2026-11-12 — The crew lands through a film

**Did**

- **Put a landing cinematic between the map and the outpost.** The player presses
  LAND HERE, the map fades to black over half a second, and a seventeen-second
  film plays: the approach to Mars, a black beat with one fact, the parachute
  three times - each closer than the one before - and the landing. Then the
  Day 1 screen comes up out of the black, with the how-to-play guide opening by
  itself as it always did.
- **Made the film one clock and one config object.** The whole timeline lives in
  `features/landing-cinematic/model.ts`, and one `requestAnimationFrame` loop
  writes the whole film from one number: the milliseconds of film played. Only
  `transform` and `opacity` are ever written, and the frames are not filtered,
  recoloured or redrawn - they are NASA's, and the game shows them.
- **Kept the zoom going one way.** Every frame of the descent grows from the
  bottom of the frame, so the ground comes up to meet the capsule and the scale
  only ever rises. The landing frame used to grow from a different point than
  the frame before it, and the dissolve read as the camera pulling back.
- **Made the frames WebP, and fetched them early.** Five JPEG photographs were
  the second-largest thing the game downloaded, and they arrived the moment the
  player landed. They are now WebP - 633 KB down to 326 KB - and the shell
  fetches them at startup, so the film opens on its first frame.
- **Taught the region to the screen.** The zone's name is on the film twice, and
  its own NASA fact - verified against the NASA page it came from - is on the
  last shot. Thirteen facts in all, each with its source, all of them in
  `data/landingFacts.ts` so the film works offline.

**Files**

- `src/features/landing-cinematic/` - `model.ts` (the timeline), `model.test.ts`
  (48 tests), `view.ts` (the clock, the preload, the skip, the teardown),
  `landing-cinematic.css`, `README.md`
- `src/data/landingFacts.ts` - the verified NASA facts, and the one for each
  landing region (20 tests)
- `src/ui/landingFrames.ts` - the five frames and the idle fetch
- `src/ui/handoffFade.ts` + `src/ui/handoff-fade.css` - the black curtain the
  outpost comes up through
- `src/ui/routes.ts`, `src/ui/registry.ts`, `index.html` - the screen in the
  journey
- `src/features/landing-site/` - the map fades to black before the film
- `tools/compress-cinematic-frames.py` - the conversion, with the originals kept
- `tools/browser-check-landing-cinematic.mjs` - 40 checks over the new screen
- `docs/architecture.md`, `docs/game-flow.md`, `docs/team/*`, `AGENTS.md`,
  `src/features/README.md`, `src/data/README.md`

**Problems**

- **The last shot zoomed out.** The landing frame grew from the bottom of the
  frame while the chute frame before it grew from the middle, so the two
  disagreed about where the ground was and the dissolve showed the same picture
  at two sizes. It read as the camera pulling back at the worst moment of the
  film. One origin for the whole descent fixed it, and the model now has a test
  that says so (D-085).
- **The film was half a minute long.** The owner asked for a quicker one, and
  it is now seventeen seconds: the same six beats, the same words, less waiting.
- **A picture on its way out revealed the picture under it.** The frames are
  stacked, so the landing frame fading out uncovered the parachute frame
  underneath it - the film went backwards for a moment at the end. A picture
  that is leaving now takes the ones under it with it, and what is left is the
  black the film fades into.
- **Two browser checks were already broken.** The setup window check expected a
  sparkle character that is now a drawn icon, and the training check ran a sol
  without answering the crisis on it, so the sol never happened (ISS-100,
  ISS-101). Both are fixed here.

**Next**

- The eight existing browser checks learn the film's SKIP button, and the new
  one watches the film from beginning to end.
## 2026-11-12 — The supplies are bought in the landing window

**Did**

- **Built the landing window.** It opens by itself when the crew lands, over the build
  screen, and it holds the whole decision: the site and its picture, the five site goals
  with what is still missing, **all six supplies** with their art, cost, count and both
  steppers, the points and the extras, and the six numbers of the outpost. The build
  panel keeps the state of the build — the points bar, the goals, the NASA fact — and a
  **"Choose your extras"** button that opens the window (D-082).
- **Moved the supply list out of the panel, not a copy of it.** The cards in the window
  are the game's own cards: the window carries the `gl--base` class, so the same rules
  draw them. There is one list of modules, one `extras`, and the window calls the same
  `addModule`, `removeModule` and `canPlace` the panel used to call.
- **One way to land.** The window's "Land & start sol 1" and the panel's call the same
  `land()`, so starting the twelve sols behaves exactly as it did.
- **Changed no rule.** No price, no budget, no goal, no survival condition. The window's
  footer says how many goals are ready and never says the run is locked, because the game
  still lets a crew land with a goal unmet on purpose.

**Files**

- `src/features/base/setupPopup.ts` — the window, and `siteGoals()`, the five goal rows
  the panel and the window share
- `src/features/base/setupPopup.css` — the window, in the game's own tokens
- `src/features/base/view.ts` — the card loop is gone; `land()`, `openSetup()`,
  `closeSetup()` and the panel's button are new
- `src/styles/game-loop.css` — one rung in the stacking ladder: 130, the window
- `tools/browser-check-setup-popup.mjs` — 141 checks over the five landing regions
- `tools/browser-check-build.mjs` — follows the cards into the window
- `docs/team/{decisions,issues,tasks,progress-log}.md`, `docs/architecture.md`, `AGENTS.md`,
  `src/features/base/README.md`

**Problems**

- **The reference image wanted a lock, and the game has no lock.** The mock showed
  "12-SOL SURVIVAL IS LOCKED" and a dead button until all five goals were ready. The game
  says the opposite on purpose — "You can land with nothing extra. It is allowed, and you
  will see why it is hard." — so the lock was a new mechanic and was left out; the footer
  reports the goal count instead and the button always works (D-082).
- **A circle crop of the site's own picture showed nothing.** The landing site's
  illustration is a wide one — sky above, landing pads below — so a round thumbnail of it
  was an empty circle of sky. It is now the same 16:9 frame the map uses, which shows the
  place the player chose.
- **The build check pinned where the cards were, not what they did** (ISS-097). It now
  reads them in the window, and it asserts the panel behind it has no cards at all.

**Next**

- The freeze is Nov 8. Nothing here is owed to another screen: the supplies are bought in
  one place, and the five regions share the window.
## 2026-11-12 — A run survives the tab it was played in

**Did**

- **Wrote the run down as it changes.** One versioned `localStorage` key
  (`mars-horizon.save.v1`), written on every `setRun` and after every mount, so the last
  screen the player saw is the one they come back to. D-081 reverses the persistence half
  of D-003 for this device only; Supabase is still deferred and there is still no backend.
- **Greeted the returning player by name.** The menu — which is `naming` (D-021) — now
  shows "Welcome back, Riley.", the sol they stopped on, and CONTINUE / START OVER in
  place of the name field. START OVER clears the save and goes back to asking for a name.
- **Sent CONTINUE to the screen they left**, because the screen is written beside the run.
  A child who closed the tab with the day's work orders open gets the work orders back,
  not a restarted day; the three screens that are not journey stops are never a resume
  point.
- **Loaded the save before the router starts**, so a browser that restored a tab on
  `#/act` gets the desk with its run rather than the desk's "no run" fallback.
- Asserted the whole story in `tools/browser-check-save.mjs`: first visit, start, leave,
  come back, CONTINUE, a reload on the hash, and START OVER.

**Files**

- `src/sim/save.ts` — `SAVE_VERSION`, `encodeRun`, `decodeRun`; pure, 19 tests
- `src/sim/save.test.ts`
- `src/ui/save.ts` — `readSave`, `writeSave`, `clearSave`, `isSaveableScreen`,
  `resumeScreen`; 8 tests over the pure half
- `src/ui/save.test.ts`
- `src/main.ts` — save on change and on mount, clear on a null run, load before routing
- `src/features/naming/{model,view}.ts` — `returningMenu`, the returning block and its
  handlers; `src/features/naming/naming.css`
- `index.html` — the returning block, and the section comment
- `src/sim/run.ts` — the comments that said the run is lost on refresh
- `src/ui/router.ts`, `src/ui/routes.ts`, `src/sim/training.ts`,
  `src/features/landing-site/README.md` — the comments that said there is no persistence
- `tools/browser-check-save.mjs`
- `tools/browser-check-training.mjs` — step 8 now reloads instead of re-walking the
  journey, and waits for the new document (ISS-096)
- `docs/team/{decisions,issues,tasks,progress-log}.md`, `docs/architecture.md`,
  `docs/game-flow.md`, `README.md`, `AGENTS.md`

**Problems**

- **The first draft had a `live` flag** — "your mission is still running in this tab" — to
  tell the in-game MENU apart from a player who had come back. It stopped being answerable
  the moment the save is loaded at boot: a restored run and a live one are the same object
  in the same variable. Dropped rather than faked. The note is a sentence about the run
  ("You stopped on sol 4"), which is true in both cases.
- **A restored tab was the case that nearly shipped broken.** The save is written and the
  menu reads it, but nothing put the run back into `main.ts` before the router ran, so a
  reload on `#/briefing` would have mounted the briefing with no run at all — a screen
  saying "no run" with a perfectly good save on disk. The load now happens before
  `startScreenRouter`.
- **Decoding is forgiving except the spine.** The first version refused any save with a
  field out of range, which would have thrown away a whole run over one bad rover find.
  Now the spine (sol, stores, status, region, name, modules, panel health, science) is
  required and everything past it is repaired from a fresh run.
- **A broken training record would have started sol 1 again**, because that is what
  `newRun` holds. The two-a-sol rule reads its day from the record, so a stale day would
  have *unlocked* the work orders it exists to lock. It now starts the current day
  (`emptyTraining(sol + 1)`), and a test pins it.
- **The browser check read the page it was trying to leave.** For a moment after a
  reload, CDP still evaluates against the old document, and the old document has a
  visible naming screen too — so "wait until the naming screen is visible" answered
  from the page being left, and the check reported a save that was never broken. The
  check now waits for the new document's load event, which cannot be faked. Worth
  remembering for every browser check in this repo, not just this one.
- **The training browser check was already broken, and it was not the game's fault.**
  It reported 37/40 — the same on the unmodified tree, before the save existed. Step 8
  was meant to prove that a refresh does not hand the player the same two training
  games again, and it did that by re-walking the journey from the naming screen — where
  starting a new mission clears the training day, because a new mission is a new day. The
  check destroyed the thing it was about to measure. Logged as ISS-096; it now reloads
  and reads the desk where it is, and waits for the load event like the save check does.
- **`npm run check` and all 996 tests pass**; the save was driven end to end in headless
  Chrome before this entry was written — 15 checks, all green, against the dev server and
  against the production build. The training check is 40/40 again, and the balance still
  holds at every landing site.

**Next**

- There is still no cross-device save and no account: a different browser is a different
  run. Supabase is deferred and unowned (D-003, TASK-022), and nothing here schedules it.
- No migration path between `SAVE_VERSION`s yet — the first bump that needs one will have
  to add it, and until then an old save is ignored rather than migrated.

---

## 2026-11-12 — Pulled main's sprite and shuffle work, and settled the training rule

**Did**

- **Pulled `origin/main`** — a fast-forward to `4febaf6` (PR #35, "s1": the boy sprite's
  glitch, a per-sol shuffle of the day's orders, randomised MCQ answers, the empty boxes
  gone, plus a fix to night power and an optional rover roll in `advanceSol`). This branch's
  commits were already on main, so there was nothing of ours to replay — the tree is main's.
- **Settled the training rule the pull exposed.** `70eb857` added
  `clearTrainingRecord()` so a new run cannot inherit the last run's games and points, and
  left `browser-check-training.mjs` asserting the opposite. The new run wins: the record is
  per run (D-081, superseding D-076's persistence sentence), and the check's last step now
  asserts 0/2 games, the orders locked, the six games playable and no points carried over.
- **Verified the combined tree**: `npm run check`, 962 tests, build, `npm run balance`, and
  all five browser checks — including the encyclopedia gate from the previous commit.

**Files**

- `tools/browser-check-training.mjs` — step 8 asserts the new contract
- `docs/team/{decisions,issues,tasks,progress-log}.md` — D-081, ISS-095, TASK-104
- `docs/architecture.md`, `README.md` — nothing claims a day's training survives a refresh

**Problems**

- **Main was red on its own check.** `npm run check` and `npm test` were both green while
  the browser check failed 3 of 40, because a check is not part of either command. That is
  the fourth time this month the browser pass was the only thing that could see a rule
  change (ISS-074, ISS-090, ISS-093).
- **The decision and the code were both in the tree, disagreeing.** D-076 said the record
  survives a refresh; `70eb857` cleared it on every new run. Only the check could tell, and
  only running it against this tree did.
- **The record is now write-only in practice.** Inside a run `RunState.training` already
  holds the day, and across runs the record is cleared, so the `localStorage` copy no longer
  changes what a player sees. It is left in place — it is the right home for a day's games
  if a save ever lands (D-003) — but it is now maintenance with no visible effect.
- **The pull was a fast-forward, not a merge**, because main already contained this branch
  (PRs #33 and #34). There were no "both sides" to keep; the only thing to reconcile was
  the check.

**Next**

- The day's orders are now shuffled per sol with `Math.random()`, so the checks must keep
  driving by text rather than by position. They do, and they passed twice, but it is the
  kind of change that turns a check flaky a fortnight later.
- `taskOrderSol` remembers the shuffle by sol alone, not by run, so a new run on sol 1 can
  inherit the order the last run was given. Worth a look if the shuffle is meant to feel
  fresh each mission.

---

## 2026-11-12 — The encyclopedia is earned at the outpost

**Did**

- **Gated the book behind the outpost.** The encyclopedia was one click away on every
  screen with the header, the landing-site map included: before choosing a site a player
  could open a reference to every module in the game, and leave the journey from it. The
  book now appears on `base`, `act` and `debrief` — the screens with a landed run — and
  nowhere before them (D-080, ISS-094).
- **Made the option opt-in rather than opt-out**, which is the half of the fix that lasts:
  `showEncyclopedia` draws the book only when a screen asks, so the next screen added
  before the outpost cannot inherit it by forgetting to say no.
- **Answered it with one pure question.** `hasReachedOutpost(run)` in `sim/run.ts` is true
  once a landing site has been chosen, and the three screens ask it. It cannot be "is
  there a run", because `base` draws itself from `newRun('')` when it is handed none.
- **Asserted both ends in the browser check**: no book on the map, a book on the build
  screen.

**Files**

- `src/sim/run.ts` — `hasReachedOutpost`, with four tests in `run.test.ts`
- `src/ui/gameLoop.ts` — the book is drawn only when a screen asks for it
- `src/features/{base,act,debrief}/view.ts` — `showEncyclopedia: hasReachedOutpost(run)`
- `src/features/encyclopedia/view.ts` — the redundant `showEncyclopedia: false` removed
- `tools/browser-check-build.mjs` — the map has no book
- `docs/team/{decisions,issues,tasks,progress-log}.md`, `docs/architecture.md`,
  `AGENTS.md`

**Problems**

- **The leak was a default, not a decision.** Nobody chose to put the book on the map: the
  header shows it unless told otherwise, and when the hub pass (D-070) gave the map the
  same bar for a byte-identical header, the book came with it. A check that only asserted
  the book *exists* on `base` could not have caught it; the new assertion checks where it
  is absent.
- **`base` fabricates a run when it is handed none** (`newRun('', 'Astronaut')`), so a
  screen-local `true` would have offered the book for a run that never landed. That is why
  the gate is a predicate on `regionId` rather than a constant.
- **The merge entry from `78d5596` was committed below main's five entries**, so the file
  had stopped reading newest-first. It sits at the top now, with this entry above it.
- **`decisions.md` carried a doubled `---` and a wrong id** — D-078 said "Logged as
  ISS-077", which is ISS-090 after the renumbering. Both came from the merge; both are
  fixed here.

**Next**

- Nothing asserts the book is absent from `act`'s "not ready" fallback or the debrief's
  empty state. The default makes it true, and a browser check for a screen nobody reaches
  is not worth a run yet.

---

## 2026-11-12 — Merge main's training, day tracker and guide popup, and keep both sides

**Did**

- **Merged `origin/main`** (33 commits: the astronaut training system and its
  two-a-sol lock, the mission-day tracker, the how-to-play popup, the launch skip and
  five play-test fixes) into `game-loop-ui`, keeping both sides: main's training, tracker
  and popup, and this branch's hub, real-data sheet and tool sheet.
- **Renumbered this branch's entries**, because main had taken the ids while the branch
  was open: the mini game's `ISS-077` became **ISS-093** and its `D-072` became
  **D-079**, `TASK-095` became **TASK-101**. The two landing-site bugs got **ISS-091**
  and **ISS-092**, with **TASK-102**.
- **Taught the rover check the training rule.** Every sol starts the two-game count
  again, so a check that opens the orders without training drives nothing; it now trains
  whenever the tile says locked, and the rover is sent on mission 2 as designed.
- **Corrected the test count to 958 in 46 files** in `AGENTS.md`, `README.md` and
  `docs/architecture.md` — main carried 810 in two places while its own README table
  said 958.

**Files**

- `docs/architecture.md`, `docs/team/{decisions,issues,tasks,progress-log}.md` — both
  sides' entries, newest first, with this branch's ids moved up
- `index.html` — main's `tabindex` on the parts panel kept through the reformat
- `tools/browser-check-rover.mjs` — trains whenever the orders are locked
- `tools/browser-check-day.mjs` — a crisis kicker counts as the day's count
- `AGENTS.md`, `README.md` — the test count

**Problems**

- **`index.html` was the merge's silent risk.** This branch had reformatted the whole
  file, so main's new markup — the skip button, the `tabindex` on the parts panel —
  landed in a file whose every line had changed. The merge was clean apart from the parts
  panel, and the skip button survived, but a reformat makes a file git cannot help with.
- **The rover check was green on main and red on the merge**, and the cause was not the
  code: today's tasks are locked until the crew trains, and the count resets every sol, so
  a check that opens the orders without training reads "missing" for five sols and blames
  the rover.
- **The day check assumed no crisis.** On a crisis sol the panel kicker is the crisis
  ("Sol 2 · Supply pod"), so it now only requires the kicker to begin with the day's
  number.
- **The journey check ran green and empty.** It drives the dev server on port 5173, not
  the preview on 4173; run against the preview every step reads "none" and it looks like
  the game is dead — the same lesson as ISS-074.
- **Two `---` separators and a duplicate `D-072`** came out of the merge in
  `decisions.md`, and a full-line `=======` was left in the triage table. All three were
  the merge's, not the content's.

**Next**

- The tool sheet's two exits and the data sheet's length are still worth a look in a
  browser, now that both sit in the merged screen.

---

## 2026-11-12 — The day tracker, built to the reference strip

**Did**

- **Rebuilt the tracker to the reference.** The pips are now **filled** slate-blue
  stations rather than hollow rings, and one rail runs behind all twelve so the track
  reads as a path with stops on it. The path is lit in amber up to the day in play and
  dark ahead of it, so twelve dots become progress the child can see without counting.
- **Put the words on the number's baseline.** "DAY" and "OF 12 DAYS" were floating
  against the middle of the big numeral; they now sit on its baseline, in white and
  bold as the reference shows them. Measured in a real browser, the number's baseline
  and MARS HORIZON's now agree to within half a pixel, so the tracker reads as part of
  the brand rather than a thing floating in the middle of the bar.
- **Made it survive a narrow window.** The pips shrink first and only disappear below
  44rem, so the day number is on the bar at every width the game runs at.

**Files**

- `src/ui/day-tracker.css` — the reference treatment: filled pips, the lit path, the
  baseline alignment, and the shrink-then-hide breakpoints.
- `src/styles/game-loop.css` — `--gl-day-idle`, `--gl-day-idle-ring` and
  `--gl-day-rail`, so the pips and the path are named rather than repeated.

**Problems**

- **The first version was built from the numbers, not the picture.** It had hollow
  rings, segments that stopped short of the next ring, and pale grey words centred
  against the number. Every measurement was correct and it still did not look like the
  thing the player had been shown. The fix was to go back to the reference and take
  its decisions literally — filled stations, one continuous path, a lit path up to
  the day in play — rather than inventing a look of my own.
- **Aligning the tracker took a measurement, not an eyeball.** "Align it with the brand"
  is three different instructions. Centring the group in the header put DAY 2 level
  with the gap between MARS HORIZON and its subtitle; aligning it to the brand's
  middle was no better. A zero-height baseline strut in the live DOM settled it: the
  number's baseline now matches MARS HORIZON's to 0.43px.

**Next**

- The tracker is now built to the reference, so it should be looked at once more in a
  browser at 1920 and at a laptop width before the demo. The narrow case has been
  measured at 1920, 1000, 760 and 640px, but nobody has watched it move yet.

---
---

## 2026-11-12 — The mission day, in the header, for all five landing sites

**Did**

- **Put the day in the header.** The nav bar now carries the mission-day tracker: the
  day in play as a big orange number, "of 12 days" beside it, and twelve pips on a
  rail — one per mission day. A day already flown is a solid Mars-orange dot, the day
  you are on is a solid gold dot with a ring and a slow breath around it, and the days
  still to come are empty rings on a pale rail. The day in play is `sol + 1`, because
  `run.sol` counts the sols already flown, so the build screen reads DAY 1 and the
  desk reads DAY 2 once the first sol has been run.
- **Made it work on all five landing sites.** The tracker lives in the shared chrome,
  so Arcadia Planitia, Jezero Crater, Olympus Mons, Valles Marineris and Argyre Basin
  all get it without a copy each — one implementation, five sites. A new headless
  check lands at every one of the five and asserts the tracker is there, reads day 1,
  and has twelve pips with the first one current.
- **Made the day move.** When a sol is run, the pip for it flashes once and the tracker
  moves to the next day. The day in play breathes the whole time, quietly, so a child
  can see where they are without reading a word.
- **Left the plain sol count alone.** The mission bar still says "Sol 1 of 12". It
  counts the sols flown and the tracker counts the day you are on; they are two
  different questions, and the player asked for both.

**Files**

- `src/ui/dayTracker.ts` (new) — `dayModel(run, advanced?)`, pure, reads the whole
  tracker off a run; `dayTracker(model)`, draws it. `src/ui/day-tracker.css` (new) —
  the pips, the rail, the two animations. `src/ui/dayTracker.test.ts` (new) — 10 tests
  on the model. `src/ui/gameLoop.ts` — `gameHeader(sub?, onLeave?, day?)` and
  `gameScreen`'s `day?: DayModel`. `src/features/base/view.ts`, `act/view.ts`,
  `debrief/view.ts` — one line each. `src/styles/game-loop.css` — the `--gl-amber`
  token the day in play uses. `tools/browser-check-day.mjs` (new) — the browser pass.

**Problems**

- **The act screen rebuilds its whole DOM on every render**, so a CSS animation on its
  own replays every time the player picks an activity — the flash would have fired on
  every click rather than on the day turning over. The act view now marks the sol it
  has just run and holds the mark for 1500 ms, and only that one pip moves. This is
  the same problem the base screen's "card that changed" flash already had to solve.
- **The first version of the model had the last day wrong.** On the twelfth sol the
  current pip came out as "done" instead of "current", because the day in play and
  the day finished are the same number. The test caught it, which is what it was for.
- **The pips could not tell the day in play from the days already flown by colour
  alone.** They now differ in shape as well — solid, solid-with-a-ring, and empty —
  so a child who cannot tell orange from gold can still count the days.

**Next**

- The header and the mission bar now both carry a number about time, close together.
  Worth a look in a real browser before the demo: "DAY 2" in the nav bar and
  "Sol 1 of 12" in the bar below read as two different facts, but a child may not
  spot that.
- `feat/five-mars-locations` also edits `ui/gameLoop.ts`. The tracker is in its own
  file so that merge stays small, but the tracker has to be re-threaded there when
  it lands — that branch has no mission bar and a different `gameScreen` shape.

---

## 2026-11-12 — Six training games on the standing orders sheet

**Did**

- **Put six mini-games in the Standing orders sheet.** The ASTRONAUT TRAINING section
  sits at the top of the rule book, with the day's progress, the six cards and a
  progress bar. Resource Merge, Memory Match, Rover Parking, Solar Panel Power-Up,
  Cargo Sorting and Asteroid Defender are six real games, not six pictures of games
  (D-075).
- **Made the rule a rule, not a button.** Two games a sol, any two of them, and each
  game paid for once a sol. The rules engine refuses a third game and says why, so a
  player who finds a way past the button is not paid for it. Today's work orders are
  locked until the second game is done — the tile is dimmed and wears a padlock, and
  the desk carries a callout saying how to unlock it.
- **Kept the game's own currency and its own art.** The points are science points, the
  `★ N points` the panel already shows, scaled down to 2/3/4; the tiles use the game's
  own 24×24 line drawings, not emoji; the section is the game's cream paper, navy ink
  and one orange.
- **Wrote the day's training down.** The project has no save, so the training record
  is the one thing kept in `localStorage`: a refresh no longer hands the player the
  same two games again, and the points they earned are still on the score.
- **Put every rule where a test can reach it.** Each game is a pure module in `sim/`
  and a drawing module in `ui/` behind one shared contract: 113 new tests, and a
  headless-Chrome check that plays two of the games for real, refuses a third, and
  refreshes the page (37 checks).
- **Took the owner's play-test on board.** A matched pair in Memory Match is now
  **taken off the table** instead of lying there face up, and the asteroid round was
  given **fifty seconds** instead of thirty, with the rocks coming more slowly at the
  start and staying up longer: the round was being lost on the clock rather than on
  the aim. The instructions now say what happens to a pair.

**Files**

- `src/sim/training.ts` — the rules engine: the six games' words, the daily limit,
  the reward table, `trainingDay`, `canStartTraining`, `completeTraining`, and the
  generator the games are handed instead of `Math.random`.
- `src/sim/trainingMerge.ts`, `trainingMemory.ts`, `trainingRover.ts`,
  `trainingSolar.ts`, `trainingCargo.ts`, `trainingAsteroid.ts` — the rules of the
  six games, one module each, with a test file beside each.
- `src/sim/run.ts` — `RunState.training`: what the crew has done today.
- `src/ui/training.ts` — the section, the game dialog, and the record in
  `localStorage`. `src/ui/trainingGame.ts` — the contract. `src/ui/training*.ts` — the
  six games on the screen. `src/ui/training.css` — their styling.
- `src/features/act/model.ts`, `src/features/act/view.ts`, `src/features/act/act.css`
  — the lock on the tasks tile, the callout, and the section in the Standing orders
  sheet. `src/ui/icons.ts` — a padlock.
- `tools/browser-check-training.mjs` — the check.

**Problems**

- **The crates in the cargo round could only be picked up with a mouse.** They were
  selected on `pointerup`, so a keyboard — and the headless check — could not pick one
  up at all. The browser check found it on the first run: the round never finished.
  Selection now happens on `click`, which a keypress and a tap both fire, and the drag
  is kept for the pointer path. It was caught before the commit, so there is no issue
  to log.
- **Two of the three rover maps could not be finished.** The maps were written by eye
  and two of them had the outpost walled off. They are now proved by a breadth-first
  search in the test, and the move budget is built from the shortest route, so a map
  that cannot be finished cannot be shipped.
- **The deck dealt the same number to two cards.** `deck.push({id: deck.length}, {id:
  deck.length})` read the length before either push, so both cards of a pair shared a
  number. The test caught it.
- **The science rank ladder was not re-based.** A player who trains every sol earns
  about ninety-six points over a run, and the ladder tops out at fifty, so the debrief's
  rank now measures the training as well as the work. The reward values were scaled
  down rather than the ladder changed, and the five numbers are the owner's to move
  (D-075).
- **The memory game nearly lost its own win condition.** The win was "every card is in
  the matched set", and the pairs now leave the table and leave that set behind — so
  the count is a counter of pairs found, not the size of a set. Caught by reading the
  code back after the change, before it was played.
- **The memory game compared the wrong two cards (ISS-089).** The cards were numbered
  before the deck was shuffled, so a card's number was not its place, and the game
  compared `deck[number]` — a card the player had never touched. Two identical cards
  were therefore almost never a pair, and the browser check passed anyway because it
  only asked whether *a* pair came off the table: with the wrong comparison one came
  off roughly one time in six. The owner found it by playing. The deck is now shuffled
  first and numbered after, the rule lives in `sim/trainingMemory.ts` where a test can
  hold it, and the browser check reads the face of both cards the game takes away and
  asserts they are the same face.

**Next**

- The owner to decide what the points are spent on: there is no shop in the game to
  spend them in, and the build screen's budget is reached before sol one.
- The owner's eyes on the training in the real game, on a laptop and on a tablet.

---

## 2026-11-12 — The five play-test bugs again, fixed at the cause

**Did**

- Rebalanced the lander's power so its one solar array and one battery carry a night
  (battery 150 kWh, habitat 3 kW, life support 5 kW). Power now recovers each sol (ISS-083, ISS-084).
- Ice miner buildable at every site; the greenhouse's water is recycled by life support; the
  water goal blames flat batteries when that is the cause (ISS-085).
- `keepScroll` keeps every scroll position across a redraw, so narrow and zoomed windows no longer jump to the top (ISS-086).
- The act screen's power card leads with the stored kWh (ISS-087).

**Files**

`src/sim/modules.ts`, `src/ui/gameLoop.ts`, `src/features/base/{model,view}.ts`,
`src/features/act/view.ts`, and the tests that pinned the old numbers.

**Problems**

19 tests pinned the old balance, including "a bare outpost cannot cover a night". They now use
an overloaded outpost (greenhouse and ice miner on one battery) where they need a blackout.
`npm run balance` passes at all five sites. The toast still shifts the panel by its own height
when it goes away; that is layout, not a reset.

**Next**

Watch the balance numbers in a real play-through, and consider the ice miner's yield at
Olympus Mons (2 water gives 6% a sol).

---

## 2026-11-11 — Five play-test bugs on the build screen and the desk

**Did**

- **Made the build card count what the outpost has.** The solar array read `0 / 3` while one
  landed with the crew, because the card drew the extras the player added over the extras
  they may add. It now draws `total / maxCount` (`1 / 4`), and a line says one came with the
  lander. `have / limit` still drive the minus, so the lander's copy cannot be sold (ISS-077,
  D-073).
- **Told the truth about water.** The water goal said "No water source" the moment a
  greenhouse went in, naming neither the module that drinks 3% a sol nor the ice miner that
  would refill it — and at Olympus, where the ice miner cannot be built, nothing connected
  the dead `+` to the failing goal. The sentence is computed from the build and the site now,
  and the site rule is one shared function, `siteAllows`, so the card and the goal cannot
  describe the same ground differently (ISS-079).
- **Split the power card into the two numbers it was conflating.** The HUD reads stored kWh
  against capacity, with the meter's percentage; the day's budget moved to the "For today"
  mini card, and `powerToday` now subtracts the chosen activity's draw, which it ignored. The
  level at zero is real, so the stats sheet carries the last sol's generated/used figures (or
  its blackout) underneath the meters (ISS-078, ISS-082, D-074). The balance is untouched:
  `npm run balance` still passes at 43.2% of builds.
- **Stopped the panel jumping to the top.** Every redraw destroyed `.gl__scroll`, so each
  `+` press, the four-second toast timer and the late-arriving forecast threw the player back
  to the top. Both screens now record the offset and the focused control and restore both;
  the toast removes its own node instead of redrawing. `#/base` reached after the landing no
  longer offers a silent run wipe: the button reads "Land again from sol 1" and says what it
  resets (ISS-080, ISS-081).

**Files**

- `src/sim/modules.ts` — `siteAllows`
- `src/features/base/model.ts` — `siteAllows` in `canPlace`; `BuildCard.maxCount` and
  `fromLander`; the computed water `why`; `RESTART_NOTE`
- `src/features/base/view.ts` — the new card numbers, the lander line, the read-aloud text,
  the restart wording, and the scroll/focus restore
- `src/features/base/base.css` — `.gl__card-lander`
- `src/features/act/model.ts` — `TodayPower.stored`, the chosen activity's draw, `lastPowerLine`
- `src/features/act/view.ts` — `Power stored`, the budget mini card, the power line, and the
  panel-scroll restore
- `src/sim/modules.test.ts`, `src/features/base/model.test.ts`,
  `src/features/act/model.test.ts` — nine new tests, 810 in total
- `tools/browser-check-build.mjs` — the lander copy on the card, a press that keeps the
  panel's scroll, and a bare outpost reading `0 / 100 kWh`
- `docs/architecture.md`, `docs/team/decisions.md` (D-073, D-074), `docs/team/issues.md`,
  `docs/team/progress-log.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- **The zero was never a maths bug.** A bare outpost needs 180 kWh to get through a night and
  stores 100, so it ends every sol at zero by design. Retuning the lander would have erased
  the game's opening lesson, so the fix is reporting only — the card says which number is
  which, and the stats sheet says what the last sol made and used. Recorded because the
  obvious next report will be the same zero.
- **The scroll fix is per screen, which is how it went stale the first time.** ISS-062 fixed
  the sheet's scroll and left the panel's; the same class of bug had to be fixed twice. Both
  `base` and `act` now restore the panel offset in their own `render`, and the browser check
  measures it rather than trusting it.
- **The act card is checked on a bare outpost only.** `browser-check-build.mjs` removes the
  three solar arrays before landing so the battery really does reach zero; a built outpost
  saturates and would not prove the reading moves.
- **No DOM test for the scroll or the focus restore.** Vitest runs without a DOM (ISS-013),
  so the behaviour is covered in the headless-Chrome check.

**Next**

- Nothing open from this pass. The debrief still reports the per-sol ledger, which is where
  the same power figures appear for the whole run.

---

## 2026-11-12 — The how-to-play guide is a popup the astronaut reads

**Did**

- **Turned the guide into a popup.** It was a list of ten panels stacked in a scroll; it is now the crewmate standing on the left and a **speech bubble on the right**, one step per page, with a navy "How to play" pill on the bubble's top edge, a tail pointing at the astronaut, **Next**, **Back**, ten page dots, a **Read aloud** button and a close button. The screen behind is dimmed (D-078).
- **Left the ten steps alone.** They were already one sentence each, written for a child; the problem was how many were on screen at once, not how long each was. `sim/guide.ts` and its six tests are untouched.
- **Made the popup behave like a dialog.** It owns `Escape`, the backdrop click, a Tab trap, `ArrowLeft`/`ArrowRight` to turn the pages, and it hands the focus back to the `?` button when it closes. The whole thing is `aria-modal`, and the page of words is a live region so a screen reader announces each turn.
- **Put the astronaut beside the bubble, not inside it**, and gave the bubble a real tail, so the figure is a person talking rather than a sticker in a balloon. He floats gently, the bubble pops up, and each page slides in from the side you turned from.
- **Fixed the guide being rebuilt on every redraw.** Both the build screen and the desk redraw when the live space weather arrives, and the popup was being rebuilt with the screen — throwing a child reading page three back to page one and replaying the entrance over the top of them. The popup is now mounted on `document.body` and survives a redraw (ISS-090).
- **Kept the existing UI untouched.** The `?` icon already in the header, between the encyclopedia book and Menu, is still the only way in. No new button, no change to the header, no change to the screens behind.

**Files**

- `src/ui/guide.ts` — rewritten: `guidePanel` returns the backdrop, the page state lives inside the popup, and the popup owns the keyboard and the focus
- `src/ui/guide.css` — new: the backdrop, the astronaut's stage, the bubble and its tail, the header pill, the page dots, the footer row
- `src/ui/icons.ts` — a `bulb` pictogram for the header pill, so the set is 35 drawings
- `src/styles/game-loop.css` — the old `.gl__guide*` rules are out, and the stacking ladder now puts the popup at 120, above the leave-mission dialog
- `src/features/base/view.ts`, `src/features/act/view.ts` — the popup is mounted on `document.body` and removed on close and on unmount
- `Assets/images/guide/astronaut.png` — the cutout that stands beside the bubble
- `docs/architecture.md`, `docs/game-flow.md`, `docs/CHANGELOG.md`, `docs/team/decisions.md` (D-078), `docs/team/issues.md` (ISS-090), `docs/team/progress-log.md`, `docs/team/tasks.md` (TASK-096), `README.md`, `AGENTS.md`

**Problems**

- **The guide was reset by a network request.** This was the one real bug, and it only appeared because paging made the page number into state: the old scrolling guide was rebuilt on every redraw too, and nobody could tell, because the words were all on screen either way. It was found by driving the popup in a headless browser and watching it jump back to page one. Fixed by mounting the popup on `document.body` rather than inside the screen (ISS-090).
- **The page-turn animation had to be restarted by hand.** Removing and re-adding a class is the only way to make a CSS animation play again, and it needs a forced reflow between the two — `void content.offsetWidth` — or the browser coalesces the two changes into one and nothing plays. Easy to lose and hard to notice, because the text still changes.
- **The user was testing the wrong server.** There are two checkouts of this repo on the machine, each with a dev server: `localhost:5173` is `feat/day-progress-tracker` and `localhost:5174` is this branch. The old guide on 5173 was not a failure of this work — it was a different branch entirely, fifteen commits behind `main`. Worth knowing that a screenshot of "not working" can be a screenshot of the wrong checkout.
- **The whole app renders dark in some browsers.** Chrome's "Auto Dark Mode for Web Contents" inverts the light theme. It is a browser setting, not the repo: the deployed `index.html` asks for `color-scheme: dark`. The popup keeps its cream bubble either way, which is what the reference art shows, so no change was needed — but it is why the same screen looks different on two machines.
- **The astronaut cutout is a placeholder.** The image the design calls for was not available as a file, so the game's existing cutout is standing in. The artwork is one file (`Assets/images/guide/astronaut.png`) and nothing else depends on it.

**Next**

- The astronaut artwork: drop the final cutout over `Assets/images/guide/astronaut.png` and it updates on the next reload. The bubble's tail and the figure's position are sized for a standing figure, so a transparent background is what matters.
- The guide is still opened by the `?` button on `base` and `act` only. It is in `ui/`, so any screen can take it — the encyclopedia and the debrief are the obvious next ones.

---

## 2026-11-11 — A SKIP button on the launch cinematic

**Did**

- **Gave the launch reel an exit.** The SKIP button appears halfway through the departure —
  2.6 s in, while the press-conference still is on screen — and it cuts the reel straight
  to the spacecraft parts tour. That is the screen the reel ends on anyway, so a player
  who skips sees the same four parts and the same NASA facts, just sooner (D-072). The
  title card is the one beat that always plays.
- **Made the button appear whether or not the clip has buffered.** Tying it to the slot
  rather than to the clip's readiness means a download that has not finished is exactly
  when a player wants a way out, which is the case a skip exists for.
- **Halved the wait for the button.** It used to turn up with the films, 5.25 s in; it
  now turns up at 2.6 s, which is halfway through the departure. The films are eight
  seconds and the departure is five, so an escape hatch that only opened in the second
  half of the wait was not much of an escape hatch.
- **Made the reel actually stop.** Pending timers cleared, `ended` listeners removed, both
  clips paused, and a `skipped` flag — which is what a late `loadeddata` finds, so a clip
  that finishes downloading after the skip cannot restart a film behind the tour. A clip
  that was still downloading is unloaded, so a skipped reel does not pull a megabyte
  nobody will watch.
- **Moved the focus when the tour opens.** The skip button vanishes under the player's
  finger, so the parts panel takes the focus (`tabindex="-1"`).
- **Re-applied the whole thing on top of `origin/main`**, which had rewritten the launch
  reel while this work was uncommitted: `main` gained the shared keyboard rules
  (`dom/keys.ts`), the tour ending on the assembled craft, and a redrawn stage. The skip
  was ported onto that reel rather than merged into it, and the decision was renumbered
  **D-072** because main had taken D-070 and D-071 for the desk hub and the NASA layer.

**Files**

- `index.html` — the button, as a direct child of `#launch` and not inside the letterboxed
  stage; `tabindex="-1"` on the parts panel
- `src/features/launch/view.ts` — `revealSkip`, `stopReel`, the `skipped` flag, the focus
  move, and the teardown reset
- `src/features/launch/model.ts` — `SKIP_LABEL`, `SKIP_DESCRIPTION`, `FILMS_BEGIN_MS`,
  `SKIP_APPEARS_MS`
- `src/features/launch/launch.css` — `.launch__skip`; the dim rule now covers the title
  card, which was the one cinematic layer it missed
- `src/features/launch/model.test.ts` — six tests
- `tools/browser-check-journey.mjs` — drives the skip instead of sleeping through the reel,
  and measures how long the button takes to appear rather than assuming it
- `docs/architecture.md`, `docs/game-flow.md`, `docs/team/decisions.md`,
  `docs/team/progress-log.md`, `docs/team/tasks.md`, `README.md`

**Problems**

- **The button's behaviour is not unit-tested.** Vitest runs in node with no DOM (ISS-013),
  and adding jsdom would be a new dependency (AGENTS.md §10). The model gets coverage for
  the copy and for the timing; the behaviour is covered by the browser check instead.
  Recorded here rather than left looking covered.
- **The teardown has to reset the button and cancel its timer.** The section element
  outlives the mount, so a remount that inherited a visible button would offer it over
  the title card — the one beat that always plays — and a timer left running would
  reveal it on a screen the player had already gone from. Caught by leaving the screen
  and coming back in the browser check.
- **The merge was not a merge.** Git conflicted on exactly the two files `main` had
  rewritten — `launch/view.ts` and `launch.css` — and taking either side would have lost
  something real: `main`'s side loses the skip, this side loses the rewritten stage, the
  Enter handling and the reordered tour. The skip was re-applied to `main`'s version by
  hand, which is why the diff is smaller than the first draft. The same was true of the
  decision: both sides had claimed D-070, so the entry was renumbered rather than
  merged, and `TASK-093` became `TASK-095` for the same reason.
- **The earlier duplicate `launch.css` blocks are gone.** They were this branch's, and
  `main`'s rewrite of the file removed them, so nothing needed doing — noted because the
  first draft of this entry said they should be tidied separately.
- **The journey check passes.** An older entry says it fails on this branch and on
  `origin/main`; it does not. It runs the whole journey with no console errors on both.
  The note was stale, not the check — worth knowing before anyone trusts that line again.

**Next**

- The skip is recorded nowhere. If the debrief should say that a player cut the launch
  film, that is a run flag and a different change.

---

## 2026-11-12 — The NASA dialog always closes, and the map fills the screen

**Did**

- **Gave the landing-site NASA dialog one shape.** The ✕, the backdrop dismiss and the
  opener's focus now exist whether or not a region has been chosen (ISS-091), so "No NASA
  data available for this region." is a dialog a child can leave instead of a dead end.
- **Let the map fill its cell** (ISS-092). The stage kept a 16:9 box and centred it, so it
  was letterboxed inside a column it was already too short for; it now fills the cell and
  the picture crops instead of floating with bands above and below it.
- **Reformatted `index.html`** to the project's line width while in there, and shortened the
  page title from "Mars Horizon — Junior Astronaut Mission Trainer" to "Mars Horizon", which
  is what a tab has room for.

**Files**

- `src/features/landing-site/view.ts` — one modal builder for both states
- `src/features/landing-site/landing-site.css` — the stage fills its cell
- `index.html` — the reformat and the title
- `docs/team/issues.md`, `docs/team/progress-log.md`

**Problems**

- **The first attempt at the dialog removed the modal from the overlay.** Restructuring the
  two branches into one dropped the `appendChild`, so the backdrop drew and the card did
  not: the owner saw a blank blurred screen and reported "no nasa data is being showed now".
  A dialog that renders nothing looks exactly like one that failed to load, and that was
  worse than the dead end it replaced.
- **Both bugs came from a branch that skipped the shared path.** The empty state skipped the
  close button; the stage skipped the fill. Neither was wrong when it was written; both
  became wrong once everything else took the shared path.
- **`tsc` was happy with the broken modal.** The missing `appendChild` is not a type error
  and no test covers the dialog's contents, so only a browser caught it — twice.

**Next**

- Nothing on `landing-site` asserts the dialog or the map's fill in a browser. The build
  check covers `act`'s sheets; a modal check here would have caught both of these.

---

## 2026-11-12 — The mini game gets its own sheet, and stops merging with the desk

**Did**

- **Gave the mini game its own sheet**, layered over the sheet it came from (D-079,
  ISS-093). Pressing "inspect" on an order no longer replaces **Today's tasks** with the
  desk sheet: the tool opens in a sheet of its own, on top, and the orders stay behind it.
- **The desk sheet is the desk again** — a note from home and the rover's find, and
  nothing else, in any state. The tool was never the desk's; it belongs to an order.
- **A tool can no longer outlive its section.** It used to be cleared in one place only,
  so closing the sheet with the ✕, pressing Escape, or opening the guide left it set and
  it was waiting on the desk the next time that opened.
- **Closing the tool puts the player back on the order** they were working — the focus
  lands on that order's inspect button, not on the hub and not on the top of a list.
- **The stacking ladder has its rung written down**: 108, the tool sheet, over the
  section sheet at 105, so the order of the two is a rule and not an accident.

**Files**

- `src/features/act/view.ts` — the tool's own sheet, `closeTool()`, the leak closed, the
  focus, and the desk sheet's new contents
- `src/ui/sheet.ts`, `src/ui/sheet.css` — the `layer` option and the `--tool` backdrop
- `src/styles/game-loop.css` — the ladder's new rung
- `tools/browser-check-build.mjs` — five new assertions
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`,
  `docs/team/progress-log.md`, `docs/team/tasks.md`, `src/features/act/README.md`

**Problems**

- **The bug was two symptoms and one cause**, and the cause was a shortcut that looked
  like it worked: the "inspect" button reached the tool by switching the player to the
  desk sheet. Git merges and type checks were both happy with it; only a child playing it
  noticed that the desk had a mini game in it.
- **`openTool` was cleared in exactly one place** — the second press of the tool's Finish
  button. Every other way out of the sheet (the ✕, Escape, the guide, opening another
  section) left it set, which is why the tool was waiting on the desk later.
- **Two buttons said "Done"** once the tool had a sheet of its own: the tool's own
  Finish/Done button and the sheet's footer button. The footer's is now "Back to the
  orders", so the two say different things.
- **The browser check passed with the bug in place.** It opened the tool and worked it,
  which worked — the tool was simply in the wrong sheet. The check now asserts *where*
  the tool is, not just that it can be worked.
- **The first run of the browser check failed wholesale** because the preview server was
  not running: every assertion after the base screen failed, and the output looked like
  a broken game. It was a dead server, not a broken build.

**Next**

- The tool's sheet has a **Back to the orders** button in its footer and the tool's own
  Finish button in the body. Two ways out of one dialog is fine, but worth a look in a
  browser to see whether a child reads both as the same button.

---

## 2026-11-11 — Merge main's navigation bar and launch tour, and keep both sides' issues

**Did**

- **Merged `origin/main`** into the branch. Main had nine commits since the last merge:
  **one navigation bar** for the game screens (the `--gl-*` tokens moved from `.gl` to
  `:root`, so `landing-site` can draw the same header as `base`, `act` and `debrief`),
  the launch parts-tour fixes (Enter answers, the assembled-craft picture shown once and
  last, the image that shook forever), the launch stage filling the screen, and the
  keyboard rules two screens share, moved into `src/dom/keys.ts`.
- **Every code file merged clean**, including `src/styles/game-loop.css`, where main
  moved the palette to `:root` and this branch removed the mission bar — different parts
  of the same file.
- **Resolved the three documentation conflicts by keeping both sides.** `architecture.md`
  keeps main's rows for `dom/keys.ts` and the navigation bar and this branch's rows for
  the hub, the icons, the sheet and the NASA layer. `issues.md` keeps both sets of
  entries. `progress-log.md` keeps both sides' entries, newest first.
- **Renumbered this branch's five issues to ISS-072…ISS-076.** Main took ISS-067 to
  ISS-070, and this branch had taken the same five numbers for different bugs. Main's
  keep theirs, as in `5acbc40` when the same thing happened last time; every reference
  moved with them, in the docs and in two code comments.

**Files**

- `src/features/landing-site/view.ts` — the one call site the clean merge hid
- `docs/architecture.md`, `docs/team/issues.md`, `docs/team/progress-log.md` — the
  three conflicts, resolved
- `docs/team/decisions.md`, `docs/team/tasks.md`, `src/features/act/README.md`,
  `src/features/encyclopedia/view.ts`, `src/ui/sheet.css` — the renumbering sweep
- `AGENTS.md`, `README.md` — the test counts, 791 to 795

**Problems**

- **The merge was clean in git and broken in TypeScript.** Main's new `landing-site`
  screen calls `gameHeader('LANDING SITE', …)`, and this branch had changed that
  signature to one options object. The two files are different files, so git merged them
  without a word — and `tsc` failed on one line. A clean merge is not a working tree.
- **The issue ids collided silently.** Both sides had ISS-067 to ISS-070 for entirely
  different bugs, and nothing in the merge said so. Only reading both issue files side by
  side showed it.
- **Main's issue entries arrived with the separator and the heading on one line**
  (`---## ISS-069`), which no heading parser likes. They were split apart and their
  headings set to `##`.
- **The first pass at the conflicts corrupted `issues.md`**: a script that looked for the
  conflict markers and found none still wrote the file, duplicating it. The merge was
  aborted, restarted, and the script fixed to refuse to write when it finds no markers.

**Next**

- The header now carries the encyclopedia book, the guide's `?` and the Menu control —
  and `landing-site` draws the same one. It is worth a look in a browser to be sure the
  bar does not crowd the map on a short window.

---

## 2026-11-11 — The "Real data" section is the whole NASA layer, and the sheet stops squashing what is inside it

**Did**

- **Made the "Real data" section the whole NASA layer** (D-071, ISS-075). It holds NASA's
  live daily picture, the saved NASA card for the sol, **the landing region's own
  photograph** — which used to appear once on the landing screen and never again —
  **NASA's own space-weather readings** (the flare class and the day it peaked, strongest
  first, with the source they came from: DONKI, NOAA, or the game's long-run record),
  and two NASA facts to take away. The tile's line of state counts what is behind it:
  "3 pictures · 5 live flares".
- **Carried the live readings out of the loader.** `dom/forecastLoader.ts` kept only the
  game's timetable and threw NASA's own readings away; `LoadedForecast.flares` now holds
  them, and `data/spaceweather.ts` gains `strongestFlares` to order them (A<B<C<M<X, then
  the number) — DONKI can return thirty days of flares and a screen cannot show them all.
- **The forecast stays on the main panel.** It is the game's schedule and it is what the
  player acts on; a flare reading is NASA's, and the two are now kept apart.
- **Fixed the sheet squashing its contents** (ISS-076). The body is a flex column that
  scrolls, and its children were shrinking instead of overflowing, so a NASA picture with
  a fixed aspect ratio poured over its own caption — the card measured 154 px tall with
  522 px of content in it. The body's children now keep their own height.

**Files**

- `src/features/act/view.ts`, `src/features/act/model.ts`, `src/features/act/act.css`,
  `src/features/act/model.test.ts` — the NASA layer and the tile's line of state
- `src/data/spaceweather.ts`, `src/data/spaceweather.test.ts` — `strongestFlares`
- `src/dom/forecastLoader.ts` — `LoadedForecast.flares`
- `src/ui/sheet.css` — the body scrolls, its children do not shrink
- `tools/browser-check-build.mjs` — six new assertions on the data sheet
- `docs/architecture.md`, `docs/game-flow.md`, `docs/team/decisions.md`,
  `docs/team/issues.md`, `docs/team/progress-log.md`, `docs/team/tasks.md`, `AGENTS.md`,
  `src/features/act/README.md`

**Problems**

- **The saved card was for the sol just finished, not the sol being played.** On the
  first day there is no finished sol, so `cardForSol(0)` was null and the section opened
  with no sol picture at all. It now asks for the sol being played, which is also the one
  a player wants to read.
- **Two sheets of the same game, two different "not answered yet" sentences.** The live
  daily picture and the live flare readings each have their own honest note, and the
  first draft said the same thing twice in one section. The space-weather section now
  says it once, with the source underneath.
- **The region photograph is a remote NASA URL**, like the saved cards already were, so
  with no network it is a broken picture. That was accepted rather than shipping local
  copies — the images exist at NASA and nowhere else.
- **The sheet bug was not visible in any test.** It only showed when a child-sized card
  with a fixed-aspect picture was put in a sheet for the first time, and only a
  measurement in a real browser caught it.

**Next**

- The data sheet is a long scroll: three pictures, each with its caption and its fact.
  A child who wants the one fact about the region has to pass two photographs to get it.

---

## 2026-11-11 — The desk becomes a hub of buttons, and every picture is drawn by the game

**Did**

- **Turned the act screen's panel into a hub of buttons** (D-070). Five of them before
  the first sol — Today's tasks, Check desk, Standing orders, Colony stats, View real
  data — and a sixth, *Sol N in review*, once a sol has run. Each is a label and one line
  of state, and each opens its section as a **sheet** over the desk: a dialog with its own
  header, a scrolling body and one close. Nothing opens by itself — the panel's job is to
  be readable at a glance, and a dialog that opens itself hides the glance.
- **Removed the mission bar.** The sol count moved into the panel head's kicker (`Sol 1 of
  12`, not `Sol 0 of 12` — ISS-073) and the science points into its top right corner. The
  header gained two icon buttons beside Menu: a `?` for the guide and a book for the
  encyclopedia. The encyclopedia's Back button now returns to the day mid-run instead of to
  the build screen (ISS-072).
- **Put the last sol's numbers on the tile itself.** The review button carries the sol's
  net change as chips, so a change is never only behind a button (ISS-057).
- **Drew every pictogram instead of borrowing one.** 34 stroked line drawings in
  `ui/icons.ts`, built through `dom/svg.ts`, replacing the emoji on the act screen, the
  HUD, the world signals and the debrief. `sim/activities.ts`, `sim/science.ts` and
  `sim/patches.ts` no longer carry an `icon` field at all: a model may not import `ui/`,
  so the mapping from an id to a picture lives in the view.

**Files**

- `src/ui/sheet.ts`, `src/ui/sheet.css`, `src/ui/icons.ts`, `src/ui/icons.css`,
  `src/ui/icons.test.ts`, `src/dom/svg.ts` — new
- `src/ui/gameLoop.ts`, `src/ui/guide.ts`, `src/styles/game-loop.css` — the mission bar
  gone, the header's actions in
- `src/features/act/model.ts`, `src/features/act/view.ts`, `src/features/act/act.css`,
  `src/features/act/model.test.ts` — the hub
- `src/features/base/view.ts`, `src/features/debrief/view.ts`,
  `src/features/encyclopedia/view.ts`, `src/sim/activities.ts`, `src/sim/science.ts`,
  `src/sim/patches.ts`, `src/sim/patches.test.ts`
- `tools/browser-check-build.mjs`, `tools/browser-check-rover.mjs`,
  `tools/browser-check-journey.mjs` — the build check opens tiles instead of reading the
  scroll, the rover check opens the task sheet to stamp an order, and the journey check
  was pointing at the wrong address (ISS-074)
- `docs/architecture.md`, `docs/game-flow.md`, `docs/team/decisions.md`,
  `docs/team/issues.md`, `docs/team/progress-log.md`, `docs/team/tasks.md`, `AGENTS.md`

**Problems**

- **`sim/` could not hold a picture.** The emoji lived in `sim/activities.ts`,
  `sim/science.ts` and `sim/patches.ts` because the screens wanted them there, and a
  model may not import `ui/`. The fix was to delete the field and map the id in the view
  (`ORDER_ICON`, `PATCH_ICON`, `RANK_ICON`), which means a new activity or rank has no
  picture until someone adds the mapping — the compiler cannot catch that, and the
  fallback ('clipboard', 'star') is what covers it.
- **The journey check was not broken — it was pointing at nothing.** It asked for
  `127.0.0.1:5173` while Vite listens on the IPv6 loopback, so every step printed `none`
  and the check ended with no errors: it could not fail and could not pass. It had been
  reporting that way on `origin/main` for days and it had been read as a game problem
  (ISS-074). With `localhost` the whole journey runs — naming → briefing → supply →
  launch → interior → landing-site → base — with no console errors.
- **The panel's kicker was off by one** because `RunState.sol` counts the sols *completed*.
  It did not show until the number moved next to the button that names the day.
- **An icon test threshold was too strict.** `icons.test.ts` demanded eight characters of
  path data per shape, which failed on `M12 12v8`. It now demands four: long enough to be
  a path, not so long that a short line cannot be drawn.

**Next**

- The hub has five sections and a crisis panel. The **standing orders** are the one that
  grows every sol, and they are still a list inside a sheet — a child has to open the
  sheet to learn that two new rules arrived.

---

## 2026-11-11 — One navigation bar, a stable launch image, and a screen that scales

**Did**

- **Reduced the app to ONE navigation bar.** It had four: `naming__header` (32px, a
  floating bar inset into the page), `briefing__header` (50px, the same idea),
  `landing-site__header` (60px, its own full-bleed design) and `.gl__header`, the shared
  one from `ui/gameLoop.ts` that `base`, `act` and `debrief` already used. The shared
  bar is now the only one: `landing-site` draws it through `gameHeader()` like the
  other three, and the entry screens (`naming`, `briefing`) carry none at all. To make
  that possible the `--gl-*` design tokens moved from `.gl` to `:root`, because a rule
  like `.gl__brand-mark { background: var(--gl-orange) }` resolved to nothing on a
  screen that is not inside `.gl`.
- **Stopped the launch parts-tour image shaking.** It carried an endless one-pixel,
  0.15-degree wobble (`launch-parts-shake`), and `launch.css` held the whole parts
  panel TWICE — the panel, the card, the header, the image and the controls, once from
  line 314 and again from 446, which is why the shake rule appeared twice. Both copies
  of the block are gone. The cinematic's slow camera push is untouched: that one is
  model-driven and is the shot the reel is built around.
- **Made the launch stage fill the screen.** It was locked to 16:9 and centred, so on
  any window that was not 16:9 the cinematic sat in a letterbox with black bars. It is
  now the viewport, and the stills and films are `object-fit: cover` — they grow to
  meet the window and crop a little on the long axis, never stretch.
- **Gave the launch controls their own bar.** Prev / Next / Continue were inside the
  card, below the artwork, so their position depended on the card's height and they
  were pushed off the bottom of the panel on a short window (ISS-041). They are now a
  sibling of the card, pinned along the bottom of the screen, always in the same place
  and never over the picture.
- **Swapped the launch button colours.** NEXT is the orange one — the same `#FA6200`
  fill, `#150800` text and `#ff7b33` hover as the naming page's START MISSION — and
  CONTINUE is the quiet dark button. Two orange buttons on one row was one too many.
- **Made the parts-tour artwork the screen, on a second pass.** It was a small card
  floating in the middle of a black page, and the controls were cut off at the
  bottom of the window. The picture is now the full-bleed backdrop, edge to edge,
  with the name over the top of it and the description and the NASA fact over the
  bottom; the controls are pinned to the bottom of the viewport rather than riding
  on the card's height, so they are always wholly on screen. A screen narrower than
  16:9 is fitted whole instead, because a horizontal crop there would take the
  callout labels off the picture.
- **Made CONTINUE take the orange accent once the tour is over.** NEXT is orange
  while there are slides left; the moment NEXT is greyed out — the player has been
  all the way round the five parts — CONTINUE becomes the orange one, because it is
  then the only way forward. One orange button on the row at a time, always the one
  that moves the player on: stepping back with PREV hands the accent back to NEXT.
- **Put the words in a dock, off the picture.** With the artwork full-bleed, the
  description and the NASA fact were laid out over the lower half of it, straight
  through the "LOGISTICS / SAFE HAVEN" callout, and the fact was clipped by the
  button bar. They now sit in a solid dock along the bottom with the controls,
  below the picture. The artwork is left with nothing over it but its own name,
  on a plate at the top, and every word of the caption is on its own ground where
  nothing can cover it.
- **Made the parts tour answer the Enter key.** It could only be moved through
  with the mouse. It now answers Enter the same way the ration check does: while
  there are parts left it moves to the next one, and on the last slide — the
  assembled craft — the same key carries the player out of the tour, which is
  what CONTINUE does and why CONTINUE is the orange button there. The cinematic
  still has no skip: the key is only answered once the tour is open.
  The two rules that decide this — a plain Enter, and not when a focused button
  already deals with Enter itself — moved out of the ration check's model into
  `src/dom/keys.ts`, because the launch screen could not have had them where they
  were (R-5). Their tests moved with them. The decision itself, what Enter does
  on a given slide, is `tourActionFor` in `launch/model.ts`, so it is tested
  without a browser.
- **Stopped the parts tour showing the assembled-craft picture twice.** The tour
  opened on the whole spacecraft and then **wrapped** back to it at the end, so
  the same picture was on screen at the start and the finish with the four parts
  it names in between — and the picture that shows all four parts was the one
  shown before the player had seen any of them. The tour is now a straight walk:
  propulsion, habitat, logistics, Orion, and then the assembled craft last. NEXT
  on the last slide is greyed out instead of wrapping, the `partsLooped` flag is
  gone, and CONTINUE takes the orange accent there. The assembled-craft picture
  is shown exactly once, and it is the payoff of the tour rather than its
  introduction.
- **Made the landing-site screen scale.** Every size on it was fixed rem and px, so
  nothing grew with the window: a pin label was 13.33px at 1024, 1600 and 1920 alike,
  while the rest of the app scaled. They are now `clamp()`s against the viewport, the
  way the naming page and the game-loop screens write theirs.

**Files**

- `index.html` — the three bespoke headers removed; the launch parts panel restructured
- `src/styles/game-loop.css` — the `--gl-*` tokens moved to `:root`
- `src/features/naming/naming.css`, `src/features/briefing/briefing.css` — the dead
  header rules deleted
- `src/features/landing-site/landing-site.css`, `src/features/landing-site/view.ts`
- `src/features/launch/launch.css`
- `docs/architecture.md`, `docs/team/issues.md`, `docs/team/progress-log.md`

**Problems**

- The branch this started from, `feat/five-mars-locations`, had **diverged from
  `origin/main`**: main had gained the encyclopedia, the placement editor, the
  minigames and the guide, while the branch had the rover, the region events and the
  per-region world art. The reference design the owner asked for — the orange
  rocket badge in the navy header — only exists on `main`, and the branch had already
  replaced it with a Mars planet in a circle. The work was rebased onto `origin/main`
  so the pull request is small and matches what is deployed. **`feat/five-mars-locations`
  is untouched** and still holds the rover work.
- `launch.css` is a CRLF file and the editor could not match multi-line blocks in it,
  so the parts-panel rewrite was done by writing the whole stylesheet and copying it
  back with its line endings intact (R-16).
- The journey check (`tools/browser-check-journey.mjs`) still fails — and it fails
  **identically on `origin/main`**, checked in a clean worktree. It is main's own
  pre-existing failure, not something this work caused.

**Next**

- Open the pull request against `main` and demo the four screens that carry the bar
  next to the two that do not.

---

## 2026-11-11 — Merge main, and put the how-to-play panel above the outpost

**Did**

- **Merged `origin/main`** into the branch. Main had moved a long way — 87 files, 13,000
  lines: the work-order loop, the five goals, the rover, the tools, the guide, the patches.
  Only the seven documentation files conflicted; every code file merged with both sides
  intact, including main's new mission bar and the placement editor's depth rule in the
  same `gameLoop.ts`.
- **Renumbered the ids main had taken**: the issue became ISS-066, the five decisions
  D-065 to D-069, and the five tasks TASK-088 to TASK-092. Main's highest were ISS-065,
  D-064 and TASK-087.
- **Put the how-to-play panel above the outpost.** The modules on the Mars panel take
  z-indexes 0 to 79 — each kind has a band of ten, so the copies of one kind order
  themselves without passing the next kind — and the guide was still at 40. A battery bank
  painted over the panel. The screen now has a written-down ladder: the modules 0 to 79,
  the crewmate 90, the hint 95, the bubbles 98, the guide 100, the leave-mission dialog
  110.

**Files**

- `src/styles/game-loop.css` — the stacking ladder, and the five z-indexes that go with it
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`,
  `docs/team/progress-log.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- The journey check (`tools/browser-check-journey.mjs`) fails — and it fails **identically
  on `origin/main` itself**, checked in a clean worktree. It is main's own pre-existing
  failure, not something the merge caused. The build-screen check
  (`tools/browser-check-build.mjs`) passes 26 of 26 on the merged branch.
- The ids needed renumbering twice. Main's issues file goes to ISS-065, not ISS-049 as
  the first look suggested — the search that found ISS-049 only matched 045 to 049, so
  050 to 065 went unseen until the merge.
- `git show` piped through PowerShell decodes as the console code page, not UTF-8, and
  turns every em dash into three characters. The first merge attempt silently mangled
  three files. The fix was to redirect through `cmd`, which keeps the bytes.

**Next**

- The layout is one arrangement for every landing region. If the outpost should look
  different on different ground, that is a second file and a rule for choosing between
  them.

---

## 2026-11-11 — A fixed stacking order, and the NASA button where it belongs

**Did**

- Gave the outpost a **fixed stacking order**: shields, ice miner, solar arrays,
  greenhouse, nuclear unit, battery banks, life support, habitat — farthest to nearest. The
  copies of a kind **recede** from the camera as they are added, so the first solar array —
  the one that comes with the lander — is the nearest and the fourth is the furthest back.
  The two regolith shields share one depth.
- **`z` is gone from the layout file.** A pose is now where it is, how big, and which way
  round. The order is a rule in code, so the game cannot draw the outpost wrong whatever
  the file says.
- The editor stacks its handles by the same rule, so it is a picture of the outpost rather
  than a different one. Its depth field stopped being editable and now says where a module
  sits — *farthest*, *nearest*, or *3 of 8*.
- **Put the NASA data button beside the region name** on the landing-site screen, and
  filled it with the game's orange so it reads as something to press. It had been landing
  on its own line under the name the whole time: the panel is a flex column, so the `<h3>`
  and the `<button>` were separate flex children, and the `margin-left` on the button only
  indented it.
- Kept the developer's own layout in full: every position, every width, and the mirrored
  regolith shield.

**Files**

- `src/ui/baseLayout.ts`, `src/ui/baseLayout.json`, `src/ui/baseLayout.test.ts`
- `src/ui/gameLoop.ts`, `src/ui/gameLoop.test.ts`
- `src/ui/baseLayoutEditor.ts`, `src/ui/base-layout-editor.css`
- `index.html`, `src/features/landing-site/landing-site.css`, `src/features/landing-site/view.ts`
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- The NASA button's colour did not apply at first: `.landing-site__button--nasa-data` sat
  **above** the plain `.landing-site__button` rule, and with the same specificity the later
  rule wins. The `--land` modifier was already after the base rule; this one was not, and
  had been left where the old inline NASA picture used to be.
- The NASA button and its modal were both still uncommitted work, so the markup and the
  logic had to land together — the markup on its own is a dead button. That commit carries
  the developer's landing-site work; the `#encyclopedia` hunk in `index.html` was staged out
  with a patch and stays uncommitted with the rest of the encyclopedia.
- Verified in headless Chrome: a new harness reads the **computed z-index** of every
  rendered module and asserts the order is exactly the one asked for — 9 checks, including
  that all fifteen copies in the editor stack correctly. That is the check that would have
  caught the original problem, rather than a screenshot. `npm run check` clean; `npm test`
  503 passed in 22 files (was 492; +7 layout tests and +4 for the stacking order).

**Next**

- The layout is one arrangement for every landing region. If the outpost should look
  different on different ground, that is a second file and a rule for choosing between
  them.

---

## 2026-11-11 — Say so when the layout file is not clean

**Did**

- A layout file with a problem in it now **warns rather than breaks**: a dev-only console
  warning at boot, and a banner at the top of the placement editor's toolbar listing every
  problem it found.
- **Fixed a bug that would have destroyed the developer's layout.** The editor was seeding
  its state from the authored default instead of from the file on disk, so opening it and
  pressing Download replaced the layout with the grid. It now opens showing the file, and
  Reset puts everything back the way it was.
- **Fixed a second bug the developer's own layout exposed.** Selecting a copy from the
  dropdown did not re-paint, so the copy stayed underneath its neighbours and the pointer
  grabbed the wrong module. Selection now brings the copy to the front.
- The developer's own layout is now the shipped one: `src/ui/baseLayout.json` holds their
  arrangement, with one mirrored regolith shield.

**Files**

- `src/ui/baseLayout.ts`, `src/ui/baseLayout.test.ts`, `src/ui/baseLayoutEditor.ts`
- `src/ui/base-layout-editor.css`, `src/main.ts`, `src/ui/baseLayout.json`
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- A test asserted the shipped layout contains **no mirrored modules**. That was the wrong
  kind of test: it pinned the content rather than the contract, so it failed the moment a
  developer did the one thing the tool is for. It now asserts every flip in the file is a
  real boolean, which holds either way.
- The two editor bugs above were both invisible while the layout was the authored grid. The
  second one only appeared because the developer's solar arrays overlap, so selecting one
  put it under another — and the harness that caught it had been written with the old
  positions hard-coded into it. The harnesses now read their expectations from the layout
  file, because a test that breaks when the developer does their job is a test that will
  be deleted rather than fixed.
- Verified in headless Chrome: 15 checks that a broken file produces the banner and the
  console warning, that the game still renders, that the out-of-range number was clamped
  rather than thrown away, that the unreadable entry fell back to the default, and that
  restoring the file clears the banner. All six harnesses green — 75 checks.

**Next**

- The layout is one arrangement for every landing region. If the outpost should look
  different on different ground, that is a second file and a rule for choosing between
  them.

---

## 2026-11-11 — Turn a module around

**Did**

- Added **mirroring** to the placement editor. A **⇄ Mirror** button in the toolbar toggles
  the selected module, and the **F** key does the same on a focused one. The artwork
  turns around in place — the mirror is about the picture's centre, so flipping a module
  does not move it.
- A mirrored module carries a small blue badge on the panel, always visible: whether a
  module faces one way or the other is a state of the outpost, not a label you are
  reading.
- Added an optional `flip` to a pose. It is written to the layout file only for a module
  that is actually mirrored, so the shipped file is unchanged and a missing `flip` still
  means "not mirrored".
- Added `src/ui/gameLoop.test.ts` — the first tests for that file — covering where each
  copy of a module stands and which way round it faces.

**Files**

- `src/ui/baseLayout.ts`, `src/ui/baseLayout.test.ts`, `src/ui/gameLoop.ts`
- `src/ui/gameLoop.test.ts` (new)
- `src/ui/baseLayoutEditor.ts`, `src/ui/base-layout-editor.css`, `src/styles/game-loop.css`
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- The editor mirrors the **artwork**, not the handle. Mirroring the handle would have
  flipped the resize grip to the bottom-left and the label with it. Mirroring the inner
  image keeps the grip where the hand expects it, and makes the editor's picture match
  the game's exactly.
- `clampSpot` and `roundSpot` now normalise `flip` to a real boolean, so every pose that
  comes out of the resolver has a definite answer. That changed six existing test
  expectations, which is the right kind of change: the shape of a pose is now fixed.
- Verified in headless Chrome over the DevTools Protocol: 14 checks that the button
  flips, the F key flips, the badge shows only on mirrored modules, the resize grip stays
  on the right, mirroring does not move the module, and — the one that matters — a
  mirrored module renders mirrored **in the game**: flip a habitat, save the file,
  reload, and the habitat is drawn turned around while the battery bank is not.
  `npm run check` clean; `npm test` 492 passed in 22 files (was 480; +12 mirror tests and
  +5 for the new game-loop file).

**Next**

- The module artwork was drawn for one facing each. If an outpost ends up with several
  solar arrays all turned the same way, the array will read as a machine rather than a
  field — the editor can now fix that, but the fix is a design pass.

---

## 2026-11-11 — A pose per module copy, and a way to resize one

**Did**

- Changed the layout file from one pose per kind to a **pose list per kind**: one entry
  per copy the player could build, in build order. The second solar array the player
  builds now stands on the second `solar-array` entry, so every copy can be placed on
  its own instead of being derived by stepping right and shrinking.
- `ui/gameLoop.ts`'s `moduleFigures` no longer derives anything — it asks
  `poseFor(poses, kind, copy)` where each copy stands. The derivation survives only as a
  fallback for a file with fewer poses than the player can build.
- Gave the editor all fifteen copies at once — four solar arrays, four battery banks, two
  regolith shields and one of everything else — each draggable on its own.
- Added **scaling**: a grip on the bottom-right corner of every module that changes its
  width when dragged sideways. The height follows the artwork's proportions, so width is
  the only dimension. `+` and `-` do the same from the keyboard.
- Added an **instance picker** to the toolbar, because copies overlap and a copy you
  cannot see is a copy you cannot grab. Picking one selects it and brings it to the
  front.
- Took the **crewmate sprite off the build screen**. It stood exactly where the modules
  go. The speech bubble stays — that is the crewmate's voice, not the picture.
- The default file encodes the layout the game was already drawing, so nothing moves on
  upgrade.

**Files**

- `src/ui/baseLayout.json`, `src/ui/baseLayout.ts`, `src/ui/baseLayout.test.ts`
- `src/ui/baseLayoutEditor.ts`, `src/ui/base-layout-editor.css`
- `src/ui/gameLoop.ts`, `src/features/base/view.ts`
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- The first draft gave `nuclear-unit` two poses, because it was copied from
  `regolith-shield`. `nuclear-unit` has `maxCount: 1` — one nuclear unit, ever — so the
  second pose would never have been drawn. The validator caught it by reporting the
  surplus.
- A module that started at 90% with a width of 24% hung off the right-hand edge of the
  panel: the CSS clamp only knows the left edge. `clampSpot` now pulls the width in so
  `left + width` never exceeds the panel.
- Copies of a kind overlap by default, so clicking one can grab another. Raising the
  selected copy to the front fixes it, and the picker makes it selectable at all.
- `src/features/base/view.ts` already carried an uncommitted line from the encyclopedia
  work. The sprite removal was staged as a patch so that line stayed in the working
  tree — committing it would have taken the "needs" text off the cards without the
  encyclopedia that replaces it.
- Verified in headless Chrome over the DevTools Protocol: 20 checks on the editor (15
  handles, per-copy dragging, the grip, the picker), 10 across the other screens, 9 on a
  screen re-render, and 6 on the round trip (drag the third solar array → save the file
  → reload → build three solar arrays → the third stands at 33.9%, exactly where the
  file says). `npm run check` clean; `npm test` 480 passed in 21 files (was 471; +9 layout
  tests).

**Next**

- The fifteen copies now sit where the old derivation put them, which means they
  overlap. Spreading them out is a design job, not a code one — and it is the reason the
  editor exists.

---

## 2026-11-11 — Move the outpost layout into a file, and add the placement editor

**Did**

- Took the module layout out of `ui/gameLoop.ts` and into `src/ui/baseLayout.json` —
  `{left, bottom, width, z}` per kind, in percent. `src/ui/baseLayout.ts` loads it,
  validates every number and falls back to an authored default for a kind it cannot
  supply, so a hand-edited file can never white-screen the game.
- Built the placement editor: open the game with `?editlayout=1`, drag the eight modules
  on the **real** outpost panel, and download `baseLayout.json`. A toolbar shows the
  selected module's numbers, the JSON it would write, and Download / Copy / Reset / Done.
  Arrow keys nudge; the number fields take exact values.
- Made the editor a developer tool rather than a screen: no route, no mount point, no
  registry entry, and `main.ts` loads it with a dynamic import behind `import.meta.env.DEV`,
  so it is compiled out of a production build entirely.
- Declared the band a module may be placed in once, in `SPOT_BAND`, and added
  `check-markup` Rule 11 to fail the build if the CSS clamp and the band ever disagree.
- Deleted the abandoned `drag-editor` feature and the stray copies of it at the repo root
  (ISS-066). It had eight TypeScript errors, failed the markup check on `pointer-events:
  none`, and was unreachable — no route, no mount, no registry entry.

**Files**

- `src/ui/baseLayout.json`, `src/ui/baseLayout.ts`, `src/ui/baseLayout.test.ts` (new)
- `src/ui/baseLayoutEditor.ts`, `src/ui/base-layout-editor.css` (new)
- `src/ui/gameLoop.ts`, `src/main.ts`, `src/ui/routes.ts`, `tsconfig.json`, `scripts/check-markup.mjs`
- `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`, `docs/team/tasks.md`, `AGENTS.md`, `README.md`

**Problems**

- The abandoned `drag-editor` was never wired to a route, so nothing exercised it and
  `npm run check` was the only thing that would have caught it. It had been left in the
  tree long enough to break the build.
- The CSS clamp on `.gl__figure` is a *silent* transform: author 40% and the screen shows
  32%, with nothing reporting it. The band now lives in TS, the editor clamps to it, and
  Rule 11 keeps the CSS in step — so a position in the file is the position on the screen.
- `moduleFigures` was producing duplicate modules at `bottom: 34`, which the CSS clamp
  quietly pulled back to 32. It now clamps into the band itself, which renders exactly the
  same as before and stops the two rules disagreeing.
- The editor's overlay sits on `document.body`, not inside the screen: `features/base`
  replaces every child of its mount when the live forecast arrives, which would have
  destroyed a drag in progress. A `MutationObserver` on the mount finds the new panel.
- Verified in headless Chrome over the DevTools Protocol, since the project has no DOM
  test environment: 19 checks on the editor, 10 across the other screens, and 5 on the
  round trip (drag → JSON → save the file → reload → the module is where the file says).
  `npm run check` clean; `npm test` 471 passed in 21 files (was 447; +31 layout tests,
  -7 from the deleted feature).

**Next**

- The layout file is still one arrangement for every site. If the outpost should look
  different in different regions, that is a second file and a rule for choosing between
  them — worth deciding before the demo rather than after.

---

## 2026-11-11 — Make the game playable, and make it follow

**Did**

- **Fixed the balance.** The game was unwinnable: at fourteen build points no legal build at any of the five landing sites was self-sustaining, and **zero of 3,558 measured runs** ended with all five science goals satisfied. Five constants in `sim/modules.ts` moved — budget 14→18, greenhouse water 5→3, greenhouse load 8→6, shielding base 20→30, shielding erosion 1→0.5 — and the win rate is now **41–45%**.
- **Made the goals the learning outcomes rather than a score.** `GOAL_TARGETS`, `goalScore` and `goalsEarned` are gone. `sim/goals.ts` now reports what the player kept running and for how long. The debrief prints the standing orders the player worked under as the keepsake.
- **Turned the sol into a desk.** Three work orders, each with two readings to check, some with a tool to work them with, and the player approves one. Twenty-four standing orders grow two a sol. The science points and the rank stay; the stars from a tool now multiply the science an order is worth, and touch no store.
- **Put the rover in the run.** Its state is `RunState.rover`, it is sent out by a work order, it drives on sol time, and it comes back with a document on the desk. `sim/rover.ts` now holds the rules *and* the catalogue of real finds.
- **Made it follow.** A guide of ten steps, each saying where it happens and what to do about it, which opens by itself the first time the player reaches the build screen and comes back from a button in the mission bar. The briefing now says what a day is before the player has to live one.
- **Fixed the things a play-test turned up**: the power card read 0% while the game let the player spend power; clicking a goal threw the player back to the top of the panel; building a module moved no number on the HUD; the build card counted the extras while the limit counted everything; the sol recap sat below the fold; the play screens carried 85 to 139 words.
- **`npm run balance` exists now** and fails the build when a site cannot hold all five systems. It is the only thing that catches the game becoming unwinnable, and the game was unwinnable for a long time before it existed.

**Files**

- New: `src/sim/{standingOrders,minigames,guide,patches,deskNotes}.ts` and their tests, `src/ui/{activityPlayer,guide}.ts`, `tools/balance-check.mts`, `tools/browser-check-{build,rover,journey}.mjs`.
- Rewritten: `src/sim/goals.ts`, `src/sim/activities.ts`, `src/sim/modules.ts`, `src/features/{act,base,debrief,briefing}/`, `src/ui/gameLoop.ts`, `src/styles/game-loop.css`.
- Deleted: `src/data/roverFinds.ts` and its test, `src/ui/roverWidget.ts`, `src/ui/rover.css` — the rover's catalogue moved into `sim/rover.ts` because the simulation now owns the whole lifecycle of it.
- Docs: `AGENTS.md`, `docs/architecture.md`, `docs/game-flow.md`, `docs/team/{decisions,issues,progress-log,tasks}.md`, `README.md`, `src/data/README.md`.

**Problems**

- **The game was unwinnable and nothing said so.** Every unit test passed, every browser check passed, and a sensible build still lost every run. The tests checked that the arithmetic was *correct*, not that it was *playable* — the balance lived in five constants that nothing read against each other. This is why `npm run balance` now exists (D-064): a check that only lives in a human's head is a check that stops being run.
- **The power card and the rules contradicted each other.** The batteries drain through the night, so the level left at dawn is near zero even for a healthy outpost; the card showed that level, so it read 0% while the game happily let the player approve a 25 kWh activity. The card now shows what is left *after* the panels have filled the batteries and the systems have taken their share — which is exactly the number the activity prices come out of.
- **Two different counts for the same limit.** The build card counted the modules the player had added; the limit counted the module the lander brought as well. Solar Array has a limit of four and the lander brings one, so the card read `3` with a dead button and no sign that three was the most. `sim/modules.ts` grew `extraLimitOf()` and the card reads `3/3`.
- **A stale module in the Vite dev server.** The guide's `?` button would not render and it was not the code: the server was serving a cached `gameLoop.ts`. Restarting Vite fixed it. If a change is "not there", restart the dev server before debugging the code.
- **`act` rebuilds its whole screen on every press.** That is why the rover could not live in the DOM (D-062) and why clicking a goal threw the player back to the top of the panel — both are fixed by not re-rendering the whole thing for a small change.
- **The words.** The act panel carried 85 words before a sol and 139 after one, and the five goals alone were about 100 of them, all below the decision the player had come to make. It is now 64 and 97, the recap is the first thing on the panel, and the science behind each order is one tap away.
- `npm run check` clean; `npm test` **701 passed** in 32 files; `npm run balance` PASS at every site; production build succeeds. `tools/browser-check-build.mjs` passed 25/25, `tools/browser-check-rover.mjs` 9/9, and `tools/browser-check-journey.mjs` drove the whole journey with no console errors.
- **The build screen's browser check failed on a third of its runs, and chasing it found a real bug.** The check assumed a desk that was always there and a tool that was always the checklist. The desk is not always there — a crisis replaces it, and the forecast's timetable is rolled per page load — and the tool is not always the checklist, because the tools unlock over the run. Once the check was taught to resolve the crisis and to work whichever tool it was handed, it failed again, and the reason was worth more than the check: **sol 3 had no tool at all.** Its three orders were the rover survey, the site map and the experiment, whose tools (radar, sorting, packing) were all still locked. The desk was three buttons. The tools now unlock one a sol for the first six, and a test over the whole plan says every sol leaves at least one order the player can work (ISS-065).
- **The sorting tool could never earn three stars.** Its `done()` said "finished when all six items are chosen", while its grading says "three stars when the three good ones are chosen and the other three are not". Nothing called `done()` at all, so the contradiction sat there unread (ISS-065).

**Next**

- Play it again from the naming menu with a child, and watch the **second** sol. The first one has the guide and the notes; by sol three the board has six rules and the desk has a letter on it, and that is where the thread is easiest to lose.
- Decide what the rover's finds are *worth* in the debrief — they are recorded now, but a player cannot yet tell whether a find changed anything.

---

## 2026-11-11 — Add the rover

**Did**

- A round rover button on the left edge of `base` and `act`. At base it asks before deploying, then says "Rover deployed!". While exploring, pressing it opens a small window with the rover animation and a "Bring rover back" button.
- Out exploring, the rover finds real NASA items on a timer: historic sites (Viking 1, Pathfinder and Sojourner, Beagle 2, Schiaparelli) open a large picture-and-story window; rare rocks (Heat Shield Rock, Block Island, the leopard-spot rock) can be collected or left. A red dot sits on the button's top-left until the find is answered.
- The rules are pure and tested: `sim/rover.ts` takes the pick as a number, so nothing is random inside `sim/`. The draws themselves are seeded from the clock, the same way the forecast is.
- `naming` resets the rover at the start of every run.

**Files**

- New: `src/sim/rover.ts`, `src/sim/rover.test.ts`, `src/data/roverFinds.ts`, `src/data/roverFinds.test.ts`, `src/ui/roverWidget.ts`, `src/ui/rover.css`, `tools/compress-rover-assets.py`, `tools/browser-check-rover.mjs`, `Assets/images/rover/`.
- Edited: `src/ui/gameLoop.ts`, `src/features/base/view.ts`, `src/features/act/view.ts`, `src/features/naming/view.ts`, `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/game-flow.md`, `docs/team/{decisions,progress-log,tasks}.md`.

**Problems**

- **The picture addresses were dead.** `photojournal.jpl.nasa.gov/jpeg/<PIA>.jpg` now redirects to a web page and returns HTML, not a JPEG, so every rover find would have dropped its picture and shown the placeholder instead. The pictures live on NASA's asset CDN now, under a folder built from the PIA number, and all seven were checked against the live server. `data/roverFinds.test.ts` holds the host, the size and the link so this cannot go quiet again.
- **Three of the seven descriptions did not match NASA's own captions.** The Beagle 2 date was "found 2014" when NASA's own library dates the announcement 16 January 2015, and the leopard-spot rock was said to hold olivine, which no NASA source mentions — its spots hold vivianite and greigite, which is a better lesson anyway. The Viking alt text was left as it was after looking at the picture itself: it does show a plain with the lander in the corner.
- **The rover's button was heavy.** It was a 1.4 MB PNG for a button drawn at 56-84 px. It is now a 58 KB WebP, indistinguishable side by side, with the PNG kept in `Assets/images/rover/source/` and a script in `tools/` so the conversion can be re-run. The looping animation is the original GIF and is shipped as it is: GIF is the one format every browser plays without argument, and it is only fetched when the player opens the rover's status window.
- **The animation was a still frame for one commit, and nothing caught it.** The conversion script wrote `save_all=True` without `append_images`, which saves the *first* frame and silently drops the other fifteen, so the rover stood still. The browser check passed all ten of its checks while this was true, because it never opened the window the animation lives in. All three are fixed: the animation is the original GIF again, the script reads from `source/` and checks the animation still has its frames, failing loudly if it does not, and the browser check opens the status window and fingerprints that spot twice to prove the rover is moving. The fingerprint is a screenshot of the region, not a canvas draw — headless Chrome paints the first frame into a canvas every time, so a canvas check reports a moving picture as still.
- Focus was dropped to the top of the document when a notice closed itself; it now goes back to the rover button. A rover with a find waiting can no longer be recalled, because that left a find the player could never open.
- `npm run check` clean; `npm test` 621 passed in 28 files; production build succeeds. `tools/browser-check-rover.mjs` drove the real game in headless Chrome and passed all thirteen checks: the NASA picture loads (the leopard-spot rock came up at 714x768 out of `assets.science.nasa.gov`), the rover's animation moves, and there were no console errors. The check now also answers whichever kind of find turns up — a site is logged and a rock is collected — because which one comes up depends on what the rover found.
- Looking at the pictures changed two of the descriptions. The Viking alt text had been "corrected" to NASA's caption, but the picture itself shows a plain with the lander in the corner, which is what the original said — so the original was kept. The Beagle 2 and leopard-spot rock dates came from NASA's own library, which dates the Beagle 2 announcement to 16 January 2015.

**Next**

- Human browser pass: read the wording aloud to a child, and decide whether the collection should feed the sim or the debrief.

---

## 2026-11-10 — Make Enter work on the supply screen

**Did**

- The supply screen now answers Enter exactly as NEXT does. `isPlainEnter` and
  `focusHandlesEnter` live in `features/supply/model.ts` — pure, with seven new tests — and
  the view holds one `window` keydown listener that mirrors the briefing's.
- The screen resets itself when it mounts: NEXT visible, the answers, the retry, the
  continue and the working hidden, the result empty, and the answer list cleared.
- The listener is removed in the teardown, so it cannot go on advancing a screen the
  player has left, and it cannot fight the briefing's own Enter handler.

**Files**

- `src/features/supply/{model.ts,model.test.ts,view.ts}`,
  `docs/team/{issues,decisions,progress-log,tasks}.md`, `docs/architecture.md`,
## 2026-11-10 — Redesign the start screen as a full-bleed scene

**Did**

- The naming screen is now one picture edge to edge: the astronaut stands on the left,
  Mars fills the right and runs off the top and right of the window, and the menu (title,
  name field, buttons, trainer card) sits on the right over the planet.
- The stage moved out of `.naming__body` and became the first child of the section, so it
  is the backdrop for the whole window and the header sits on top of it. The card frame
  (`naming__card`) is gone.
- The title, greeting and form moved into a `.naming__content` wrapper, so the block can
  be centred in the space above the trainer card, and the panel sits on the right at 44%
  of the width.
- START MISSION carries the accent fill every other screen's primary button uses, and
  "Start over" is the quiet one beside it. The way forward is the bright button.
- Typography now uses Outfit, the geometric sans the site already loads for the rest of
  its screens. Panels are translucent and a radial scrim over the planet keeps the menu
  legible on top of it.
- The Mars rotation is unchanged: `naming-mars-turn` is still 150s, linear, infinite, and
  `naming-astronaut-float` is still 9s. Only the geometry around them moved.
- `view.ts` and `model.ts` are untouched, so the name rules, the 21 model tests and the
  whole form behaviour are exactly as they were.

**Files**

- `index.html`, `src/features/naming/naming.css`,
  `docs/team/{decisions,tasks,progress-log}.md`, `docs/architecture.md`,
  `docs/CHANGELOG.md`

**Problems**

- None blocking. `npm run check` clean, `npm test` 441 in 19 files, `npm run build`
  warning-free.
- Two defects came out of the same root cause. The screen had no keyboard handler at all,
  so Enter did nothing until NEXT had been clicked with the mouse — and it only worked
  then because the click left the focus on the button, which the browser activates with
  Enter. Separately, the screen never cleared the previous visit's state: a second visit
  came back with NEXT hidden, the answers still on screen, and eight answer options
  instead of four, because the old buttons were never removed. Without the reset, Enter
  would have gone quiet again on every revisit — the same symptom, a different cause.
- There is no DOM test setup in this repo (ISS-013, TASK-009), so the fix was verified by
  driving the real app in headless Chrome: Enter advances from the first beat with nothing
  focused, advances exactly once when NEXT has the focus, does nothing on the question
  phase, still picks a focused answer, a revisit starts clean, and the briefing is
  undisturbed.

**Next**

- The owner checks the screen on their own device. The branch is not pushed yet.
- None blocking. `npm run check` clean, `npm test` 434 in 19 files, `npm run build`
  warning-free. The composition was verified by rendering the real app in headless Chrome
  at 946x538 (the reference's own size), 1366x768, 1920x1080 and 390x844, and by driving
  the form: typing enables START MISSION, submitting reaches the briefing, and Start over
  clears the field again.
- One thing that bit twice: `--window-size` in headless Chrome subtracts the window
  chrome, so the viewport came out 928x442 and the short-screen media query hid the
  backdrop. The screenshots were taken through the DevTools Protocol with an explicit
  viewport override instead.
- The title is capped at 4rem because "ASTRONAUT" is one line: uncapped, it ran off the
  right edge of the screen at 1366px wide.
- `main` moved under this branch (PR #21, the seeded hazards) and both sides had claimed
  D-048 and TASK-062, so this branch's decision is **D-049** and its tasks **TASK-063**
  and **TASK-064**. The merge kept both entries; the ids were the only thing renumbered.

**Next**

- The owner checks the screen on their own device; the planet in the reference mockup is
  darker than the game's own asset, so if they want the mood of the mockup rather than
  the real planet, a filter on `.naming__mars` is the one-line change.

---

## 2026-11-10 — Enlarge the start screen's planet and astronaut

**Did**

- The planet and the astronaut on the start screen are now enlarged: Mars went from 606x620
  to 1818x1860 and the astronaut from 620x618 to 1240x1236, both as WebP.
- They are drawn full-screen — the planet is the width of the window — so the 606px
  originals were being stretched about three times over on a 1920px screen, which turned the
  craters to mush and made the planet read as a broken image rather than a planet.
- The originals are kept untouched in `Assets/images/naming/source/`, and
  `tools/upscale-naming-assets.py` rebuilds the shipped files from them: a Lanczos resample
  followed by a light unsharp mask, because Lanczos alone leaves the enlarged crater rims
  soft. The planet is enlarged 3x (it carries the fine texture); the astronaut 2x (it is a
  smooth illustration, and 2x is indistinguishable at the size it is drawn).
- The entry screen's image weight goes from 125 KB to 488 KB, downloaded once on the first
  screen.

**Files**

- `Assets/images/naming/{mars,astronaut}.webp`, `Assets/images/naming/source/`,
  `tools/upscale-naming-assets.py`, `docs/architecture.md`, `docs/CHANGELOG.md`

**Problems**

- None blocking. `npm run check` clean, `npm test` 434 in 19 files. The difference was
  verified by rendering the real app at 1920x1080 and 946x538 in headless Chrome and
  comparing 1:1 crops of the planet before and after.
- Pillow is not installed by default here; `py -3 -m pip install Pillow` puts it there. It
  is a dev-only tool dependency and adds nothing to the shipped bundle.

**Next**

- The owner checks the screen on their own device.

---

## 2026-11-10 — Roll each mission's hazards from a seed

**Did**

- `sim/forecast.ts` no longer hardcodes sols 3/5/7/10. A seeded generator
  (`createSeededRandom`) now decides per run whether a dust storm happens, how many
  flares (1-4), whether a supply pod is scheduled, and which sols (2-10, one event at
  a time). Flare sizes are drawn from the real M/X pool; with no live data they come
  from the NOAA long-run M:X mix, marked `approximate`.
- `visibleForecast` replaces "show the next three events": the pod is always visible,
  a storm three sols ahead and a flare only one. `base`'s read-ahead card and `act`'s
  "Coming up" panel both use it.
- `dom/forecastLoader.loadForecast(signal?, seed?, dustScore?)` passes `Date.now()` and
  the site's dust score, so every new mission differs.
- `data/spaceweather.ts` returns every flare it parsed (not just the strongest two) and
  `FALLBACK_FLARES` is empty, so an offline run draws from the long-run record instead
  of the same two baked flares.

**Files**

- `src/sim/forecast.ts`, `src/dom/forecastLoader.ts`, `src/data/spaceweather.ts`,
  `src/features/base/{model.ts,model.test.ts,view.ts}`, `src/features/act/view.ts`,
  `src/sim/sol.test.ts`, `src/features/debrief/model.test.ts`,
  `src/data/spaceweather.test.ts`, `docs/team/{decisions,progress-log,tasks}.md`,
  `docs/architecture.md`, `docs/game-flow.md`, `AGENTS.md`, `README.md`,
  `src/data/README.md`

**Problems**

- None blocking. `npm run check` clean; `npm test` 434 passed in 19 files. The base
  forecast card can be empty for seeds with no pod and no storm on sols 2-3 (seed 4,
  for example); the source project added an empty-state line, but the instruction was
  to keep this project's copy, so it is left as-is. Not yet verified in a browser.

**Next**

- Human browser pass (`TASK-049`) of the new forecast, then the production build check.


---

## 2026-11-11 — Merge the last of the launch screen's NASA fact

**Did**

- ApurboAbir17's `mission-briefing` branch had one commit that was not in `main`
  (`19e59c8`, "add facts to supply check and launch reel"). It was written against an
  older `main`, so it needed unpicking rather than merging.
- **The launch half is in.** `launch/model.ts` gains `NASA_FACT` — "a rocket that goes far
  usually drops its empty fuel tanks partway up, which is called staging" — and the view
  adds it to the screen's spoken description. The films and the shots carry the story for
  anyone who cannot see them, but no shot is about the rocket itself, and the description
  is already where the screen's whole spoken content lives, so the fact joins the text
  rather than the beat list and the reel does not slow down for it.
- **The supply half is not, and it is not an oversight.** That commit also added a static
  "NASA fact" beat to `SUPPLY_BEATS` — red romaine lettuce on the space station. The
  supply screen has since grown a *rotating* NASA fact in its corner
  (`factFor` into `[data-supply-fact]`, D-047 and TASK-061), so merging the static beat
  would have shown two NASA facts on one screen and slowed the beat list for a fact the
  screen already carries.

**Files**

- `src/features/launch/model.ts`, `src/features/launch/view.ts`,
  `src/features/launch/model.test.ts`

**Problems**

- The branch was two weeks behind `main` in content, not just in commits. Merging it
  wholesale would have quietly undone D-047's rotating facts, which is the sort of
  regression a fast-forward looks innocent until someone reads the screen.

**Next**

- Human browser pass of the launch reel's read-aloud text with the new fact in it
  (TASK-049).

---

## 2026-11-11 — Name the five science goals, and show them on every sol

**Did**

- The game now **says what it is about**. Every number in it was always about one of five
  things — Martian dust storms, life support, radiation exposure, power shortages and food
  production — but nothing said so, so a player saw five bars falling and had to work out
  for themselves that the dust was what was blocking the Sun.
- New pure module `src/sim/goals.ts` names the five goals and reads each one against the
  run as it stands. Every line is worked out from the sim: the storm that is actually
  running, the panels' real output, the stores as they are, the last sol's blackout. So
  "the greenhouse grows 12 food a sol and the crew eat 10" is a fact about the machine the
  player is running, not a number to panic at.
- The **act screen** carries the five goals under the day's activity, each with a coloured
  dot so the state reads at a glance and a NASA fact about that goal's own system
  underneath.
- The **debrief** reports how each goal fared: the dust took so much off the panels, the
  shielding fell so far, the greenhouse grew less than the crew ate, the batteries ran
  flat on which sols.
- Each goal files its NASA fact under a **topic of its own**, so the dust storm and the
  power shortage never show the same fact. `sim/topics.ts` gains a `dust` topic and five
  facts move to it.
- Each activity now says **which goal it is working on**, so the seven that serve a goal
  are visibly the mission and the five pure-science ones are visibly the science.
- The suite went from 542 tests in 25 files to **568 tests in 26 files**.

**Files**

- New: `src/sim/goals.ts`, `src/sim/goals.test.ts`
- Changed: `src/sim/activities.ts`, `src/sim/topics.ts`, `src/data/nasaGallery.ts`,
  `src/features/act/{model,view}.ts`, `src/features/act/act.css`,
  `src/features/debrief/{model,view}.ts`, `src/features/debrief/debrief.css`,
  `docs/architecture.md`, `README.md`, `AGENTS.md`, `docs/team/{decisions,issues,tasks}.md`

**Problems**

- **Two goals had a decision and three did not.** The dust storm and the flare are crises
  the player answers; life support, power and food were only numbers falling. The activity
  loop (D-051) is what fixed that — `grow-extra`, `dig-ice`, `recycle-tune`, `air-check`
  and `stack-shielding` are decisions about the three quieter goals — and naming the goals
  is what makes it obvious that they are decisions *about* something.
- The dust facts had been filed under `power`, because dust and panels are the same
  problem. That meant the dust goal and the power goal would have shown the same fact on
  the same screen. Hence the new `dust` topic.
- The activity `topic` and the activity `goal` are not the same thing: `sweep-panels` is
  filed under `dust` but serves the dust goal, while `air-check` is filed under `missions`
  but serves life support. Two fields, because one is "what this teaches about" and the
  other is "which goal this works on".
- Not yet verified in a browser. The five goal rows are the densest thing on the act panel
  and nobody has looked at them on a phone yet.

**Next**

- A human browser pass, especially the five goal rows on a small screen (TASK-049).

---

## 2026-11-10 — Never double up the events, and make the ration question change every run

**Did**

- **Two forecast events can never happen back to back** (D-056). The event sols used to be
  four typed-in constants that happened to be spaced right, so the rule was a comment rather
  than a rule. They are now worked out from a schedule: each event starts `MIN_CLEAR_SOLS`
  sols after the previous one has *ended*, so there is always a quiet sol between any two of
  them — including after the two-sol dust storm, which is still dusting the panels when the
  next alarm arrives. The schedule the game has always had is unchanged: a flare on sol 3, a
  pod on sol 5, a storm on sols 7 and 8, and a second flare on sol 10.
- `forecastIsSpaced(forecast)` is exported so the rule can be asserted, and
  `src/sim/forecast.test.ts` is new — one of the four `sim/` modules ISS-047 recorded as
  having no test file at all.
- **The ration question changes every run** (D-057). It was fixed — two months, four crew,
  three days per packet — so the answer was always 80 and the buttons were always 20, 80,
  240 and 720. A child who played twice learned the number instead of the calculation.
  The mission length now varies between six authored values, the answer moves with it, and
  all four buttons are worked out from the question on screen: the answer, plus the three
  mistakes a child actually makes. The order is shuffled too, so there is no button to
  memorise either.
- The variation is seeded from the astronaut's name — the one thing that changes between runs
  — and never from `Math.random()`, so a demo repeats and a test can pin it.
- The crew size in the question is now read from `sim/modules.ts` rather than typed in, so
  the ration maths cannot drift from the briefing again.
- The suite went from 517 tests in 24 files to **542 tests in 25 files**.

**Files**

- New: `src/sim/forecast.test.ts`
- Changed: `src/sim/forecast.ts`, `src/features/supply/{model,view}.ts`,
  `src/features/supply/model.test.ts`, `docs/architecture.md`, `docs/game-flow.md`,
  `AGENTS.md`, `README.md`, `docs/team/{decisions,issues,tasks}.md`

**Problems**

- The forecast's event sols were a *second copy of the truth*: four constants that had to be
  kept in step with `createForecast` by hand. They are now derived from the placed schedule,
  so they cannot disagree with it. The old numbers are unchanged — 3, 5, 7, 10 — but they
  are now a result rather than an input.
- The fourth answer button, 720, was not a mistake anyone could describe, so it was a guess
  button rather than a wrong answer that teaches something. Every option is now a specific
  mistake, worked out from the question.
- The seeding is the astronaut's name, which means the same name always gets the same
  question. That is deliberate — a demo must repeat — but it does mean a player who always
  types the same name sees the same question. A run counter would fix that and cannot be
  done without putting mutable state in `sim/`, so the name stays.

**Next**

- A human browser pass of the supply screen with a few different names, to confirm the
  question reads naturally in all six forms (TASK-049).

---

## 2026-11-10 — Give every sol a main activity, a science score and a live NASA picture

**Did**

- **Every sol now has a main activity** (D-051). On the eight calm sols `act` offers three
  activities and the player picks one; on a crisis sol the crisis replaces the activity
  panel, so the crisis *is* that day's activity. Twelve activities, each with a real cost,
  in the new pure module `src/sim/activities.ts` alongside the twelve sol plans.
- The activity's kWh joins the same `extraPowerCost` path a flare's shielding digger uses,
  so **an activity competes with life support for the same energy**: spend 25 kWh on a
  rover survey with a flat battery and that sol runs in a blackout. No new machinery was
  needed for this — it fell out of the model that was already there.
- **Science points and a rank** (D-052). `RunState.science` totals the points, and the new
  `src/sim/science.ts` turns the total into a rank: Explorer, Field Scientist, Research
  Lead, Senior Scientist, Chief Martian Scientist. The bands are set by what a run can
  actually earn, so a player who chose nothing is still an Explorer and the top rank is one
  good run away. The debrief reports the score, the rank and every activity the crew chose.
- **A live NASA picture per sol** (D-053). The new `src/data/nasaDaily.ts` reads NASA's
  Astronomy Picture of the Day, filtered to Mars, and falls back to the saved gallery when
  NASA is busy — an enrichment layer on top of the curated gallery, never a replacement,
  exactly as D-037 established for space weather. The static facts grew from 15 to 40 and
  every one is tagged with a topic, so the day's activity is paired with a fact about its
  own system.
- The cosmetic `MISSIONS` array is gone. It claimed a headline that disagreed with the
  forecast — sol 8 read "Mission 7: First Harvest" while the storm was on sol 7 — and it
  had no effect on the simulation at all. It is now `SOL_PLANS`, twelve real headlines each
  carrying its three activities.
- The suite went from 424 tests in 19 files to **517 tests in 24 files**. `src/sim/run.test.ts` and
  `src/sim/balance.test.ts` were added as well: ISS-053 recorded that the run state had no test file
  at all, and the activity loop changes exactly that state and the balance it depends on.

**Files**

- New: `src/sim/activities.ts`, `src/sim/science.ts`, `src/sim/topics.ts`,
  `src/data/nasaDaily.ts`, `src/dom/dailyFactLoader.ts`, `src/ui/nasaFeedCard.ts`
- Changed: `src/sim/{run,sol}.ts`, `src/features/act/{model,view}.ts`,
  `src/features/act/act.css`, `src/features/debrief/{model,view}.ts`,
  `src/data/nasaGallery.ts`, `src/data/README.md`, `docs/architecture.md`,
  `docs/game-flow.md`, `AGENTS.md`, `README.md`, `docs/team/{decisions,issues,tasks}.md`

**Problems**

- `ice-store` gave more water for less power than `dig-ice` and earned fewer points, so on
  sol 5 it made `dig-ice` pointless. It became `sample-rock`, a distinct science activity.
  The fix is its own commit rather than a quiet rewrite.
- The first set of rank bands put a run that chose nothing at "Field Scientist", because
  twelve day-log points were enough. The bands were recalibrated against what a run can
  actually earn.
- The debrief's `crisisSols` list was wrong at first: a sol with no activity is not
  necessarily a crisis sol. It now separates crisis sols from sols where nothing was
  chosen, using the logged events as the evidence.
- **NASA's APOD endpoint rate-limits the shared `DEMO_KEY`.** It answered `429` on every
  attempt while this was written (ISS-049). The saved gallery is the guaranteed layer, so
  the demo is safe either way, but a personal key (TASK-008) is the fix.
- The NASA Mars Rover Photos API returned `404` for every rover and sol tried from this
  machine, so it was left out rather than shipped unverified. It is the most striking
  possible feature and is worth retrying after the demo.
- Not yet verified in a real browser. `npm run check` and `npm test` are clean and
  `npm run build` succeeds, but nobody has watched a player pick an activity yet.

**Next**

- A human browser pass of the whole journey, especially the activity cards on a touch
  screen and the crisis countdown with the new panel (TASK-049).
- Register a personal `api.nasa.gov` key before the demo (TASK-008, ISS-009).

---

## 2026-11-10 — Rotate NASA facts onto the supply and launch screens

**Did**

- The supply screen now shows a rotating NASA fact while the player works the ration
  question: `[data-supply-fact]`, set from `factFor(SUPPLY_BEATS.length)`, styled as
  `.supply__fact`, sitting under the working line and never covering the choices.
- The launch parts tour now shows a rotating NASA fact per part: `renderPart` sets
  `[data-launch-parts-fact]` from `factFor(index)`.
- No new tests: the facts were already covered by the gallery tests; the screens only
  pick a seed.

**Files**

- `index.html`, `src/features/supply/{view.ts,supply.css}`,
  `src/features/launch/{view.ts}`, `docs/team/{tasks,decisions,progress-log}.md`,
  `docs/architecture.md`

**Problems**

- None blocking. `npm run check` and `npm run build` clean; `npm test` still 424 in 19
  files. Not yet verified in a real browser; that is the next step before any commit.

**Next**

- Human browser pass (`TASK-049`) on the supply and launch screens, then the production
  build browser check; then submit for the demo.

---

## 2026-11-10 — Put the briefing under the astronaut artwork, one line at a time

**Did**

- Replaced the briefing's stacked beat cards with the astronaut-between-Earth-and-Mars artwork
  (`Assets/images/briefing/astronaut.webp`, converted from a 2.2 MB PNG to a 208 KB WebP) and a
  single message that swaps one line at a time. The artwork is locked to its own aspect ratio
  as the backdrop — the supply screen's stage approach — so it is never cropped; an earlier
  attempt used `object-fit: cover` over the whole viewport, which zoomed the picture and cut
  the astronaut, and was replaced.
- NEXT and the Enter key both advance; Enter confirms on the last line. Enter is ignored while
  a button or link has focus, so one press cannot advance twice.
- The YES!! button and the ~2.6 s auto-advance are unchanged, as are `model.ts` and its tests.
- Updated `docs/architecture.md`, `README.md` §2, `docs/team/decisions.md` (D-046) and this log
  in the same change.

**Files**

- `Assets/images/briefing/astronaut.webp` (new), `index.html`, `src/features/briefing/view.ts`,
  `src/features/briefing/briefing.css`, `README.md`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/progress-log.md`

**Problems**

- None blocking. `npm run check`, `npm test` (401 tests on that branch) and `npm run build` all
  pass; the new WebP bundles at 208 KB. The source PNG is 2.2 MB, so the conversion is what
  keeps the bundle honest — the other screens' assets are WebP for the same reason.
- Not yet verified in a real browser; that is the next step before any commit.
- The branch was 13 commits behind `main`; merging `main` in moved the briefing decision from
  D-042 to D-046 because D-042 was already the NASA gallery decision. The read-aloud control
  was re-wired to read the single on-screen message instead of a stack of beats.

**Next**

- Human browser pass on `#/briefing`: artwork visible, messages swap on NEXT and Enter, Enter
  does not double-advance from a focused button, YES!! and the auto-advance still fire.

---

## 2026-11-10 — Put a real NASA photo on every landing region, and rotate facts

**Did**

- Added five real NASA photos to the landing-site panel: one per region, each
  verified against NASA's image API and credited. Selecting a pin now shows the
  place itself, not just a dot on the map. Recorded as D-045.
- Added a rotating list of fifteen short NASA facts, with `factFor(seed)` so a
  screen can pick one deterministically. Base shows a fact beside the build
  panel; the debrief shows one beside the closing card.
- Reused `nasaCard` for the region photo, so the credit line, source link and
  read-aloud control came with it. Ten new tests cover region ids, image URLs,
  credits, length caps and fact wrapping.

**Files**

- `src/data/nasaGallery.ts` + test, `src/ui/nasaCard.ts`,
  `src/features/landing-site/{view.ts,landing-site.css}`,
  `src/features/base/view.ts`, `src/features/debrief/view.ts`, `index.html`,
  `docs/architecture.md`, `docs/team/{decisions,tasks,progress-log}.md`,
  `README.md`, `AGENTS.md`

**Problems**

- The region photos are fetched from `images-assets.nasa.gov` at runtime. A card
  whose image fails keeps its caption, fact and credit, but there is no bundled
  fallback image.
- Jezero's picture is an artist's idea of the ancient lake, not a photograph;
  the caption says so, because it is the one region image a child could mistake
  for a real photo.

**Next**

- Human browser pass (`TASK-049`); then decide whether to extend the fact list
  to the supply and launch screens.

---

## 2026-11-10 — Add the NASA learning layer, read-aloud, and a real way out of a run

**Did**

- Curated gallery: twelve real NASA images, one per sol, plus a closing artist concept on the
  debrief. Every card has a NASA id, alt text, caption, fact, credit and source link, and ten
  tests enforce those fields. Recorded as D-042.
- Read-aloud on the NASA cards, the briefing and the crisis prompt, using the browser's own
  `speechSynthesis`. Shared toggle in `ui/readButton.ts`, engine in `ui/readAloud.ts`, and the
  router stops the voice on every navigation. Recorded as D-043.
- "What this sol changed" strip on `act`: all five stores, signed deltas, `+15 kWh` / `−14%` /
  `no change`, with a note that power is stored energy and the rest are tank percentages.
- A safe leave dialog on base, act and debrief (Menu → Keep playing / Leave mission), and
  naming's dead "Back to Main Menu" relabelled "Start over", which resets the form and the run.
  Recorded as D-044.
- Fixed the briefing's crew count (`CREW_SIZE = 4`), the page title/description, and updated the
  docs to match: architecture tree and contracts, test counts, issues, decisions and tasks.

**Files**

- `src/data/nasaGallery.ts` + test, `src/ui/nasaCard.ts`, `src/ui/nasa-card.css`,
  `src/ui/readAloud.ts`, `src/ui/readButton.ts`, `src/ui/gameLoop.ts`,
  `src/styles/game-loop.css`, `src/ui/router.ts`, `src/features/{act,briefing,debrief,base,naming}`,
  `index.html`, `docs/architecture.md`, `docs/team/{decisions,issues,tasks,progress-log}.md`,
  `README.md`, `AGENTS.md`

**Problems**

- The briefing's closing hand-off would have cut off a reading mid-sentence, so the read button
  pauses that timer and restarts it only when the passage finishes naturally.
- `speechSynthesis` is unavailable in the Vitest node environment, so read-aloud has no automated
  test; the control is hidden where the API is missing and the rest is code-reading plus the
  browser pass.
- NASA image URLs point at `images-assets.nasa.gov`. A card whose image fails to load still shows
  the caption, fact and credit, but no offline fallback image is bundled.

**Next**

- Human browser acceptance pass (`TASK-049`) and a `npm run preview` check of `dist/`.
- Optional: self-host the fonts (TASK-012) and remove the unused 12 MB of cinematic PNGs
  (ISS-018).

---

## 2026-11-10 — Make the README describe the project that actually exists

**Did**

- Rewrote the README's technical half against the code: the status row, the real route chain,
  a nine-step walkthrough of the nine built screens, a project-status table, setup commands,
  the real `src/` tree, and a documentation table linking `AGENTS.md`, `docs/architecture.md`,
  `docs/game-flow.md` and the team records.
- Corrected the walkthrough where it described screens that do not exist: there is no plan
  phase (D-029), no separate "Final" screen (D-035), no **Build New Module** button, and the
  images are design mockups rather than captures.
- Closed ISS-001 and recorded D-041: the README is now maintained as a technical document, not
  frozen.

**Files**

- `README.md`, `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`,
  `docs/team/tasks.md`, `docs/team/progress-log.md`

**Problems**

- The README had drifted for five weeks because D-011 froze it deliberately. Rewriting it
  uncovered smaller disagreements: the "Ten Missions" table describes an arc that is not
  implemented, and the plan-phase mockup shows a screen the build never had. Both are now
  labelled as design intent rather than current behaviour.
- `src/features/README.md` is stale in the same way — it says the folder is empty and that
  `sim/` "does not exist yet". It was outside this change and needs its own pass.
- `index.html` still calls the page "Under Construction" in its `<title>` and meta
  description. That predates the build and was not touched here; it is a one-line fix for
  the next pass.
- No gameplay code changed. `npm run check` passes and the unit suite is green; the test
  count in the README was updated from a real run, not from memory.

**Next**

- Rewrite `src/features/README.md` against the nine built features and the four-file contract.
- Keep the README's status table and test count current in the same commit as any change that
  invalidates them (D-041).

---

## 2026-11-10 — Map the decisions so new events have somewhere to land

**Did**

- Read the decision logic out of `sim/crises.ts`, `sim/sol.ts`, `sim/forecast.ts`,
  `sim/modules.ts` and `sim/regions.ts` rather than from the docs, then wrote
  `docs/game-flow.md`: the journey, the sol loop, the three crisis trees with their exact
  numbers, the resource cause-and-effect chain, the run-status machine, a status table, and
  a checklist for adding a new event.
- Marked what is built and what is not: every journey screen is built; save, login, a plan
  phase and any new event kind are not. Planned event ideas are sketches only.
- Validated the Mermaid blocks by rendering them locally. The first version had nine
  diagrams; GitHub's renderer only drew the last few before timing out and showed "Unable to
  render rich display" over the rest, so the page was cut back to four compact diagrams and
  re-checked. The README now links to the map from its index and project-status section.

**Files**

- `docs/game-flow.md` (new)
- `docs/architecture.md` (docs tree)
- `README.md` (index + project-status link)
- `docs/team/tasks.md`, `docs/team/progress-log.md`

**Problems**

- No Mermaid parser is installed and adding one would be a runtime dependency, so the
  diagrams were rendered through a local headless browser and an external service instead.
  The repo still has zero dependencies.
- GitHub renders Mermaid client-side and silently gives up on a page with many diagrams:
  nine diagrams produced five "Unable to render rich display" panels even though every block
  parsed cleanly. This is a host limit, not a syntax error; four smaller diagrams avoid it.
- The existing docs still name `sim/events.ts`, `sim/constants.ts` and `sim/balance.test.ts`,
  which do not exist; the real files are `sim/forecast.ts` and `sim/modules.ts`. The new
  map points at the real ones and does not repeat the stale names.

**Next**

- Pick an event from §10.4, log it as a task, and record the design choice in
  `docs/team/decisions.md` before writing code.

---

## 2026-11-10 — Rebuild base, act and debrief from the Figma game-loop frames (D-038, D-039, D-040)

**Did**

- Pulled the seven Figma nodes (`66:14`, `66:20`, `66:26`, `66:32`, `66:38`, `66:44`, `66:50`) through the Figma MCP and rebuilt the three screens on the shared chrome they draw: navy header, five resource cards, illustrated Mars world with the crewmate, cream interaction panel and dock.
- Added `src/ui/gameLoop.ts` + `src/styles/game-loop.css` as the one place the frame is drawn. Features pass in words and numbers; the shell knows no `sim/` rule.
- `base` now shows the outpost on Mars with module artwork and a build catalogue with steppers. `previewSummary()` gives the five cards their numbers from the same calm-sol projection the sentences use.
- `act` keeps the turn-based loop, and a crisis now replaces the mission panel in place (`66:26`, `66:32`, `66:38`) with the countdown, Earth reply and "take your time" switch intact.
- `debrief` is the results panel from `66:44`, and its journal is the `66:50` frame: decisions with verdicts, the full sol table and the honesty note, reached from "View my Mars story". `nextSteps()` and `wentEmpty()` are new pure helpers, with 6 new tests.
- Checked the rendered screens in headless Chrome at 1600×900 against the frame exports, then deleted the temporary harness.

**Files**

- `src/ui/gameLoop.ts`, `src/styles/game-loop.css`, `index.html` (Outfit/Nunito/Orbitron)
- `src/features/{base,act,debrief}/view.ts`, their `.css`, and `base/model.ts`, `debrief/model.ts`
- `docs/architecture.md`, `docs/team/{decisions,progress-log}.md`

**Problems**

- The frames show Pause, Settings and BUILD, and a working Outpost/Inventory/Journal dock. None of those screens or controls exist, so they are decorative `<span>`s marked `aria-hidden` (D-038). A BUILD button on `act` would call `startOutpost` and wipe the run.
- The journal frame has no room for the sol table or the honesty note. Both live below the decision entries in the same scrolling panel, so the debrief can still show its reasoning and the timing caveat.
- Icons are emoji, not the frame's custom glyphs: there are no SVG exports for them and the project carries no icon dependency. Module and resource artwork is real.
- `src/styles/game.css` is now imported by nobody. Left in place in this change; removing it is a separate commit.
- The visual harness needed Chrome's `--headless=new --screenshot`; no Playwright/Puppeteer is installed and adding one is a dependency change, so it stays a manual check.

**Next**

- Human browser pass of the whole journey at laptop and phone widths (TASK-049).
- Retune `base`'s forecast card if three banner events in one sentence reads too long on a laptop.

---

## 2026-11-09 — Hook live space weather up to a second source (ISS-043, D-037)

**Did**

- Verified the existing client is really live: a headless browser on `#/base` sends
  `GET https://api.nasa.gov/DONKI/FLR?...&api_key=DEMO_KEY`, and NASA answered `503
  upstream connect error`, then `429 OVER_RATE_LIMIT`. The run fell back to two baked
  flares, so the "live forecast" was history.
- Added NOAA SWPC's GOES X-ray feed as the second live source, after NASA and before the
  baked fallback. `SpaceWeatherSource` is now `'donki' | 'noaa' | 'fallback'`, and the
  detail sentence names the agency that answered.
- Stopped caching a request the caller aborted, so a screen closed mid-fetch cannot leave
  the next screen with a stale fallback.
- Re-verified in headless Chrome: `#/base` now shows an M3.5 flare "seen on 5 November
  2026" with the note "Live flares from NOAA's space-weather centre, last 7 days" and no
  `approximate` tag.
- Closed ISS-006 (`.env*` ignored, `.env.example` added), ISS-008 (CORS verified; the
  remaining problem is service availability, not CORS) and corrected the stale docs
  (ISS-042).

**Files**

- `src/data/spaceweather.ts`, `src/data/spaceweather.test.ts`, `src/data/README.md`
- `src/dom/forecastLoader.ts`, `src/sim/forecast.ts`, `src/features/base/view.ts`
- `.gitignore`, `.env.example`
- `AGENTS.md`, `docs/architecture.md`
- `docs/team/{issues,decisions,tasks,progress-log}.md`

**Problems**

- DONKI is not usable right now from this network: 503 on the first calls, then 429 for
  `DEMO_KEY`. That is why the change is two sources rather than a NASA-only fix; the NASA
  path is still first in the chain.
- The live NOAA feed often tops out at M-class, so flare intensity is usually 2, not the 3
  the baked X-class fallback produced. That is the honest number, but balance will feel
  gentler on a quiet week.
- The summary used to say "like the one NASA recorded", which would have been a lie when
  NOAA answered. Reworded to "about the strength of one seen on …".
- `AGENTS.md` and `architecture.md` had drifted further than the data layer: they referenced
  `sim/events.ts`, `sim/constants.ts` and `sim/balance.test.ts`, none of which exist. Fixed
  the parts touched here; the wider tree audit is still ISS-024.

**Next**

- Obtain a personal `VITE_NASA_API_KEY` before the demo so DONKI is the usual source
  (ISS-009).
- Human browser pass of `base` → `act` → `debrief` with live data (TASK-049).

---

## 2026-11-09 — Fix the launch parts tour clipping its controls (ISS-041)

**Did**

- Moved `.launch__parts-panel` out of `.launch__stage` so it is a direct child of
  `.launch` and covers the whole viewport, instead of inheriting the 16:9 letterboxed
  stage box.
- Capped `.launch__parts-image` by viewport height (`max-height: 52vh`, tightened to
  `44vh` under 560px) so the card fits short windows.
- Verified in headless Chrome at 545x645 and 1000x720: the tour opens on its own, the
  part name and description are visible, Continue is hit-testable, and clicking it
  navigates to `#/interior`.

**Files**

- `index.html`, `src/features/launch/launch.css`
- `docs/team/{issues,decisions,tasks,progress-log}.md`

**Problems**

- The first headless check forced the panel open, which bypassed `openPartsPanel` and
  left the button without its click listener — the click did nothing. Re-tested against
  the real media-driven flow, where the tour opens on its own and Continue navigates.
- No DOM tests exist for the launch view (ISS-013), so this is verified in a browser
  rather than the suite.

**Next**

- Human browser pass of the whole journey (TASK-049).

---

## 2026-11-08 — Build the `base → act → debrief` game loop

**Did**

- Implemented the pure simulation: `sim/constants.ts` (all tuning numbers),
  `sim/modules.ts` (catalogue, build rules, upkeep), `sim/events.ts` (baked schedule,
  every event `approximate: true`), real `sim/resources.ts` (`drainForSol`,
  `depletedStores`), `sim/sol.ts` (`advanceSol`, per-sol ledger, win/loss detection) and
  `sim/run.ts` (`modules`, `ledger`, `landAt`, `applyBuild`).
- Built the three screens: `base` (placed modules, five stores, storm warning, build
  panel with cost/effect previews, Start sols), `act` (turn-based Advance sol, Power
  Surplus picture from live numbers, location conditions, event log) and `debrief`
  (outcome, CSS-bar timeline, used/weather-damage summary, ledger attribution with an
  explicit not-confident path, Play again).
- Registered all nine screens in `registry.ts`, added the three `<section>`s to
  `index.html`, and fixed ISS-040 by making `landing-site` call `landAt`.
- Added the loop's sim tests (modules 25, events 16, resources 18, sol 12, run 19,
  balance 9) plus screen-model tests; the sim suite is 178 tests and the whole suite is
  410.

**Files**

- `src/sim/{constants,modules,events,resources,sol,run}.ts` and their tests,
  `src/sim/balance.test.ts`
- `src/features/{base,act,debrief}/{model,model.test,view}.ts` and `*.css`
- `src/features/landing-site/view.ts`, `src/ui/registry.ts`, `src/ui/registry.test.ts`,
  `index.html`
- `docs/team/{decisions,issues,tasks}.md`, `docs/architecture.md`, `AGENTS.md`

**Problems**

- The first pass of `base/view.ts` and `act/view.ts` captured `run` once and kept using
  the stale value, so a second build or a second sol acted on the original state. Both
  now hold a local mutable `state` and update it after every change.
- `check-markup` requires every `data-*` hook in a view to exist statically inside that
  view's section. Dynamically created build buttons needed a hidden placeholder in
  `#base`.
- The debrief originally named a cause from a single ledger entry. It now sums the last
  five sols and only claims a cause when it is more than half the loss, per the plan's
  attribution rule; otherwise it says it is not sure.
- No browser automation is installed, so the real-browser acceptance pass (TASK-049) is
  still outstanding. `npm run check`, `npx vitest run` (410 passing) and `npm run build`
  all pass.

**Next**

- Human browser pass: naming → briefing → supply → launch → interior → landing-site →
  base → act → debrief → Play again, plus keyboard-only and reduced-motion.
- Decide whether to keep the cut sprites/cutscenes (TASK-047) or ship the loop as is.

---

## 2026-11-07 — Fix the landing-site panel, scores and keyboard (ISS-036 to ISS-039)

**Did**

- Wrapped the two thumbnail layers in the missing `.landing-site__thumbnails`
  positioned container and required it in the view. Without that wrapper the
  absolute images anchored to `.landing-site` (`position: fixed`) and covered the
  whole viewport, swallowing pin clicks; selecting a region then showed the
  thumbnail full-screen. Moved the preview above the site name to match the
  reference panel.
- Made the pin labels visible at rest (they were `opacity: 0`, so the map read as
  nameless) and orange when selected.
- Replaced the per-pin key handlers with one delegated roving-tabindex group:
  the five pins are one Tab stop, `←/→/↑/↓` cycle, `Home/End` jump, and native
  button activation handles Enter/Space.
- Built the five score dots per axis on mount (the markup had empty containers
  and the view toggled `is-filled` on the container itself, so no score ever
  showed) and added `role="img"` + `aria-label="N out of 5"`.
- Fixed two `check-markup` bugs that had hidden this screen: the mounts regex now
  accepts quoted keys, so `landing-site` is validated; Rule 6 now resolves each
  mount id to its view through `registry.ts` instead of searching view files for
  `"#id"` (which only matched interior). `check` now reports six routed screens.

**Files**

- Updated: `index.html` (thumbnail wrapper, pin-list hook), `src/features/landing-site/view.ts`,
  `src/features/landing-site/landing-site.css`, `scripts/check-markup.mjs`,
  `docs/team/issues.md`, `docs/team/progress-log.md`.

**Problems**

- The screen had never been exercised in a real browser: every check was green
  because `check-markup` skipped `landing-site` entirely (ISS-037) and its
  section-scoping rule only ever checked `interior` (ISS-038). Both are fixed.
- The supplied map and thumbnails are 1300×800 and 480–800 KB each, well over the
  plan's 16:9 / 60 KB target. Pin positions are stage percentages, so
  `object-fit: cover` crops the 1.625:1 map inside a 16:9 stage and can drift
  pins off their features. Resize/crop the assets or set the stage to 13:8.

**Next**

- Real-browser acceptance pass on `#/landing-site`: click every pin, confirm the
  panel populates and LAND HERE enables, rove with arrows, test reduced motion
  and back/forward. Resize the map and thumbnails afterwards.

---

## 2026-11-06 — Build the landing-site choice screen (TASK-028, ISS-017)

**Did**

- Added `src/sim/regions.ts`: pure authored table of the five regions (Arcadia
  Planitia, Jezero Crater, Olympus Mons, Valles Marineris, Argyre Basin) with
  pin positions as stage percentages and five axis scores (0-5 integers, higher
  = better). Totals stay within ±1 of 17/25, no perfect site, no randomness.
- Replaced the `features/landing-site/` stubs: `model.ts` now exports
  `scoreRegion`, `tradeoffSummary`, `totalScore` and `strengthAndWeakness`
  (importing the region table from `sim/regions.ts`); added `model.test.ts`
  with 11 literal-input tests covering axes, totals spread, summary wording,
  unknown-id safety and pin bounds.
- Added `features/landing-site/view.ts` (`mountLandingSite(root, run, setRun)`
  → teardown), `landing-site.css`, and the `<section id="landing-site">`
  markup in `index.html` outside `#landing`. Map fades up, five pins are
  keyboard-operable buttons with `aria-pressed` and arrow-key roving, the panel
  is `aria-live="polite"`, score dots fill with a 60 ms stagger, LAND HERE
  enables on first selection, and the landing transition scales the map toward
  the chosen pin then navigates on a tracked timer cleared in teardown.
- Registered `landing-site` in `src/ui/registry.ts` (`SCREEN_MOUNTS` and
  `SCREENS`). `nextStop('interior')` now resolves to `landing-site`; `nextStop('landing-site')`
  stays `landing` until `base` exists. Updated `registry.test.ts` (12 tests).

**Files**

- Added: `src/sim/regions.ts`, `src/features/landing-site/model.test.ts`,
  `src/features/landing-site/view.ts`, `src/features/landing-site/landing-site.css`.
- Updated: `src/features/landing-site/model.ts` (stubs replaced), `index.html`
  (added `#landing-site`), `src/ui/registry.ts`, `src/ui/registry.test.ts`,
  `docs/team/decisions.md` (D-029), `docs/team/tasks.md` (TASK-028 done),
  `docs/team/issues.md` (ISS-017 fixed), `docs/team/progress-log.md`,
  `docs/architecture.md`, `AGENTS.md` §1 and §8.

**Problems**

- None; `npm run check` (imports + markup + tsc) and `npm test` pass cleanly.
  No browser is connected to this session, so keyboard/animation behaviour has
  not been eyeballed in a real browser (ISS-013); the acceptance checklist in
  the plan still needs a browser pass.
- Assets: `Assets/images/landing-site/map.webp` plus five thumbnail WebPs were
  placed by the user before this work; the view imports them as typed assets.

**Next**

- Open `#/landing-site` in a real browser: Tab/arrows to a pin, Enter to select,
  Tab to LAND HERE; confirm the landing transition navigates and back/forward do
  not leave two screens visible. Verify `prefers-reduced-motion` removes the pin
  pulse and reticle spin.

---

## 2026-10-22 — Make the player try again on the ration check, on purpose (ISS-034, ISS-035)

**Did**

- Replaced the timed revert on a wrong answer with a TRY AGAIN button. The alarm frame
  now stays up until the player presses it; pressing it takes the room back to the
  question frame, re-enables the choices that were not retired, and asks the question
  again in the bubble. The retired option stays struck through and stays retired.
- Removed `RETRY_DELAY_MS` from `supply/view.ts` — the timer is gone, and
  `noUnusedLocals` would have failed the typecheck on the dead constant.
- Left the answer out of the working while the player is still trying
  (`workingSentenceBlanked`: "…so 240 divided by 3 is ___ packets.") and completed it
  once the answer has been earned. Both sentences are built from one `workingText`
  helper, so the two versions cannot drift apart.
- Gave no directional hint on the first wrong answer — the alarm frame, the blanked
  working and the question still in the bubble. From the second wrong answer on, the
  hint appears. A direction on the first attempt answers the question of which way to
  go before the method has been used.
- Moved focus to the TRY AGAIN button when a wrong answer lands. Every choice button is
  disabled at that moment, so focus would otherwise fall back to the body and a keyboard
  player would have nowhere to be.

**Files**

- Updated: `src/features/supply/model.ts`, `src/features/supply/model.test.ts`,
  `src/features/supply/view.ts`, `src/features/supply/supply.css`, `index.html`,
  `docs/team/issues.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, this log.
- Added: nothing. No new file, so `docs/architecture.md`'s file tree is unchanged — and
  the supply feature is still missing from its contract table, which is ISS-024.

**Problems**

- `node_modules` was not installed on this machine, so `npm run check` and `npm test`
  could not run at all until `npm install` was run. No dependency was added; the
  install only fetched the dev dependencies already in `package.json`.
- The rail is now one button taller on the right-answer path, because the completed
  working stays up beside CONTINUE where it used to be cleared. It is bottom-anchored
  and 20% wide on the right of the stage, so it grows upward over the wall rather than
  over the astronaut or the checklist — but this has not been looked at in a browser.
- There is still no way to test any of this in the repo. The view is DOM code and Vitest
  runs in node with no DOM (ISS-013), so the flow was checked with a throwaway DOM stub
  — mounted the view, clicked through the six facts, picked a wrong answer, confirmed no
  hint was given and the question was still up, waited past the old 1100ms and confirmed
  nothing moved on its own, pressed TRY AGAIN and confirmed the room went back to the
  question with the wrong option still retired, picked wrong again and confirmed the
  hint arrived that time, then answered correctly and confirmed the completed working.
  The harness was deleted rather than committed: hand-rolled DOM stubs are not a pattern
  this repo has agreed to, and TASK-009 (jsdom) is the right home for it. The model half
  is covered by five new tests on `workingSentenceBlanked`.

**Next**

- Open `#/supply` in a browser and play it through: pick a wrong answer, confirm the
  alarm frame stays, press TRY AGAIN, confirm the question comes back and the struck-
  through option stays dead, then answer correctly and confirm the completed working
  and CONTINUE. Check the rail against the artwork at the same time, since that is the
  one thing that could look wrong — the DOM stub cannot see how it looks.

---

## 2026-10-22 — Replace the parts tour video with an interactive parts panel (ISS-033)

**Did**

- Replaced the `parts.mp4` beat in the launch reel with an interactive parts tour panel: overview slide first, then one named part at a time.
- Each slide shows the part image (from `Assets/images/parts/*.webp`, each with one part outlined in colour), the part name as text, and the part description as text.
- Added Prev / Next buttons between slides, disabled at the boundaries so the player can look back; a Continue button hands off to the next screen.
- Panel is the whole screen: title (accent dot + name), marked-up part image, description, and Prev / Next / Continue at the bottom.
- Cinematic shots/clips are hidden (`visibility: hidden`) behind the panel via a `launch__cinematic-dimmed` class on `root`, so nothing leaks at the edges.
- Moved the Prev/Next/Continue row up (tighter card gap and control margin).
- Added a subtle shake animation (`launch-parts-shake`, 0.4s infinite) on the part image only — text stays still; disabled under reduced motion.
- Navigation wraps from Orion back to the overview once (`partsLooped` flag); fixed `partsNext.disabled` so Next is enabled on Orion (previously disabled, blocking the wrap); shows the "all together" slide one final time with Prev enabled / Next disabled.
- Shake reduced to subtle vibration: scale(0.998/1.002) replaces translateX, creating a whole-rocket trembling feeling without left-right oscillation (was ±4px / ±0.5deg / 0.4s which slid sideways).
- Visual leak fixed: `launch__cinematic-dimmed` CSS now also hides `.launch__video` (the main launch film carrying the walk image) and `.launch__flash`, not just `.launch__shot` and `.launch__clip`.
- Removed `PARTS_DURATION_MS` from the model; `TOTAL_DURATION_MS` is now title + shots + both films only.
- Added `PARTS` interface and array to `launch/model.ts`, with tests.

**Files**

- Updated: `src/features/launch/model.ts`, `src/features/launch/view.ts`, `src/features/launch/launch.css`, `src/features/launch/model.test.ts`, `index.html`, `docs/architecture.md`, `docs/team/issues.md`, this log.

**Problems**

- None; `npm run check` (imports + markup + tsc), `npm test` (263/263), and `npm run build` all pass cleanly. The build drops `parts.mp4`/`parts-poster.webp`/`docked_info.jpg` from the bundle and bundles the five part WebPs instead.

**Next**

- A real browser playthrough of the launch reel (no browser is connected to this session).

---

## 2026-10-21 — Make the launch reel stream smoothly on a slow connection (ISS-032)

**Did**

- Re-encoded the three films at 1280x720, H.264 main, `yuv420p`, with `+faststart` and no
  audio track. The reel is now 2.16 MB instead of 14.10 MB; the frame counts and timings are
  unchanged, so the schedule in `launch/model.ts` still matches the media.
- Checked the new files with PyAV: launch 5.000s/150 frames/1.42 Mb/s, docking
  3.000s/90 frames/0.76 Mb/s, tour 12.000s/360 frames/0.66 Mb/s. The `moov` atom is before
  `mdat` in all three.
- Compared source and encoded frames side by side at the launch, docking and each tour
  caption. The text in the tour is still legible at 720p.

**Files**

- Updated: `Assets/images/launch/launch-cinematic.mp4`, `Assets/video/docking.mp4`,
  `Assets/video/parts.mp4`, `docs/team/issues.md`, this log.

**Problems**

- No browser is connected to this session, so the reel still needs a real slow-network
  playthrough. The build proves the new assets are fingerprinted into `dist/`; it cannot
  prove the user's link now stays ahead of playback.
- 720p is a deliberate trade: smaller and cheaper to decode than the 1080p originals, at the
  cost of some fine detail on a large display. The originals remain in git history.

**Next**

- Deploy the new bundle and test the launch on the same connection that produced the
  slideshow. If it still stutters, the next step is a lower-resolution 540p variant rather
  than another schedule change.

---

## 2026-10-21 — Stop the launch reel showing black and skipping on a slow connection (ISS-030)

**Did**

- Serialised the three films: only the launch film is assigned a `src` at mount; the docking
  clip and the tour load when the beat before them starts, so one film is on the wire at a
  time instead of ~13.8 MB at once.
- Gave each clip a poster frame (`tools/extract-posters.py`, ~90–98 KB each): the pad for the
  film, the finished joint for the docking clip, and the tour's title card — not its first
  frame, which is black.
- Made the reel media-driven: a beat starts at the later of its slot and its clip's readiness
  (`resolveBeatStart`, now in the model and tested), each beat chains on the previous clip's
  `ended`, and the hand-off fires when the tour ends rather than at a fixed 25.25s. A clip
  that errors keeps its poster and advances on its nominal duration.
- The video fade is a class-triggered transition instead of a delayed animation, so the
  dissolve starts when there is a picture rather than on the clock.

**Files**

- Updated: `src/features/launch/view.ts`, `src/features/launch/launch.css`,
  `src/features/launch/model.ts`, `src/features/launch/model.test.ts`, `index.html`,
  `tools/extract-posters.py`, `Assets/images/launch/launch-poster.webp`,
  `Assets/video/docking-poster.webp`, `Assets/video/parts-poster.webp`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/issues.md`, `docs/team/tasks.md`, this log.

**Problems**

- No browser is connected to this session, so the reel could not be watched play. Verified at
  the build layer instead: the built HTML carries `preload="none"` on the two later clips, the
  bundle contains the new logic, the three posters are fingerprinted into `dist/`, and
  `npm run check` + `npm test` (216) pass. The DOM half is untestable here (ISS-013) — the
  media-driven schedule needs a real slow-network check before it is called done.
- The poster frames were chosen by eye from the rendered frames: 0.5s and 2.4s are the frames
  reduced motion already holds, and the tour's is its title card at 0.3s.

**Next**

- Open the launch route on a throttled connection and confirm no black frame, no cut and no
  skip, and that the hand-off waits for the tour. That is the one check this change still
  needs.

## 2026-10-21 — Play the docking clip and the tour after the launch film (ISS-028, ISS-029)

**Did**

- Wired `Assets/video/docking.mp4` and `Assets/video/parts.mp4` into the launch screen: the
  launch film, then the docking clip, then the tour, all from one hand-off. The two start
  times are derived from the three lengths in `launch/model.ts`, so the runtime is 25.25s and
  no clip can overlap the one before it.
- Found that both clips were MPEG-4 Part 2 (`mp4v`), which Chrome and Edge will not decode,
  and switched both renderers to H.264 (`libx264`, `yuv420p`, CRF 18) through PyAV. The
  re-render is the same 90 and 360 frames, silent, and smaller: 1.7 MB and 5.5 MB.
- Reduced motion holds the launch film and the docking clip on a frame and plays the tour,
  because the tour's content is four captions in sequence.

**Files**

- Updated: `src/features/launch/model.ts`, `src/features/launch/view.ts`,
  `src/features/launch/launch.css`, `src/features/launch/model.test.ts`, `index.html`,
  `tools/render-docking.py`, `tools/render-parts.py`, `Assets/video/docking.mp4`,
  `Assets/video/parts.mp4`, `docs/architecture.md`, `docs/team/decisions.md`,
  `docs/team/issues.md`, `docs/team/tasks.md`, this log.

**Problems**

- The codec was the real reason the clips would not have played, and it was invisible from
  the source: `cv2.VideoWriter` accepts `mp4v` and the files open in a desktop player. It
  only shows up when the fourcc is read back or the video is opened in a browser. Logged as
  ISS-029 and fixed before wiring.
- No desktop browser in this session, so the reel was verified at the HTTP layer (both MP4s
  served as `video/mp4`) and from decoded frames, not by watching it play.

**Next**

- The player walks `naming -> briefing -> supply -> launch` and watches the full 25.25s; the
  pacing is three constants in `launch/model.ts` if it drags.

## 2026-10-21 — Retime the parts segment (ISS-027)

**Did**

- Replaced the hand-written segment table with a builder driven by `BEAT_S`, so the runtime
  is derived from the pacing instead of typed beside it. Each part now holds 2.0s, so
  `parts.mp4` is 12.0s / 360 frames, up from 6.6s / 198.
- Measured where the hanging solar panels end (y 0.856–0.859 of the frame across the five
  stills) and moved the lower-third bar from 0.80 to 0.87, so the text sits below the craft.

**Files**

- Updated: `tools/render-parts.py`, `Assets/video/parts.mp4`, `docs/architecture.md`,
  `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- The panel extent could not be read by eye — the panels are thin and the frame is dark.
  Found it by masking blue, low-brightness pixels in the panel column. That measurement is
  now the comment on `BAR_TOP`, so the next person does not have to guess it again.

**Next**

- The player re-watches and says whether 2.0s a part is enough; it is one constant to change.

---

## 2026-10-21 — Render the "meet the spacecraft" segment (D-024)

**Did**

- Measured the five stills. The four part stills are one base render (1364x768) with a
  different part outlined and a baked label card; the overview is a separate render
  (1671x941). The craft is the same scale in both (height 0.932 vs 0.931 of the frame), so
  only the baked cards differ.
- Wrote `tools/render-parts.py`: cross-dissolves the four part stills under a slow push-in,
  draws a lower-third description bar for each, and fades through black in and out of the
  overview. Encodes `Assets/video/parts.mp4` (6.6s, 1920x1080, 30fps, mp4v, silent).
- Added the four descriptions (propulsion, habitat, logistics/safe haven, Orion).
- Converted the five source images to WebP in `Assets/images/parts/`.

**Files**

- Added: `tools/render-parts.py`, `Assets/images/parts/{overview,propulsion,habitat,logistics,orion}.webp`,
  `Assets/video/parts.mp4`, and the docs below.
- Updated: `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- I mapped the four source filenames to the wrong parts — the names carry no hint — so the
  first render paired each description with the wrong image. Caught by viewing the
  keyframes; logged as ISS-025 and fixed by regenerating the assets.
- Two description bars overlapped during a cross-dissolve, because both shots' bars sit at
  the same place. Fixed by staggering the bar fades so only one is ever on screen.
- The overview is a different render, so cross-dissolving it with the stills ghosted both
  sets of baked label cards. Fixed with a fade-through-black for the two overview
  transitions.

**Next**

- The player checks the segment in their editor and confirms the descriptions.
- If a description needs rewording, it is one line in `PARTS` in `tools/render-parts.py`,
  then re-render.

---

## 2026-10-21 — Render the 3-second docking clip (D-023)

**Did**

- Measured the three stills (all 1670x942): the head's bounding box, the ~90px separated gap,
  the ~100px closing shift, and the joint at (66.5%, 52.0%). Sampled pixels rather than
  eyeballing; the head sits entirely over pure black space (R0 G0 B1-9), so its background can
  be rebuilt by inpainting with no Earth reconstruction.
- Wrote `tools/render-docking.py`: cuts the head out as an RGBA sprite (luminance ramp +
  connected-component filter so stars do not ride along), rebuilds the background by
  inpainting the head's *shape*, and moves the sprite across a camera push-in. Encodes
  `Assets/video/docking.mp4` (1920x1080, 30fps, 3.0s, mp4v, silent).
- Effects: a smoothstep approach, a warm glow that builds as the head closes, a contact flash
  and an expanding shockwave ring at 1.80s, a couple of pixels of settle, then a held docked
  frame with a breathing latch ring.
- Converted the three source PNGs to WebP in `Assets/images/docking/`.

**Files**

- Added: `tools/render-docking.py`, `Assets/images/docking/{separated,docked,station}.webp`,
  `Assets/video/docking.mp4`, and the docs below.
- Updated: `docs/architecture.md`, `docs/team/decisions.md`, `docs/team/issues.md`, this log.

**Problems**

- The first render showed a hard black rectangle where the head had been. The bounding-box fill
  was pure black while the surrounding space carries a subtle gradient, so the rectangle was
  visible. Fixed by inpainting the head's shape instead of filling the box (ISS-023).
- The docking shift came from a cross-correlation whose minimum is flat between 96 and 114px.
  The rendered joint was checked against the reference `docked.webp` crop and lines up, but the
  number is a starting point, not a measurement — tune it against a render if the seam ever
  shows.
- The `architecture.md` file tree predates the launch, briefing and supply features and their
  images, so it does not describe the tree as it is (ISS-024). Only the new entries were added
  here.

**Next**

- The player checks the clip in their editor and confirms the look.
- If docking is ever built as an in-game screen, port the script's geometry constants into a
  `features/docking/` cinematic.

---

## 2026-10-07 - Restore the stills ahead of the film (ISS-022)

**Did**

- Restored the press conference and walk-to-rocket stills verbatim: same shots,
  camera moves, flashes, model tests and markup checker rule.
- Added the film as the final beat: it cross-dissolves in over the walk shot
  starting one fade before the walk ends, playback begins when the walk ends,
  and the hand-off fires the moment the film does.
- Reduced motion now keeps every opacity fade (they are how the sequence is
  timed) and removes only the camera moves and flashes; the film is parked on
  the pad frame for its full duration.

**Files**

- Updated: `src/features/launch/{model,model.test,view}.ts`, `launch.css`,
  `index.html`, `scripts/check-markup.mjs`, `docs/architecture.md`,
  `docs/team/issues.md`, this log.

**Problems**

- The first cut of this fix (ISS-021) deleted the stills outright. Caught by the
  player before any commit; see ISS-022. The lesson is the one the stand-in
  comment already said: a stand-in that looks finished gets removed by the next
  person who arrives, so the stills should have been marked as content, not
  placeholder.

**Next**

- The player confirms the full sequence on the demo machine: title, conference,
  walk, film, hand-off.

---

## 2026-10-07 — Replace Pages deployment with a Vercel CI gate

**Did**

- Replaced GitHub Pages publishing with a Vercel CLI deployment that runs only after the
  `Code checks` workflow succeeds for a push to the default branch.
- Made the deploy workflow fail its gate when checks fail, and prevented native Vercel Git
  deployments from creating an ungated parallel deployment.
- Updated README workflow badges to point to the original repository and Vercel workflow.

**Files**

- Updated: `.github/workflows/deploy.yml`, `README.md`, `docs/CHANGELOG.md`, architecture
  and codebase deployment docs, task TASK-032/TASK-035, and this log.
- Added: `vercel.json` with Git integration deployments disabled and
  `docs/pull-requests/003-vercel-deployment-gate.md`.

**Problems**

- Deployment requires the Vercel project identifiers and API token to be configured as
  GitHub repository secrets. The workflow fails with a direct setup message if any is absent.

**Next**

- Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in the original repository,
  link its Vercel project, then verify a passing default-branch run deploys successfully.

**Doc updates made:** changelog, deployment decision D-022, architecture/codebase contracts,
PR description, tasks, and this progress log.

---


## 2026-10-07 - Wire the launch film into the launch screen (ISS-021)

**Did**

- Moved the rendered film to `Assets/images/launch/launch-cinematic.mp4`, the
  feature's own asset folder.
- Rebuilt the launch screen around it: the title card holds for 900ms, lifts,
  and the film plays once underneath; the hand-off fires at
  `TOTAL_DURATION_MS` (title + film, derived in the model).
- Reduced motion holds one frame of the film (0.5s, the pad) for the same
  runtime instead of playing it.
- Removed the two-still CSS cinematic: the shots, the camera moves, the press
  flashes, and the checker rule that cross-checked their timings.

**Files**

- Updated: `src/features/launch/{model,model.test,view}.ts`, `launch.css`,
  `index.html`, `scripts/check-markup.mjs`, `docs/architecture.md`,
  `docs/team/issues.md`, this log.
- Moved: `Assets/images/launch-cinematic.mp4` -> `Assets/images/launch/launch-cinematic.mp4`.

**Problems**

- The Gyan FFmpeg build has no `-filter_complex_script`, so the filter graph
  was passed inline as a variable instead. No effect on the output.
- `press.webp` and `walk.webp` are now unused. Left in place rather than
  deleted — removing assets is the owner's call.

**Next**

- The player confirms the film plays after the title on the demo machine.
- If the stills are wanted again, they are one import away in `view.ts`.

---

## 2026-10-07 — README header order for PR #2

**Did**

- Reordered the README header to title, astronaut image, badges, short description, then
  index, as requested.
- Moved the existing four-sentence opening description intact; other README prose remains
  unchanged.

**Files**

- Updated: `README.md`, `docs/pull-requests/002-readme-polish.md`, this log, and TASK-034.

**Problems**

- None. The reordering leaves all index IDs and targets unchanged.

**Next**

- Push the update to PR #2 and refresh its description.

**Doc updates made:** PR description, task TASK-034, and this progress log.

## 2026-10-07 — README polish on a separate PR branch

**Did**

- Confirmed the merged CI PR did not include the proposed README polish, then branched from
  the updated `origin/main` to prepare a separate PR.
- Added TypeScript, Vite, Vitest, and MIT badges, the existing astronaut sprite, and an
  index for the existing README sections. Left existing prose untouched.

**Files**

- Updated: `README.md`, `docs/CHANGELOG.md`, this log, and TASK-034 in `docs/team/tasks.md`.
- Added: `docs/pull-requests/002-readme-polish.md`.

**Problems**

- Emoji and numbered headings make generated anchors inconsistent; explicit IDs are used
  for reliable index navigation.

**Next**

- Commit and push this branch, then create PR #2 against `main`.

**Doc updates made:** changelog, PR description, task TASK-034, and this progress log.

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
