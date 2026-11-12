# Audio

How the game's sound effects and background music are organised, named, and wired.

## Source of truth

- **SFX assets:** `Assets/audio/sfx/**` (WAV/MP3 files grouped by context).
- **SFX cue map:** `src/ui/sfxMap.ts` — every cue id, its bundled file, gain/rate/voices, and playback flags (`loop`, `endEarlyMs`, `duck`).
- **SFX engine:** `src/ui/sfx.ts` — pooled `<audio>` playback, mute state, delegated click/hover handling, `M` toggle, `?mute=1`, and `playSfx(id)` / `stopSfx(id)`.
- **BGM assets:** `Assets/audio/bgm/**` (MP3 tracks). Credits and licensing: `Assets/audio/bgm/Mars_Horizon_BGM_Credits.txt` (Pixabay; do not redistribute tracks as standalone audio).
- **BGM map:** `src/ui/bgmMap.ts` — track imports and pure route→track mapping.
- **BGM engine:** `src/ui/bgm.ts` — single looping `<audio>` track per route, follows the shared mute state from `sfx.ts`, retried on user gesture if autoplay is blocked.
- **Mute UI:** `src/ui/soundButton.ts` (header/menu/naming). Audio settings persist in `mars-horizon.audio.v1` via `src/ui/save.ts` (separate from the run save).
- **Masters:** originals may live in `Assets/audio/masters/` (git-ignored). Use `tools/compress-audio.py` to produce/refresh the shipped `Assets/audio/sfx/**` files.

## Background music

- **Route mapping:** `naming`/`landing` → `menu`; `briefing`/`landing-site` → `ambient`; `supply`/`launch`/`interior`/`landing-cinematic` → `take-off`; `base` → `base`; `act` → `act`; `debrief` → `debrief`. `encyclopedia` keeps the current track.
- **Behaviour:** one track loops at a time; music shares the SFX mute toggle (`M`, button, `?mute=1`) and persisted audio settings. If autoplay is blocked before interaction, playback starts/resumes on the next user gesture. Music is stopped on pagehide.

## BGM credits

Canonical record: `Assets/audio/bgm/Mars_Horizon_BGM_Credits.txt`.

- **Menu (`menu.mp3`)** — "Space Exploration" by The_Mountain (Pixabay). https://pixabay.com/music/main-title-space-exploration-143292/
- **Briefing & landing zone selection (`ambient.mp3`)** — "Space Ambient Cinematic" by DELOSound, composer credit ROMAN DOLMATOV (Pixabay). https://pixabay.com/music/ambient-space-ambient-cinematic-442834/
- **Take-off (`take-off.mp3`)** — "Space Epic Cinematic Journey" by Rockot (Pixabay). https://pixabay.com/music/main-title-space-epic-cinematic-journey-174145/
- **Base (`base.mp3`)** — "Space" by AlexGrohl (Pixabay). https://pixabay.com/music/ambient-space-535027/
- **Act / daily operations (`act.mp3`)** — "Innovations" by AlisiaBeats (Pixabay). https://pixabay.com/music/beats-innovations-339369/
- **Debrief (`debrief.mp3`)** — "Silent Horizon" by \_Music_for_Creators\_ (Pixabay). https://pixabay.com/music/ambient-silent-horizon-255343/

All tracks sourced from Pixabay and listed as free to use under the Pixabay Content License at time of selection; retain license records and review current terms before release. Some tracks may display Content ID registration notices. Do not redistribute music files as standalone audio.

## How to add or change a sound

1. Put the asset in the appropriate `Assets/audio/sfx/<group>/` folder (or regenerate via `tools/compress-audio.py`).
2. Import it in `src/ui/sfxMap.ts` and add/update the cue entry in `SFX` with an explicit `gain` (and `rate`/`voices`/`loop`/`endEarlyMs`/`duck` as needed).
3. Trigger it by cue id: `playSfx('cue-id')` from `ui/`, `dom/`, or `features/*/view.ts` code, or via `data-sfx="cue-id"` / `data-sfx="none"` on controls. Delegated hover uses `data-sfx-hover="off" | "on" | <cue>"`.
4. Keep `sim/` pure — no DOM, audio, or network in `sim/` (R-6/R-8).
5. Update this doc and `docs/architecture.md` when you add new audio files, cues, or wiring conventions.

## Conventions

- Screens/features ask for **cue ids**, never file paths.
- Prefer semantic cues over generic clicks when the action has meaning (e.g. `order-stamp`, `mission-leave`, `tool-finish`).
- Avoid duplicate sounds on redraws: gate transition sounds on state changes, not on every render.
- Respect read-aloud: cues duck under speech unless `duck: false` (used for continuous/important cues like footsteps where appropriate).
- `npm run check` enforces that every file in `Assets/audio/sfx/**` is referenced by `src/ui/sfxMap.ts` (`unplayed-audio`).

## Verification

- `npx tsc --noEmit`
- `node scripts/check-imports.mjs`
- `npm test` (watch ISS-015 flakiness)
- Manual/browser checks as needed: mute toggle, `M`, `?mute=1`, hover/click delegation, and key journey/training/tool cues.
