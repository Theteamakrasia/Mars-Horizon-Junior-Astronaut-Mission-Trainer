# Technology Stack

## Runtime Summary

| Area | Value | Evidence |
|---|---|---|
| Primary language | TypeScript with HTML and CSS | `src/`, `index.html` |
| Runtime | Browser; CI uses Node.js 22 | `index.html`, `.github/workflows/ci.yml` |
| Package manager | npm, lockfile v3 | `package-lock.json` |
| Build system | Vite 7, ES modules | `package.json`, `vite.config.ts` |

## Production Dependencies

No production dependencies are declared in `package.json`; the browser bundle is built
from the project source by Vite.

## Development Toolchain

| Tool | Purpose | Evidence |
|---|---|---|
| TypeScript 5.9 | Type checking | `package.json`, `tsconfig.json` |
| Vitest 3.2 | Unit tests | `package.json`, `src/sim/*.test.ts` |
| Vite 7 | Dev server and build | `package.json`, `vite.config.ts` |
| html-validate | HTML validation | `package.json`, `.htmlvalidate.json` |

## Commands

```bash
npm ci
npm run check
npm test
npm run check:html
npm run build
```

## Environment and Evidence

There are no code-read environment variables documented. CI uses Node.js 22. Build output
is `dist/`; Vite uses a relative base and disables its public directory.

- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.ts`
- `.github/workflows/ci.yml`, `.htmlvalidate.json`
