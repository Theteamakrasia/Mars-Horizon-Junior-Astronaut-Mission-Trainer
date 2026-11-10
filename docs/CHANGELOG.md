# Changelog

Notable project changes are recorded here in reverse chronological order. Entries describe
changes intended for a release or deployment; routine edits that do not affect users are
omitted. Dates use ISO 8601 (`YYYY-MM-DD`).

This changelog follows the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions will be assigned when the project begins publishing releases.

## [Unreleased]

### Fixed

- The supply screen now answers the Enter key exactly as NEXT does. It ignored Enter until NEXT had been clicked with a mouse, and even then it worked only because the click left the focus on the button.
- Returning to the supply screen now starts it cleanly. Its markup is static, so a second visit used to come back with no way to advance and eight answer buttons instead of four.
### Changed

- Redraw the start screen as a full-bleed scene: the astronaut stands on the left, Mars fills the right and runs off the edges of the window, and the menu — title, name field, buttons and trainer card — sits on the right over the planet. The menu now uses the site's geometric sans, its panels are translucent so the planet shows through, and a soft scrim keeps the text readable. START MISSION is the highlighted button, the way the other screens treat their primary action, and "Start over" is quiet beside it. The rotating planet is unchanged.
- Enlarge the start screen's planet and astronaut so they stay sharp on a large screen. They are drawn at roughly the width of the window, so the 606px originals were being stretched three times over and the craters turned to mush.

### Added

- Deploy the validated default-branch build to Vercel from GitHub Actions using pinned Vercel CLI and repository secrets.
- Disable Vercel's automatic Git deployments so an unchecked push cannot create a parallel deployment.
- Add TypeScript, Vite, Vitest, and MIT license badges, the astronaut mascot, and a linked README index.
- Add GitHub Actions checks for imports, TypeScript, tests, HTML validation, and production builds.
- Add HTML validation configured to allow inline CSS while still reporting HTML errors.
- Add this changelog and CI status badges to the project README.
- Make the open-space simulation test deterministic so random wall impacts do not fail CI.
