"""렌더링 검증: 파일/길이/해상도/코덱/검은화면/순서/오디오/자막 검사."""
from __future__ import annotations
import wave
from pathlib import Path
import numpy as np
from PIL import Image
from .common import save_json
from .encode import probe


def check_video(path: Path, expect: dict) -> dict:
    info = probe(path)
    checks = {}
    checks["exists"] = Path(path).exists() and Path(path).stat().st_size > 0
    checks["duration_ok"] = abs(info["duration"] - expect["duration"]) < 0.6
    checks["resolution_ok"] = (info["width"], info["height"]) == (expect["width"], expect["height"])
    checks["fps_ok"] = abs(info["fps"] - expect["fps"]) < 0.5
    checks["vcodec_ok"] = info["vcodec"] in ("h264", "avc")
    checks["acodec_ok"] = info["acodec"] == "aac"
    return {"info": {k: v for k, v in info.items() if k != "raw"}, "checks": checks}


def check_frames(frames_dir: Path, expect_count: int) -> dict:
    files = sorted(frames_dir.glob("frame_*.png"))
    res = {"count": len(files), "count_ok": len(files) == expect_count,
           "order_ok": True, "black_frames": []}
    for i, f in enumerate(files):
        if f.name != f"frame_{i:06d}.png":
            res["order_ok"] = False
    # 샘플링 검사: 10프레임
    idx = np.linspace(0, max(0, len(files) - 1), min(10, len(files))).astype(int)
    for i in idx:
        img = np.asarray(Image.open(files[i]).convert("L")).astype(np.float32)
        if img.mean() < 2.0:
            res["black_frames"].append(files[i].name)
    res["black_ok"] = not res["black_frames"]
    return res


def check_audio(wav_path: Path, duration: float) -> dict:
    with wave.open(str(wav_path), "rb") as w:
        n, sr = w.getnframes(), w.getframerate()
        raw = w.readframes(n)
    pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    peak = float(np.abs(pcm).max())
    rms = float(np.sqrt((pcm ** 2).mean()))
    return {"duration": n / sr, "duration_ok": abs(n / sr - duration) < 0.6,
            "peak": peak, "clipping_ok": peak < 0.999, "rms": rms,
            "silent": rms < 1e-4}


def run_all(project_dir, video_path, config: dict, storyboard: dict) -> dict:
    from .common import resolution_for
    project_dir = Path(project_dir)
    W, H = resolution_for(config.get("aspect", "16:9"), config.get("resolution", "1920x1080"))
    W -= W % 2
    H -= H % 2
    fps = int(config.get("fps", 24))
    expect = {"duration": float(config["duration"]), "width": W, "height": H, "fps": fps}
    report = {
        "video": check_video(video_path, expect),
        "frames": check_frames(project_dir / "frames", int(round(expect["duration"] * fps))),
        "audio": check_audio(project_dir / "audio" / "final_mix.wav", expect["duration"]),
        "srt_exists": (project_dir / "subtitles" / "subtitles.srt").exists(),
    }
    ok = (all(report["video"]["checks"].values()) and report["frames"]["count_ok"]
          and report["frames"]["order_ok"] and report["frames"]["black_ok"]
          and report["audio"]["duration_ok"] and report["audio"]["clipping_ok"])
    report["pass"] = bool(ok)
    save_json(project_dir / "validation_report.json", report)
    return report


def print_report(report: dict) -> None:
    print("== 검증 결과 ==")
    for k, v in report["video"]["checks"].items():
        print(f"  video.{k}: {'OK' if v else 'FAIL'}")
    print(f"  video info: {report['video']['info']}")
    for k in ("count_ok", "order_ok", "black_ok"):
        print(f"  frames.{k}: {'OK' if report['frames'][k] else 'FAIL'}")
    print(f"  frames.count: {report['frames']['count']}")
    a = report["audio"]
    print(f"  audio.duration_ok: {'OK' if a['duration_ok'] else 'FAIL'} "
          f"peak={a['peak']:.3f} rms={a['rms']:.4f}")
    print(f"  srt_exists: {'OK' if report['srt_exists'] else 'FAIL'}")
    print(f"  => {'PASS' if report['pass'] else 'FAIL'}")
