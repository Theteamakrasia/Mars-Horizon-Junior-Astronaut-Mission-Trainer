# Warnings, known issues, and engineering risks

This is a maintained summary of current warnings and risks found in the repository.
`docs/team/issues.md` is the authoritative, detailed tracker: status and remediation can
change there before this summary is refreshed. This inventory was checked against the
repository on 2026-11-13. The advisory snapshot below comes from `npm audit` against the
npm advisory service on that date; it is not a full security audit.

## Open tracked issues

| ID | Severity | Current concern | Engineering consequence |
| --- | --- | --- | --- |
| ISS-002 | Medium | Starfield layers drift out and do not refill | May reduce the intended visual effect over time; inspect in browser before changing |
| ISS-005 | Medium | Mixed CRLF/LF line endings; no `.gitattributes` | Broad edits can create noisy diffs; preserve endings per file |
| ISS-007 | Medium | Google Fonts is loaded from a CDN | Typography falls back offline; page still requests a third party |
| ISS-009 | Medium | Shared NASA `DEMO_KEY` is rate-limited | Live NASA flare data may fail; provider and local fallbacks mitigate this |
| ISS-011 | Medium | DOM modules lack automated unit coverage | Lifecycle and cancellation defects may escape the pure unit suite |
| ISS-013 | Low | Vitest uses Node and has no DOM environment | DOM behavior cannot be exercised in the unit runner as configured |
| ISS-019 | Low | Cinematics use mixed visual styles | Visual consistency concern |
| ISS-020 | Low | NASA insignia appears on children’s suits and props | Attribution/brand review concern |
| ISS-053 | Medium | Issue tracker says simulation test coverage and test-count records need correction | Do not rely on historical test totals; inspect current test files and run the suite when authorized |

The above status list was read from the open rows in `docs/team/issues.md`. Confirm there
before acting; this summary can lag.

## Security and dependency notes

`npm audit` reported five vulnerable dependency entries on 2026-11-13 (2 moderate, 1 high,
2 critical). All are in the development/build toolchain; the app declares no production
npm dependencies. The affected versions and reported fix availability are:

| Package | Locked version | Reported severity | Exposure / reported fix |
| --- | --- | --- | --- |
| `vite` | 7.3.6 | High (plus moderate advisories) | Dev server/build tooling; npm reported a compatible fix available |
| `vitest` | 3.2.7 | Critical (includes moderate advisories) | Test tooling; npm reported the available fix as Vitest 5.1.0, a major upgrade |
| `tinypool` | 1.1.1 | Critical | Transitive Vitest worker dependency; fixed through the Vitest upgrade |
| `@vitest/mocker` | 3.2.7 | Moderate | Transitive Vitest mock tooling; fixed through the Vitest upgrade |
| `fast-uri` | 3.1.8 | Moderate | Transitive HTML validator dependency; npm reported a compatible fix available |

These are advisory matches, not a determination that the vulnerable paths are reachable in
this application's use. No dependency versions were changed in this documentation and
deployment task. Re-run `npm audit` before remediation because advisory data changes.

- The application has no backend, account system, or remote database. A run and audio
  preferences are stored in browser `localStorage` on that device (`src/ui/save.ts`).
- NASA/NOAA and Google Fonts requests leave the browser for their respective providers.
  Network calls from application code are isolated in `src/data/`.
- `VITE_NASA_API_KEY` is a Vite client variable. Any supplied value becomes visible to
  browser users; it is not a suitable location for a privileged secret. The app supports
  fallback behavior without a personal key.
- `.gitignore` excludes `.env` files except `.env.example`; `.dockerignore` excludes local
  environment files from Docker build context.
- The repository does not configure Dependabot, an automated dependency audit, an SBOM,
  or a security scanning workflow; the advisory snapshot above was a one-time local check.
- No dedicated performance benchmark or profiling setup is configured.

## Areas that need careful review

Recent Git history shows high change frequency in team records and the main interaction
surfaces, including `src/features/act/view.ts`, `src/features/base/view.ts`,
`src/features/debrief/view.ts`, `src/ui/gameLoop.ts`, and `index.html`. Review the full
diff and run the appropriate journey check for changes to these files. The pure simulation
boundary is enforced, but browser layout and lifecycle still require browser-level review.

## Evidence

- `docs/team/issues.md` (open issue rows and individual descriptions)
- `src/ui/save.ts`, `src/data/spaceweather.ts`, `src/data/nasaDaily.ts`, `index.html`
- `.gitignore`, `.dockerignore`, `package.json`, `.github/workflows/`
- `package-lock.json`, `npm audit --json`, `npm ls vite vitest @vitest/mocker tinypool fast-uri` (2026-11-13)
- `scripts/check-imports.mjs`, `tools/browser-check-*.mjs`
- Recent Git history (`git log --name-only` as of 2026-11-13)
