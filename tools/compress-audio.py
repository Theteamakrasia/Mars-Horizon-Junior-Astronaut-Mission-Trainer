"""Shrink the sound effects so the game loads them quickly.

The supplied set in `Assets/audio/sfx/` is 6.2 MB, and almost all of it is
uncompressed PCM: one airlock is 427 KB for two seconds of sound. They are the
first thing a screen asks for, so the player waits on them.

Every WAV here is a very short UI cue - a click, a chime, a stamp - played
through a phone speaker or a pair of headphones on a laptop. None of it is
music, and none of it needs a full 44.1 kHz stereo signal. So each file is
downmixed to mono and resampled to 16 kHz, which is above the 8 kHz telephone
band and comfortably above anything a click carries, and the PCM stays 16-bit
so every browser plays it without an argument.

     python tools/compress-audio.py            # convert what is not converted
     python tools/compress-audio.py --dry-run  # say what it would do
     python tools/compress-audio.py --restore  # put the originals back

Why not AAC/Opus
----------------
Those would take the set to roughly 0.5 MB, but producing them needs an
encoder: `ffmpeg` is not installed on this machine and `pydub` cannot write
AAC without it. A build step that only works on one machine is worse than a
file that is 300 KB larger, so this uses nothing but the standard library and
numpy, both of which the project already needs for its sprite and layout
tools. Swapping the encoder later is a change to this file and to the import
paths in `src/ui/sfxMap.ts`, nothing else.

The originals are not deleted. Each one is moved to `Assets/audio/masters/`
first, which is git-ignored precisely because it is 6 MB of raw material the
build does not use; the script's `--restore` puts them back so the conversion
can be re-run at other settings.

MP3s are left alone. They are already lossy and already small, and decoding
them would need the encoder this script exists to avoid - re-encoding a 32 KB
alarm to save 10 KB is a way to make a sound worse for nothing.

The script fails loudly rather than quietly shipping a broken cue: every
output is reopened and checked for one channel, the target rate and at least
one frame, and a file that did not get smaller keeps its original.
"""

from __future__ import annotations

import argparse
import shutil
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SFX_DIR = ROOT / "Assets" / "audio" / "sfx"
MASTER_DIR = ROOT / "Assets" / "audio" / "masters"

# Where a cue lands. 16 kHz is double the telephone band, and mono because no
# cue in the game is panned: a stereo click is the same click twice.
TARGET_RATE = 16_000
TARGET_CHANNELS = 1
TARGET_BITS = 16


def kib(size: int) -> str:
    return f"{size / 1024:.0f} KB"


def peak_db(samples: np.ndarray) -> str:
    """The loudest sample in dBFS, so the game's gain table can be sane."""
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0

    if peak <= 0.0:
        return "  -inf"

    return f"{20 * np.log10(peak):6.1f}"


def decode(path: Path) -> tuple[np.ndarray, int]:
    """A WAV as mono float32 in [-1, 1], and the rate it arrived at."""
    with wave.open(str(path), "rb") as handle:
        channels = handle.getnchannels()
        width = handle.getsampwidth()
        rate = handle.getframerate()
        frames = handle.readframes(handle.getnframes())

    if width == 1:
        raw = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif width == 2:
        raw = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    elif width == 3:
        # 24-bit little endian: pad each sample to 32 bits, then shift back.
        padded = np.frombuffer(frames, dtype=np.uint8).reshape(-1, 3)
        wide = np.zeros((padded.shape[0], 4), dtype=np.uint8)
        wide[:, 1:] = padded
        raw = np.frombuffer(wide.tobytes(), dtype="<i4").astype(np.float32) / 2147483648.0
    elif width == 4:
        raw = np.frombuffer(frames, dtype="<i4").astype(np.float32) / 2147483648.0
    else:
        raise SystemExit(f"{path.name}: {width * 8}-bit audio is not supported")

    if channels > 1:
        raw = raw.reshape(-1, channels).mean(axis=1)

    return raw, rate


def resample(samples: np.ndarray, rate: int) -> np.ndarray:
    """Reduce to TARGET_RATE, with a box filter so it does not alias."""
    if rate == TARGET_RATE:
        return samples

    step = rate / TARGET_RATE

    # A box filter as wide as the step, before decimation: without it the
    # content above the new Nyquist folds back and a chime turns into a buzz.
    width = max(1, int(round(step)))
    if width > 1:
        samples = np.convolve(samples, np.ones(width) / width, mode="same")

    length = max(1, int(round(samples.size / step)))

    return np.interp(
        np.linspace(0.0, samples.size - 1, length),
        np.arange(samples.size),
        samples,
    ).astype(np.float32)


def encode(path: Path, samples: np.ndarray) -> None:
    """Write mono 16-bit PCM at TARGET_RATE."""
    pcm = np.clip(samples, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(TARGET_CHANNELS)
        handle.setsampwidth(TARGET_BITS // 8)
        handle.setframerate(TARGET_RATE)
        handle.writeframes(pcm.tobytes())


def verify(path: Path) -> None:
    """Prove the file on disk is the cue we meant to write."""
    with wave.open(str(path), "rb") as handle:
        channels = handle.getnchannels()
        rate = handle.getframerate()
        frames = handle.getnframes()

    if channels != TARGET_CHANNELS:
        raise SystemExit(f"{path.name}: wrote {channels} channels, wanted {TARGET_CHANNELS}")

    if rate != TARGET_RATE:
        raise SystemExit(f"{path.name}: wrote {rate} Hz, wanted {TARGET_RATE}")

    if frames <= 0:
        raise SystemExit(f"{path.name}: wrote no frames")


def compress(path: Path) -> tuple[int, int, str]:
    """Convert one cue in place, keeping its original. Returns before/after/peak."""
    rel = path.relative_to(SFX_DIR)
    master = MASTER_DIR / rel

    before = path.stat().st_size
    samples, rate = decode(path)
    peak = peak_db(samples)

    out = resample(samples, rate) if rate != TARGET_RATE else samples

    # Take a copy of the original before the in-place rewrite, then write the
    # new cue to a temporary name so a failed write cannot leave a hole.
    master.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, master)

    staged = path.with_suffix(".wav.new")
    encode(staged, out)
    verify(staged)

    after = staged.stat().st_size

    if after >= before:
        staged.unlink()
        print(f"  kept     {rel}  ({kib(before)} -> {kib(after)}, no smaller)")
        return before, before, peak

    staged.replace(path)

    return before, after, peak


def restore() -> None:
    restored = 0

    for master in sorted(MASTER_DIR.rglob("*.wav")):
        target = SFX_DIR / master.relative_to(MASTER_DIR)

        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(master, target)
        restored += 1

    print(f"restored {restored} original(s) from {MASTER_DIR.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Shrink the game's sound effects.")
    parser.add_argument("--dry-run", action="store_true", help="say what would change, change nothing")
    parser.add_argument("--restore", action="store_true", help="put the originals back")
    args = parser.parse_args()

    if not SFX_DIR.exists():
        raise SystemExit(f"missing the sound set: {SFX_DIR}")

    if args.restore:
        restore()
        return 0

    wavs = sorted(SFX_DIR.rglob("*.wav"))
    mp3s = sorted(SFX_DIR.rglob("*.mp3"))

    if not wavs:
        raise SystemExit(f"no WAV files under {SFX_DIR} - already converted?")

    print(f"sound effects: {len(wavs)} WAV, {len(mp3s)} MP3 left alone")
    print(f"target: mono {TARGET_RATE} Hz, {TARGET_BITS}-bit PCM\n")
    print(f"  {'file':48} {'before':>7} {'after':>7} {'peak dB':>8}")

    total_before = 0
    total_after = 0

    for path in wavs:
        rel = str(path.relative_to(SFX_DIR))

        if (MASTER_DIR / path.relative_to(SFX_DIR)).exists():
            size = path.stat().st_size
            total_before += size
            total_after += size
            print(f"  {rel:48} {kib(size):>7} {'done':>7}")
            continue

        if args.dry_run:
            samples, rate = decode(path)
            print(f"  {rel:48} {kib(path.stat().st_size):>7} {'?':>7} {peak_db(samples):>8}")
            total_before += path.stat().st_size
            continue

        before, after, peak = compress(path)
        total_before += before
        total_after += after
        print(f"  {rel:48} {kib(before):>7} {kib(after):>7} {peak:>8}")

    if not args.dry_run and total_after > 0:
        print(
            f"\nWAV: {kib(total_before)} -> {kib(total_after)} "
            f"({100 - round(100 * total_after / max(1, total_before))}% smaller)"
        )
        mp3_size = sum(p.stat().st_size for p in mp3s)
        print(f"MP3: {kib(mp3_size)} untouched, already compressed")
        print(f"total: {kib(total_after + mp3_size)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
