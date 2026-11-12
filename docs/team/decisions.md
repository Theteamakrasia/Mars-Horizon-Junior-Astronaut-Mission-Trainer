# Decisions

Every choice someone might otherwise relitigate. **Newest first.**

The **Rejected** line is the point of this file. It is what stops the same dead end
being re-explored in week four. If you are about to propose something that appears
under Rejected below, read that entry first.

Format: number · who decided · **Choice** · **Why** · **Rejected** · **Consequence**.

---

**D-082 — agent — 2026-11-12**
**Choice:** The game's pictograms are the **56 drawn SVGs supplied in `Assets/icons/`**, not the 35 line drawings `src/ui/icons.ts` used to hold by hand, and the last of the emoji are gone from the UI with them. The set is read from the asset files at build time — `?raw` imports, parsed into path data — and drawn as **one inline `<svg>` per icon**, exactly as before: `icon(name, label?)` still returns an `SVGSVGElement`, and every call site is unchanged. The drawings are **filled and coloured** (cream `#FFF4DB`, navy `#293A49`, orange `#D66B46`, teal `#78B6AE`, yellow `#F6C65B`, blue `#8AC9E0`), so they no longer follow `currentColor`; they carry their own paint, and the CSS around them is sized for a picture rather than for a line. `RESOURCE_ICON` maps the five stores to `power` / `oxygen` / `water` / `food` / `shielding`, `RANK_ICON` maps the five ranks to the five rank drawings, and a new `MODULE_ICON` maps the eight module kinds to the eight `*-module` drawings. The eight module emoji leave `sim/modules.ts` and `features/encyclopedia/model.ts` outright, as D-070 removed them from `sim/activities.ts`, `sim/science.ts` and `sim/patches.ts`: a pure model carries no pictogram. The one drawing with no supplied counterpart — `close`, used by the guide popup, the section sheet and the training dialog — stays the old line drawing, scaled into the same 96-unit box and keeping its `currentColor` stroke, so it still tints with the button it sits in. This supersedes D-070's "every pictogram on the act screen is an SVG line drawing from `ui/icons.ts`".
**Why:** the set was drawn for this game, in the game's palette, in the same hand as the module artwork already on the outpost panel, and it was on disk while the game was still drawing its own. Two icon styles in one product is the thing a child notices first: a picture next to a line drawing reads as two games. The drawings are filled, so they also carry more meaning at a small size than a stroke can — a solar array with a battery, a barrel of water, a radiation wall — which is what a pictogram is for at 16 pixels. Keeping them inline matters: `icon()` returning one `<svg>` is what lets a tile, a HUD card and a warning sit side by side without a second layout, and it keeps `ICON_PATHS` pure data a test can read without a browser. The `close` exception is deliberate and narrow — the supplied set has no X, and the three places that need one are chrome rather than pictures, so a tinted line drawing is the right thing there and an `alert` triangle would not be.
**Rejected:** (a) Keeping the emoji — D-070's reason stands: they are drawn by the operating system, so they are a different picture on every machine, at a size the game cannot set, and they read as decoration rather than as a control. (b) Keeping the 35 line drawings alongside the new set — two styles, and the line drawings are the ones that were not designed. (c) One `<img>` per asset, with Vite fingerprinting each file — simpler, but 56 separate asset files in the build, no inline SVG, and a second thing for the layer checker to allow. (d) A generated TypeScript file holding the parsed paths — no runtime parsing, but a generated file and a second source of truth to keep in step with the assets; the parse is forty lines of string work and can be tested where it lives. (e) Flattening the drawings to a single colour so they can follow `currentColor` — that throws away the palette the set was drawn in, and a filled picture in one ink is a smudge. (f) Reusing `alert` for the close buttons — it reads as a warning, and a warning on a button that dismisses something is a lie. (g) Replacing the module artwork (`Assets/images/game-loop/*.png`) with the new module icons as well — the PNGs are the big artwork on the outpost panel and the encyclopedia, and the new drawings are the small ones; they are two sizes of the same thing, not two versions of it.
**Consequence:** `src/dom/svg.ts` learns colour: `Shape` carries `fill`, `stroke`, `strokeWidth`, `linecap`, `linejoin` and `fillRule`, the old "fill this dot" boolean is gone, and `svg()` takes the `viewBox` from its attributes. `src/ui/icons.ts` reads the 56 assets, parses them into `ICON_PATHS`, and exports `IconName` (the 56 file names), `RESOURCE_ICON`, `RANK_ICON`, `MODULE_ICON` and `icon()`; `src/ui/icons.css` is retuned, because a filled 96-unit picture needs more room than a 24-unit line did. `sim/modules.ts` loses `ModuleSpec.emoji` and `features/encyclopedia/model.ts` loses `EncyclopediaEntry.emoji`. `features/act/view.ts`'s `ORDER_ICON` and `features/debrief/view.ts`'s `PATCH_ICON` point at the new `rest`, `survey`, `no-skip` and `night-watch` drawings. The emoji that had no supplied counterpart — the speaker on "Read aloud", the stop square, the door on "Exit", the menu bars — become plain words, and the ones that did — the stars, the padlock, the tick, the points mark — become drawings. `scripts/check-imports.mjs` resolves relative **asset** imports as well, so a mistyped asset path fails the check instead of the build. `icons-list.md` is brought back into line with the files on disk. Logged as ISS-097.

---

**D-081 — agent — 2026-11-12**
**Choice:** The written-down training record is **per run**. Beginning a run — naming the astronaut, or "play again" on the debrief — **clears it**, so a new run starts with no games played, today's orders locked and no training points on the score. The record is still written as games are finished, and still read when the desk mounts; it is no longer a way for a day's training to survive a refresh, which supersedes the persistence sentence in D-076. This follows the newest code on the tree (`70eb857`), not a change made here.
**Why:** There is no save (D-003), so a refresh is not a continuation of anything: the run is gone, the player names themselves again, and the next sol is sol 1. A record that outlived that handed the **new** run the **old** run's two games and the points they were worth — the player was paid twice for the same pair, and today's orders opened before the crew had trained in this run at all. D-076 kept the record precisely so a refresh could not be used to replay the same two games for points, and that reasoning assumed the run survived the refresh; it does not, so the record was only ever carrying state across runs. Inside a run the rule is unchanged and still enforced: `RunState.training` and the record agree, and the lock is the first thing a player meets on a sol.
**Rejected:** (a) Keeping D-076's behaviour and removing the clear — a refreshed or replayed run inherits the previous run's games and points, which is the leak. (b) Clearing only on the debrief's "play again" and not on naming — quitting to the menu and starting a new mission then inherits the old record and its points, and naming is the only door into any run in this game. (c) Deleting the record and its storage outright — a bigger change than this fork needs, and the record is the right home for a day's games if a save ever lands (D-003). (d) Keying the record by the astronaut's name — two runs can share a name, so it would be a guess at which run is which. (e) Keeping the check as written and declaring the code wrong — the check is the older of the two and was asserting a rule the tree no longer keeps; a check that a green tree fails is the thing that is out of date.
**Consequence:** `ui/training.ts` gains `clearTrainingRecord()`, called from `features/naming/view.ts` on submit and from the debrief's "play again". `tools/browser-check-training.mjs`'s last step asserts the opposite of what it used to: a refresh starts a new run with 0/2 games, the orders locked, the six games playable again and no training points carried over. `docs/architecture.md`'s `ui/training` row and its file-tree note, and `README.md`'s training paragraph, no longer say the day survives a refresh. Logged as ISS-095.

---

**D-080 — agent — 2026-11-12**
**Choice:** The encyclopedia — the book in the header — is **earned at the outpost**. It is drawn on `base`, `act` and `debrief`, the three screens with a landed run, and on no screen before them: the landing-site map keeps the byte-identical header and no book. `ScreenOptions.showEncyclopedia` is now **off unless a screen asks for it**, rather than on unless a screen declines, and the three screens ask with the new pure `hasReachedOutpost(run)` in `sim/run.ts` — true once a landing site has been chosen.
**Why:** The book is a reference to equipment and modules, and before the outpost exists the player has met none of it. On the landing-site map it was one click away: it listed every module in the game by name, described systems the player had not been offered yet, and offered a way out of the journey entirely, so a child could read the ending of the build screen before playing it. It also read as a promise that the game had started when it had not — the map is where the run is still being chosen. Reaching `base` is the moment the crew owns an outpost and the moment a reference becomes a reference to something. Making the option opt-in is the second half of the same choice: the leak happened because the book was visible unless someone remembered to hide it, and every screen added before the outpost would have inherited it the same way. The safe default is the one where forgetting shows no book.
**Rejected:** (a) Keeping the default and passing `showEncyclopedia: false` on the landing-site map — one line, and the player sees the right thing today, but the leak stays the *default*, so the next screen added before `base` inherits it unless someone remembers. (b) Showing the book once a region is picked, while still on the map — the run has not started, the outpost does not exist, and the header would flicker a control into being mid-screen. (c) Showing it once any module exists — `base` is where modules are chosen, so the book would be missing from the screen that most needs it. (d) A `hasUnlockedEncyclopedia` flag written into `RunState` — a second copy of a fact the run already holds, and one more field to keep in step on every `landAt`. (e) A per-screen constant instead of the predicate — it works for the three screens, but `base` draws itself from `newRun('')` when it is handed no run, and a screen-local `true` would offer the book for a run that never landed.
**Consequence:** `sim/run.ts` gains `hasReachedOutpost(run: RunState | null): boolean`, covered by four tests in `run.test.ts`. `ui/gameLoop.ts` draws the book only when `showEncyclopedia === true`, and the option's doc comment says why. `base`, `act` and `debrief` pass `hasReachedOutpost(run)`; the act screen's "not ready" fallback and the debrief's empty state pass nothing and therefore show no book. `encyclopedia` drops its redundant `showEncyclopedia: false` — the default now says it. `landing-site` is untouched and loses the book by not asking for it. `tools/browser-check-build.mjs` asserts both ends of the rule: no book on the map, a book on the build screen. Logged as ISS-094.

---

**D-079 — agent — 2026-11-12**
**Choice:** The **mini game opens in its own sheet**, layered over the sheet it came from — never inside another section. The "inspect" button on an order opens the tool's sheet on top of **Today's tasks**; the desk sheet holds a note from home and the rover's find and nothing else, in any state. Closing the tool returns the player to the order they were working, and a tool **cannot outlive the section it was opened from**: closing that section, or opening the guide, closes the tool with it. The stacking ladder gains a rung for it — **108, the tool sheet, over the section sheet at 105**.
**Why:** A tool belongs to an *order*, not to the desk. When the hub moved every section into a sheet (D-070), the tool was left where it had always been — part of the desk — and the "inspect" button was made to reach it by switching the player to the desk sheet. That worked, and it merged two unrelated things: the player asked for the checklist and got the desk with the checklist in it, and because the tool's state was cleared in one place only, it was still there the next time the desk opened (ISS-093).

---

**D-078 — agent — 2026-11-12**
**Choice:** The how-to-play guide is a **popup with the astronaut doing the talking**. The guide opens over the build screen and the desk as a dimmed backdrop with the crewmate standing on the left and a **speech bubble on the right** — one step per page, a navy "How to play" pill on the bubble's top edge, a tail pointing at the astronaut, **Next**, **Back**, ten page dots, a **Read aloud** button and a close button. The ten steps themselves are unchanged: they are still the ten in `sim/guide.ts`, in the same order, with the same words. The guide is **mounted on `document.body`** rather than inside the screen it explains, and it is **one page at a time** rather than one scrolling list. It opens from the `?` icon already in the header, beside the encyclopedia book and Menu; no new button was added, and the existing `?` keeps its place.
**Why:** The guide was a list of ten panels stacked in a scroll, and ten panels of two lines each is a wall — a child opening it had to read a page of text before any of it applied to anything. A speech bubble is the shape the game already uses for the crew talking (the world panel's crewmate line, the supply screen's bubble beside the astronaut), so the guide now looks like the game rather than like a manual dropped on top of it. One page at a time is the reason it works for the youngest players: a page is two short sentences and one thing to press, and the astronaut is visibly the one speaking, which is what "someone is explaining this to you" looks like to a seven-year-old. The words did not need changing — the ten steps were already one sentence each, written for a child — so they were left alone and only the *delivery* changed. Mounting the popup on `document.body` is the fix for a real fault found while building it: both the build screen and the desk redraw themselves when the live space weather arrives, and a popup that lived inside the screen was rebuilt from scratch on every redraw, throwing a child reading page three back to page one and replaying the entrance animation. Outside the screen, a redraw behind it changes nothing.
**Rejected:** (a) Rewriting the ten steps to be shorter — they were already one sentence each, and the problem was how many were on screen at once, not how long each was. (b) A tab per step instead of Next/Back — tabs make the steps siblings, and they are a story with an order; a child would have to guess which tab to open. (c) Keeping the scrolling list and just styling it as a bubble — a bubble that needs scrolling is a list wearing a costume, and the tail would point at nothing. (d) The astronaut **inside** the bubble rather than beside it — the reference image has him standing outside it, and a figure inside the balloon is a sticker, not a person talking. (e) Putting the guide on its own route/screen instead of over the one being explained — the thing the guide describes stays behind the popup; that is the whole point of a dialog here, and a screen would lose it. (f) A new button somewhere else to open it — the `?` already exists in the header, beside the book and Menu, and a second way in is a second thing to explain. (g) **Auto-reading the page aloud with the browser's voice** — it would talk over the game the moment it opened, with no way to stop it before it started; the Read aloud button is there instead, so nothing speaks unless the child asks. (h) Keeping the popup inside the screen element and preserving the page across redraws in JS — the state would have had to be lifted into both feature views and threaded through every redraw, for a problem that mounting it one level up solves outright. (i) A dimmed backdrop over the whole page — considered and kept: the guide is a dialog, and a dialog that leaves the rest of the screen bright is not read as a dialog.
**Consequence:** `src/ui/guide.ts` is rewritten: `guidePanel(onClose)` now returns the **backdrop** (like `ui/sheet.ts`'s `sheet()`) rather than the panel, the page state lives inside the popup, and the popup owns `Escape`, the backdrop click, a **Tab trap**, `ArrowLeft` / `ArrowRight` to turn pages, and the focus hand-back to the `?` button when it closes. `src/ui/guide.css` is new and is imported by `ui/guide.ts` only (R-15); the `.gl__guide*` rules leave `styles/game-loop.css` and the `.gl__guide` z-index of 100 becomes **120** in the stacking ladder, above the leave-mission dialog. `src/ui/icons.ts` gains a **`bulb`** pictogram for the header pill — the set is now 35 drawings, and `icons.test.ts` still passes because it tests the data, not the count. `src/features/base/view.ts` and `src/features/act/view.ts` each gain a `guideEl` that is mounted on `document.body` and removed on close and on unmount, and `base` keeps opening the guide by itself the first time the player reaches the build screen. `Assets/images/guide/astronaut.png` is new: the cutout that stands beside the bubble. The words are still in `sim/guide.ts` and are still covered by its six tests — **no step was rewritten**. Logged as ISS-090.

---

**D-077 — agent — 2026-11-12**
**Choice:** The mission-day tracker lives in the **shared chrome**, in the navy nav bar between the `MARS HORIZON` brand and the `☰ MENU` button: the day in play as a big number, the total beside it, and **twelve pips** — one per mission day — on a rail. The day in play is `run.sol + 1`, because `run.sol` counts the sols already flown: the first day is day 1, and the day after the first sol is day 2. A **finished run has no day in play** — on the debrief the last day reached stands as the day and no pip pulses, because the run is over and a live pip for a day that never happened would be a lie. The plain `Sol N of 12` text in the mission bar **stays**: it counts the sols flown, the tracker counts the day you are on, and the player reads them as two different facts.
**Why:** The game is twelve days long and nothing on the screen said so. The mission bar says what the player is *playing*, the HUD says what the outpost *has*, and the only number about time was the sol count buried in a line of progress text — a child could play the whole run without ever being told which day they were on. The tracker lives in the shared chrome rather than in a feature because all five landing regions land on the same outpost screen: one implementation covers every site, and there is no fifth copy to keep in step with the first four. `sol + 1` rather than `sol` because `sol` alone prints "DAY 0" on the build screen and disagrees with the act screen's own "Run sol 2" button. The total is read from `WIN_SOL` rather than typed as 12, so a change to the mission length moves the tracker with it instead of leaving twelve pips on a thirteen-day mission. The plain sol count stays because it answers a different question — how many are behind you — and two numbers that mean different things are better than one number that has to mean both.
**Rejected:** (a) Putting the tracker in the mission bar instead of the nav bar — the mission bar is one line about the job, and the day is a separate fact that deserves its own place; the nav bar is also the one row that is identical on every game screen. (b) Counting the sols flown as the day — "DAY 0" on the build screen, and the tracker would disagree with the button that runs sol 1. (c) Drawing a current pip on a finished run — it would pulse over a day the crew never lived. (d) Replacing the plain `Sol N of 12` — it counts what is done, the tracker counts where you are, and the player reads both. (e) One pip per sol with the number typed as 12 — a hard-coded total is a second copy of `WIN_SOL`, and it would quietly disagree with the simulation. (f) Per-region copies of the tracker — five copies of the same numbers, five chances to be wrong, and the regions differ only in their artwork. (g) A live region announcing the day — the act screen rebuilds its whole DOM on every render, so a live region inside it would chatter on every click.
**Consequence:** `ui/dayTracker.ts` exports `dayModel(run, advanced?)`, a pure function that reads the tracker's whole state off a `RunState`, and `dayTracker(model)`, which draws it. `ui/gameLoop.ts`'s `gameHeader(sub?, onLeave?, day?)` takes the model and puts the tracker in the bar; `gameScreen`'s options take `day?: DayModel`. `base`, `act` and `debrief` each pass one line; `encyclopedia` and `landing-site` pass nothing, so their bars are unchanged. `src/ui/day-tracker.css` holds the pips, the rail and the two animations — the day in play breathes, and the day just flown flashes once. The act screen owns that flash: it marks the sol it has just run and holds the mark for 1500 ms, because the screen rebuilds its DOM on every render and a CSS animation on its own would replay every time the player picked an activity. The pips are three different shapes as well as three different colours, so a child who cannot tell orange from gold can still tell them apart, and the count of days done is said in words for a screen reader.

---

---

**D-076 — agent — 2026-11-12**
**Choice:** The day tracker is **built to the reference strip, not just labelled like it**. Four things are fixed by the reference rather than left to taste: the pips are **filled** circles in slate blue rather than hollow rings; the rail runs behind all twelve of them so the track reads as one path with twelve stations on it; the path is lit in amber **up to the day in play** and dark ahead of it; and the words **DAY** and **OF 12 DAYS** are white and bold, sitting **on the number's baseline** rather than floating beside it. The whole group is lifted half the brand subtitle's height so it lines up with the **MARS HORIZON** word instead of the middle of the two-line brand block. The day in play is a slightly larger gold dot with a ring around it.
**Why:** The first version was built from the numbers rather than the picture: hollow rings, broken segments between them, pale grey words centred against the number. It was correct and it did not look like the thing the player had been shown, and a child comparing the two would see two different games. The reference earns three decisions in particular. A filled pip is a **station**; a hollow ring is a **hole**, and the track should read as a journey. The lit path is what turns twelve dots into **progress** without the child having to count them. And the words on the number's baseline are what make "DAY 2 OF 12 DAYS" read as one phrase instead of three floating pieces; measured, the number's baseline and MARS HORIZON's now agree to within half a pixel.
**Rejected:** (a) Keeping hollow rings — they read as holes rather than stops, and the lit path could not be drawn behind them. (b) A single continuous rail with the fill done as a gradient — the fill would have to be computed from the pip positions, and it drifts as the pips resize. (c) Leaving the words centred against the number — they float at half the number's height and the phrase falls apart. (d) Aligning the group to the middle of the two-line brand block — it put DAY 2 level with the gap between MARS HORIZON and its subtitle. (e) Dropping the pips entirely when the bar gets narrow — they are the point of the tracker, so they shrink first and only go below 44rem, which is where the bar really has no room.
**Consequence:** `src/ui/day-tracker.css` carries the reference treatment, and `src/styles/game-loop.css` gains three tokens for it — `--gl-day-idle`, `--gl-day-idle-ring` and `--gl-day-rail` — so the pips and the path are named rather than repeated.

---
---

---

**D-075 — agent — 2026-11-12**
**Choice:** The act desk gets an **ASTRONAUT TRAINING** section at the top of the **Standing orders sheet**, with **six mini-games**: Resource Merge, Memory Match, Rover Parking, Solar Panel Power-Up, Cargo Sorting and Asteroid Defender. The rule is **two games a sol, any two of them, and each game paid for once a sol**; today's work orders stay **locked** until the second game is finished, and the desk says so on the tile and in a callout. The points a game earns are **science points** — the one balance the game already has, the `★ N points` in the panel head — scaled down to **2 / 3 / 4** for a basic, good and excellent run. The day's training is **written down** in `localStorage` under one key, so a refresh does not hand the player the same two games again and the points they earned are still on the score. The games themselves are **pure in `sim/`** (one module each, so every rule can be asserted on) and **drawn in `ui/`** (one module each, behind a shared contract).
**Why:** The owner asked for six small games inside the Standing orders, worth points, with the day's tasks locked until two of them are done — and asked for the art to match the project rather than the mock-up. The Standing orders sheet is where a rule book lives, so the training belongs there: it is a rule the crew works to, like the other twenty-four. The lock is the whole point of the feature — it is what makes a sol start with something to do — so it is enforced by the rules engine and not by hiding a button, and a player who finds a way past the button is not paid for it. **There is no shop in this game to spend points in**: the colony modules are bought on the build screen with a build-point budget, and that screen is only reachable before sol one, so "points buy colony components" has nothing to plug into. Science points are the only point balance the game has, so they are the currency, and they are scaled down because the science rank ladder was set for a twelve-sol run of work: at ten points a game, the ladder would be climbed by playing rather than by working. **The record is written down because the project has no save at all** (D-003), and a training game the player finished should not be offered again just because the page was reloaded; everything else in the run is still in memory, exactly as it was.
**Rejected:** (a) A separate screen or route for the training — the games are part of the day, not a destination, and a route would have to carry the run back and forth (R-5). (b) A new spendable currency and a new shop to spend it in — the game has no shop, and building one is an economy change rather than a feature; it would also have been a second currency, which the owner ruled out. (c) Ten, fifteen and twenty points as the brief suggested — the science ladder tops out at fifty, so a player who trains every sol would be a Chief Scientist by sol four and the ladder would stop meaning anything. (d) A real-time or calendar reset for the daily limit — the brief asked for the sol progression, and the sol is the game's own clock: the day resets when the sol advances, and it cannot drift. (e) In-memory only — a refresh would reset the day and the same two games could be farmed for points again, which the brief explicitly forbids. (f) A "skip training" escape hatch on the lock — offered and declined: the owner wants the hard lock, so a player who cannot finish two games cannot run the sol. (g) Emoji for the game tiles — D-070: an emoji is drawn by the operating system and cannot follow the game's ink, so the tiles use the game's own 24×24 line drawings. (h) The reward values hard-coded in the games — they are one table in `sim/training.ts`, and each game is graded by its own rule into the same three bands.
**Consequence:** `sim/training.ts` is the rules engine — the catalogue of the six games, `TRAINING_DAILY_LIMIT`, `TRAINING_REWARDS`, `trainingDay`, `canStartTraining`, `completeTraining`, `makeRandom` and `trainingSeed`; the six games get `sim/trainingMerge.ts`, `trainingMemory.ts`, `trainingRover.ts`, `trainingSolar.ts`, `trainingCargo.ts` and `trainingAsteroid.ts`, 113 tests in all. `RunState` gains `training`, and `sim/run.ts` is the only file that changes shape. `ui/training.ts` draws the section and the game dialog and owns the `localStorage` record (key `mars-horizon.training.v1`); `ui/trainingGame.ts` is the contract every game keeps; `ui/training*.ts` are the six games on the screen and `ui/training.css` is their styling, in the game's own tokens. `features/act/model.ts` marks the tasks tile locked, `features/act/view.ts` refuses to open it, shows the callout, and hosts the section and the dialog. `ui/icons.ts` gains a padlock. `tools/browser-check-training.mjs` drives the whole thing in headless Chrome — 37 checks, including two games won for points, a third refused, and the record surviving a refresh. **The science rank ladder was not re-based**: a player who trains every sol adds up to about ninety-six points over a run, which is more than the ladder was set for, and the debrief's rank now measures the training as well as the work. That is the owner's call to make, and the numbers to change are the five `min` values in `sim/science.ts`.

---

---

**D-074 — agent — 2026-11-11**
**Choice:** **Power is reported, not retuned.** The HUD card shows **stored kWh against the battery capacity** (`0 / 100 kWh`) and its bar follows the store; the day's budget — the number the activity prices come out of — moves to the **"For today"** mini card in the stats sheet, worded as what is left after today's sun; `powerToday` subtracts the **chosen activity's draw**, which it had ignored; and the stats sheet carries a **line under the meters** saying what the last sol made, used, or lost to a blackout. **The balance does not move**: the lander's one array and one battery still cannot cover a 180 kWh night, so a bare outpost still ends sol 1 at zero.
**Why:** The user reported two opposite faults in one week. ISS-060 was a card that read `0%` while the game happily sold a 25 kWh activity; the fix replaced the level with a projection, and by ISS-078 the card read `200 kWh` forever, because the projection saturates at the battery capacity. Both cards were "correct" and both were useless, because they each answered one question and hid the other. A player asking *how much power do I have* means the store; a player asking *can I afford this order* means the budget. The screen now says which is which, on the card and one press away. The zero is not a bug: a bare outpost genuinely spends the night's charge, and the new line under the meters says so in the outpost's own numbers instead of leaving a stuck-looking number unexplained. Retuning the lander was rejected because the first sol's hard lesson — one array is not an outpost — is the game's opening argument (D-064 keeps its balance measured, not assumed), and hiding the zero would have deleted it.
**Rejected:** (a) Retuning the lander's battery or array so the level never reaches zero — it erases the first sol's lesson and changes a balance four other screens and `npm run balance` are built on. (b) Leaving the projection on the card (the ISS-060 fix) — it is a constant at capacity, which is exactly the complaint. (c) Going back to the level at dawn alone — it is a constant at zero, which is the earlier complaint. (d) A red warning banner whenever the store hits zero — the bare outpost hits zero every sol, so the banner would be permanent furniture and would read as an error the player cannot clear. (e) Letting the day's budget hide the chosen activity's draw — the card would promise power the sol step then refuses. (f) A `Power today` card and no store reading — the five resource cards would then not be five readings of the same five stores, and the stats sheet's meter would disagree with the card beside it.
**Consequence:** `features/act/model.ts`: `TodayPower` gains `stored`, `powerToday` subtracts `activityById(run.chosenActivity)?.powerCostKwh` and clamps at zero, and `lastPowerLine(run)` reads the last `SolRecord` (`powerGenerated`, `powerUsed`, `blackout` against `POWER_BLACKOUT_FLOOR`) and returns `''` before sol 1. `features/act/view.ts`: the HUD card is `Power stored` with `stored / capacity kWh` and the meter's own percentage; `dayNightStrip`'s middle card is the budget; `statsBody` carries the power line. `features/act/model.test.ts` pins stored-versus-available, the chosen draw, and both wordings of the line. `tools/browser-check-build.mjs` lands a bare outpost and reads `0 / 100 kWh` off the card after one sol.

---

---

**D-073 — agent — 2026-11-11**
**Choice:** **The build screen counts what the outpost has, and names the cause when it cannot.** The stepper draws **`total / maxCount`** (`1 / 4` for the solar array) and a line marks the copy the lander brought, while `have / limit` still drive the minus so that copy cannot be sold. A site's `requires` rule becomes one shared function, **`siteAllows(kind, regionId)`** in `sim/modules.ts`, and the water goal's sentence is **computed from the build and the site** — naming the greenhouse, the missing ice miner, or the site's lack of ice — instead of the fixed string "No water source".
**Why:** Three readouts were each individually defensible and together told a child the opposite of the truth. The card said `0 / 3` while the outpost had an array (ISS-054 had made both numbers count extras, which removed the lander's copy from the card entirely). The water goal said "No water source" the moment a greenhouse was added — the greenhouse drinks 3% a sol and nothing refills it, so the sentence was true and named neither the cause nor the cure, and at Olympus the ice miner's dead `+` had no visible connection to it. The maths was right every time; only the words and the denominator were wrong. One function for the site rule is what stops the card ("there is not enough ice near this site to mine") and the goal ("No water source") describing the same ground as two different things, which is the shape of bug that comes back whenever a rule is copied.
**Rejected:** (a) Keeping `have / limit` and adding a footnote "one came with the lander" — the headline number would still contradict the outpost, and a child reads the big number first. (b) Counting the lander's copy in the number the minus can remove — the player would be able to sell the only battery and strand themselves before sol 1. (c) Showing `have / limit` with a small `+1` badge — that is arithmetic on a button. (d) Making the ice miner buildable everywhere so the goal can be satisfied — the site rules are the landing decision's whole payoff (D-032), and Olympus's water score of 2 is why the chemical-analysis site is a trade-off. (e) Making the greenhouse not drink water — it would erase the one module that makes the water loop a decision rather than a checklist. (f) A hard rule that blocks the greenhouse without an ice miner — the player is allowed to make a losing build, and the screen's job is to say why, not to take the choice away.
**Consequence:** `sim/modules.ts` gains `siteAllows` (with `specOf` already there); `features/base/model.ts` imports `GREENHOUSE_WATER` and `siteAllows`, `canPlace` asks it, `BuildCard` gains `maxCount` and `fromLander`, `buildCards` fills them, and `goalPreview` computes `waterWhy`. `features/base/view.ts` draws the new numbers, the lander line, the read-aloud text, and adds `base/view.ts`'s scroll-and-focus restore (ISS-080) in the same pass; `base.css` gains `.gl__card-lander`. `sim/modules.test.ts` pins `siteAllows`; `base/model.test.ts` pins `1 / 4`, the lander mark and both water sentences.

---

---

**D-072 — agent — 2026-11-11**
**Choice:** The launch screen gets a **SKIP button**. It appears **halfway through the departure** — 2.6 s in, while the press-conference still is on screen — and cuts the reel where it stands to open the **spacecraft parts tour**, the screen the reel ends on anyway. The title card is the one beat that always plays.
**Why:** The user asked for it, and the ask makes sense in the shape of the journey: the ration check is a gate the player has just got through, and the first thing after it is thirteen seconds of reel they cannot get past. A child who has just answered a maths question correctly is the most likely person in the world to decide they have had enough. The button had to land somewhere, and the tour was the answer: it is the one part of this screen the player drives themselves, with Prev / Next and a Continue button, so a skipped player gets the same spacecraft lesson a watching player gets — the same four parts, the same NASA facts — just sooner. Skipping to the *next screen* would have been faster still and would have thrown the lesson away. The button appears whether or not the clip has buffered: a download that has not finished is exactly when a player wants an exit. **It appears halfway through the departure rather than with the films, which reverses an earlier choice made the same hour** — the button used to wait for the films, on the reasoning that the departure is short enough to watch. That reasoning was wrong twice over: the films are eight seconds and the departure is five, so an escape hatch that only opened in the second half of the wait was not much of an escape hatch, and a player who had decided during the press conference still had to sit through two stills to say so. Halfway through the departure is the point where the mission has announced itself and the wait has become obvious. **This supersedes the "a skip control" line under D-027's Rejected.** That was rejected as a *fix for ISS-030*, where the reel was cutting or skipping beats by itself on a slow connection and a skip button would have hidden a fault. The reel is media-driven now, so a skip is a deliberate exit rather than a symptom.
**Rejected:** (a) A skip that leaves the screen and goes straight to the interior — the fastest, and it throws the spacecraft lesson away with the film. (b) The button on screen from the very first second — it would sit over the title card, which is the one beat that should always play. (c) The button appearing with the films, as it first did — the wait is the whole point of an escape hatch, and five seconds of it is too long. (d) A skip that fast-forwards the films instead of cutting them — the player would still be sitting through eight seconds of footage, having merely asked for it faster. (e) Speeding the whole reel up instead — it breaks the reduced-motion promise, which is that every picture is held for as long as it would have moved, and it leaves each still visible for 675 ms, which is not long enough to take in. (f) Remembering the skip in the run — it is not a decision, and nothing downstream depends on it. (g) A confirm step before the skip — an eight-year-old pressing a button does not need a dialog about it.
**Consequence:** `index.html` carries a `<button data-launch-skip>` as a direct child of `#launch` — outside the letterboxed stage, because a control inside the stage is clipped on a narrow window (ISS-041). `launch/model.ts` gains `SKIP_LABEL`, `SKIP_DESCRIPTION`, `FILMS_BEGIN_MS` (the slot the films start, derived from the title and the shots) and `SKIP_APPEARS_MS` (half of that, so the button's timing cannot drift from the reel's). `launch/view.ts` gains `revealSkip`, `stopReel` and a `skipped` flag: the flag is what a late `loadeddata` finds, so a clip that finishes downloading after the skip cannot restart the reel behind the tour, and `stopReel` also aborts a clip that was still downloading, so a skipped reel does not pull a megabyte nobody will watch. The reveal has its own timer, so leaving the screen cancels it rather than letting it fire on a screen the player has gone from. The parts panel gains `tabindex="-1"` and takes the focus when it opens, because the skip button vanishes under the player's finger and the focus has to land somewhere real. `launch.css` gains `.launch__skip`, and the dim rule now covers the title card, which was the one cinematic layer it missed. `tools/browser-check-journey.mjs` drives the skip rather than sleeping through the reel, so the check is quicker, the button is exercised on the way through, and its timing is measured rather than assumed.

---

 A section is about one thing, and the tool is worked on one order, so it gets its own layer rather than a corner of somebody else's. Closing it puts the player back on the order, which is where they were, rather than on a hub of six buttons or a list they have to find their way down.
**Rejected:** (a) Keeping the tool in the desk sheet and fixing only the leak — the desk would still be two things, and the tool would still be reachable from the wrong screen. (b) Putting the tool inside the tasks sheet, above the order — one sheet at a time and no new rung, but the tasks sheet then carries the order list *and* a minigame, and the tool would sit under the thing it belongs to. (c) The tool sheet replacing the tasks sheet, with the tasks sheet reopened on close — no stacking, but it is the same "one thing replaces another" pattern that caused the bug, and the order list is rebuilt from scratch. (d) Leaving the tool reachable from the desk as a convenience ("if you already started one, it shows here") — that is the shortcut that merged the two in the first place. (e) A route for the tool — a tool is a moment inside a sol, not a place in the journey.
**Consequence:** `ui/sheet.ts` takes a `layer` option (`section` by default, `tool` for one opened over another), and `ui/sheet.css` gives `.sheet__backdrop--tool` a `z-index` of 108; the ladder in `src/styles/game-loop.css` says so in writing. In `features/act/view.ts`, `toolSheetFor(state)` builds the tool's sheet, `closeTool()` closes it and returns focus to the order's inspect button, `closeSection()` and the guide's handler clear `openTool`, and the section sheet and the tool sheet keep their own scroll positions. `deskBody` no longer renders the tool. The browser check asserts that the tool opens in a sheet of its own, that the orders are still behind it, and that the desk sheet holds no tool (ISS-093).

---

**D-071 — agent — 2026-11-11**
**Choice:** The act screen's **"Real data" sheet is the whole NASA layer**, in one scroll: NASA's live daily picture, the saved NASA card for the sol, **a NASA photograph of the landing region the player chose**, **NASA's own space-weather readings** (the flare class and the day it peaked, strongest first, with the source they came from — DONKI, NOAA, or the game's long-run record), and two NASA facts to take away. The tile's line of state counts what is behind it ("3 pictures · 5 live flares"). "Coming up" — the forecast — **stays on the main panel**, because it is the game's schedule rather than NASA's data, and it is what the player acts on.
**Why:** The button is called *Real data*, and it held one picture. The game already owned a lot more than that: five region photographs (shown once on the landing screen and never again), the live flare readings (thrown away by `loadForecast`, which kept only the game's reading of them), and forty tagged facts. A section named after real data that shows one picture undersells the whole NASA layer the project is built on, and it does so on the screen a child spends twelve sols in. Putting the layer in one place also makes the honesty rule easy to keep: every block says where it came from, so "saved" and "live" are never confused. The forecast stays on the panel because it answers a different question — *what is coming* — and the player acts on it; a schedule is the game's, a flare reading is NASA's.
**Rejected:** (a) Leaving the section as one picture — it is what the player complained about, and it leaves the region's photo and the live readings invisible. (b) Putting everything, including the forecast, in the sheet — the panel would lose the one thing worth glancing at while deciding, and the sheet would have to be opened to know what is coming. (c) A gallery of all twelve saved NASA cards — twelve pictures of things that are not this sol is a scrapbook, and it buries the region the player is actually standing on. (d) Listing every live flare — DONKI can return dozens from thirty days, and a list nobody reads is a list that says nothing. The strongest few and a count says the same thing in a line. (e) Moving the region photo to "Colony stats" — it is a NASA photograph, so it belongs with NASA's photographs; the stats sheet is about the five systems. (f) Moving the rover's find here too — the find is the player's to answer, not background data, and it stays on the desk sheet. (g) Shipping local copies of the NASA images — the saved cards have always used NASA's URLs, and a network is the only place these pictures exist.
**Consequence:** `data/spaceweather.ts` gains `strongestFlares(flares, count)`, a pure ordering by class (A<B<C<M<X, then the number), with six tests. `dom/forecastLoader.ts` gains `LoadedForecast.flares` — the raw readings, unconverted — which `base` ignores and `act` keeps whole. `features/act/view.ts` rewrites `dataBody()` into five blocks and keeps the loaded forecast instead of only its timetable; `features/act/model.ts` gains `HubContext.pictures` and `HubContext.liveFlares` (a model may not import `data/`, so the view counts and passes the numbers in), and the data tile's line of state says what is behind it. `act.css` gains `.act-weather`, `.act-weather__row`, `.act-weather__class`, `.act-weather__when` and `.act-fact`. Logged as ISS-075.

---

---

**D-070 — agent — 2026-11-11**
**Choice:** The act screen's side panel is a **hub of five or six buttons** rather than one long scroll. Each button is a label and a single line of state — Today's tasks, Check desk, Standing orders, Colony stats, View real data, and (once a sol has run) Sol N in review — and each opens its section as a **sheet** over the desk: a dialog with its own header, scrolling body and one close, shared by all six (`ui/sheet.ts`). The mission bar under the header is gone; the sol count moves to the panel head's kicker and the science points to its top right. The review tile carries the previous sol's **net-change chips inline**, so the numbers are visible without opening it (superseding ISS-057's "recap first"). The header gains two icon buttons beside Menu: a `?` for the guide, and a book for the encyclopedia. Every pictogram on the act screen is an SVG line drawing from `ui/icons.ts`, mapped by id in the view — `sim/activities.ts`, `sim/science.ts` and `sim/patches.ts` no longer carry emoji.
**Why:** The panel had grown into everything the day contains — three work orders with two readings each, a tool, the standing orders, the notes, the rover's document, the recap, the meters — and a child arriving at it had to scroll to find out what was in front of them. Ordering it as "recap first" only decided which of ten things came first; it did not stop there being ten. The hub answers the question the panel was actually being asked — *what is there to do today* — in one screen, and lets the player open the one thing they came for. It also gives the screen somewhere to say what is **behind** each button, which a grid of bare icons would not: "three orders, choose one" is the fact that matters, and a badge cannot hold it. The mission bar went with it because the panel's own head is where a day belongs; a line across the whole screen to say "survive 12 Mars days" was a second header. Moving the points up and the sol count into the kicker keeps both visible at every panel state, including the crisis panel, which replaces the hub. The sheet is in `ui/` rather than `features/act/` because it is not about the desk: any screen with more detail than fits can open one over itself, and a feature may not import another feature (R-5). The icons are SVG rather than emoji because the emoji were being drawn by the operating system — a different picture on Windows, Android and iOS, some of them coloured and some not, at a size the game could not set — and because `sim/` may not hold a pictogram it has no way to draw.
**Rejected:** (a) Keeping one scrolling panel and reordering it — the recap-first attempt is the proof that it does not scale; whatever must be below the fold still is. (b) A grid of icon-only buttons — it fits on one screen and hides every fact: which order wants stamping, whether the rover brought something back, what the last sol cost. (c) Tabs instead of a sheet — tabs make the sections siblings of one another, and the desks' sections are not: the player picks one, does it, and wants the day back. A sheet says that by going away when it is closed. (d) A separate route per section — six routes that all read the same run and return to the same place, and the router would need to know how to come back with the day intact. (e) A sheet component inside `features/act/` — works for this screen and cannot be reused, which is the definition of the wrong layer (R-5). (f) Auto-opening today's tasks, or the guide, on arrival — the panel's job is to be readable at a glance; a dialog that opens itself is a dialog that hides the glance. (g) Auto-opening the review after a sol — the same mistake with the added problem that the player has usually just read the recap. (h) Keeping emoji and passing them from `sim/` — it keeps the pictogram in the pure zone where it cannot be drawn, and the pictures stay the platform's rather than the game's. (i) Keeping the mission bar as well — two headers, and the day belongs in one.
**Consequence:** `ui/sheet.ts` / `sheet.css` are new; `sheet(options)` returns the backdrop, owns the close button, the done button, the backdrop click, `Escape` and a Tab trap, and returns a `sheetCloseButton` helper for the caller to focus. `ui/icons.ts`, `icons.css`, `icons.test.ts` and `dom/svg.ts` are new: 34 stroked line drawings, `RESOURCE_ICON`, `RANK_ICON`, and `icon(name, label?)`. `HudStat.icon`, `SignalCard.icon` and `WorldOptions.weatherIcon` are now `IconName`, so `base` and `debrief` were converted in the same change. `gameLoop.ts` loses `missionBar` and `MissionBarOptions`, gains `HeaderOptions` (book / help / Menu), `ScreenOptions.help` and `ScreenOptions.showEncyclopedia`, and `PanelOptions.corner`; `.gl__mission` and `.gl__guide-button` leave `game-loop.css`, and `.gl__actions` / `.gl__icon-button` arrive. `features/act/model.ts` gains `hubTiles`, `HubSection`, `HubTile` and `HubContext` (**pure words only** — no icon, because a model may not import `ui/`) and `features/act/view.ts` maps an activity id to its picture, with `clipboard` as the fallback. `ScienceRank.icon`, `ActivitySpec.icon` and `Patch.icon` are deleted; `ui/icons.ts`'s `RANK_ICON` and the views' `ORDER_ICON` / `PATCH_ICON` replace them. `tools/browser-check-build.mjs` now opens tiles instead of reading the scroll, and asserts five buttons before a sol and six after. This is a **post-freeze scope exception**, on the same footing as D-055: the freeze is on new features, not on a screen a child cannot read.

---

---

**D-069 — agent — 2026-11-11**
**Choice:** The outpost has a **fixed stacking order**, and it is a rule in code rather than a number in the layout file. Farthest to nearest: the regolith shields, the ice miner, the solar arrays, the greenhouse, the nuclear unit, the battery banks, the life support, the habitat. The copies of a kind **recede** from the camera as they are added — solar array 1 is the nearest and solar array 4 the furthest back, the same for the battery banks — while the two regolith shields share one depth. `z` is gone from `baseLayout.json`; a pose is now only where it is, how big, and which way round.
**Why:** One pose per kind could only ever place the first copy of anything, so the game derived the rest — step right, shrink, rise — and every copy of a kind was a smaller echo of the first. That is the hard-coded behaviour the layout file exists to remove, and it also made the stacking order arbitrary: a solar array could end up in front of the habitat that was supposed to be the nearest thing. The order is a property of the outpost rather than of where a module happens to stand, so it belongs in code: a file of fifteen positions cannot be trusted to keep a stacking order straight, and fifteen `z` values would be another thing to keep in step by hand. Deriving it also means the game can never draw the outpost wrong, whatever the file says. The copies recede because the first one the player builds is the one that comes with the lander, standing at the front of the outpost, and each extra goes behind it.
**Rejected:** (a) Keeping `z` in the file and letting the editor write it — the file stays self-describing, but a hand-edited file can break the order and the numbers still have to be kept in step. (b) A flat list of instances with an explicit `copy` field — it works, but it scatters a module's copies through the file instead of keeping them together. (c) One rule for every kind, copies always receding — simpler, but it puts shield 2 behind shield 1 when the two are meant to be the same distance away. (d) Deriving the order but leaving `z` in the file as a spare — a field that means nothing, which is worse than no field: a developer would think it still did something. (e) Letting the developer choose the depth per pose — an escape hatch, but it is how the order went wrong in the first place.
**Consequence:** `ui/baseLayout.ts` exports `DEPTH_ORDER` and `depthFor(kind, copy)`. Each kind gets a band of ten levels, and a receding kind fills its band from the top down, so the copies of one kind can never pass the copies of the next. `ModuleSpot` loses its `z`; `readSpot` no longer requires one, and a file that still carries a `z` is told the field is ignored rather than having it dropped silently. `ui/gameLoop.ts`'s `moduleFigures` computes each figure's depth from the rule, and `ui/baseLayoutEditor.ts` stacks its handles the same way, so the editor is a picture of the outpost rather than a different one. The toolbar's depth field stops being editable and shows where a module sits instead — *farthest*, *nearest*, or *3 of 8* — because under a fixed order there is nothing to nudge. The developer's own layout is kept in full: every position, every width, and the mirrored regolith shield; only the `z` values are gone.

---

---

**D-068 — agent — 2026-11-11**
**Choice:** A layout file with a problem in it **warns rather than breaks**. The game copes — a kind it cannot read falls back to the authored default, a number out of range is clamped, a flip that is not true is ignored — and says so in two places: a dev-only console warning at boot, and a banner at the top of the placement editor's toolbar. The editor now opens showing the layout **on disk**, and its Reset button puts everything back the way it was, not the way it was authored.
**Why:** The graceful fallback was always right for the player and wrong for the developer. A file the game quietly fixed looks exactly like a file it ignored, so a mistyped number showed up as "my layout did not take" with no explanation. The warning closes that gap without ever putting a player at risk of a broken screen. The editor half matters just as much: it was seeding from the authored default rather than from the file, so opening it and pressing Download replaced the developer's layout with the grid — the tool would have destroyed the very thing it exists to edit. A warning nobody can act on is not a warning, and a tool that quietly undoes your work is worse than no tool.
**Rejected:** (a) Refusing to start on a bad file — it takes the whole game down over one module's position, and the file is developer-facing while the game is not. (b) A console warning alone — easy to miss when you are looking at the screen rather than the console, and the editor is where the developer is anyway. (c) A toolbar banner alone — it only appears once you open `?editlayout=1`, so a broken file in an ordinary session stays silent. (d) Fixing the file silently, with no warning at all — that is the behaviour this replaces. (e) Seeding the editor from the authored default — convenient for a first run, and it means the editor shows a different outpost from the one the game is drawing. (f) Reset going back to the authored default — "Reset" in an editor means "put it back how it was", which is the file the developer already has.
**Consequence:** `main.ts` imports `LAYOUT_PROBLEMS` and prints the list at boot behind `import.meta.env.DEV`; a malformed file cannot reach production anyway, because Vite fails the build on unparseable JSON. `baseLayoutEditor.ts` renders the same list in a `.ble__problems` banner above the toolbar's title, and says plainly that the file the editor exports is always valid. `baseLayoutEditor.ts` also seeds its starting state from `MODULE_POSES` rather than `DEFAULT_POSES`. A test that asserted the shipped layout contains no mirrored modules was replaced with one that asserts every flip in it is a real boolean — the old test failed the moment a developer did the one thing the tool is for.

---

---

**D-067 — agent — 2026-11-11**
**Choice:** A module can be **mirrored** left to right. The pose gains an optional `flip`, the editor gains a **⇄ Mirror** toggle in the toolbar and the **F** key, and the artwork turns around **in place** — the mirror is about the picture's centre, so flipping a module does not move it. A mirrored module carries a small blue badge on the panel so its state is visible without selecting anything. `flip` is written to the layout file only for a module that is actually mirrored, so the default file is unchanged.
**Why:** Every module's artwork has a facing direction: the solar panel catches the sun on one side, the ice miner's arm points one way, the battery bank's cabling is on the other. Measured against their own mirror, all eight differ over 30–50% of their pixels, so mirroring is a real change and not a no-op. A row of four solar panels all tilted the same way reads as one machine repeated; turning some of them around reads as an array. Without it, "place the equipment" had no answer for the one question an outpost asks — which way does this panel face?
**Rejected:** (a) A vertical flip as well — a ground-standing module turned upside down would hang half-buried in the dirt, and the game has no use for it. (b) A second grip on the opposite corner, mirroring the resize grip — a grip is for a drag, and a mirror is an on/off; a tiny target for a discrete action is worse than a button. (c) A checkbox beside the number fields — consistent with the other fields, but one more control to look at rather than one to press. (d) Mirroring about the module's left edge instead of its centre — that would slide the module sideways as you flipped it, which is surprising, and the whole point is that turning a module around is not moving it. (e) Writing `flip: false` on every entry — fifteen lines of noise in a file where almost nothing is mirrored; a missing `flip` already means "not mirrored". (f) Drawing a separate flipped image asset for every module — eight new PNGs to keep in step with the originals, for a transform the browser does in one line.
**Consequence:** `ModuleSpot` gains an optional `flip`; `readSpot` normalises anything that is not exactly `true` to false, and `describeLayoutProblems` reports a `flip` that is neither true nor false. `WorldFigure` gains the same field, `gameWorld` emits `--gl-flip`, and `.gl__figure` transforms with `scaleX(var(--gl-flip, 1))`. The editor mirrors the **artwork**, never the handle, so the resize grip stays on the bottom-right and the label stays readable. `src/ui/gameLoop.test.ts` is new — the first tests for that file — and covers the copies and the mirror.

---

---

**D-066 — agent — 2026-11-11**
**Choice:** The layout file holds a **pose list per kind**, not one pose per kind, and a module can be resized as well as moved. `"solar-array": [{left, bottom, width, z}, {…}, {…}, {…}]` — one entry per copy the player could build, in build order, so the second solar array the player builds is the second entry. The editor shows all fifteen copies at once, every one draggable, and each one has a grip on its bottom-right corner that changes its width (the height follows the artwork's own proportions, so width is the only dimension that changes). The band's width limit of 24% of the panel is unchanged, and a module can no longer hang off the right-hand edge of the panel.
**Why:** One pose per kind could only ever describe the first copy of anything. The game papered over that by deriving the rest — step right by half a slot, shrink, rise — so a second solar array was always a smaller echo of the first, and the developer had no say in where it went. But a player who builds four solar arrays is running an outpost, not decorating one: each panel wants its own place, and the only way to give it one is to record a place per copy. The same applies to size. Scaling is the other half of "where does this thing go" — a module that is too big for the gap it sits in is a module that has not been placed.
**Rejected:** (a) Keeping one pose per kind and deriving the copies — the derivation is exactly the hard-coded behaviour this work exists to remove; the developer would still not control a second solar array. (b) A flat list of instances with an explicit `copy` field — it works, but it makes a developer hand-edit a file where a module's neighbours are scattered through the list instead of sitting together. (c) Letting the file hold more poses than the catalogue allows — the game would never show the extras, so they would be a trap in a file people edit by hand. (d) Scaling height independently of width — the artwork is a raster cutout with one aspect ratio; letting it stretch would look broken, so width is the only dimension and the height follows. (e) A slider in the toolbar instead of a corner grip — it works, but it takes your eyes off the thing you are placing, and it cannot scale two modules in a row without a trip to the toolbar. (f) Widening the band past 24% — fifteen modules already fill the panel; a hero module big enough to matter would have to be one the player does not build. (g) Editing the live build rather than every possible copy — the file would then depend on what happened to be on screen when it was exported, and two exports would not agree.
**Consequence:** `ui/baseLayout.ts` exports `ModulePoses`, `DEFAULT_POSES`, `MODULE_POSES`, `PANEL_RIGHT_EDGE`, `poseFor(poses, kind, copy)`, `resolvePoses`, `describeLayoutProblems` and `buildLayoutJson`; `resolvePoses` reads the old single-pose shape as a list of one, pads a short list by deriving from the last pose, and cuts a long one. `ui/gameLoop.ts`'s `moduleFigures` no longer derives anything — it asks `poseFor` where each copy stands. The editor grew from eight handles to fifteen, gained the resize grip, an instance picker (copies overlap, so a copy you cannot see is a copy you cannot grab — picking it brings it to the front), and per-copy selection. `+` and `-` change a module's width from the keyboard. The base screen lost its crewmate sprite, which stood exactly where the modules go. The default file encodes the layout the game was already drawing, so nothing moves on upgrade — but the game now depends on the file being right, where before it depended on a table in source.

---

---

**D-065 — agent — 2026-11-11**
**Choice:** Where each module stands on the outpost panel is **data, not code**. The layout lives in `src/ui/baseLayout.json` — `{left, bottom, width, z}` per kind, in percent — and is loaded and validated by `src/ui/baseLayout.ts`, which falls back to an authored default for any kind the file cannot supply and clamps any number that falls outside the band. A developer produces that file by opening the game with `?editlayout=1`, dragging the modules on the **real** outpost panel, and downloading the JSON. The editor is a developer tool in `src/ui/baseLayoutEditor.ts`: no route, no mount point, no registry entry, and it is compiled out of a production build entirely (`import.meta.env.DEV` plus a dynamic import in `main.ts`). The band a module may be placed in is declared once, in `SPOT_BAND`, and the CSS clamp in `styles/game-loop.css` is verified against it by `check-markup` Rule 11.
**Why:** The module layout was a literal table inside `ui/gameLoop.ts`. Placing a module meant editing a number in source and reloading, and a whole outpost arrangement was eight numbers in a row with no way to see the result. That is the kind of work a screen should do, not a person should do by arithmetic. Dragging the real modules on the real panel is WYSIWYG by construction: the panel, the artwork, the background and the proportions are the ones the player sees, so what you arrange is what ships. The abandoned `drag-editor` feature (ISS-050) tried this as a *game screen* and was never wired to a route, so it could never be exercised and `npm run check` was the only thing that would have caught it — a tool that is not part of the journey does not belong in the journey's tables, and a tool that ships to players is a tool a player can find.
**Rejected:** (a) A `features/drag-editor/` screen with its own route and mount — it puts a developer tool into the player-facing app, it needs the four-file feature layout and a registry entry, and `check-markup` Rule 5 then demands its data hooks exist in `index.html`. (b) Editing the layout inside the editor at runtime — the game would need a write path to `src/`, which is a build step pretending to be a feature. (c) `dx`/`dy` offsets from a hardcoded base, as the reference implementation in another project uses — that is right when the base is computed at runtime from a canvas transform, and wrong here, where the numbers are literal. Absolute percentages are what the file means. (d) A `src/data/baseLayout.json` — parity with that other project, but `src/data/` here is documented as the network-quarantine zone, and a static layout file muddies that story. (e) Letting the CSS clamp alone decide the limits, with the editor reading them back from the computed style — a genuinely single source, but it puts the band in the stylesheet where it cannot be unit tested, and the clamping it performs is silent: a position the developer chose is quietly moved somewhere else. (f) The clamp removed entirely — `moduleFigures` already produces duplicates that relied on it, and the safety net is worth having for a hand-edited file. (g) Placing each copy of a module separately — a second solar array steps right on its own today, and the file only needs the slot the copies derive from. (h) Shipping the editor and gating it on the URL alone — a game for children is public; the tool should not be in the bundle at all.
**Consequence:** `ui/baseLayout.ts` exports `ModuleSpot`, `ModuleSpots`, `SPOT_BAND`, `DEFAULT_SPOTS`, `MODULE_SPOT`, `LAYOUT_PROBLEMS`, `clamp`, `clampSpot`, `roundSpot`, `resolveSpots`, `describeLayoutProblems`, `buildLayoutJson` and `pointToPercent`, with 31 tests. `ui/gameLoop.ts` reads the layout from there instead of declaring it, and `moduleFigures` now clamps its output into the band so the CSS clamp is a safety net rather than something that decides where a module lands. `ui/baseLayoutEditor.ts` exports `startLayoutEditor(root)`; `main.ts` decides when to start it and tears it down with the screen. `tsconfig.json` gains `resolveJsonModule`. `scripts/check-markup.mjs` gains Rule 11. The editor's overlay sits on `document.body` rather than inside the screen, because `features/base` replaces every child of its mount when the live forecast arrives and would otherwise destroy a drag in progress. **Superseded in part by D-066:** the file now holds a pose list per kind rather than one pose per kind, so `ModuleSpots` became `ModulePoses`, `DEFAULT_SPOTS` became `DEFAULT_POSES`, `MODULE_SPOT` became `MODULE_POSES`, `resolveSpots` became `resolvePoses`, and `poseFor` was added. The shape of the decision is unchanged — the layout is still a file, the editor is still a developer tool, and the band is still declared once.

---

**D-064 — agent · 2026-11-11**
**Choice:** `npm run balance` is a **required check** for any change to `sim/`, and it **fails** the build rather than warning. It plays every legal build at every landing site over several forecast seeds and fails when a site cannot hold all five systems, or when too few builds can win. It lives in `tools/balance-check.mts`.
**Why:** The game was unwinnable for a long time and **no test said so**. Every unit test passed, the browser checks passed, the screens looked right, and a player who built a sensible outpost at any landing site still lost every run. The balance lived in five constants in `sim/modules.ts`, and nothing in the suite read them against each other — the tests checked that the arithmetic was correct, not that the arithmetic was *playable*. A check that only exists in a human's head is a check that stops being run.
**Rejected:** (a) A unit test over the balance — a test over the constants only proves the constants still do what they did, which is exactly what was wrong. (b) A "minimum win rate" assertion in the sim suite — it would need the same simulation, so it belongs in one place; two copies of the balance harness would drift. (c) Making it a warning — a balance that has already gone wrong once will go wrong again quietly. (d) Checking only one site — the sites differ in dust, ice and sun, and the bug lived in the difference between them.
**Consequence:** `npm run balance` joins `npm run check` and `npm test` in the pre-commit list whenever `sim/` is touched, and the current pass line is *"every site can hold all 5 systems, and 43.2% of builds can win on average"*. The win rate is a number in the output, not a rule in the code: the rule is that **every site can hold all five systems**, which is the property that was broken. `tools/balance-check.mts` reports the per-site table so a regression says which site broke.

---

---

**D-063 — agent · 2026-11-11**
**Choice:** **Stars multiply the science an order is worth and nothing else.** They never touch a store. A tool that is worked perfectly makes the order worth more science points; it does not give back power, water, air or food.
**Why:** Two reasons, and the second is the important one. The first is fairness: the balance of a run — what makes it winnable — must not depend on how well the player did the mini-game, or the same outpost would win with one build and lose with another and no one could tell why. The second is that a stars-for-resources trade would make the tools *the* way to survive, and then a player who could not work a tool well would have no route to winning, in a game for eight-year-olds.
**Rejected:** (a) Stars giving resources — it would make the balance untestable, because the balance would then depend on the minigames' difficulty as well as the numbers. (b) Stars giving a discount on the order's cost — the same problem, softer. (c) Stars being a separate score — there would be two ladders, and a child would not know which one the debrief means. (d) Stars affecting the rank — the rank is already the science, so this is the same as (c).
**Consequence:** `sim/minigames.ts` grades the six tools and returns stars; `sim/sol.ts` multiplies the order's science by the stars and adds it to the run's points, and nothing else reads the stars. The rank ladder in `sim/science.ts` is unchanged and still has one ladder. The balance harness is unaffected by tool performance, which is what D-064 relies on.

---

---

**D-062 — agent · 2026-11-11**
**Choice:** **The rover is part of the run, not a widget.** Its state is `RunState.rover`; it is sent out by a work order like any other; it drives on **sol time**, not a wall clock; and it comes back with a **document on the desk** — a real NASA picture, a place from the past, or a rare rock to log, take or leave. It touches **no resource**, so it cannot change how a run is won or lost.
**Why:** The request was to put the rover *in the game system* rather than "send it and show some facts". A widget on a fifteen-to-sixty-five second real timer was not in the system: it could not be part of a sol, it did not know what the outpost had built, it was destroyed when the screen was rebuilt, and the debrief could not say what it had found. Moving it into `RunState` makes it a thing that happened during the run, on the run's clock, and it can be written about afterwards.
**Rejected:** (a) Leaving it in `ui/` with a real timer — that is D-059, and it is what "not in the system" looks like. (b) Giving the rover a resource perk — it would change the balance and D-063 says the science is the only thing the extra work buys. (c) A wall clock — a demo player would have to wait for a real find, and the sol clock is the one the player can see. (d) Procedurally generated finds — the finds are real NASA places and rocks, which is the whole point of the feature.
**Consequence:** `src/sim/rover.ts` holds the rules **and** the catalogue of real finds, which moved out of `data/` because the simulation now owns the whole lifecycle of the rover — `data/` is for things fetched from a network. `RunState.rover` carries `returnsOn` and what it has found. `src/ui/roverWidget.ts` and `src/data/roverFinds.ts` are **deleted**. The debrief can report the finds, and a find that has not been answered is still waiting when the player comes back.

---

---

**D-061 — agent · 2026-11-11**
**Choice:** **The five goals are the project's learning outcomes, not a score.** Surviving twelve sols is the only outcome. `sim/goals.ts` reports what the player *kept running* and *for how long*; the counters that graded them are gone. The standing orders — the rule book that grows two rules a sol — are the goals in the order the player meets them, and the debrief prints the standing orders the player worked under as the keepsake.
**Why:** The request was that the goals be "the things a player needs to learn and take action against when playing the game, not straight-up goals in the system". A counter that grades the goals makes them a second win condition to optimise, and a child optimises the counter rather than learning the thing. Worse, a player who does the right thing about radiation can still fail the counter, and the game then says they did badly at something they did well. The goals are what the game is *about*; the run is how you show it.
**Rejected:** (a) Keeping a goal score as a second outcome — two win conditions, and one of them the one a child would chase. (b) Making the goals a fifth resource — they are not resources and the HUD already has five of those. (c) Hiding the goals entirely — the science has to be legible somewhere, or the game is a set of falling bars with no subject. (d) A separate objectives screen — another route, and D-039 already rejected a new route at freeze.
**Consequence:** `GOAL_TARGETS`, `goalScore` and `goalsEarned` are **gone** from `sim/goals.ts`, and the module now answers "what did you keep running, and for how long". The debrief reports each goal as a record with no grade against it. `sim/standingOrders.ts` holds twenty-four rules, two arriving each sol, and they are written as the five goals in the order the player meets them — so the curriculum *is* the goal list.

---

---

**D-060 — agent · 2026-11-11**
**Choice:** **The game is a Papers Please game about Mars.** Each sol the player is the duty officer at the outpost: **three work orders** land on the desk, each carries **two readings to check**, some have a **tool** to work them with, and the player **approves one**. The **standing orders** are the rule book that grows two rules a sol until there are twenty-four. The player's job, written on the mission bar: keep the five systems running for twelve sols.
**Why:** Play testing said the game was fun but hard to follow, and the reason was that nothing ever said what a *day* was. The screens had been built one at a time and each assumed the player had worked out the one before it: a child could play twelve sols and never have been told what they were playing. Papers Please is the shape that already answers this — a queue, a rule book that grows, one decision, a tally — and it is legible to a child without instruction.
**Rejected:** (a) The old shape — three activities of which one is chosen — it was a menu, not a job, and nothing on screen said so. (b) More than three orders — the desk fills up and the player stops reading. (c) Fewer than two checks per order — one reading cannot be *checked* against anything, and the check is the learning. (d) A status dot on each standing order — it says whether the rule is broken, which is the answer rather than the question. (e) Procedural orders — each sol's three orders are a curriculum that introduces something new; randomising them would break the teaching, and the locked cards teach a lesson of their own ("you have no greenhouse").
**Consequence:** `sim/activities.ts` holds the day's orders, `sim/standingOrders.ts` the twenty-four rules, `sim/minigames.ts` the six tools and their grading, and `sim/guide.ts` the how-to-play guide. `ui/activityPlayer.ts` draws the work-order player. The goals became the standing orders (D-061) and the science points became the run's score (D-063). The mission bar on every play screen says the job in one line, and the guide opens by itself the first time the player reaches the build screen. **The six tools unlock one a sol for the first six sols**, because the unlock schedule and the sol plan are separate lists and they have to be checked against each other: every sol has to leave at least one order the player can work, or that sol is three buttons and nothing else (ISS-065). The rule is held by a test over the whole plan.

---

---

**D-059 — agent · 2026-11-11**
**Choice:** The rover is a button on the left edge of `base` and `act`. Its rules are pure (`sim/rover.ts`); what it finds is a fixed list of real NASA pictures (`data/roverFinds.ts`); its state, find timer and open window live in a module in `ui/roverWidget.ts`, not in `RunState`. `naming` calls `resetRover()` so each mission starts with the rover at base. Finds arrive on a real-time timer (15-25 s, then 35-65 s), one at a time, never repeated. The draws are seeded from the clock, as the forecast's are.
**Why:** `act` rebuilds its whole screen on every press and the player moves from `base` to `act`, so anything held in the DOM would be lost mid-find. Keeping it out of `RunState` means no change to `sim/run.ts`, `main.ts` or the sol rules, and the rover cannot affect winning or losing (R-20). A fixed list matches `nasaGallery`: a slow connection must not delay the lesson. Seeding rather than `Math.random` keeps a mission repeatable and assertable, for the same reason the forecast is seeded (D-048).
**Rejected:** (a) A live NASA image-search call per find — slow, and an outage would leave the rover with nothing to find. (b) Putting the rover on `RunState` — a wider change for a feature that touches no resource. (c) Advancing finds per sol — a demo player would wait many presses to see anything. (d) `window.confirm` for the deploy question — banned (R-9). (e) `Math.random` for the picks — the same reason it was rejected in `sim/`.
**Consequence:** `gameScreen` takes `rover?: boolean`; only `base` and `act` set it. A new mission resets the rover; leaving mid-run does not save it (there is no save, D-003). Pictures load from NASA's picture CDN at a size that fits the screen and are never cropped, and a failed load drops the picture and keeps the words. A rover with a find waiting cannot be recalled: it is still driving towards it.

---

---

**D-058 — agent — 2026-11-11**
**Choice:** The game **names the five science goals it is about** and shows them, live, on every sol: Martian Dust Storm, Life Support, Radiation Exposure, Power Shortage and Food Production. Each goal carries its own NASA fact, filed under a topic of its own, and the debrief reports how each one fared.
**Why:** The numbers were always real and always about these five things — the dust blocking the Sun, the air and water makers, the shielding, the batteries, the greenhouse — but nothing said so. A player saw five bars falling and had to work out for themselves that the dust was what was blocking the Sun. Naming the goals turns a set of falling bars into a set of things a player can think about, and it makes the science legible: "the greenhouse grows 12 food a sol and the crew eat 10" is a fact about the machine they are running, not a number to panic at. It also gives the NASA facts somewhere to belong: one topic per goal, so the dust goal never shows the same fact as the power goal.
**Rejected:** A separate "mission objectives" screen (another route, another place to keep in step, and D-039 already rejected a new route at freeze); five separate crises, one per goal (that would be four more events in a twelve-sol run, and the schedule is deliberately spaced so the player has a quiet sol between alarms — D-056); showing the goals as another HUD row (the game-loop frame has five resource cards and the goals are not resources); replacing the resource meters with the goals (the meters are what the trades are made of; the goals are what they mean).
**Consequence:** `src/sim/goals.ts` is a new pure module: `SCIENCE_GOALS`, `goalReadings`, `goalById`. Every reading is worked out from the sim — the storm actually running, the panels' real output, the stores as they stand, the last sol's blackout — so it is a fact about the outpost and not a decoration. `sim/topics.ts` gains a `dust` topic so the five goals file their facts separately, and `ActivitySpec` gains an optional `goal`, so the seven activities that serve a goal say which one and the five pure-science activities do not claim to serve any. `act` shows the five rows under the day's activity; `debrief` reports how each ended.

---

---

**D-057 — agent — 2026-11-10**
**Choice:** The ration check's **question and options change every run**. The mission length is drawn from six authored values, the answer moves with it, and all four buttons are worked out from the question on screen: the answer plus the three mistakes a child actually makes — forgot the crew, forgot the packet size, forgot both. The order is shuffled as well. The variation is **seeded from the astronaut's name**, never from `Math.random()`.
**Why:** The question was fixed — two months, four crew, three days per packet — so the answer was always 80 and the buttons were always 20, 80, 240, 720. A child who played twice learned the number instead of the calculation, and the screen that exists to teach arithmetic had become a memory test. The options had a second problem: the fourth, 720, was not a mistake anyone could describe, so it was a guess button.
**Rejected:** `Math.random()` (a demo must repeat and a test must be able to pin it — the same rule D-045 applied to the rotating facts); a run counter in the sim (global mutable state in a layer that is supposed to be pure); varying the crew size (the briefing tells the player there are four of them, and ISS-044 exists because those two numbers once disagreed); asking about sols instead of months (the mission is twelve sols but the ration scene is about the journey there and back, and changing the unit would change what the screen teaches); letting the player pick the packet size as well (one variable at a time — three steps is already a lot for an eight-year-old).
**Consequence:** `features/supply/model.ts` gains `seedFrom`, `questionFor`, `choicesFor`, `promptFor` and `puzzleFor`; the screen resolves one `RationPuzzle` at mount and uses it for the spoken question, the buttons, the number under test and the working, so they cannot disagree. The crew size is read from `sim/modules.ts` rather than typed in, which is what keeps the ration maths in step with the briefing. The default question is still two months and four crew, so the old answers and the old tests still hold.

---

---

**D-056 — agent — 2026-11-10**
**Choice:** **Two forecast events can never happen back to back.** Every event also claims the sol on either side of it, and those sols stay empty, so there is always at least one quiet sol between any two events — including after a two-sol dust storm, which is still dusting the panels when the next alarm arrives.
**Why:** A crisis on the sol after a crisis gives the player no room to breathe: the dust from one sol is still on the panels the next, and the power they spent on the first is still gone. The rule used to be implied by four typed-in constants that happened to be spaced right, and then D-048 replaced them with a timetable rolled from a seed — at which point the planner could put a flare on the sol after a pod, because `FLARE_CHANCE_AFTER_FLARE` exists to model exactly that. A rule that lives in four numbers, or in a dice roll, is a rule the next person breaks by adding a fifth event. The guarantee has to be a property of the construction, not a promise.
**Rejected:** Just adding a test over the current constants (that would catch a regression but not prevent the edit that causes one); dropping the burst chance entirely (flares really do come in bursts, because one active sunspot region keeps firing — the burst chance now applies to a flare *two* sols after another, so the model survives the gap); letting the crew see the whole timetable so a pile-up is "fair" (the flare gives one sol of warning at most — D-048 — so the player cannot plan around it anyway); spacing the events further apart (the run is twelve sols and the quiet sols are what make the run readable).
**Consequence:** `sim/forecast.ts` gains `MIN_CLEAR_SOLS` and `forecastIsSpaced(forecast)`, and `planEvents` keeps a second set of sols — the quiet ones — that no event may land on. Every event claims the sol before and the sol after it, so the rule holds whatever the dice say; `forecastIsSpaced` is exported so a test can say so over many seeds. The planner's `pickFreeSol` now returns `null` when every sol is used, because a storm plus four flares can fill the window, and a run with no cargo pod is a perfectly good run. `src/sim/forecast.test.ts` asserts the rule over 200 seeds, and the test that used to say flares come in bursts on neighbouring sols now says they come in bursts **but never on neighbouring sols**.

---

---

**D-055 — agent — 2026-11-10**
**Choice:** The activity loop (D-051), the science score (D-052) and the NASA daily feed (D-053) are taken as an explicit **post-freeze scope exception**. The Nov 8 feature freeze (D-007, G-7) allowed only bug fixes; this is new gameplay, and it is recorded here rather than added quietly.
**Why:** The demo is Nov 14-15, and a freeze that is broken without saying so is not a freeze. Writing the exception down keeps the one thing the freeze exists for — a stable, known artefact — while letting the demo show a game instead of a simulation. The exception is dated and bounded: three features, one branch, no new routes, no new runtime dependencies.
**Rejected:** Waiting until after the demo (the change is the demo); skipping the freeze without recording it (that is how a freeze dies, and it would leave the history wrong); cutting the work back to bug fixes only (that is the status quo, which is the problem).
**Consequence:** `docs/team/tasks.md` carries the work as TASK-066 … TASK-074 on branch `feat/daily-activities`. `docs/game-flow.md` is the document of record for how the game works. The freeze itself (D-007) is unchanged and still stands for everything else.

---

---

**D-054 — agent — 2026-11-10**
**Choice:** The cosmetic `MISSIONS` array in `features/act/model.ts` is replaced by `SOL_PLANS` in `src/sim/activities.ts`: twelve real sol headlines, each carrying the three activity ids offered on that sol, aligned with the baked crisis sols (3, 5, 7, 10).
**Why:** `MISSIONS` was ten hard-coded strings with **zero** effect on the simulation, and it disagreed with the forecast — sol 8 read "Mission 7: First Harvest" while the dust storm was actually on sol 7. A plan that drives the simulation cannot be cosmetic, and it cannot live in a feature's model when the rules that use it live in `sim/`.
**Rejected:** Keeping `MISSIONS` and adding a second parallel table (two sources of truth, and the old one would still be wrong); moving the headlines into `features/act/model.ts` (the sim needs them, and a feature model cannot be imported by `sim/`); inventing a fourteenth and fifteenth mission (the run is twelve sols).
**Consequence:** `act/model.ts` no longer exports `MISSIONS`; `missionHeadline` reads the plan for the sol. `sim/sol.ts` reads the same plan for the crisis-free sols, so the headline and the activity on screen cannot disagree. ISS-048 records the misalignment this fixes.

---

---

**D-053 — agent — 2026-11-10**
**Choice:** A **live NASA daily-fact layer sits on top of** the curated gallery, never replacing it: `src/data/nasaDaily.ts` fetches NASA's Astronomy Picture of the Day filtered to Mars, one entry per sol, and falls through to the curated gallery when the request fails, labelling which was used.
**Why:** D-042 and D-045 rejected *replacing* the curated gallery with a runtime image API, because a flaky second endpoint and unpredictable licensing mid-demo are not worth it. That reasoning still holds, and this decision does not overturn it: the curated gallery remains the guaranteed layer and the game is complete without a network. What is added is an enrichment layer that answers the question the curated gallery cannot — "what is NASA looking at *today*?" — and it follows the pattern D-037 already proved for space weather: **NASA → curated fallback, with the source always reported.**
**Rejected:** NASA Mars Rover Photos API (it did not answer from this repository — `404` on every rover/sol tried — so it is unverified, and the one place it would have been used is the one place it must not be); replacing the curated gallery with the live feed (D-042); proxying the API through a backend (there is no backend, D-003); a second API key (the existing `VITE_NASA_API_KEY` already covers `api.nasa.gov`, so ISS-006 does not widen).
**Consequence:** `data/nasaDaily.ts` follows the `data/README.md` contract exactly — injected `fetch` in tests, never throws, always reports its source. `dom/dailyFactLoader.ts` joins `data/` and `sim/` the way `dom/forecastLoader.ts` does, because `act` and `debrief` both want the feed and R-5 stops them importing each other. ISS-049 records the rate limiting measured against the shared `DEMO_KEY`; the fallback is what makes the demo safe without a personal key.

---

---

**D-052 — agent — 2026-11-10**
**Choice:** Activities award **science points**. `RunState.science` totals them across the run, and the debrief shows the total and a **rank** earned from it (Explorer → Chief Martian Scientist).
**Why:** A run whose only question is "did you survive?" is a lesson, not a game. A number to beat and a name to earn give the twelve sols a shape the player can aim at, and the activities in D-051 are the thing that moves the number — so the score and the gameplay are the same system rather than a layer on top of one.
**Rejected:** Badges and milestones, research levels that gate activities, crew morale, and XP as a second currency — all cut for demo safety and all cheap to add on top of this score later; a score that changes survival (it must not: R-20 and the "losing is informative" half of G-4 mean losing still has to teach, not punish); a random score (a demo must repeat, so every number is derived from the log, never from `Math.random()`).
**Consequence:** `src/sim/science.ts` holds the ranks and the progress arithmetic, pure and tested. `RunState` gains `science: number`; `SolRecord` gains `activity`. The score is shown in the `act` kicker and in a debrief callout. Badges, levels and morale stay available as later work because the score they would hang off already exists.

---

---

**D-051 — agent — 2026-11-10**
**Choice:** Every sol has a **main activity**. On each of the eight crisis-free sols `act` offers three activities and the player picks one; the activity's cost and gain are applied by `advanceSol` and recorded on the sol. On a crisis sol the crisis **is** the activity — it replaces the activity panel exactly as D-040 describes.
**Why:** The player had a decision on 4 of 12 sols. The other eight were *read five numbers, press "Run sol N"*, which is what made the game read as a science class rather than a game. A daily activity gives every sol a choice with a price, and the price is a real one: the activity's kWh joins the existing `extraPowerCost` path, so spending 25 kWh on a rover survey with a flat battery slows life support exactly as a black night does.
**Rejected:** A separate planning phase (D-018, D-031 — the owner confirmed no plan phase, and this reaches the same place without a new screen); a new `activities/` route and feature folder (D-039 rejected a new route at freeze, and this needs no new route at all); letting activities stack *on top of* a crisis (D-040 — one panel, one decision, and a crisis that interrupted an activity would leave the player guessing which choice applied); free activities with no cost (a choice with no price is not a decision).
**Consequence:** `src/sim/activities.ts` is a new pure module holding the twelve activities and the twelve sol plans; `RunState` gains `chosenActivity: string | null`, cleared when the sol resolves. `features/act/README.md` no longer says the screen is "a simulation runner, not a decision screen" — it is both. `features/act/model.ts` gains the activity rows and the score row. ISS-053 records the test gap that this area inherits.

---

---

**D-050 — agent · 2026-11-10**
**Choice:** The supply screen answers Enter exactly as NEXT does. The two rules that decide it — "is this a plain Enter?" and "does the focused element deal with Enter itself?" — live in `features/supply/model.ts`, where they are pure and can be tested; the view holds one `window` keydown listener. The screen also resets itself when it mounts, because its markup is static and everything it shows survives a visit.
**Why:** The screen had no keyboard handler at all: Enter did nothing until NEXT had been clicked with a mouse, and even then it worked only because the click left the focus on the button and the browser activates a focused button on Enter. A key that works only after a click reads as broken (ISS-053). The reset is the same defect's other half: a second visit came back with NEXT hidden, the answers still on screen and eight answer options instead of four, so Enter would have gone quiet again on every revisit.
**Rejected:** (a) A shared `ui/` helper for the Enter rule — the briefing has the same rule inline, and extracting it would touch a screen that is not part of this fix; it can be done once two screens want it. (b) Enter answering the ration question — a stray press would pick an answer for a child. (c) An auto-advance timer like the briefing's — it would take the beat away while it is still being read. (d) Rebuilding the screen's DOM on every mount to clear the old state — the markup is shared with the rest of the page, and the reset is six lines.
**Consequence:** `features/supply/model.ts` exports `isPlainEnter` and `focusHandlesEnter`, both pure and covered by tests; `features/supply/view.ts` adds one `window` keydown listener, removes it in its teardown, and resets the screen's state on mount. The other screens' views and models are untouched.

---

**D-049 — agent · 2026-11-10**
**Choice:** The naming screen becomes a full-bleed scene: the stage is the backdrop for the whole window, the astronaut stands on the left, Mars fills the right and runs off the edges, and the menu (title, name field, buttons, trainer card) sits on the right over the planet. The card frame is gone, the typography is the geometric sans already loaded for the site (Outfit), the panels are translucent so the planet shows through, and a radial scrim keeps the menu legible on top of it. The Mars rotation is untouched: `naming-mars-turn` is still 150s, linear, infinite, and `naming-astronaut-float` is still 9s.
**Why:** The screen was built to an earlier mockup that put the artwork in a bordered card on the right and the menu in a column on the left. The new reference is the opposite: one picture, edge to edge, with the menu on the planet. It is also a better screen for a child — the astronaut is the first thing on it rather than a small picture in a box.
**Rejected:** Keeping the 1060x677 card and restyling it (the frame is the thing the reference removes); moving the planet or the astronaut with JavaScript (the CSS keyframes already do it, and a JS loop is a leak to clean up on every navigation); rebuilding the scene as one flattened bitmap (it would stop rotating and could not respond to the viewport); a JS-driven starfield (the landing page already owns that, and the scene does not need a second one).
**Consequence:** `index.html` moves the stage out of `.naming__body` to be the first child of the section, and wraps the title, greeting and form in `.naming__content` so the block can be centred above the trainer card. `naming.css` is rewritten around the new composition; the keyframes are copied over unchanged. `view.ts` and `model.ts` are untouched, so the name rules and their 21 tests stand, and the screen still behaves exactly as before: START MISSION stays disabled until the name is usable. START MISSION is the button that carries the emphasis, with the accent fill every other screen's primary button uses, so the way forward is the bright one and "Start over" stays quiet beside it. Below 720px wide or 480px tall the backdrop is dropped and the panel goes full width, as it did before.

---

---

**D-048 — agent — 2026-11-10**
**Choice:** Every mission's hazards are rolled from a seed: whether a dust storm happens, how many flares (1–4), whether a supply pod is scheduled, and which sols (2–10, one event at a time). Flare sizes are drawn from the real M and X flares the live feed returned; with no live data they are drawn from the NOAA long-run record (3,791 M to 345 X flares, 1975–2012), marked `approximate`. A dustier landing site gets more storms. The crew sees a pod for the whole run, a storm three sols ahead and a flare only one sol ahead.
**Why:** The fixed schedule (D-033) meant every replay was the same four decisions in the same order, which undercuts "a living simulation". Real hazards vary: flare activity changes month to month, dust storms are common but not certain, and flares give almost no warning. Seeding rather than `Math.random` keeps a run repeatable in a demo and assertable in a test.
**Rejected:** (a) `Math.random` in `sim/` — it breaks determinism and is how ISS-015 happened. (b) Inventing flare sizes with no source — sizes come only from real flares or the NOAA mix. (c) Using C-class flares — the Sun makes thousands and they cannot hurt a shielded crew. (d) A Mars dust-season variable on `RunState` — more state for little gain. (e) Longer or variable storms — balance risk for no extra lesson. (f) A fully empty mission — every mission has at least one flare and two decisions, because otherwise there is nothing to play.
**Consequence:** `sim/forecast.ts` exports `createSeededRandom`, `planEvents`, `randomSolBetween`, `stormChance`, `visibleForecast`, `WARNING_SOLS` and `createForecast(flares, seed?, dustScore?)`; `DEFAULT_SEED` is 6. `dom/forecastLoader.loadForecast(signal?, seed?, dustScore?)` passes `Date.now()` and the site's dust score, so every new mission differs. `data/spaceweather.ts` returns every flare it parsed and `FALLBACK_FLARES` is empty, so an offline run draws typical sizes from the long-run record instead of the same two baked flares. `features/base`'s "read ahead" card and `features/act`'s "Coming up" panel show `visibleForecast`, not the whole timetable. **No two events ever touch** — D-056 adds the quiet sol that keeps a rolled timetable from becoming a pile-up.

---

---

**D-047 — agent — 2026-11-10**
**Choice:** The rotating NASA fact list (`FACTS` / `factFor`) now appears on every screen that has no NASA card of its own: base, debrief, the supply ration-check, and the launch parts tour.
**Why:** One real NASA beat per screen was the goal (D-045); base and debrief got theirs, and the two screens that naturally held a learning gap next — packing supplies, touring a part — are the same child-facing moment.
**Rejected:** A second hardcoded fact string per screen (duplication nothing tests); a per-screen card type just to host a fact (facts are not per-sol content, unlike the cards); rotating a briefing or crisis line (those already have spoken or choice-driven content).
**Consequence:** Each screen picks its own seed: the debrief uses the run's sol count, the supply screen uses the last ration beat, and the launch tour uses the part index, so the same run sees the same fact and repeats it through a tour.

---

---

**D-046 — agent — 2026-11-10**
**Choice:** The briefing artwork is shown whole, locked to its own aspect ratio as the backdrop (the supply screen's stage approach), with one spoken line at a time over it, each line replacing the one before it; NEXT or Enter advances, and Enter confirms on the last line.
**Why:** The stacked beat cards filled the screen with a growing wall of text and left the artwork out entirely. One spoken line under the picture keeps the scene and reads as something being said to you; a child who looks away misses one line rather than five.
**Rejected:** A chat-thread accumulation where every beat stays on screen (the previous build) — it re-created the wall; auto-revealing on a timer — it takes the pace away from the reader.
**Consequence:** `features/briefing/view.ts` swaps `data-briefing-message` in place and restarts one fade; `model.ts` is unchanged, so the five beats and their tests stand. The YES!! button and the ~2.6 s auto-advance are unchanged. The shared read-aloud control still sits in the actions row and still pauses the closing hand-off.

---

---

**D-045 — agent — 2026-11-10**
**Choice:** Add one real NASA photo per landing region to the landing-site panel, and a rotating list of short NASA facts for screens that have no card of their own.
**Why:** The landing choice was a pin on an authored map. A child can ask "what does that place actually look like?" and five real NASA images answer it, which makes the trade-off between regions concrete instead of abstract. The facts list lets base and debrief add a learning beat without a new card per screen or any invented content.
**Rejected:** A live NASA image search (the same flakiness and licence reasons as D-042); hard-coding a fact string in each view (duplication, nothing tested); `Math.random()` for rotation (a demo should repeat, and the facts would be untestable).
**Consequence:** `REGION_CARDS` and `FACTS` are pure, tested data. `factFor(seed)` wraps negative and huge seeds, so the same run sees the same fact and a test can pin it. The landing-site photo reuses `nasaCard`, so the credit line, source link and read-aloud come with it.

---

---

**D-044 — agent — 2026-11-10**
**Choice:** The game-loop header's "Mission Control / Main Menu" label becomes a real Menu button that opens an in-screen leave dialog with Keep playing / Leave mission, and naming's "Back to Main Menu" becomes "Start over", which clears the form and discards the run.
**Why:** The header label was plain text drawn as chrome, so it advertised an escape that did not exist; a child who wanted out mid-run had none, and the browser Back button silently dropped state. Naming's back button called `navigate('naming')` while already on naming, so after the first press it did nothing at all.
**Rejected:** `window.confirm()` (R-9 bans it); a separate route that renders nothing (`landing` has no call to action, so sending a player there strands them); keeping the label as-is (a dead affordance in front of judges).
**Consequence:** `gameHeader(sub, onLeave?)` keeps the plain label when a screen has no run to leave, so nothing advertises a control that does nothing. The dialog is an in-screen card with its own focus handling, never a native dialog. Leaving always returns to `naming`, and the README already says progress is not saved, so the dialog states that rather than pretending otherwise.

---

---

**D-043 — agent — 2026-11-10**
**Choice:** Read-aloud uses the browser's own `speechSynthesis`, wrapped in `ui/readAloud.ts` and shared through `ui/readButton.ts`. No audio file, no network request, no dependency, and the control is omitted entirely where the API is missing.
**Why:** The brief is written for ages 8-16, and a child who cannot yet read the briefing fluently loses the whole mission story if the only route through is the NEXT button. Recorded audio would mean assets, a hosting path and a mute design; speech synthesis is already on the device, works offline on the demo laptop, and costs nothing at runtime. A shared toggle means the NASA cards, the briefing and the crisis prompt cannot drift into three different behaviours.
**Rejected:** Bundled narration audio files (assets the team cannot supply at freeze, and a licence question for NASA voice/music); a backend TTS service (no backend, D-003); a single global read-aloud that re-reads the whole screen (a crisis re-read must include the choices, not the recap).
**Consequence:** `readButton` returns null where speech is unavailable, so unsupported browsers simply do not get a dead control. The router calls `stopReading()` on every route change, and screens stop the voice in teardown, so a passage cannot follow the player into the next scene. The briefing pauses its closing hand-off while a passage is playing and resumes it only when the reading finishes naturally.

---

---

**D-042 — agent — 2026-11-10**
**Choice:** The NASA learning layer is a curated static gallery in `data/nasaGallery.ts`: twelve real images, one per sol, plus a closing artist concept on the debrief, each with a NASA id, alt text, caption, fact, credit and source link.
**Why:** The pitch promises NASA data, and the space-weather path already proves a live NASA connection; but image search at runtime would add a second network dependency, rate limits and unpredictable licensing mid-demo, and the demo laptop may have no network at all. A fixed set of twelve cards can be checked for length, alt text and attribution in unit tests — which is the same discipline the rest of `sim/` and `data/` already runs under.
**Rejected:** A runtime NASA image API (a second flaky endpoint, per-image licence review, and a cache story); generic stock Mars photos (the promise is NASA data); decorative artwork with no credit line (the README's attribution terms are explicit).
**Consequence:** `NASA_CARDS` is pure data with a test that enforces every field, every id and the source link, so a bad card fails `npm test` rather than shipping. The closing card is labelled an artist's concept, not a photograph, because it is the one place a child could mistake an illustration for a real mission.

---

---

**D-041 — agent · 2026-11-10**
**Choice:** `README.md` is maintained as the technical front page — status, setup commands, the real `src/` tree and links to every document — and it is updated in the same commit as any change that makes it false.
**Why:** D-011 left the README untouched so its design, science and attribution writing would survive, and logged the false status as ISS-001. Since then the code grew a complete nine-screen journey, and the README still told every reader there was nothing to run. That is the first file a judge, teacher or new teammate opens. The design sections were kept; only the technical claims were corrected.
**Rejected:** Keeping the README frozen and pointing readers at `docs/architecture.md` instead (the front page is where a judge starts); rewriting the pitch, science or attribution sections (nothing in them was wrong).
**Consequence:** ISS-001 is fixed. A setup, structure or status change now updates the README in the same commit, via the doc-update matrix in `AGENTS.md`. D-011 stays in this file as history.

---

---

**D-040 — agent · 2026-11-10**
**Choice:** A crisis replaces the mission panel inside the same screen shell, rather than opening a modal over it.
**Why:** The Figma frames draw the decision as the right-hand panel, with the outpost still visible on the left so the player can see what they are protecting. A modal would hide the world and add a focus trap the journey does not otherwise need.
**Rejected:** A `<dialog>` or full-screen overlay for `66:26`, `66:32` and `66:38` — more state to tear down, and none of the frames show it.
**Consequence:** `features/act/view.ts` renders either `missionPanel` or `crisisPanel` for the same `RunState`; mounting a crisis also clears the previous clock nodes, so only one countdown can ever be live.

---

---

**D-039 — agent · 2026-11-10**
**Choice:** The journal (`66:50`) is a mode of `debrief`, opened by "View my Mars story", not a new route.
**Why:** It reads the same finished run and owns no state of its own. A route would need a tenth screen, a registry entry and a way to stop a player deep-linking into a journal for a run that no longer exists.
**Rejected:** `features/journal/` with its own route (scope at freeze); rendering the journal in place of the debrief with no way back (the frames show a back link).
**Consequence:** `mountDebrief` toggles a local `mode` and re-renders; focus moves to the control that reverses the switch. The dock shows `journal` active in journal mode and `outpost` otherwise, as the frames do.

---

---

**D-038 — agent · 2026-11-10**
**Choice:** Rebuild base, act and debrief on one shared game-loop shell in `ui/gameLoop.ts` + `styles/game-loop.css`, with the header's pause, settings and BUILD pills and the Outpost/Inventory/Journal dock drawn as decorative chrome, not controls.
**Why:** The Figma frames (`66:14` … `66:50`) are one screen chrome with different content. Features may not import each other (R-5), so shared chrome belongs in `ui/`. The chrome cannot be made real: nothing in the journey can pause or open settings, and a BUILD control on `act` would let `startOutpost` reset stores and log — an exploit, not a feature.
**Rejected:** Copying the header into three `view.ts` files (drift, three sets of asset imports); React/Tailwind (no runtime dependencies); wiring BUILD to `base` (resets the run).
**Consequence:** The dock is `aria-hidden` chrome, and real navigation stays on the panel buttons. `gameLoop.ts` owns the only asset imports for the shared frame; a screen passes words and numbers in, never `sim/` rules.

---

---

**D-037 — agent · 2026-11-09**
**Choice:** Live space weather tries NASA DONKI first, then NOAA SWPC, then famous past flares marked approximate.
**Why:** DONKI is the NASA source the pitch promises, but on 2026-11-09 the NASA API portal returned `503 upstream connect error` and then `429 OVER_RATE_LIMIT` for the shared `DEMO_KEY` (ISS-008, ISS-009). One source means one outage turns the live forecast into history. NOAA SWPC's GOES X-ray feed sends `Access-Control-Allow-Origin: *` and is the instrument data DONKI itself mirrors, so it keeps the feature honest and live without inventing numbers.
**Rejected:** Keeping DONKI-only and shipping baked data on demo night (ISS-043); proxying through a backend (no backend exists, D-003); scraping `ccmc.gsfc.nasa.gov` (unreachable and unverified, ISS-008).
**Consequence:** `SpaceWeatherSource` gains `'noaa'`, the detail sentence names the agency that answered, and only the flare *size* is live — the sols stay baked in `sim/forecast.ts` (D-033). A personal `VITE_NASA_API_KEY` (ISS-009) restores NASA as the usual source.

---

---

**D-036 — agent · 2026-11-09**
**Choice:** The launch parts tour panel is a full-viewport overlay, not part of the 16:9 cinematic stage.
**Why:** The stage is letterboxed to 16:9, so its height is `9/16` of its width. The tour card — name, 16:9 image, description, three buttons — is taller than that on most viewports, and clipping it hides the Continue button (ISS-041).
**Rejected:** Keeping the panel inside the stage and shrinking the card to fit — the stage is only ~307px tall at a 545px-wide window, which cannot hold a readable image, a description and three buttons.
**Consequence:** `.launch__parts-panel` is a direct child of `.launch`; the part image is capped by `max-height` so the card fits short windows.

---

---

**D-035 — agent · 2026-11-08**
**Choice:** The Final screen is cut as its own route. A win is a panel on `debrief`.
**Why:** There is no route, task or art for it, and the freeze is today (extended for the loop, but scope is still tight).
**Rejected:** Building a seventh screen (`features/final/`) with its own route, mount point and tests — adds a screen nobody asked for when the debrief can carry the win panel.
**Consequence:** `debrief` shows a won-run panel instead of routing to `Final`. `src/ui/routes.ts` has no `final` route.

---

---

**D-034 — agent · 2026-11-08**
**Choice:** Region scores drive the simulation: sun → power per array, water → starting water and extractor output, dust → storm severity and solar loss during storm, temp → night power drain, terrain → build cost multiplier.
**Why:** Makes the landing choice matter. Currently `regionId` is stored and nothing reads it.
**Rejected:** Leaving the region cosmetic — then `landing-site` is a flavour screen with no consequence, which wastes the player's choice.
**Consequence:** `sim/run.ts` gains `landAt(run, regionId)` which sets region-adjusted starting stores. `landing-site/view.ts` `commitLanding` calls `landAt` instead of `withState(run, { regionId })` (ISS-040).

---

---

**D-033 — agent · 2026-11-08**
**Choice:** Space-weather events are baked-in and labelled `approximate: true`.
**Why:** DONKI CORS is unverified (ISS-008, D-005). The README promises honesty about estimates.
**Rejected:** A live fetch (blocked by ISS-008); unlabelled baked data (breaks the honesty promise).
**Consequence:** `sim/events.ts` carries the baked schedule. Every event has `approximate: true`. The debrief and `act` show the `approximate` tag.

---

---

**D-032 — agent · 2026-11-08**
**Choice:** Module catalogue lives in `sim/modules.ts`, not `features/base/model.ts`.
**Why:** `act` needs module effects and cannot import `base` (R-5). Same reasoning as D-029 (regions table in `sim/`).
**Rejected:** Duplicating the catalogue in `act` (drift risk, two sources of truth).
**Consequence:** `sim/modules.ts` owns `ModuleKind`, `ModuleSpec`, `MODULE_CATALOGUE`, `canBuild`, `buildCost`, `upkeepFor`. `features/base/model.ts` becomes a thin re-export plus presentation helpers.

---

---

**D-031 — agent · 2026-11-08**
**Choice:** The loop is `base ⇄ act → debrief`. `act` stays a simulation runner; the player returns to `base` between sols to build.
**Why:** Keeps D-018 (no plan phase) intact while still giving the player decisions between sols.
**Rejected:** A `plan/` feature (needs a recorded decision per D-018 and is not in scope).
**Consequence:** `features/act/` is the simulation runner with "Advance sol" and "Back to base". `features/base/` is the build screen reached between sols.

---

---

**D-030 — agent · 2026-11-08**
**Choice:** Sols are turn-based: one button press resolves one sol.
**Why:** Unblocks `sim/sol.ts` and `act`. Real-time needs a fake clock and a ticker.
**Rejected:** Real-time (more code, flakier tests, no time before the demo).
**Consequence:** `advanceSol` runs on a button press in `act`. No clock abstraction, no ticker in `dom/`.

---

---

**D-029 — agent · 2026-11-06**
**Choice:** The landing region table lives in `src/sim/regions.ts`, and is read by
`landing-site`, `base` and `act`.
**Why:** `base` and `act` need terrain, sun and dust, and R-5 stops them importing
`landing-site`. Putting the shared table in `sim/` lets every feature read it without
a cross-feature import. `features/landing-site/model.ts` imports the table for scoring.
**Rejected:** Keeping the table in `features/landing-site/` (would force `base`/`act` to
violate R-5); duplicating the table in each feature that needs it (drift risk, and the
totals-spread invariant would live in three places).
**Consequence:** `sim/regions.ts` owns `SiteAxis`, `SITE_AXES`, `SiteScore`, `Region`,
`REGIONS` and `totalScore`. `features/landing-site/model.ts` re-exports them and adds
`scoreRegion`, `tradeoffSummary`, `strengthAndWeakness`. `architecture.md` gains a
`sim/regions.ts` contract row and marks `landing-site` complete.

---

---

**D-028 — agent · 2026-10-22**
**Choice:** Ask the player to try again on the ration check — a TRY AGAIN button during
the wrong frame — instead of reverting the screen on a timer; leave the answer out of
the working until it has been earned; and give no directional hint on the first wrong
answer, only from the second one on.
**Why:** The user asked for it directly: the wrong-answer scene showed for a beat and
then changed on its own, and the retry should be something the player does. The timer
was defensible when it was written ("so the wrong frame registers before the retry"),
but a delay that removes the choice is a delay the player cannot refuse, and for an
eight-year-old who is still reading the hint it takes the feedback away at exactly the
wrong moment. Putting the answer in the rail was worse, and for a longer reason: the
working ends with the number under test, so the answer was readable straight off the
screen while the question was supposed to be being worked out. A timed revert limited
that to about a second; a manual retry would have removed the limit entirely. The hint
was the same mistake in a different place: on a first wrong answer, "too low, think
larger" is not feedback, it is the end of the thinking. The first attempt is where the
child is still working, and the blanked working is the thing that helps them work —
the direction only rules options out. From the second wrong answer on they have had the
method once and are stuck rather than thinking, which is when a nudge earns its place.
**Rejected:** Keeping the timer and only lengthening it (the player still cannot refuse
the retry, and it makes the answer's exposure time arbitrary rather than absent);
showing the full working during the retry (it shows the method *and* the answer, and the
method is the only part worth showing); hiding the working entirely while the player
retries (the days, the astronaut-days and the division are the teaching, and taking
them away leaves a hint and a blank); re-enabling the choices but leaving the alarm
frame up (two contradictory pieces of information at once); hinting on the first wrong
answer (it answers the question of which way to go before the method has been used);
hinting only on the last remaining attempt (the player has to be wrong twice before
being told anything, and the second mistake is the one that lands).
**Consequence:** `supply/view.ts` has no retry timer. `showWrong` shows the alarm frame
and a TRY AGAIN button and waits; `onRetry` takes the room back to the question frame,
re-enables the choices that were not retired, and asks the question again in the bubble
— but only if it is not already there, which it is after a first wrong answer, because
no hint was given to replace it. The view tracks the line the bubble is heading for so
that check is right even mid-crossfade. `supply/model.ts` gains `ANSWER_BLANK` and
`workingSentenceBlanked`, and both versions of the sentence are built from one
`workingText` helper so they cannot drift apart. The rail is one button taller on the
right-answer path, because the completed working now stays up next to CONTINUE.

---

**D-027 — agent · 2026-10-21**
**Choice:** Make the launch reel media-driven, serialise the three films onto the wire,
and give each a poster frame — rather than re-encoding the footage.
**Why:** The user reported that on a slow connection the live site shows black, then cuts
to the next beat, or skips after the time passes. The cause was threefold: all three films
were requested at once (~13.8 MB) with `preload="auto"`, none had a `poster`, and the
timeline was wall-clock — a clip that had not buffered was skipped, and the hand-off fired
at 25.25s regardless. The fix that actually matters is to stop the timeline depending on
the clock: a beat starts at the later of its slot and its clip's readiness, each beat chains
on the previous clip's `ended`, and a clip that errors keeps its poster and advances on its
nominal duration. Serialising the downloads means only one film is on the wire at a time,
and posters mean it is never black.
**Rejected:** Re-encoding at a lower resolution or CRF (helps, but does not guarantee
smoothness — on a 1 Mbps link no realistic bitrate fits the 5s window, and the tour's baked
text and the space gradients are exactly where H.264 artifacts show); a skip control (changes
the no-skip design and the reduced-motion promise); a stall watchdog that advances on a timer
(reintroduces the skip the user complained about); waiting indefinitely with no error
fallback (a dead connection would hang the screen).
**Consequence:** `launch/view.ts` owns a `Beat` per film and drives them from
`loadeddata`/`seeked`/`ended`/`error`. Only the launch film is assigned a `src` at mount; the
docking clip and the tour are assigned theirs when the previous beat starts. `index.html`
carries `preload="none"` on the two later clips, and `tools/extract-posters.py` writes
`Assets/images/launch/launch-poster.webp`, `Assets/video/docking-poster.webp` and
`Assets/video/parts-poster.webp` (~90–98 KB each). `TOTAL_DURATION_MS` remains the nominal
runtime; the real exit is the last clip's `ended`. A real browser check is still outstanding
— no browser is connected to this session (ISS-008).

---

**D-026 — agent · 2026-10-21**
**Choice:** Encode the docking clip and the spacecraft tour as H.264 (`libx264`, `yuv420p`,
CRF 18) rather than the `mp4v` OpenCV's `VideoWriter` writes by default.
**Why:** `mp4v` is MPEG-4 Part 2, which Chrome, Edge and Firefox do not decode — the launch
film is H.264 for the same reason. A clip that opens in a desktop player and shows a black
rectangle in the game is not a deliverable. PyAV is already installed and bundles FFmpeg, so
this is still no new runtime dependency and no ffmpeg binary; the alternative was a re-encode
with a tool that is not on this machine.
**Rejected:** Keeping `mp4v` and telling the player to open the file in a desktop player;
WebM/VP9 (same encoder problem, and the launch film is MP4); an H.264 encode of the
already-compressed `mp4v` files (a second generation of loss on the text).
**Consequence:** `Assets/video/docking.mp4` is 1.7 MB and `parts.mp4` is 5.5 MB, down from 5.1
and 13.2 MB, with the same frame counts and no audio. Both renderers write through PyAV instead
of `cv2.VideoWriter`; they still run as `python tools/render-*.py`.

---

**D-025 — agent · 2026-10-21**
**Choice:** Play the docking clip and the spacecraft tour as the last two beats of the launch
screen, rather than adding a new route between `launch` and `landing-site`.
**Why:** They are one uninterrupted reel. The launch film ends with the docking port open, the
docking clip closes it, and the tour labels what was just assembled. The player presses nothing
and chooses nothing, so a separate screen would add a route nobody sees and a second copy of the
video hand-off logic; the launch feature already owns the hand-off timer and the rule that the
film length is the only exit.
**Rejected:** A `features/spacecraft/` screen with its own route, mount point and tests;
concatenating the three films offline into one file (would re-encode 21s of finished footage and
make a pacing edit a full re-render).
**Consequence:** The launch screen runs 25.25s and owns three video elements. `launch/model.ts`
carries all three lengths, and the hand-off is still derived from `TOTAL_DURATION_MS`. If the
tour ever becomes interactive, that is the moment to split it into its own screen.

---

**D-024 — agent · 2026-10-21**
**Choice:** Render the "meet the spacecraft" segment with a second standalone script,
`tools/render-parts.py`, rather than extending `tools/render-docking.py`.
**Why:** The two problems share a toolchain but nothing else. Docking composites a sprite
over a headless background; this segment cross-dissolves four labelled stills and draws
description bars. Folding them together would have meant a renderer that special-cases
both, which is harder to read than two scripts that each say one thing.
**Rejected:** Extending `render-docking.py` to handle the parts sequence; a browser-based
capture (adds Playwright, and no browser is installed).
**Consequence:** `Assets/video/parts.mp4` (6.6s / 198 frames at first; retimed to 12.0s /
360 frames after the first viewing, ISS-027) and its script. The four part
stills are one base render with a different outline baked in, so they cross-dissolve
cleanly. The overview is a separate render whose baked label cards sit at different
positions, so a cross-dissolve ghosts both sets of cards at once — its two transitions
fade through black instead. The title sits in the lower-third bar rather than centred,
because centred it covered the habitat module, the busiest part of the overview frame.

---

**D-023 — agent · 2026-10-21**
**Choice:** Render the 3-second docking clip as a committed MP4 with a standalone Python
script (PIL + numpy + OpenCV), rather than as an in-game CSS cinematic or a browser capture.
**Why:** The ask is a clip to insert into an existing pitch video, not a playable screen. The
three source frames are stills, so the "animation" is a composite: the head is cut out of the
separated frame, the black space behind it rebuilt by inpainting, and the sprite moved across a
headless background. Python 3.11 with PIL, numpy and cv2 is already installed on this machine,
so the renderer adds no dependency and needs no ffmpeg. The project has zero runtime
dependencies (AGENTS.md §10); a browser capture would have meant adding Playwright, which is an
architecture change.
**Rejected:** A Playwright/headless-browser capture of a CSS cinematic (adds a dependency, and
no browser is installed); an in-game CSS cinematic under `features/docking/` (a different
deliverable — the clip is for an external video); WebM/VP9 (needs ffmpeg, which is not
installed).
**Consequence:** `tools/render-docking.py` is a dev tool, not part of the app — it is not
scanned by `npm run check`, which still passes (40 files). The clip is committed as
`Assets/video/docking.mp4` (5.1 MB at first, re-encoded to H.264 at 1.7 MB — ISS-029), matching
the existing `Assets/images/launch/launch-cinematic.mp4`. The geometry constants (the joint at
66.5% / 52.0%, a ~100px closing shift) are recorded in the script and can be ported into a CSS
cinematic later if docking is ever built in-game.

---

**D-022 — project owner · 2026-10-07**
**Choice:** Deploy production builds to Vercel from GitHub Actions only after the `Code
checks` workflow succeeds on the repository's default branch. Disable Vercel's native Git
deployments so they cannot bypass this gate.
**Why:** The owner selected Vercel instead of GitHub Pages and wants failed changes kept
out of Vercel deployment. The workflow checks the completed CI run, checks out that exact
commit, builds with the Vercel CLI, and deploys the prebuilt output.
**Rejected:** Keep GitHub Pages; allow Vercel's automatic Git integration to deploy
unchecked commits or run parallel deployments.
**Consequence:** Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub
repository secrets and link the Vercel project to the repository. This supersedes the
GitHub Pages deployment choice recorded for PR #1.

---

**D-021 — agent · 2026-10-07**
**Choice:** Use GitHub Pages as the deployment target; deploy only after the `Code checks`
workflow succeeds on `main`. Validate the repository HTML with html-validate while
allowing inline style attributes and style elements.
**Why:** No hosting provider was configured. Pages provides a repository-native target,
and the completed-check gate prevents failed changes from being published.
**Rejected:** Configure Vercel without an existing project or deploy credentials; deploy
without waiting for code checks.
**Consequence:** GitHub Pages must be enabled with GitHub Actions as its source. The
workflow uploads and deploys the built site only after checks pass.

---

**D-021 — project owner · 2026-10-07**
**Choice:** `naming` is the entry screen. The player names their astronaut and starts
the journey from there. A login page is intended to sit in front of it later.
**Why:** Stated by the owner — naming "will work as the menu where one set name and
start the journey", with a login page in front of it in future. The intent is a
clear progression: login (later) → naming → the cinematic sequence → landing site.
**Rejected:** Keeping `landing` as the entry and putting naming after it. Rejected
because naming *is* the menu; routing a player through a placeholder page before
letting them start would be an extra click for no benefit. The landing page is not
deleted — it stays reachable and is what BACK TO MAIN MENU returns to.
**Consequence:** `DEFAULT_ROUTE` is now `'naming'` and `ROUTE_ORDER[0]` is `naming`.
`landing` remains a real route, not a dead entry, so nothing that works was retired.
Supabase is still deferred and unowned (TASK-022), so the login page in front of
this is blocked on that decision, not on this screen.

---

---

**D-020 — project owner · 2026-10-06**
**Choice:** `sim/{resources,sol,run}.ts`, `ui/registry.ts`, `data/spaceweather.ts` and all
four features get **typed stubs** — real types, real signatures, every body
`throw new Error('STUB: ...')` — rather than README contracts or absent folders.
**Why:** The owner asked, three times, for the structure to be visible. Each of my
earlier answers was a smaller version of the same request and each left them unable to
see what they had asked for. A stub is the answer that was actually wanted on the first
attempt: it puts the *files* in the tree, not just the folders. Throwing rather than
returning `undefined` is the important half — a stub that returns `undefined` is a trap
three weeks later, while a stub that throws tells you immediately that it is not built.
**Rejected:** `.gitkeep` (visible but says nothing) and leaving the folders absent
(a documented decision to omit is not the same as the omission being visible). Also
rejected: writing the real implementations, which was never the ask.
**Consequence:** `npm run check` now scans **27** files instead of 14 and still passes,
`tsc --noEmit` passes under `strict` + `noUnusedLocals`, and `npm run build` is unchanged
because no stub is imported by `main.ts`. Verified by probe that `createInitialStores`,
`advanceSol` and `newRun` each throw. The risk of a stub reading as work is handled by
four things: every file says STUB on line 1, `architecture.md` marks them **stub**,
`AGENTS.md` §1 says so in bold, and the bodies throw. **No `*.test.ts` stubs were
created** — Vitest fails a test file containing no tests, so stubbing those would have
broken `npm test`.

---

---

**D-020 — project owner · 2026-10-07**
**Choice:** The Mars rotates **behind** a static astronaut — the planet turns slowly
in the image plane while the astronaut floats in front of it. Done in CSS keyframes.
**Why:** Chosen by the owner over a whole-card sway or a continuous spin. It needs
the two subjects separated, which is why the cutout sheet was supplied.
**Rejected:** (a) A gentle 3D sway of the whole card — elegant, but it rotates the
planet too, and the point of the cutouts was to keep them apart. (b) A continuous
spin of the card — reads as a flat plane spinning, which looks like a bug.
**Consequence:** the rotation is `rotate()` **in the image plane**, not a 3D axis.
This is forced by physics of the asset rather than taste: a sphere spun about its
own axis looks identical, so the animation would appear to do nothing. Both
animations are disabled outright under `prefers-reduced-motion`, because they are
continuous and self-triggered. No `requestAnimationFrame` is involved, so there is
no loop to leak on navigation — which is why the menu needs no teardown for them.

---

---

**D-019 — project owner · 2026-10-06**
**Choice:** `src/features/` and `src/data/` each get a `README.md` per folder, so the
structure is visible in the repository. One `README.md` for the `features/` directory
plus one per screen folder, and one for `data/`.
**Why:** The owner asked for placeholders after finding the folders invisible. **The
agent had recommended against it, twice, and was wrong about the cost.** An earlier pass
left the folders absent and reported that as deliberate; the owner reasonably read "I
created the folder structure" and could not find two of the seven new paths. Verified
afterwards: an empty directory produces *no* `git status` output at all, so
"the folder does not exist" and "the feature is not built" were indistinguishable to
anyone opening the repository — including the person who had just asked for the work.
**Rejected:** `.gitkeep`. Rejected because it makes the folder visible while saying
nothing; a `README.md` does the same job and states what belongs there. Also rejected:
leaving the folders absent, on the grounds that the annotated file tree in
`architecture.md` already showed them — which is true, and irrelevant to someone looking
at their editor.
**Consequence:** the folders now appear, and each README states "Not implemented" in its
first line so a contract cannot be mistaken for code. `architecture.md` marks them
**contracts only**, and `AGENTS.md` §1 and §8 updated. The checker's zone classifier
ignores `.md` files, so no rule changed — verified, still 14 files scanned. **The lesson
worth keeping: a documented decision to leave something absent is not the same thing as
the thing being visibly absent.** Absence reads as "nothing happened", not as "decided".

---

---

**D-018 — agent, on the owner's confirmation · 2026-10-06**
**Choice:** The game is built **without a plan phase**. The four in-scope screens are
`landing-site`, `base`, `act`, `debrief`.
**Why:** The owner confirmed this twice, including when asked directly what the act
screen resolves if plan does not exist. The player's decisions happen at build time
rather than each sol.
**Rejected:** Adding `features/plan/` because the README calls plan "the heart of the
game". The README describes the intended product; the owner decides the sprint.
**Consequence:** **`debrief` is now load-bearing, not optional polish.** With no
per-sol planning, the debrief is the only place a player learns *why* a run was lost,
which is the README's central promise ("a run that ends badly is the most educational
run in the game"). If debrief is weak, the game has no teaching left. `act` becomes the
simulation runner rather than a decision screen. `src/ui/routes.ts` deliberately has no
`plan` route.

---

---

**D-017 — no problem · 2026-10-06**
**Choice:** A feature may not import another feature (`cross-feature`), enforced.
State crosses screens through `RunState`, passed explicitly from `main.ts`.
**Why:** Six people picking up tasks one at a time will otherwise couple features by
import convenience. Enforcing isolation is what keeps "pick a folder, work in it" true.
**Rejected:** Allowing cross-feature imports for shared helpers, with the shared code
moved to `sim/` when duplication appears. That is strictly better for discoverability
and is the intended migration path; the rule just makes it explicit rather than
discretionary.
**Consequence:** two screens that genuinely need each other's types must put the shared
shape in `sim/` or in `main.ts`. The checker's error message says so, so the fix is
discoverable at the point of failure.

---

---

**D-016 — agent, for "whoever is free, task by task" · 2026-10-06**
**Choice:** No `index.ts` barrel files anywhere. Import concrete paths. Feature CSS is
imported by that feature's own `view.ts`, never added to a central `style.css`.
**Why:** A barrel is the single file every feature edits and nobody owns. With six
people and no per-folder context, that is guaranteed merge conflict and invisible in
review. A central stylesheet has the same problem one layer down.
**Rejected:** Barrels, for import ergonomics. Rejected because the ergonomics gain is
paid by everyone and the conflict cost is paid by everyone.
**Consequence:** a long import path is the correct trade. Both rules are conventions, not
enforced — nothing checks for a barrel today. Worth noting `tsc` would not catch one
either. They live in `AGENTS.md` R-14 and R-15.

---

---

**D-015 — agent · 2026-10-06**
**Choice:** Features are a fixed four-file layout: `model.ts`, `model.test.ts`,
`view.ts`, `<feature>.css`. Depth never exceeds two levels. Tests are colocated.
**Why:** The team works task-by-task, so someone opening a folder must find everything
for that screen without a map. Colocated tests match the repo's existing
`sim/*.test.ts` pattern, so nothing new has to be learned.
**Rejected:** Grouping all tests under a top-level `tests/` mirror of the tree, and
grouping all CSS centrally. Both rejected for the same reason as D-016: they trade a
stranger's ability to find things for tidiness that only a regular of the codebase
values.
**Consequence:** four folders in flight means at most sixteen files, and each folder is
self-contained. Purity is enforced by filename (`model.ts`, `types.ts`,
`constants.ts`, `*.test.ts`), which means an unrecognised pure filename is treated as
DOM-bearing — conservative, and it prompts a rename rather than a silent hole.

---

---

**D-014 — agent · 2026-10-06**
**Choice:** Hash routing, with the pure parsing split from the DOM glue:
`ui/routes.ts` (pure, 15 tests) and `ui/router.ts` (browser). **Not wired into
`main.ts` yet.**
**Why:** Deep-linkable screens matter for a Nov 14 demo — six people need to jump
straight to `#/debrief` rather than play there. Splitting the pure half means the
routing logic gets real coverage while the repo still has no jsdom (ISS-013).
**Rejected:** A single-page state machine with no routing, because it forces the demo to
be played from the start. Also rejected: multiple HTML entry points — **not a
preference, a dead end** — since there is no persistence anywhere in the project, so a
navigation would lose the run state a multi-mission loop needs.
**Consequence:** `ui/router.ts` is implemented, partly tested, and deliberately
inert. Half-wiring it with nothing to switch to could break the landing page, and the
DOM half cannot be verified without a browser. It is marked **not wired** in
`architecture.md`, `AGENTS.md` §3 and §10, so nobody assumes navigation works.

---

---

**D-013 — agent, approved by owner · 2026-10-06**
**Choice:** Rename `src/core/` to `src/sim/`.
**Why:** "core" described neither of the two things the folder would hold — astronaut
squash-and-stretch and resource depletion. `sim/` says "deterministic, pure, tested",
which is the property the folder exists to guarantee. It also gives the astronaut
physics an honest burial date: it is landing-page-only and goes when the landing page
is replaced (D-008).
**Rejected:** Full feature slices that would have moved the physics under
`features/landing/physics/`. Rejected on cost, not principle — it moves six files and
ninety-four tests in the week before the freeze, for naming consistency. Also rejected:
keeping `core/` on the grounds that a rename is churn; the rename costs four import
lines, which is not churn.
**Consequence:** all three files move together, so their internal relative imports stay
valid and only four import lines in `dom/` needed changing. `git log --follow` still
traces every file. Issue paths in `issues.md` were updated to match.

---

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
