# Decisions

Every choice someone might otherwise relitigate. **Newest first.**

The **Rejected** line is the point of this file. It is what stops the same dead end
being re-explored in week four. If you are about to propose something that appears
under Rejected below, read that entry first.

Format: number · who decided · **Choice** · **Why** · **Rejected** · **Consequence**.


---

**D-048 — agent — 2026-11-10**
**Choice:** Every mission's hazards are rolled from a seed: whether a dust storm happens, how many flares (1–4), whether a supply pod is scheduled, and which sols (2–10, one event at a time). Flare sizes are drawn from the real M and X flares the live feed returned; with no live data they are drawn from the NOAA long-run record (3,791 M to 345 X flares, 1975–2012), marked `approximate`. A dustier landing site gets more storms. The crew sees a pod for the whole run, a storm three sols ahead and a flare only one sol ahead.
**Why:** The fixed schedule (D-033) meant every replay was the same four decisions in the same order, which undercuts "a living simulation". Real hazards vary: flare activity changes month to month, dust storms are common but not certain, and flares give almost no warning. Seeding rather than `Math.random` keeps a run repeatable in a demo and assertable in a test.
**Rejected:** (a) `Math.random` in `sim/` — it breaks determinism and is how ISS-015 happened. (b) Inventing flare sizes with no source — sizes come only from real flares or the NOAA mix. (c) Using C-class flares — the Sun makes thousands and they cannot hurt a shielded crew. (d) A Mars dust-season variable on `RunState` — more state for little gain. (e) Longer or variable storms — balance risk for no extra lesson. (f) A fully empty mission — every mission has at least one flare and two decisions, because otherwise there is nothing to play.
**Consequence:** `sim/forecast.ts` exports `createSeededRandom`, `planEvents`, `randomSolBetween`, `stormChance`, `visibleForecast`, `WARNING_SOLS` and `createForecast(flares, seed?, dustScore?)`; `DEFAULT_SEED` is 6. `dom/forecastLoader.loadForecast(signal?, seed?, dustScore?)` passes `Date.now()` and the site's dust score, so every new mission differs. `data/spaceweather.ts` returns every flare it parsed and `FALLBACK_FLARES` is empty, so an offline run draws typical sizes from the long-run record instead of the same two baked flares. `features/base`'s "read ahead" card and `features/act`'s "Coming up" panel show `visibleForecast`, not the whole timetable.

---

**D-046 — agent — 2026-11-10**
**Choice:** The briefing artwork is shown whole, locked to its own aspect ratio as the backdrop (the supply screen's stage approach), with one spoken line at a time over it, each line replacing the one before it; NEXT or Enter advances, and Enter confirms on the last line.
**Why:** The stacked beat cards filled the screen with a growing wall of text and left the artwork out entirely. One spoken line under the picture keeps the scene and reads as something being said to you; a child who looks away misses one line rather than five.
**Rejected:** A chat-thread accumulation where every beat stays on screen (the previous build) — it re-created the wall; auto-revealing on a timer — it takes the pace away from the reader.
**Consequence:** `features/briefing/view.ts` swaps `data-briefing-message` in place and restarts one fade; `model.ts` is unchanged, so the five beats and their tests stand. The YES!! button and the ~2.6 s auto-advance are unchanged. The shared read-aloud control still sits in the actions row and still pauses the closing hand-off.

---

**D-047 — agent — 2026-11-10**
**Choice:** The rotating NASA fact list (`FACTS` / `factFor`) now appears on every screen that has no NASA card of its own: base, debrief, the supply ration-check, and the launch parts tour.
**Why:** One real NASA beat per screen was the goal (D-045); base and debrief got theirs, and the two screens that naturally held a learning gap next — packing supplies, touring a part — are the same child-facing moment.
**Rejected:** A second hardcoded fact string per screen (duplication nothing tests); a per-screen card type just to host a fact (facts are not per-sol content, unlike the cards); rotating a briefing or crisis line (those already have spoken or choice-driven content).
**Consequence:** Each screen picks its own seed: the debrief uses the run's sol count, the supply screen uses the last ration beat, and the launch tour uses the part index, so the same run sees the same fact and repeats it through a tour.

---

**D-045 — agent — 2026-11-10**
**Choice:** Add one real NASA photo per landing region to the landing-site panel, and a rotating list of short NASA facts for screens that have no card of their own.
**Why:** The landing choice was a pin on an authored map. A child can ask "what does that place actually look like?" and five real NASA images answer it, which makes the trade-off between regions concrete instead of abstract. The facts list lets base and debrief add a learning beat without a new card per screen or any invented content.
**Rejected:** A live NASA image search (the same flakiness and licence reasons as D-042); hard-coding a fact string in each view (duplication, nothing tested); `Math.random()` for rotation (a demo should repeat, and the facts would be untestable).
**Consequence:** `REGION_CARDS` and `FACTS` are pure, tested data. `factFor(seed)` wraps negative and huge seeds, so the same run sees the same fact and a test can pin it. The landing-site photo reuses `nasaCard`, so the credit line, source link and read-aloud come with it.

---

**D-043 — agent — 2026-11-10**
**Choice:** Read-aloud uses the browser's own `speechSynthesis`, wrapped in `ui/readAloud.ts` and shared through `ui/readButton.ts`. No audio file, no network request, no dependency, and the control is omitted entirely where the API is missing.
**Why:** The brief is written for ages 8-16, and a child who cannot yet read the briefing fluently loses the whole mission story if the only route through is the NEXT button. Recorded audio would mean assets, a hosting path and a mute design; speech synthesis is already on the device, works offline on the demo laptop, and costs nothing at runtime. A shared toggle means the NASA cards, the briefing and the crisis prompt cannot drift into three different behaviours.
**Rejected:** Bundled narration audio files (assets the team cannot supply at freeze, and a licence question for NASA voice/music); a backend TTS service (no backend, D-003); a single global read-aloud that re-reads the whole screen (a crisis re-read must include the choices, not the recap).
**Consequence:** `readButton` returns null where speech is unavailable, so unsupported browsers simply do not get a dead control. The router calls `stopReading()` on every route change, and screens stop the voice in teardown, so a passage cannot follow the player into the next scene. The briefing pauses its closing hand-off while a passage is playing and resumes it only when the reading finishes naturally.

---

**D-042 — agent — 2026-11-10**
**Choice:** The NASA learning layer is a curated static gallery in `data/nasaGallery.ts`: twelve real images, one per sol, plus a closing artist concept on the debrief, each with a NASA id, alt text, caption, fact, credit and source link.
**Why:** The pitch promises NASA data, and the space-weather path already proves a live NASA connection; but image search at runtime would add a second network dependency, rate limits and unpredictable licensing mid-demo, and the demo laptop may have no network at all. A fixed set of twelve cards can be checked for length, alt text and attribution in unit tests — which is the same discipline the rest of `sim/` and `data/` already runs under.
**Rejected:** A runtime NASA image API (a second flaky endpoint, per-image licence review, and a cache story); generic stock Mars photos (the promise is NASA data); decorative artwork with no credit line (the README's attribution terms are explicit).
**Consequence:** `NASA_CARDS` is pure data with a test that enforces every field, every id and the source link, so a bad card fails `npm test` rather than shipping. The closing card is labelled an artist's concept, not a photograph, because it is the one place a child could mistake an illustration for a real mission.

---

**D-044 — agent — 2026-11-10**
**Choice:** The game-loop header's "Mission Control / Main Menu" label becomes a real Menu button that opens an in-screen leave dialog with Keep playing / Leave mission, and naming's "Back to Main Menu" becomes "Start over", which clears the form and discards the run.
**Why:** The header label was plain text drawn as chrome, so it advertised an escape that did not exist; a child who wanted out mid-run had none, and the browser Back button silently dropped state. Naming's back button called `navigate('naming')` while already on naming, so after the first press it did nothing at all.
**Rejected:** `window.confirm()` (R-9 bans it); a separate route that renders nothing (`landing` has no call to action, so sending a player there strands them); keeping the label as-is (a dead affordance in front of judges).
**Consequence:** `gameHeader(sub, onLeave?)` keeps the plain label when a screen has no run to leave, so nothing advertises a control that does nothing. The dialog is an in-screen card with its own focus handling, never a native dialog. Leaving always returns to `naming`, and the README already says progress is not saved, so the dialog states that rather than pretending otherwise.

---

**D-041 — agent · 2026-11-10**
**Choice:** `README.md` is maintained as the technical front page — status, setup commands, the real `src/` tree and links to every document — and it is updated in the same commit as any change that makes it false.
**Why:** D-011 left the README untouched so its design, science and attribution writing would survive, and logged the false status as ISS-001. Since then the code grew a complete nine-screen journey, and the README still told every reader there was nothing to run. That is the first file a judge, teacher or new teammate opens. The design sections were kept; only the technical claims were corrected.
**Rejected:** Keeping the README frozen and pointing readers at `docs/architecture.md` instead (the front page is where a judge starts); rewriting the pitch, science or attribution sections (nothing in them was wrong).
**Consequence:** ISS-001 is fixed. A setup, structure or status change now updates the README in the same commit, via the doc-update matrix in `AGENTS.md`. D-011 stays in this file as history.

---

**D-040 — agent · 2026-11-10**
**Choice:** A crisis replaces the mission panel inside the same screen shell, rather than opening a modal over it.
**Why:** The Figma frames draw the decision as the right-hand panel, with the outpost still visible on the left so the player can see what they are protecting. A modal would hide the world and add a focus trap the journey does not otherwise need.
**Rejected:** A `<dialog>` or full-screen overlay for `66:26`, `66:32` and `66:38` — more state to tear down, and none of the frames show it.
**Consequence:** `features/act/view.ts` renders either `missionPanel` or `crisisPanel` for the same `RunState`; mounting a crisis also clears the previous clock nodes, so only one countdown can ever be live.

---

**D-039 — agent · 2026-11-10**
**Choice:** The journal (`66:50`) is a mode of `debrief`, opened by "View my Mars story", not a new route.
**Why:** It reads the same finished run and owns no state of its own. A route would need a tenth screen, a registry entry and a way to stop a player deep-linking into a journal for a run that no longer exists.
**Rejected:** `features/journal/` with its own route (scope at freeze); rendering the journal in place of the debrief with no way back (the frames show a back link).
**Consequence:** `mountDebrief` toggles a local `mode` and re-renders; focus moves to the control that reverses the switch. The dock shows `journal` active in journal mode and `outpost` otherwise, as the frames do.

---

**D-038 — agent · 2026-11-10**
**Choice:** Rebuild base, act and debrief on one shared game-loop shell in `ui/gameLoop.ts` + `styles/game-loop.css`, with the header's pause, settings and BUILD pills and the Outpost/Inventory/Journal dock drawn as decorative chrome, not controls.
**Why:** The Figma frames (`66:14` … `66:50`) are one screen chrome with different content. Features may not import each other (R-5), so shared chrome belongs in `ui/`. The chrome cannot be made real: nothing in the journey can pause or open settings, and a BUILD control on `act` would let `startOutpost` reset stores and log — an exploit, not a feature.
**Rejected:** Copying the header into three `view.ts` files (drift, three sets of asset imports); React/Tailwind (no runtime dependencies); wiring BUILD to `base` (resets the run).
**Consequence:** The dock is `aria-hidden` chrome, and real navigation stays on the panel buttons. `gameLoop.ts` owns the only asset imports for the shared frame; a screen passes words and numbers in, never `sim/` rules.

---

**D-037 — agent · 2026-11-09**
**Choice:** Live space weather tries NASA DONKI first, then NOAA SWPC, then famous past flares marked approximate.
**Why:** DONKI is the NASA source the pitch promises, but on 2026-11-09 the NASA API portal returned `503 upstream connect error` and then `429 OVER_RATE_LIMIT` for the shared `DEMO_KEY` (ISS-008, ISS-009). One source means one outage turns the live forecast into history. NOAA SWPC's GOES X-ray feed sends `Access-Control-Allow-Origin: *` and is the instrument data DONKI itself mirrors, so it keeps the feature honest and live without inventing numbers.
**Rejected:** Keeping DONKI-only and shipping baked data on demo night (ISS-043); proxying through a backend (no backend exists, D-003); scraping `ccmc.gsfc.nasa.gov` (unreachable and unverified, ISS-008).
**Consequence:** `SpaceWeatherSource` gains `'noaa'`, the detail sentence names the agency that answered, and only the flare *size* is live — the sols stay baked in `sim/forecast.ts` (D-033). A personal `VITE_NASA_API_KEY` (ISS-009) restores NASA as the usual source.

---

**D-036 — agent · 2026-11-09**
**Choice:** The launch parts tour panel is a full-viewport overlay, not part of the 16:9 cinematic stage.
**Why:** The stage is letterboxed to 16:9, so its height is `9/16` of its width. The tour card — name, 16:9 image, description, three buttons — is taller than that on most viewports, and clipping it hides the Continue button (ISS-041).
**Rejected:** Keeping the panel inside the stage and shrinking the card to fit — the stage is only ~307px tall at a 545px-wide window, which cannot hold a readable image, a description and three buttons.
**Consequence:** `.launch__parts-panel` is a direct child of `.launch`; the part image is capped by `max-height` so the card fits short windows.

---

**D-035 — agent · 2026-11-08**
**Choice:** The Final screen is cut as its own route. A win is a panel on `debrief`.
**Why:** There is no route, task or art for it, and the freeze is today (extended for the loop, but scope is still tight).
**Rejected:** Building a seventh screen (`features/final/`) with its own route, mount point and tests — adds a screen nobody asked for when the debrief can carry the win panel.
**Consequence:** `debrief` shows a won-run panel instead of routing to `Final`. `src/ui/routes.ts` has no `final` route.

---

**D-034 — agent · 2026-11-08**
**Choice:** Region scores drive the simulation: sun → power per array, water → starting water and extractor output, dust → storm severity and solar loss during storm, temp → night power drain, terrain → build cost multiplier.
**Why:** Makes the landing choice matter. Currently `regionId` is stored and nothing reads it.
**Rejected:** Leaving the region cosmetic — then `landing-site` is a flavour screen with no consequence, which wastes the player's choice.
**Consequence:** `sim/run.ts` gains `landAt(run, regionId)` which sets region-adjusted starting stores. `landing-site/view.ts` `commitLanding` calls `landAt` instead of `withState(run, { regionId })` (ISS-040).

---

**D-033 — agent · 2026-11-08**
**Choice:** Space-weather events are baked-in and labelled `approximate: true`.
**Why:** DONKI CORS is unverified (ISS-008, D-005). The README promises honesty about estimates.
**Rejected:** A live fetch (blocked by ISS-008); unlabelled baked data (breaks the honesty promise).
**Consequence:** `sim/events.ts` carries the baked schedule. Every event has `approximate: true`. The debrief and `act` show the `approximate` tag.

---

**D-032 — agent · 2026-11-08**
**Choice:** Module catalogue lives in `sim/modules.ts`, not `features/base/model.ts`.
**Why:** `act` needs module effects and cannot import `base` (R-5). Same reasoning as D-029 (regions table in `sim/`).
**Rejected:** Duplicating the catalogue in `act` (drift risk, two sources of truth).
**Consequence:** `sim/modules.ts` owns `ModuleKind`, `ModuleSpec`, `MODULE_CATALOGUE`, `canBuild`, `buildCost`, `upkeepFor`. `features/base/model.ts` becomes a thin re-export plus presentation helpers.

---

**D-031 — agent · 2026-11-08**
**Choice:** The loop is `base ⇄ act → debrief`. `act` stays a simulation runner; the player returns to `base` between sols to build.
**Why:** Keeps D-018 (no plan phase) intact while still giving the player decisions between sols.
**Rejected:** A `plan/` feature (needs a recorded decision per D-018 and is not in scope).
**Consequence:** `features/act/` is the simulation runner with "Advance sol" and "Back to base". `features/base/` is the build screen reached between sols.

---

**D-030 — agent · 2026-11-08**
**Choice:** Sols are turn-based: one button press resolves one sol.
**Why:** Unblocks `sim/sol.ts` and `act`. Real-time needs a fake clock and a ticker.
**Rejected:** Real-time (more code, flakier tests, no time before the demo).
**Consequence:** `advanceSol` runs on a button press in `act`. No clock abstraction, no ticker in `dom/`.

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
