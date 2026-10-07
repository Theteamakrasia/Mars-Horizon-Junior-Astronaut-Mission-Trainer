# PR #1 — CI quality gates and gated deployment

**Branch:** `rb/ci-html-checks-changelog`  
**Target:** `main`  
**Commits:** `adc5767`, `ceb8309`

## Summary

This change adds automated quality checks for pull requests and pushes to `main`, and
publishes the site to GitHub Pages only after the main-branch checks succeed. It also adds
HTML validation, README workflow badges, a project changelog, and evidence-backed codebase
documentation.

No production application behavior was changed. One existing simulation test was made
deterministic after it failed during validation because its random starting position could
cause an unplanned wall impact.

## Changes

### Code checks — `.github/workflows/ci.yml`

Runs for pull requests and pushes to `main`. The job installs dependencies with `npm ci`,
then runs these checks in order:

1. `npm run check` — layer rules, banned API checks, and TypeScript.
2. `npm test` — the Vitest unit test suite.
3. `npm run check:html` — validates `index.html`.
4. `npm run build` — confirms Vite can produce the production bundle.

Any failed command fails the workflow, making the PR check red and preventing deployment.

### HTML validation

`html-validate` is a development dependency, exposed through `npm run check:html`.
`.htmlvalidate.json` extends the standard rules and turns off only the inline-style and
style-element restrictions. The astronaut image has a narrow exception for the required
`src` attribute because `src/main.ts` assigns its source during startup. Other HTML errors
remain failures; the validator produced no warnings in the verified run.

### Deployment — `.github/workflows/deploy.yml`

The deployment workflow listens for completion of **Code checks** on `main`. It proceeds
only when that run concluded successfully, checks out the validated commit SHA, builds the
site, uploads `dist/` as a Pages artifact, and deploys it. Failed checks skip both build
and deployment jobs.

GitHub Pages must be enabled in the repository settings with GitHub Actions selected as
the publishing source. No Vercel project or other hosting provider was configured in the
repository; GitHub Pages is the target chosen in decision D-021.

### Documentation and test stability

- Added CI and deployment badges to `README.md`.
- Added `docs/CHANGELOG.md` and seven evidence-backed documents under `docs/codebase/`.
- Updated the architecture and team tracking documents, including ISS-012 and ISS-015.
- Replaced the randomized starting state in the open-space simulation test with a fixed
  trajectory. Existing assertions and tolerances are unchanged.

## Validation results

| Command | Result |
|---|---|
| `npm run check` | Passed |
| `npm run check:html` | Passed |
| `npm test` | Passed — 4 files, 94 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed |

The HTML check initially identified the runtime-populated astronaut image, and the first
test run reproduced the previously logged randomized test failure. Both cases are handled
as described above, then all checks passed.

## Review checklist

- [x] Changes are on a feature branch; `main` was not modified.
- [x] No production application code was changed.
- [x] HTML inline CSS does not create a false failure.
- [x] Failed quality checks block the deployment workflow.
- [x] Issue, task, architecture, changelog, and progress documentation is updated.
- [ ] Enable GitHub Pages with GitHub Actions in repository settings.
