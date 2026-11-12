# Audio

How the game's sound effects are organised, named, and wired.

## Source of truth

- **Playable assets:** `Assets/audio/sfx/**` (WAV/MP3 files grouped by context).
- **Cue map:** `src/ui/sfxMap.ts` — every cue id, its bundled file, gain/rate/voices, and playback flags (`loop`, `endEarlyMs`, `duck`).
- **Engine:** `src/ui/sfx.ts` — pooled `<audio>` playback, mute state, delegated click/hover handling, `M` toggle, `?mute=1`, and `playSfx(id)` / `stopSfx(id)`.
- **Mute UI:** `src/ui/soundButton.ts` (header/menu/naming). Audio settings persist in `mars-horizon.audio.v1` via `src/ui/save.ts` (separate from the run save).
- **Masters:** originals may live in `Assets/audio/masters/` (git-ignored). Use `tools/compress-audio.py` to produce/refresh the shipped `Assets/audio/sfx/**` files.

There is no ambient/background music track in this system; cues are event-driven SFX.

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
