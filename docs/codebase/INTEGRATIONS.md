# External Integrations

## Integration Inventory

| System | Type | Purpose | Auth | Criticality | Evidence |
|---|---|---|---|---|---|
| Google Fonts | External asset request | Landing-page typography | None | Low | `index.html` |
| NASA DONKI | Planned API | Space weather data; current module is a stub | Not implemented | Planned | `src/data/spaceweather.ts`, `docs/team/issues.md` ISS-008 |
| GitHub Actions | CI service | Quality checks and gated Vercel release | GitHub workflow token | High for publishing | `.github/workflows/` |
| Vercel | Hosting | Publish validated default-branch build | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets | Deployment | `.github/workflows/deploy.yml`, `vercel.json` |

## Data, Credentials, Reliability

No database or persistent store is configured. No app secrets are currently read by
source. CI installs from the npm lockfile; Vercel's automatic Git deployment is disabled.
GitHub Actions deploys the exact checked commit only after `Code checks` succeeds for a
push to the default branch. No API retry, timeout,
metrics, or tracing policy is implemented.

## Evidence

- `index.html`, `src/data/spaceweather.ts`
- `package.json`, `package-lock.json`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `vercel.json`
