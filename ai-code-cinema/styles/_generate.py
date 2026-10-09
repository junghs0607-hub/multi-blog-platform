"""43개 스타일 정의 파일(STYLE.md + style.json) 생성기."""
import json
from pathlib import Path

HERE = Path(__file__).parent

# id, en, kr, cat, palette(bg,bg2,fg,accent,accent2), bg_rule, texture, line,
# light, subject_rule, camera, step, transition, text_place, sfx, music, forbidden, params
STYLES = [
 ("crayon-book", "Crayon Picture Book", "크레용 그림책", "hand",
  ["#FFF6E5", "#F5E6C8", "#3A2E1E", "#E4572E", "#2E86AB"],
  "따뜻한 종이 배경에 크레용 질감", "crayon", "두껍고 거친 손그림 선",
  "부드러운 낮 조명", "단순한 둥근 피사체", "push_in", None, "dissolve",
  "bottom", "soft", "playful", "사실적 렌더링, 날카로운 직선, 네온 색상",
  {"grain": 0.5, "wobble": 3.0}),
 ("watercolor-brush", "Watercolor Brush", "수채화", "hand",
  ["#F7F3EA", "#E3D9C2", "#33415C", "#5DA9E9", "#C1666B"],
  "젖은 종이 위 번지는 배경 워시", "watercolor", "번지는 부드러운 윤곽",
  "확산광", "번짐 효과가 있는 피사체", "pan", None, "dissolve",
  "bottom", "soft", "calm", "선명한 픽셀, 강한 대비, 기하학적 직선",
  {"bleed": 0.6, "grain": 0.25}),
 ("chinese-ink-wash", "Chinese Ink Wash", "중국 수묵화", "hand",
  ["#F2EDE3", "#D8CFBB", "#1A1A1A", "#8C1D18", "#5A5A5A"],
  "여백이 많은宣纸(선지) 배경", "ink", "농담 있는 붓터치",
  "명암 대비의 여백 미학", "수묵 산수·달·학", "pan", None, "fade",
  "in-scene", "soft", "calm", "원색 채움, 서양 원근법, 장식 테두리",
  {"ink": 0.7, "grain": 0.2}),
 ("impasto-oil", "Impasto Oil Painting", "임파스토 유화", "hand",
  ["#2B2118", "#6B4F2A", "#F5E9D0", "#E8A020", "#7FB069"],
  "두꺼운 물감 터치의 캔버스", "impasto", "두꺼운 나이프 터치",
  "측광의 입체감", "두껍게 칠해진 풍경", "push_in", None, "dissolve",
  "bottom", "deep", "epic", "평면 벡터, 파스텔, 얇은 선",
  {"impasto": 0.8, "grain": 0.3}),
 ("one-line-drawing", "One-line Drawing", "한 줄 그림", "hand",
  ["#FAF7F0", "#EFEAE0", "#111111", "#111111", "#C0B8A8"],
  "미니멀 크림 배경", "none", "끊기지 않는 한 줄",
  "플랫", "한 붓 그리기 피사체", "pan", None, "fade",
  "bottom", "minimal", "calm", "채우기, 그림자, 여러 색상",
  {"draw_on": True, "grain": 0.05}),
 ("whiteboard-explainer", "Whiteboard Explainer", "화이트보드 설명 영상", "hand",
  ["#FFFFFF", "#F0F0F0", "#222222", "#D62828", "#1D6FB8"],
  "깨끗한 화이트보드", "none", "마커 손그림",
  "균일 조명", "그려지는 다이어그램", "pan", None, "wipe",
  "in-scene", "marker", "playful", "사진 질감, 그라데이션, 어두운 배경",
  {"draw_on": True, "hand": True}),
 ("urban-sketch", "Urban Sketch", "어반 스케치", "hand",
  ["#F4EFE6", "#D9CFBB", "#2B2B2B", "#C8553D", "#3D7EA6"],
  "스케치북 종이", "paper", "펜 드로잉 + 수채 워시",
  "자연광", "도시 풍경·건물", "pan", None, "dissolve",
  "bottom", "soft", "calm", "완벽한 직선, CG 광택, 네온",
  {"grain": 0.3, "wash": 0.5}),
 ("shadow-puppetry", "Shadow Puppetry", "그림자 인형극", "east-asian",
  ["#1A0E05", "#3D1F0D", "#F5DFA8", "#E8963C", "#7A2E1D"],
  "뒷조명 스크린", "cloth", "실루엣 윤곽",
  "강한 백라이트", "관절 인형 실루엣", "push_in", 12, "fade",
  "bottom", "deep", "dark", "밝은 전경, 세밀 묘사, 원색",
  {"grain": 0.35, "flicker": 0.15}),
 ("ukiyo-e", "Ukiyo-e", "우키요에 목판화", "east-asian",
  ["#EFE6D5", "#D9C9A8", "#1F1F1F", "#B5342C", "#2C5D8A"],
  "화지 질감 배경", "woodgrain", "굵은 먹선",
  "플랫", "파도·후지산·인물", "pan", None, "wipe",
  "in-scene", "soft", "calm", "그라데이션 음영, 사진, 서양 원근",
  {"grain": 0.25, "bands": True}),
 ("red-paper-cut", "Red Paper-cut", "붉은 종이 오리기", "east-asian",
  ["#F5EDDC", "#E3D3B3", "#B81F1F", "#8C1414", "#D9A441"],
  "미색 한지 배경", "paper", "오려낸 종이 가장자리",
  "플랫 + 종이 그림자", "붉은 대칭 문양", "push_in", None, "fade",
  "bottom", "soft", "calm", "그라데이션, 3D 음영, 사진",
  {"symmetry": True, "grain": 0.15}),
 ("paper-cut-lightbox", "Paper-cut Lightbox", "페이퍼컷 라이트박스", "east-asian",
  ["#0E1B2C", "#1E3A5C", "#FFF3D6", "#FFB347", "#4FA3A3"],
  "어두운 상자 속 조명 레이어", "paper", "레이어 단면",
  "내부 발광", "다층 종이 풍경", "push_in", None, "fade",
  "bottom", "soft", "dreamy", "낮 장면, 강한 채도 원색, 플랫 단층",
  {"layers": 5, "glow": 0.6}),
 ("risograph-print", "Risograph Print", "리소그래프 인쇄", "print",
  ["#F4F1EA", "#E5DCC8", "#222222", "#FF48B0", "#0078BF"],
  "재생지 배경", "riso", "거친 인쇄 가장자리",
  "플랫 + 오등록", "2~3도 분판 그래픽", "pan", None, "cut",
  "in-scene", "pop", "playful", "풀컬러 사진, 부드러운 그라데이션",
  {"misregister": 4.0, "grain": 0.45}),
 ("halftone-dossier", "Halftone Dossier", "복고풍 하프톤 인쇄", "print",
  ["#E8DCC0", "#C9B78C", "#2A2118", "#9C2B1B", "#3E5C50"],
  "오래된 서류 배경", "halftone", "잉크 번짐",
  "빈티지 플랫", "하프톤 인물·사물", "push_in", None, "wipe",
  "bottom", "retro", "dark", "선명한 디지털, 네온, 광택",
  {"halftone": 6, "grain": 0.4, "sepia": 0.5}),
 ("woodcut-print", "Woodcut Print", "목판화", "print",
  ["#EFE3CC", "#D6C096", "#191919", "#191919", "#8A5A2B"],
  "종이 배경", "woodgrain", "굵은 조각선",
  "강한 명암", "흑백 대비 그래픽", "push_in", None, "cut",
  "bottom", "deep", "epic", "회색조 그라데이션, 파스텔, 얇은 선",
  {"contrast": 0.9, "grain": 0.3}),
 ("copperplate-engraving", "Copperplate Engraving", "동판화", "print",
  ["#F1EAD8", "#D9CCAC", "#2A2419", "#5A4A2A", "#8A2A1B"],
  "고서지 배경", "hatch", "정밀 해칭선",
  "고전 명암", "해칭 음영 도판", "push_in", None, "fade",
  "bottom", "soft", "calm", "굵은 만화선, 원색, 디지털 효과",
  {"hatch": True, "grain": 0.3}),
 ("silkscreen-travel-poster", "Silkscreen Travel Poster", "실크스크린 여행 포스터", "print",
  ["#F5EDD8", "#E0D0A8", "#1F3A4D", "#E4572E", "#2E86AB"],
  "포스터 지면", "screen", "깨끗한 면 분할",
  "플랫", "여행지 풍경 포스터", "pan", None, "wipe",
  "in-scene", "pop", "bright", "사진 질감, 어두운 톤, 복잡한 디테일",
  {"bands": True, "grain": 0.2}),
 ("swiss-motion-graphics", "Swiss Motion Graphics", "스위스 모션그래픽", "graphic",
  ["#FFFFFF", "#F0F0F0", "#111111", "#E30613", "#111111"],
  "흰색 그리드", "none", "정확한 직선",
  "플랫", "그리드 기반 도형", "pan", None, "cut",
  "in-scene", "click", "minimal", "장식, 질감, 곡선 남용",
  {"grid": True, "grain": 0.0}),
 ("spy-title-60s", "60s Spy Title Sequence", "1960년대 첩보 타이틀", "graphic",
  ["#0D0D0D", "#1A1A2E", "#F5F5F5", "#E8B820", "#B5342C"],
  "어두운 실루엣 배경", "grain", "굵은 그래픽",
  "스포트라이트", "실루엣·타깃·총구", "push_in", None, "iris",
  "in-scene", "retro", "dark", "파스텔, 얇은 선, 밝은 배경",
  {"grain": 0.5, "vignette": 0.7}),
 ("art-deco", "Art Deco", "아르데코", "graphic",
  ["#0E1A1F", "#1E3A3A", "#E8C76A", "#C9A227", "#7FB3A3"],
  "어두운 대칭 배경", "gold", "대칭 기하 장식",
  "금속 광택", "대칭 장식 모티프", "push_in", None, "fade",
  "in-scene", "chime", "epic", "난잡한 비대칭, 원색, 손그림",
  {"symmetry": True, "glow": 0.3}),
 ("blueprint", "Blueprint", "청사진 기술 도면", "graphic",
  ["#0B3D91", "#0A2A5E", "#FFFFFF", "#7FD4FF", "#FFFFFF"],
  "푸른 도면지", "grid", "얇은 흰색 제도선",
  "플랫", "기술 도면·치수선", "pan", None, "wipe",
  "in-scene", "click", "minimal", "채우기 색, 사진, 장식",
  {"grid": True, "draw_on": True}),
 ("stained-glass", "Stained Glass", "스테인드글라스", "graphic",
  ["#101418", "#1C2B33", "#F5E9D0", "#2E86AB", "#B5342C"],
  "어두운 납골격", "glass", "두꺼운 납선",
  "투과광", "색유리 모자이크", "push_in", None, "fade",
  "bottom", "chime", "epic", "부드러운 그라데이션, 사진, 얇은 선",
  {"mosaic": True, "glow": 0.5}),
 ("pictogram-motion", "Pictogram Motion", "픽토그램 애니메이션", "graphic",
  ["#F5F5F5", "#E0E0E0", "#1A1A1A", "#1D6FB8", "#E4572E"],
  "단색 배경", "none", "균일한 픽토그램",
  "플랫", "움직이는 픽토그램", "pan", 12, "cut",
  "bottom", "pop", "playful", "그라데이션, 질감, 세밀 묘사",
  {"grain": 0.0}),
 ("ascii-crt-terminal", "ASCII / CRT Terminal", "ASCII CRT 터미널", "graphic",
  ["#0A0F0A", "#050805", "#33FF66", "#33FF66", "#FFB000"],
  "검은 CRT 화면", "scanline", "문자 셀",
  "형광 발광", "ASCII 아트 장면", "pan", 10, "cut",
  "in-scene", "retro", "dark", "부드러운 곡선, 사진, 파스텔",
  {"scanlines": True, "glow": 0.4, "flicker": 0.1}),
 ("data-storytelling", "Data Storytelling", "데이터 스토리텔링", "info",
  ["#0F1B2D", "#1B2F4B", "#F5F7FA", "#4FA3FF", "#FF6B6B"],
  "어두운 대시보드", "grid", "얇은 차트선",
  "UI 발광", "차트·숫자·그래프", "pan", None, "wipe",
  "in-scene", "click", "minimal", "손그림, 질감, 장식 배경",
  {"grid": True, "count_up": True}),
 ("isometric-infographic", "Isometric Infographic", "아이소메트릭 인포그래픽", "info",
  ["#F2F5F7", "#DDE6EC", "#2B3A42", "#2E86AB", "#E8A020"],
  "밝은 배경", "none", "깨끗한 아이소메트릭",
  "소프트 섀도우", "아이소 블록·차트", "orbit", None, "wipe",
  "bottom", "pop", "bright", "사진, 어두운 배경, 손그림",
  {"iso": True}),
 ("dark-tech-keynote", "Dark Tech Keynote", "다크 테크 키노트", "info",
  ["#050507", "#0E0E14", "#F5F5F7", "#2997FF", "#A855F7"],
  "순흑 무대", "none", "미니멀",
  "스포트라이트", "발광 제품", "push_in", None, "fade",
  "in-scene", "deep", "epic", "밝은 배경, 장식, 손그림",
  {"glow": 0.7, "vignette": 0.5}),
 ("living-screencast", "Living Screencast", "리빙 스크린캐스트", "info",
  ["#E8EDF2", "#CBD5E0", "#1A202C", "#3182CE", "#38A169"],
  "데스크톱 배경", "none", "UI 윈도우",
  "화면광", "앱 윈도우·커서", "pan", None, "wipe",
  "bottom", "click", "bright", "영화 조명, 질감, 장식",
  {"cursor": True}),
 ("scifi-hologram-hud", "Sci-fi Hologram HUD", "SF 홀로그램 HUD", "info",
  ["#020A12", "#062033", "#7FD4FF", "#00E5FF", "#FF4D6D"],
  "어두운 공간", "scanline", "얇은 홀로그램선",
  "홀로 발광", "HUD·홀로그램 지구", "orbit", None, "fade",
  "in-scene", "retro", "dark", "따뜻한 색, 종이 질감, 손그림",
  {"scanlines": True, "glow": 0.6, "flicker": 0.08}),
 ("rubber-hose-1930s", "1930s Rubber Hose Cartoon", "1930년대 러버호스 만화", "cartoon",
  ["#E8E0CC", "#CFC39F", "#1A1A1A", "#1A1A1A", "#8A8A8A"],
  "낡은 필름 배경", "grain", "고무호스 곡선",
  "플랫", "흑백 만화 캐릭터", "pan", 12, "iris",
  "in-scene", "retro", "playful", "컬러, 날카로운 직선, CG 광택",
  {"grain": 0.5, "vignette": 0.5, "flicker": 0.12}),
 ("cel-anime-80s", "80s Cel Anime", "1980년대 셀 애니메이션", "cartoon",
  ["#1B2A4A", "#3A5A8C", "#F5E9D0", "#FF4D6D", "#4FD4FF"],
  "석양 그라데이션 하늘", "cel", "셀 음영",
  "석양 역광", "셀 캐릭터·메카", "push_in", 12, "wipe",
  "bottom", "retro", "epic", "3D 렌더, 파스텔, 미니멀",
  {"cel_bands": 3, "grain": 0.25}),
 ("scifi-sitcom-toon", "Sci-Fi Sitcom Toon", "SF 시트콤 툰", "cartoon",
  ["#2B1B4D", "#4D2B6B", "#FFF3D6", "#FFD23F", "#3FE0A0"],
  "우주 거실 배경", "none", "굵은 카툰선",
  "밝은 스튜디오", "외계인 가족", "pan", 12, "cut",
  "bottom", "pop", "playful", "사실적, 어두운 톤, 세밀",
  {"grain": 0.05}),
 ("midcentury-cartoon", "Mid-century Cartoon", "미드센추리 교육 만화", "cartoon",
  ["#F0E6D2", "#D9C9A0", "#3A3A3A", "#C8553D", "#5A7D5A"],
  "종이 배경", "paper", "기하학적 단순선",
  "플랫", "기하학적 인물", "pan", 12, "wipe",
  "bottom", "pop", "playful", "그라데이션, 사실적, 네온",
  {"grain": 0.3}),
 ("pixel-rpg-16bit", "16-bit Pixel RPG", "16비트 픽셀 RPG", "game",
  ["#0F380F", "#306230", "#9BBC0F", "#8BAC0F", "#306230"],
  "픽셀 필드 배경", "pixel", "픽셀 계단",
  "플랫", "픽셀 캐릭터·타일", "pan", 8, "cut",
  "in-scene", "retro", "playful", "부드러운 곡선, 그라데이션, 고해상도",
  {"pixel": 4}),
 ("hd-2d", "HD-2D", "HD-2D", "game",
  ["#1A2238", "#2E3A5C", "#F5E9D0", "#FFB347", "#4FA3A3"],
  "입체 광원 배경 + 픽셀", "mixed", "픽셀 + 부드러운 빛",
  "블룸 조명", "픽셀 인물 + 3D 배경", "orbit", 10, "fade",
  "bottom", "retro", "epic", "플랫 단조, 원색 남용",
  {"pixel": 3, "glow": 0.5}),
 ("microgame-frenzy", "Microgame Frenzy", "마이크로게임 프렌지", "game",
  ["#111111", "#222222", "#FFFFFF", "#FFD23F", "#FF4D6D"],
  "빠르게 바뀌는 단색", "none", "굵은 플랫",
  "플랫", "미니게임 조각", "pan", 12, "cut",
  "in-scene", "pop", "playful", "느린 전개, 여백, 파스텔",
  {"fast_cut": True}),
 ("game-show-flat", "Game Show Flat", "게임쇼 플랫 그래픽", "game",
  ["#1B2A6B", "#2E4BA8", "#FFFFFF", "#FFD23F", "#FF4D6D"],
  "무대 배경", "none", "굵은 플랫",
  "스포트라이트", "패널·점수판", "pan", None, "wipe",
  "in-scene", "pop", "bright", "어두운 톤, 질감, 세밀",
  {"confetti": True}),
 ("silent-film-1920s", "1920s Silent Film", "1920년대 무성영화", "film",
  ["#0A0A0A", "#1A1A1A", "#E8E0C8", "#E8E0C8", "#8A8A8A"],
  "흑백 필름", "grain", "부드러운 흑백",
  "강한 명암", "무성영화 장면", "push_in", 16, "iris",
  "in-scene", "retro", "dark", "컬러, 현대 UI, CG",
  {"grain": 0.6, "vignette": 0.6, "flicker": 0.15, "scratch": True}),
 ("liminal-found-footage", "Liminal Found Footage", "리미널 파운드푸티지", "film",
  ["#14161A", "#23262B", "#C9C9C9", "#8A9A5B", "#5B6E7A"],
  "텅 빈 복도·주차장", "noise", "VHS 왜곡",
  "형광등", "텅 빈 공간", "pan", None, "cut",
  "bottom", "deep", "dark", "밝은 색, 선명함, 안정감",
  {"grain": 0.45, "vignette": 0.55, "tracking": True, "timestamp": True}),
 ("brick-toy", "Brick Toy", "블록 장난감", "material",
  ["#F0EDE4", "#D9D2C0", "#333333", "#D01012", "#1D6FB8"],
  "밝은 테이블", "plastic", "브릭 스터드",
  "스튜디오 소프트박스", "브릭 조립 장면", "orbit", 12, "cut",
  "bottom", "pop", "playful", "사실적 재질, 어두운 톤, 곡면 남용",
  {"studs": True}),
 ("paper-pop-up-book", "Paper Pop-up Book", "종이 팝업북", "material",
  ["#F7F2E5", "#E0D4B8", "#4A3F30", "#C8553D", "#3D7EA6"],
  "펼쳐진 책", "paper", "접힌 종이 가장자리",
  "소프트 섀도우", "팝업 종이 조형", "push_in", None, "wipe",
  "bottom", "soft", "playful", "금속 광택, 네온, 사진",
  {"fold_shadow": True, "grain": 0.15}),
 ("tilt-shift-miniature", "Tilt-Shift Miniature", "틸트시프트 미니어처", "material",
  ["#87B5D6", "#5A8AB0", "#F5F5F5", "#E8A020", "#3E5C50"],
  "미니어처 도시", "miniature", "얕은 피사계",
  "밝은 낮", "미니어처 마을", "pan", None, "fade",
  "bottom", "soft", "bright", "어두운 톤, 강한 대비, 노이즈",
  {"tilt_blur": 0.8, "saturation": 1.3}),
 ("lowpoly-isometric-island", "Low-poly Isometric Island", "로우폴리 섬", "material",
  ["#AEE3F5", "#5EB1D6", "#2B3A42", "#7FB069", "#E8A020"],
  "하늘 그라데이션", "facet", "로우폴리 면",
  "따뜻한 태양광", "떠다니는 섬", "orbit", None, "fade",
  "bottom", "soft", "dreamy", "사실적 질감, 어두운 톤, 노이즈",
  {"facets": True}),
 ("glass-product-render", "Glass Product Render", "글래스 제품 렌더링", "material",
  ["#0A0E14", "#16202E", "#F5F7FA", "#7FD4FF", "#C9A7FF"],
  "어두운 스튜디오", "glass", "굴절 하이라이트",
  "림라이트", "유리 제품", "orbit", None, "fade",
  "bottom", "chime", "epic", "종이 질감, 손그림, 밝은 배경",
  {"glow": 0.6, "reflection": True}),
]

MD_TEMPLATE = """# {en} ({kr})

- 카테고리: {cat}
- 렌더러: `{renderer}`

## 색상 팔레트

- 배경: {bg} / {bg2}
- 전경: {fg}
- 강조: {accent}, {accent2}

## 배경 표현

{bg_rule}

## 재질과 질감

- 질감: {texture}

## 선과 윤곽선

{line}

## 조명과 그림자

{light}

## 피사체 표현 방식

{subject_rule}

## 카메라 움직임

- 기본 움직임: {camera}

## 애니메이션 특성

- 스텝 모션: {step}

## 장면 전환

- 기본 전환: {transition}

## 화면 구성

- 텍스트 배치: {text_place}

## 텍스트 표현

- 자막/화면 텍스트는 `{text_place}` 위치에 배치한다.

## 효과음 특성

- 프로필: {sfx}

## 음악 분위기

- 기본 무드: {music}

## 금지할 시각적 표현

{forbidden}

## 최소 구현

`core/render_py.py`의 `{renderer}` 렌더러가 이 스타일을 실제로 렌더링한다.
팔레트·질감·전환·모션 규
칙을 파라미터로 강제하며, 다른 스타일과 시각적으로 구분된다.
"""

CAT_KR = {"hand": "손그림과 회화", "east-asian": "동아시아 전통 미술", "print": "인쇄 및 판화",
          "graphic": "그래픽 및 타이포그래피", "info": "정보 전달 및 제품 소개",
          "cartoon": "만화 및 애니메이션", "game": "게임 그래픽", "film": "영화와 시대 표현",
          "material": "재료 표현과 3D"}


def main():
    index = []
    for s in STYLES:
        (sid, en, kr, cat, pal, bg_rule, texture, line, light, subj, camera,
         step, trans, tplace, sfx, music, forbidden, params) = s
        renderer = sid.replace("-", "_")
        d = HERE / sid
        d.mkdir(exist_ok=True)
        md = MD_TEMPLATE.format(en=en, kr=kr, cat=CAT_KR[cat], renderer=renderer,
                                bg=pal[0], bg2=pal[1], fg=pal[2], accent=pal[3],
                                accent2=pal[4], bg_rule=bg_rule, texture=texture,
                                line=line, light=light, subject_rule=subj,
                                camera=camera, step=f"{step}fps" if step else "부드러운 모션",
                                transition=trans, text_place=tplace, sfx=sfx,
                                music=music, forbidden=forbidden)
        (d / "STYLE.md").write_text(md, encoding="utf-8")
        style_json = {"id": sid, "name_en": en, "name_kr": kr, "category": cat,
                      "palette": {"bg": pal[0], "bg2": pal[1], "fg": pal[2],
                                  "accent": pal[3], "accent2": pal[4]},
                      "background_rule": bg_rule, "texture": texture, "line": line,
                      "lighting": light, "subject_rule": subj, "camera": camera,
                      "step_fps": step, "transition": trans, "transition_duration": 0.6,
                      "text_place": tplace, "sfx_profile": sfx, "music_mood": music,
                      "forbidden": forbidden, "renderer": renderer, "params": params}
        (d / "style.json").write_text(json.dumps(style_json, ensure_ascii=False, indent=2),
                                      encoding="utf-8")
        index.append({"id": sid, "name_en": en, "name_kr": kr, "category": cat})
    (HERE / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2),
                                     encoding="utf-8")
    print(f"generated {len(index)} styles")


if __name__ == "__main__":
    main()
