"""드로잉 프리미티브: 그라데이션, 질감, 이펙트, 카메라, 전환, 자막."""
from __future__ import annotations
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from .common import hex_to_rgb, mix_color, clamp, smoothstep, lerp, get_font


def vgradient(w, h, c1, c2) -> Image:
    a = np.array(hex_to_rgb(c1), dtype=np.float32)
    b = np.array(hex_to_rgb(c2), dtype=np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    arr = (a + (b - a) * t).astype(np.uint8)
    return Image.fromarray(np.repeat(arr, w, axis=1), "RGB")


def rgradient(w, h, c1, c2, cx=0.5, cy=0.5) -> Image:
    a = np.array(hex_to_rgb(c1), dtype=np.float32)
    b = np.array(hex_to_rgb(c2), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - cx) ** 2 + (yy / h - cy) ** 2) * 2)
    t = np.clip(d, 0, 1)[..., None]
    return Image.fromarray((a + (b - a) * t).astype(np.uint8), "RGB")


def solid(w, h, c) -> Image:
    return Image.new("RGB", (w, h), hex_to_rgb(c))


def add_grain(img: Image, rng: np.random.Generator, amt: float) -> Image:
    if amt <= 0:
        return img
    arr = np.asarray(img).astype(np.float32)
    n = rng.standard_normal(arr.shape[:2])[..., None] * 255 * amt * 0.12
    return Image.fromarray(np.clip(arr + n, 0, 255).astype(np.uint8))


def blotches(img: Image, rng: np.random.Generator, n: int, color, alpha: float,
             rmin: float, rmax: float) -> Image:
    """수채화 번짐/잉크 blotch."""
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rgb = hex_to_rgb(color)
    for _ in range(n):
        x, y = rng.random() * w, rng.random() * h
        r = (rmin + rng.random() * (rmax - rmin)) * min(w, h)
        for k in range(3):
            rr = r * (1 - k * 0.22)
            d.ellipse([x - rr, y - rr, x + rr, y + rr],
                      fill=rgb + (int(alpha * 255 * (0.4 + 0.3 * k)),))
    layer = layer.filter(ImageFilter.GaussianBlur(min(w, h) * 0.01))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def halftone(img: Image, dot: int, fg, bg) -> Image:
    w, h = img.size
    gray = img.convert("L")
    out = Image.new("RGB", (w, h), hex_to_rgb(bg))
    d = ImageDraw.Draw(out)
    fgc = hex_to_rgb(fg)
    px = gray.load()
    for y in range(0, h, dot):
        for x in range(0, h if False else w, dot):
            v = px[min(x, w - 1), min(y, h - 1)] / 255.0
            r = (dot / 2) * (1 - v) * 1.15
            if r > 0.4:
                d.ellipse([x + dot / 2 - r, y + dot / 2 - r,
                           x + dot / 2 + r, y + dot / 2 + r], fill=fgc)
    return out


def scanlines(img: Image, alpha=0.25, gap=3) -> Image:
    arr = np.asarray(img).astype(np.float32)
    arr[::gap] *= (1 - alpha)
    return Image.fromarray(arr.astype(np.uint8))


def vignette(img: Image, amt=0.5) -> Image:
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2)
    m = 1 - np.clip(d - (1 - amt), 0, 1) * amt
    arr = np.asarray(img).astype(np.float32) * m[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def pixelate(img: Image, px: int) -> Image:
    if px <= 1:
        return img
    w, h = img.size
    return img.resize((max(1, w // px), max(1, h // px)), Image.NEAREST).resize((w, h), Image.NEAREST)


def glow(img: Image, radius=12, amt=0.5) -> Image:
    blur = img.filter(ImageFilter.GaussianBlur(radius))
    a = np.asarray(img).astype(np.float32)
    b = np.asarray(blur).astype(np.float32)
    return Image.fromarray(np.clip(a + b * amt, 0, 255).astype(np.uint8))


def flicker_gain(t: float, seed: int, amt: float) -> float:
    return 1 - amt * (0.5 + 0.5 * math.sin(t * 37 + seed) * math.sin(t * 13.7 + seed * 2))


def apply_camera(layer: Image, cam, W: int, H: int) -> Image:
    """오버스캔 레이어에서 카메라 윈도우를 잘라 출력 크기로 변환."""
    lw, lh = layer.size
    zoom = max(0.3, cam["zoom"])
    cw, ch = lw / zoom, lh / zoom
    # 출력 비율에 맞춤
    target = W / H
    if cw / ch > target:
        cw = ch * target
    else:
        ch = cw / target
    # 크롭이 레이어보다 크면(줌아웃) 레이어를 먼저 확대해 검은 여백 방지
    s = max(1.0, cw / lw, ch / lh)
    if s > 1.0:
        layer = layer.resize((int(lw * s) + 4, int(lh * s) + 4), Image.BILINEAR)
        lw, lh = layer.size
    cx = clamp(cam["x"], 0, 1) * lw
    cy = clamp(cam["y"], 0, 1) * lh
    x0 = clamp(cx - cw / 2, 0, lw - cw)
    y0 = clamp(cy - ch / 2, 0, lh - ch)
    crop = layer.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch)))
    return crop.resize((W, H), Image.BILINEAR)


def transition_blend(a: Image, b: Image, kind: str, p: float,
                     rng: np.random.Generator) -> Image:
    p = clamp(p)
    if kind in (None, "cut") or p <= 0:
        return a
    if p >= 1:
        return b
    w, h = a.size
    if kind == "fade":
        return Image.blend(a, b, smoothstep(p))
    if kind == "dissolve":
        n = rng.random((h // 2, w // 2))
        n = np.repeat(np.repeat(n, 2, 0), 2, 1)[:h, :w]
        m = (n < p).astype(np.float32)[..., None]
        arr = np.asarray(a).astype(np.float32) * (1 - m) + np.asarray(b).astype(np.float32) * m
        return Image.fromarray(arr.astype(np.uint8))
    if kind in ("wipe", "slide"):
        x = int(w * smoothstep(p))
        out = a.copy()
        out.paste(b.crop((0, 0, x, h)), (0, 0))
        return out
    if kind == "iris":
        r = smoothstep(p) * math.hypot(w, h) / 2
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=255)
        return Image.composite(b, a, mask)
    if kind == "pixelate":
        k = max(1, int(24 * math.sin(p * math.pi)))
        return Image.blend(pixelate(a, k), pixelate(b, k), smoothstep(p))
    if kind == "glitch":
        off = int((rng.random() - 0.5) * w * 0.06 * math.sin(p * math.pi))
        aa = np.asarray(a)
        bb = np.asarray(b)
        m = np.zeros((h, 1, 1), dtype=np.float32)
        cut = int(h * p)
        m[:cut] = 1
        arr = aa * (1 - m) + bb * m
        out = Image.fromarray(arr.astype(np.uint8))
        if off:
            out = out.transform((w, h), Image.AFFINE, (1, 0, off, 0, 1, 0))
        return out
    return Image.blend(a, b, smoothstep(p))


def particles(draw: ImageDraw.ImageDraw, rng: np.random.Generator, n: int,
              W: int, H: int, t: float, color, rmin=1.0, rmax=3.0,
              speed=20.0, drift_x=0.0, seed=0, alpha=255):
    for i in range(n):
        rr = np.random.default_rng(seed * 1000 + i)
        x0, y0 = rr.random() * W, rr.random() * H
        sz = rmin + rr.random() * (rmax - rmin)
        y = (y0 + t * speed * (0.5 + rr.random())) % H
        x = (x0 + t * drift_x + math.sin(t * 2 + i) * 4) % W
        draw.ellipse([x - sz, y - sz, x + sz, y + sz], fill=color)


def wrap_text(draw, text: str, font, max_w: int) -> list[str]:
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if draw.textlength(test, font=font) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines


def draw_subtitle(img: Image, text: str, W: int, H: int, place: str = "bottom",
                  color="#FFFFFF", size_ratio=0.045) -> Image:
    if not text:
        return img
    size = max(14, int(H * size_ratio))
    font = get_font(size, bold=True)
    d = ImageDraw.Draw(img)
    lines = wrap_text(d, text, font, int(W * 0.86))
    lh = int(size * 1.35)
    block = lh * len(lines)
    y = H - block - int(H * 0.06) if place != "top" else int(H * 0.06)
    if place == "in-scene":
        y = int(H * 0.68)
    # 반투명 박스
    box = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle([W * 0.05, y - 10, W * 0.95, y + block + 10], radius=8,
                         fill=(0, 0, 0, 140))
    img = Image.alpha_composite(img.convert("RGBA"), box).convert("RGB")
    d = ImageDraw.Draw(img)
    rgb = hex_to_rgb(color)
    for i, ln in enumerate(lines):
        tw = d.textlength(ln, font=font)
        d.text((W / 2 - tw / 2 + 2, y + i * lh + 2), ln, font=font, fill=(0, 0, 0))
        d.text((W / 2 - tw / 2, y + i * lh), ln, font=font, fill=rgb)
    return img


def draw_title_card(img: Image, title: str, subtitle: str, W, H, fg, accent,
                    p: float) -> Image:
    """챕터 타이틀 카드 (등장 애니메이션)."""
    a = clamp(p * 3)
    if a <= 0:
        return img
    size = max(20, int(H * 0.09))
    font = get_font(size, bold=True)
    sub = get_font(max(12, int(H * 0.035)))
    d = ImageDraw.Draw(img, "RGBA")
    d.text((W * 0.08, H * 0.12), title, font=font,
           fill=hex_to_rgb(fg) + (int(255 * a),))
    d.text((W * 0.08, H * 0.12 + size * 1.3), subtitle, font=sub,
           fill=hex_to_rgb(accent) + (int(255 * a),))
    return img


def letterbox(img: Image, amt=0.08) -> Image:
    w, h = img.size
    d = ImageDraw.Draw(img)
    b = int(h * amt)
    d.rectangle([0, 0, w, b], fill=(0, 0, 0))
    d.rectangle([0, h - b, w, h], fill=(0, 0, 0))
    return img
