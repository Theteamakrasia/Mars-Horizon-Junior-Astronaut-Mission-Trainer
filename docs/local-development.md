# Local development and container deployment

## Prerequisites

- Node.js 22 and npm for the development server, checks, and local production preview.
- Docker Engine and the Docker Compose plugin for the container workflow.
- GNU Make is optional; each Make target is a short alias for the corresponding npm or
  Docker command.

## Development server

```sh
npm ci
npm run dev
```

Or run `make install` followed by `make dev`. Vite prints its local URL when ready.

## Production bundle

```sh
npm run build
npm run preview -- --host 0.0.0.0
```

The first command writes `dist/`; the second serves that bundle locally. `make build` and
`make preview` provide equivalent targets.

## Docker Compose

```sh
docker compose up --build
```

The application is available at <http://localhost:8080>. The Dockerfile installs the
locked npm development/build toolchain in a Node builder stage, runs the Vite build, then
copies only `dist/` into an unprivileged NGINX runtime image. Compose publishes port 8080
and restarts the service unless it is stopped. Use `docker compose down` to stop and
remove it. `make docker-up`, `make docker-logs`, and `make docker-down` are convenience
targets.

The app build needs no API key or backend. A personal NASA key may be configured in
`.env.local` for a host based Vite build (`VITE_NASA_API_KEY`), but environment values
compiled into browser JavaScript are public to users. Do not put secrets in a frontend
build. The container intentionally excludes `.env*` files from its build context.

## Container files

- `Dockerfile`: multi-stage build and static runtime image.
- `compose.yaml`: local service definition using Docker Compose's preferred filename.
- `.dockerignore`: keeps Git metadata, dependencies, generated files, and local secrets
  out of the build context.
- `docker/nginx.conf`: serves the built app and applies long lived immutable caching to
  fingerprinted Vite assets.

The deployment serves the same app files as the Vite build. NASA/NOAA data, Google Fonts,
and other explicitly remote media still require network access from the user's browser;
the game has local fallbacks where implemented.

## Evidence and references

- `package.json`, `package-lock.json`, `vite.config.ts`
- `Dockerfile`, `compose.yaml`, `.dockerignore`, `docker/nginx.conf`
- Docker Compose filename and multi-stage build guidance: [Compose application model](https://docs.docker.com/compose/intro/compose-application-model/) and [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
