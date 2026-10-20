#!/usr/bin/env python3
"""
Render the "meet the spacecraft" segment: what each part of the craft is, with
its highlighted segment and a short description.

Pacing is the whole point of this segment. Each part is held for BEAT_S seconds
so the description can be read, and the total runtime is derived from that
rather than typed beside it where the two could disagree.

Why a second script
-------------------
`tools/render-docking.py` composites a sprite over a headless background. This
segment is a labelled cross-dissolve sequence - four stills of the same render,
each with a different part outlined, plus an overview shot. The two problems have
nothing in common, so forcing them into one renderer would make both worse. Same
toolchain, though: PIL + numpy + cv2, already installed, no new dependency.

The four part stills are one base render with a different outline baked in, so
they cross-dissolve cleanly. The overview is a *separate* render - the craft is
the same scale in it, but its baked label cards sit at different positions from
the stills', so a cross-dissolve would ghost both sets of cards. Its two
transitions fade through black instead.

The part names are already baked into each still's label card; the lower-third
repeats the name in its highlight colour and adds a one-line description, placed
below the hanging solar panels - clear of the craft and of every baked card. Arial
Bold, which matches the baked labels.

Usage
-----
    python tools/render-parts.py                 # writes Assets/video/parts.mp4
    python tools/render-parts.py --keyframes out # writes preview PNGs instead
"""

from __future__ import annotations

import argparse
import math
import os

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

# --------------------------------------------------------------------------
# Output and camera.
# --------------------------------------------------------------------------

W, H = 1920, 1080
FPS = 30

# The craft's centre, measured from the stills: its bright, low-saturation
# bounding box is x[3..1190] y[17..733] in the 1364x768 source, so the centre is
# (0.437, 0.488). A push-in anchored there keeps the craft framed while it grows.
ANCHOR_X, ANCHOR_Y = int(0.437 * W), int(0.488 * H)

CAM_SCALE_FROM = 1.00
CAM_SCALE_TO = 1.10

FADE_IN_S = 0.25
FADE_OUT_S = 0.25

# --------------------------------------------------------------------------
# The shots.
# --------------------------------------------------------------------------

TITLE = "MEET THE SPACECRAFT"

ASSET_DIR = os.path.join("Assets", "images", "parts")
DEFAULT_OUT = os.path.join("Assets", "video", "parts.mp4")

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"

SHOT_FILES = {
    "overview": "overview.webp",
    "propulsion": "propulsion.webp",
    "habitat": "habitat.webp",
    "logistics": "logistics.webp",
    "orion": "orion.webp",
}

# Each part: key, name (matches the baked label card), description, colour.
PARTS = [
    ("propulsion", "CORE PROPULSION STAGES",
     "Engines and fuel that push the craft toward Mars.", (255, 77, 77)),
    ("habitat", "TRANSIT HABITAT",
     "The crew's home for the months-long journey.", (46, 155, 255)),
    ("logistics", "LOGISTICS / SAFE HAVEN",
     "Cargo and spare parts, and a shelter from solar storms.", (255, 194, 51)),
    ("orion", "ORION CREW VEHICLE",
     "Carries the crew down to the surface and back.", (61, 220, 132)),
]

PART_BY_KEY = {key: (name, desc, color) for key, name, desc, color in PARTS}

# --------------------------------------------------------------------------
# Timeline. (start, end, kind, outgoing, incoming)
#
# Built, not typed: the pacing is what gets tuned, and a hand-written table can
# drift from the constants it was meant to express.
#
#   "hold"     one shot
#   "dissolve" cross-dissolve between two shots
#   "black"    fade out to black, then fade the next shot in. Used only for the
#              two overview bookends: the overview is a separate render whose
#              baked label cards sit at different positions from the four
#              stills', so a cross-dissolve ghosts both sets of cards at once.
#
# The overview is two shots, not one: "overview_intro" carries the title, and
# "overview" (the outro) carries none.
# --------------------------------------------------------------------------

INTRO_S = 1.4
BLACK_S = 0.22
BEAT_S = 2.0
DISSOLVE_S = 0.25
OUTRO_S = 1.4
PART_ORDER = ["propulsion", "habitat", "logistics", "orion"]


def build_segments() -> list[tuple[float, float, str, str, str]]:
    segments: list[tuple[float, float, str, str, str]] = []
    t = 0.0

    segments.append((t, t + INTRO_S, "hold", "overview_intro", None))
    t += INTRO_S
    segments.append((t, t + BLACK_S, "black", "overview_intro", PART_ORDER[0]))
    t += BLACK_S

    for i, key in enumerate(PART_ORDER):
        segments.append((t, t + BEAT_S, "hold", key, None))
        t += BEAT_S
        if i < len(PART_ORDER) - 1:
            segments.append((t, t + DISSOLVE_S, "dissolve", key, PART_ORDER[i + 1]))
            t += DISSOLVE_S

    segments.append((t, t + BLACK_S, "black", PART_ORDER[-1], "overview"))
    t += BLACK_S
    segments.append((t, t + OUTRO_S, "hold", "overview", None))
    return segments


SEGMENTS = build_segments()

# The runtime is the last segment's end, so it cannot disagree with the beats.
TOTAL_S = SEGMENTS[-1][1]
FRAMES = int(round(TOTAL_S * FPS))


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def smoothstep(x: float) -> float:
    x = clamp(x)
    return x * x * (3.0 - 2.0 * x)


def load_shot(key: str) -> Image.Image:
    """Every shot as a 1920x1080 RGB image. The title card is black."""
    if key == "title":
        return Image.new("RGB", (W, H), (0, 0, 0))
    file = SHOT_FILES["overview"] if key == "overview_intro" else SHOT_FILES[key]
    with Image.open(os.path.join(ASSET_DIR, file)) as im:
        return im.convert("RGB").resize((W, H), Image.LANCZOS)


def apply_camera(img: Image.Image, scale: float) -> Image.Image:
    """Zoom `scale`x toward the craft's centre, cropping back to the frame."""
    big = img.resize((max(1, int(round(W * scale))), max(1, int(round(H * scale)))),
                     Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), (0, 0, 0))
    canvas.paste(big, (int(round(ANCHOR_X * (1.0 - scale))),
                       int(round(ANCHOR_Y * (1.0 - scale)))))
    return canvas


def draw_bar(draw: ImageDraw.ImageDraw, bar_top: int, weight: float) -> None:
    """
    The lower-third gradient every piece of text sits on.

    It starts below the hanging solar panels (measured to reach y 0.859 of the
    frame) so the bar never covers the craft, and it fades in rather than starting
    as a hard edge.
    """
    for y in range(bar_top, H):
        frac = (y - bar_top) / (H - bar_top)
        draw.line([(0, y), (W, y)], fill=(6, 10, 18, int(255 * (0.30 + 0.44 * frac) * weight)))


BAR_TOP = int(H * 0.87)


def draw_title(weight: float) -> Image.Image:
    """
    The opening title, in the same lower-third bar as the descriptions.

    Centred on the overview it sat over the habitat module, which is the busiest
    part of the frame; the bar keeps the craft clear and matches the rest of the
    segment.
    """
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if weight <= 0:
        return overlay
    draw = ImageDraw.Draw(overlay)
    draw_bar(draw, BAR_TOP, weight)
    font = ImageFont.truetype(FONT_BOLD, 46)
    draw.text((64, BAR_TOP + 40), TITLE, font=font, fill=(255, 255, 255, int(255 * weight)))
    return overlay


def draw_description(key: str, weight: float) -> Image.Image:
    """The lower-third bar: part name in its highlight colour, description in white."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if weight <= 0:
        return overlay
    name, desc, color = PART_BY_KEY[key]
    draw = ImageDraw.Draw(overlay)
    draw_bar(draw, BAR_TOP, weight)

    name_font = ImageFont.truetype(FONT_BOLD, 28)
    desc_font = ImageFont.truetype(FONT_BOLD, 32)
    x = 64
    draw.text((x, BAR_TOP + 14), name, font=name_font, fill=(*color, int(255 * weight)))
    draw.text((x, BAR_TOP + 48), desc, font=desc_font, fill=(255, 255, 255, int(255 * weight)))
    return overlay


def segment_at(t: float) -> tuple[float, float, str, str, str]:
    for segment in SEGMENTS:
        if segment[0] <= t < segment[1]:
            return segment
    return SEGMENTS[-1]


def weights_for(t: float) -> dict[str, float]:
    """Which shots are on screen at `t`, and how much of each."""
    start, end, kind, outgoing, incoming = segment_at(t)
    if kind == "hold":
        return {outgoing: 1.0}
    if kind == "dissolve":
        frac = (t - start) / (end - start)
        return {outgoing: 1.0 - frac, incoming: frac}
    # "black": fade the outgoing shot out over the first half, the incoming in
    # over the second. At the midpoint both weights are zero, which is the black.
    half = (end - start) / 2.0
    if t < start + half:
        return {outgoing: 1.0 - smoothstep((t - start) / half)}
    return {incoming: smoothstep((t - start - half) / half)}


def overlay_weights_for(t: float) -> dict[str, float]:
    """
    How much of each shot's *text* is on screen at `t`.

    Separate from the image blend on purpose. A cross-dissolve puts both shots'
    description bars at the same place at once, and two overlapping lower-thirds
    read as a smudge. The outgoing bar therefore fades out over the first half of
    the dissolve and the incoming one fades in over the second, so only one is
    ever on screen.
    """
    start, end, kind, outgoing, incoming = segment_at(t)
    if kind == "hold":
        return {outgoing: 1.0}
    half = (end - start) / 2.0
    weights: dict[str, float] = {}
    if t < start + half:
        weights[outgoing] = 1.0 - smoothstep((t - start) / half)
    else:
        weights[incoming] = smoothstep((t - start - half) / half)
    return weights


def frame_at(t: float, shots: dict[str, Image.Image]) -> np.ndarray:
    weights = weights_for(t)

    # Blend the shots, then move the camera once over the result.
    base = np.zeros((H, W, 3), np.float32)
    for key, weight in weights.items():
        if weight > 0:
            base += weight * np.asarray(shots[key]).astype(np.float32)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")

    # The title card is flat; the camera is only meaningful over the stills.
    if "title" not in weights:
        scale = CAM_SCALE_FROM + (CAM_SCALE_TO - CAM_SCALE_FROM) * (t / TOTAL_S)
        img = apply_camera(img, scale)

    # Overlays are drawn after the camera so the text never zooms, and their
    # weights are staggered so two bars never overlap.
    out = img.convert("RGBA")
    for key, weight in overlay_weights_for(t).items():
        if weight <= 0:
            continue
        if key == "title" or key == "overview_intro":
            overlay = draw_title(weight)
        elif key in PART_BY_KEY:
            overlay = draw_description(key, weight)
        else:
            continue
        out = Image.alpha_composite(out, overlay)

    frame = np.asarray(out.convert("RGB")).astype(np.float32)

    # Fade in from black and out to black.
    frame *= clamp(t / FADE_IN_S)
    if t > TOTAL_S - FADE_OUT_S:
        frame *= clamp((TOTAL_S - t) / FADE_OUT_S)

    return np.clip(frame, 0, 255).astype(np.uint8)


def render_video(out_path: str, shots: dict[str, Image.Image]) -> None:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError(f"could not open video writer for {out_path}")
    try:
        for i in range(FRAMES):
            frame = frame_at(i / FPS, shots)
            writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
            if i % 30 == 0:
                print(f"  frame {i + 1}/{FRAMES}")
    finally:
        writer.release()
    print(f"wrote {out_path}")


def dump_keyframes(out_dir: str, shots: dict[str, Image.Image]) -> None:
    os.makedirs(out_dir, exist_ok=True)
    for t in (0.0, 0.7, 1.45, 2.6, 3.7, 4.8, 6.0, 7.0, 8.2, 9.2, 10.4, 10.5, 11.2, 11.9):
        Image.fromarray(frame_at(t, shots)).save(
            os.path.join(out_dir, f"key_{t:.2f}.png"))
    print(f"wrote keyframes to {out_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default=DEFAULT_OUT, help="output video path")
    parser.add_argument("--keyframes", metavar="DIR",
                        help="write preview PNGs to DIR instead of rendering a video")
    args = parser.parse_args()

    print("loading shots")
    keys = ["overview_intro", "overview", *SHOT_FILES]
    shots = {key: load_shot(key) for key in keys}

    if args.keyframes:
        dump_keyframes(args.keyframes, shots)
    else:
        render_video(args.out, shots)


if __name__ == "__main__":
    main()
