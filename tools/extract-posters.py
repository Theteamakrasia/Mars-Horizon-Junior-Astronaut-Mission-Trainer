"""Extract a poster frame from each launch film.

The launch screen stacks three videos and fades each in over the one before it.
None of them carries a `poster`, so before a frame is decoded the element is
transparent and the fade reveals black - the symptom reported on a slow
connection (ISS-030). This writes one WebP per film, at a frame chosen to be
the picture that should be on screen while the clip is still buffering.

The frame is deliberately not always the first one: the tour opens on black by
design, so its poster is the title card a moment in. The launch film and the
docking clip use the same frames the reduced-motion path already holds (0.5s
and 2.4s), so the poster is the picture a motion-sensitive player sees.

    python tools/extract-posters.py
"""
import argparse
import os

import av
from PIL import Image

# (source, seconds, output). One row per film, in play order.
POSTERS = [
    ("Assets/images/launch/launch-cinematic.mp4", 0.5,
     "Assets/images/launch/launch-poster.webp"),
    ("Assets/video/docking.mp4", 2.4, "Assets/video/docking-poster.webp"),
    ("Assets/video/parts.mp4", 0.3, "Assets/video/parts-poster.webp"),
]

# The stage is min(100vw, 100vh*16/9); 1280 is above any laptop that would still
# be on a slow link, and a poster is a still, not the film.
POSTER_W = 1280


def frame_at(path: str, seconds: float) -> Image.Image:
    """Decode forward and return the first frame at or after `seconds`."""
    container = av.open(path)
    try:
        for frame in container.decode(container.streams.video[0]):
            if frame.time is not None and frame.time >= seconds:
                return frame.to_image()
    finally:
        container.close()

    raise SystemExit(f"{path}: no frame at {seconds}s")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--width", type=int, default=POSTER_W,
                        help="poster width in pixels")
    args = parser.parse_args()

    for src, seconds, out in POSTERS:
        image = frame_at(src, seconds)
        if image.width > args.width:
            height = round(image.height * args.width / image.width)
            image = image.resize((args.width, height), Image.Resampling.LANCZOS)

        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        image.save(out, "WEBP", quality=88, method=6)
        print(f"wrote {out} ({os.path.getsize(out) // 1024} KB, {image.width}x{image.height})")


if __name__ == "__main__":
    main()
