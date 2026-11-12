# Changelog

Notable project changes are recorded here in reverse chronological order. Entries describe
changes intended for a release or deployment; routine edits that do not affect users are
omitted. Dates use ISO 8601 (`YYYY-MM-DD`).

This changelog follows the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions will be assigned when the project begins publishing releases.

## [Unreleased]

### Fixed

- **Sol 3 had no tool to work at all.** The six tools unlocked one every second sol while the twelve-sol plan is a fixed curriculum, and sol 3's three orders all carried tools that were still locked — so the desk was three buttons and nothing else. The tools now unlock one a sol for the first six, so every sol leaves at least one order the player can work, and a test over the whole plan holds the rule.
- The sorting tool could never earn three stars: it reported itself unfinished until every item was chosen, while its own grading wanted only the good ones.
- **The game is winnable again.** At fourteen build points no legal build at any of the five landing sites was self-sustaining, and no run could satisfy all five systems. The build budget is now 18 and the greenhouse, shielding and load numbers have been rebalanced; the win rate went from 20% to 43%, and every site can hold all five systems. `npm run balance` now checks this and fails the build when it breaks.
- The power card no longer reads 0% while the game lets the player spend power. It shows what the crew can actually spend today, which is the number the order prices come out of.
- Clicking a learning goal no longer throws the player back to the top of the panel. The detail opens and closes in place.
- Building a module now moves a number on the HUD and says what it did. The build card counts the extras against the same limit the game uses, and says why a button is dead.
- The review of what the last sol did is the first thing in the act panel, instead of sitting below the fold.
- The play screens carry fewer words: 64 before a sol and 97 after one, down from 85 and 139.
- The supply screen now answers the Enter key exactly as NEXT does. It ignored Enter until NEXT had been clicked with a mouse, and even then it worked only because the click left the focus on the button.
- Returning to the supply screen now starts it cleanly. Its markup is static, so a second visit used to come back with no way to advance and eight answer buttons instead of four.

### Changed

- **The how-to-play guide is now a popup the astronaut reads.** It was a list of ten panels stacked in a scroll; it is now the crewmate standing on the left with a speech bubble on the right, one step per page, with Next, Back, page dots and a Read aloud button. The ten steps and their words are unchanged — only the delivery is. The screen behind is dimmed, the arrow keys turn the pages, and `Escape` closes it (D-073).
- The guide used to be rebuilt every time the screen behind it redraws, so the live space weather arriving threw a child reading page three back to page one. It now stays where it is (ISS-077).
- **The game is now a Papers Please game about Mars.** Each sol the player is the duty officer at the outpost: three work orders land on the desk, each carries two readings to check and some have a tool to work them with, and the player approves one. Six tools, one new one every sol for the first six days.
- **The five science goals are the learning outcomes, not a score.** The counters that graded them are gone. The goals now arrive as the standing orders — a rule book that grows two rules a sol until there are twenty-four — and the debrief prints them as a record of what the player kept running.
- **The rover is part of the run.** It is sent out by a work order, it drives on sol time, and it comes back with a document on the desk: a real NASA picture, a place from the past, or a rare rock to log, take or leave. It still touches no resource.
- Working an order with a tool now multiplies the science that order is worth. It never gives back a kWh, so the balance of a run does not depend on how well the minigame was played.
- Redraw the start screen as a full-bleed scene: the astronaut stands on the left, Mars fills the right and runs off the edges of the window, and the menu — title, name field, buttons and trainer card — sits on the right over the planet. The menu now uses the site's geometric sans, its panels are translucent so the planet shows through, and a soft scrim keeps the text readable. START MISSION is the highlighted button, the way the other screens treat their primary action, and "Start over" is quiet beside it. The rotating planet is unchanged.
- Enlarge the start screen's planet and astronaut so they stay sharp on a large screen. They are drawn at roughly the width of the window, so the 606px originals were being stretched three times over and the craters turned to mush.

### Added

- **A mission-day tracker in the header.** The nav bar now says which day of the twelve the player is on, and carries twelve pips — one per mission day — on a path that lights up behind them as the mission goes on, so the days already flown, the day in play and the days still to come are visible at a glance. The pips are filled stations on one rail rather than loose dots, the day in play is a gold dot with a ring around it, and the whole thing sits on the same line as the MARS HORIZON word. It is on every screen with a run in play, at all five landing regions, the day in play breathes quietly, and the day just flown flashes once.
- **A how-to-play guide.** Ten steps, each one saying where it happens and what to do about it. It opens by itself the first time the player reaches the build screen, and a `?` button in the mission bar brings it back on any later sol.
- The guide's own cutout: the astronaut who stands beside the speech bubble, and a lightbulb pictogram for the header pill.
- **A mission bar** on every play screen, saying in one line what the player is playing.
- The briefing now says what a day is before the player has to live one: three work orders, approve one, the day happens.
- The debrief prints a certificate, the patches the run earned, and the standing orders the player worked under.
- A `npm run balance` check that plays every legal build at every landing site and fails when a site cannot hold all five systems.
- Headless-browser checks for the build screen and the desk, the rover, and the whole journey.
- Deploy the validated default-branch build to Vercel from GitHub Actions using pinned Vercel CLI and repository secrets.
- Disable Vercel's automatic Git deployments so an unchecked push cannot create a parallel deployment.
- Add TypeScript, Vite, Vitest, and MIT license badges, the astronaut mascot, and a linked README index.
- Add GitHub Actions checks for imports, TypeScript, tests, HTML validation, and production builds.
- Add HTML validation configured to allow inline CSS while still reporting HTML errors.
- Add this changelog and CI status badges to the project README.
- Make the open-space simulation test deterministic so random wall impacts do not fail CI.
