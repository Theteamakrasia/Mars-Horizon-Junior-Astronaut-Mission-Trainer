# Warnings, known issues, and engineering risks

This is a maintained summary of current warnings and risks found in the repository.
`docs/team/issues.md` is the authoritative, detailed tracker: status and remediation can
change there before this summary is refreshed. This inventory was checked against the
repository on 2026-11-13. It does not claim a security audit or dependency vulnerability
scan has been performed.

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
| ISS-050 | Medium | Historical report of inaccurate module contracts in architecture documentation | Verify the current architecture reference before relying on exported API lists |
| ISS-053 | Medium | Issue tracker says simulation test coverage and test-count records need correction | Do not rely on historical test totals; inspect current test files and run the suite when authorized |

The above status list was read from the open rows in `docs/team/issues.md`. Confirm there
before acting; this summary can lag.

## Security and dependency notes

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
  or a security scanning workflow. This is an observed tooling gap, not evidence that a
  known exploitable dependency vulnerability exists.
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
- `scripts/check-imports.mjs`, `tools/browser-check-*.mjs`
- Recent Git history (`git log --name-only` as of 2026-11-13)
