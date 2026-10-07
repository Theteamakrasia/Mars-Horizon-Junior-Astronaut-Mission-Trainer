# External Integrations

## Integration Inventory

| System | Type | Purpose | Auth | Criticality | Evidence |
|---|---|---|---|---|---|
| Google Fonts | External asset request | Landing-page typography | None | Low | `index.html` |
| NASA DONKI | Planned API | Space weather data; current module is a stub | Not implemented | Planned | `src/data/spaceweather.ts`, `docs/team/issues.md` ISS-008 |
| GitHub Actions | CI service | Quality checks and Pages release | GitHub workflow token | High for publishing | `.github/workflows/` |
| GitHub Pages | Hosting | Publish validated `dist/` on main | GitHub Actions OIDC | Deployment | `.github/workflows/deploy.yml` |

## Data, Credentials, Reliability

No database or persistent store is configured. No app secrets are currently read by
source. CI installs from the npm lockfile; deployment starts only after the completed
CI workflow succeeds. No API retry, timeout, metrics, or tracing policy is implemented.

## Evidence

- `index.html`, `src/data/spaceweather.ts`
- `package.json`, `package-lock.json`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
