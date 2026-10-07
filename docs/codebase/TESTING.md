# Testing Patterns

## Test Stack and Commands

Vitest 3.2 with Vitest assertions. Run `npm test`; `npm run check` also typechecks and
enforces source layering. HTML validation is `npm run check:html`. No integration or E2E
test command and no coverage command are configured.

## Layout and Scope

Tests are co-located as `*.test.ts`. Existing tests cover pure simulation functions and
route parsing; there are no DOM, browser integration, or end-to-end tests. No global test
setup file is configured (`vite.config.ts`).

## Isolation and Gaps

Pure logic runs in Vitest's default Node environment without DOM mocks. The flaky test
recorded as ISS-015 is made deterministic in this branch; coverage thresholds are absent.
DOM module coverage is also tracked as ISS-011.

## Evidence

- `package.json`, `vite.config.ts`
- `src/sim/frame.test.ts`, `src/ui/routes.test.ts`
- `.github/workflows/ci.yml`, `docs/team/issues.md`
