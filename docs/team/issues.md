# Issues

Every known problem, logged **before** it is fixed. An issue gets an id the moment it
is noticed, even if it is fixed in the same breath. If you fixed something without an
id, the history is now wrong — add the id retroactively rather than skipping it.

Status values: `open`, `fixed` (with the commit), `accepted` (won't fix, on purpose),
`blocked` (waiting on someone outside the code).

## Triage

| id | title | severity | owner | status | fix-in |
| --- | --- | --- | --- | --- | --- |
| ISS-095 | The build check looked for the supply cards in the panel, and the cards moved to the setup window | low | agent | fixed | this branch |
| ISS-094 | The encyclopedia was one click away before the player had an outpost | medium | agent | fixed | this branch |
| ISS-093 | The mini game merged with the desk sheet, and stayed there after it closed | medium | agent | fixed | this branch |
| ISS-092 | The landing-site map left a blank band above and below the picture | low | agent | fixed | this branch |
| ISS-091 | "NASA data" before a region was chosen opened a dialog with no way out | high | agent | fixed | this branch |
| ISS-090 | The guide was rebuilt on every redraw, so the page a child was reading was thrown back to the first | medium | agent | fixed | this branch |
| ISS-089 | The memory game compared the wrong two cards, so a matching pair was never a pair | high | agent | fixed | this branch |
| ISS-088 | The sol record kept only the net change per store, so the review could not say what a day made or used | medium | agent | fixed | this branch |
| ISS-087 | The act screen's power card put the battery capacity first ("0 / 200 kWh"), so the number read as a constant | medium | agent | fixed | this branch |
| ISS-086 | A redraw reset the scroll of the whole screen on narrow windows and zoomed browsers, because only the panel's scroll was kept | high | agent | fixed | this branch |
| ISS-085 | The ice miner could not be built at Olympus Mons, and a greenhouse without one failed the water goal at every site | high | agent | fixed | this branch |
| ISS-084 | One battery could not carry the lander's own load through a night, so power sat at 0 from sol 1 and never recovered | high | agent | fixed | this branch |
| ISS-083 | The lander's solar array and battery bank were counted, but could not carry the outpost, so they looked uncounted | high | agent | fixed | this branch |
| ISS-082 | The act screen never said why power sat at zero, so a bare outpost looked like a broken model | medium | agent | fixed | this branch |
| ISS-081 | The build screen offered "Land & start sol 1" after the outpost had landed, and pressing it wiped the run | high | agent | fixed | this branch |
| ISS-080 | The build screen rebuilt itself on every press, toast and forecast arrival, throwing the player back to the top | high | agent | fixed | this branch |
| ISS-079 | The water goal said "No water source" whenever it failed, and never named the greenhouse or the ice miner | medium | agent | fixed | this branch |
| ISS-078 | The power card saturated at battery capacity, so it read 200 kWh while the batteries were empty | high | agent | fixed | this branch |
| ISS-077 | The build card hid the lander's solar array and battery, so it read 0 of 3 while the outpost had one | medium | agent | fixed | this branch |
| ISS-076 | The sheet squashed what was inside it, so a NASA picture covered its own caption | medium | agent | fixed | this branch |
| ISS-075 | The "Real data" section showed one picture, so the game looked like it owned one NASA picture | low | agent | fixed | this branch |
| ISS-074 | The journey check never found the naming screen, so it could not fail and could not pass | medium | agent | fixed | this branch |
| ISS-073 | The panel said "Sol 0 of 12" on the first day, while the button under it said "Run sol 1" | low | agent | fixed | this branch |
| ISS-072 | The encyclopedia's "Back to outpost" always went to the build screen, even mid-run | low | agent | fixed | this branch |
| ISS-070 | The launch parts tour could only be moved through with the mouse | medium | agent | fixed | this branch |
| ISS-069 | The parts tour showed the assembled-craft picture twice, and opened with it | medium | agent | fixed | this branch |
| ISS-068 | Four different navigation bars, and only one of them was the shared one | medium | agent | fixed | this branch |
| ISS-067 | The launch parts-tour image shook forever, and launch.css held the panel twice | medium | agent | fixed | this branch |
| ISS-066 | The `drag-editor` placement WIP was unreachable, failed `tsc` and failed `check-markup`, and copies of it sat at the repo root | high | agent | fixed | c9b8904 |
| ISS-065 | Sol 3 had no tool to work at all, and the sorting tool could never earn three stars | medium | agent | fixed | this branch |
| ISS-064 | The build screen's browser check failed on a third of runs, because it assumed a desk that was always there | low | agent | fixed | this branch |
| ISS-061 | The game was unwinnable: 14 build points could not buy a night of power at any landing site | high | agent | fixed | this branch |
| ISS-060 | The power card showed the level left at dawn, so it read 0% while the game let the player spend power | high | agent | fixed | this branch |
| ISS-059 | Nothing told the player what the game was, or what to do on a sol | high | agent | fixed | this branch |
| ISS-063 | The rover was a floating button on a wall clock, outside the run | medium | agent | fixed | this branch |
| ISS-062 | Clicking a goal re-rendered the panel and threw the player back to the top | medium | agent | fixed | this branch |
| ISS-058 | The play screens carried 85 to 139 words, too much for the audience | medium | agent | fixed | this branch |
| ISS-057 | The sol recap sat below the fold, so a change was invisible | high | agent | fixed | this branch |
| ISS-056 | Building a module moved no number on the HUD, so deploying looked like it did nothing | high | agent | fixed | this branch |
| ISS-055 | The build card only explained a block while the player owned none of that module | high | agent | fixed | this branch |
| ISS-054 | The build card counted the extras while the limit counted everything | high | agent | fixed | this branch |
| ISS-052 | The game never named the five science goals it is about | medium | agent | fixed | 4199bd5 |
| ISS-051 | The ration check asked the same question every run, so the answer was always 80 | medium | agent | fixed | 9f0fabb |
| ISS-050 | `architecture.md`'s module-contract table lists exports that do not exist | medium | agent | open | — |
| ISS-049 | NASA's Astronomy Picture of the Day rejects the shared `DEMO_KEY` with a 429 | medium | agent | fixed | this branch |
| ISS-048 | The cosmetic sol headlines did not match the forecast schedule | low | agent | fixed | 816e1fb, b471ecb |
| ISS-047 | The supply screen ignored the Enter key until NEXT had been clicked with a mouse | medium | agent | fixed | this branch |
| ISS-053 | Four `sim/` modules have no test files, and AGENTS.md's test counts are wrong | medium | agent | open | `sim/run.test.ts`, `sim/forecast.test.ts` added |
| ISS-043 | Space weather had one live source, so a DONKI outage silently replaced every run's flares with baked history | high | agent | fixed | this branch |
| ISS-046 | The header advertised "Mission Control / Main Menu" as text, and naming's Back to Main Menu navigated to itself | medium | agent | fixed | d90e838 |
| ISS-045 | The page title said "Under Construction" and the description called the built game a placeholder | low | agent | fixed | 559c0d6 |
| ISS-044 | The briefing said three crewmates while `CREW_SIZE` is 4, so the ration maths contradicted the story | low | agent | fixed | 02403e7 |
| ISS-042 | `AGENTS.md`, `src/data/README.md` and `architecture.md` describe `data/` as a stub and `sim/events.ts` as real | medium | agent | fixed | this branch |
| ISS-040 | `landing-site` commits the region but never sets region-dependent starting stores | medium | agent | fixed | this branch |
| ISS-041 | Launch parts tour controls are clipped off-screen, so the journey cannot pass `launch` | high | agent | fixed | this branch |
| ISS-039 | Landing-site axis scores render no dots, so the panel shows no scores | medium | agent | fixed | this branch |
| ISS-038 | `check-markup` Rule 6 never resolves a view for most screens, so hook scoping is unenforced | medium | agent | fixed | this branch |
| ISS-037 | `check-markup` skips quoted mount keys, so `landing-site` is never validated | medium | agent | fixed | this branch |
| ISS-036 | Landing-site thumbnail layers escape the panel and cover the whole screen | high | agent | fixed | this branch |
| ISS-035 | The wrong answer gives a direction on the first attempt, which ends the thinking | low | agent | fixed | 969d1c9 |
| ISS-034 | Wrong answer reverts on a timer before the player can read the feedback | low | agent | fixed | 0f22185, 86756ae |
| ISS-033 | Parts tour video too fast to read, no way to look back | low | agent | fixed | this branch |
| ISS-032 | Launch film stutters like a slideshow on a slow connection | high | agent | fixed | 1f4c709 |
| ISS-031 | Live production served the pre-interior bundle after the merge | high | agent | fixed | 6774e22 |
| ISS-030 | Launch reel shows black and cuts or skips on a slow connection | high | agent | fixed | this branch |
| ISS-029 | Docking and tour clips are MPEG-4 Part 2; browsers will not play them | high | agent | fixed | this branch |
| ISS-028 | Docking and tour clips were never wired into the launch sequence | high | agent | fixed | this branch |
| ISS-027 | Parts segment too fast to read and the lower-third overlapped the solar panels | low | agent | fixed | this branch |
| ISS-026 | Parts renderer put two description bars on screen at once during a dissolve | low | agent | fixed | this branch |
| ISS-025 | Parts renderer mapped the four source filenames to the wrong parts | low | agent | fixed | this branch |
| ISS-023 | Docking renderer first pass showed a hard black rectangle | low | agent | fixed | this branch |
| ISS-024 | `architecture.md` file tree omits launch, briefing and supply features and their images | low | agent | fixed | this branch |
| ISS-015 | `frame.test.ts:81` fails ~40% of runs (flaky) | high | agent | fixed | adc5767 |
| ISS-017 | `START MISSION` has no destination; next scene is a stub | medium | agent | fixed | this branch |
| ISS-018 | Seven cinematic PNGs committed, 12 MB, never referenced | medium | agent | fixed | this branch |
| ISS-019 | Cinematics mix three visual styles | low | unassigned | open | — |
| ISS-020 | NASA insignia appears on children's suits and props | low | unassigned | open | — |
| ISS-001 | README claims no installable build exists | high | agent | fixed | this branch |
| ISS-006 | `.gitignore` omits `.env*`, leaking API keys | high | agent | fixed | this branch |
| ISS-008 | DONKI CORS and reachability unverified | high | agent | fixed | this branch |
| ISS-002 | Starfield layers drift out and never refill | medium | unassigned | open | — |
| ISS-005 | Mixed CRLF/LF line endings, no `.gitattributes` | medium | unassigned | open | — |
| ISS-007 | Google Fonts CDN defeats the offline `dist/` goal | medium | unassigned | open | — |
| ISS-009 | `DEMO_KEY` is shared and rate-limited | medium | unassigned | open | — |
| ISS-011 | All three DOM modules have zero test coverage | medium | unassigned | open | — |
| ISS-003 | `message.css` comment contradicts itself | low | agent | fixed | this branch |
| ISS-004 | `package.json` has no `license` field | low | agent | fixed | this branch |
| ISS-010 | `src/core/` held DOM modules - name did not match | low | unassigned | fixed | this branch |
| ISS-016 | Feature-role classifier produced false positives | low | agent | fixed | this branch |
| ISS-012 | No CI; nothing runs checks on push | low | agent | fixed | adc5767 |
| ISS-013 | Vitest runs node-env, no jsdom, so DOM is untestable | low | unassigned | open | — |
| ISS-014 | `base.css` calls the page non-interactive while draggable | low | agent | fixed | this branch |

---

## ISS-095 - The build check looked for the supply cards in the panel, and the cards moved to the setup window

- **Reported by:** the agent, 2026-11-12, while moving the supply list into the landing
  window (D-081).
- **Where:** `tools/browser-check-build.mjs` — the card steps read `#base .gl__card`, and the
  scroll step read the panel's `#base .gl__scroll`.
- **Problem:** the check pinned *where* the supply list was drawn, not what it did. When the
  list moved into the setup window, the check would have gone on reading a panel that no
  longer had cards in it — and it would have reported "every card shows a count and a limit"
  against an empty list rather than failing loudly.
- **Cause:** the check asked for the cards by their old home. The card behaviour it was
  really pinning — the count against the limit, the lander's copy, the dead "+" and its
  reason, the panel keeping its place on a press — is about the cards, not about the panel.
- **Fix:** the card steps now read `body .setup__backdrop .gl__card`, the scroll step watches
  the window's own scroller (`setup__body`), and the guide is checked first, because the
  window waits for it. The check still asserts all of the same behaviour, and it now asserts
  that the panel behind the window has no supply cards at all.
- **Pre-existing:** no; it was caused by this change and found by running the check.

## ISS-094 - The encyclopedia was one click away before the player had an outpost

- **Reported by:** the owner, 2026-11-12: *"allow encyclopedia only after when player
  reached base page and not before."*
- **Where:** `src/ui/gameLoop.ts` — `gameHeader`, the `showEncyclopedia` option, and
  `src/features/landing-site/view.ts`.
- **Problem:** the book sat in the header of every screen that had the bar, the landing-site
  map included. Before choosing a site or building anything, a player could open a
  reference to every module in the game and, from it, leave the journey altogether — the
  reference arrived before the thing it explains, and it read as a promise that the game
  had started when it had not.
- **Cause:** the option defaulted to *showing* and only the encyclopedia passed `false`.
  That was correct when the bar was written, because only `base`, `act` and `debrief` drew
  it. Then the hub pass (D-070) gave `landing-site` the same bar for a byte-identical
  header, and the book came with it — nobody had to choose it, so nobody noticed it.
- **Fix:** the book is opt-in. `gameHeader` draws it only when `showEncyclopedia` is true,
  and the three screens with a landed run ask with the new pure `hasReachedOutpost(run)`
  (`sim/run.ts`), which also keeps `base`'s no-run fallback from showing it. The browser
  check asserts the map has no book and the build screen has one.
- **Pre-existing:** yes; it arrived with the shared bar and was found by the owner while
  reviewing the screens before the freeze.

## ISS-092 - The landing-site map left a blank band above and below the picture

- **Reported by:** the owner, 2026-11-12: *"the map image is not filling up the full space.
  can see blank space above and below."*
- **Where:** `src/features/landing-site/landing-site.css` - `.landing-site__stage`.
- **Problem:** the map sat in the middle of the screen with strips of empty background above
  and below it, so a screen built around one picture had a picture that did not fill it.
- **Cause:** the stage carried `aspect-ratio: 16 / 9` and `align-self: center`. It shares
  its row with the Site Analysis panel, so it is width-constrained: at 16:9 its height comes
  up short of the space the screen gives it, and centring split the shortfall into a band at
  the top and a band at the bottom.
- **Fix:** the stage fills its grid cell. The map already drew with `object-fit: cover`, so
  it crops to the cell rather than being letterboxed inside it, and the pins stay on their
  features because they are placed in stage percentages rather than at pixel offsets.

## ISS-091 - "NASA data" before a region was chosen opened a dialog with no way out

- **Reported by:** the owner, 2026-11-12: *"when not selected any landing site clicking nasa
  data opens this but doesn't have any close button so gets stuck."*
- **Where:** `src/features/landing-site/view.ts` - `buildNasaDataModal()`.
- **Problem:** with no region chosen, the NASA dialog showed "No NASA data available for
  this region." and nothing else: no ✕, no backdrop dismiss, no key handler. The only way
  past it was a page reload.
- **Cause:** the empty state was a branch of its own, building a paragraph and returning, so
  the close button and the backdrop handler - both written in the other branch - never
  existed. The opener also focused `.landing-site__nasa-modal-close` unconditionally, which
  threw on the element that was not there.
- **Fix:** one modal for both states. The ✕, its handler and the backdrop dismiss are wired
  before the branch, and the body is either the message or the card. The opener focuses a
  button that now always exists.

## ISS-093 - The mini game merged with the desk sheet, and stayed there after it closed

- **Reported by:** the player, 2026-11-12: *"when opening a mini game from daily task it's
  getting merged with view desk. then opening view desk is also showing the mini game
  under desk content. it should not get merged with desk."*
- **Where:** `src/features/act/view.ts` — the "inspect" button in `orderList`, and
  `deskBody`.
- **Problem:** two symptoms, one cause. Opening a mini game from **Today's tasks**
  **replaced** the tasks sheet with the **desk** sheet, and the tool was rendered inside
  the desk sheet, under the desk's own content. And because `openTool` was cleared in
  exactly one place — the second press of the tool's Finish button — closing the sheet
  any other way (the ✕, Escape, the guide) left it set, so **the next time the desk sheet
  opened, the mini game was there again**, under the desk content.
- **Cause:** the hub refactor (D-070) moved the act screen's sections into sheets but
  left the mini game where it had always been — part of the desk. The "inspect" button
  was made to reach it by switching the player to the desk sheet, which worked and merged
  two unrelated things in the same breath: a tool belongs to an *order*, and the desk is
  the note from home and the rover's find.
- **Fix:** the mini game opens in **its own sheet**, over the sheet it came from, and
  closes with it. The desk sheet no longer contains the tool in any form, and the tool
  cannot outlive its section: closing the section, or opening the guide, closes the tool
  too (D-079). The stacking ladder gains a rung for it — 108, the tool sheet over the
  section sheet at 105.
- **Pre-existing:** yes; it arrived with the hub in D-070 and was found by the player on
  the first day of playing it.

## ISS-090 — The guide was rebuilt on every redraw, so the page a child was reading was thrown back to the first

- **Reported by:** agent, 2026-11-12, while driving the new how-to-play popup in a headless
  browser and watching it go back to page one.
- **Where:** `src/features/base/view.ts` and `src/features/act/view.ts` (the `guidePanel` call inside
  `render()`), and `src/ui/guide.ts`.
- **Problem:** both screens rebuild their whole DOM on every `render()`, and the guide was created
  inside that render. The build screen redraws when the **live space weather** arrives — about two
  seconds after the screen opens — and the desk redraws on its own clock and on every sol. So a
  child who had pressed Next twice and was reading page three was **thrown back to page one** by a
  network request they never asked for, and the popup's entrance animation played again over the
  top of them.
- **Cause:** the guide was a single scrolling list, so being rebuilt was invisible: the words were
  all on screen either way and the animation was a fade nobody could catch. **Paging turned a
  harmless rebuild into a fault** — the page number is state, and the state was being thrown away
  with the DOM.
- **Fix:** the popup is mounted on `document.body` instead of inside the screen, and both screens
  keep a `guideEl` that is created once and removed when the guide is closed or the screen is
  unmounted. A redraw behind it changes nothing: the page stays, the voice stops and the entrance
  does not repeat. Verified in a headless browser — the page held at three through a redraw.
- **Pre-existing:** yes, the rebuild was always there. It only became visible when the guide
  started remembering which page it was on.

---

## ISS-076 — The sheet squashed what was inside it, so a NASA picture covered its own caption
## ISS-089 - The memory game compared the wrong two cards, so a matching pair was never a pair

- **Reported by:** the owner, 2026-11-12, playing the training on the local host. The
  screenshot showed two **identical** cards turned over and the score still reading
  `Pairs: 0/6`.
- **Where:** `src/sim/trainingMemory.ts` (the deal) and `src/ui/trainingMemory.ts` (the
  comparison).
- **Problem:** the cards were numbered **before** the deck was shuffled, so a card's
  number was not the place it sat in the deck. The screen turned a card over by its
  number and then compared `deck[number]` — which was a **different card entirely** — so
  the game asked "are these two cards the same?" about two cards the player had never
  touched. Two identical cards were almost never seen as a pair, and a pair that was
  not a pair was sometimes taken off the table instead.
- **Why nothing caught it:** the browser check only asked whether *a* pair came off the
  table, and with the wrong comparison a pair came off the table roughly one time in
  six — so the check passed, and the game was broken. The unit tests checked that the
  numbers were **unique**; nothing checked that a number was its card's **place**.
- **Fix:** the deck is shuffled first and the numbers are handed out afterwards, so a
  card's number is the place it sits in the deck. The rule itself moved into
  `sim/trainingMemory.ts` as `memoryMatch(deck, first, second)`, where a test can hold
  it: the deck pairs up into exactly its six real pairs, and no card is in two of them.
  The browser check now reads the face of both cards of the pair the game takes away
  and asserts they are **the same face** — the check that would have failed.
- **Status:** fixed.

---

## ISS-082 - The act screen never said why power sat at zero, so a bare outpost looked like a broken model

- **Reported by:** user, 2026-11-11: "power sometimes drops to 0% right after Day 1. It doesn't
  regenerate afterward either."
- **Where:** `src/features/act/model.ts`, `src/features/act/view.ts`.
- **Problem:** with the lander's one array and one battery the outpost needs 180 kWh to get
  through a night and stores 100, so every sol ended with the batteries at zero. The screen
  never said why: the sol's blackout and its generated-versus-used figures lived in the review
  ledger, behind a tile the player had no reason to open.
- **Cause:** the power model is right (ISS-061's balance is unchanged) and the reporting was
  thin. A number that stays at zero with no explanation is indistinguishable from a bug.
- **Fix:** the stats panel carries the last sol's power line - the blackout percentage when
  there was one, the generated/used pair otherwise - so the day after sol 1 says what happened.
- **Pre-existing:** yes, since the sol loop was built.

---

## ISS-081 - The build screen offered "Land & start sol 1" after the outpost had landed, and pressing it wiped the run

- **Reported by:** user, 2026-11-11, as part of "the #/base page keeps refreshing or behaving
  as if it's reloading".
- **Where:** `src/features/base/view.ts`.
- **Problem:** `#/base` can be reached again after the outpost has landed. The footer still said
  "Land & start sol 1", and pressing it called `startOutpost`, which resets the sol, the stores,
  the science and the log. A player who went back to look at the build lost the run with no
  warning.
- **Cause:** the screen assumed it was only ever reached before the landing.
- **Fix:** when a run has already landed the button reads "Land again from sol 1" and the note
  under it says the run resets. No confirmation dialog: `confirm` is banned (R-9).
- **Pre-existing:** yes.

---

## ISS-080 - The build screen rebuilt itself on every press, toast and forecast arrival, throwing the player back to the top

- **Reported by:** user, 2026-11-11: "the #/base page keeps refreshing... automatically
  scrolling back to the top. This also happens after clicking certain elements."
- **Where:** `src/features/base/view.ts` (`render`), `src/features/act/view.ts` (`render`).
- **Problem:** every `render()` ended in `mount.replaceChildren(screen)`, which destroys
  `.gl__scroll` - the only scroll container - so the panel returned to the top. That ran on
  every `+`/`-` press, four seconds later when the toast timer fired, and again when the live
  space-weather request landed. The act screen had the same rebuild and only preserved the
  sheet's scroll, not the panel's.
- **Cause:** the screen is drawn as one big tree and state changes are handled by drawing it
  again. Correct output, wrong interaction.
- **Fix:** `render()` records the scroll position and the focused control before replacing the
  tree and restores both afterwards; the toast timer clears the toast node instead of
  re-rendering. Same treatment on `act`. The same class as ISS-062, which was only fixed on the
  screen it was reported against.
- **Pre-existing:** yes.

---

## ISS-079 - The water goal said "No water source" whenever it failed, and never named the greenhouse or the ice miner

- **Reported by:** user, 2026-11-11: "adding a greenhouse suggests that I need a water source,
  but the water source doesn't count directly unless I have an Ice Miner. Also, in some
  locations, I'm unable to select the Ice Miner at all."
- **Where:** `src/features/base/model.ts` (`goalPreview`), `src/sim/modules.ts` (`siteAllows`).
- **Problem:** the water goal's `why` was the fixed string "No water source". A greenhouse
  drinks 3% of a tank a sol and only the ice miner refills it, so adding one turned the goal
  from a tick to that sentence - which named neither the module that caused it nor the one that
  would fix it. At Olympus the ice miner is unobtainable (water 2, the gate is 3) and nothing
  connected the dead `+` to the failing goal.
- **Cause:** one sentence for five different situations.
- **Fix:** the goal computes its sentence from the build and the site: a greenhouse without a
  miner names both, a site with no ice says so, and everything else quotes the sols left. The
  site rule moved into `sim/modules.ts` as `siteAllows`, so the card and the goal cannot
  disagree again.
- **Pre-existing:** yes.

---

## ISS-078 - The power card saturated at battery capacity, so it read 200 kWh while the batteries were empty

- **Reported by:** user, 2026-11-11: "the power value displayed at the top... is always fixed at
  200 kWh. It doesn't update even when the actual power decreases."
- **Where:** `src/features/act/model.ts` (`powerToday`), `src/features/act/view.ts` (`hudFor`).
- **Problem:** the card showed `available`, a projection capped at `capacity`. On any calm sol
  the panels refill the bank past capacity, so the number was the capacity - a constant - and
  its bar was 100%. The true level was computed in `meterRows` and shown only inside the stats
  sheet, so the two readings of the same store disagreed.
- **Cause:** the fix for ISS-060 replaced the level with the projection rather than adding it.
  The projection is what the activity prices come out of and belongs on the screen, but it is
  not what is in the batteries.
- **Fix:** the HUD card shows stored kWh against capacity, with the meter's percentage; the
  projection stays on the "For today" mini card, worded as a maximum. `powerToday` also subtracts
  the chosen activity's draw, which it had ignored, so the projection matches the sol step.
- **Pre-existing:** yes, since ISS-060.

---

## ISS-077 - The build card hid the lander's solar array and battery, so it read 0 of 3 while the outpost had one

- **Reported by:** user, 2026-11-11: "it already shows that I have one battery and one solar
  array, but the game logic doesn't count them unless I purchase additional ones."
- **Where:** `src/features/base/model.ts` (`buildCards`), `src/features/base/view.ts`.
- **Problem:** the card drew `have / limit` - the extras the player added over the extras they
  may add - so a solar array read `0 / 3` while the outpost had one. `total` was computed and
  never drawn. The maths counted everything; the card denied it.
- **Cause:** ISS-054 fixed a genuine limit mismatch by making both numbers count extras, which
  left the lander's free copy represented nowhere on the card.
- **Fix:** the stepper draws `total / maxCount` (`1 / 4`) and marks the copy that came with the
  lander. `have` still drives `-`, so the lander's copy still cannot be removed.
- **Pre-existing:** yes, since ISS-054.

---

## ISS-076 - The sheet squashed what was inside it, so a NASA picture covered its own caption

- **Reported by:** agent, 2026-11-11, while measuring the new real-data sheet in a headless
  browser (ISS-075).
- **Where:** `src/ui/sheet.css` (`.sheet__body`).
- **Problem:** `.sheet__body` is a flex column with a bounded height and `overflow-y: auto`,
  but its children kept the default `flex-shrink: 1`. A child taller than the space left
  was therefore **squeezed rather than overflowing**: the two NASA cards measured 154 px
  tall while their contents were 522 px and 540 px. The pictures had `aspect-ratio: 16/9`
  and `width: 100%`, so they did not shrink — they **poured over their own card**, and the
  caption, the "Did you know?" line and the credit underneath were clipped away. The sheet
  looked like two photographs with no words at all.
- **Cause:** the sheet was built for the short sections (a list of work orders, a board of
  rules), and a flex column that scrolls needs its children told not to shrink. Nothing
  said so, and the short sections were unaffected, so the bug waited for the first sheet
  with a picture in it.
- **Fix:** `.sheet__body > *` gets `flex: 0 0 auto`, so a child keeps its natural height
  and the body scrolls — which is what a scrolling body is for.
- **Pre-existing:** yes; it arrived with the sheet in D-070.

---

## ISS-075 — The "Real data" section showed one picture, so the game looked like it owned one NASA picture

- **Reported by:** the player, 2026-11-11, on the act screen's new hub: *"it's only showing
  the picture now of real nasa data. but it used to show many more data."*
- **Where:** `src/features/act/view.ts` (`dataBody`), behind the hub's "Real data" tile
  (D-070).
- **Problem:** the section was called *Real data* and held one NASA card — the live daily
  picture, or the saved card for the sol when NASA's feed did not answer. The game owns far
  more real data than that: **a NASA photograph of the landing region the player actually
  chose** (`REGION_CARDS`, five of them, shown once on the landing screen and never again),
  **NASA's own space-weather readings** (the flare class and the day it peaked), and
  **forty tagged facts**. A child who opened the button named after real data found one
  picture, and the rest of the NASA layer was invisible from the screen that runs the day.
- **Cause:** the hub was built from the old panel's sections, and the old panel had one
  NASA block at the bottom of a long scroll. Moving it into a sheet kept it as it was —
  a picture and a note — without asking what "real data" should mean on a screen that now
  has a button with that name.
- **Fix:** the sheet is now the whole NASA layer (D-071): NASA's live daily picture, the
  saved card for the sol, **the landing region's own photograph**, **the live flare
  readings with the source they came from**, and two NASA facts to take away. The tile's
  line of state counts what is behind it ("3 pictures · 5 live flares"), and
  `dom/forecastLoader.ts` carries the raw readings out instead of throwing them away.
- **Pre-existing:** no; the section was thin from the moment D-070 landed, and the player
  found it on the first day.

---

## ISS-074 — The journey check never found the naming screen, so it could not fail and could not pass

- **Reported by:** agent, 2026-11-11, while re-running the browser checks after the act
  screen's hub (D-070).
- **Where:** `tools/browser-check-journey.mjs` (the `Page.navigate` URL).
- **Problem:** the check asked for `http://127.0.0.1:5173/#naming`. Vite's dev server binds
  the **IPv6** loopback by default, so the IPv4 address answers nothing: every step printed
  `none` — *1 naming → none, 2 briefing → none, … 7 base → none* — and the check ended
  with `ERRORS: none`, because a page that never loaded raises no console error. The check
  had been reporting the same thing on `origin/main` for days, and it was read as a game
  problem rather than as a broken check.
- **Cause:** the address was written once, by hand, with the IPv4 loopback in it. Nothing
  checked that the dev server was actually listening there, and the check has no
  assertions — it prints what it sees — so a page that never loaded looked the same as a
  page that loaded and went wrong.
- **Fix:** the check asks for `http://localhost:5173`, which is what Vite prints. The whole
  journey now runs: naming → briefing → supply → launch → interior → landing-site → base,
  with no console errors.
- **Pre-existing:** yes; the address dates from the check's first version.

---

## ISS-073 — The panel said "Sol 0 of 12" on the first day, while the button under it said "Run sol 1"

- **Reported by:** agent, 2026-11-11, while moving the sol count from the removed mission
  bar to the panel's own head.
- **Where:** `src/features/act/view.ts` (`hubPanel`'s `kicker`), formerly the act mission
  bar's `progress` line.
- **Problem:** `RunState.sol` counts the sols **completed**, so before the first press it is
  0. The kicker printed it raw, so the first screen of the game said "Sol 0 of 12" while
  the button directly under it said "Run sol 1". A child reading both is told the day is
  day zero, and the game has no sol zero.
- **Cause:** the number was printed as state rather than as the day being played. It sat in
  the mission bar where it was one of several facts and nobody read it closely; making it
  the panel's own line put it next to the button and made the contradiction plain.
- **Fix:** the kicker is `Sol ${state.sol + 1} of ${WIN_SOL}`, the same day the button names.
  The sheet header uses the same expression, so a section opened over the desk cannot
  disagree with the desk.
- **Pre-existing:** yes; the off-by-one arrived with the mission bar.

---

## ISS-072 — The encyclopedia's "Back to outpost" always went to the build screen, even mid-run

- **Reported by:** agent, 2026-11-11, while adding the encyclopedia to the header of every
  game screen.
- **Where:** `src/features/encyclopedia/view.ts` (line 34, `navigate('base')`).
- **Problem:** the button said "Back to outpost" and went to `base`, the build screen. Once
  the outpost is built that is the wrong screen: the player is on `act`, running sols, and
  pressing Back threw them out of the day and onto a screen that rebuilds the outpost. The
  run was not lost — `base` reads the same `RunState` — but the player was put in front of a
  build screen in the middle of a mission, with no explanation and no way to tell it was
  not a fresh start.
- **Cause:** `base` was the only screen that linked to the encyclopedia when the screen was
  built, so "back" was hard-coded to the one place it was reachable from. The encyclopedia
  then became reachable from every game screen's header, and the button did not follow.
- **Fix:** the back button goes to whichever screen the player came from: `act` once the
  outpost stands (`run.modules.length > 0`), `base` before that. The encyclopedia also
  passes `showEncyclopedia: false`, so the header does not offer a book that links to the
  page it is already on.
- **Pre-existing:** yes; the hard-coded target arrived with the screen.

---

## ISS-070 — The launch parts tour could only be moved through with the mouse

- **Reported by:** the owner, 2026-11-11: "if i press enter it should work and at the
  end when the assembled craft is done showing if then i press enter it should work
  in the continue part".
- **Where:** `src/features/launch/view.ts`, `src/features/launch/model.ts`,
  `src/dom/keys.ts` (new), `src/features/supply/model.ts`, `src/features/supply/view.ts`.
- **Problem:** the parts tour had three buttons and no keyboard. A player using a
  keyboard had to tab to the buttons and press Space, while the ration check
  answered Enter (ISS-047). The rules for answering Enter - a plain Enter, and not
  when a focused button already deals with it - lived in the ration check's own
  model, and the launch screen could not have them: a feature never imports
  another feature (R-5).
- **Fix:** the parts tour now answers Enter the same way the ration check does.
  While there are parts left it moves to the next one; on the last slide - the
  assembled craft - there is nothing left to look at, so the same key carries the
  player out of the tour, which is what CONTINUE does and why CONTINUE is the
  orange button there. The cinematic still has no skip: the key is only answered
  once the tour is open.
  The two rules moved to `src/dom/keys.ts` so there is one copy of them rather
  than one per screen, and their tests moved with them to `src/dom/keys.test.ts`.
  `launch/model.ts` gained `tourActionFor(index)`, the pure decision of what Enter
  does on a slide, so it can be tested without a browser.
- **Pre-existing:** yes. The ration check answered Enter; nothing else did.

---

## ISS-069 — The parts tour showed the assembled-craft picture twice, and opened with it

- **Reported by:** the owner, 2026-11-11: "this image should be shown to the last
  part, why it is showing twice? remove it from the first part".
- **Where:** `src/features/launch/model.ts` (`PARTS`), `src/features/launch/view.ts`
  (`onNext`, `onPrev`, `renderPart`), `src/features/launch/model.test.ts`.
- **Problem:** the assembled-craft picture was on screen twice in every run of the
  tour. It opened the tour — it was `PARTS[0]` — and the tour then **wrapped**: NEXT
  on the last slide set the index back to 0 and set a `partsLooped` flag, which
  greyed NEXT out and handed the orange accent to CONTINUE. So the player was
  shown the whole spacecraft once at the start, again at the end, and the four
  parts it names in between — and the picture that names all four parts was the
  one shown before the player had seen any of them.
- **Cause:** the wrap was a loop, not a journey. It was added so that a player who
  had reached the end could look back one last time, but PREV already does that,
  and the cost was a repeat of the opening slide.
- **Fix:** the tour is now a straight walk. `PARTS` is ordered one part at a time —
  propulsion, habitat, logistics, Orion — with the assembled craft LAST, and NEXT
  on the last slide is greyed out rather than wrapping round to the first. The
  `partsLooped` flag is gone. CONTINUE takes the orange accent on the last slide,
  which is where the tour ends, and stepping back with PREV hands the accent back
  to NEXT. The assembled-craft picture is shown exactly once, and it is the payoff
  of the tour rather than its introduction.
- **Tests:** `model.test.ts` asserted the old order ("overview then one part at a
  time"), so it was updated to the new one and a second test was added: the
  assembled craft appears once, and last.
- **Pre-existing:** yes. The wrap arrived with the interactive parts panel
  (ISS-033).

---

## ISS-068 — Four different navigation bars, and only one of them was the shared one

- **Reported by:** the owner, 2026-11-11, asking for one navigation bar on
  `#/landing-site`, `#/base`, `#/act` and `#/debrief`, and none on the entry screens,
  with the shared bar supplied as the reference design.
- **Where:** `index.html` (`.naming__header`, `.briefing__header`,
  `.landing-site__header`), `src/ui/gameLoop.ts` (`gameHeader`),
  `src/styles/game-loop.css`, `src/features/naming/naming.css`,
  `src/features/briefing/briefing.css`, `src/features/landing-site/landing-site.css`,
  `src/features/landing-site/view.ts`.
- **Problem:** the app shipped four separate header implementations. Measured at
  1600x900: `naming` drew a 32 px floating bar inset 31 px with a 4 px radius;
  `briefing` drew a 50 px floating bar inset 20 px; `landing-site` drew a 60 px
  full-bleed bar of its own; and `base`/`act`/`debrief` used the shared `.gl__header`
  from `ui/gameLoop.ts` (87 px, scaling with the viewport, with the working Menu
  control). Only the last one matched the design the team had settled on, and the
  other three were the ones a visitor sees first. `landing-site` was the only one of
  the four game-loop pages not using the shared bar.
- **Cause:** every screen was built in its own pass, and the header was written into
  the markup each time rather than drawn from the shared shell. The `gameHeader()`
  helper arrived later, with the game-loop frames, and the earlier screens were never
  moved onto it.
- **Fix:** the shared `.gl__header` is now the only navigation bar in the app.
  `landing-site` draws it through `gameHeader()` at mount and removes it on teardown;
  `base`, `act` and `debrief` already did, through `gameScreen()`. The three bespoke
  headers were removed from `index.html` and their CSS deleted. The entry screens
  (`naming`, `briefing`) lost their bars entirely, as asked. The `--gl-*` design
  tokens moved from `.gl` to `:root`, so the shared header resolves on a screen that
  is not inside `.gl`.
- **Note:** `encyclopedia` (added to `main` by PR #26) already drew the shared bar
  through `gameScreen()`. It was left as it is: it is an in-flight screen reached from
  the outpost, the same category as the four, and it is not a bar this change added.
- **Pre-existing:** yes. The fourth header arrived with `landing-site` (TASK-028).

---

## ISS-067 — The launch parts-tour image shook forever, and `launch.css` held the panel twice

- **Reported by:** the owner, 2026-11-11: "the main image on the launch page is
  currently shaking or moving undesirably".
- **Where:** `src/features/launch/launch.css` (`.launch__parts-image`,
  `@keyframes launch-parts-shake`).
- **Problem:** the parts-tour image — the one the Prev / Next / Continue buttons sit
  under — carried `animation: launch-parts-shake 0.3s ease-in-out infinite`, an
  endless wobble of plus or minus 1 px and plus or minus 0.15 degrees. It never
  stopped, and there was no reason for it to be there. Confirmed at runtime with
  `getComputedStyle(image).animationName === 'launch-parts-shake'`.
  The same file also contained the **entire parts-panel block twice** — the panel,
  the card, the header, the dot, the name, the image, the description and the
  controls, from line 314 to 444 and again from 446 to 528 — which is why the shake
  rule and its reduced-motion override both appeared twice.
- **Cause:** the duplicated block was pasted in when the panel was moved out of
  `.launch__stage` (ISS-041) and the copy was never deleted. The shake itself looks
  like it was meant to suggest a hand-held camera and was left in on purpose once,
  which is exactly the kind of motion this game does not want behind a piece of text
  a child is trying to read.
- **Fix:** the shake animation, its keyframes and its reduced-motion overrides are
  gone, and the duplicated block is deleted, so the image is completely stable.
  Verified in a browser: `animation-name` is `none` and the image's bounding box is
  byte-identical across two samples 1.2 s apart, at 1600x900, 1024x768 and 390x844.
  The cinematic's slow camera push is untouched: that one is model-driven
  (`--launch-camera-from` / `--launch-camera-to`), reduced-motion aware, and is the
  shot the reel is built around.
- **Also in the parts tour, on the owner's second pass:** the artwork was a small
  card floating in the middle of a black page, and the Prev / Next / Continue row
  was cut off at the bottom of the window. The picture is now the full-bleed
  backdrop - `position: absolute; inset: 0` against the panel, `object-fit: cover`
  so it fills edge to edge - with the part name over the top of it on its own
  plate. The controls are pinned to the bottom of the viewport
  (`position: absolute; bottom: 0`) instead of riding on the card's height, so
  they are always wholly on screen. A screen narrower than 16:9 falls back to
  `object-fit: contain`, because a horizontal crop there would take the callout
  labels off the picture, and a label that names the part is the whole point of it.
- **And again, on the third pass:** with the picture full-bleed, the description
  and the NASA fact were laid out over the lower half of it - straight through the
  "LOGISTICS / SAFE HAVEN" callout - and the fact was clipped by the button bar.
  They now live in a solid dock along the bottom, with the controls, below the
  artwork. The picture is left with nothing on top of it but its own name, and the
  words are on their own ground where nothing can cover them.
- **Also in the parts tour:** NEXT is the orange button while there are slides left,
  and CONTINUE takes the orange accent the moment NEXT is greyed out - that is,
  once the player has been all the way round the five parts and there is nothing
  left to look at. There is one orange button on the row at a time, and it is
  always the one that moves the player forward: stepping back with PREV hands the
  accent back to NEXT. `view.ts` toggles a single `is-primary` class on the
  Continue button; the tour's own rules are untouched.
- **Pre-existing:** yes; the shake was in the panel from the day it was added
  (ISS-033).

---
## ISS-066 — The `drag-editor` placement WIP was unreachable, failed `tsc` and failed `check-markup`, and copies of it sat at the repo root

- **Reported by:** agent, 2026-11-11, while planning the developer placement editor.
- **Where:** `src/features/drag-editor/` (all four files), `src/ui/routes.ts`, repo root.
- **Problem:** the work-in-progress placement editor could not run at all. `view.ts` had
  eight TypeScript errors (`sprite` was not defined at line 160, `Touch` was used where
  `TouchEvent` was meant, and `h()` was given a number), so `tsc --noEmit` failed and
  `npm run check` stopped before it. `drag-editor.css` set `pointer-events: none` on the
  drag ghost, which `check-markup` Rule 8 bans in any `src/features/*/` stylesheet. The
  screen was also unreachable: `'drag-editor'` was in the `Route` union but not in
  `ALL_ROUTES`, so `parseRoute` rejected it; it was absent from `src/ui/registry.ts`; and
  `index.html` had no `#drag-editor` element. Stray copies of two of its files sat at the
  repo root (`view.ts`, `drag-editor.css`) beside `src/ui/registry.ts.bak`.
- **Cause:** the feature was started and abandoned without ever being wired to a route, so
  nothing exercised it. `npm run check` was the only thing that would have caught it, and
  it had not been run since the folder was added.
- **Fix:** deleted the folder, the three stray files and the dead `'drag-editor'` route
  (`c9b8904`). The placement editor was rebuilt as a developer tool rather than a game
  screen — it lives in `src/ui/`, needs no route, no mount point and no registry entry,
  and is compiled out of a production build, so it cannot half-exist the way this one
  did (`1cdba9f`, `ecd9d27`). `npm run check` passes again.
- **Pre-existing:** no; introduced by uncommitted work on `game-loop-ui`.

---
## ISS-043 — Space weather had one live source, so a DONKI outage silently replaced every run's flares with baked history

- **Reported by:** agent, 2026-11-09, while verifying the live NASA flare path.
- **Where:** `src/data/spaceweather.ts`, `src/dom/forecastLoader.ts`.
- **Problem:** the client had one live source (DONKI through `api.nasa.gov`). During
  verification DONKI returned `503 upstream connect error`, then `429 OVER_RATE_LIMIT` for
  the shared `DEMO_KEY`, so every run silently used two baked flares marked approximate.
  The screen still presented a "live" forecast; only the `approximate` tag gave it away.
- **Cause:** D-005/D-006 chose one source and one fallback. No second live source existed,
  so a service outage removed the feature rather than degrading it.
- **Fix:** add NOAA SWPC's GOES X-ray flare feed as a second live source, tried after NASA
  DONKI and before the baked history (D-037). `SpaceWeatherSource` gains `'noaa'`, and the
  detail sentence names the source that answered. Nine new tests cover the chain and the
  NOAA wire format; `spaceweather.test.ts` is 26 tests. An aborted request is also no longer
  cached, so a screen closed mid-fetch cannot poison the next screen's forecast.
- **Pre-existing:** yes; the gap dates from commit `e67cac6`.

---

## ISS-042 — Docs describe `data/` as a stub and `sim/events.ts` as real, but neither is true

- **Reported by:** agent, 2026-11-09, while hooking up the live data.
- **Where:** `AGENTS.md` §1/§3/§8, `src/data/README.md`, `docs/architecture.md`.
- **Problem:** the docs said `data/spaceweather.ts` was a stub that throws, that the project
  made "zero network calls", that the space-weather schedule lived in `sim/events.ts`, and
  that tuning numbers lived in `sim/constants.ts`. `sim/events.ts`, `sim/constants.ts` and
  `sim/balance.test.ts` do not exist. The client is implemented, wired into `base` and
  `act`, and the forecast lives in `sim/forecast.ts`. `src/data/README.md` also said
  "BLOCKED: do not write the DONKI client yet".
- **Cause:** `e67cac6` added the forecast, crisis and comms systems without the doc-matrix
  pass; later doc edits copied the old tree forward.
- **Fix:** rewrite the data sections, file tree and module contracts to match the code;
  point `AGENTS.md` §8 at `forecast.ts`, `crises.ts`, `comms.ts` and `dom/forecastLoader.ts`;
  correct the test count (`393`) and R-13.
- **Pre-existing:** yes.

---

## ISS-041 — Launch parts tour controls are clipped off-screen, so the journey cannot pass `launch`

- **Reported by:** the user, 2026-11-09: the launch screen's parts tour shows the
  "Assembled craft" slide, but the Prev / Next / Continue controls are not on screen, so
  the journey cannot continue past `launch`.
- **Where:** `index.html` (`.launch__parts-panel` was a child of `.launch__stage`),
  `src/features/launch/launch.css`.
- **Problem:** the parts panel was inside `.launch__stage`, which is a 16:9 letterboxed
  box (`width: min(100vw, 100vh*16/9); aspect-ratio: 16/9`). The panel inherited that
  box, and its card — part name, 16:9 image, description, controls — is taller than the
  stage on any viewport that is not 16:9 or larger. The panel's `overflow: hidden` then
  clipped the card top and bottom, removing the part name and the three buttons.
  Measured at 545x645: the panel was 307px tall, the card 590px, and hit-testing the
  Continue button's centre returned `SECTION.launch`, not the button — it was
  unclickable.
- **Fix:** move the panel out of `.launch__stage` so it is a direct child of `.launch`
  and covers the whole viewport, and cap the part image by viewport height
  (`max-height: 52vh`, tightened to `44vh` under 560px) so the card fits short windows.
- **Pre-existing:** no. Introduced with the interactive parts panel that replaced the
  parts video (ISS-033).

---

## ISS-039 — Landing-site axis scores render no dots, so the panel shows no scores

- **Reported by:** agent, 2026-11-07, while verifying the Site Analysis panel after
  ISS-036.
- **Where:** `src/features/landing-site/view.ts` (`scoreDots`), `index.html`
  (`.landing-site__axis-score`), `src/features/landing-site/landing-site.css`
  (`.landing-site__dot`).
- **Problem:** each axis row contains an empty `<span data-landing-score="…">`, and the
  stylesheet styles five-dot rows, but nothing ever created the dots. `setAxisDots`
  toggled `is-filled` on the empty container itself, so every axis showed its name and
  no score at all.
- **Cause:** the dot-construction step was missing from the view; the `data-landing-score`
  hook was treated as the dot rather than the container.
- **Fix:** build five `<span class="landing-site__dot">` children per axis on mount, set
  `--i` on each for the 60 ms stagger, and store them as arrays so `setAxisDots` toggles
  the right elements. The container gets `role="img"` and an `aria-label` of
  "N out of 5" so the score is announced, not just seen.
- **Pre-existing:** no; the screen never showed scores in a browser.

## ISS-038 — `check-markup` Rule 6 never resolves a view for most screens, so hook scoping is unenforced

- **Reported by:** agent, 2026-11-07, while diagnosing ISS-036.
- **Where:** `scripts/check-markup.mjs` (Rule 6).
- **Problem:** Rule 6 is meant to prove each screen's `data-*` hooks sit inside that
  screen's own section, not merely somewhere in `index.html`. It found the view by
  searching view files for the literal string `"#id"`. Only `interior/view.ts` contains
  such a string (in a comment), so every other screen was skipped and the rule was
  effectively dead — a hook moved into another screen's section would pass.
- **Cause:** the mount-id-to-view mapping was guessed from view contents instead of
  read from `registry.ts`, which is the file that actually performs that mapping.
- **Fix:** parse the registry's `import { mountX } from '../features/<dir>/view'` lines
  and its `SCREENS` entries to build the mapping, then scope each mounted screen's hooks
  with it. Rule 6 now checks all six screens, including `landing-site`.
- **Pre-existing:** yes; the rule has been inert since it was added.

## ISS-037 — `check-markup` skips quoted mount keys, so `landing-site` is never validated

- **Reported by:** agent, 2026-11-07, while diagnosing ISS-036.
- **Where:** `scripts/check-markup.mjs` (Rules 2, 3 and 6 — the `mounts` parse).
- **Problem:** `SCREEN_MOUNTS` in `registry.ts` uses a quoted key for `'landing-site'`
  because the route contains a hyphen, but the checker's regex only matched bare keys.
  The screen was silently excluded from every rule that iterates mounts, and
  `npm run check` printed "5 routed screen(s)" while six were mounted.
- **Cause:** the regex `^\s*\w+:\s*'#([\w-]+)',` cannot match `'landing-site':`.
- **Fix:** accept optional quotes around the key. The checker now reports six routed
  screens and validates `landing-site`'s hooks against its own section.
- **Pre-existing:** no; introduced when `landing-site` was registered.

## ISS-036 — Landing-site thumbnail layers escape the panel and cover the whole screen

- **Reported by:** the user, 2026-11-07: "the thumbnail image is not being displayed
  inside the side panel and being showed in the entire screen", and earlier "there are
  no clickable options".
- **Where:** `index.html` (`#landing-site` Site Analysis panel),
  `src/features/landing-site/landing-site.css` (`.landing-site__thumbnail`).
- **Problem:** the two thumbnail `<img>` layers had no positioned wrapper. The CSS makes
  them `position: absolute; inset: 0`, so their containing block was the nearest
  positioned ancestor — `.landing-site`, which is `position: fixed; inset: 0`. Both
  images therefore covered the full viewport. Because they follow the map stage in DOM
  order they also swallowed pointer events: the pins were visible but unclickable, and
  once a region was selected the loaded thumbnail covered the whole screen.
- **Cause:** `landing-site.css` defined `.landing-site__thumbnails` as the positioned
  container, but the markup placed the images directly in the panel. Nothing required
  the wrapper to exist, and ISS-037/ISS-038 meant `check-markup` never inspected this
  screen.
- **Fix:** wrap the two images in
  `<div class="landing-site__thumbnails" data-landing-thumbnails>`; `view.ts` now
  requires the wrapper so a future removal throws on mount; the checker fixes above make
  the screen part of `npm run check`.
- **Pre-existing:** no; the screen never worked in a real browser.

## ISS-035 — The wrong answer gives a direction on the first attempt, which ends the thinking

- **Reported by:** the user, 2026-10-22: "start showing hint after player chooses wrong once".
- **Where:** `src/features/supply/view.ts` (`showWrong`).
- **Problem:** a wrong answer put "too low, think larger" into the bubble straight away.
  On a first attempt the player is still working it out, and a direction rules options
  out rather than letting the method rule them out — so the feedback was doing the
  thinking for them, at exactly the point where the working was meant to be doing it.
- **Cause:** the hint and the correction were the same thing, with no distinction
  between "you have not got it yet" and "you are stuck and need a nudge".
- **Fix:** the first wrong answer gives no direction at all — the alarm frame comes up,
  the working shows with the answer left out, and the bubble keeps the question so it
  can be read again. From the second wrong answer on the hint appears. Recorded as
  D-028, because the wording of the hint is a product decision, not a bug fix.
- **Pre-existing:** no; the hint was given on every wrong answer as it shipped.

## ISS-034 — Wrong answer reverts on a timer before the player can read the feedback

- **Reported by:** the user, 2026-10-22: the wrong-answer scene showed "for a little bit"
  and then changed on its own; they wanted a try again button so the retry is manual.
- **Where:** `src/features/supply/view.ts` (`showWrong`), `src/features/supply/model.ts`
  (`workingSentence`).
- **Problem:** two things went wrong at once. The alarm frame was held for a fixed
  `RETRY_DELAY_MS` (1100ms) and then reverted to the question frame by a timer, so the
  wrong frame, the hint and the working were all taken off screen about a second after
  they appeared — a child who was still reading had them pulled away, and the retry
  happened whether or not they were ready. And the working in the rail ended with the
  number under test ("so 240 divided by 3 is 80 packets"), so the answer was on screen
  while they were meant to be working it out; a timed revert limited the exposure to
  about a second, but a manual retry would have left it there indefinitely.
- **Cause:** the revert was a timer rather than a control. It was a deliberate choice at
  the time — the comment said it was there "so the wrong frame registers before the
  retry" — but a delay that removes the choice is a delay the player cannot refuse.
- **Fix:** the alarm frame now stays until the player presses a TRY AGAIN button, which
  is the only live control while it is up. Pressing it takes the room back to the
  question frame, re-enables the choices that were not retired, and asks the question
  again in the bubble. The working is shown with the answer left out ("…is ___ packets.")
  while the player is still trying, and completed only once the answer has been earned.
- **Pre-existing:** no; both were in the ration check as it shipped.

## ISS-033 — Parts tour video too fast to read, no way to look back

- **Reported by:** the user, 2026-10-22
- **Where:** `src/features/launch/view.ts`, `src/features/launch/model.ts`, `index.html` (`<video data-launch-parts>`), `Assets/video/parts.mp4`
- **Problem:** the spacecraft tour is a single 12-second video with the four part names burned into the picture. It plays too fast to read, and there is no way to look back without restarting the whole reel.
- **Fix:** replace the `parts.mp4` beat with an interactive parts panel. Five slides — overview first, then one named part at a time — each showing the part image (from `Assets/images/parts/*.webp`, each with one part outlined in colour), the part name as text, and the part description as text. Prev / Next buttons move between slides, disabled at the boundaries; a Continue button hands off to the next screen. No auto-advance, no timed beat.
- **Status:** fixed. The panel is built and the five slides render the named parts; the old video beat is gone. Recorded as D-036 and TASK-051.
- **Files to change:** `src/features/launch/model.ts`, `src/features/launch/view.ts`, `src/features/launch/launch.css`, `index.html`, `src/features/launch/model.test.ts`, `docs/architecture.md`, this file.

## ISS-032 — The launch film stutters like a slideshow on a slow connection

- **Reported by:** the user, 2026-10-21: "bruh the video lags so much its like a slide show"
  after testing the live site.
- **Where:** `Assets/images/launch/launch-cinematic.mp4`, `Assets/video/docking.mp4`,
  `Assets/video/parts.mp4`, played by `src/features/launch/view.ts`.
- **Problem:** the reel was 14.1 MB of 1080p video. The launch film alone was 6.93 MB at
  11.09 Mb/s for five seconds, and the docking and tour clips were 4.56 Mb/s and 3.63 Mb/s.
  A visitor whose connection is below roughly 11 Mb/s cannot stream the launch film in real
  time; the video freezes while the audio-less frame waits for the next sample, which reads
  as a slideshow. The docking and tour files also put their `moov` atom at the end, adding a
  full-file seek before they can start. The media-driven schedule from ISS-030 correctly waits
  for a first frame, but it cannot make a clip play smoothly once the bitrate exceeds the link.
- **Cause:** the films were rendered at delivery resolution and bitrate without a web pass.
  Their quality was tuned for a desktop file, not a children's game on a school or home link.
- **Fix:** re-encoded all three at 1280x720, H.264 main, `yuv420p`, with the metadata at
  the front (`+faststart`), and dropped the unused audio track. The frame counts and
  timings are unchanged, so `VIDEO_DURATION_MS`, `DOCKING_DURATION_MS` and
  `PARTS_DURATION_MS` did not need editing. The reel is now 2.16 MB instead of 14.10 MB:
  launch 1.42 Mb/s, docking 0.76 Mb/s, tour 0.66 Mb/s. Fixed in this branch; the built
  asset names are fingerprinted, so the browser cannot reuse the old files.
- **Pre-existing:** no; this is the delivery cost of the films added for TASK-036 and TASK-037.

## ISS-031 — Live production served the pre-interior bundle after the merge

- **Reported by:** the user, 2026-10-21: after the launch portions, the live site did not enter
  the exploration rooms.
- **Where:** the Vercel production deployment behind `mars-horizon-azure.vercel.app`;
  `main` at `750bedf` and `6774e22`.
- **Problem:** the live HTML and JS were still `66a2100`. The page had no `#interior` markup and
  the bundle contained none of the room names. A protected preview for `d4163c3` existed, but
  Vercel created no Production deployment for the merge commit or for the empty retrigger
  commit. GitHub's deployment records stop at `66a2100`.
- **Cause:** Vercel's Git integration did not create a production deployment for the merge or
  the empty commit. The gated Actions workflow cannot substitute: it is manual-only, its gate
  expects a `workflow_run` payload, and the repository has no `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  or `VERCEL_PROJECT_ID` secrets.
- **Fix:** Vercel created a Production deployment for `6774e22` at 15:23 UTC after the
  retrigger. `mars-horizon-azure.vercel.app` now serves the new HTML with `#interior` and a
  bundle containing all six room names. The app code was already correct on `main`.
- **Pre-existing:** no. The interior code was correct on the branch; it had never been
  published. The delay was in Vercel, not the route.

## ISS-030 — The launch reel shows black and cuts or skips on a slow connection

- **Reported by:** the user, 2026-10-21: "the videos or and the cutsceans elements are okay but
  they put a lots of pressure on internet without good internet on live website most of the time
  its just black screen and then cuts to next part or just sipks after the time pass"
- **Where:** `src/features/launch/view.ts`, `src/features/launch/launch.css`, `index.html`
- **Problem:** three faults compound. All three `<video>` elements get a `src` at mount with
  `preload="auto"`, so ~13.8 MB is requested in parallel and a slow link is saturated before the
  first beat is due. None of the three has a `poster`, so before a frame is decoded the element is
  transparent and the CSS fade-in reveals black. And the timeline is wall-clock, not media-driven:
  the film, docking and tour timers and the hand-off all fire at fixed offsets from mount, so a
  clip that has not buffered is skipped and the screen hands off at 25.25s regardless of whether
  anything played.
- **Cause:** the reel was choreographed against `TOTAL_DURATION_MS` as though the clips were
  always ready, and the browser's buffering state was never consulted.
- **Fix:** serialise the downloads (only the launch film loads up front; the other two load when
  the previous beat starts), give every clip a poster frame, and drive the beats off the media —
  a beat starts at the later of its slot and its readiness, and each beat chains on the previous
  clip's `ended`. A clip that errors keeps its poster and advances on its nominal duration. Fixed
  in this branch.
- **Pre-existing:** no. Introduced by the launch reel itself.

## ISS-029 — The docking and tour clips are MPEG-4 Part 2, which browsers do not play

- **Reported by:** agent, 2026-10-21, checking the codec before wiring TASK-036 and
  TASK-037 into the launch sequence (ISS-028)
- **Where:** `tools/render-docking.py` and `tools/render-parts.py`, `render_video`
- **Problem:** both clips were written with OpenCV's `mp4v` fourcc, which is MPEG-4
  Part 2. Chrome, Edge and Firefox do not decode it, so the files opened in a desktop
  player and would have shown a black frame in the game. The launch film is H.264.
- **Cause:** `mp4v` is the only MP4 codec OpenCV's `VideoWriter` offers without an
  external encoder, and nothing checked the codec against the browser before the clips
  were committed.
- **Fix:** encode with PyAV (`libx264`, `yuv420p`, CRF 18, 30fps) instead of
  `cv2.VideoWriter`. PyAV is already installed and bundles FFmpeg, so there is still no
  ffmpeg binary and no runtime dependency. Fixed in this branch.
- **Pre-existing:** no. Introduced by TASK-036 and TASK-037.

## ISS-028 — The docking and spacecraft-tour clips played nowhere

- **Reported by:** the user, 2026-10-21: "the videos did not connect it was supposed to
  play automatically after the launch cinematic"
- **Where:** `src/features/launch/` (model, view, CSS) and `index.html`
- **Problem:** neither `Assets/video/docking.mp4` nor `Assets/video/parts.mp4` was
  imported by any module. The launch screen ended its film and handed off to the
  under-construction interstitial, so the two clips were only ever watched outside the
  game.
- **Cause:** they were rendered as standalone deliverables (TASK-036, TASK-037) and no
  task owned wiring them into the reel.
- **Fix:** the launch screen now plays the launch film, then the docking clip, then the
  tour, and hands off at the end of the tour. The three lengths live in
  `launch/model.ts`, and the view derives both start times from them. Fixed in this
  branch.
- **Pre-existing:** no. A missing integration, not a regression.

## ISS-027 — Parts segment was too fast to read and the text sat on the solar panels

- **Reported by:** the user after watching the first render, 2026-10-21
- **Where:** `tools/render-parts.py`, `SEGMENTS`/`BEAT_S` and `draw_description`'s bar position
- **Problem:** two faults in the same frame. Each description was on screen for less than a
  second, which is not enough to read a full sentence, and the lower-third bar started at
  0.80 of the frame while the hanging solar panels reach 0.859, so the text sat on top of
  the panels.
- **Cause:** the timeline was a hand-written absolute table tuned for a 6.6s target, and the
  bar height was chosen without measuring where the panels end.
- **Fix:** build the timeline from `BEAT_S` and derive the runtime from it (2.0s a part,
  12.0s total, 360 frames), and start the bar at 0.87 — below the measured panel extent.
  Fixed in this branch.
- **Pre-existing:** no. Introduced by TASK-037 and fixed in the same work.

## ISS-026 — Parts renderer put two description bars on screen at once during a dissolve

- **Reported by:** viewing the first keyframes, 2026-10-21, while building the parts
  segment (TASK-037)
- **Where:** `tools/render-parts.py`, `overlay_weights_for`
- **Problem:** a cross-dissolve puts both shots' lower-third bars at the same place at the
  same time, so the outgoing and incoming text overlapped into an unreadable smudge.
- **Cause:** the bars were weighted by the same blend as the images.
- **Fix:** give the text its own weights — the outgoing bar fades out over the first half
  of the dissolve and the incoming one fades in over the second, so only one is ever on
  screen.
- **Pre-existing:** no. Introduced by TASK-037 and fixed in the same work.

## ISS-025 — Parts renderer mapped the four source filenames to the wrong parts

- **Reported by:** viewing the first keyframes, 2026-10-21, while building the parts
  segment (TASK-037)
- **Where:** `tools/render-parts.py`, the `SHOT_FILES` mapping
- **Problem:** each description was paired with the wrong image. `cgy3vn…` was mapped to
  `habitat` when it is the logistics frame, `hr9plb…` to `logistics` when it is the
  propulsion frame, and `jpt6o1…` to `propulsion` when it is the habitat frame.
- **Cause:** the source filenames are opaque. The mapping was guessed from the order the
  images happened to be read in, and nothing in the filename says which part is outlined.
- **Fix:** regenerate `Assets/images/parts/` with the mapping checked against each image
  (a contact sheet of the four, read back after writing). Fixed in this branch.
- **Pre-existing:** no. Introduced by TASK-037 and fixed in the same work.
- **Note:** the correct mapping is `propulsion = hr9plb…`, `habitat = jpt6o1…`,
  `logistics = cgy3vn…`, `orion = ry0kfz…`. Worth recording because the names will not
  help the next person either.

## ISS-023 — Docking renderer first pass showed a hard black rectangle

- **Reported by:** the render itself, 2026-10-21, while building the docking clip (TASK-036)
- **Where:** `tools/render-docking.py`, the first version of `build_background`
- **Problem:** the background was rebuilt by filling the head's bounding box with pure black.
  The box was measured to be pure black (R0 G0 B1-9), but the *surrounding* space carries a
  subtle gradient, so a solid black rectangle was visible around the head in every frame.
- **Cause:** a rectangular fill does not carry the gradient the space actually has.
- **Fix:** inpaint the head's *shape* (the sprite's alpha, dilated past the glow) with
  `cv2.inpaint`, leaving the rest of the region as the original space. The sprite is placed
  exactly where the head was, so nothing is left behind. Fixed in this branch.
- **Pre-existing:** no. Introduced by TASK-036 and fixed in the same work.

## ISS-024 — `architecture.md` file tree omits launch, briefing and supply

- **Reported by:** auditing the tree while adding the docking entries, 2026-10-21
- **Where:** `docs/architecture.md`, "Annotated file tree"
- **Problem:** the tree lists `features/naming`, `landing-site`, `base`, `act` and `debrief`,
  and says "naming is BUILT; the rest are stubs". But `features/briefing`, `features/supply`
  and `features/launch` all exist and are built (`npm run check` reports four routed screens:
  naming, briefing, supply, launch). The tree also omits `Assets/images/launch/`,
  `Assets/images/naming/`, `Assets/images/supply/`, `Assets/images/Cinematics frames/`, and
  `Assets/images/launch/launch-cinematic.mp4`.
- **Cause:** the tree predates those features; the doc matrix was not followed as they landed.
- **Status:** open. Only the new docking entries were added here; the rest of the tree is left
  as-is rather than half-fixed.
- **Resolution (2026-11-10):** the tree now lists every built feature — `naming`, `briefing`,
  `supply`, `launch`, `interior`, `landing-site`, `base`, `act`, `debrief` — and the asset
  folders each one actually imports. Status: fixed.

## ISS-015 — `frame.test.ts:81` fails about 40% of runs

- **Reported by:** running the suite repeatedly during the documentation pass,
  2026-10-06
- **Where:** `src/sim/frame.test.ts` lines 74-83, the assertion on line 81. (Logged as
  `src/core/frame.test.ts`; the directory was renamed to `sim/` afterwards.)
- **Problem:** the test `produces no deformation while drifting through open space`
  fails intermittently. Measured failure rate: **8 of 20 consecutive `npm test` runs
  (40%)**. A separate 20 000-iteration probe of the same scenario failed 5 295 times
  (26.5%), with the deformed axis reaching 0.81 instead of 1.0 — i.e. 19% compression,
  the full `MAX_COMPRESSION`, still applied.
- **Measured failure:** `expected 0.9998075720934599 to be close to 1, received
  difference is 0.00019242790654006026, but expected 0.000005`.
- **Cause:** the test builds its starting state with `createAstronautFrame`, which
  calls `createInitialDrift`, which calls `Math.random()` **five times** (drift.ts
  lines 183, 185, 186, 190, 191) to pick a random launch heading, a random quadrant
  and a random position. Over 120 frames at 176 px/s the sprite covers roughly 350 px
  diagonally inside a 900x700 play area, so it frequently bounces off a wall — often
  late in the window. The test's name asserts "no deformation", but its assertions
  actually demand a settled spring to within 1e-5, which cannot be guaranteed when the
  sprite is allowed to hit something at a random moment. The two assertions also
  disagree with each other: `isDeformSettled` on line 78 tolerates 0.0015 and passes,
  while `toBeCloseTo(1, 5)` on line 81 tolerates 0.000005 and fails on the same value.
- **Pre-existing:** confirmed. `git diff main -- src/core/` (now `src/sim/`) is empty for
  `frame.test.ts`, `frame.ts`, `drift.ts` and `deform.ts`. Nothing in the failing path
  was touched by the documentation pass. This flake has been live since the file was
  written.
- **Risk:** high, and worse than the maths suggests. A suite that is red 40% of the time
  teaches six people to ignore red output. Once `npm test` is noise, ISS-011 (no DOM
  coverage) and every future regression hide inside it, and nobody can tell a real
  failure from the flake. It also blocks CI (ISS-012) — a 40% flaky job gets disabled.
- **Fix (proposed, not applied):** remove the randomness from the test rather than
  loosening the tolerance. Start from an explicit pinned `AstronautFrame` with a known
  velocity, as `afterImpact` on line 64 already does for the sibling tests, and assert
  open-space behaviour on a trajectory that provably cannot reach a wall. Widening
  `toBeCloseTo` would hide a real regression instead: if the spring ever stopped
  relaxing, a loose tolerance would let that pass. If the intent really was "any
  bounce eventually settles", then the honest test is to advance until settled and
  assert on the trajectory, not on a fixed 120 frames.
- **Verification note:** the 40% and 26.5% figures above are measured, not estimated.
  An earlier attempt to measure this reported zero failures across 30 runs; that
  result was wrong, caused by a non-ASCII `×` in a PowerShell regex being mangled into
  a different codepoint so the failure pattern never matched. Re-measured with an
  ASCII-only pattern, the failure rate is real.
- **Resolution:** replaced the randomized launch state with a known open-space trajectory.
  The test keeps its settled and scale assertions at their original tolerances; all 94
  tests passed on this branch.

## ISS-016 — Feature-role classifier produced false positives

- **Reported by:** fixture testing of the new checker, 2026-10-06, during the folder
  structure pass
- **Where:** `scripts/check-imports.mjs`, the `zoneOf` role classifier and the
  intra-feature import rule
- **Problem:** two consecutive designs for classifying a feature file as pure or
  DOM-bearing both rejected valid code. First, treating any filename that was not
  `model.ts` or `*.test.ts` as a view made `model.ts` unable to import its own
  `types.ts`. Then allowing intra-feature imports unconditionally made that same
  import look like a purity inversion instead. Three false positives in a row, each
  only visible because legitimate fixture code was run through the checker.
- **Cause:** the checker inferred role from filename, and role was doing two jobs at
  once — deciding purity, and deciding import permissions. Pure files with
  unrecognised names fall through to "view", and then a pure file cannot import them.
- **Risk:** high for a checker, because a false positive trains the team to add
  `KNOWN` entries for code that is actually correct. That is how a `KNOWN` list grows
  forever — the exact failure this project set out to avoid.
- **Fix:** split the two jobs. `PURE_BASENAMES = {model.ts, types.ts, constants.ts}`
  plus any `*.test.ts` decides purity only. Intra-feature imports are then governed by
  one rule — a pure file may not import a DOM-bearing one (`purity-inversion`) — and
  everything else inside a feature is permitted.
- **Verification:** legitimate fixture code (a model importing `sim/` and its own
  types, a view importing its model and using `document`, a colocated test) now reports
  zero violations, while five injected violations each fire with the correct
  `file:line`.
- **Consequence:** a pure file with a name outside `PURE_BASENAMES` is treated as
  DOM-bearing, so it may not be imported by that feature's `model.ts`. That is the
  conservative direction: it prompts a rename rather than silently permitting DOM into
  pure logic.

## ISS-017 — `START MISSION` has no destination; the next scene is a stub

- **Reported by:** building the naming menu, 2026-10-07
- **Where:** `src/features/naming/view.ts`, `onSubmit`
- **Problem:** pressing START MISSION validates the name, shows a greeting, and then
  says *"Your journey begins here. The next scene is still under construction."*
  It deliberately does not navigate. The route after `naming` in play order is
  `landing`, which is the placeholder page, and the intended next stop is
  `landing-site`, whose `view.ts` is a stub that throws.
- **Cause:** `landing-site` has not been built. Navigating into a throwing stub
  would take the page down in front of the player, which is worse than an honest
  message.
- **Risk:** low, and it is the safe direction — the flow is visibly incomplete
  rather than broken. It does mean the menu cannot demonstrate a completed
  journey, which matters for the Nov 14 demo.
- **Fix:** build `features/landing-site/` (TASK-028), then change `onSubmit` to
  call `navigate('landing-site')` and hand over the run state. The comment in
  `onSubmit` marks the exact spot.
- **Resolution:** `features/landing-site/` is now built (TASK-028 done), so the
  journey flows `naming → briefing → supply → launch → interior → landing-site`
  with no stub in the chain. START MISSION navigates to `nextStop('naming')`
  (`briefing`, which is built), and LAND HERE on the landing-site screen hands
  to `nextStop('landing-site')` (`landing` until `base` exists). The screen is
  reachable directly via `#/landing-site` and opens without throwing.

## ISS-018 — Seven cinematic PNGs committed, 12 MB, never referenced

- **Reported by:** measuring the repo after the cinematic frames were pushed,
  2026-10-07
- **Where:** `Assets/images/Cinematics frames/`
- **Problem:** 7 PNGs totalling **12 MB** in a repository whose entire production
  bundle is under 200 KB. They are 1670x942, photographic-style illustrations
  stored as PNG. Nothing in `src/` imports them, so Vite never bundles them —
  they are dead weight in the clone, not in the build.
- **Measured:** `near mars.png` 1.69 MB, `walk to rocket.png` 1.97 MB,
  `detach body parts.png` 1.91 MB, `light cross on earth.png` 1.95 MB,
  `press conference.png` 1.75 MB, `choose supply.png` 1.53 MB,
  `naming.png` 1.53 MB.
- **Cause:** uploaded via the GitHub web interface rather than built or optimised.
- **Risk:** slow clone for all six developers; 12 MB of history that stays in every
  clone forever even if deleted later. Not a runtime risk, since `publicDir: false`
  keeps them out of `dist/`.
- **Fix:** convert to WebP at q82 as each scene is actually built. Measured on the
  naming cutouts: 1.3 MB of PNG became 125 KB of WebP, roughly a 10x cut, with no
  visible loss. Do not delete them until the scenes exist — they are the design
  reference. Shown not to be in the build: `dist/` after the naming work contained
  no PNG over 200 KB.
- **Resolution (2026-11-10):** the scenes exist and none of the seven files is referenced by
  `src/` or `index.html` (verified with a filename search across the source tree). Every
  screen that needed art uses its own WebP or the rendered MP4s. All seven were removed with
  `git rm`; the 12 MB is still in history, so this saves future clones rather than rewriting
  the past. Status: fixed.

## ISS-019 — Cinematics mix three visual styles

- **Reported by:** viewing all seven frames, 2026-10-07
- **Where:** `Assets/images/Cinematics frames/`
- **Problem:** the seven frames are not one consistent set. Anime cel-shaded
  illustration: `walk to rocket`, `press conference`, `choose supply`, and
  `naming`. Photoreal: `detach body parts` and `near mars`. Painterly: `light cross
  on earth`. A further mismatch: `near mars.png` (the newer version, replacing the
  one committed on 2026-10-06) is photoreal where the earlier copy was not.
- **Also:** the existing `floating.png` is pixel art, so it does not match the
  cinematics either.
- **Risk:** low for correctness, high for polish. Consecutive frames in the same
  sequence will visibly change style mid-story, which reads as a mistake rather
  than a choice.
- **Fix:** decide deliberately — either restyle `near mars` and `detach body parts`
  to the anime treatment, or accept the mix and use style changes as scene breaks.
  Worth an explicit answer before the cinematic sequence is assembled.

## ISS-020 — NASA insignia appears on children's suits and props

- **Reported by:** viewing the cinematic frames, 2026-10-07
- **Where:** `walk to rocket.png`, `press conference.png`, `choose supply.png`
- **Problem:** the frames depict four child astronauts wearing suits with the NASA
  insignia on the chest and shoulder, walking past a NASA building, standing at a
  podium with a NASA banner, and sitting in Mission Control with the logo on the
  wall, on a mug and on a folder.
- **Why it matters:** the project README states the insignia is used *"only to
  identify the challenge this project responds to and to credit NASA as the source
  of the open data."* These frames depict NASA as running a fictional children's
  Mars mission, which is what the disclaimer exists to rule out.
- **Risk:** reputational rather than technical. NASA Space Apps entries commonly
  use NASA imagery, so this is not fatal. But it should be a decision taken
  deliberately, not something noticed after submission.
- **Fix:** an explicit decision from the project owner, recorded in
  `docs/team/decisions.md`. Options include keeping the insignia with the existing
  disclaimer, removing it from the children's suits specifically, or adding a
  line to the README making the fictional framing explicit.

## ISS-001 — README claims no installable build exists

- **Reported by:** repository measurement, 2026-10-06, before this documentation pass
- **Where:** `README.md` line 354, and the file tree at lines 358-368
- **Problem:** The README states *"There is no installable build or playable release at
  this time — when one is ready, this section will be replaced with setup and run
  instructions."* The tree beneath it lists only `README.md` and `Assets/README_ref/`.
- **Measured truth:** 10 TypeScript source files, 3 test suites, 79 tests passing,
  `tsc --noEmit` clean, and a successful Vite build into `dist/` (index.html, a
  fingerprinted PNG, JS and CSS bundles). `package.json` has runnable `dev` and `test`
  scripts.
- **Cause:** the README was written before the code and never updated. Nobody was
  assigned to keep it true.
- **Risk:** A judge, teacher or new teammate reads this and concludes there is nothing
  to run. It is the single most expensive kind of documentation rot, because it makes
  working work look absent. NASA Space Apps judging starts from exactly this file.
- **Fix:** Rewritten against the code on 2026-11-10. The project-status section now says the
  journey is built, gives `npm run dev` / `check` / `test` / `build` instructions, replaces
  the mock tree with the real `src/` layout, and links `docs/architecture.md`,
  `docs/game-flow.md`, `AGENTS.md` and the team records. D-011 is superseded by D-041; fixed
  in the commit that closes this row.

## ISS-006 — `.gitignore` omits `.env*`, leaking API keys

- **Reported by:** repository measurement, 2026-10-06
- **Where:** `.gitignore` (4 lines: `node_modules/`, `dist/`, `*.local`, `.DS_Store`)
- **Problem:** The `data/` layer is in scope this sprint and will read
  `import.meta.env.VITE_NASA_API_KEY` (D-006). Vite injects `VITE_`-prefixed values into
  the client bundle at build time, so the key must live in an untracked `.env.local`.
  Nothing currently stops `.env`, `.env.local`, or `.env.production` from being
  committed. `*.local` does **not** cover `.env.local` — it matches the whole name, not
  a suffix.
- **Cause:** no env file has ever existed in this repo, so the ignore rule was never
  needed.
- **Risk:** a NASA API key is committed to a **public** repository. That is an
  irreversible disclosure once pushed — git history keeps it even if the file is later
  removed. It is a shared-key revocation problem for DEMO_KEY and a personal-key
  problem for a registered key.
- **Fix:** `.gitignore` now ignores `.env` and `.env.*`, with `!.env.example` as the one
  documented exception; `.env.example` lists `VITE_NASA_API_KEY=` with no value. Checked
  with `git check-ignore`: a planted `.env` and `.env.local` are ignored, `.env.example`
  is not. Fixed on this branch.
- **Note on severity:** latent today, not live. No key exists in the repo, and the key is
  optional — the game runs on `DEMO_KEY`, then NOAA, then baked history.

## ISS-008 — DONKI CORS and reachability unverified

- **Reported by:** network probe, 2026-10-06
- **Where:** proposed `src/data/` space-weather module
- **Problem:** D-005 commits to fetching DONKI directly from the browser. I could not
  establish that this is possible. `ccmc.gsfc.nasa.gov` (DONKI's real host) resolves here
  to `169.254.198.65` — a link-local address — and TCP connect times out on both HTTPS
  and HTTP. The `donki.nasa.gov` and `api.donki.nasa.gov` hosts do not resolve at all.
  No `Access-Control-Allow-Origin` header was ever observed, because no response was
  ever received.
- **Contrast:** `api.nasa.gov` with `DEMO_KEY` returned **200** and did echo the
  request `Origin` back in `Access-Control-Allow-Origin`, so that host is confirmed
  browser-callable.
- **Cause:** unknown. Either the sandbox network cannot route to NASA's CCMC range, or
  the service is unreachable from a browser origin.
- **Risk:** if DONKI sends no CORS header, a direct browser fetch fails at runtime. The
  demo would show dead space weather in front of judges on Nov 14 with no error the team
  anticipated.
- **Result (2026-11-09):** verified from a real browser. `api.nasa.gov/DONKI/FLR` sends
  `Access-Control-Allow-Origin: *` and `content-type: application/json`, so a direct
  browser call is allowed. The DONKI service behind it was returning `503 upstream connect
  error ... connection timeout`, and repeated calls returned `429 OVER_RATE_LIMIT` for
  `DEMO_KEY`. CORS is answered; **availability** is the remaining problem (ISS-009,
  ISS-043).
- **Fix:** the client calls `api.nasa.gov/DONKI/FLR` rather than `ccmc.gsfc.nasa.gov`, and
  NOAA SWPC is the second live source when DONKI is down (D-037). Status: fixed.

## ISS-002 — Starfield layers drift out and never refill

- **Reported by:** reading `starfield.css` against `starfield.ts`, 2026-10-06
- **Where:** `src/styles/starfield.css` lines 14-39, `src/dom/starfield.ts` lines 25-62
- **Problem:** each `.star-layer` runs `layer-drift`, translating from
  `translate3d(0,0,0)` to `translate3d(0,-50%,0)` over 70s / 120s / 190s. Layers are
  `inset: -10%`, so -50% of layer height is -60% of viewport height. But
  `createStarfield` generates exactly **one** set of stars per layer — there is no
  duplicated copy scrolled alongside it. Nothing ever scrolls in from below.
- **Cause:** a parallax loop normally needs two copies of the content, or the layer
  pattern must wrap. Neither is present.
- **Risk:** the starfield visibly thins out and empties over roughly 70 seconds, on a
  page whose entire content is the starfield. High visibility, low severity.
- **Fix:** duplicate each layer's stars, or wrap the offset so it tiles. **Not done in
  this pass** (D-009) and **not verified in a browser** — the reasoning is from code
  reading only. Confirm visually before fixing; a browser check may show the stars
  staying on screen because of the `inset:-10%` bleed, which would make this a
  non-issue.

## ISS-005 — Mixed CRLF/LF line endings, no `.gitattributes`

- **Reported by:** byte-level encoding audit, 2026-10-06
- **Where:** repository-wide
- **Problem:** 17 tracked text files use CRLF; 6 use LF: `src/sim/deform.ts`,
  `src/sim/frame.ts`, `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts`,
  `src/sim/deform.test.ts`, `src/sim/frame.test.ts`. (Logged before the `core/` →
  `sim/` rename; the same six files.) There is no `.gitattributes`, so
  git has no normalisation policy and depends on each developer's `core.autocrlf`.
- **Measured:** every one of the 23 files decodes as **valid UTF-8, no BOM**. So this is
  not yet a corruption problem — it is a pending-corruption problem.
- **Cause:** files authored on different machines with different editor defaults, with
  nothing recording the intent. Confirmed mechanism: `core.autocrlf = true` in this
  clone's git config and no `.gitattributes`, so the working tree is governed by a
  per-developer setting rather than by the repository. git actively warns during normal
  operations — `warning: in the working copy of 'src/dom/pointerGrab.ts', LF will be
  replaced by CRLF the next time Git touches it` — so the drift is ongoing, not
  historical.
- **Risk:** a contributor with `core.autocrlf=true` commits one of the LF files, and the
  diff shows every line changed. Two developers with different settings produce
  unreviewable diffs and merge conflicts on files nobody edited. This is the documented
  mechanism by which a Windows editor silently rewrites a whole file.
- **Fix:** add `.gitattributes` with `* text=auto eol=lf`, then renormalise once in a
  dedicated commit. **Not done in this pass** (D-009). New files created by this
  documentation pass are LF, so they are already on the correct side of the fix.

## ISS-007 — Google Fonts CDN defeats the offline `dist/` goal

- **Reported by:** reading `index.html`, 2026-10-06
- **Where:** `index.html` lines 17-22
- **Problem:** the page unconditionally requests `fonts.googleapis.com` (two
  `preconnect` hints plus a stylesheet link) for the Orbitron display face.
  `vite.config.ts` sets `base: './'` with the stated intent that a built `dist/` opens
  straight from the filesystem with no server. `base: './'` makes module and asset URLs
  relative; it does nothing about third-party requests.
- **Cause:** the offline-friendly `base` setting was chosen deliberately; the font link
  predates or was overlooked alongside it.
- **Risk:** opening `dist/index.html` by double-click with no network renders in the
  `system-ui` fallback instead of Orbitron, which visibly changes the extruded-slab
  title treatment that `message.css` carefully builds. Three render-blocking external
  requests for one font.
- **Fix:** self-host the font under `Assets/fonts/` and import it through CSS, or accept
  the fallback and say so in the README. **Not done in this pass** (D-009).

## ISS-009 — `DEMO_KEY` is shared and rate-limited

- **Reported by:** interview, 2026-10-06 ("no idea" who owns a key)
- **Where:** proposed `src/data/` NASA module
- **Problem:** D-006 falls back to `DEMO_KEY`, which is a public shared key. I confirmed
  it returns 200 with working CORS, but I did **not** measure its rate limit and am not
  quoting a number I have not observed.
- **Cause:** nobody has registered a personal key at `api.nasa.gov`.
- **Risk:** a shared key can be throttled or revoked at any time, including during the
  Nov 14-15 demo. Six developers hitting it during testing compounds the problem.
- **Fix:** register a personal key before the demo and put it in `.env.local` (see
  ISS-006, and `.env.example` for the name). Live data no longer depends on it: NOAA SWPC
  is a second source (ISS-043, D-037).
- **Measured (2026-11-09):** `api.nasa.gov/DONKI/FLR` returned `429 OVER_RATE_LIMIT` for
  `DEMO_KEY` after a handful of calls. The limit is real and reachable in one testing
  session, so the mitigation below is not theoretical.
- **Mitigation (2026-11-09):** when the shared key is throttled the client falls through to
  NOAA SWPC, so the run still gets live flares — just from the other agency. Status stays
  open because a personal key is still the only way to guarantee NASA-sourced numbers.

## ISS-011 — All three DOM modules have zero test coverage

- **Reported by:** test-run measurement, 2026-10-06
- **Where:** `src/dom/floatAstronaut.ts`, `src/dom/pointerGrab.ts`, `src/dom/starfield.ts`
- **Problem:** all 79 tests cover only the pure mathematics. The three modules that touch
  the DOM — the rAF loop, the resize handler, the pointer grab with velocity sampling,
  and the starfield generator — have no tests.
- **Measured:** `deform.test.ts` 30 tests, `drift.test.ts` 30, `frame.test.ts` 19. Zero
  elsewhere.
- **Cause:** they need a DOM, and there is none available (ISS-013).
- **Risk:** the teardown path returned by `startFloatingAstronaut` and the velocity
  sampling in `pointerGrab` are the most likely places for a leak or a stuck grab, and
  neither is checked by anything.
- **Fix:** add `jsdom` or `happy-dom` as a devDependency and set a per-file Vitest
  environment. Then test that teardown removes every listener and that a cancel mid-drag
  resumes drift.

## ISS-003 — `message.css` comment contradicts itself

- **Reported by:** reading `message.css`, 2026-10-06
- **Where:** `src/styles/message.css` lines 100-101 versus 110-113
- **Problem:** line 101 says the astronaut's drift *"is paused by JavaScript (see
  floatAstronaut.ts), which recentres the sprite."* Twelve lines later the same block
  says the opposite: *"he is no longer parked in the centre, which read as a broken
  page."* The code agrees with the second statement — `floatAstronaut.ts` lines 36-43
  and `main.ts` lines 60-62 both document that reduced motion slows the drift rather than
  stopping it.
- **Cause:** a bug fix updated one comment and missed the other.
- **Risk:** low, but this is the accessibility file. Someone fixing reduced motion will
  read the stale line, believe the behaviour is a parked sprite, and reintroduce the bug
  that was already fixed. Documented behaviour is being contradicted by documentation.
- **Fix:** delete lines 100-101. **Fixed in this branch (2026-11-10).**

## ISS-004 — `package.json` has no `license` field

- **Reported by:** repository measurement, 2026-10-06
- **Where:** `package.json`
- **Problem:** a `LICENSE` file exists at the root declaring MIT, Copyright (c) 2026
  Team Akrasia. `package.json` has no `license` key, so `npm` reports the package as
  unlicensed. It is `"private": true`, so npm never publishes it.
- **Cause:** the LICENSE was committed before `package.json`, or copied in from a
  template.
- **Risk:** cosmetic and near-harmless while `private: true`. It matters only if the
  project is ever forked or published, and the NASA attribution requirements make the
  licence worth stating unambiguously.
- **Fix:** add `"license": "MIT"`. **Fixed in this branch (2026-11-10).**

## ISS-010 — `src/core/` held DOM modules; the name did not match

- **Reported by:** reading the import graph, 2026-10-06
- **Where:** `src/core/` before this branch
- **Problem:** `core/` contained six modules. Three (`drift`, `deform`, `frame`) are
  pure, DOM-free, and unit tested. The other three (`floatAstronaut`, `pointerGrab`,
  `starfield`) all touch `document`, `window`, `requestAnimationFrame`, or pointer
  events. A layer named `core` whose contents disagree with the universal meaning of
  "core" is what makes an architecture unenforceable: any check script written against
  it would have to whitelist the files it was supposed to police.
- **Cause:** the directory was created when the first pure module landed and never
  revisited as the project grew toward the DOM.
- **Risk:** the false label is what allowed a layer boundary to be unenforceable in the
  first place. Left alone, the next person adds game state and rendering to `core/` too.
- **Fix:** moved the three DOM modules to `src/dom/`, leaving `core/` genuinely pure and
  genuinely tested. Done in this branch. No test imported any of the three, so no test
  changed. **Runtime effect unverified** — the build was re-run but the page was not
  opened in a browser.

## ISS-012 — No CI; nothing runs the checks on push

- **Reported by:** repository measurement, 2026-10-06
- **Where:** no `.github/` directory exists
- **Problem:** `npm test` and `tsc --noEmit` both pass today, but nothing runs them
  automatically. Six developers on the pre-freeze branch is the worst case for this.
- **Cause:** never set up; greenfield repositories usually start without it.
- **Risk:** a broken import or a failing test is discovered by a teammate, not by the
  author, usually at the worst moment.
- **Fix:** add a GitHub Actions workflow running `npm run check` and `npm test` on push
  and pull request. Cheap, and the `check` script already exists to call.
- **Resolution:** `.github/workflows/ci.yml` runs those checks plus HTML validation and
  a production build on pull requests and pushes to `main`. `.github/workflows/deploy.yml`
  deploys only after successful checks on `main`.

## ISS-013 — Vitest runs node-env, so DOM modules cannot be tested

- **Reported by:** test-run output, 2026-10-06 (`environment 0ms`)
- **Where:** `vite.config.ts` (no `test` block), `package.json`
- **Problem:** Vitest defaults to the `node` environment. There is no jsdom or
  happy-dom dependency. Any test touching `document` or `window` fails on import.
- **Cause:** every current test is pure mathematics, which needs no DOM.
- **Risk:** this is the root cause blocking ISS-011. Until it is resolved, the DOM layer
  cannot be tested at all, which means the layer the check script treats as "allowed to
  touch the DOM" is also the layer nothing verifies.
- **Fix:** add a devDependency and annotate the files that need it with a per-file
  `@vitest-environment jsdom` docblock, keeping the pure tests fast.

## ISS-014 — `base.css` calls the page non-interactive while it is draggable

- **Reported by:** reading `base.css`, 2026-10-06
- **Where:** `src/styles/base.css` lines 59-62, `index.html` line 36
- **Problem:** the comment reads *"The page is intentionally non-interactive; block stray
  selections."* The `user-select: none` and `overflow: hidden` are correct, but the page
  is not non-interactive: the astronaut is explicitly pick-up-able and draggable, and
  `index.html` gives it `alt="Cartoon astronaut floating in space, draggable"`.
- **Cause:** the comment described the page as it was before the grab feature shipped.
- **Risk:** cosmetic, but it invites someone to disable pointer events or add an inert
  overlay over a region that is meant to be draggable.
- **Fix:** reword to "block stray text selection; the astronaut is the only draggable element."
  **Fixed in this branch (2026-11-10).**

---

## ISS-021 — The rendered launch film was never wired into the launch screen

- **Reported by:** the player, 2026-10-07
- **Where:** `src/features/launch/view.ts`, `index.html`
- **Problem:** pressing START MISSION walks naming -> briefing -> supply -> launch,
  and the launch screen plays the two-still CSS cinematic under the title card.
  The rendered MP4 exists at `Assets/images/launch/launch-cinematic.mp4`, but
  nothing imports or plays it, so the film never appears.
- **Cause:** the film was rendered outside the repo and never handed to the
  feature. The stills were always the stand-in; the film is the real content.
- **Risk:** the screen looks finished while showing the wrong thing — worse than
  an honest placeholder, because nobody can tell from a screenshot.
- **Fix:** the title card lifts onto the film, which plays once, then the screen
  hands itself to the next stop. Reduced motion holds one frame for the same
  runtime. **Fixed in this pass, then corrected by ISS-022.**

---

## ISS-022 — The ISS-021 fix dropped the conference and walk scenes

- **Reported by:** the player, 2026-10-07
- **Where:** `src/features/launch/*`, `index.html`
- **Problem:** the first fix for ISS-021 replaced the whole cinematic with the
  film. The press conference and the walk to the rocket — already coded, tested
  and shipped — were deleted, and the film played alone after the title.
- **Cause:** the stills were treated as a stand-in for the film. They are not:
  they are the departure, and the film is the launch. The sequence is title ->
  conference -> walk -> film, and removing the first two broke the story.
- **Risk:** the mission begins with a rocket already on the pad; the crew and
  the press, the reason anyone is watching, are gone.
- **Fix:** both stills restored verbatim — same shots, same camera moves, same
  flashes, same tests — with the film added after them as the final beat.
  **Fixed in this pass.**


---

## ISS-040 — `landing-site` commits the region but never sets region-dependent starting stores

- **Reported by:** plan, 2026-11-08, from GAME_LOOP_PLAN.md §1
- **Where:** `src/features/landing-site/view.ts` (`commitLanding`), `src/sim/run.ts` (`newRun`)
- **Problem:** `commitLanding` calls `withState(run, { regionId })`, which sets `regionId` but leaves the stores at `createInitialStores()` defaults. Region-dependent starting stores (water, power, etc. from D-034) are never applied, so the landing choice has no mechanical effect.
- **Cause:** `landAt` does not exist yet; `run.ts` is a stub.
- **Fix:** Add `landAt(run, regionId)` to `src/sim/run.ts` that sets `regionId` and region-adjusted starting stores. Change `commitLanding` to call `landAt` instead of `withState(run, { regionId })`. Add a test.
- **Pre-existing:** yes; the region was always cosmetic.
- **Status:** fixed in this branch. `landAt` is implemented in `sim/run.ts` and
  `commitLanding` calls it. `run.test.ts` covers region-adjusted stores for every region.
- **Related:** D-034, GAME_LOOP_PLAN §4.4.

---

---

## ISS-046 — The header advertised a menu that did not exist, and naming's back button navigated to itself

- **Reported by:** agent, 2026-11-10, while auditing the game-loop chrome.
- **Where:** `src/ui/gameLoop.ts` (`gameHeader`), `src/features/naming/view.ts` (`onBack`), `index.html`
  (`data-naming-back`).
- **Problem:** every run screen drew `Mission Control / Main Menu` as a right-hand `<nav>` label. It was
  plain text, not a control, so a child who wanted to leave mid-run had no way out except the browser
  Back button, which loses the in-memory run with no warning. And naming's back button called
  `navigate('naming')` while already mounted on naming: the first press re-set the same hash, and every
  press after that did nothing at all.
- **Cause:** D-038 drew the header from the Figma frames, where the label is a link. The chrome was
  deliberately kept decorative, but nobody noticed the affordance it implied. `onBack` predates the
  decision that naming *is* the main menu (D-021).
- **Fix:** `gameHeader(sub?, onLeave?)` renders a Menu button when a screen has an `onLeave`; clicking it
  opens an in-screen dialog (Keep playing / Leave mission) with focus and Escape handling, never a native
  `confirm()` (R-9). Screens without a run keep the old plain label. Naming's control is relabelled "Start
  over" and clears the form, the greeting and the run. Recorded as D-044.
- **Pre-existing:** yes; both were dead controls since D-038 and D-021 respectively.
- **Status:** fixed in d90e838.

---

## ISS-045 — The page title called the built game "Under Construction"

- **Reported by:** agent, 2026-11-10, while checking the shell metadata.
- **Where:** `index.html`, `<title>` and `<meta name="description">`.
- **Problem:** the browser tab read "Mars Horizon — Under Construction" and the description ended with
  "Placeholder while the mission trainer is under construction", even though the nine-screen journey is
  built and runnable.
- **Cause:** the landing-page copy was written before the game loop existed and never updated alongside
  the README pass.
- **Fix:** title becomes "Mars Horizon — Junior Astronaut Mission Trainer"; the description names the
  actual challenge — 12 sols balancing power, air, water, food and shielding. Fixed in 559c0d6.
- **Pre-existing:** yes; the strings were written for the placeholder page.

---

## ISS-044 — The briefing said three crewmates while `CREW_SIZE` is 4

- **Reported by:** agent, 2026-11-10, cross-checking story copy against `sim/`.
- **Where:** `src/features/briefing/model.ts`, `model.test.ts`.
- **Problem:** the briefing read "Two others have flown to space" and "The three of you are going to Mars",
  but `CREW_SIZE = 4` in `sim/modules.ts` and the ration check divides supplies by four. A child who
  does the arithmetic notices the story and the numbers disagree.
- **Cause:** the copy was written before the crew size was fixed at four.
- **Fix:** the beats now say "Three others" and "The four of you", and a test pins both phrases to
  `CREW_SIZE`. Fixed in 02403e7.
- **Pre-existing:** yes; the contradiction was shipped in the first briefing.

---

## ISS-047 — The supply screen ignored the Enter key until NEXT had been clicked

- **Reported by:** the owner, 2026-11-10, from the deployed build: on `#/supply` the Enter key did
  nothing on the first beat, and clicking NEXT with the mouse first made Enter work.
- **Where:** `src/features/supply/view.ts` (`mountSupply`).
- **Problem:** the screen had no keyboard handler at all. The only way to advance a beat was
  `advance.addEventListener('click', revealNext)`, so a keyboard player could not move past the first
  fact. Enter appeared to work after clicking NEXT only because the mouse click left the focus on the
  button and the browser activates a focused button on Enter - so the key worked by accident, and only
  once the screen had been clicked.
- **Cause:** the briefing got an Enter handler with D-046 ("NEXT (or the Enter key) swaps in the next
  line"); the supply screen, which has the same NEXT-button shape, never got the same treatment.
- **Fix:** `isPlainEnter` and `focusHandlesEnter` in `features/supply/model.ts` (pure, tested) and one
  `window` keydown listener in the view, mirroring the briefing's. Enter advances while NEXT is visible
  and does nothing once the question is up, so a stray press cannot answer the question. The listener is
  removed in the teardown.
- **The same root cause had a second face.** The markup is static, so the screen never cleared the last
  visit's state: a second visit to #/supply came back with NEXT hidden, the answers still on screen and
  **eight** answer options instead of four, because the old buttons were never removed. The screen now
  resets itself when it mounts. Without that reset, Enter would have gone quiet again on every revisit -
  the same symptom, a different cause.
- **Pre-existing:** yes; the supply screen has had no keyboard handler since it was built, and it has
  never reset its state on a mount.
- **Status:** fixed in this branch. Recorded as D-050.

---

## ISS-052 — The game never named the five science goals it is about

- **Reported by:** agent, 2026-11-11, while checking that the gameplay matched the five science
  goals the project is about.
- **Where:** `src/sim/goals.ts` (new), `src/features/act/`, `src/features/debrief/`.
- **Problem:** every number in the game was real and every number was about one of five things —
  Martian dust storms, life support, radiation exposure, power shortages and food production — but
  nowhere did the game say so. A player saw five resource bars falling and had to work out for
  themselves that the dust was what was blocking the Sun and that a flat battery was what was
  slowing the air makers. The science was all there and none of it was legible.
- **Cause:** the goals were implicit in the model rather than named anywhere, and no screen had a
  reason to ask.
- **Fix:** `src/sim/goals.ts` names the five goals and reads each one against the run, so every line
  is a fact about the outpost ("the greenhouse grows 12 food a sol and the crew eat 10"). `act` shows
  them with a NASA fact each, and `debrief` reports how each fared. Fixed in 4199bd5.
- **Pre-existing:** yes; the model has always been about these five things.

---

## ISS-051 — The ration check asked the same question every run, so the answer was always 80

- **Reported by:** agent, 2026-11-10, while reviewing the supply screen.
- **Where:** `src/features/supply/model.ts`, `src/features/supply/view.ts`.
- **Problem:** the ration question was fixed — two months, four crew, three days per packet — so the
  answer was always 80 and the buttons were always 20, 80, 240 and 720. A child who played the game twice
  learned the number instead of the calculation, and the screen that exists to teach arithmetic had become a
  memory test. The fourth option was worse: 720 was not a mistake anyone could describe, so it was a guess
  button rather than a wrong answer that teaches something.
- **Cause:** the question was authored once, when the point was the three-step conversion, and never revisited.
- **Fix:** the mission length now varies between six authored values, the answer moves with it, and all four
  buttons are worked out from the question on screen — the answer, plus the three mistakes a child actually makes
  (forgot the crew, forgot the packet size, forgot both). The order is shuffled too. The variation is seeded
  from the astronaut's name rather than `Math.random()`, so a demo repeats and a test can pin it. Fixed in
  9f0fabb.
- **Pre-existing:** yes; the fixed question shipped with the supply screen.

---

## ISS-050 — `architecture.md`'s module-contract table lists exports that do not exist

- **Reported by:** agent, 2026-11-10, while reading the contract table before changing `sim/`.
- **Where:** `docs/architecture.md`, the "Module contracts" table.
- **Problem:** the table describes an older shape of the codebase. `sim/resources` is listed as exporting
  `StoreChange`, `DrainResult` and a five-argument `drainForSol`; the real signature is
  `drainForSol(stores, net, powerCapacity)`. `sim/modules` is listed as exporting `STARTING_MODULES`,
  `canBuild`, `adjustedBuildCost`, `buildPreview`, `upkeepFor` and `extraBatteryCount` — none of which
  exist. `sim/crises` is listed as exporting `decide`, which lives in `sim/sol.ts`. `sim/sol` is listed as
  exporting `LedgerEntry` and returning a `SolResult`; the real type is `SolRecord` in `sim/run.ts` and
  `advanceSol` returns a `RunState`. `ui/gameLoop` is listed as exporting `gameDock`, which does not exist
  anywhere in the repository. A caller reading the table would write code that does not compile.
- **Cause:** the table was written once and never reconciled against the code, because nothing enforces it.
  The checker proves what a file *may* import; it says nothing about what a file exports.
- **Fix:** partly fixed in the documentation commit of the activity work. The rows for `sim/run`,
  `sim/sol`, `sim/resources`, `sim/modules`, `sim/crises`, `sim/regions`, `ui/gameLoop`,
  `data/nasaGallery` and the `act` and `debrief` features are rewritten to match the code, and the
  new `sim/activities`, `sim/science`, `sim/topics`, `data/nasaDaily`, `dom/dailyFactLoader` and
  `ui/nasaFeedCard` rows are added. The tree entries for `sim/constants.ts` and `sim/balance.test.ts`,
  which name files that do not exist, are removed. The remaining stale rows stay open rather than
  being quietly corrected in a commit about something else.
- **Pre-existing:** yes; the table has drifted since the game loop was built (2026-11-08).

---

## ISS-049 — NASA's Astronomy Picture of the Day rejects the shared `DEMO_KEY` with a 429

- **Reported by:** agent, 2026-11-10, while probing NASA's live endpoints before designing the daily fact
  layer.
- **Where:** `src/data/nasaDaily.ts` (new), `api.nasa.gov/planetary/apod`.
- **Problem:** `GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` answered once with a real,
  dated explanation, then the same endpoint returned `429` on every subsequent request, including
  `?search=Mars`. The shared key is rate-limited in exactly the way ISS-009 describes, so the live NASA
  daily feed has no guarantee of answering on demo night.
- **Cause:** `DEMO_KEY` is shared by every project that has not registered a personal key (D-006). The limit
  is reached by ordinary use, not by abuse.
- **Fix:** the live feed is an **enrichment layer on top of** the curated gallery, never a replacement
  (D-050). One request per session, memoised; a 4-second timeout; and on any failure the curated NASA card
  appears with an honest line saying NASA's picture service is busy. Registering a personal key in
  `.env.local` removes the limit — `.env.example` already documents how, and TASK-008 is still open.
- **Pre-existing:** the rate limit is ISS-009; only the discovery that it applies to APOD as well as DONKI
  is new.

---

## ISS-048 — The cosmetic sol headlines did not match the forecast schedule

- **Reported by:** agent, 2026-11-10, while mapping which sol carries which decision.
- **Where:** `src/features/act/model.ts`, the `MISSIONS` array and `missionHeadline`.
- **Problem:** the ten headlines were spread across twelve sols by index arithmetic
  (`Math.round(((sol - 1) / (WIN_SOL - 1)) * 9)`), so sol 8 displayed "Mission 7: First Harvest" and sol 12
  displayed "Mission 10: Expand the Outpost". The forecast puts the dust storm on sol 7 and the second flare
  on sol 10, so the headline a child read on the day of the storm said "First Harvest". The array had no
  effect on the simulation at all — it was pure decoration carrying a wrong claim about the run.
- **Cause:** the headlines were written as flavour before the forecast schedule existed, and nothing tied
  them to it.
- **Fix:** replaced by `SOL_PLANS` in `src/sim/activities.ts` — twelve real headlines, each carrying the
  three activities offered on that sol, aligned with the baked crisis sols (D-051). Fixed in 816e1fb.
- **Pre-existing:** yes; the mismatch shipped with the game loop (2026-11-08).

---

## ISS-053 — Four `sim/` modules have no test files, and AGENTS.md's test counts are wrong

- **Reported by:** agent, 2026-11-10, while adding the activity loop and checking what the sim was covered by.
- **Where:** `src/sim/run.ts`, `src/sim/forecast.ts`, `src/sim/crises.ts`, `src/sim/comms.ts`; `AGENTS.md` §8.
- **Problem:** four modules in the layer the project calls its crown jewel have **no test files at all** —
  there is no `run.test.ts`, `forecast.test.ts`, `crises.test.ts` or `comms.test.ts` in `src/sim/`. The
  count of nineteen test files and 424 tests is right, but AGENTS.md's per-module counts are not: it claims
  `sim/modules.ts` has 25 tests (it has 14), `sim/resources.ts` has 18 (it has 7) and `sim/sol.ts` has 12
  (it has 32), and it attributes 19 tests to `sim/run.ts`, which has none.
- **Cause:** the modules were written and wired together faster than they were covered, and the document
  counts were filled in from memory rather than counted.
- **Fix:** partly fixed. `src/sim/run.test.ts`, `src/sim/balance.test.ts` and `src/sim/forecast.test.ts` are
  added, because the activity loop changes the run state and the balance it depends on, and because the
  forecast's event spacing had to be pinned down. AGENTS.md's test counts are corrected to the real
  numbers. `sim/crises.ts` and `sim/comms.ts` still have no test files, so the issue stays open: those two
  are untouched by this work, and adding coverage for them is its own job.
- **Pre-existing:** yes; the gap dates from the game loop build (2026-11-08).

---

**Next free id: ISS-095.**


---

## ISS-061 - The game was unwinnable: fourteen build points could not buy a night of power

- **Reported by:** agent, 2026-11-11, while playing the build screen and asking what a player
  is supposed to do with eighteen points.
- **Where:** `src/sim/modules.ts` (`BUILD_BUDGET`, `GREENHOUSE_WATER`, `LOAD_KW`, `SHIELDING_BASE`,
  `SHIELDING_EROSION`), `src/sim/rover.ts` and `src/features/base/`.
- **Problem:** the lander brings one solar array and one battery bank. A bare outpost draws 12 kW
  of life support plus heating, which is 144 kWh for one night against 100 kWh of battery. At
  fourteen build points **no legal build at any of the five landing sites was self-sustaining**,
  and the win rate was 14 to 23%. Measured over every legal build, eight forecast seeds and
  five sites, **zero of 3,558 runs ended with all five science goals satisfied** - the game could
  not be won, let alone played well.
- **Cause:** the budget was set before the load and the generation were reconciled. Every module
  that answered a real problem cost more than the budget allowed, so the extra points went
  nowhere and the night was never covered.
- **Fix:** five constants in `src/sim/modules.ts` - budget 14 to 18, greenhouse water 5 to 3,
  greenhouse load 8 to 6, shielding base 20 to 30, shielding erosion 1 to 0.5. The win rate is
  now 41 to 45% and every site can hold all five systems.
- **Pre-existing:** yes; the game has always been a resource budget, and the budget was never
  playable.

---

## ISS-060 - The power card showed the level left at dawn, so it read 0% while the game let the player spend power

- **Reported by:** agent, 2026-11-11, in play testing: "no matter what I do power is always
  getting to zero, and if power is at 0 how am I able to do other things that requires power".
- **Where:** `src/features/act/model.ts` (`powerToday`), `src/features/act/view.ts`.
- **Problem:** the batteries are drained through the night, so the level left at dawn is near zero
  even for a healthy outpost. The card showed that level, so it read `0%` while the game
  cheerfully let the player approve a 25 kWh activity. The card and the rules contradicted each
  other, and nothing said which number the activity prices came out of.
- **Cause:** the card wanted "how full are the batteries" and the store holds the level after
  the night. Both are true and they are not the same number.
- **Fix:** the card now shows `Power today: 400 kWh` - what is left after the panels have
  filled the batteries and the systems have taken their share - which is exactly the number the
  activity prices come out of. The day and night strip says the same thing and says whether the
  batteries cover the night.
- **Pre-existing:** yes; the card was added with the rest of the HUD.

---

## ISS-059 - Nothing told the player what the game was, or what to do on a sol

- **Reported by:** agent, 2026-11-11, in play testing: "I do not even know what I am playing
  and what I am doing in the game".
- **Where:** `src/sim/guide.ts`, `src/ui/guide.ts`, `src/features/act/view.ts`,
  `src/features/briefing/model.ts`.
- **Problem:** the game never said what a sol was, what a work order was, what the two readings
  under one were for, or what the board of rules was. A child meeting the game for the first
  time had no idea what they were looking at, and a child who lost the thread had no way back
  in. The briefing ran through the mission and stopped.
- **Cause:** the screens were built one at a time and each assumed the player had worked out
  the one before it.
- **Fix:** a guide of ten steps, each saying where it happens and what to do about it. It opens
  by itself the first time the player reaches the build screen, and a button in the mission bar
  brings it back on any later sol. The briefing now also says what a day is - three work
  orders, approve one, the day happens - and that two new rules arrive every day.
- **Pre-existing:** yes; the journey screens had been built without a tutorial.

---

## ISS-063 - The rover was a floating button on a wall clock, outside the run

- **Reported by:** agent, 2026-11-11, on the request to "add the rover exploration in the game
  system - right now we are sending it and we are just showing some facts".
- **Where:** `src/sim/rover.ts`, `src/sim/run.ts` (`RunState.rover`), `src/ui/roverWidget.ts`
  (deleted), `src/data/roverFinds.ts` (moved into `sim/rover.ts`).
- **Problem:** the rover ran on a fifteen-to-sixty-five second real timer and its state lived in
  a widget rather than in the run. It could not be part of a sol, it did not know what the
  outpost had built, it was destroyed when the screen was rebuilt, and the debrief could not
  say what it had found. It was a picture window, not an expedition.
- **Cause:** the widget was built as an optional extra, and the state was never given a home.
- **Fix:** the rover's state is in `RunState.rover`. Sending it out is a work order like any
  other, it drives on sol time, and it comes back with a document on the desk - a real NASA
  picture, a place from the past, or a rare rock to log, take or leave. The catalogue moved
  from `data/` to `sim/`, because the simulation now owns the whole lifecycle. It still touches
  no resource.
- **Pre-existing:** yes; the rover was added as a widget (D-059).

---

## ISS-062 - Clicking a goal re-rendered the panel and threw the player back to the top

- **Reported by:** agent, 2026-11-11, in play testing: "clicking on goals just scrolls you back
  up".
- **Where:** `src/features/act/view.ts`.
- **Problem:** tapping a goal called `render()`, which replaced the whole panel. The scroll
  position went with it, so opening a goal threw the player back to the top of the screen -
  worse than the tap was worth.
- **Cause:** the detail was built inside the render rather than toggled in place.
- **Fix:** the detail is shown and hidden in place. Nothing is re-rendered, so the scroll
  stays where the player left it.
- **Pre-existing:** yes; it came with the goal tiles.

---

## ISS-058 - The play screens carried 85 to 139 words, too much for the audience

- **Reported by:** agent, 2026-11-11, on the request for a game a child can follow.
- **Where:** `src/features/act/view.ts`, `src/features/act/model.ts`, `src/sim/activities.ts`.
- **Problem:** the act panel held 85 words before a sol and 139 after one, and the five science
  goals alone were about 100 of them - five paragraphs of live readings plus a NASA fact each,
  all below the decision the player had come to make.
- **Cause:** each goal wanted to be explained at once, on the screen where the decision was.
- **Fix:** the goals became the standing orders - short rules on a board - and the live reading
  moved behind a tap. The act panel is now 64 words before a sol and 97 after one, and the
  words that were cut were the ones that were below the fold anyway. The module copy was cut
  to one line each, and the science behind each order is one tap away.
- **Pre-existing:** yes; the goals section was added in one piece and never measured.

---

## ISS-057 - The sol recap sat below the fold, so a change was invisible

- **Reported by:** agent, 2026-11-11, on the request that "the changes or decisions are not
  showing".
- **Where:** `src/features/act/view.ts`.
- **Problem:** the review of what the last sol did was at the bottom of the panel, under five
  paragraphs of goals. A child whose power had run flat saw a zero on the bar and no reason
  for it anywhere on the screen.
- **Cause:** the recap was written first and the goals were added in front of it.
- **Fix:** the recap is the first thing in the panel now, and the change ledger sits with it.
- **Pre-existing:** yes; the recap was added with the goals section.

---

## ISS-056 - Building a module moved no number on the HUD, so deploying looked like it did nothing

- **Reported by:** agent, 2026-11-11, on the request that "the changes are not showing".
- **Where:** `src/features/base/view.ts`, `src/features/base/model.ts`.
- **Problem:** clicking `+` re-rendered the panel and said nothing. The count changed by one and
  a picture appeared in the world, but nothing on the HUD moved - the cards showed the night
  hours and the days of food and water, none of which a solar array affects - so the most
  obvious action in the game looked like no action at all.
- **Cause:** the HUD showed five numbers that no build decision could move.
- **Fix:** the panel says what it did ("Solar Array added - 2 points spent"), the card flashes,
  the new figure pops in the world, and the HUD carries a **Day power** card that moves from
  216 kWh to 864 kWh as the panels go in.
- **Pre-existing:** yes; the cards were chosen to describe the outpost rather than the build.

---

## ISS-055 - The build card only explained a block while the player owned none of that module

- **Reported by:** agent, 2026-11-11, on the request for "no indications" when deploying.
- **Where:** `src/features/base/view.ts`.
- **Problem:** the reason a module could not be added was shown only when the player owned none
  of it. The first time you tried to build something you did not have was explained; every
  time after that - which is exactly when you had built your way into a limit - the `+` went
  dead and said nothing.
- **Cause:** the guard was `!placement.ok && have === 0`, which reads as "explain the missing
  module" rather than "explain the block".
- **Fix:** the reason is shown whenever the button is dead, and it names the limit in words a
  child can read: "That is the most solar arrays you can have."
- **Pre-existing:** yes; the guard was written to explain a locked module, and it was reused
  for the limit.

---

## ISS-054 - The build card counted the extras while the limit counted everything, so the player could not see how many they could add

- **Reported by:** agent, 2026-11-11, on the request for "how many I deploy and what the limit
  there is".
- **Where:** `src/features/base/view.ts`, `src/features/base/model.ts`, `src/sim/modules.ts`.
- **Problem:** the card counted the modules the player had added, but the limit counted the
  module the lander brought as well. Solar Array has a limit of four and the lander brings one,
  so the card read `3` with a dead button and no sign that three was the most. The player
  could not tell whether three was nearly enough or already too many.
- **Cause:** two different counts, and only one of them was on the screen.
- **Fix:** `sim/modules.ts` grew `extraLimitOf()`, which is the limit minus the lander's copy,
  and the card reads `3/3`. A MAX badge says the module is done, and the budget row already
  read `3 / 9 extras`.
- **Pre-existing:** yes; the two counts have always disagreed.
---

## ISS-064 - The build screen's browser check failed on a third of runs, because it assumed a desk that was always there

- **Reported by:** agent, 2026-11-11, while verifying the merge to `main`: the check passed
  25/25, then 22/23, then 25/25 twice, then failed three times out of five.
- **Where:** `tools/browser-check-build.mjs`.
- **Problem:** the check's last step looks for `.insp__open`, the button that opens the tool on
  an order, and reports the check as failed when there is none. Two things could cause that.
  A **crisis replaces the desk** (D-040), and the forecast's timetable is rolled from a seed
  taken from the clock (D-048) - so every page load puts its flares, its storm and its pod on
  different sols, and a crisis on sol 2 left no desk to look at. And the check assumed the
  tool it found was always the checklist, so it drove `.insp__step` buttons; on a sol where a
  different tool was on the desk, it worked nothing and graded an empty attempt.
- **Cause:** the check was written against a desk that is always there and a tool that is
  always the same. The recap check a few lines above already knew about the crisis and
  guarded itself; the tool check did not.
- **Fix:** the check resolves the crisis when one is showing - clicking the first option,
  which is what a player does - and then works **whichever** tool the desk gave it: the
  checklist, the timing, the radar, the sorting, the matching or the packing. Each is played
  as well as it can be, so the check now proves the whole loop - open, work, finish, stars -
  and not only the first step of it.
- **Pre-existing:** yes; the forecast became seeded in D-048 and the check was written before
  that.

---

## ISS-065 - Sol 3 had no tool to work at all, and the sorting tool could never earn three stars

- **Reported by:** agent, 2026-11-11, while chasing ISS-064. The browser check failed on a
  sol where the desk had three orders and not one of them could be worked.
- **Where:** `src/sim/minigames.ts` (`ENGINE_UNLOCK_SOL`), `src/ui/activityPlayer.ts`
  (`sortInspection`).
- **Problem:** two halves of the same mistake. The tools unlocked one every second sol -
  checklist on 1, timing on 3, radar on 5, sorting on 7, matching on 9, packing on 11 - while
  the sol plan is a fixed curriculum. Sol 3 offers the rover survey, the site map and the
  experiment, and their tools were radar (sol 5), sorting (sol 7) and packing (sol 11). **All
  three were still locked, so sol 3 had nothing the player could work** - the desk was three
  buttons. And separately, the sorting tool's `done()` said "finished when all six items are
  chosen", while its grading says "three stars when the three good ones are chosen and the
  other three are not" - so the tool as described could never earn three stars.
- **Cause:** the unlock schedule and the sol plan are two separate lists, and nothing checked
  that they agreed. `done()` was never called by anything, so its wrong version sat there
  unread.
- **Fix:** the tools now unlock one a sol for the first six - 1, 2, 3, 4, 5, 6 - so **every sol
  has at least one order the player can work**, and the player has something new to learn
  every day of the first week. The sorting tool's `done()` says "the player has decided",
  which is how the tool is actually played. And `src/sim/minigames.test.ts` now holds the
  rule that was missing: over the whole twelve-sol plan, every sol has an order with an
  unlocked tool and no build gate. That test is what stops it happening again.
- **Pre-existing:** yes; the tools arrived with the desk loop and the schedule was never
  checked against the plan.

## ISS-083 to ISS-087 - The same five play-test bugs, still there after ISS-077 to ISS-081

The player reported five bugs that earlier entries said were fixed. Those fixes were real
but reached only part of the cause.

- **ISS-083 / ISS-084 (lander kit, power at 0).** The lander's solar array and battery were
  counted, but life support plus the habitat drew 12 kW plus heating, which is 156 to 180 kWh
  a night, against one 100 kWh bank. Every site ended sol 1 at 0 kWh and stayed there, so the
  kit looked uncounted. `LOAD_KW` habitat 4 to 3 and life support 8 to 5, and
  `BATTERY_KWH_PER_BANK` 100 to 150: the lander alone now carries a night at every site.
- **ISS-085 (greenhouse and ice miner).** The ice miner required water 3 or more, so it was
  dead at Olympus Mons. It is now buildable everywhere and yields by the site's ice. A
  greenhouse drank 3% a sol with nothing refilling it, so life support now recycles most of
  it. The water goal also blamed the greenhouse when the real cause was a blackout; it now
  says which.
- **ISS-086 (scroll to top).** At 68rem and narrower the panel stops scrolling and `.gl`
  scrolls instead. `render()` saved only `.gl__scroll`. `keepScroll` in `ui/gameLoop.ts`
  saves the screen, the panel and the page. Used by `base` and `act`.
- **ISS-087 (power card).** The card read `stored / capacity kWh`. It now leads with the
  stored kWh and puts the capacity in the label.

## ISS-088 - The review showed the net change but not what each store made and used

Audit: the sol arithmetic was correct, but `SolRecord` kept only `net` for four of the five
stores, and `used.water` left out the greenhouse and electrolysis. `SolRecord` now carries
`produced` and `consumed` for all five stores. Air, water, food and shielding satisfy
`produced - consumed = net`; power satisfies `produced - consumed - powerWasted = net`. A test
checks that on every sol at every site and several builds. The act screen's review sheet
shows it as a Made / Used / Change table (`ledgerRows` in `features/act/model.ts`).
