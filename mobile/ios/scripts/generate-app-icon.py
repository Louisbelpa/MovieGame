#!/usr/bin/env python3
"""Generate iOS AppIcon PNGs from the Aperture diaphragm mark (matches ApertureIconView / web SVG)."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "GuessToday/Resources/Assets.xcassets/AppIcon.appiconset"

# Brand colours (Theme / ApertureIconView)
BG_TOP = (0x3A, 0x2D, 0x18)
BG_MID = (0x15, 0x11, 0x0A)
BG_BOT = (0x07, 0x06, 0x05)
GOLD_TOP = (0xFC, 0xD9, 0x82)
GOLD_BOT = (0xA4, 0x72, 0x25)
STROKE = (0x15, 0x11, 0x0A)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def radial_background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    cx = cy = size / 2
    max_r = size * 0.72
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy - size * 0.06
            d = math.hypot(dx, dy) / max_r
            t = min(1.0, d)
            if t < 0.55:
                u = t / 0.55
                c = lerp_rgb(BG_TOP, BG_MID, u)
            else:
                u = (t - 0.55) / 0.45
                c = lerp_rgb(BG_MID, BG_BOT, u)
            px[x, y] = c
    return img


def gold_at(y: float, y_top: float, y_bot: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, (y - y_top) / (y_bot - y_top) if y_bot > y_top else 0.5))
    return lerp_rgb(GOLD_TOP, GOLD_BOT, t)


def render_aperture(size: int) -> Image.Image:
    img = radial_background(size)
    draw = ImageDraw.Draw(img)
    cx = cy = size / 2
    r = size * 0.293
    r_inner = size * 0.254
    stroke_w = max(1, int(size * 0.008))
    y_top = cy - r
    y_bot = cy + r

    blades: list[list[tuple[float, float]]] = []
    for i in range(6):
        tip_angle = i * math.pi / 3 - math.pi / 2
        tip = (cx + math.cos(tip_angle) * r, cy + math.sin(tip_angle) * r)
        right_angle = tip_angle + math.pi / 3
        right = (cx + math.cos(right_angle) * r_inner, cy + math.sin(right_angle) * r_inner)
        center = (cx, cy)
        blades.append([tip, right, center])

    for poly in blades:
        ys = [p[1] for p in poly]
        fill = gold_at(sum(ys) / 3, y_top, y_bot)
        draw.polygon(poly, fill=fill, outline=STROKE, width=stroke_w)

    hole_r = size * 0.035
    dot_r = size * 0.012
    draw.ellipse(
        (cx - hole_r, cy - hole_r, cx + hole_r, cy + hole_r),
        fill=STROKE,
    )
    draw.ellipse(
        (cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r),
        fill=gold_at(cy, y_top, y_bot),
    )
    return img


def write_icon(size: int, filename: str) -> None:
    img = render_aperture(size)
    path = OUT / filename
    img.save(path, "PNG", optimize=True)
    print(f"  {filename} ({size}×{size})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Single 1024 universal icon (Xcode 15+)
    write_icon(1024, "AppIcon-1024.png")

    contents = {
        "images": [
            {
                "filename": "AppIcon-1024.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            }
        ],
        "info": {"author": "xcode", "version": 1},
    }
    (OUT / "Contents.json").write_text(json.dumps(contents, indent=2) + "\n", encoding="utf-8")

    # Root asset catalog marker
    catalog = ROOT / "GuessToday/Resources/Assets.xcassets"
    catalog.mkdir(parents=True, exist_ok=True)
    root_contents = {"info": {"author": "xcode", "version": 1}}
    root_json = catalog / "Contents.json"
    if not root_json.exists():
        root_json.write_text(json.dumps(root_contents, indent=2) + "\n", encoding="utf-8")

    print(f"App icons written to {OUT}")


if __name__ == "__main__":
    main()
