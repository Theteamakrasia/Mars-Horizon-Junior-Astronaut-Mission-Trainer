# Codebase Concerns

## Top Risks

| Severity | Concern | Evidence | Impact | Suggested action |
|---|---|---|---|---|
| Resolved here | Randomized open-space test launch | `src/sim/frame.test.ts`, ISS-015 | Could fail CI without a simulation regression | Fixed with a deterministic trajectory |
| High | Core game and data modules are stubs | `docs/architecture.md` | No playable game loop or live data | Implement tracked feature tasks |
| Medium | DOM behavior has no tests | `docs/team/issues.md`, ISS-011 | Browser lifecycle regressions may escape | Add browser DOM test environment |
| Medium | NASA API CORS and key handling unresolved | `docs/team/issues.md`, ISS-006/008/009 | Live API cannot safely be enabled | Resolve issues before API work |

## Technical and Security Debt

Runtime behavior is still a landing page plus astronaut physics; plans in README describe
future gameplay. `.gitignore` lacks the planned `.env*` protection (ISS-006). npm reported
one moderate and two critical advisories during the HTML validator dependency installation;
the advisories need inspection against the lockfile before assigning package-level fixes.

## Performance and Fragile Areas

No benchmark or profiling configuration exists. `src/main.ts`, DOM animation and pointer
handling, and simulation math are sensitive areas; change pure math with deterministic
tests, and inspect DOM changes in a browser.

## [ASK USER] Questions

1. [ASK USER] Should GitHub Pages remain the production hosting target, or should the deploy
   workflow be adapted to a future Vercel or other provider configuration?

## Evidence

- `docs/team/issues.md`, `docs/team/tasks.md`
- `package.json`, `package-lock.json`, `.gitignore`
- `.github/workflows/`, repository scan output from the initial mapping
