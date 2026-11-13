# Architecture

## Style and constraints

This is a static browser application organized into dependency constrained layers and
screen feature folders. Pure game rules are separated from DOM and network effects.
The custom checker enforces those import boundaries and disallows several browser/network
APIs outside their designated layers.

## Runtime flow

```text
index.html / mobile.html
  → src/main.ts (restore save and initialize browser effects)
  → src/ui/router.ts (hash route)
  → src/ui/registry.ts (screen factory)
  → feature view + pure models/simulation
  → UI callback updates RunState and local save
```

`src/main.ts` owns the current `RunState`, loads it before the first screen is mounted,
and passes it to the screen factory. `ui/registry.ts` is the only registry importing
feature views. Screens unmount before navigation. Network calls are made in `data/` and
joined to views through browser-facing loaders.

## Responsibility map

| Module | Owns | Must not own | Evidence |
| --- | --- | --- | --- |
| `sim/` | Run state transitions and deterministic rules | Browser APIs or network | `src/sim/sol.ts`, `scripts/check-imports.mjs` |
| Feature `model.ts` | Pure screen-specific derived values | DOM or other features | `src/features/act/model.ts` |
| Feature `view.ts` | Screen rendering and event lifecycle | Other feature implementations | `src/ui/registry.ts` |
| `data/` | Validating external responses and fallback behavior | DOM | `src/data/spaceweather.ts` |
| `dom/` | Browser effects/adapters | Mission rules | `src/dom/forecastLoader.ts` |
| `ui/` | Routing, cross-screen shell, persistence, and shared widgets | Feature-specific screen logic | `src/ui/router.ts`, `src/ui/save.ts` |

## Integrations and persistence

Solar flare enrichment follows NASA DONKI → NOAA SWPC → local approximate forecast.
NASA APOD enriches the saved gallery and falls back to it. The forecast schedule itself
is generated deterministically from run state. `ui/save.ts` adapts versioned data in
`sim/save.ts` to browser localStorage. There is no backend or cross-device sync.

## Architectural risks

- DOM lifecycle behavior is not covered by the Node-only unit suite; browser-check scripts
  cover selected journeys and require a browser runtime. See ISS-011 and ISS-013 in
  `docs/team/issues.md`.
- Several open team issues concern docs, offline behavior, and external-service limits;
  consult the issue tracker before addressing them. See `docs/CODE_QUALITY.md`.

## Evidence

- `src/main.ts`, `src/ui/router.ts`, `src/ui/registry.ts`
- `src/sim/sol.ts`, `src/sim/save.ts`, `src/ui/save.ts`
- `src/data/spaceweather.ts`, `src/data/nasaDaily.ts`, `src/dom/forecastLoader.ts`
- `scripts/check-imports.mjs`, `vite.config.ts`
