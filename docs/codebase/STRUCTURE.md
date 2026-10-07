# Codebase Structure

## Top-Level Map

| Path | Purpose | Evidence |
|---|---|---|
| `src/sim/` | Pure simulation mathematics and tests | `src/sim/*.ts` |
| `src/features/` | Feature models, views, styles, and specifications | `src/features/*/README.md` |
| `src/dom/` | Browser-facing landing-page behavior | `src/dom/*.ts` |
| `src/ui/` | Routing and screen registry contracts | `src/ui/*.ts` |
| `src/data/` | Isolated external data boundary; current client is a stub | `src/data/README.md` |
| `docs/` | Architecture, team records, changelog, and codebase map | `docs/` |
| `docs/pull-requests/` | Review-ready pull request documentation | `docs/pull-requests/` |
| `.github/workflows/` | CI and gated Vercel deployment | `.github/workflows/*.yml` |
| `Assets/` | Sprite and design reference images | `Assets/` |

## Entry Points

Runtime entry: `index.html` loads `src/main.ts`; Vite scripts select development or
production build. GitHub Actions entry points are the two workflow files above.

## Module Boundaries

| Boundary | Owns | Must not own |
|---|---|---|
| `sim/`, feature `model.ts` | Pure calculations | DOM and network access |
| `data/` | External data access | DOM rendering |
| `dom/` | Browser side effects | Simulation policy |
| `ui/` | Cross-screen routing | Feature-to-feature imports |
| `features/<screen>/` | One screen's model/view/style | Imports from another feature |

## Naming and Evidence

Feature folders contain `model.ts`, `view.ts`, a screen CSS file, and a README contract;
tests are co-located with pure modules. Imports are concrete relative paths; barrel files
are prohibited by `AGENTS.md`.

- `AGENTS.md`, `docs/architecture.md`
- `index.html`, `src/main.ts`, `vite.config.ts`
- `scripts/check-imports.mjs`
