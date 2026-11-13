# Codebase concerns

## Prioritized risks

The issue tracker currently lists these open concerns (severity is the tracker value):
ISS-002 (starfield drift), ISS-005 (mixed line endings), ISS-007 (Google Fonts CDN),
ISS-009 (shared NASA demo key), ISS-011 (DOM coverage), ISS-013 (no DOM test environment),
ISS-019 (cinematic visual consistency), ISS-020 (NASA insignia on props), and ISS-053
(test coverage/count records). See
[`../team/issues.md`](../team/issues.md) for descriptions and status. This map was checked
on 2026-11-13; that tracker remains authoritative.

No production TODO, FIXME, or HACK markers were found in the source scan performed for
this document. The scanner's generated output is not committed; use source searches to
reproduce that observation.

## Security and operational notes

- No backend, authentication, or database is configured; game state remains in browser
  localStorage (`src/ui/save.ts`).
- External browser requests are limited to integrations implemented under `src/data/`,
  plus the Google Fonts stylesheet in `index.html`.
- `.gitignore` excludes `.env` variants while allowing `.env.example`; `.dockerignore`
  excludes local environment files from container builds.
- The client-side NASA API key is not confidential after Vite embeds it. Keep the app's
  fallback path and avoid placing privileged credentials in frontend bundles.
- `npm audit` reported 2 moderate, 1 high, and 2 critical development-toolchain
  vulnerabilities on 2026-11-13. Details and scope are in [`../CODE_QUALITY.md`](../CODE_QUALITY.md).
- No automated dependency audit configuration, coverage threshold, or performance
  benchmark suite is present in the repository.

## Evidence

- `docs/team/issues.md`
- `docs/architecture.md`
- `src/data/spaceweather.ts`, `src/data/nasaDaily.ts`, `index.html`
- `src/ui/save.ts`, `.env.example`, `.gitignore`, `.dockerignore`
- `package.json`, `.github/workflows/ci.yml`
