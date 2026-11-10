"""Upscale the naming screen's planet and astronaut so they stay crisp full-screen.

The start screen is one picture edge to edge: the planet fills the right of the
window and the astronaut stands on the left, so both are drawn at roughly the
width of the viewport. The supplied art was 606x620 and 620x618, which means a
1920px window stretched it three times over - the craters turned to mush and
the planet read as a broken image rather than a planet.

This tool rebuilds both assets from the untouched originals kept in
`Assets/images/naming/source/`:

    python tools/upscale-naming-assets.py

The scale is a Lanczos resample followed by a light unsharp mask. Lanczos alone
leaves the enlarged edges soft, because it interpolates between the source
pixels it has; the unsharp pass restores the crater rims the eye reads as
detail. The originals are never edited, so the pipeline can be re-run at any
size without another generation step.

Why the two scales differ
-------------------------
The planet is drawn edge to edge and carries fine crater texture, so it is
enlarged 3x and lands at 1818x1860 - enough to fill a 1920px window at 1:1. The
astronaut is a smooth illustration with no fine texture, and 2x is already
indistinguishable from 3x at the size it is drawn, so it is enlarged 2x to keep
the bytes down.

Both files are written as WebP, the format the game already ships: the asset
cost of the entry screen goes from 125 KB to roughly 420 KB, which is one
download on the first screen and nothing after it.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "Assets" / "images" / "naming" / "source"
TARGET_DIR = ROOT / "Assets" / "images" / "naming"

# file name -> (scale factor, WebP quality)
ASSETS = {
    "mars.webp": (3, 85),
    "astronaut.webp": (2, 85),
}

# A light unsharp: enough to bring the crater rims back, not enough to ring
# around the limb of the planet.
RADIUS = 2
PERCENT = 90
THRESHOLD = 3


def rebuild(name: str, scale: int, quality: int) -> None:
    """Upscale one source asset and write it over the shipped file."""

    source = SOURCE_DIR / name
    target = TARGET_DIR / name

    if not source.exists():
        raise SystemExit(f"missing source art: {source}")

    with Image.open(source) as image:
        image = image.convert("RGBA")
        width, height = image.size

        enlarged = image.resize((width * scale, height * scale), Image.LANCZOS)
        sharpened = enlarged.filter(
            ImageFilter.UnsharpMask(radius=RADIUS, percent=PERCENT, threshold=THRESHOLD)
        )

        sharpened.save(target, "WEBP", quality=quality, method=6)

    print(
        f"{name}: {width}x{height} -> {width * scale}x{height * scale} "
        f"({target.stat().st_size // 1024} KB)"
    )


def main() -> None:
    for name, (scale, quality) in ASSETS.items():
        rebuild(name, scale, quality)


if __name__ == "__main__":
    main()
