# AI Code Cinema

주제와 스타일을 입력하면 **스토리 구성 → 애니메이션 → 음성 → 음악 → 효과음 → 자막 → MP4 렌더링**까지
자동으로 수행하는 코드 기반 영상 제작 시스템.

유료 영상 생성 API, 특정 AI 에이전트, Claude Code 플러그인에 의존하지 않는다.
일반 프로그래밍 도구(Python + Pillow/NumPy + FFmpeg)만으로 모든 프레임을 코드로 그리고,
오디오를 합성해 최종 MP4를 만든다.

## 파이프라인

```
주제/스타일 입력
  → 감독(director) : 기승전결 이야기 설계
  → 스토리보드(storyboard.json) : 장면별 연출 정의 + 시간 검증
  → 타임라인(timeline.json) : 영상/음성/음악/효과음/자막 단일 시간 기준
  → 프레임 렌더링 : 시간 t 기반 render (Python 엔진 / 웹 엔진)
  → 음성(TTS/추정) + 음악(신스) + 효과음(합성) → 덕킹 믹싱 → loudnorm(-14 LUFS)
  → H.264 + AAC MP4 결합 → 자동 검증
```

모든 애니메이션은 절대 시간 `t`의 함수이며 이전 프레임에 의존하지 않는다.
같은 입력(주제/스타일/시드)은 항상 같은 영상을 재현한다(고정 시드 난수).

## 디렉터리 구조

```
ai-code-cinema/
  cinema.py            # CLI (init/render/validate/all/styles)
  requirements.txt     # 필수: numpy, pillow, imageio-ffmpeg(+ffmpeg 정적 바이너리)
  package.json         # 선택: 웹 렌더러 캡처용 (playwright)
  config/default.json  # 기본값 (30초, 1920x1080, 24fps, H.264+AAC)
  styles/              # 43종 스타일 정의 (STYLE.md + style.json)
  core/                # director, storyboard, timeline, render_py, render_web,
                       # draw, subjects, styles_a/b, audio_tts/music/sfx/mix,
                       # subtitles, encode, validate, webapp
  web/capture.mjs      # Playwright 프레임 캡처 스크립트
  scripts/             # setup.sh, render.sh, validate.sh, fetch_font.sh
  assets/fonts/        # Noto Sans KR (OFL)
  projects/            # example(30초 1080p), test5, test916 결과물
```

## 설치

```bash
cd ai-code-cinema
bash scripts/setup.sh
```

- 필수: Python 3.10+, `pip install -r requirements.txt`
  (`imageio-ffmpeg`가 ffmpeg 정적 바이너리를 함께 제공 — 별도 ffmpeg 설치 불필요)
- 선택(웹 엔진): `npm install` + `npx playwright install chromium`
- 선택(실제 음성): `espeak-ng` 설치 또는 Kokoro ONNX 모델을 `assets/tts/`에 배치

## 사용법

```bash
# 전체 파이프라인 (주제만 바꿔 재사용)
python3 cinema.py --name myfilm --topic "심해 탐험대의 하루" --duration 30 \
  --style scifi-hologram-hud --aspect 16:9 --resolution 1920x1080 all

# 단계별
python3 cinema.py --name myfilm init       # 스토리보드+타임라인+미리보기+웹렌더러
python3 cinema.py --name myfilm render     # 프레임+오디오+인코딩
python3 cinema.py --name myfilm validate   # 자동 검증

# 스타일 목록 (43종)
python3 cinema.py styles
```

주요 옵션: `--duration`, `--aspect {16:9,9:16,1:1}`, `--resolution`, `--fps`,
`--style`, `--language {ko,en}`, `--voice {auto,kokoro,espeak,none}`,
`--music_mood`, `--engine {python,web}`, `--seed`, `--no_subtitles`, `--no_sfx`, `--workers`.

웹 엔진 사용 시: `--engine web` (Chromium 필요. `index.html`의 `render(t)`를 캡처)

## 시간 기반 렌더러 인터페이스 (웹)

각 프로젝트의 `index.html`은 다음 인터페이스를 제공한다.

```js
window.DUR = 30;            // 전체 길이(초)
window.render = function(t) { /* 시간 t의 프레임 그리기 */ };
window.READY = true;        // 리소스 준비 완료
window.EV = [...];          // 효과음 이벤트 [{time, type, volume}]
window.TEXTS = function(t) { return [...]; };  // 표시 텍스트
```

## 스타일 시스템 (43종)

`styles/<id>/STYLE.md`에 팔레트·배경·질감·선·조명·카메라·모션·전환·
텍스트·효과음·음악·금기 표현을 정의하고, `style.json`이 렌더 파라미터로 강제한다.
`core/styles_a.py`, `core/styles_b.py`의 43개 전용 렌더러가 실제로 각각 다르게 그린다.
새 스타일 추가 = 디렉터리 1개 + 렌더러 함수 1개 (엔진 수정 불필요).

| 카테고리 | 스타일 |
|---|---|
| 손그림·회화 | crayon-book, watercolor-brush, chinese-ink-wash, impasto-oil, one-line-drawing, whiteboard-explainer, urban-sketch |
| 동아시아 전통 | shadow-puppetry, ukiyo-e, red-paper-cut, paper-cut-lightbox |
| 인쇄·판화 | risograph-print, halftone-dossier, woodcut-print, copperplate-engraving, silkscreen-travel-poster |
| 그래픽·타이포 | swiss-motion-graphics, spy-title-60s, art-deco, blueprint, stained-glass, pictogram-motion, ascii-crt-terminal |
| 정보·제품 | data-storytelling, isometric-infographic, dark-tech-keynote, living-screencast, scifi-hologram-hud |
| 만화 | rubber-hose-1930s, cel-anime-80s, scifi-sitcom-toon, midcentury-cartoon |
| 게임 | pixel-rpg-16bit, hd-2d, microgame-frenzy, game-show-flat |
| 영화·시대 | silent-film-1920s, liminal-found-footage |
| 재료·3D | brick-toy, paper-pop-up-book, tilt-shift-miniature, lowpoly-isometric-island, glass-product-render |

## 오디오

- **음성**: kokoro-onnx → espeak → 추정 타이밍(무음+자막) 순서로 자동 폴백.
  문장별 WAV 생성 후 실측 길이로 타임라인/자막을 확정한다.
- **음악**: NumPy 신시사이저. 8종 무드, pad/bass/drums/lead 4스템 분리,
  장면 에너지 자동화 + 페이드.
- **효과음**: 11종 합성음(soft_impact, whoosh, riser, chime 등)을 EV 시간에 배치.
- **믹싱**: 음성 구간 음악 덕킹, 피크/클리핑 검사, 2단계 loudnorm (-14 LUFS).

## 테스트 결과 (2026-10-09, CPU 2코어 샌드박스)

| 프로젝트 | 조건 | 결과 |
|---|---|---|
| `test5` | 5초, 1280x720, 수채화 | PASS (H.264+AAC, 120프레임, loudnorm 믹싱) |
| `example` | 30초, 1920x1080, 수채화 | PASS (720프레임, 검증 12항목 전체 OK) |
| `test916` | 5초, 720x1280(9:16), 픽셀RPG | PASS |
| 43종 스모크 | 스타일별 3프레임 렌더 | 43/43 OK |
| 웹 렌더러 | DUR/render/READY/EV/TEXTS | JS 문법 검사 OK |

검증 항목: 파일 존재, 길이, 해상도, fps, 비디오/오디오 코덱, 검은 화면,
프레임 수·순서, 오디오 길이·피크·클리핑, SRT 존재.
리포트: `projects/<name>/validation_report.json`

### 정상 작동

스토리보드/타임라인 생성·검증, 43종 스타일 렌더링, 카메라·전환 8종,
스텝 모션(픽셀/셀), 병렬 프레임 렌더링, 음악·효과음 합성, SRT+자막 굽기,
덕킹 믹싱, 2단계 loudnorm, H.264/AAC 인코딩, 자동 검증, 웹 렌더러 생성.

### 이 환경에서 미검증·폴백

- **실제 TTS 음성**: kokoro 모델·espeak이 없어 추정 타이밍(무음)+자막으로 폴백.
  모듈은 완성되어 있어 엔진만 설치하면 실측 타이밍으로 동작한다.
- **Chromium 캡처**: 샌드박스에 브라우저가 없어 웹 엔진 캡처는 미실행.
  `index.html`+`capture.mjs`는 제공되며 JS 문법은 검증済.
- STT 기반 음성 검증, 단어별 강제 정렬: 인터페이스 자리만 있고 미구현.

## 라이선스 유의

- Noto Sans KR: SIL Open Font License 1.1 (상업적 이용 가능)
- imageio-ffmpeg의 정적 FFmpeg: GPL/LGPL ( johnvansickle.com 빌드 ) —
  배포 시 라이선스 확인 필요. 시스템 ffmpeg이 있으면 그것을 우선 사용한다.
- 음악·효과음·폰트 외 외부 리소스 없음. 모든 영상·음향은 코드로 생성된다.
