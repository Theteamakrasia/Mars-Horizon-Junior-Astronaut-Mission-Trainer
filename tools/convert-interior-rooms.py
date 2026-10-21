"""Convert the six spacecraft-interior room stills to WebP.

The six source PNGs are the room art supplied with the mission-trainer brief.
They live outside the repo (the PNGs are about 2 MB each), so this tool takes the
folder they were supplied in and writes the committed WebPs under
Assets/images/interior/rooms/.

    python tools/convert-interior-rooms.py --source "D:\\art\\nasa"

The images are about 1670x940 and the game stage is 16:9, so nothing is resized.
At quality 82 each still lands at roughly 160-260 KB without a visible loss at
stage size.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Assets" / "images" / "interior" / "rooms"

# (source file relative to the supplied folder, output name). The order is the
# tour order, so this list reads the same as ROOMS in features/interior/model.ts.
ROOMS = [
    ("cabin/Chibi Astronaut in Orion\u2019s Cabin.png", "cabin.webp"),
    ("transit habitant/Spacecraft Common Area and Galley.png", "galley.webp"),
    ("transit habitant/Space Station Crew Sleep Module.png", "sleep.webp"),
    ("transit habitant/Futuristic NASA Research Lab Interior.png", "lab.webp"),
    ("LOGISTICS  SAFE HAVEN/Symmetrical Sci-Fi Cargo Bay Interior.png", "logistics.webp"),
    ("LOGISTICS  SAFE HAVEN/Orbital Science Lab and Crew Lounge.png", "haven.webp"),
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="folder holding the supplied room PNGs",
    )
    parser.add_argument("--quality", type=int, default=82, help="WebP quality")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)

    for relative, name in ROOMS:
        source = args.source / relative

        if not source.exists():
            raise SystemExit(f"missing source image: {source}")

        image = Image.open(source).convert("RGB")
        target = OUT / name
        image.save(target, "WEBP", quality=args.quality, method=6)

        size_kb = target.stat().st_size // 1024
        print(f"wrote {target.relative_to(ROOT)} ({size_kb} KB, {image.width}x{image.height})")


if __name__ == "__main__":
    main()
