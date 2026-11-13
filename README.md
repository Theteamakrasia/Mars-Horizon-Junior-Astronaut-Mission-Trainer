# Mars Horizon - Junior Astronaut Mission Trainer

<p align="center">
  <img src="Assets/images/floating.png" alt="Pixel-art junior astronaut mascot" width="160">
</p>

<p align="center">
  <strong>A Mars outpost survival game about the engineering choices behind keeping a crew safe.</strong>
</p>

<p align="center">
  <a href="https://github.com/Theteamakrasia/Mars-Horizon-Junior-Astronaut-Mission-Trainer/actions/workflows/ci.yml"><img src="https://github.com/Theteamakrasia/Mars-Horizon-Junior-Astronaut-Mission-Trainer/actions/workflows/ci.yml/badge.svg" alt="Code checks"></a>
  <a href="https://github.com/Theteamakrasia/Mars-Horizon-Junior-Astronaut-Mission-Trainer/actions/workflows/deploy.yml"><img src="https://github.com/Theteamakrasia/Mars-Horizon-Junior-Astronaut-Mission-Trainer/actions/workflows/deploy.yml/badge.svg" alt="Deploy to Vercel"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript 5.9"></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&amp;logoColor=white" alt="Vite 7.3"></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-3.2-6E9F18?logo=vitest&amp;logoColor=white" alt="Vitest 3.2"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
</p>

**Mars Horizon - Junior Astronaut Mission Trainer** is an educational browser game created
for the [2026 NASA Space Apps Challenge](https://www.spaceappschallenge.org/). Designed for
young players, families, and classrooms, it turns the challenge of operating a Mars outpost
into a playable lesson in systems thinking, science, and resource management.

| Project | Details |
| --- | --- |
| Event | 2026 NASA Space Apps Challenge, November 14–15, 2026 |
| Audience | Primarily ages 8–16; also suitable for families and classroom discussion |
| Format | Browser-based, single-player strategy and learning game |
| Mission objective | Keep the outpost operating for 12 sols |
| Project status | Playable game; the complete mission journey is implemented |

> **NASA attribution:** This is an independent Space Apps Challenge entry. It is not
> produced, sponsored, or endorsed by NASA. NASA names, marks, imagery, and data are used
> to identify the challenge and acknowledge source material; they remain subject to NASA's
> applicable usage and attribution guidance.

## Contents

- [The idea](#the-idea)
- [The mission journey](#the-mission-journey)
- [The ten game missions](#the-ten-game-missions)
- [A day on Mars](#a-day-on-mars)
- [Learning goals](#learning-goals)
- [Science and real-world data](#science-and-real-world-data)
- [Designed for young players](#designed-for-young-players)
- [Run the project locally](#run-the-project-locally)
- [Project structure](#project-structure)
- [Save data and connectivity](#save-data-and-connectivity)
- [License](#license)

## The idea

Mars is far from Earth, and an outpost cannot rely on instant deliveries when something goes
wrong. Players take the role of a junior astronaut and make the operating decisions that
keep a small research base running. There are no enemies or combat: the central challenge is
balancing limited supplies while responding to changing conditions.

Five linked stores need attention throughout a run:

| System | Why it matters |
| --- | --- |
| Power | Runs equipment and life-support systems; generation and demand change over a sol. |
| Oxygen | Keeps the habitat breathable and depends on functioning life support. |
| Water | Supports the crew and the outpost's other systems. |
| Food | Must be managed as a continuing crew requirement. |
| Radiation shielding | Protects the habitat during solar events. |

Choices have costs and consequences. A power shortage can affect life support, while
preparing for a hazard competes with other needs. The goal is to understand these links and
make informed decisions, not to achieve a perfect score.

## The mission journey

The player names their astronaut and proceeds through a guided mission before managing the
outpost. The main route is:

```text
naming → briefing → supply → launch → interior → landing site → landing film
       → outpost setup → daily operations → debrief
```

During setup, the player chooses a landing region and builds the outpost from available
modules. The daily operations screen is the mission's working hub. After the twelfth sol, the
debrief explains the outcome using the run's resource history.

## The ten game missions

These are missions within the game: a sequence of outpost objectives that takes the player
from establishing a base to expanding it. They describe the astronaut's in-game work, not the
development stages of the project.

| # | In-game mission | Focus |
| --- | --- | --- |
| 1 | Establish the Outpost | Build essential infrastructure and understand why power comes first. |
| 2 | Survey the Environment | Read site conditions before committing outpost resources. |
| 3 | Operate the Rover | Use robotic exploration to survey and work beyond the habitat. |
| 4 | Prepare for an EVA | Learn how suit limits, airlocks, and time shape an excursion. |
| 5 | Find Local Resources | Search the Martian environment for useful materials. |
| 6 | Use Local Resources (ISRU) | Explore how in-situ resource utilization can reduce dependence on supplies from Earth. |
| 7 | Grow the First Harvest | Connect greenhouse needs with water, power, and food supplies. |
| 8 | Conduct a Science Expedition | Collect observations and samples to support research. |
| 9 | Survive a Major Hazard | Apply preparation and operating decisions during a serious Mars hazard. |
| 10 | Expand the Outpost | Add capability while keeping essential systems stable. |

ISRU means **in-situ resource utilization**: using materials found where a mission operates
instead of transporting every supply from Earth. The missions make that engineering idea part
of the game's larger resource-management story.

## A day on Mars

Each sol is a turn that advances when the player chooses to proceed. On ordinary sols, the
player selects one main activity; on crisis sols, resolving the crisis takes that place.
Resource costs, gains, and events are recorded in the run ledger.

The operations desk adds a decision-making exercise to that loop:

- Three work orders are presented, each with two readings to check. The player approves one.
- A tool-based inspection can earn stars that increase the order's science value. Inspection
  results do not change resource stores.
- Training games teach the tools; two completed training games unlock the day's work orders.
- Standing orders form a growing rule book, adding two rules per sol up to twenty-four.
- A rover can be sent on an order. It returns on a later sol with a science document or find;
  rover discoveries do not alter resource balance.

These mechanics make the player practice reading evidence, following procedures, and
weighing trade-offs, rather than simply selecting upgrades.

## Learning goals

The game introduces five connected outpost systems. These are learning outcomes, not a
separate score: the mission is won by keeping the outpost operating through twelve sols.

| Learning goal | What the player considers |
| --- | --- |
| Martian Dust Storm | Dust on solar panels, reduced sunlight, and protecting equipment |
| Life Support | Keeping oxygen and water safe for the habitat |
| Radiation Exposure | Protecting the crew from harmful space radiation |
| Power Shortage | Keeping enough electricity for essential systems |
| Food Production | Making sure the crew has food they can count on |

Science points and a rank are reported separately in the debrief. The debrief also preserves
the standing orders the player worked under, so the run can be reviewed as a record of
decisions and lessons.

## Science and real-world data

The game pairs its simulation with NASA material and real data services where available.
Network data enriches the experience; it is not required to complete a run.

| Source | Use in the game |
| --- | --- |
| [NASA DONKI](https://api.nasa.gov/) | Solar-flare observations when the service is available |
| [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/) | Fallback source for flare observations |
| [NASA Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html) | A daily space image and related information |
| Saved in-project NASA gallery | Offline pictures and facts when live services are unavailable |

Forecast timing is generated for each run from a local seed; live services inform flare
intensity rather than deciding when events occur. If live weather data cannot be reached,
the game uses typical flares and marks them as approximate. APOD content similarly falls back
to the saved gallery. The game does not require an API key.

The project also keeps a set of design references from development. They show early concepts,
not guaranteed screenshots of the current interface:

<p align="center">
  <img src="Assets/README_ref/choose%20landing.png" alt="Early design reference for choosing a Mars landing site" width="48%">
  <img src="Assets/README_ref/survival%20loop.png" alt="Early design reference for managing the Mars outpost" width="48%">
</p>

## Designed for young players

The experience introduces its setting and systems through the mission journey, plain-language
work orders, a built-in guide, and hands-on training. The turn-based pace gives players time
to consider each decision. The game contains no combat; a failed run reflects depleted or
unsustainable resources, not harm to a character. NASA facts and images provide starting
points for further discussion about Mars, space weather, and engineering.

## Run the project locally

### Requirements

- **Docker Compose workflow:** GNU Make, Docker Engine, and the Docker Compose plugin. Node.js
  and npm do not need to be installed on the host; the Dockerfile uses a Node.js 22 build
  image and runs `npm ci` and `npm run build` inside Docker.
- **Native development and checks:** Node.js 22 and npm, in addition to GNU Make.

### Development server

```sh
make install
make dev
```

Open the local URL printed by Vite, usually <http://localhost:5173>. Run `make help` to see
all available targets. Common targets include `make check`, `make test`, `make build`, and
`make balance`.

These development targets run npm on the host: `make install` runs `npm ci`, `make dev` runs
`npm run dev`, and `make preview` runs `npm run preview -- --host 0.0.0.0`.

To build and serve the production bundle locally, run `make build` followed by `make preview`.
Vite prints the preview URL, usually <http://localhost:4173>.

### Docker Compose

Build and run the static site locally:

```sh
make docker-up
```

This runs `docker compose up --build`. Open <http://localhost:8080>. Stop with `Ctrl-C`, or
run `make docker-down` in another terminal. Use `make docker-logs` to follow container logs.
The container build does not need a NASA API key; live data and Google Fonts are optional
network enrichments, with in-game data fallbacks where applicable.

### Project checks

Run checks through Make. These targets use the host's Node.js and npm:

```sh
make check    # runs: npm run check (import boundaries, markup, and TypeScript)
make test     # runs: npm test (unit tests)
make build    # runs: npm run build (production static bundle)
make balance  # runs: npm run balance (simulation balance check)
```

For a Docker-only production build and local run, use `make docker-up`. Under the hood,
`docker compose up --build` builds the Node.js 22 stage, runs `npm ci` and `npm run build`
inside the image, then serves the static bundle from the NGINX runtime image.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/sim/` | Pure simulation rules, resources, events, and training logic |
| `src/features/` | Player-facing screens and their models and styles |
| `src/data/` | NASA/NOAA clients and saved data catalogues |
| `src/dom/` | Browser adapters and side effects around pure logic |
| `src/ui/` | Routing, shared controls, persistence, and screen registration |
| `Assets/` | Artwork, icons, audio, and video |
| `docs/` | Architecture, gameplay flow, development, and project records |
| `tools/` | Balance and browser-check utilities and asset tools |

For deeper project guidance, start with the [documentation map](docs/README.md), [game
flow](docs/game-flow.md), and [architecture overview](docs/architecture.md). Development
commands and container details are in [local development](docs/local-development.md).

## Save data and connectivity

The current run is saved in the browser's local storage on that device. There is no account,
cloud save, or game backend, so another browser or device has a separate run. NASA and NOAA
requests are made through the data layer; the saved gallery and approximate forecast allow
the core experience to continue when those services are unavailable. The page also loads its
font stylesheet from Google Fonts.

## License

The project source is distributed under the [MIT License](LICENSE). NASA materials remain
subject to their original source terms and attribution guidance.
