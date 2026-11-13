# Mars Horizon

Mars Horizon is a browser based Mars outpost survival strategy game for young players
(approximately ages 8–16). Players run a twelve sol mission, balancing power, oxygen,
water, food, and radiation shielding while learning how engineers make decisions with
limited supplies. The game is a 2026 NASA Space Apps Challenge entry and is not produced
or endorsed by NASA.

The experience is playable from astronaut naming through mission debrief:

```text
naming → briefing → supply → launch → interior → landing-site → base → act → debrief
```

On each sol, players review work orders, use training tools, make an operating decision,
and see the resulting resource ledger. The game also includes a rover, training games,
standing orders, an encyclopedia, and a local save in the current browser.

## Requirements

- Node.js 22 (the CI runtime; see `.github/workflows/ci.yml`)
- npm, included with Node.js
- Docker Engine with the Compose plugin, if using the container workflow

There are no production npm dependencies. Vite builds the application as static files.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>). The convenience targets
in the Makefile provide the same workflow:

```sh
make install
make dev
```

To build and serve the production bundle locally:

```sh
make build
make preview
```

The preview server normally listens on <http://localhost:4173>.

## Run with Docker Compose

Docker builds the Vite bundle in a Node build stage and serves only the generated static
files from an unprivileged NGINX runtime container.

```sh
docker compose up --build
```

Open <http://localhost:8080>. Stop the service with `Ctrl-C`, or run `docker compose down`.
Equivalent Make targets are `make docker-up`, `make docker-logs`, and `make docker-down`.
The build is self-contained and does not require a NASA API key. External NASA, NOAA, and
Google Fonts requests are optional enrichments; offline fallbacks are included in the app.

## Engineering checks

```sh
npm run check   # import boundaries, markup contracts, and TypeScript
npm test        # Vitest unit tests
npm run build   # production bundle
npm run balance # simulation balance check
```

See [AGENTS.md](AGENTS.md) for contribution rules. In particular, simulation code and
feature models are pure, and feature modules do not import one another. The project
documentation map is in [`docs/`](docs/README.md), including architecture, game flow,
testing, integrations, and the current issues inventory.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/sim/` | Pure game rules, resource simulation, forecasts, and training logic |
| `src/features/` | One directory per player facing screen, with model/view/styles |
| `src/data/` | NASA/NOAA data clients and saved data catalogues |
| `src/dom/` | Browser side effects and adapters for pure simulation functions |
| `src/ui/` | Routing, shared screen controls, save, audio, and screen registry |
| `Assets/` | Artwork, audio, icons, and video included in the build |
| `docs/` | Architecture, product flow, decisions, issues, and project references |
| `tools/` | Balance and browser-check utilities plus asset preparation tools |
| `Makefile`, `Dockerfile`, `compose.yaml`, `docker/` | Local development commands and static container deployment |

## Data and privacy

The run and audio preferences are saved in browser `localStorage` on the current device.
There is no account, cloud save, or game backend. The application may request live solar
flare readings from NASA DONKI (then NOAA SWPC as a fallback), and astronomy pictures from
NASA APOD; those clients are isolated under `src/data/` and have saved/offline fallbacks.
The Google Fonts stylesheet is loaded from Google's CDN by `index.html`.

## License and attribution

The repository is distributed under the MIT License; see [LICENSE](LICENSE). NASA names,
images, and data remain subject to their respective attribution and usage terms.
