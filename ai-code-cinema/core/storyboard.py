"""스토리보드 시스템: 장면 계획 -> storyboard.json (시간 배분+검증)."""
from __future__ import annotations
from pathlib import Path
from .common import save_json, load_json, rng_for
from .director import plan_story

TRANSITION_DEFAULT = 0.6


def build_storyboard(config: dict, style: dict) -> dict:
    topic = config["topic"]
    duration = float(config["duration"])
    lang = config.get("language", "ko")
    seed = int(config.get("seed", 1))
    plan = plan_story(topic, duration, style, lang, seed)
    rng = rng_for("storyboard", topic, seed)
    scenes = plan["scenes"]
    n = len(scenes)
    # 장면 길이 배분 (에너지 높은 장면에 약간 더 할당)
    weights = [0.9 + 0.4 * s["energy"] + rng.random() * 0.2 for s in scenes]
    total = sum(weights)
    trans = float(style.get("transition_duration", TRANSITION_DEFAULT))
    trans_total = trans * (n - 1)
    avail = max(1.0, duration - trans_total)
    t = 0.0
    out = []
    for i, s in enumerate(scenes):
        dur = avail * weights[i] / total
        start, end = round(t, 3), round(t + dur, 3)
        cam = _camera_for(s, rng)
        out.append({
            "scene_id": s["scene_id"],
            "act": s["act"],
            "title": s["title"],
            "start": start,
            "end": end,
            "duration": round(dur, 3),
            "purpose": s["purpose"],
            "visual": {
                "background": style.get("background_rule", "스타일 배경"),
                "subject": s["subject"],
                "composition": s["composition"],
                "action": s["action"],
                "camera": cam["move"],
                "camera_from": cam["from"],
                "camera_to": cam["to"],
                "animation": f"{s['subject']} subject, {s['action']} motion",
            },
            "narration": {"text": s["narration"]},
            "transition_out": {"type": style.get("transition", "fade"), "duration": trans} if i < n - 1 else None,
            "music_energy": s["energy"],
        })
        t = end + (trans if i < n - 1 else 0)
    # 마지막 장면 끝을 duration에 맞춤
    if out:
        drift = round(duration - (out[-1]["end"]), 3)
        out[-1]["end"] = round(out[-1]["end"] + drift, 3)
        out[-1]["duration"] = round(out[-1]["duration"] + drift, 3)
    sb = {"topic": topic, "style": style.get("id"), "duration": duration,
          "message": plan["message"], "protagonist": plan["protagonist"],
          "keywords": plan["keywords"], "scenes": out}
    validate_storyboard(sb)
    return sb


def _camera_for(scene: dict, rng) -> dict:
    comp = scene["composition"]
    base = {"wide": 1.6, "medium": 1.0, "close": 0.6, "aerial": 1.8, "low_angle": 0.9}[comp]
    cx, cy = 0.5 + (rng.random() - 0.5) * 0.1, 0.5 + (rng.random() - 0.5) * 0.1
    moves = {
        "hook": ("push_in", 0.25), "build": ("pan", 0.12),
        "change": ("orbit", 0.2), "resolve": ("pull_back", -0.3),
    }
    move, dz = moves[scene["act"]]
    dx = (rng.random() - 0.5) * 0.16 if move in ("pan", "orbit") else (rng.random() - 0.5) * 0.04
    return {"move": move,
            "from": {"x": round(cx - dx / 2, 3), "y": round(cy, 3), "zoom": round(base - dz / 2, 3)},
            "to": {"x": round(cx + dx / 2, 3), "y": round(cy, 3), "zoom": round(base + dz / 2, 3)}}


def validate_storyboard(sb: dict) -> None:
    scenes = sb["scenes"]
    assert scenes, "장면이 비어 있습니다."
    prev_end = 0.0
    for s in scenes:
        assert s["end"] > s["start"], f"scene {s['scene_id']} 시간 오류"
        assert s["start"] >= prev_end - 1e-6, f"scene {s['scene_id']} 시간이 겹칩니다."
        prev_end = s["end"] + (s["transition_out"]["duration"] if s["transition_out"] else 0)
    assert abs(prev_end - sb["duration"]) < 0.05, f"전체 길이 불일치: {prev_end} vs {sb['duration']}"


def save_storyboard(project_dir: Path, sb: dict) -> Path:
    p = Path(project_dir) / "storyboard.json"
    save_json(p, sb)
    return p


def load_storyboard(project_dir: Path) -> dict:
    return load_json(Path(project_dir) / "storyboard.json")
