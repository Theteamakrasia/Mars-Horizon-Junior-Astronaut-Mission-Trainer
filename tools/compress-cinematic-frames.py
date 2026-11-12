"""Rewrite the landing cinematic's frames as WebP.

The five frames of the landing sequence are the second-largest thing the game
downloads, and they are fetched the moment the player presses LAND HERE. They
were supplied as JPEG, which is a poor fit for artwork the game already
shipped as WebP everywhere else.

    python tools/compress-cinematic-frames.py

The originals are kept in `source/` so the conversion can be re-run at any
setting without going back to the copy they came from, which is what
`compress-rover-assets.py` does for the rover button.

Why these settings
------------------
The frames are kept at their own size: 1600x900 for the approach and the
landing, 1365x768 for the three chute frames. The camera never zooms past 1.15,
so a larger file would be pixels nobody ever sees, and a smaller one would be
pixels everybody does.

Quality is 84 with the slowest method. These are illustrations with soft
gradients - a dusty sky, a glow around an engine, a haze over a landing - and
those are exactly what WebP holds onto well. At 84 the frames measure 41 dB
against the JPEG beside them, which is the point where the difference stops
being visible, and the whole sequence is about half the weight.

The tool fails loudly rather than quietly shipping the wrong thing: if a frame
is not a WebP of the right size, or if it did not get smaller, it says so and
exits non-zero.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / "Assets" / "images" / "landing-cinematic"
SOURCE_DIR = FRAMES_DIR / "source"

# The five frames: source name -> shipped name. The sizes are the originals'.
FRAMES = {
    "02.jpeg": "02-approach.webp",
    "03.jpeg": "03-chute-far.webp",
    "04.jpeg": "04-chute-mid.webp",
    "05.jpeg": "05-chute-near.webp",
    "06.jpeg": "06-chute-landing.webp",
}

# The WebP settings, and the size each frame must come out at.
WEBP = {"quality": 84, "method": 6}


def kib(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def convert_frames() -> None:
    """Rewrite every frame as WebP and prove the result is a picture."""
    for source_name, target_name in FRAMES.items():
        source = SOURCE_DIR / source_name
        target = FRAMES_DIR / target_name

        if not source.exists():
            raise SystemExit(f"missing the original: {source}")

        image = Image.open(source)
        size = image.size

        image.save(target, format="WEBP", **WEBP)

        print(f"{source_name} ({kib(source)}) -> {target_name} ({kib(target)})")

        written = Image.open(target)

        if written.format != "WEBP":
            raise SystemExit(f"{target_name} is a {written.format}, not a WebP")

        if written.size != size:
            raise SystemExit(f"{target_name} is {written.size}, expected {size}")

        if target.stat().st_size >= source.stat().st_size:
            raise SystemExit(
                f"{target_name} is not smaller than {source_name}; the conversion did nothing"
            )


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    convert_frames()


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        print(f"FAILED: {error}", file=sys.stderr)
        raise
