"""배경음악: 신시사이저 합성 (스템 분리 + 장면 에너지 자동화)."""
from __future__ import annotations
import wave
from pathlib import Path
import numpy as np

SR = 44100

MOODS = {
    "calm":   {"bpm": 72,  "prog": [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
               "drums": 0.25, "lead": 0.4, "bass": 0.5, "bright": 0.3},
    "bright": {"bpm": 104, "prog": [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
               "drums": 0.7, "lead": 0.7, "bass": 0.7, "bright": 0.8},
    "dark":   {"bpm": 80,  "prog": [[50, 53, 57], [46, 50, 53], [43, 47, 50], [45, 49, 52]],
               "drums": 0.5, "lead": 0.3, "bass": 0.9, "bright": 0.2},
    "epic":   {"bpm": 120, "prog": [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]],
               "drums": 1.0, "lead": 0.9, "bass": 0.9, "bright": 0.7},
    "playful": {"bpm": 132, "prog": [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]],
               "drums": 0.8, "lead": 0.8, "bass": 0.8, "bright": 0.9},
    "dreamy": {"bpm": 90,  "prog": [[48, 52, 55, 59], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66]],
               "drums": 0.3, "lead": 0.5, "bass": 0.4, "bright": 0.5},
    "minimal": {"bpm": 100, "prog": [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
               "drums": 0.4, "lead": 0.2, "bass": 0.6, "bright": 0.3},
    "retro":  {"bpm": 112, "prog": [[48, 52, 55], [46, 50, 53], [43, 47, 50], [55, 59, 62]],
               "drums": 0.6, "lead": 0.8, "bass": 0.7, "bright": 0.6},
}


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def _lowpass(x, alpha):
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y


def _adsr(n, a=0.05, d=0.1, s=0.7, r=0.2):
    na, nd, nr = int(n * a), int(n * d), int(n * r)
    ns = max(0, n - na - nd - nr)
    parts = []
    if na:
        parts.append(np.linspace(0, 1, na))
    if nd:
        parts.append(np.linspace(1, s, nd))
    if ns:
        parts.append(np.full(ns, s))
    if nr:
        parts.append(np.linspace(s, 0, nr))
    e = np.concatenate(parts) if parts else np.ones(n)
    return e[:n].astype(np.float32)


def compose(duration: float, storyboard: dict, mood: str, seed: int, project_dir) -> Path:
    project_dir = Path(project_dir)
    mood = mood if mood in MOODS else "calm"
    M = MOODS[mood]
    rng = np.random.default_rng(seed)
    n = int(duration * SR)
    beat = 60.0 / M["bpm"]
    bar = beat * 4
    # 장면 에너지 자동화 곡선
    energy = np.full(n, 0.6, dtype=np.float32)
    for s in storyboard["scenes"]:
        i0, i1 = int(s["start"] * SR), int(min(s["end"], duration) * SR)
        energy[i0:i1] = s.get("music_energy", 0.6)
    k = np.ones(int(SR * 0.5)) / int(SR * 0.5)
    energy = np.convolve(energy, k, mode="same").astype(np.float32)
    pad = np.zeros(n, dtype=np.float32)
    bass = np.zeros(n, dtype=np.float32)
    drums = np.zeros(n, dtype=np.float32)
    lead = np.zeros(n, dtype=np.float32)
    # 패드: 마디별 코드
    nbars = max(1, int(duration / bar) + 1)
    for b in range(nbars):
        chord = M["prog"][b % len(M["prog"])]
        i0, i1 = int(b * bar * SR), min(n, int((b + 1) * bar * SR))
        if i0 >= n:
            break
        m = i1 - i0
        t = np.arange(m) / SR
        env = _adsr(m, a=0.3, d=0.1, s=0.8, r=0.3)
        for note in chord:
            f = midi(note)
            pad[i0:i1] += (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.005 * t)) * env
    pad *= 0.12
    # 베이스: 8분음표 루트
    eighth = beat / 2
    nb = int(duration / eighth)
    for b in range(nb):
        chord = M["prog"][(b // 8) % len(M["prog"])]
        f = midi(chord[0] - 12)
        i0, i1 = int(b * eighth * SR), min(n, int((b * eighth + eighth * 0.9) * SR))
        m = i1 - i0
        if m <= 0:
            continue
        t = np.arange(m) / SR
        bass[i0:i1] += (np.sin(2 * np.pi * f * t) + 0.3 * np.sign(np.sin(2 * np.pi * f * t))) * _adsr(m, a=0.01, r=0.3)
    bass *= 0.16 * (0.5 + M["bass"])
    # 드럼: 킥/햇/스네어
    def kick_at(t0, v):
        i0 = int(t0 * SR)
        m = min(int(0.25 * SR), n - i0)
        if m <= 0:
            return
        t = np.arange(m) / SR
        f = 120 * np.exp(-t * 18) + 45
        ph = np.cumsum(f / SR)
        drums[i0:i0 + m] += np.sin(2 * np.pi * ph) * np.exp(-t * 12) * v
    def hat_at(t0, v):
        i0 = int(t0 * SR)
        m = min(int(0.06 * SR), n - i0)
        if m <= 0:
            return
        drums[i0:i0 + m] += rng.standard_normal(m).astype(np.float32) * np.exp(-np.arange(m) / SR * 120) * v * 0.4
    def snare_at(t0, v):
        i0 = int(t0 * SR)
        m = min(int(0.2 * SR), n - i0)
        if m <= 0:
            return
        t = np.arange(m) / SR
        drums[i0:i0 + m] += (rng.standard_normal(m).astype(np.float32) * 0.6 +
                             np.sin(2 * np.pi * 190 * t) * 0.5) * np.exp(-t * 18) * v
    nbts = int(duration / beat)
    for b in range(nbts):
        e = float(energy[min(n - 1, int(b * beat * SR))])
        dl = M["drums"] * (0.4 + e)
        kick_at(b * beat, 0.9 * dl)
        hat_at(b * beat + eighth, 0.5 * dl)
        if b % 2 == 1:
            snare_at(b * beat, 0.7 * dl)
    drums *= 0.5
    # 리드: 펜타토닉 모티프
    scale = [0, 2, 4, 7, 9, 12, 14, 16]
    motif = rng.integers(0, len(scale), size=16)
    q = beat / 2
    nq = int(duration / q)
    for i in range(nq):
        e = float(energy[min(n - 1, int(i * q * SR))])
        if e < 0.55 and rng.random() < 0.5:
            continue
        bar_chord = M["prog"][int(i * q / bar) % len(M["prog"])]
        root = max(bar_chord) + 12
        f = midi(root + scale[motif[i % 16]])
        i0, i1 = int(i * q * SR), min(n, int((i * q + q * 0.85) * SR))
        m = i1 - i0
        if m <= 0:
            continue
        t = np.arange(m) / SR
        tri = 2 * np.abs(2 * (f * t % 1) - 1) - 1
        lead[i0:i1] += tri * _adsr(m, a=0.02, r=0.25) * (0.05 + 0.06 * M["lead"]) * (0.5 + e)
    # 에너지로 드럼/리드 스케일 + 페이드
    fade = np.ones(n, dtype=np.float32)
    nf = min(n, int(1.2 * SR))
    fade[:nf] = np.linspace(0, 1, nf)
    fade[-nf:] = np.linspace(1, 0, nf)
    stems = {"pad": pad * fade, "bass": bass * fade, "drums": drums * fade, "lead": lead * fade}
    stems_dir = project_dir / "audio" / "stems"
    stems_dir.mkdir(parents=True, exist_ok=True)
    for name, x in stems.items():
        _write_mono(stems_dir / f"{name}.wav", x)
    mix = (pad + bass + drums + lead) * fade * 0.5
    mix = np.stack([mix, mix], axis=1)
    out = project_dir / "audio" / "music_mix.wav"
    _write_stereo(out, mix)
    return out


def _write_mono(path: Path, x: np.ndarray):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def _write_stereo(path: Path, x: np.ndarray):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
