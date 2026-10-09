#!/usr/bin/env python3
"""AI Code Cinema CLI: init / storyboard / render / all / validate / styles."""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from core.common import ROOT, load_json, save_json, resolution_for  # noqa: E402


def load_style(style_id: str) -> dict:
    p = ROOT / "styles" / style_id / "style.json"
    if not p.exists():
        ids = sorted(d.name for d in (ROOT / "styles").iterdir() if (d / "style.json").exists())
        raise SystemExit(f"알 수 없는 스타일: {style_id}\n사용 가능: {', '.join(ids)}")
    return load_json(p)


def load_config(args) -> dict:
    cfg = load_json(ROOT / "config" / "default.json")
    for k in ("topic", "duration", "aspect", "resolution", "fps", "style",
              "language", "voice", "music_mood", "engine", "seed"):
        v = getattr(args, k, None)
        if v is not None:
            cfg[k] = v
    if getattr(args, "no_subtitles", False):
        cfg["subtitles"] = False
    if getattr(args, "no_sfx", False):
        cfg["sfx"] = False
    if cfg["music_mood"] == "auto":
        cfg["music_mood"] = load_style(cfg["style"]).get("music_mood", "calm")
    return cfg


def cmd_styles(_args):
    idx = load_json(ROOT / "styles" / "index.json")
    print(f"스타일 {len(idx)}종:")
    for s in idx:
        print(f"  {s['id']:28s} {s['name_kr']} ({s['name_en']}) [{s['category']}]")


def cmd_init(args):
    from core.storyboard import build_storyboard, save_storyboard
    from core.timeline import build_timeline, save_timeline
    cfg = load_config(args)
    style = load_style(cfg["style"])
    proj = ROOT / "projects" / args.name
    proj.mkdir(parents=True, exist_ok=True)
    for d in ("audio/voices", "audio/music", "audio/sfx", "audio/stems",
              "subtitles", "frames", "output", "logs", "src/scenes"):
        (proj / d).mkdir(parents=True, exist_ok=True)
    save_json(proj / "config.json", cfg)
    print(f"[1/3] 스토리보드 생성 (주제: {cfg['topic']}, 스타일: {style['name_kr']})")
    sb = build_storyboard(cfg, style)
    save_storyboard(proj, sb)
    print(f"      장면 {len(sb['scenes'])}개, 길이 {sb['duration']}초")
    print("[2/3] 타임라인 생성")
    tl = build_timeline(sb, cfg)
    save_timeline(proj, tl)
    print(f"      자막 {len(tl['subtitles'])}개, 효과음 {len(tl['sfx'])}개")
    print("[3/3] 웹 렌더러 생성 (render(t) 인터페이스)")
    from core.webapp import generate
    html = generate(proj, sb, tl, style, cfg)
    print(f"      {html}")
    if cfg.get("storyboard_preview", True):
        from core.render_py import storyboard_preview
        prev = storyboard_preview(proj, sb, tl, style, cfg)
        print(f"      미리보기: {prev}")
    print(f"완료: {proj}")


def cmd_render(args):
    from core.timeline import load_timeline, save_timeline
    from core.storyboard import load_storyboard
    from core import audio_tts, audio_music, audio_sfx, audio_mix
    from core.subtitles import write_srt, validate_cues
    from core import encode
    proj = ROOT / "projects" / args.name
    cfg = load_json(proj / "config.json")
    style = load_json(proj / "style.json") if (proj / "style.json").exists() else load_style(cfg["style"])
    sb = load_storyboard(proj)
    tl = load_timeline(proj)
    W, H = resolution_for(cfg.get("aspect", "16:9"), cfg.get("resolution", "1920x1080"))
    W -= W % 2
    H -= H % 2
    print(f"프로젝트: {args.name} ({W}x{H}@{cfg.get('fps', 24)}fps, {sb['duration']}s)")
    if cfg.get("engine", "python") == "web":
        from core import render_web
        print("[1/7] 웹 렌더러 프레임 캡처")
        frames = render_web.render_sequence(proj, sb, style, cfg)
    else:
        from core.render_py import render_sequence
        print("[1/7] 프레임 렌더링 (Python 엔진)")
        frames = render_sequence(proj, sb, tl, style, cfg, workers=args.workers)
    print("[2/7] 음성 생성")
    tts = audio_tts.synthesize(tl, sb, cfg, proj)
    tl["narration"] = tts["narration"]
    tl["subtitles"] = tts["subtitles"]
    save_timeline(proj, tl)
    print(f"      엔진={tts['engine']}, 문장 {len(tts['narration'])}개")
    print("[3/7] 배경음악 생성")
    mood = cfg.get("music_mood", "calm")
    audio_music.compose(sb["duration"], sb, mood, int(cfg.get("seed", 1)), proj)
    print(f"      무드={mood}, 스템 4트랙")
    print("[4/7] 효과음 배치")
    audio_sfx.render_sfx(tl, sb["duration"], proj)
    print(f"      이벤트 {len(tl['sfx'])}개")
    print("[5/7] 자막 생성")
    srt = write_srt(tl["subtitles"], proj / "subtitles" / "subtitles.srt")
    probs = validate_cues(tl["subtitles"], sb["duration"])
    print(f"      {srt} ({'OK' if not probs else probs})")
    print("[6/7] 오디오 믹싱 + loudnorm")
    mx = audio_mix.mix(sb["duration"], proj, float(cfg.get("loudness_lufs", -14)))
    print(f"      peak={mx['peak']:.3f}")
    print("[7/7] 영상 인코딩 + 결합")
    silent = encode.frames_to_video(frames, proj / "output" / "video_silent.mp4",
                                    int(cfg.get("fps", 24)))
    final = encode.mux(silent, mx["final"], proj / "output" / "final.mp4")
    print(f"완료: {final} ({final.stat().st_size / 1e6:.1f} MB)")


def cmd_validate(args):
    from core.storyboard import load_storyboard
    from core import validate as V
    proj = ROOT / "projects" / args.name
    cfg = load_json(proj / "config.json")
    sb = load_storyboard(proj)
    report = V.run_all(proj, proj / "output" / "final.mp4", cfg, sb)
    V.print_report(report)
    if not report["pass"]:
        raise SystemExit(1)


def cmd_all(args):
    cmd_init(args)
    cmd_render(args)
    cmd_validate(args)


def main():
    ap = argparse.ArgumentParser(prog="cinema", description="AI Code Cinema")
    ap.add_argument("--name", default="example", help="프로젝트 이름")
    ap.add_argument("--topic", default=None)
    ap.add_argument("--duration", type=float, default=None)
    ap.add_argument("--aspect", default=None, choices=["16:9", "9:16", "1:1"])
    ap.add_argument("--resolution", default=None)
    ap.add_argument("--fps", type=int, default=None)
    ap.add_argument("--style", default=None)
    ap.add_argument("--language", default=None, choices=["ko", "en"])
    ap.add_argument("--voice", default=None)
    ap.add_argument("--music_mood", default=None)
    ap.add_argument("--engine", default=None, choices=["python", "web"])
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--no_subtitles", action="store_true")
    ap.add_argument("--no_sfx", action="store_true")
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("command", nargs="?", default="all",
                    choices=["init", "render", "validate", "all", "styles"])
    args = ap.parse_args()
    {"init": cmd_init, "render": cmd_render, "validate": cmd_validate,
     "all": cmd_all, "styles": cmd_styles}[args.command](args)


if __name__ == "__main__":
    main()
