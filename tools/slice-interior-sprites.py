"""Slice the astronaut movement sheet into six horizontal animation strips.

The supplied sheet (1536x1024) is a labelled contact sheet, not a game sprite
sheet: it has a title above every row, a number under every frame, and the
frames are neither evenly spaced nor the same size. Using it directly as a CSS
background would show the labels and make the character jump.

This tool cuts each pose out by its measured alpha bounding box, normalises the
pose to one character height, plants the feet on one baseline, centres the feet
in a common cell, and writes one strip per animation. The game then steps through
a strip with CSS `steps()`, so there is no per-frame JavaScript and no baked
label can leak into the screen.

    python tools/slice-interior-sprites.py

The crop boxes below were measured from the supplied sheet with a connected
component pass over alpha > 12, area > 5000, sorted by row then x. They are
recorded rather than guessed: the sheet has a different number of pixels between
frames and the row labels sit only 40 px above the next row. A frame that drifts
by a few pixels cuts a foot or catches a number.

Why the heights are normalised
------------------------------
The three rows are drawn at different scales: the walk rows are ~277 px tall,
the interact row ~220 px, and the one-arm row ~212 px. Switching from a walk to a
point at raw scale would shrink the character by a fifth in one frame. Each
animation is scaled by REFERENCE_HEIGHT / its tallest pose, so the character
stays the same size across all six strips.

Why the feet are centred, not the bounding box
----------------------------------------------
A pointing arm makes the bounding box wider on one side. Centring the box would
slide the body away from the arm. The bottom 15% of the pose is the feet, and
their midpoint is the character's stance; that is what sits at the cell centre.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Assets" / "images" / "interior" / "source" / "astronaut_sprite_sheet.webp"
OUT = ROOT / "Assets" / "images" / "interior" / "sprite"

# The sheet this tool was measured against. A different sheet must be re-measured,
# not silently sliced with these boxes.
SHEET_SIZE = (1536, 1024)

# One cell per frame. 260 wide holds the widest normalised pose (the interact
# frame, 177 px at 1.262x = 223 px) with room for the extended arm. 340 tall
# holds the tallest pose (279 px) plus 8 px of floor clearance below the feet.
CELL_W = 260
CELL_H = 340
FOOT_PAD = 8

# The tallest walk pose. Every animation is scaled to this character height.
REFERENCE_HEIGHT = 279

# (x, y, width, height) in the source sheet, in animation order.
ANIMATIONS: list[tuple[str, list[tuple[int, int, int, int]]]] = [
    (
        "walk-right",
        [
            (55, 65, 149, 277),
            (252, 65, 140, 278),
            (437, 66, 135, 277),
            (622, 65, 131, 278),
            (797, 66, 133, 277),
            (969, 66, 134, 277),
            (1160, 65, 132, 279),
            (1338, 66, 143, 277),
        ],
    ),
    (
        "walk-left",
        [
            (65, 432, 131, 266),
            (252, 430, 130, 269),
            (437, 430, 129, 269),
            (621, 430, 125, 268),
            (797, 430, 131, 268),
            (978, 430, 127, 268),
            (1171, 431, 128, 266),
            (1351, 430, 128, 268),
        ],
    ),
    (
        "interact",
        [
            (45, 778, 177, 219),
            (300, 777, 160, 221),
        ],
    ),
    (
        "interact-alt",
        [
            (586, 780, 136, 216),
            (811, 782, 112, 216),
        ],
    ),
    ("point-right", [(1081, 786, 150, 212)]),
    ("point-left", [(1322, 787, 149, 212)]),
]


def feet_centre(alpha: Image.Image) -> float:
    """Horizontal midpoint of the feet, taken from the bottom 15% of the pose."""
    width, height = alpha.size
    band = alpha.crop((0, int(height * 0.85), width, height))
    box = band.getbbox()

    if box is None:
        return width / 2

    return (box[0] + box[2]) / 2


def frame_cell(sheet: Image.Image, box: tuple[int, int, int, int], scale: float) -> Image.Image:
    """Cut one pose, scale it, and plant it in a transparent cell."""
    x, y, width, height = box
    pose = sheet.crop((x, y, x + width, y + height))

    feet = feet_centre(pose.getchannel("A")) * scale

    if scale != 1.0:
        pose = pose.resize(
            (round(width * scale), round(height * scale)),
            Image.Resampling.LANCZOS,
        )

    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    left = round(CELL_W / 2 - feet)
    top = CELL_H - FOOT_PAD - pose.height
    cell.paste(pose, (left, top), pose)

    return cell


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source sheet: {SOURCE}")

    sheet = Image.open(SOURCE).convert("RGBA")

    if sheet.size != SHEET_SIZE:
        raise SystemExit(
            f"{SOURCE} is {sheet.width}x{sheet.height}, expected "
            f"{SHEET_SIZE[0]}x{SHEET_SIZE[1]} — re-measure the crop boxes"
        )

    OUT.mkdir(parents=True, exist_ok=True)

    for name, boxes in ANIMATIONS:
        tallest = max(height for _, _, _, height in boxes)
        scale = REFERENCE_HEIGHT / tallest

        cells = [frame_cell(sheet, box, scale) for box in boxes]
        strip = Image.new("RGBA", (CELL_W * len(cells), CELL_H), (0, 0, 0, 0))

        for index, cell in enumerate(cells):
            strip.paste(cell, (index * CELL_W, 0), cell)

        target = OUT / f"{name}.webp"
        strip.save(target, "WEBP", quality=92, method=6)

        size_kb = target.stat().st_size // 1024
        print(
            f"wrote {target.relative_to(ROOT)} "
            f"({len(cells)} frame{'s' if len(cells) != 1 else ''}, "
            f"{strip.width}x{strip.height}, {size_kb} KB, scale {scale:.3f})"
        )


if __name__ == "__main__":
    main()
