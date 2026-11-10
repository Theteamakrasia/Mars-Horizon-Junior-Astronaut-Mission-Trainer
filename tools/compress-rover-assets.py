"""Shrink the rover's button so the outpost screens stay quick.

The rover button is drawn at 56-84 CSS pixels, but the supplied PNG is
1254x1254 and weighs 1.4 MB - the second-largest thing in the build, fetched
the moment the player reaches the outpost.

It is rewritten as WebP, the format the game already ships for the naming
screen and every module sprite. The PNG stays in `source/` so the conversion
can be re-run at any size without regenerating the art.

    python tools/compress-rover-assets.py

Why these settings
------------------
The button is kept at 512x512, four times the largest size it is ever drawn
at, so it stays crisp on a high-density screen without carrying the source
resolution. At quality 90 the WebP is 58 KB against the PNG's 1.4 MB and the
two are indistinguishable side by side; the picture is a flat illustration
with a few hard black edges, which is exactly what WebP handles well.

The rover's looping animation is NOT converted. It is a GIF, it is the
original art, and GIF is the one format every browser plays without argument.
It is also 810 KB, but it is only fetched when the player opens the rover's
status window, so it is never on the critical path. The script checks that it
is still an animation, because a still frame there is a bug that looks like
a design choice.

The tool fails loudly rather than quietly shipping the wrong thing: if the
button's WebP is not a picture of the right size, or the animation has lost
its frames, it says so and exits non-zero.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ROVER_DIR = ROOT / "Assets" / "images" / "rover"
SOURCE_DIR = ROVER_DIR / "source"

# The button: source name -> (target name, size or None to keep, webp kwargs)
BUTTON = {
    "rbutton.png": ("rbutton.webp", (512, 512), {"quality": 90, "method": 6}),
}

# The animation is shipped as it is. It is only checked.
ANIMATION = "mars_rover_seamless_loop.gif"


def kib(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def convert_button() -> None:
    """Rewrite the button as WebP and prove the result is a picture."""
    for source_name, (target_name, size, webp_kwargs) in BUTTON.items():
        source = SOURCE_DIR / source_name
        target = ROVER_DIR / target_name

        if not source.exists():
            raise SystemExit(f"missing the original: {source}")

        image = Image.open(source).convert("RGBA")

        if size is not None:
            image = image.resize(size, Image.LANCZOS)

        image.save(target, format="WEBP", **webp_kwargs)

        print(f"{source_name} ({kib(source)}) -> {target_name} ({kib(target)})")

        written = Image.open(target)
        if written.format != "WEBP":
            raise SystemExit(f"{target_name} is a {written.format}, not a WebP")
        if written.size != (size or image.size):
            raise SystemExit(f"{target_name} is {written.size}, expected {size}")
        if target.stat().st_size >= source.stat().st_size:
            raise SystemExit(f"{target_name} is not smaller than {source_name}; the conversion did nothing")


def check_animation() -> None:
    """The animation must still be an animation, not one still frame."""
    path = ROVER_DIR / ANIMATION

    if not path.exists():
        raise SystemExit(f"missing the animation: {path}")

    image = Image.open(path)
    frames = getattr(image, "n_frames", 1)

    print(f"{ANIMATION} ({kib(path)}) -> {frames} frames")

    if frames < 2:
        raise SystemExit(
            f"{ANIMATION} has {frames} frame. The rover would stand still. "
            "The animation is shipped as the original GIF, so this means the file is wrong."
        )


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    convert_button()
    check_animation()


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        print(f"FAILED: {error}", file=sys.stderr)
        raise
