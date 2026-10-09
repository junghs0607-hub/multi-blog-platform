"""자막 시스템: SRT 생성 + 검증 (굽기는 렌더러에서 수행)."""
from __future__ import annotations
from pathlib import Path


def _ts(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(cues: list[dict], path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{_ts(c['start'])} --> {_ts(c['end'])}\n{c['text']}\n\n")
    return path


def validate_cues(cues: list[dict], duration: float) -> list[str]:
    problems = []
    for i, c in enumerate(cues):
        if c["end"] <= c["start"]:
            problems.append(f"cue{i}: end<=start")
        if c["start"] < 0 or c["end"] > duration + 0.01:
            problems.append(f"cue{i}: 범위 초과")
        if i and c["start"] < cues[i - 1]["end"] - 0.001:
            problems.append(f"cue{i}: 이전 자막과 겹침")
    return problems
