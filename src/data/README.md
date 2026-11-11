# `src/data/` — the only place allowed to make a network request

**Implemented.** `spaceweather.ts` reads live solar flares from two public feeds and
falls back to famous past flares, labelled approximate, when neither answers.
`nasaDaily.ts` reads NASA's Astronomy Picture of the Day and falls back to the saved
gallery when NASA is busy. `nasaGallery.ts` holds the saved gallery: it makes no
request at all.

**What is *not* here any more.** The rover's catalogue of real NASA finds used to live in
`data/roverFinds.ts`. It is now in `src/sim/rover.ts`, because the simulation owns the
rover's whole lifecycle — it is sent out by a work order, it drives on sol time, and it
comes back with a document on the desk (D-062). `data/` is for things fetched from a
network; the rover's finds are static data the game already had, and putting them in
`sim/` keeps the rover's rules and its catalogue in one place.

## Why this folder is quarantined

`npm run check` **fails the build** on any `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource` or `navigator.sendBeacon` outside `data/`. The rule id is
`no-network-outside-data`.

One place to fail is worth more than scattering try/catch. Every request here must answer:

- what happens when it is slow
- what happens when it is throttled
- what happens when the player is offline
- whether the player is told they are looking at an approximation

That last one is a promise the project README makes explicitly: *where we don't have a
hard number, we tell the player it's an approximation. Faking precision would teach kids
to trust data that isn't real.*

## The live-source chain

`fetchSpaceWeather()` tries three things, in order, and reports which one answered:

| # | source | endpoint | why it is here |
| --- | --- | --- | --- |
| 1 | **NASA DONKI** | `api.nasa.gov/DONKI/FLR` | the NASA source the pitch promises; the API portal sends the CORS header a browser needs |
| 2 | **NOAA SWPC** | `services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json` | `Access-Control-Allow-Origin: *`; the GOES X-ray measurements DONKI itself mirrors |
| 3 | **baked history** | `FALLBACK_FLARES` | famous flares from the record, every one marked `approximate` |

NOAA is second rather than first because the game promises NASA data. It exists because
DONKI has been returning 503 and rate-limiting the shared `DEMO_KEY` (ISS-008, ISS-009) —
without it the demo would show baked history while claiming to be live.

The detail sentence on `base`, and the debrief line, come from `lastDetail()` and name the
source that actually answered, so the player is never told NASA when it was NOAA.

## The daily picture chain

`fetchDailyFacts()` is the same idea, one source shorter (D-051):

| # | source | endpoint | why it is here |
| --- | --- | --- | --- |
| 1 | **NASA APOD** | `api.nasa.gov/planetary/apod?search=Mars` | a real NASA picture and story, dated, every sol |
| 2 | **saved gallery** | `nasaGallery.ts` | twelve checked NASA cards that are always there, whatever the network does |

This is an **enrichment layer on top of** the saved gallery, never a replacement — D-042
rejected a runtime NASA image API because a flaky endpoint must not cost the game its
teaching moment, and that reasoning still holds. The demo is complete without a network.
`lastDailySource()` reports which of the two answered, so the screen can say so.

The shared `DEMO_KEY` rate-limits this endpoint too (ISS-049): it answered `429` on every
attempt while this was written. A personal key is the fix (ISS-009, TASK-008).

## The API key

`VITE_NASA_API_KEY` if set, otherwise the shared `DEMO_KEY`. `.env*` is git-ignored
(ISS-006) and `.env.example` documents the variable name without storing a value. A
personal key is the fix for the shared key's rate limit (ISS-009); it is optional.

## Contract for anything added here

- read configuration from `import.meta.env.VITE_*` **here and nowhere else**
- return parsed, validated data — not `Response` objects — so callers stay testable
- every failure path falls through to the next source, then to baked-in data, and reports
  which source was used
- tests must not hit the network. Test the parsing and the chain with injected `fetch`
  fixtures, and say in the test name which wire format is verified and which is not
