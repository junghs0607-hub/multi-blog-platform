"""피사체 키트: 9종의 주인공/중심 피사체 (스타일 팔레트·선처리 주입)."""
from __future__ import annotations
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from .common import hex_to_rgb, mix_color, clamp, smoothstep, ease_out


def draw_orb(d: ImageDraw.ImageDraw, img: Image, cx, cy, r, pal, glow_amt=0.0):
    if glow_amt > 0:
        g = Image.new("RGBA", img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gr = r * 2.2
        gd.ellipse([cx - gr, cy - gr, cx + gr, cy + gr],
                   fill=hex_to_rgb(pal["accent"]) + (int(90 * glow_amt),))
        g = g.filter(ImageFilter.GaussianBlur(int(r * 0.4)))
        base = Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")
        img.paste(base)
    d.ellipse([cx - r, cy - r, cx + r, cy + gr if False else cy + r], fill=hex_to_rgb(pal["accent"]),
              outline=hex_to_rgb(pal["fg"]), width=max(1, int(r * 0.08)))
    d.ellipse([cx - r * 0.35, cy - r * 0.45, cx - r * 0.05, cy - r * 0.15],
              fill=(255, 255, 255, 220) if False else (255, 255, 255))


def draw_mountains(d: ImageDraw.ImageDraw, W, H, pal, horizon=0.62, seed=0,
                   line_w=3, silhouette=None):
    rng = np.random.default_rng(seed)
    n = 5
    peaks = [0.25 + rng.random() * 0.25 for _ in range(n)]
    for layer in range(3):
        pts = [(0, H)]
        for i in range(n + 1):
            x = W * i / n
            y = H * (horizon - peaks[i % n] * (0.5 + layer * 0.25) - layer * 0.03)
            pts.append((x, y))
        pts.append((W, H))
        c = silhouette or mix_color(hex_to_rgb(pal["bg"]), hex_to_rgb(pal["fg"]), 0.25 + layer * 0.2)
        d.polygon(pts, fill=c, outline=hex_to_rgb(pal["fg"]) if layer == 2 else None)


def draw_sun(d, cx, cy, r, pal, rays=False):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hex_to_rgb(pal["accent"]),
              outline=hex_to_rgb(pal["fg"]), width=2)
    if rays:
        for i in range(12):
            a = i * math.pi / 6
            d.line([cx + math.cos(a) * r * 1.2, cy + math.sin(a) * r * 1.2,
                    cx + math.cos(a) * r * 1.5, cy + math.sin(a) * r * 1.5],
                   fill=hex_to_rgb(pal["accent"]), width=3)


def draw_city(d: ImageDraw.ImageDraw, W, H, pal, seed=0, windows=True, ground=0.85):
    rng = np.random.default_rng(seed)
    x = 0
    base = H * ground
    bc = mix_color(hex_to_rgb(pal["bg"]), hex_to_rgb(pal["fg"]), 0.55)
    while x < W:
        bw = W * (0.05 + rng.random() * 0.08)
        bh = H * (0.15 + rng.random() * 0.35)
        d.rectangle([x, base - bh, x + bw, base], fill=bc,
                    outline=hex_to_rgb(pal["fg"]), width=2)
        if windows:
            for wy in np.arange(base - bh + 8, base - 6, 12):
                for wx in np.arange(x + 5, x + bw - 5, 12):
                    if rng.random() < 0.5:
                        d.rectangle([wx, wy, wx + 5, wy + 6], fill=hex_to_rgb(pal["accent"]))
        x += bw + 2


def draw_traveler(d: ImageDraw.ImageDraw, cx, cy, s, pal, walk=0.0, line_w=3):
    """단순 캐릭터: 외투 입은 여행자."""
    fg, ac = hex_to_rgb(pal["fg"]), hex_to_rgb(pal["accent"])
    # 몸 (외투 삼각형)
    d.polygon([(cx, cy - s), (cx - s * 0.55, cy + s), (cx + s * 0.55, cy + s)],
              fill=ac, outline=fg, width=line_w)
    # 머리
    d.ellipse([cx - s * 0.28, cy - s * 1.65, cx + s * 0.28, cy - s * 1.1],
              fill=hex_to_rgb(pal["bg"]) if False else ac, outline=fg, width=line_w)
    # 다리 (걷기)
    sw = math.sin(walk * math.pi * 2) * s * 0.25
    d.line([cx, cy + s * 0.6, cx - s * 0.2 + sw, cy + s * 1.4], fill=fg, width=line_w)
    d.line([cx, cy + s * 0.6, cx + s * 0.2 - sw, cy + s * 1.4], fill=fg, width=line_w)
    # 지팡이
    d.line([cx + s * 0.7, cy - s * 0.5, cx + s * 0.5, cy + s * 1.3], fill=fg, width=line_w)


def draw_tree(d: ImageDraw.ImageDraw, cx, base, s, pal, grow=1.0, line_w=3):
    g = clamp(grow)
    fg = hex_to_rgb(pal["fg"])
    th = s * 1.6 * g
    d.line([cx, base, cx, base - th], fill=fg, width=max(2, int(s * 0.18)))
    if g > 0.35:
        cr = s * (0.9 + 0.3 * g)
        cy = base - th - cr * 0.4
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr],
                  fill=hex_to_rgb(pal["accent2"]), outline=fg, width=line_w)
        d.ellipse([cx - cr * 0.4, cy - cr * 0.5, cx + cr * 0.1, cy - cr * 0.1],
                  fill=hex_to_rgb(pal["accent"]))


def draw_chart(d: ImageDraw.ImageDraw, W, H, pal, p=1.0, seed=0, line_w=3):
    rng = np.random.default_rng(seed)
    vals = [0.3 + rng.random() * 0.7 for _ in range(7)]
    x0, y0 = W * 0.15, H * 0.78
    bw, gap = W * 0.08, W * 0.015
    fg = hex_to_rgb(pal["fg"])
    d.line([x0 - 20, y0, W * 0.9, y0], fill=fg, width=line_w)
    d.line([x0 - 20, y0, x0 - 20, H * 0.2], fill=fg, width=line_w)
    for i, v in enumerate(vals):
        h = H * 0.5 * v * clamp(p * 1.4 - i * 0.06)
        x = x0 + i * (bw + gap)
        c = hex_to_rgb(pal["accent"] if i % 2 == 0 else pal["accent2"])
        d.rectangle([x, y0 - h, x + bw, y0], fill=c, outline=fg, width=2)
    # 추세선
    pts = [(x0 + i * (bw + gap) + bw / 2, y0 - H * 0.5 * v * p) for i, v in enumerate(vals)]
    if p > 0.5:
        d.line(pts, fill=fg, width=line_w)


def draw_gears(d: ImageDraw.ImageDraw, cx, cy, r, pal, rot=0.0, teeth=10, line_w=3):
    fg = hex_to_rgb(pal["fg"])
    for i in range(teeth):
        a = rot + i * 2 * math.pi / teeth
        x1, y1 = cx + math.cos(a) * r * 0.85, cy + math.sin(a) * r * 0.85
        x2, y2 = cx + math.cos(a) * r * 1.15, cy + math.sin(a) * r * 1.15
        d.line([x1, y1, x2, y2], fill=fg, width=max(3, int(r * 0.18)))
    d.ellipse([cx - r * 0.85, cy - r * 0.85, cx + r * 0.85, cy + r * 0.85],
              outline=fg, width=line_w)
    d.ellipse([cx - r * 0.25, cy - r * 0.25, cx + r * 0.25, cy + r * 0.25], fill=fg)


def draw_waves(d: ImageDraw.ImageDraw, W, H, pal, t=0.0, rows=4, amp=0.03, base_y=0.6):
    for r in range(rows):
        y = H * (base_y + r * 0.08)
        pts = []
        for i in range(65):
            x = W * i / 64
            yy = y + math.sin(i * 0.4 + t * 3 + r * 1.3) * H * amp
            pts.append((x, yy))
        c = pal["accent"] if r % 2 == 0 else pal["accent2"]
        d.line(pts, fill=hex_to_rgb(c), width=4)
        pts = pts + [(W, H), (0, H)]
        d.polygon(pts, fill=hex_to_rgb(c) if r == rows - 1 else None)


def draw_rocket(d: ImageDraw.ImageDraw, cx, cy, s, pal, tilt=0.0, flame=1.0):
    fg = hex_to_rgb(pal["fg"])
    body = hex_to_rgb(pal["fg"]) if False else hex_to_rgb(pal["accent"])
    # 불꽃
    fl = s * (1.2 + 0.4 * flame)
    d.polygon([(cx - s * 0.3, cy + s), (cx + s * 0.3, cy + s), (cx, cy + s + fl)],
              fill=hex_to_rgb(pal["accent2"]))
    # 동체
    d.ellipse([cx - s * 0.45, cy - s * 1.4, cx + s * 0.45, cy + s], fill=body, outline=fg, width=3)
    # 창문
    d.ellipse([cx - s * 0.2, cy - s * 0.7, cx + s * 0.2, cy - s * 0.3],
              fill=(255, 255, 255), outline=fg, width=2)
    # 날개
    d.polygon([(cx - s * 0.4, cy + s * 0.2), (cx - s * 0.9, cy + s), (cx - s * 0.4, cy + s)],
              fill=hex_to_rgb(pal["accent2"]), outline=fg)
    d.polygon([(cx + s * 0.4, cy + s * 0.2), (cx + s * 0.9, cy + s), (cx + s * 0.4, cy + s)],
              fill=hex_to_rgb(pal["accent2"]), outline=fg)


def draw_subject(name: str, d, img: Image, W, H, cx, cy, s, pal, t=0.0,
                 seed=0, **kw):
    if name == "orb":
        yy = cy + math.sin(t * 2) * H * 0.01
        draw_orb(d, img, cx, yy, s, pal, glow_amt=kw.get("glow", 0))
    elif name == "landscape":
        draw_sun(d, W * 0.72, H * 0.3, s * 0.5, pal, rays=kw.get("rays", False))
        draw_mountains(d, W, H, pal, seed=seed, silhouette=kw.get("silhouette"))
    elif name == "city":
        draw_city(d, W, H, pal, seed=seed, windows=kw.get("windows", True))
    elif name == "traveler":
        draw_traveler(d, cx, cy, s, pal, walk=t, line_w=kw.get("line_w", 3))
    elif name == "tree":
        draw_tree(d, cx, cy, s, pal, grow=kw.get("grow", 1.0))
    elif name == "chart":
        draw_chart(d, W, H, pal, p=kw.get("progress", 1.0), seed=seed)
    elif name == "gears":
        draw_gears(d, cx - s, cy, s * 0.8, pal, rot=t)
        draw_gears(d, cx + s, cy - s * 0.3, s * 0.55, pal, rot=-t * 1.4)
    elif name == "waves":
        draw_waves(d, W, H, pal, t=t)
    elif name == "rocket":
        yy = cy - ease_out(clamp(t * 0.5)) * H * 0.1 if kw.get("launch", False) else cy
        draw_rocket(d, cx, yy, s, pal, flame=0.5 + 0.5 * math.sin(t * 20))
