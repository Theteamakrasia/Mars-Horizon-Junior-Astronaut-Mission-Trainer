# Testing patterns

## Test stack and commands

- Runner/assertions: Vitest 3.2 (`expect` and Vitest test APIs).
- Unit suite: `npm test`.
- Static checks and typecheck: `npm run check`.
- Production build: `npm run build`.
- Simulation balance: `npm run balance`.
- Coverage reporting: no coverage script or threshold is configured.

## Layout and scope

Unit tests are colocated with source as `*.test.ts`. Most test pure simulation, feature
models, UI helpers, and data parsers in the Node environment. There is no configured DOM
test environment or global setup. Browser checks in `tools/browser-check-*.mjs` exercise
selected complete flows against a running browser and are separate from `npm test`.

| Scope | Present | Examples / limit |
| --- | --- | --- |
| Unit | Yes | `src/sim/*.test.ts`, feature model tests |
| Data parser/client | Yes | `src/data/spaceweather.test.ts`, `src/data/nasaDaily.test.ts` |
| Browser journey checks | Selected journeys | `tools/browser-check-journey.mjs`, other browser checks |
| Coverage threshold | No | No coverage config found |

Pure tests inject fetch implementations into data clients; unit tests do not depend on
live services. DOM lifecycle gaps and known flaky-test history are recorded in
`docs/team/issues.md`; verify current status there rather than relying on historical
counts in older notes.

## Evidence

- `package.json`, `vite.config.ts`
- `src/sim/frame.test.ts`, `src/data/spaceweather.test.ts`
- `tools/browser-check-journey.mjs`, `tools/browser-check-save.mjs`
- `.github/workflows/ci.yml`, `docs/team/issues.md`
