"""웹 렌더러 프레임 캡처 (Playwright + Chromium, 선택 기능)."""
from __future__ import annotations
import shutil
import subprocess
from pathlib import Path
from .common import ROOT, resolution_for


def available() -> bool:
    return shutil.which("node") is not None


def render_sequence(project_dir, storyboard: dict, style: dict, config: dict) -> Path:
    from .webapp import generate
    from .timeline import load_timeline
    project_dir = Path(project_dir)
    html = generate(project_dir, storyboard, load_timeline(project_dir), style, config)
    W, H = resolution_for(config.get("aspect", "16:9"), config.get("resolution", "1920x1080"))
    frames = project_dir / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    cap = ROOT / "web" / "capture.mjs"
    subprocess.run(["node", str(cap), "--html", str(html), "--out", str(frames),
                    "--dur", str(storyboard["duration"]), "--fps", str(config.get("fps", 24)),
                    "--w", str(W - W % 2), "--h", str(H - H % 2)], check=True)
    return frames
