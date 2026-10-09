"""효과음 시스템: NumPy 합성 + EV 이벤트 배치."""
from __future__ import annotations
import wave
from pathlib import Path
import numpy as np

SR = 44100


def _env(n, a=0.01, r=0.15):
    e = np.ones(n, dtype=np.float32)
    na, nr = int(n * a), int(n * r)
    if na > 0:
        e[:na] = np.linspace(0, 1, na)
    if nr > 0:
        e[-nr:] = np.linspace(1, 0, nr)
    return e


def _tone(freq, dur, slide_to=None):
    n = int(dur * SR)
    f0 = np.full(n, freq, dtype=np.float32)
    if slide_to:
        f0 = np.linspace(freq, slide_to, n).astype(np.float32)
    ph = np.cumsum(f0 / SR)
    return np.sin(2 * np.pi * ph).astype(np.float32) * _env(n)


def _noise(dur, low=0.0):
    n = int(dur * SR)
    x = np.random.default_rng(7).standard_normal(n).astype(np.float32)
    if low > 0:  # 원폴 로우패스
        y = np.zeros_like(x)
        for i in range(1, n):
            y[i] = y[i - 1] + low * (x[i] - y[i - 1])
        x = y * 3
    return x * _env(n)


def _pad(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n, dtype=np.float32)
    for x in xs:
        out[:len(x)] += x
    return out


def synth(kind: str) -> np.ndarray:
    if kind == "soft_impact":
        return _pad(_tone(90, 0.5, 45) * 0.9, _noise(0.3) * 0.15)
    if kind == "thud":
        return _tone(60, 0.4, 35) * 1.0
    if kind == "pop":
        return _tone(400, 0.12, 900) * 0.7
    if kind == "tick" or kind == "click":
        return _pad(_tone(1200, 0.05) * 0.5, _noise(0.03) * 0.2)
    if kind == "marker":
        return _tone(800, 0.09, 500) * 0.4 + _noise(0.09) * 0.25
    if kind == "whoosh":
        n = int(0.8 * SR)
        x = _noise(0.8)
        sweep = np.sin(np.linspace(0, np.pi, n)).astype(np.float32)
        return x * sweep * 0.8
    if kind == "whoosh_soft":
        n = int(0.6 * SR)
        return _noise(0.6) * np.sin(np.linspace(0, np.pi, n)).astype(np.float32) * 0.35
    if kind == "riser":
        n = int(1.2 * SR)
        x = _noise(1.2) * np.linspace(0.1, 1, n).astype(np.float32)
        return _pad(x * 0.5, _tone(200, 1.2, 900) * 0.25)
    if kind == "shimmer":
        return sum(_tone(f, 0.9) * (0.3 / (i + 1)) for i, f in enumerate([1200, 1800, 2400, 3200]))
    if kind == "chime":
        return _pad(_tone(880, 1.2) * 0.5, _tone(1320, 1.0) * 0.3, _tone(660, 1.4) * 0.3)
    return _tone(440, 0.2) * 0.4


def render_sfx(timeline: dict, duration: float, project_dir) -> Path:
    project_dir = Path(project_dir)
    track = np.zeros((int(duration * SR), 2), dtype=np.float32)
    sfx_dir = project_dir / "audio" / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)
    for ev in timeline.get("sfx", []):
        x = synth(ev["type"]) * float(ev.get("volume", 0.7))
        pan = float(ev.get("pan", 0.0))
        gl, gr = (1 - pan) / 1.0, (1 + pan) / 1.0
        s0 = int(ev["time"] * SR)
        if s0 >= len(track):
            continue
        seg = np.stack([x * gl, x * gr], axis=1)
        e0 = min(len(track), s0 + len(seg))
        track[s0:e0] += seg[:e0 - s0]
    # 효과음 상한 (-12dB)
    track = np.clip(track, -0.25, 0.25) * 1.0
    out = project_dir / "audio" / "sfx_track.wav"
    pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return out
