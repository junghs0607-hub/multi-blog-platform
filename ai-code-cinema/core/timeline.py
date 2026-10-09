"""타임라인 시스템: 영상/음성/음악/효과음/자막의 단일 시간 기준."""
from __future__ import annotations
from pathlib import Path
from .common import save_json, load_json

SFX_BY_ACT = {
    "hook": [("soft_impact", 0.15), ("shimmer", 0.7)],
    "build": [("pop", 0.25), ("tick", 0.6)],
    "change": [("whoosh", 0.1), ("thud", 0.5), ("riser", 0.85)],
    "resolve": [("chime", 0.2), ("soft_impact", 0.7)],
}


def build_timeline(storyboard: dict, config: dict) -> dict:
    """스토리보드 -> 타임라인 (장면/카메라/내레이션/자막/효과음/음악 이벤트)."""
    scenes, events, cues, sfx = [], [], [], []
    for s in storyboard["scenes"]:
        scenes.append({"scene_id": s["scene_id"], "act": s["act"], "start": s["start"],
                       "end": s["end"], "transition_out": s["transition_out"]})
        # 내레이션: 장면 시작 +0.3초부터 (TTS 실측 후 조정)
        events.append({"kind": "narration", "scene_id": s["scene_id"],
                       "text": s["narration"]["text"], "start": round(s["start"] + 0.3, 3),
                       "end": None, "source": "estimated"})
        cues.append({"scene_id": s["scene_id"], "text": s["narration"]["text"],
                     "start": round(s["start"] + 0.3, 3), "end": None})
        if config.get("sfx", True):
            for kind, frac in SFX_BY_ACT.get(s["act"], []):
                tt = s["start"] + (s["end"] - s["start"]) * frac
                sfx.append({"time": round(tt, 3), "type": kind, "scene_id": s["scene_id"],
                            "volume": 0.7, "pan": 0.0})
        if s["transition_out"]:
            tt = s["end"] + s["transition_out"]["duration"] / 2
            sfx.append({"time": round(tt, 3), "type": "whoosh_soft", "scene_id": s["scene_id"],
                        "volume": 0.4, "pan": 0.0})
    # 자막 종료시간: 다음 자막 시작 -0.1 또는 장면 끝
    starts = [c["start"] for c in cues]
    for i, c in enumerate(cues):
        nxt = starts[i + 1] - 0.15 if i + 1 < len(starts) else storyboard["duration"]
        sc = scenes[i]
        c["end"] = round(min(nxt, sc["end"] + 0.4), 3)
        events[i]["end"] = c["end"]
    tl = {"duration": storyboard["duration"], "fps": config.get("fps", 24),
          "scenes": scenes, "narration": events, "subtitles": cues, "sfx": sorted(sfx, key=lambda e: e["time"]),
          "music": {"mood": config.get("music_mood", "auto"), "ducking": True}}
    validate_timeline(tl)
    return tl


def retime(duration: float, tl: dict) -> dict:
    """전체 길이가 바뀌면 타임라인 재계산 (비율 스케일)."""
    factor = duration / tl["duration"]
    def sc(t):
        return round(t * factor, 3) if t is not None else None
    out = {"duration": duration, "fps": tl["fps"], "scenes": [], "narration": [],
           "subtitles": [], "sfx": [], "music": tl["music"]}
    for s in tl["scenes"]:
        out["scenes"].append({**s, "start": sc(s["start"]), "end": sc(s["end"])})
    for e in tl["narration"]:
        out["narration"].append({**e, "start": sc(e["start"]), "end": sc(e["end"])})
    for c in tl["subtitles"]:
        out["subtitles"].append({**c, "start": sc(c["start"]), "end": sc(c["end"])})
    for e in tl["sfx"]:
        out["sfx"].append({**e, "time": sc(e["time"])})
    return out


def validate_timeline(tl: dict) -> None:
    prev = 0.0
    for s in tl["scenes"]:
        assert s["start"] >= prev - 1e-6 and s["end"] > s["start"]
        prev = s["end"]
    for c in tl["subtitles"]:
        assert c["end"] > c["start"], f"자막 시간 오류: {c}"


def save_timeline(project_dir: Path, tl: dict) -> Path:
    p = Path(project_dir) / "timeline.json"
    save_json(p, tl)
    return p


def load_timeline(project_dir: Path) -> dict:
    return load_json(Path(project_dir) / "timeline.json")
