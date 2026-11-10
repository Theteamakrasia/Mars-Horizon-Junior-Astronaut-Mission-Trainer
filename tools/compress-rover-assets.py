"""Shrink the rover's two assets so the outpost screens stay quick.

The rover button is drawn at 56-84 CSS pixels, but the supplied PNG is
1254x1254 and weighs 1.4 MB - the second-largest thing in the build, fetched
the moment the player reaches the outpost. The rover's looping animation is
380x250 and weighs 790 KB.

Both are rewritten as WebP, the format the game already ships for the naming
screen and every module sprite. The PNG and the GIF stay in `source/` so the
pipeline can be re-run at any size without regenerating the art.

    python tools/compress-rover-assets.py

Why these sizes and settings
----------------------------
The button is kept at 512x512, four times the largest size it is ever drawn
at, so it stays crisp on a high-density screen without carrying the source
resolution. At quality 90 the WebP is 58 KB against the PNG's 1.4 MB and the
two are indistinguishable side by side; the picture is a flat illustration with
a few hard black edges, which is exactly what WebP handles well.

The animation keeps its own 380x250. It is a small wide strip in a narrow
window, and shrinking it would blur the wheels. Saved as an animated WebP it
comes to 21 KB against the GIF's 790 KB, because the sixteen frames are nearly
identical and WebP codes them as one picture with small updates.

The original files are written to `source/` once and never edited, so a
re-run always starts from the same art.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
ROVER_DIR = ROOT / "Assets" / "images" / "rover"
SOURCE_DIR = ROVER_DIR / "source"

# source name -> (target name, size or None to keep, webp kwargs)
ASSETS = {
    "rbutton.png": ("rbutton.webp", (512, 512), {"quality": 90, "method": 6}),
    "mars_rover_seamless_loop.gif": (
        "mars_rover_seamless_loop.webp",
        None,
        {"quality": 80, "method": 6},
    ),
}


def kib(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def save_webp(image: Image.Image, target: Path, webp_kwargs: dict[str, object]) -> None:
    """Save one picture, or every frame of an animation with its own timing."""
    if getattr(image, "is_animated", False):
        frames = [frame.convert("RGB").copy() for frame in ImageSequence.Iterator(image)]
        durations = [frame.info.get("duration", 100) or 100 for frame in ImageSequence.Iterator(image)]
        frames[0].save(target, format="WEBP", save_all=True, loop=0, duration=durations, **webp_kwargs)

        return

    image.save(target, format="WEBP", **webp_kwargs)


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    for source_name, (target_name, size, webp_kwargs) in ASSETS.items():
        source = ROVER_DIR / source_name
        target = ROVER_DIR / target_name

        if not source.exists():
            print(f"skip {source_name}: not found")
            continue

        # Keep the original once, so the conversion can be re-run.
        kept = SOURCE_DIR / source_name
        if not kept.exists():
            kept.write_bytes(source.read_bytes())

        image = Image.open(source)

        if size is not None:
            image = image.convert("RGBA").resize(size, Image.LANCZOS)

        save_webp(image, target, webp_kwargs)

        print(f"{source_name} ({kib(source)}) -> {target_name} ({kib(target)})")


if __name__ == "__main__":
    main()
