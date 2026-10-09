"""오디오 믹싱: 덕킹 + 페이드 + 피크 검사 + 2단계 loudnorm."""
from __future__ import annotations
import json
import subprocess
import wave
from pathlib import Path
import numpy as np
from .common import ffmpeg_exe

SR = 44100


def read_wav_stereo(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch == 1:
        x = np.stack([pcm, pcm], axis=1)
    else:
        x = pcm.reshape(-1, ch)[:, :2]
    if sr != SR:
        idx = (np.arange(int(len(x) * SR / sr)) * sr / SR).astype(int)
        x = x[np.clip(idx, 0, len(x) - 1)]
    return x


def write_wav_stereo(path: Path, x: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def ducking_gain(voice: np.ndarray, th=0.02, low=0.25, attack=0.05, release=0.4) -> np.ndarray:
    env = np.abs(voice.mean(axis=1))
    k = np.ones(max(1, int(SR * 0.03))) / max(1, int(SR * 0.03))
    env = np.convolve(env, k, mode="same")
    target = np.where(env > th, low, 1.0).astype(np.float32)
    g = np.ones_like(target)
    step_up = 1 / (SR * attack)
    step_down = 1 / (SR * release)
    cur = 1.0
    for i in range(len(target)):
        t = target[i]
        if t < cur:
            cur = max(t, cur - (1 - low) * step_up * SR / SR - 0.02)
        else:
            cur = min(t, cur + (1 - low) * step_down * SR / SR + 0.002)
        g[i] = cur
    return g


def mix(duration: float, project_dir, target_lufs: float = -14.0) -> dict:
    project_dir = Path(project_dir)
    n = int(duration * SR)
    voice = read_wav_stereo(project_dir / "audio" / "voice_track.wav")
    music = read_wav_stereo(project_dir / "audio" / "music_mix.wav")
    sfx = read_wav_stereo(project_dir / "audio" / "sfx_track.wav")

    def fit(x):
        if len(x) >= n:
            return x[:n]
        return np.pad(x, ((0, n - len(x)), (0, 0)))
    voice, music, sfx = fit(voice), fit(music), fit(sfx)
    # 덕킹: 음성 구간에서 음악 -12dB
    if np.abs(voice).max() > 0.001:
        g = ducking_gain(voice)[:, None]
        music = music * (0.35 + 0.65 * g)
    else:
        music = music * 0.8
    out = voice * 1.0 + music * 0.9 + sfx * 1.0
    nf = min(n, int(0.4 * SR))
    out[:nf] *= np.linspace(0, 1, nf)[:, None]
    out[-nf:] *= np.linspace(1, 0, nf)[:, None]
    peak = float(np.abs(out).max())
    if peak > 0.89:
        out = out / peak * 0.89
    pre = project_dir / "audio" / "mix_premaster.wav"
    write_wav_stereo(pre, out)
    # 2단계 loudnorm
    ff = ffmpeg_exe()
    af1 = f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json"
    p = subprocess.run([ff, "-y", "-i", str(pre), "-af", af1, "-f", "null", "-"],
                       capture_output=True, text=True)
    try:
        js = json.loads(p.stderr[p.stderr.index("{"):p.stderr.rindex("}") + 1])
    except Exception:
        js = {}
    af2 = (f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11"
           f":measured_I={js.get('input_i', target_lufs)}"
           f":measured_TP={js.get('input_tp', -3)}"
           f":measured_LRA={js.get('input_lra', 7)}"
           f":measured_thresh={js.get('input_thresh', -50)}"
           f":offset={js.get('target_offset', 0)}:linear=true")
    final = project_dir / "audio" / "final_mix.wav"
    subprocess.run([ff, "-y", "-i", str(pre), "-af", af2, "-ar", "44100",
                    str(final)], capture_output=True, check=True)
    return {"premaster": str(pre), "final": str(final), "peak": peak,
            "loudness_measured": js}
