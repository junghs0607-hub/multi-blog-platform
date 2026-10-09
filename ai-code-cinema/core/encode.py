"""영상 렌더링 파이프라인: 프레임->H.264 + 오디오 결합."""
from __future__ import annotations
import subprocess
from pathlib import Path
from .common import ffmpeg_exe


def frames_to_video(frames_dir, out_path, fps: int, crf: int = 18) -> Path:
    ff = ffmpeg_exe()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [ff, "-y", "-framerate", str(fps), "-i",
           str(Path(frames_dir) / "frame_%06d.png"),
           "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out_path)]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return out_path


def mux(video_path, audio_path, out_path) -> Path:
    ff = ffmpeg_exe()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [ff, "-y", "-i", str(video_path), "-i", str(audio_path),
           "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
           "-shortest", "-movflags", "+faststart", str(out_path)]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return out_path


def probe(path) -> dict:
    """ffprobe 없이 ffmpeg -i 출력 파싱."""
    import re
    ff = ffmpeg_exe()
    p = subprocess.run([ff, "-i", str(path)], capture_output=True, text=True)
    info = {"path": str(path), "duration": 0.0, "width": 0, "height": 0,
            "fps": 0.0, "vcodec": "", "acodec": "", "raw": p.stderr}
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    if m:
        info["duration"] = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    m = re.search(r"Video: (\w+)[^,]*, [^,]*, (\d+)x(\d+)", p.stderr)
    if m:
        info["vcodec"], info["width"], info["height"] = m.group(1), int(m.group(2)), int(m.group(3))
    m = re.search(r"(\d+(?:\.\d+)?) fps", p.stderr)
    if m:
        info["fps"] = float(m.group(1))
    m = re.search(r"Audio: (\w+)", p.stderr)
    if m:
        info["acodec"] = m.group(1)
    return info
