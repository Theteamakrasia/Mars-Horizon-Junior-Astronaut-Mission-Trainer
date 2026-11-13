# External integrations

## Inventory

| System | Purpose | Authentication | Fallback / behavior | Evidence |
| --- | --- | --- | --- | --- |
| NASA DONKI | Live solar flare data | Optional `VITE_NASA_API_KEY`; otherwise shared demo key | Tries NOAA after failure | `src/data/spaceweather.ts` |
| NOAA SWPC | Solar flare data fallback | None | Empty result leads to approximate local forecast | `src/data/spaceweather.ts` |
| NASA APOD | Astronomy picture enrichment | Shared NASA endpoint access | Saved gallery is used when unavailable | `src/data/nasaDaily.ts`, `src/data/nasaGallery.ts` |
| Google Fonts | Web typography | None | CSS fallback fonts | `index.html` |
| GitHub Actions | CI and optional gated Vercel deploy | GitHub workflow token; Vercel secrets for deploy | CI checks pull requests and default branch | `.github/workflows/` |

## Data stores and credentials

The browser uses localStorage for a versioned device-local game save and audio settings.
There is no remote database. `.env.example` documents the optional NASA key, while
`.gitignore` excludes `.env` files except the example. A `VITE_` value is compiled into
client-visible code and cannot be used as a confidential secret.

## Reliability and observability

The NASA data clients use bounded request timeouts and validate response shapes; the
space-weather path falls back across providers and both data paths have local fallback
content. Retry/backoff, application metrics, tracing, and centralized monitoring are not
configured. A failed optional enrichment does not prevent the core mission from running.

## Evidence

- `src/data/spaceweather.ts`, `src/data/nasaDaily.ts`, `src/data/nasaGallery.ts`
- `src/ui/save.ts`, `src/sim/save.ts`, `.env.example`, `.gitignore`
- `index.html`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
