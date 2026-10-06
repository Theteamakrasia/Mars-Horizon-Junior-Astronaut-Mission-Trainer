# `src/data/` — the only place allowed to make a network request

**Nothing here is implemented.** The folder exists so the structure is visible; there is
no source file in it yet.

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

## BLOCKED: do not write the DONKI client yet

**ISS-008.** DONKI's CORS behaviour is unverified. `ccmc.gsfc.nasa.gov` could not be
reached from the development environment, so no `Access-Control-Allow-Origin` header has
ever been observed. If DONKI sends no ACAO header, a direct browser fetch fails at
runtime — in front of judges, on Nov 14.

One person opening `https://ccmc.gsfc.nasa.gov/donkinisearch/search?...` in a real browser
with devtools open answers this in two minutes and unblocks a sprint of work.

Until then: **baked-in data is the correct choice, not a fallback.** Do not build against
an unverified assumption (decision D-005).

## The second source, which IS verified

`api.nasa.gov` with `DEMO_KEY` returned **HTTP 200** with `Access-Control-Allow-Origin`
echoing the request origin. Confirmed browser-callable.

But `DEMO_KEY` is shared and rate-limited, and **nobody currently owns a personal key**
(ISS-009). So this source must degrade to baked-in values rather than showing an empty
screen when throttled.

## Before you create a `.env.local`

**ISS-006 — read this first.** `.gitignore` does not ignore `.env*`, and this is a
**public** repository. A committed NASA key is an irreversible disclosure; git history
keeps it even after the file is removed.

The one-line fix has not been applied because the standing instruction for recent passes
was to log rather than fix. Do not work around it — ask, or fix it first.

## Contract for whatever lands here

- read configuration from `import.meta.env.VITE_*` **here and nowhere else**
- return parsed, validated data — not `Response` objects — so callers stay testable
- every failure path falls back to baked-in data, and reports which it used
- tests must not hit the network. Test the parsing and the fallback with fixtures, and say
  in the test name that the wire format is unverified rather than implying it is tested