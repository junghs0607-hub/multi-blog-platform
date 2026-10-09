"""스타일 렌더러 1부 (1~22): 각 스타일의 전용 렌더링 규칙."""
from __future__ import annotations
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from .common import hex_to_rgb, mix_color, clamp, smoothstep, ease_out, get_font
from . import draw as D
from . import subjects as S

# ctx: style, scene, lt(0..1), t(절대초), W,H(출력), S(오버스캔), pal, P(params), rng, seed


def place(ctx):
    comp = ctx["scene"]["visual"].get("composition", "medium")
    W, H, lts = ctx["LW"], ctx["LH"], ctx["lt"]
    act = ctx["scene"].get("action", "drift")
    base = {"wide": (0.5, 0.52, 0.16), "medium": (0.5, 0.55, 0.24),
            "close": (0.5, 0.55, 0.38), "aerial": (0.5, 0.45, 0.15),
            "low_angle": (0.5, 0.62, 0.3)}[comp]
    cx, cy, s = base[0] * W, base[1] * H, base[2] * min(W, H)
    if act == "rise":
        cy = H * 0.9 - ease_out(lts) * (H * 0.9 - cy)
    elif act == "drift":
        cx += (lts - 0.5) * W * 0.2
    elif act == "pulse":
        s *= 1 + 0.08 * math.sin(lts * math.pi * 4)
    elif act == "grow":
        s *= 0.3 + 0.7 * ease_out(lts)
    elif act == "assemble":
        s *= 0.5 + 0.5 * smoothstep(lts)
    elif act == "orbiting":
        cx += math.cos(lts * math.pi * 2) * W * 0.12
        cy += math.sin(lts * math.pi * 2) * H * 0.08
    return cx, cy, s


def subj(ctx, img, d, pal=None, **kw):
    pal = pal or ctx["pal"]
    cx, cy, s = place(ctx)
    name = ctx["scene"]["visual"].get("subject", "orb")
    rot = ctx["lt"] * math.pi * 2 if ctx["scene"].get("action") == "rotate" else ctx["t"]
    S.draw_subject(name, d, img, ctx["LW"], ctx["LH"], cx, cy, s, pal,
                   t=rot, seed=ctx["seed"], **kw)
    return cx, cy, s


def crayon_book(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    img = D.blotches(img, rng, 8, pal["accent2"], 0.10, 0.05, 0.2)
    d = ImageDraw.Draw(img)
    subj(ctx, img, d, line_w=5)
    # 크레용 스트로크 질감
    for _ in range(260):
        x, y = rng.random() * W, rng.random() * H
        a = rng.random() * math.pi
        l = 4 + rng.random() * 10
        c = mix_color(hex_to_rgb(pal["fg"]), (255, 255, 255), rng.random() * 0.7)
        d.line([x, y, x + math.cos(a) * l, y + math.sin(a) * l], fill=c, width=1)
    return D.vignette(D.add_grain(img, rng, 0.5), 0.25)


def watercolor_brush(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    img = D.blotches(img, rng, 14, pal["accent"], 0.16, 0.08, 0.3)
    img = D.blotches(img, rng, 10, pal["accent2"], 0.14, 0.06, 0.24)
    ink = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ink)
    tmp = img.copy()
    td = ImageDraw.Draw(tmp)
    subj(ctx, tmp, td)
    subj_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(subj_layer)
    cx, cy, s = place(ctx)
    sd.ellipse([cx - s * 1.6, cy - s * 1.6, cx + s * 1.6, cy + s * 1.6],
               fill=(255, 255, 255, 90))
    img = Image.alpha_composite(img.convert("RGBA"), subj_layer).convert("RGB")
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    d2 = ImageDraw.Draw(img)
    subj(ctx, img, d2)
    return D.add_grain(img, rng, 0.25)


def chinese_ink_wash(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    img = D.blotches(img, rng, 7, "#9A9A9A", 0.25, 0.1, 0.35)
    d = ImageDraw.Draw(img)
    gray_pal = dict(pal, accent="#4A4A4A", accent2="#777777", fg="#1A1A1A")
    S.draw_subject("landscape", d, img, W, H, W * 0.4, H * 0.6, min(W, H) * 0.2,
                   gray_pal, t=ctx["t"], seed=ctx["seed"])
    cx, cy, s = place(ctx)
    subj(ctx, img, d, pal=gray_pal)
    # 붉은 낙관
    d.rectangle([W * 0.85, H * 0.68, W * 0.85 + 46, H * 0.68 + 46], fill=hex_to_rgb(pal["accent"]))
    d.line([W * 0.85 + 10, H * 0.68 + 12, W * 0.85 + 10, H * 0.68 + 34], fill=(255, 255, 255), width=3)
    d.line([W * 0.85 + 24, H * 0.68 + 12, W * 0.85 + 36, H * 0.68 + 34], fill=(255, 255, 255), width=3)
    return D.add_grain(img, rng, 0.2)


def impasto_oil(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    cols = [pal["accent"], pal["accent2"], pal["bg2"], pal["fg"]]
    for _ in range(520):
        x, y = rng.random() * W, rng.random() * H
        a = rng.random() * math.pi
        l, wdt = 8 + rng.random() * 26, 3 + int(rng.random() * 6)
        c = hex_to_rgb(cols[int(rng.random() * len(cols))])
        d.line([x, y, x + math.cos(a) * l, y + math.sin(a) * l], fill=c, width=wdt)
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    d = ImageDraw.Draw(img)
    subj(ctx, img, d, line_w=6)
    return D.add_grain(img, rng, 0.3)


def _reveal_mask(W, H, p):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rectangle([0, 0, int(W * clamp(p * 1.15)), H], fill=255)
    return m


def one_line_drawing(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    ink = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(ink)
    mono = dict(pal, accent="#111111", accent2="#555555")
    subj(ctx, ink, d, pal=mono, line_w=3)
    # 한 줄 장식 스파이럴
    cx, cy = W * 0.5, H * 0.5
    pts = []
    for i in range(200):
        a = i * 0.15
        r = 4 + i * 1.6
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r * 0.6))
    d.line(pts, fill=(17, 17, 17), width=2)
    n = max(2, int(len(pts) * clamp(ctx["lt"] * 1.2)))
    d.line(pts[:n], fill=(17, 17, 17), width=3)
    mask = _reveal_mask(W, H, ctx["lt"])
    img = Image.composite(ink, img, mask)
    return D.add_grain(img, ctx["rng"], 0.05)


def whiteboard_explainer(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    ink = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(ink)
    marker = dict(pal, fg="#222222", accent="#1D6FB8", accent2="#D62828")
    subj(ctx, ink, d, pal=marker, line_w=4)
    cx, cy, s = place(ctx)
    d.ellipse([cx - s * 1.3, cy - s * 1.3, cx + s * 1.3, cy + s * 1.3],
              outline=hex_to_rgb("#D62828"), width=5)
    d.line([cx + s * 1.5, cy - s, cx + s * 2.4, cy - s * 1.4], fill=hex_to_rgb("#D62828"), width=5)
    mask = _reveal_mask(W, H, ctx["lt"])
    img = Image.composite(ink, img, mask)
    d = ImageDraw.Draw(img)
    hx = W * clamp(ctx["lt"] * 1.15)
    d.ellipse([hx - 8, H * 0.5 - 8, hx + 8, H * 0.5 + 8], fill=(40, 40, 40))
    return img


def urban_sketch(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    img = D.blotches(img, rng, 9, pal["accent2"], 0.18, 0.08, 0.26)
    d = ImageDraw.Draw(img)
    subj(ctx, img, d, line_w=2)
    # 스케치 겹선
    d2 = ImageDraw.Draw(img)
    cx, cy, s = place(ctx)
    d2.ellipse([cx - s + 3, cy - s + 3, cx + s + 3, cy + s + 3],
               outline=(60, 60, 60), width=1)
    return D.add_grain(img, rng, 0.3)


def shadow_puppetry(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.08, H * 0.08, W * 0.92, H * 0.92], fill=hex_to_rgb("#E8C98A"))
    d.rectangle([W * 0.08, H * 0.08, W * 0.92, H * 0.92], outline=hex_to_rgb(pal["fg"]), width=8)
    sil = dict(pal, accent="#1A0E05", accent2="#1A0E05", fg="#1A0E05")
    cx, cy, s = place(ctx)
    S.draw_subject(ctx["scene"]["visual"].get("subject", "traveler"), d, img, W, H,
                   cx, cy, s, sil, t=ctx["t"], seed=ctx["seed"])
    for jx, jy in [(cx - s * 0.4, cy), (cx + s * 0.4, cy - s * 0.3)]:
        d.ellipse([jx - 5, jy - 5, jx + 5, jy + 5], fill=(26, 14, 5))
        d.line([jx, jy, jx, H * 0.92], fill=(26, 14, 5), width=2)
    arr = np.asarray(img).astype(np.float32) * D.flicker_gain(ctx["t"], ctx["seed"], 0.15)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return D.add_grain(img, rng, 0.35)


def ukiyo_e(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    # 붉은 태양
    D_img = d
    D_img.ellipse([W * 0.68, H * 0.08, W * 0.68 + H * 0.3, H * 0.08 + H * 0.3],
                  fill=hex_to_rgb(pal["accent"]))
    # 파도 동심호
    for i in range(6):
        y = H * (0.55 + i * 0.07)
        for k in range(8):
            x = W * k / 7 + (i % 2) * W * 0.06
            D_img.arc([x - 30, y - 18, x + 30, y + 18], 180, 360,
                      fill=hex_to_rgb(pal["accent2"]), width=3)
    subj(ctx, img, d, line_w=4)
    # 화지 결 + 낙관
    d.rectangle([W * 0.06, H * 0.1, W * 0.06 + 40, H * 0.1 + 120], fill=hex_to_rgb(pal["accent"]))
    return D.add_grain(img, rng, 0.25)


def red_paper_cut(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    half = Image.new("RGBA", (W // 2, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(half)
    red = dict(pal, accent="#B81F1F", accent2="#8C1414", fg="#8C1414")
    cx, cy, s = place(ctx)
    S.draw_subject(ctx["scene"]["visual"].get("subject", "tree"), hd, half, W // 2, H,
                   W // 4, cy, s, red, t=ctx["t"], seed=ctx["seed"])
    for i in range(5):
        y = H * (0.15 + i * 0.16)
        hd.ellipse([W // 4 - 60 - i * 8, y - 20, W // 4 - 20 - i * 8, y + 20],
                   fill=(184, 31, 31, 255))
    mirror = half.transpose(Image.FLIP_LEFT_RIGHT)
    full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    full.paste(half, (0, 0))
    full.paste(mirror, (W // 2 if W % 2 == 0 else W // 2 + 1, 0))
    img = Image.alpha_composite(img.convert("RGBA"), full).convert("RGB")
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.04, H * 0.05, W * 0.96, H * 0.95], outline=hex_to_rgb("#8C1414"), width=4)
    return D.add_grain(img, ctx["rng"], 0.15)


def paper_cut_lightbox(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    D.particles(d, rng, 60, W, H, ctx["t"], hex_to_rgb("#FFF3D6"), 1, 2, 4, seed=ctx["seed"])
    cols = ["#1E3A5C", "#2E5A8C", "#4FA3A3", "#FFB347", "#FFF3D6"]
    for i in range(5):
        shift = (ctx["lt"] - 0.5) * (5 - i) * 14
        y0 = H * (0.45 + i * 0.11)
        pts = [(0, H), (0, y0)]
        for k in range(9):
            x = W * k / 8
            y = y0 + math.sin(k * 1.7 + i * 2 + ctx["seed"]) * H * 0.03
            pts.append((x + shift, y))
        pts += [(W, H)]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).polygon(pts, fill=hex_to_rgb(cols[i]) + (255,))
        img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    img = D.glow(img, 10, 0.6)
    return D.add_grain(img, rng, 0.15)


def risograph_print(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    base = D.solid(W, H, pal["bg"])
    la = base.copy()
    da = ImageDraw.Draw(la)
    pa = dict(pal, accent=pal["accent"], accent2=pal["accent"], fg=pal["accent"])
    subj(ctx, la, da, pal=pa, line_w=5)
    lb = base.copy()
    db = ImageDraw.Draw(lb)
    pb = dict(pal, accent="#0078BF", accent2="#0078BF", fg="#0078BF")
    ox = int(ctx["P"].get("misregister", 4))
    S.draw_subject(ctx["scene"]["visual"].get("subject", "orb"), db, lb, W, H,
                   W * 0.5 + ox, H * 0.55 + ox, min(W, H) * 0.2, pb,
                   t=ctx["t"], seed=ctx["seed"])
    img = ImageChops.darker(la, lb)
    return D.add_grain(img, rng, 0.45)


def halftone_dossier(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    subj(ctx, img, d, line_w=4)
    img = D.halftone(img, 6, pal["fg"], pal["bg"])
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.68, H * 0.1, W * 0.9, H * 0.22], outline=hex_to_rgb(pal["accent"]), width=4)
    f = get_font(max(12, int(H * 0.04)), bold=True)
    d.text((W * 0.7, H * 0.12), "FILE No.7", font=f, fill=hex_to_rgb(pal["accent"]))
    return D.vignette(D.add_grain(img, rng, 0.4), 0.4)


def woodcut_print(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    bw = dict(pal, accent="#191919", accent2="#191919", fg="#191919")
    subj(ctx, img, d, pal=bw, line_w=6)
    for _ in range(180):
        x, y = rng.random() * W, rng.random() * H
        l = 6 + rng.random() * 22
        d.line([x, y, x + l, y + (rng.random() - 0.5) * 6],
               fill=hex_to_rgb(pal["bg"]), width=2)
    return D.add_grain(img, rng, 0.3)


def copperplate_engraving(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    subj(ctx, img, d, line_w=2)
    for i in range(0, W + H, 7):
        d.line([i, H, i - H // 2, H // 2], fill=(90, 74, 42, 90) if False else (90, 74, 42), width=1)
    for i in range(0, W + H, 11):
        d.line([i, H, i - H // 3, H * 2 // 3], fill=(120, 100, 70), width=1)
    d.rectangle([W * 0.05, H * 0.06, W * 0.95, H * 0.94], outline=(42, 36, 25), width=3)
    return D.add_grain(img, rng, 0.3)


def silkscreen_travel_poster(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = Image.new("RGB", (W, H), hex_to_rgb(pal["bg"]))
    d = ImageDraw.Draw(img)
    bands = [pal["accent2"], pal["bg"], pal["accent"], "#1F3A4D"]
    for i, c in enumerate(bands):
        d.rectangle([0, H * i / 4, W, H * (i + 1) / 4], fill=hex_to_rgb(c))
    d.ellipse([W * 0.36, H * 0.06, W * 0.64, H * 0.06 + W * 0.28],
              fill=hex_to_rgb(pal["bg"]))
    S.draw_mountains(d, W, H, pal, horizon=0.72, seed=ctx["seed"])
    d.rectangle([0, H * 0.82, W, H], fill=hex_to_rgb("#1F3A4D"))
    f = get_font(max(16, int(H * 0.07)), bold=True)
    title = ctx["scene"].get("title", "TRAVEL")
    tw = d.textlength(title, font=f)
    d.text((W / 2 - tw / 2, H * 0.85), title, font=f, fill=hex_to_rgb(pal["bg"]))
    return D.add_grain(img, ctx["rng"], 0.2)


def swiss_motion_graphics(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    for i in range(1, 8):
        d.line([W * i / 8, 0, W * i / 8, H], fill=(230, 230, 230), width=1)
        d.line([0, H * i / 8, W, H * i / 8], fill=(230, 230, 230), width=1)
    p = ease_out(ctx["lt"])
    d.rectangle([W * 0.08, H * (0.9 - 0.5 * p), W * 0.4, H * 0.9], fill=hex_to_rgb(pal["accent"]))
    d.ellipse([W * (0.9 - 0.3 * p) - 60, H * 0.15 - 60, W * (0.9 - 0.3 * p) + 60, H * 0.15 + 60],
              fill=(17, 17, 17))
    f = get_font(max(20, int(H * 0.11)), bold=True)
    d.text((W * 0.08, H * 0.2), ctx["scene"].get("title", "HELVETICA"), font=f, fill=(17, 17, 17))
    f2 = get_font(max(12, int(H * 0.03)), bold=True)
    d.text((W * 0.08, H * 0.36), ctx["story_keywords"][0] if ctx.get("story_keywords") else "GRID SYSTEM",
           font=f2, fill=hex_to_rgb(pal["accent"]))
    return img


def spy_title_60s(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    cx, cy, s = place(ctx)
    for i in range(4):
        r = s * (2.6 - i * 0.5)
        d.ellipse([cx - r, cy - r, cx + r, cy + r],
                  outline=hex_to_rgb(pal["accent"] if i % 2 == 0 else "#F5F5F5"), width=5)
    sil = dict(pal, accent="#000000", accent2="#000000", fg="#000000")
    S.draw_subject("traveler", d, img, W, H, cx, cy + s * 0.3, s * 0.7, sil,
                   t=ctx["t"], seed=ctx["seed"])
    img = D.draw_title_card(img, ctx["scene"].get("title", "MISSION"),
                            ctx["scene"].get("purpose", ""), W, H, "#F5F5F5",
                            pal["accent"], ctx["lt"])
    return D.vignette(D.add_grain(img, rng, 0.5), 0.7)


def art_deco(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.vgradient(W, H, pal["bg"], pal["bg2"])
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H * 0.62
    for i in range(25):
        a = math.pi + i * math.pi / 24
        d.line([cx, cy, cx + math.cos(a) * W, cy + math.sin(a) * W],
               fill=hex_to_rgb(pal["accent"]), width=2)
    for r in [0.16, 0.22, 0.28]:
        rr = min(W, H) * r
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  outline=hex_to_rgb(pal["accent"]), width=4)
    S.draw_orb(d, img, cx, cy - min(W, H) * 0.22, min(W, H) * 0.09, pal)
    m = 26
    d.rectangle([m, m, W - m, H - m], outline=hex_to_rgb(pal["accent"]), width=5)
    d.rectangle([m + 10, m + 10, W - m - 10, H - m - 10], outline=hex_to_rgb(pal["accent"]), width=2)
    f = get_font(max(16, int(H * 0.06)), bold=True)
    t = ctx["scene"].get("title", "DECO")
    d.text((W / 2 - d.textlength(t, font=f) / 2, H * 0.08), t, font=f,
           fill=hex_to_rgb(pal["accent"]))
    return D.glow(img, 8, 0.3)


def blueprint(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    for i in range(0, W, 32):
        d.line([i, 0, i, H], fill=(30, 90, 160), width=1)
    for i in range(0, H, 32):
        d.line([0, i, W, i], fill=(30, 90, 160), width=1)
    ink = img.copy()
    di = ImageDraw.Draw(ink)
    white = dict(pal, accent="#FFFFFF", accent2="#7FD4FF", fg="#FFFFFF")
    subj(ctx, ink, di, pal=white, line_w=2)
    cx, cy, s = place(ctx)
    di.rectangle([cx - s * 1.4, cy - s * 1.4, cx + s * 1.4, cy + s * 1.4],
                 outline=(127, 212, 255), width=2)
    di.line([cx - s * 1.4, cy + s * 1.6, cx + s * 1.4, cy + s * 1.6], fill=(127, 212, 255), width=2)
    f = get_font(max(10, int(H * 0.025)))
    di.text((cx - s, cy + s * 1.65), f"FIG.{ctx['scene']['scene_id']}  SCALE 1:1", font=f,
            fill=(127, 212, 255))
    return Image.composite(ink, img, _reveal_mask(W, H, ctx["lt"]))


def stained_glass(ctx):
    pal, rng, W, H = ctx["pal"], ctx["rng"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    cols = [pal["accent"], pal["accent2"], "#2E86AB", "#E8C76A", "#3E8E5A"]
    for _ in range(46):
        x, y = rng.random() * W, rng.random() * H
        r = min(W, H) * (0.06 + rng.random() * 0.12)
        k = 3 + int(rng.random() * 3)
        pts = [(x + math.cos(i * 2 * math.pi / k + rng.random()) * r,
                y + math.sin(i * 2 * math.pi / k) * r) for i in range(k)]
        d.polygon(pts, fill=hex_to_rgb(cols[int(rng.random() * len(cols))]),
                  outline=(10, 10, 10), width=6)
    cx, cy, s = place(ctx)
    S.draw_orb(d, img, cx, cy, s * 0.8, pal, glow_amt=1.0)
    return D.glow(img, 10, 0.5)


def pictogram_motion(ctx):
    pal, W, H = ctx["pal"], ctx["LW"], ctx["LH"]
    img = D.solid(W, H, pal["bg"])
    d = ImageDraw.Draw(img)
    step = int(ctx["lt"] * 4) % 4
    fg = hex_to_rgb(pal["fg"])
    cx = W * (0.25 + 0.5 * ctx["lt"])
    cy = H * 0.5
    s = min(W, H) * 0.12
    d.ellipse([cx - s * 0.4, cy - s * 1.5, cx + s * 0.4, cy - s * 0.7], fill=fg)
    swing = [-0.5, 0.5, 0.5, -0.5][step] * s
    d.line([cx, cy - s * 0.6, cx, cy + s * 0.5], fill=fg, width=int(s * 0.35))
    d.line([cx, cy + s * 0.5, cx - s * 0.6 + swing, cy + s * 1.5], fill=fg, width=int(s * 0.28))
    d.line([cx, cy + s * 0.5, cx + s * 0.6 - swing, cy + s * 1.5], fill=fg, width=int(s * 0.28))
    d.line([cx, cy - s * 0.3, cx - s - swing, cy + s * 0.2], fill=fg, width=int(s * 0.28))
    d.line([cx, cy - s * 0.3, cx + s + swing, cy + s * 0.2], fill=fg, width=int(s * 0.28))
    d.rectangle([0, H * 0.85, W, H], fill=hex_to_rgb(pal["accent"]))
    return img


REG_A = {
    "crayon_book": crayon_book, "watercolor_brush": watercolor_brush,
    "chinese_ink_wash": chinese_ink_wash, "impasto_oil": impasto_oil,
    "one_line_drawing": one_line_drawing, "whiteboard_explainer": whiteboard_explainer,
    "urban_sketch": urban_sketch, "shadow_puppetry": shadow_puppetry,
    "ukiyo_e": ukiyo_e, "red_paper_cut": red_paper_cut,
    "paper_cut_lightbox": paper_cut_lightbox, "risograph_print": risograph_print,
    "halftone_dossier": halftone_dossier, "woodcut_print": woodcut_print,
    "copperplate_engraving": copperplate_engraving,
    "silkscreen_travel_poster": silkscreen_travel_poster,
    "swiss_motion_graphics": swiss_motion_graphics, "spy_title_60s": spy_title_60s,
    "art_deco": art_deco, "blueprint": blueprint, "stained_glass": stained_glass,
    "pictogram_motion": pictogram_motion,
}
