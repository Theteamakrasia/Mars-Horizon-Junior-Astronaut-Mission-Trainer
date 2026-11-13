# Coding conventions

## Naming and module rules

| Item | Convention | Example | Evidence |
| --- | --- | --- | --- |
| Feature directories | kebab-case | `landing-site/` | `src/features/` |
| TypeScript files | lower camel case or feature roles | `floatAstronaut.ts`, `model.ts` | `src/dom/`, `src/features/` |
| Functions and variables | lower camel case | `advanceSol` | `src/sim/sol.ts` |
| Types and interfaces | PascalCase | `RunState` | `src/sim/run.ts` |
| Constants | UPPER_SNAKE_CASE where named constants are used | `MAX_SOL` | `src/sim/constants.ts` |

Use explicit relative imports and concrete module paths. Do not add barrel `index.ts`
files. A feature may not import another feature; shared state is passed through the app
shell. Preserve file line endings when editing.

## Formatting and checks

No dedicated formatter or general purpose linter is configured. TypeScript enables
`strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.
`npm run check` runs import checks, markup checks, and `tsc --noEmit`.

## Errors and browser effects

Required DOM lookups throw descriptive errors when markup is missing. Network response
parsers validate fields and clients use fallback data. There is no logging framework or
central structured error policy. Keep DOM access in browser-facing modules and network
access in `src/data/`.

## Tests

Tests are colocated and named `*.test.ts`; most exercise pure logic under Vitest's Node
environment. Coverage thresholds are not configured. See [TESTING.md](TESTING.md).

## Evidence

- `AGENTS.md`, `scripts/check-imports.mjs`
- `tsconfig.json`, `package.json`
- `src/sim/sol.ts`, `src/features/naming/model.test.ts`
- `src/data/spaceweather.ts`, `src/ui/gameLoop.ts`
