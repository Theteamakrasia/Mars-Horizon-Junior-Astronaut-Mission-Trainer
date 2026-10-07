# Coding Conventions

## Naming

| Item | Rule | Example | Evidence |
|---|---|---|---|
| Files | lower camel or feature role names | `floatAstronaut.ts`, `model.ts` | `src/` |
| Functions | lower camel | `stepAstronaut` | `src/sim/frame.ts` |
| Types | PascalCase | `AstronautFrame` | `src/sim/frame.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_THROW_SPEED` | `src/sim/drift.ts` |

## Formatting and Static Checks

No formatter or general lint tool is configured. TypeScript uses strict checking and
`noUnusedLocals`. `npm run check` runs layer/banned-API checks and `tsc`; `npm run check:html`
validates `index.html`. Inline CSS and style elements are permitted by `.htmlvalidate.json`.

## Imports and Errors

Use concrete relative module paths; do not add `index.ts` barrels. Features cannot import
other features. Stubs throw explicit errors. `requireElement` throws when required boot
markup is missing. No structured logging or secret-redaction policy is configured.

## Tests and Evidence

Tests are co-located as `*.test.ts`, use Vitest, and target pure logic without browser mocks.
Coverage thresholds are not configured. See `AGENTS.md` and `scripts/check-imports.mjs`.

- `tsconfig.json`, `package.json`, `.htmlvalidate.json`
- `scripts/check-imports.mjs`, `src/sim/frame.test.ts`
- `AGENTS.md`
