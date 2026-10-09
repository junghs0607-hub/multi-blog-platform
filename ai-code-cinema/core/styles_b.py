"""스타일 렌더러 2부 (23~43)."""
from __future__ import annotations
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from .common import hex_to_rgb, mix_color, clamp, smoothstep, ease_out, get_font
from . import draw as D
from . import subjects as S
from .styles_a import place, subj

CHARS = " .:-=+*#%@"


def ascii_crt_terminal(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    small = D.solid(160, 90, pal["bg"])
    d = ImageDraw.Draw(small)
    mono = dict(pal, accent="#FFFFFF", accent2="#888888", fg="#FFFFFF")
    cx, cy, s = W * 0.5, H * 0.55, min(W, H) * 0.2
    S.draw_subject(ctx["scene"]["visual"].get("subject", "orb"), d, small, 160, 90,
                   80, 50, 22, mono, t=ctx["t"], seed=ctx["seed"])
    g = np.asarray(small.convert("L")).astype(np.float32) / 255.0
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    try:
        from PIL import ImageFont
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
                               max(8, H // 46))
    except Exception:
        f = get_font(max(8, H // 46))
    cw, chh = W / 80, H / 45
    for j in range(45):
        for i in range(80):
            v = g[int(j * 2), int(i * 2)]
            ch = CHARS[min(len(CHARS) - 1, int(v * len(CHARS)))]
            d.text((i * cw, j * chh), ch, font=f, fill=hex_to_rgb(pal["fg"]))
    d.text((12, H - 30), f"> SCENE_{ctx['scene']['scene_id']:02d} -- RUNNING", font=f,
           fill=hex_to_rgb(pal["accent2"]))
    arr = np.asarray(img).astype(np.float32) * D.flicker_gain(ctx["t"], ctx["seed"], 0.1)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return D.vignette(D.scanlines(D.glow(img, 6, 0.4), 0.3), 0.5)


def data_storytelling(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    for i in range(0, W, 48):
        d.line([i, 0, i, H], fill=(30, 55, 85), width=1)
    for i in range(0, H, 48):
        d.line([0, i, W, i], fill=(30, 55, 85), width=1)
    S.draw_chart(d, W, H, pal, p=ctx["lt"], seed=ctx["seed"])
    num = int(1240 + ctx["lt"] * 8760 + ctx["scene"]["scene_id"] * 137)
    f = get_font(max(24, int(H * 0.1)), bold=True)
    d.text((W * 0.06, H * 0.08), f"{num:,}", font=f, fill=hex_to_rgb(pal["accent"]))
    f2 = get_font(max(12, int(H * 0.03)))
    d.text((W * 0.06, H * 0.08 + H * 0.11), "DATA POINTS", font=f2, fill=(150, 180, 220))
    return img


def isometric_infographic(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    d.ellipse([W * 0.1, H * 0.72, W * 0.9, H * 0.92], fill=(200, 214, 222))
    n = 5
    for i in range(n):
        bx = W * (0.2 + i * 0.15)
        bh = H * (0.12 + 0.09 * ((i * 2 + ctx["scene"]["scene_id"]) % 4 + 1)) * clamp(ctx["lt"] * 1.5)
        bw, by = W * 0.05, H * 0.78
        top = hex_to_rgb(pal["accent"] if i % 2 == 0 else pal["accent2"])
        side = mix_color(top, (0, 0, 0), 0.25)
        d.polygon([(bx - bw, by - bh), (bx, by - bh - bw * 0.5), (bx + bw, by - bh),
                   (bx, by - bh + bw * 0.5)], fill=top)
        d.polygon([(bx - bw, by - bh), (bx, by - bh + bw * 0.5), (bx, by + bw * 0.5),
                   (bx - bw, by)], fill=side)
        d.polygon([(bx + bw, by - bh), (bx, by - bh + bw * 0.5), (bx, by + bw * 0.5),
                   (bx + bw, by)], fill=mix_color(top, (0, 0, 0), 0.4))
    f = get_font(max(14, int(H * 0.05)), bold=True)
    d.text((W * 0.08, H * 0.1), ctx["scene"].get("title", "INFO"), font=f,
           fill=hex_to_rgb(pal["fg"]))
    return img


def dark_tech_keynote(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.rgradient(W, H, "#0E0E14", pal["bg"], 0.5, 0.4)
    d = ImageDraw.Draw(img)
    cx, cy, s = place(ctx)
    for i in range(3):
        rr = s * (1.5 + i * 0.35 + 0.1 * math.sin(ctx["t"] * 2 + i))
        d.ellipse([cx - rr, cy - rr * 0.42, cx + rr, cy + rr * 0.42],
                  outline=hex_to_rgb(pal["accent"]), width=3)
    S.draw_orb(d, img, cx, cy, s * 0.8, pal, glow_amt=1.0)
    f = get_font(max(20, int(H * 0.08)), bold=True)
    t = ctx["scene"].get("title", "KEYNOTE")
    a = clamp(ctx["lt"] * 2.5)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).text((W * 0.08, H * 0.78), t, font=f,
                                 fill=(245, 245, 247, int(255 * a)))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    return D.vignette(D.glow(img, 12, 0.7), 0.5)


def living_screencast(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W * 0.1, H * 0.12, W * 0.9, H * 0.88], radius=14, fill=(255, 255, 255),
                        outline=(160, 175, 190), width=2)
    d.rectangle([W * 0.1, H * 0.12, W * 0.9, H * 0.2], fill=(230, 236, 242))
    for i, c in enumerate(["#FF5F57", "#FEBC2E", "#28C840"]):
        d.ellipse([W * 0.12 + i * 26, H * 0.14, W * 0.12 + i * 26 + 16, H * 0.14 + 16],
                  fill=hex_to_rgb(c))
    S.draw_chart(d, W, H, pal, p=ctx["lt"], seed=ctx["seed"])
    mx, my = W * (0.2 + 0.6 * ctx["lt"]), H * (0.4 + 0.15 * math.sin(ctx["lt"] * 9))
    d.polygon([(mx, my), (mx, my + 26), (mx + 8, my + 19), (mx + 13, my + 28),
               (mx + 17, my + 25), (mx + 12, my + 17), (mx + 20, my + 17)], fill=(30, 30, 30))
    if int(ctx["lt"] * 3) != int((ctx["lt"] - 0.01) * 3):
        d.ellipse([mx - 14, my - 14, mx + 14, my + 14], outline=hex_to_rgb(pal["accent"]), width=3)
    return img


def scifi_hologram_hud(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    cx, cy, s = W * 0.5, H * 0.52, min(W, H) * 0.24
    cy += math.sin(ctx["t"] * 1.5) * 6
    holo = hex_to_rgb(pal["accent"])
    d.ellipse([cx - s, cy - s, cx + s, cy + s], outline=holo, width=2)
    for k in range(4):
        off = (ctx["t"] * 40 + k * 90) % 360
        r = s * abs(math.cos(math.radians(off)))
        d.ellipse([cx - r, cy - s, cx + r, cy + s], outline=holo, width=1)
    for k in range(-2, 3):
        y = cy + k * s / 3
        wdt = s * math.cos(math.asin(max(-1, min(1, k / 3)))) if abs(k) < 3 else 0
        d.ellipse([cx - wdt, y - 3, cx + wdt, y + 3], outline=holo, width=1)
    for sx, sy in [(0.05, 0.06), (0.95, 0.06), (0.05, 0.94), (0.95, 0.94)]:
        x, y = W * sx, H * sy
        ln = 40
        dx = 1 if sx < 0.5 else -1
        dy = 1 if sy < 0.5 else -1
        d.line([x, y, x + dx * ln, y], fill=holo, width=3)
        d.line([x, y, x, y + dy * ln], fill=holo, width=3)
    f = get_font(max(10, int(H * 0.022)))
    d.text((W * 0.06, H * 0.1), f"SYS.ONLINE  T+{ctx['t']:05.1f}s  SC{ctx['scene']['scene_id']}",
           font=f, fill=holo)
    arr = np.asarray(img).astype(np.float32) * D.flicker_gain(ctx["t"], ctx["seed"], 0.08)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return D.scanlines(D.glow(img, 6, 0.6), 0.2)


def rubber_hose_1930s(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    cx, cy, s = place(ctx)
    bounce = abs(math.sin(ctx["lt"] * math.pi * 3)) * s * 0.15
    cy -= bounce
    fg = (26, 26, 26)
    d.ellipse([cx - s * 0.5, cy - s * 0.9, cx + s * 0.5, cy + s * 0.1], outline=fg, width=4)
    for ex in [-0.18, 0.18]:
        d.pieslice([cx + ex * s - s * 0.12, cy - s * 0.6, cx + ex * s + s * 0.12, cy - s * 0.36],
                   0, 360, fill=fg)
    d.arc([cx - s * 0.25, cy - s * 0.35, cx + s * 0.25, cy], 10, 170, fill=fg, width=4)
    wob = math.sin(ctx["t"] * 9) * s * 0.1
    d.line([cx - s * 0.5, cy - s * 0.1, cx - s * 1.1, cy + s * 0.3 + wob], fill=fg, width=5)
    d.line([cx + s * 0.5, cy - s * 0.1, cx + s * 1.1, cy + s * 0.3 - wob], fill=fg, width=5)
    d.line([cx - s * 0.2, cy + s * 0.1, cx - s * 0.35, cy + s * 0.9], fill=fg, width=6)
    d.line([cx + s * 0.2, cy + s * 0.1, cx + s * 0.35, cy + s * 0.9], fill=fg, width=6)
    arr = np.asarray(img).astype(np.float32) * D.flicker_gain(ctx["t"], ctx["seed"], 0.12)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return D.vignette(D.add_grain(img, rng, 0.5), 0.5)


def cel_anime_80s(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    top = hex_to_rgb("#1B2A4A") if ctx["scene"]["act"] != "change" else hex_to_rgb("#4A1B2A")
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for i in range(5):
        c = mix_color(top, hex_to_rgb("#FF7B4D"), i / 4)
        d.rectangle([0, H * i / 5, W, H * (i + 1) / 5], fill=c)
    sunr = min(W, H) * 0.16
    d.ellipse([W * 0.5 - sunr, H * 0.42 - sunr, W * 0.5 + sunr, H * 0.42 + sunr],
              fill=hex_to_rgb("#FFD23F"))
    for i in range(4):
        y = H * (0.42 + i * 0.03)
        d.rectangle([W * 0.5 - sunr, y, W * 0.5 + sunr, y + 4], fill=mix_color(top, (255, 123, 77), 0.7))
    for i in range(13):
        x = W * i / 12
        d.line([W / 2 + (x - W / 2) * 0.15, H * 0.62, x, H], fill=(255, 80, 120), width=2)
    for i in range(6):
        y = H * (0.62 + (i / 5) ** 1.5 * 0.38)
        d.line([0, y, W, y], fill=(255, 80, 120), width=2)
    subj(ctx, img, d, line_w=4)
    if ctx["scene"]["act"] == "change":
        for _ in range(26):
            x = rng.random() * W
            d.line([x, 0, x - 40, H * 0.3], fill=(255, 255, 255), width=2)
    from PIL import ImageOps
    img = ImageOps.posterize(img, 3)
    return D.add_grain(img, rng, 0.25)


def scifi_sitcom_toon(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    D.particles(d, rng, 70, W, H, ctx["t"], (255, 255, 255), 1, 2, 3, seed=ctx["seed"])
    d.rounded_rectangle([W * 0.55, H * 0.12, W * 0.9, H * 0.45], radius=20,
                        fill=(20, 20, 40), outline=hex_to_rgb(pal["accent"]), width=5)
    d.rounded_rectangle([W * 0.15, H * 0.55, W * 0.85, H * 0.85], radius=30,
                        fill=hex_to_rgb(pal["accent"]), outline=(60, 20, 80), width=6)
    for i, x in enumerate([0.32, 0.5, 0.68]):
        ax, ay = W * x, H * 0.52 + (i % 2) * 8
        bounce = abs(math.sin(ctx["t"] * 3 + i * 2)) * 8
        d.ellipse([ax - 45, ay - 55 - bounce, ax + 45, ay + 25 - bounce],
                  fill=(63, 224, 160), outline=(20, 60, 40), width=4)
        for ex in [-18, 18]:
            d.ellipse([ax + ex - 10, ay - 30 - bounce, ax + ex + 10, ay - 10 - bounce], fill=(255, 255, 255))
            d.ellipse([ax + ex - 4, ay - 24 - bounce, ax + ex + 4, ay - 16 - bounce], fill=(0, 0, 0))
    if int(ctx["lt"] * 2) % 2 == 1:
        f = get_font(max(20, int(H * 0.08)), bold=True)
        d.text((W * 0.1, H * 0.12), "HA HA!", font=f, fill=hex_to_rgb(pal["accent"]))
    return img


def midcentury_cartoon(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    for i in range(3):
        sx, sy = W * (0.15 + i * 0.35), H * 0.25
        for k in range(8):
            a = k * math.pi / 4 + ctx["lt"]
            d.line([sx, sy, sx + math.cos(a) * 40, sy + math.sin(a) * 40],
                   fill=hex_to_rgb(pal["accent"]), width=3)
    cx, cy, s = W * (0.3 + 0.4 * ctx["lt"]), H * 0.55, min(W, H) * 0.16
    d.rectangle([cx - s * 0.4, cy - s, cx + s * 0.4, cy + s], fill=hex_to_rgb(pal["accent2"]))
    d.ellipse([cx - s * 0.35, cy - s * 1.5, cx + s * 0.35, cy - s * 0.8],
              fill=hex_to_rgb(pal["accent"]))
    d.polygon([(cx - s * 0.4, cy + s), (cx + s * 0.4, cy + s), (cx, cy + s * 1.8)],
              fill=hex_to_rgb(pal["fg"]))
    return D.add_grain(img, rng, 0.3)


def pixel_rpg_16bit(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, "#306230", "#0F380F")
    d = ImageDraw.Draw(img)
    for ty in range(0, H, 32):
        for tx in range(0, W, 32):
            if (tx // 32 + ty // 32) % 2 == 0:
                d.rectangle([tx, ty, tx + 32, ty + 32], fill=(48, 110, 48))
    px = W * (0.2 + 0.6 * ctx["lt"])
    py = H * 0.45
    hop = abs(math.sin(ctx["lt"] * math.pi * 6)) * 10
    body = hex_to_rgb(pal["accent"])
    d.rectangle([px - 14, py - 30 - hop, px + 14, py + 10 - hop], fill=body, outline=(15, 56, 15), width=3)
    d.rectangle([px - 10, py - 44 - hop, px + 10, py - 30 - hop], fill=(155, 188, 15),
                outline=(15, 56, 15), width=3)
    img = D.pixelate(img, 4)
    return img


def _pixel_dialog_overlay(img: Image, ctx) -> Image:
    """스크린 공간 대화창 (카메라 영향 없음)."""
    W, H = img.size
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.06, H * 0.72, W * 0.94, H * 0.94], fill=(248, 248, 248),
                outline=(15, 56, 15), width=max(3, int(W * 0.004)))
    txt = ctx["scene"]["narration"]["text"]
    f = get_font(max(12, int(H * 0.032)))
    lines = D.wrap_text(d, txt, f, int(W * 0.8))
    shown = txt[:max(1, int(len(txt) * clamp(ctx["lt"] * 1.3)))]
    acc, out_lines = "", []
    for ln in lines:
        if len(acc) + len(ln) <= len(shown):
            out_lines.append(ln)
            acc += ln
        else:
            rest = shown[len(acc):]
            if rest:
                out_lines.append(rest)
            break
    for i, ln in enumerate(out_lines[:3]):
        d.text((W * 0.09, H * 0.77 + i * H * 0.05), ln, font=f, fill=(15, 56, 15))
    return img


pixel_rpg_16bit.screen_overlay = _pixel_dialog_overlay
pixel_rpg_16bit.replaces_subtitle = True


def hd_2d(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    for i in range(4):
        x = W * (0.15 + i * 0.25)
        d.polygon([(x - 60, H * 0.75), (x, H * 0.45), (x + 60, H * 0.75)], fill=(46, 58, 92))
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse([W * 0.7, H * 0.08, W * 0.7 + 130, H * 0.08 + 130],
                                fill=(255, 179, 71, 200))
    img = Image.alpha_composite(img.convert("RGBA"), sun).convert("RGB")
    d = ImageDraw.Draw(img)
    px = W * (0.3 + 0.4 * ctx["lt"])
    d.rectangle([px - 12, H * 0.6, px + 12, H * 0.72], fill=hex_to_rgb(pal["accent"]))
    d.rectangle([px - 9, H * 0.52, px + 9, H * 0.6], fill=(245, 233, 208))
    img = D.pixelate(img, 2)
    img = D.glow(img, 14, 0.5)
    d = ImageDraw.Draw(img)
    D.particles(d, rng, 50, W, H, ctx["t"], (255, 240, 200), 1, 3, 8, seed=ctx["seed"])
    return D.vignette(img, 0.4)


def microgame_frenzy(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    sub = int(ctx["lt"] * 5) % 5
    bgs = ["#FF4D6D", "#FFD23F", "#3FE0A0", "#4FD4FF", "#A855F7"]
    img = D.solid(W, H, bgs[sub])
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    if sub == 0:
        d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=(255, 255, 255))
        d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=hex_to_rgb(bgs[sub]))
    elif sub == 1:
        d.rectangle([cx - 100, cy - 60, cx + 100, cy + 60], fill=(17, 17, 17))
    elif sub == 2:
        d.polygon([(cx, cy - 100), (cx + 95, cy + 70), (cx - 95, cy + 70)], fill=(255, 255, 255))
    elif sub == 3:
        for i in range(5):
            d.ellipse([cx - 110 + i * 8, cy - 60, cx - 30 + i * 8, cy + 60],
                      outline=(255, 255, 255), width=6)
    else:
        f = get_font(max(30, int(H * 0.2)), bold=True)
        d.text((cx - 60, cy - 80), "GO!", font=f, fill=(255, 255, 255))
    remain = 1 - (ctx["lt"] * 5 % 1)
    d.rectangle([W * 0.1, H * 0.06, W * 0.1 + W * 0.8 * remain, H * 0.1], fill=(255, 255, 255))
    f2 = get_font(max(12, int(H * 0.035)), bold=True)
    d.text((W * 0.1, H * 0.12), f"GAME {sub + 1}/5", font=f2, fill=(255, 255, 255))
    return img


def game_show_flat(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    for i in range(5):
        x = W * (0.1 + i * 0.2)
        d.polygon([(x, 0), (x + 60, 0), (x + 120, H), (x + 40, H)], fill=(255, 255, 255, 30)
                  if False else (70, 90, 200))
    score = int(ctx["lt"] * 1000 + ctx["scene"]["scene_id"] * 250)
    f = get_font(max(30, int(H * 0.16)), bold=True)
    t = f"{score}"
    d.text((W / 2 - d.textlength(t, font=f) / 2, H * 0.2), t, font=f,
           fill=hex_to_rgb(pal["accent"]))
    for i in range(3):
        x = W * (0.25 + i * 0.25)
        d.rectangle([x - 70, H * 0.62, x + 70, H * 0.85], fill=(255, 255, 255),
                    outline=hex_to_rgb(pal["accent"]), width=5)
    D.particles(d, rng, 80, W, H, ctx["t"] * 2, hex_to_rgb(pal["accent"]), 2, 4, 120,
                seed=ctx["seed"])
    return img


def silent_film_1920s(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    if ctx["lt"] < 0.22:
        img = D.solid(W, H, "#0A0A0A")
        d = ImageDraw.Draw(img)
        f = get_font(max(18, int(H * 0.07)))
        t = ctx["scene"].get("title", "ACT")
        lines = D.wrap_text(d, t, f, int(W * 0.8))
        for i, ln in enumerate(lines):
            d.text((W / 2 - d.textlength(ln, font=f) / 2, H * 0.35 + i * H * 0.09),
                   ln, font=f, fill=(232, 224, 200))
    else:
        img = D.vgradient(W, H, "#3A3A3A", "#101010")
        d = ImageDraw.Draw(img)
        gray = dict(pal, accent="#C9C9C9", accent2="#8A8A8A", fg="#E8E0C8")
        subj(ctx, img, d, pal=gray, line_w=3)
    for _ in range(3):
        x = rng.random() * W
        ImageDraw.Draw(img).line([x, 0, x + (rng.random() - 0.5) * 8, H],
                                 fill=(200, 200, 200), width=1)
    arr = np.asarray(img).astype(np.float32) * D.flicker_gain(ctx["t"], ctx["seed"], 0.15)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img = D.letterbox(D.vignette(D.add_grain(img, rng, 0.6), 0.6), 0.06)
    return img


def liminal_found_footage(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, "#23262B", "#14161A")
    d = ImageDraw.Draw(img)
    vx = W * (0.5 + 0.06 * math.sin(ctx["t"] * 0.4))
    vy = H * 0.52
    for x in [0, W]:
        for y in [0, H]:
            d.line([x, y, vx, vy], fill=(60, 66, 72), width=3)
    for i in range(6):
        z = ((i / 6 + ctx["lt"] * 0.3) % 1)
        r = 8 + z * 120
        d.rectangle([vx - r * 1.6, vy - r - 60 * z, vx + r * 1.6, vy - r - 40 * z],
                    fill=(200, 210, 190))
    d.rectangle([0, H * 0.72, W, H], fill=(30, 33, 36))
    # VHS 트래킹 바
    band_y = int((ctx["t"] * 60) % (H + 120) - 60)
    if 0 <= band_y < H:
        y1 = min(H, band_y + 26)
        band = img.crop((0, band_y, W, y1))
        img.paste(band.transform(band.size, Image.AFFINE, (1, 0, 24, 0, 1, 0)),
                  (0, band_y))
    d = ImageDraw.Draw(img)
    f = get_font(max(12, int(H * 0.032)))
    d.text((W * 0.05, H * 0.06), "PM 02:13  OCT.09 2026  SP", font=f, fill=(220, 220, 220))
    d.text((W * 0.05, H * 0.11), "▶ PLAY", font=f, fill=(220, 220, 220))
    return D.vignette(D.add_grain(img, rng, 0.45), 0.55)


def brick_toy(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    d.ellipse([W * 0.15, H * 0.7, W * 0.85, H * 0.9], fill=(190, 180, 160))
    cx = W * 0.5
    base_y = H * 0.78
    cols = [pal["accent"], "#1D6FB8", "#FEBC2E", "#28C840"]
    rows = 2 + int(ctx["lt"] * 4)
    bw = 74
    for r in range(rows):
        y1 = base_y - (r + 1) * 34
        n = 4 - (r % 2)
        for i in range(n):
            x0 = cx - n * bw / 2 + i * bw + (bw / 2 if r % 2 else 0)
            c = hex_to_rgb(cols[(r + i) % len(cols)])
            d.rectangle([x0, y1, x0 + bw - 4, y1 + 30], fill=c, outline=(60, 60, 60), width=2)
            for sx in range(4):
                d.ellipse([x0 + 8 + sx * 16, y1 - 8, x0 + 20 + sx * 16, y1 + 2],
                          fill=c, outline=(60, 60, 60))
    return D.add_grain(img, rng, 0.08)


def paper_pop_up_book(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, "#E8DCC0", pal["bg"])
    d = ImageDraw.Draw(img)
    d.line([W / 2, 0, W / 2, H], fill=(150, 135, 110), width=6)
    d.polygon([(W / 2 - 40, 0), (W / 2 + 40, 0), (W / 2 + 20, H), (W / 2 - 20, H)],
              fill=(210, 195, 165))
    open_p = ease_out(clamp(ctx["lt"] * 1.4))
    for i in range(3):
        wdt = W * (0.3 - i * 0.07) * open_p
        hgt = H * (0.3 - i * 0.05) * open_p
        x0, y1 = W / 2 - wdt / 2, H * (0.72 - i * 0.1)
        c = [pal["accent2"], pal["accent"], "#F5E9D0"][i]
        d.polygon([(x0, y1), (x0 + wdt, y1), (x0 + wdt - 30 * open_p, y1 - hgt),
                   (x0 + 30 * open_p, y1 - hgt)], fill=hex_to_rgb(c),
                  outline=(74, 63, 48), width=3)
        d.polygon([(x0 + wdt, y1), (x0 + wdt + 24, y1 + 10), (x0 + wdt - 30 * open_p + 24, y1 - hgt + 10),
                   (x0 + wdt - 30 * open_p, y1 - hgt)], fill=(120, 105, 80))
    S.draw_tree(d, W / 2, H * 0.62, 40 * open_p + 4, pal, grow=open_p)
    return D.add_grain(img, ctx["rng"], 0.15)


def tilt_shift_miniature(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], "#D8E8F0")
    d = ImageDraw.Draw(img)
    S.draw_city(d, W, H, pal, seed=ctx["seed"], ground=0.72)
    S.draw_sun(d, W * 0.8, H * 0.2, 40, pal)
    from PIL import ImageEnhance
    img = ImageEnhance.Color(img).enhance(1.3)
    blur = img.filter(ImageFilter.GaussianBlur(9))
    m = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(m)
    md.rectangle([0, H * 0.36, W, H * 0.66], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(30))
    img = Image.composite(img, blur, m)
    return D.add_grain(img, rng, 0.1)


def lowpoly_isometric_island(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    float_y = math.sin(ctx["t"] * 1.2) * 8
    cx, cy = W / 2, H * 0.5 + float_y
    isl = min(W, H) * 0.34
    d.polygon([(cx - isl, cy), (cx, cy - isl * 0.5), (cx + isl, cy), (cx, cy + isl * 0.5)],
              fill=hex_to_rgb("#7FB069"))
    d.polygon([(cx - isl, cy), (cx, cy + isl * 0.5), (cx, cy + isl * 1.1)], fill=(90, 130, 80))
    d.polygon([(cx + isl, cy), (cx, cy + isl * 0.5), (cx, cy + isl * 1.1)], fill=(70, 105, 65))
    S.draw_tree(d, cx - isl * 0.3, cy - isl * 0.1, isl * 0.22, pal, grow=1.0)
    S.draw_tree(d, cx + isl * 0.35, cy, isl * 0.16, pal, grow=1.0)
    for i in range(3):
        bx = (ctx["t"] * 30 + i * W / 3) % (W + 100) - 50
        by = H * (0.2 + i * 0.1)
        d.ellipse([bx, by, bx + 90, by + 30], fill=(255, 255, 255, 220) if False else (255, 255, 255))
    d.ellipse([cx - isl * 1.2, cy + isl * 1.2, cx + isl * 1.2, cy + isl * 1.45],
              fill=(94, 177, 214))
    return D.add_grain(img, rng, 0.08)


def glass_product_render(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.rgradient(W, H, "#16202E", pal["bg"], 0.5, 0.35)
    d = ImageDraw.Draw(img)
    cx, cy, s = place(ctx)
    cy -= H * 0.03
    # 바닥 반사
    refl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(refl).ellipse([cx - s, cy + s * 0.9, cx + s, cy + s * 2.1],
                                 fill=hex_to_rgb(pal["accent"]) + (60,))
    refl = refl.filter(ImageFilter.GaussianBlur(12))
    img = Image.alpha_composite(img.convert("RGBA"), refl).convert("RGB")
    d = ImageDraw.Draw(img)
    d.line([0, cy + s * 1.05, W, cy + s * 1.05], fill=(60, 80, 110), width=2)
    glass = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass)
    gd.ellipse([cx - s, cy - s, cx + s, cy + s],
               fill=hex_to_rgb(pal["accent"]) + (70,), outline=(220, 240, 255, 230), width=4)
    gd.ellipse([cx - s * 0.55, cy - s * 0.75, cx - s * 0.05, cy - s * 0.25],
               fill=(255, 255, 255, 200))
    gd.arc([cx - s * 1.25, cy - s * 1.25, cx + s * 1.25, cy + s * 1.25], 200, 340,
           fill=(127, 212, 255, 160), width=6)
    img = Image.alpha_composite(img.convert("RGBA"), glass).convert("RGB")
    return D.glow(img, 10, 0.6)


REG_B = {
    "ascii_crt_terminal": ascii_crt_terminal, "data_storytelling": data_storytelling,
    "isometric_infographic": isometric_infographic, "dark_tech_keynote": dark_tech_keynote,
    "living_screencast": living_screencast, "scifi_hologram_hud": scifi_hologram_hud,
    "rubber_hose_1930s": rubber_hose_1930s, "cel_anime_80s": cel_anime_80s,
    "scifi_sitcom_toon": scifi_sitcom_toon, "midcentury_cartoon": midcentury_cartoon,
    "pixel_rpg_16bit": pixel_rpg_16bit, "hd_2d": hd_2d,
    "microgame_frenzy": microgame_frenzy, "game_show_flat": game_show_flat,
    "silent_film_1920s": silent_film_1920s, "liminal_found_footage": liminal_found_footage,
    "brick_toy": brick_toy, "paper_pop_up_book": paper_pop_up_book,
    "tilt_shift_miniature": tilt_shift_miniature,
    "lowpoly_isometric_island": lowpoly_isometric_island,
    "glass_product_render": glass_product_render,
}
