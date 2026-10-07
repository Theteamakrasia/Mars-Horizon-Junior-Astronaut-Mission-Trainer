# Architecture

## Architectural Style

Layered browser application with feature folders and pure simulation logic. The primary
constraint is that `sim/` and feature models remain free of DOM and network dependencies;
feature folders do not import one another (`scripts/check-imports.mjs`).

## System Flow

```text
index.html -> src/main.ts -> DOM helpers -> pure sim functions -> rendered transforms
```

`main.ts` loads the landing page stylesheet, resolves required elements, creates the
starfield, and starts the astronaut animation. DOM helpers call pure simulation functions
to calculate each frame. Hash routing exists separately and is not wired into `main.ts`.

## Responsibilities

| Layer | Owns | Must not own | Evidence |
|---|---|---|---|
| `sim/` | Drift, deformation, frame calculations | Browser APIs, networking | `src/sim/` |
| `features/` | Screen-specific model and view | Cross-feature imports | `src/features/README.md` |
| `dom/` | Animation, pointer events, stars | Pure game rules | `src/dom/` |
| `ui/` | Hash parsing and navigation | Feature implementations | `src/ui/router.ts` |
| `data/` | Future external data adapter | UI and rendering | `src/data/README.md` |

## Patterns

Pure functions compose simulation state; `main.ts` is the composition root; layer rules are
checked by a custom source scanner. CI runs those checks before Pages deployment.

## Risks

- Several simulation, feature, and data modules are typed stubs that throw (`docs/architecture.md`).
- Router is implemented but not connected to the boot path (`src/main.ts`).
- DOM behavior has no automated tests (`docs/team/issues.md`, ISS-011).

## Evidence

- `src/main.ts`, `src/sim/frame.ts`, `src/dom/floatAstronaut.ts`
- `scripts/check-imports.mjs`, `vite.config.ts`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
