"""시간 기반 Python 렌더러: render(t) -> 프레임, 병렬 시퀀스 렌더링."""
from __future__ import annotations
import math
import multiprocessing as mp
from pathlib import Path
import numpy as np
from PIL import Image
from .common import (seed_from, rng_for, clamp, lerp, smoothstep,
                     quantize_time, resolution_for)
from . import draw as D
from .styles_a import REG_A
from .styles_b import REG_B

REGISTRY = {**REG_A, **REG_B}
OVERSCAN = 1.35

_JOB = {}


def _camera_at(scene: dict, lt: float) -> dict:
    f, t = scene["visual"]["camera_from"], scene["visual"]["camera_to"]
    e = smoothstep(lt)
    return {"x": lerp(f["x"], t["x"], e), "y": lerp(f["y"], t["y"], e),
            "zoom": lerp(f["zoom"], t["zoom"], e)}


def _segment_at(t: float, storyboard: dict):
    """시간 t의 장면 구간 (전환 구간 포함) 반환."""
    scenes = storyboard["scenes"]
    for i, s in enumerate(scenes):
        trans = s["transition_out"]["duration"] if s["transition_out"] else 0
        if t < s["end"]:
            lt = (t - s["start"]) / max(1e-6, s["end"] - s["start"])
            return ("scene", s, clamp(lt), None, 0.0)
        if trans and t < s["end"] + trans:
            nxt = scenes[i + 1]
            p = (t - s["end"]) / trans
            return ("transition", s, 1.0, nxt, p)
    s = scenes[-1]
    return ("scene", s, 1.0, None, 0.0)


def _render_layer(scene, lt, t_abs, style, storyboard, seed, LW, LH):
    step = style.get("step_fps")
    # 피사체 시간은 스텝 모션 가능, 카메라/조명은 항상 부드럽게
    lt_subj = quantize_time(lt * 1000, (step or 1000) * 10) / 1000 * 1000 / 1000 if False else lt
    if step:
        span = max(1e-6, scene["end"] - scene["start"])
        lt_subj = quantize_time(lt * span, step) / span
    rng = np.random.default_rng(seed_from(seed, style["id"], scene["scene_id"]))
    ctx = {"style": style, "scene": scene, "lt": clamp(lt_subj),
           "lt_smooth": clamp(lt), "t": t_abs, "LW": LW, "LH": LH,
           "pal": style["palette"], "P": style.get("params", {}),
           "rng": rng, "seed": seed_from(seed, scene["scene_id"]),
           "story_keywords": storyboard.get("keywords", [])}
    fn = REGISTRY.get(style["renderer"])
    if fn is None:
        raise KeyError(f"렌더러 없음: {style['renderer']}")
    return fn(ctx)


def render_frame(t: float, storyboard: dict, timeline: dict, style: dict,
                 W: int, H: int, seed: int, subtitles: bool = True) -> Image:
    kind, s, lt, nxt, p = _segment_at(clamp(t, 0, storyboard["duration"] - 1e-4),
                                      storyboard)
    LW, LH = int(W * OVERSCAN), int(H * OVERSCAN)
    layer_a = _render_layer(s, lt, t, style, storyboard, seed, LW, LH)
    cam = _camera_at(s, lt)
    if kind == "transition" and nxt is not None:
        layer_b = _render_layer(nxt, 0.0, t, style, storyboard, seed, LW, LH)
        tr = s["transition_out"]["type"]
        rng = np.random.default_rng(seed_from(seed, "trans", s["scene_id"]))
        layer = D.transition_blend(layer_a, layer_b, tr, p, rng)
        cam2 = _camera_at(nxt, 0.0)
        cam = {k: lerp(cam[k], cam2[k], smoothstep(p)) for k in ("x", "y", "zoom")}
    else:
        layer = layer_a
    img = D.apply_camera(layer, cam, W, H)
    fn = REGISTRY.get(style["renderer"])
    overlay = getattr(fn, "screen_overlay", None)
    if overlay is not None:
        base = {"style": style, "t": t, "W": W, "H": H,
                "pal": style["palette"], "P": style.get("params", {})}
        if kind == "transition" and nxt is not None:
            tr = s["transition_out"]["type"]
            ia = overlay(img.copy(), {**base, "scene": s, "lt": 1.0})
            ib = overlay(img.copy(), {**base, "scene": nxt, "lt": 0.0})
            if tr == "cut":
                img = ia if p < 0.5 else ib
            else:
                img = Image.blend(ia, ib, smoothstep(p))
        else:
            img = overlay(img, {**base, "scene": s, "lt": lt})
    if subtitles and not getattr(fn, "replaces_subtitle", False):
        for cue in timeline.get("subtitles", []):
            if cue["start"] <= t < cue["end"]:
                img = D.draw_subtitle(img, cue["text"], W, H,
                                      place=style.get("text_place", "bottom"))
                break
    return img


def _worker_init(job):
    _JOB.update(job)


def _render_index(i: int):
    from .common import load_json
    if "sb" not in _JOB:
        _JOB["sb"] = load_json(_JOB["sb_path"])
        _JOB["tl"] = load_json(_JOB["tl_path"])
        _JOB["style"] = load_json(_JOB["style_path"])
    sb, tl, style = _JOB["sb"], _JOB["tl"], _JOB["style"]
    fps, W, H = _JOB["fps"], _JOB["W"], _JOB["H"]
    t = min(i / fps, sb["duration"] - 1e-4)
    img = render_frame(t, sb, tl, style, W, H, _JOB["seed"], _JOB["subtitles"])
    out = Path(_JOB["frames"]) / f"frame_{i:06d}.png"
    img.save(out)
    return str(out)


def render_sequence(project_dir, storyboard: dict, timeline: dict, style: dict,
                    config: dict, workers: int = 0) -> Path:
    from .common import save_json
    project_dir = Path(project_dir)
    W, H = resolution_for(config.get("aspect", "16:9"), config.get("resolution", "1920x1080"))
    W -= W % 2
    H -= H % 2
    fps = int(config.get("fps", 24))
    n = max(1, int(round(storyboard["duration"] * fps)))
    frames = project_dir / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    # 기존 프레임 정리
    for f in frames.glob("frame_*.png"):
        f.unlink()
    sb_path = project_dir / "storyboard.json"
    tl_path = project_dir / "timeline.json"
    style_path = project_dir / "style.json"
    save_json(sb_path, storyboard)
    save_json(tl_path, timeline)
    save_json(style_path, style)
    job = {"sb_path": str(sb_path), "tl_path": str(tl_path), "style_path": str(style_path),
           "fps": fps, "W": W, "H": H, "seed": int(config.get("seed", 1)),
           "subtitles": bool(config.get("subtitles", True)), "frames": str(frames)}
    if workers <= 0:
        workers = max(1, mp.cpu_count() - 1)
    if workers == 1:
        _worker_init(job)
        for i in range(n):
            _render_index(i)
    else:
        with mp.Pool(workers, initializer=_worker_init, initargs=(job,)) as pool:
            for i, _ in enumerate(pool.imap(_render_index, range(n), chunksize=4)):
                if i % 48 == 0:
                    print(f"  frames {i + 1}/{n}", flush=True)
    print(f"  frames {n}/{n} done ({W}x{H}@{fps}fps)")
    return frames


def storyboard_preview(project_dir, storyboard: dict, timeline: dict, style: dict,
                       config: dict, cols: int = 4) -> Path:
    """스토리보드 미리보기: 장면별 대표 프레임 contact sheet."""
    from PIL import ImageDraw
    oW, oH = resolution_for(config.get("aspect", "16:9"), config.get("resolution", "1920x1080"))
    sc = min(1.0, 480 / oW)
    W, H = max(64, int(oW * sc)), max(64, int(oH * sc))
    thumbs = []
    for s in storyboard["scenes"]:
        mid = (s["start"] + s["end"]) / 2
        img = render_frame(mid, storyboard, timeline, style, W, H,
                           int(config.get("seed", 1)), subtitles=False)
        thumbs.append((s, img))
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * (W + 8) + 8, rows * (H + 34) + 8), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for i, (s, img) in enumerate(thumbs):
        x, y = 8 + (i % cols) * (W + 8), 8 + (i // cols) * (H + 34)
        sheet.paste(img, (x, y))
        d.text((x + 4, y + H + 6), f"SC{s['scene_id']} {s['act']} {s['start']:.1f}-{s['end']:.1f}s",
               fill=(255, 255, 255))
    out = Path(project_dir) / "storyboard_preview.png"
    sheet.save(out)
    return out
