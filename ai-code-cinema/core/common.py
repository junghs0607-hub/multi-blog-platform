"""공통 유틸: 경로, 시드 RNG, 이징, 색상, 폰트, ffmpeg 탐지."""
from __future__ import annotations
import hashlib
import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"
STYLES_DIR = ROOT / "styles"
CORE_DIR = ROOT / "core"
PROJECTS_DIR = ROOT / "projects"
LOGS_DIR = ROOT / "logs"
FONTS_DIR = ROOT / "assets" / "fonts"

ASPECTS = {"16:9": (16, 9), "9:16": (9, 16), "1:1": (1, 1)}


def load_json(path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, obj) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def seed_from(*parts) -> int:
    h = hashlib.sha256("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def rng_for(*parts) -> np.random.Generator:
    return np.random.default_rng(seed_from(*parts))


def parse_resolution(s: str) -> tuple[int, int]:
    w, h = s.lower().replace(" ", "").split("x")
    return int(w), int(h)


def resolution_for(aspect: str, base: str = "1920x1080") -> tuple[int, int]:
    """화면 비율에 맞는 해상도 계산 (긴 변 기준 스케일)."""
    bw, bh = parse_resolution(base)
    aw, ah = ASPECTS[aspect]
    if aspect == "16:9":
        return bw, bh
    if aspect == "9:16":
        return bh * 9 // 16, bh
    return min(bw, bh), min(bw, bh)


# ---------------- 이징 ----------------

def clamp(x, a=0.0, b=1.0):
    return a if x < a else (b if x > b else x)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_in_out(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = clamp(t)
    return t ** 3


def ease_out_back(t):
    t = clamp(t)
    c = 1.70158
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def quantize_time(t, step_fps):
    """스텝 모션용 시간 양자화 (셀/픽셀 애니메이션)."""
    if not step_fps or step_fps <= 0:
        return t
    return math.floor(t * step_fps) / step_fps


# ---------------- 색상 ----------------

def hex_to_rgb(s: str) -> tuple[int, int, int]:
    s = s.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def mix_color(a, b, t):
    t = clamp(t)
    return tuple(int(lerp(x, y, t)) for x, y in zip(a, b))


# ---------------- 폰트 ----------------

_FONT_CACHE: dict[tuple[str, int], object] = {}


def get_font(size: int, bold: bool = False):
    from PIL import ImageFont
    key = ("bold" if bold else "regular", size)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    name = "NotoSansKR-Bold.ttf" if bold else "NotoSansKR-Regular.ttf"
    path = FONTS_DIR / name
    try:
        font = ImageFont.truetype(str(path), size)
    except Exception:
        font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


# ---------------- ffmpeg ----------------

_FFMPEG = None


def ffmpeg_exe() -> str:
    global _FFMPEG
    if _FFMPEG:
        return _FFMPEG
    sys_ff = shutil.which("ffmpeg")
    if sys_ff:
        _FFMPEG = sys_ff
        return _FFMPEG
    try:
        import imageio_ffmpeg
        _FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
        return _FFMPEG
    except Exception as e:
        raise RuntimeError("ffmpeg을 찾을 수 없습니다. requirements.txt를 설치하세요.") from e


def run(cmd, **kw):
    kw.setdefault("capture_output", True)
    kw.setdefault("text", True)
    p = subprocess.run(cmd, **kw)
    if p.returncode != 0:
        raise RuntimeError(f"명령 실패 ({p.returncode}): {' '.join(cmd)}\n{p.stderr[-3000:]}")
    return p


def log(project_dir: Path, name: str, text: str) -> None:
    d = Path(project_dir) / "logs"
    d.mkdir(parents=True, exist_ok=True)
    with open(d / name, "a", encoding="utf-8") as f:
        f.write(text + "\n")
