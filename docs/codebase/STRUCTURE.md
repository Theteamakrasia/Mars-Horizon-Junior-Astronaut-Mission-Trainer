# Codebase structure

## Top-level map

| Path | Purpose | Evidence |
| --- | --- | --- |
| `README.md`, `AGENTS.md` | Project and contribution documentation | `README.md`, `AGENTS.md` |
| `package.json`, `package-lock.json` | npm scripts and dependency lock | `package.json`, `package-lock.json` |
| `Dockerfile`, `compose.yaml`, `.dockerignore`, `Makefile` | Container and local development entrypoints | Root build files |
| `src/sim/` | Pure mission simulation, state, forecasts, rules, and tests | `src/sim/run.ts`, `src/sim/sol.ts` |
| `src/features/` | Screen-specific model, view, styles, and feature notes | `src/features/README.md` |
| `src/data/` | External data clients and local reference catalogues | `src/data/spaceweather.ts`, `src/data/nasaDaily.ts` |
| `src/dom/` | DOM and browser-effect adapters | `src/dom/floatAstronaut.ts` |
| `src/ui/` | Routing, registry, shared UI, persistence, and audio | `src/ui/router.ts`, `src/ui/save.ts` |
| `Assets/` | Images, audio, icons, and video used by the app | `Assets/` |
| `tools/` | Balance/browser checks and asset preparation utilities | `tools/` |
| `scripts/` | Import-boundary and markup checks | `scripts/check-imports.mjs`, `scripts/check-markup.mjs` |
| `docs/` | Architecture, game flow, team records, and codebase reference | `docs/README.md` |
| `docker/` | NGINX configuration for local container serving | `docker/nginx.conf` |

## Entrypoints

- Main page: `index.html` loads `src/main.ts` through Vite.
- Mobile shell: `mobile.html` frames the same game and links to `index.html`.
- Build inputs: `index.html` and `mobile.html`, configured in `vite.config.ts`.
- Test, check, build, and balance commands are declared in `package.json`.

## Boundaries and naming

Code is organized primarily by layer, then by screen under `src/features/`. Feature
directories use kebab-case; TypeScript filenames commonly use lower camel case or the
screen-role names `model.ts`, `view.ts`, and `*.test.ts`. Imports use concrete paths; no
barrel files are allowed by `AGENTS.md`.

The `sim/` directory and each feature's `model.ts` are pure. Only `ui/registry.ts` imports
feature views, and a feature does not import another feature. `scripts/check-imports.mjs`
enforces these constraints.

## Evidence

- `index.html`, `mobile.html`, `vite.config.ts`, `package.json`
- `src/main.ts`, `src/ui/registry.ts`
- `src/sim/`, `src/features/`, `scripts/check-imports.mjs`
- `AGENTS.md`
