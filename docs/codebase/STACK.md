# Technology stack

## Runtime summary

| Area | Current implementation | Evidence |
| --- | --- | --- |
| Languages | TypeScript, HTML, CSS; Python/JavaScript utilities under `tools/` | `src/`, `index.html`, `tools/` |
| Runtime | Browser; CI uses Node.js 22 for tooling | `.github/workflows/ci.yml`, `index.html` |
| Package manager | npm with lockfile version 3 | `package-lock.json` |
| Module/build system | ES modules, Vite 7, TypeScript 5.9 | `package.json`, `vite.config.ts`, `tsconfig.json` |
| Production dependencies | None declared | `package.json` |
| Production hosting | Static files; local Compose uses NGINX | `Dockerfile`, `compose.yaml` |

## Toolchain and commands

| Tool | Purpose | Evidence |
| --- | --- | --- |
| Vite | Development server and production bundler | `package.json`, `vite.config.ts` |
| TypeScript | Static type checking | `package.json`, `tsconfig.json` |
| Vitest | Unit test runner and assertions | `package.json`, `src/sim/frame.test.ts` |
| html-validate | Used by markup checking scripts | `package.json`, `scripts/check-markup.mjs` |
| Docker Compose | Local container build and runtime | `compose.yaml` |

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
npm run balance
docker compose up --build
```

## Configuration

The browser app has no required environment variables. `VITE_NASA_API_KEY` is optionally
read by the NASA space-weather client; a value included in a Vite build is public browser
data and must not be treated as a secret. The app has fallbacks when it is absent.

## Evidence

- `package.json`, `package-lock.json`
- `vite.config.ts`, `tsconfig.json`
- `.github/workflows/ci.yml`, `Dockerfile`, `compose.yaml`
- `.env.example`, `src/data/spaceweather.ts`
