"""음성 생성: 모듈식 로컬 TTS (kokoro-onnx / espeak / 추정 폴백)."""
from __future__ import annotations
import shutil
import subprocess
import wave
from pathlib import Path
import numpy as np

SR = 44100


def estimate_duration(text: str, lang: str) -> float:
    text = text.strip()
    if lang == "ko":
        return max(1.0, len(text) / 4.5 + 0.4)
    words = max(1, len(text.split()))
    return max(1.0, words / 2.4 + 0.4)


def detect_engine(voice: str = "auto") -> str:
    """사용 가능한 TTS 엔진 탐지: kokoro | espeak | none."""
    if voice not in ("auto", "kokoro", "espeak", "none"):
        voice = "auto"
    kokoro_ok = False
    try:
        import kokoro_onnx  # noqa
        from .common import ROOT
        kokoro_ok = (ROOT / "assets" / "tts" / "kokoro.onnx").exists()
    except Exception:
        kokoro_ok = False
    espeak = shutil.which("espeak-ng") or shutil.which("espeak")
    if voice == "kokoro":
        return "kokoro" if kokoro_ok else "none"
    if voice == "espeak":
        return "espeak" if espeak else "none"
    if voice == "none":
        return "none"
    if kokoro_ok:
        return "kokoro"
    if espeak:
        return "espeak"
    return "none"


def _write_wav(path: Path, audio: np.ndarray, sr: int = SR):
    path.parent.mkdir(parents=True, exist_ok=True)
    audio = np.clip(audio, -1, 1)
    pcm = (audio * 32767).astype(np.int16)
    if pcm.ndim == 1:
        pcm = pcm[:, None]
    nch = pcm.shape[1]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(nch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def _kokoro_synth(text: str, lang: str, voice: str, out: Path) -> float | None:
    try:
        import kokoro_onnx
        import onnxruntime  # noqa
        from .common import ROOT
        model = ROOT / "assets" / "tts" / "kokoro.onnx"
        voices = ROOT / "assets" / "tts" / "voices.bin"
        sess = kokoro_onnx.Kokoro(str(model), str(voices))
        samples, sr = sess.create(text, voice=voice, speed=1.0, lang="ko" if lang == "ko" else "en-us")
        import scipy.io.wavfile as wavfile
        wavfile.write(str(out), sr, (np.array(samples) * 32767).astype(np.int16))
        return len(samples) / sr
    except Exception as e:
        print(f"  [tts] kokoro 실패, 폴백: {e}")
        return None


def _espeak_synth(text: str, lang: str, out: Path) -> float | None:
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        return None
    try:
        v = "ko" if lang == "ko" else "en"
        subprocess.run([exe, "-v", v, "-s", "160", "-w", str(out), text],
                       capture_output=True, check=True, timeout=60)
        with wave.open(str(out), "rb") as w:
            return w.getnframes() / w.getframerate()
    except Exception as e:
        print(f"  [tts] espeak 실패, 폴백: {e}")
        return None


def synthesize(timeline: dict, storyboard: dict, config: dict, project_dir) -> dict:
    """문장별 음성 생성 -> 전체 길이 보이스 트랙 + 확정 타이밍 반환."""
    from .common import save_json
    project_dir = Path(project_dir)
    lang = config.get("language", "ko")
    engine = detect_engine(config.get("voice", "auto"))
    print(f"  [tts] engine={engine} lang={lang}")
    voices = project_dir / "audio" / "voices"
    duration = storyboard["duration"]
    track = np.zeros(int(duration * SR), dtype=np.float32)
    narration = []
    scenes = {s["scene_id"]: s for s in storyboard["scenes"]}
    for i, ev in enumerate(timeline["narration"]):
        text = ev["text"]
        start = ev["start"]
        wav_path = voices / f"scene_{ev['scene_id']:02d}.wav"
        actual = None
        if engine == "kokoro":
            actual = _kokoro_synth(text, lang, "kf_haerin" if lang == "ko" else "af_sarah", wav_path)
        elif engine == "espeak":
            actual = _espeak_synth(text, lang, wav_path)
        if actual is None:
            actual = estimate_duration(text, lang)
            _write_wav(wav_path, np.zeros(int(actual * SR), dtype=np.float32))
            source = "estimated_silence"
        else:
            source = engine
        # 장면 끝에 맞춰 클램프 (전환 구간 침범 방지)
        sc = scenes[ev["scene_id"]]
        end = min(start + actual, sc["end"] + 0.4, duration)
        if source != "estimated_silence":
            with wave.open(str(wav_path), "rb") as w:
                raw = w.readframes(w.getnframes())
                ch = w.getnchannels()
                sr0 = w.getframerate()
            pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
            if ch > 1:
                pcm = pcm.reshape(-1, ch).mean(axis=1)
            if sr0 != SR:  # 간단 리샘플
                idx = (np.arange(int(len(pcm) * SR / sr0)) * sr0 / SR).astype(int)
                pcm = pcm[np.clip(idx, 0, len(pcm) - 1)]
            need = int((end - start) * SR)
            pcm = pcm[:need]
            s0 = int(start * SR)
            track[s0:s0 + len(pcm)] += pcm[:max(0, len(track) - s0)]
        narration.append({"scene_id": ev["scene_id"], "text": text,
                          "start": round(start, 3), "end": round(end, 3),
                          "wav": str(wav_path.relative_to(project_dir)), "source": source})
    track_path = project_dir / "audio" / "voice_track.wav"
    _write_wav(track_path, track)
    save_json(project_dir / "audio" / "narration.json", narration)
    # 자막 타이밍을 음성에 맞춤
    subs = []
    for n in narration:
        subs.append({"scene_id": n["scene_id"], "text": n["text"],
                     "start": n["start"], "end": n["end"]})
    return {"narration": narration, "voice_track": str(track_path), "subtitles": subs,
            "engine": engine}
