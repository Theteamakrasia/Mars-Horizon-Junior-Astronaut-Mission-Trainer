#!/usr/bin/env python3
"""
Render the 3-second docking clip: the head of the spacecraft closing on the
body and mating with it.

Why a Python script
-------------------
The project has zero runtime dependencies and no browser automation. The three
frames are stills, so the clip is a *composite*, not an animation of live
content: the head is cut out of the separated frame, the black space behind it
rebuilt, and the sprite is moved across a headless background. Python 3.11 with
PIL, numpy and OpenCV is already installed on this machine, so this needs no new
dependency and no ffmpeg.

Deterministic by construction: every value is a function of the frame index, so
re-running the script produces a byte-identical clip.

Geometry is measured from the source frames (1670x942) and recorded here rather
than eyeballed, for the same reason launch/model.ts records its camera readings:
a number nobody can check is a number nobody can fix.

Usage
-----
    python tools/render-docking.py                 # writes Assets/video/docking.mp4
    python tools/render-docking.py --keyframes out # writes preview PNGs instead
"""

from __future__ import annotations

import argparse
import math
import os

import cv2
import numpy as np
from PIL import Image

# --------------------------------------------------------------------------
# Geometry, in the source frame (1670x942).
# --------------------------------------------------------------------------

W, H = 1670, 942
OUT_W, OUT_H = 1920, 1080
FPS = 30
TOTAL_S = 3.0
FRAMES = int(round(TOTAL_S * FPS))

# The head's bounding box in the separated frame. Wide enough to include the
# ring, the four solar panels and the warm glow beside the docking ring, and
# verified to sit entirely over pure black space (R0 G0 B1-9), so the region can
# be filled black with no visible seam.
SPRITE_X0, SPRITE_Y0 = 1165, 148
SPRITE_X1, SPRITE_Y1 = 1625, 788

# The docking point: where the two rings meet. (66.5%, 52.0%) of the frame.
JOINT_X, JOINT_Y = 1110, 490

# How far the head travels to dock. The separated gap is ~90px and the ring
# inserts slightly into the body's port, so the head closes ~100px. The
# cross-correlation minimum of the two frames was flat between 96 and 114px, so
# this number is a starting point to be confirmed against the rendered frames.
DOCK_SHIFT = -100.0

# --------------------------------------------------------------------------
# Timeline, in seconds.
# --------------------------------------------------------------------------

FADE_IN_S = 0.30
APPROACH_START = 0.30
APPROACH_END = 1.80
CONTACT_T = 1.80
FLASH_DECAY_S = 0.25
SHOCK_DURATION_S = 0.50
SHOCK_RADIUS = 180.0
SHOCK_THICKNESS = 10.0

# Camera: a slow push-in on the joint.
CAM_SCALE_FROM = 1.00
CAM_SCALE_TO = 1.08

# Effects.
GLOW_RADIUS = 260.0
FLASH_RADIUS = 320.0
LATCH_RADIUS = 46.0

ASSET_DIR = os.path.join("Assets", "images", "docking")
DEFAULT_OUT = os.path.join("Assets", "video", "docking.mp4")

# `separated.webp` is the frame the clip is built from. `docked.webp` and
# `station.webp` are the other two source frames - the docked craft and the
# fully-assembled station - kept as the asset set and available as a final
# cross-dissolve target if the sprite alignment ever needs a clean landing.


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def smoothstep(x: float) -> float:
    """Slow start, slow stop. Reads as a gentle approach and a soft landing."""
    x = clamp(x)
    return x * x * (3.0 - 2.0 * x)


def load_frame(name: str) -> np.ndarray:
    path = os.path.join(ASSET_DIR, name)
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB")).astype(np.float32)


def build_head_sprite(sep: np.ndarray) -> Image.Image:
    """
    Cut the head out of the separated frame as an RGBA sprite.

    A luminance ramp gives soft edges, and connected-component filtering keeps
    only the head: the frame is full of stars, and every one of them is brighter
    than the head's dark solar panels, so a brightness-only mask would carry a
    handful of stars along for the ride.
    """
    crop = sep[SPRITE_Y0:SPRITE_Y1, SPRITE_X0:SPRITE_X1]
    lum = crop.mean(axis=2)

    # Soft ramp from 20 to 80 keeps the faint glow beside the ring.
    mask = (np.clip((lum - 20.0) / 60.0, 0.0, 1.0) * 255.0).astype(np.uint8)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    kept = np.zeros_like(mask)
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] >= 50:
            kept[labels == i] = mask[labels == i]

    alpha = cv2.GaussianBlur(kept.astype(np.float32) / 255.0, (0, 0), 1.5)
    rgba = np.dstack([crop.astype(np.uint8), (alpha * 255.0).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def build_background(sep: np.ndarray, sprite: Image.Image) -> np.ndarray:
    """
    The separated frame with the head erased.

    Inpainting the head's *shape* rather than filling its bounding box matters:
    the space around the head carries a subtle gradient, so a rectangular black
    fill is a visible rectangle. Filling only the head leaves the rest of the
    region as the original space, and the sprite is placed exactly where the
    head was, so nothing is left behind.

    The head sits ~70px above the Earth's limb (verified: the region is R0 G0
    B1-9), so the inpaint border is black space and no Earth has to be
    reconstructed.
    """
    alpha = np.asarray(sprite)[..., 3]
    shape_mask = (alpha > 40).astype(np.uint8) * 255
    # Dilate past the soft glow so no warm halo is left on the background.
    shape_mask = cv2.dilate(shape_mask, np.ones((7, 7), np.uint8), iterations=2)

    # Place the head-shaped mask into the full frame at the sprite's position.
    mask = np.zeros((H, W), np.uint8)
    sw, sh = sprite.size
    mask[SPRITE_Y0:SPRITE_Y0 + sh, SPRITE_X0:SPRITE_X0 + sw] = shape_mask

    bg = cv2.inpaint(sep.astype(np.uint8), mask, 3, cv2.INPAINT_TELEA)
    return bg.astype(np.float32)


def distance_field() -> np.ndarray:
    """Distance from the docking joint, precomputed once and reused per frame."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.sqrt((xx - JOINT_X) ** 2 + (yy - JOINT_Y) ** 2)


def paste_sprite(base: np.ndarray, sprite: Image.Image, dx: float, dy: float) -> np.ndarray:
    """Alpha-blend the sprite onto the base at (dx, dy), clipping at the edges."""
    sw, sh = sprite.size
    x0, y0 = int(round(dx)), int(round(dy))
    bx0, by0 = max(0, x0), max(0, y0)
    bx1, by1 = min(W, x0 + sw), min(H, y0 + sh)
    if bx1 <= bx0 or by1 <= by0:
        return base

    sx0, sy0 = bx0 - x0, by0 - y0
    sx1, sy1 = sx0 + (bx1 - bx0), sy0 + (by1 - by0)
    crop = np.asarray(sprite)[sy0:sy1, sx0:sx1].astype(np.float32)
    alpha = crop[..., 3:4] / 255.0
    region = base[by0:by1, bx0:bx1]
    base[by0:by1, bx0:bx1] = crop[..., :3] * alpha + region * (1.0 - alpha)
    return base


def add_radial(base: np.ndarray, dist: np.ndarray, radius: float, intensity: float,
               color: tuple[float, float, float], power: float = 2.0) -> np.ndarray:
    """Additive radial glow, 1 at the centre and 0 at `radius`."""
    g = np.clip(1.0 - dist / radius, 0.0, 1.0) ** power
    base += g[..., None] * (np.asarray(color, np.float32) * intensity)
    return base


def add_ring(base: np.ndarray, dist: np.ndarray, radius: float, thickness: float,
             intensity: float, color: tuple[float, float, float]) -> np.ndarray:
    """Additive ring at `radius`, Gaussian-falloff across `thickness`."""
    ring = np.exp(-((dist - radius) / thickness) ** 2)
    base += ring[..., None] * (np.asarray(color, np.float32) * intensity)
    return base


def apply_camera(img: np.ndarray, scale: float) -> np.ndarray:
    """
    Zoom `scale`x toward the joint, cropping back to the frame.

    Scaling about a point means the point stays put while everything else grows,
    which is what a camera push-in on the docking ring should do.
    """
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
    big = pil.resize((max(1, int(round(W * scale))), max(1, int(round(H * scale)))),
                     Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), (0, 0, 0))
    canvas.paste(big, (int(round(JOINT_X * (1.0 - scale))),
                       int(round(JOINT_Y * (1.0 - scale)))))
    return np.asarray(canvas).astype(np.float32)


def frame_at(t: float, bg: np.ndarray, sprite: Image.Image, dist: np.ndarray) -> np.ndarray:
    """One frame of the clip at time `t` seconds, as an RGB uint8 array."""
    base = bg.copy()

    # The approach: smoothstep from separated to docked.
    p = smoothstep((t - APPROACH_START) / (APPROACH_END - APPROACH_START))
    shift = DOCK_SHIFT * p

    # After contact the craft settles by a couple of pixels, decaying fast.
    if t >= CONTACT_T:
        dt = t - CONTACT_T
        shift += 2.5 * math.sin(dt * 2.0 * math.pi * 3.0) * math.exp(-dt * 8.0)

    base = paste_sprite(base, sprite, SPRITE_X0 + shift, SPRITE_Y0)

    # Warm glow beside the ring, building as the head closes.
    glow_i = 0.20 + 0.60 * p
    if t >= CONTACT_T:
        glow_i = max(0.0, 0.80 - (t - CONTACT_T) * 1.2)
    base = add_radial(base, dist, GLOW_RADIUS, glow_i, (255, 190, 120), power=2.5)

    # Contact flash.
    if t >= CONTACT_T:
        flash_i = max(0.0, 1.0 - (t - CONTACT_T) / FLASH_DECAY_S)
        base = add_radial(base, dist, FLASH_RADIUS, flash_i, (255, 255, 255), power=1.5)

    # Expanding shockwave ring.
    if CONTACT_T <= t <= CONTACT_T + SHOCK_DURATION_S:
        sp = (t - CONTACT_T) / SHOCK_DURATION_S
        base = add_ring(base, dist, SHOCK_RADIUS * sp, SHOCK_THICKNESS,
                        (1.0 - sp) * 0.9, (200, 230, 255))

    # The ring's latch lights, on from contact and breathing gently.
    if t >= CONTACT_T:
        latch_i = 0.5 + 0.3 * math.sin((t - CONTACT_T) * 2.0 * math.pi * 1.5)
        base = add_ring(base, dist, LATCH_RADIUS, 6.0, latch_i, (120, 255, 160))

    # Camera push-in over the joint.
    scale = CAM_SCALE_FROM + (CAM_SCALE_TO - CAM_SCALE_FROM) * smoothstep(t / TOTAL_S)
    base = apply_camera(base, scale)

    # Fade in from black.
    base *= clamp(t / FADE_IN_S)

    return np.clip(base, 0, 255).astype(np.uint8)


def render_video(out_path: str, bg: np.ndarray, sprite: Image.Image, dist: np.ndarray) -> None:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (OUT_W, OUT_H))
    if not writer.isOpened():
        raise RuntimeError(f"could not open video writer for {out_path}")

    try:
        for i in range(FRAMES):
            t = i / FPS
            frame = frame_at(t, bg, sprite, dist)
            frame = cv2.resize(frame, (OUT_W, OUT_H), interpolation=cv2.INTER_LANCZOS4)
            writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
            if i % 15 == 0:
                print(f"  frame {i + 1}/{FRAMES}")
    finally:
        writer.release()

    print(f"wrote {out_path}")


def dump_keyframes(out_dir: str, bg: np.ndarray, sprite: Image.Image, dist: np.ndarray) -> None:
    os.makedirs(out_dir, exist_ok=True)
    for t in (0.0, 0.9, 1.8, 2.4, 3.0):
        frame = frame_at(t, bg, sprite, dist)
        Image.fromarray(frame).save(os.path.join(out_dir, f"key_{t:.1f}.png"))
    print(f"wrote keyframes to {out_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default=DEFAULT_OUT, help="output video path")
    parser.add_argument("--keyframes", metavar="DIR",
                        help="write preview PNGs to DIR instead of rendering a video")
    args = parser.parse_args()

    print("loading assets")
    sep = load_frame("separated.webp")
    sprite = build_head_sprite(sep)
    bg = build_background(sep, sprite)
    dist = distance_field()

    if args.keyframes:
        dump_keyframes(args.keyframes, bg, sprite, dist)
    else:
        render_video(args.out, bg, sprite, dist)


if __name__ == "__main__":
    main()
