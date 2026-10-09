"""감독 시스템: 주제+스타일 -> 이야기 구조(기승전결) -> 장면 계획."""
from __future__ import annotations
import re
from .common import rng_for

# 장면 기능(아크) 정의
ACTS = [
    {"act": "hook", "purpose_ko": "시청자의 관심 유도", "purpose_en": "Hook the viewer",
     "energy": 0.55, "camera": "push_in"},
    {"act": "build", "purpose_ko": "세계관과 주인공 소개", "purpose_en": "Introduce the world",
     "energy": 0.65, "camera": "pan"},
    {"act": "change", "purpose_ko": "갈등과 시각적 변화", "purpose_en": "Conflict and change",
     "energy": 0.9, "camera": "orbit"},
    {"act": "resolve", "purpose_ko": "결론과 메시지 전달", "purpose_en": "Resolution and message",
     "energy": 0.7, "camera": "pull_back"},
]

COMPOSITIONS = ["wide", "medium", "close", "aerial", "low_angle"]
ACTIONS = ["rise", "drift", "rotate", "pulse", "grow", "assemble", "flow", "orbiting"]
SUBJECTS = ["orb", "landscape", "city", "traveler", "tree", "chart", "gears", "waves", "rocket"]

NARR_KO = {
    "hook": ["{kw} 이야기는 작은 신호에서 시작됩니다.", "지금부터 {kw}의 세계로 안내합니다.",
             "모든 변화는 {kw}에서 시작됩니다."],
    "build": ["{kw}의 중심에는 빛나는 존재가 있습니다.", "이곳에서는 {kw}가 살아 움직입니다.",
              "{kw}를 이루는 조각들이 하나씩 모입니다."],
    "change": ["그러나 {kw} 앞에 새로운 파도가 밀려옵니다.", "{kw}의 질서가 흔들리기 시작합니다.",
               "어둠 속에서 {kw}가 시험대에 오릅니다."],
    "resolve": ["마침내 {kw}는 새로운 빛을 찾습니다.", "{kw}의 여정은 우리에게 답을 남깁니다.",
                "이제 {kw}의 이야기는 당신의 것이 됩니다."],
}
NARR_EN = {
    "hook": ["Every {kw} story begins with a small signal.", "Welcome to the world of {kw}.",
             "All change starts with {kw}."],
    "build": ["At the heart of {kw}, something glows.", "Here, {kw} comes alive.",
              "The pieces of {kw} gather one by one."],
    "change": ["But a new wave rushes toward {kw}.", "The order of {kw} begins to shake.",
               "{kw} faces its greatest trial."],
    "resolve": ["At last, {kw} finds a new light.", "The journey of {kw} leaves us an answer.",
                "Now the story of {kw} belongs to you."],
}

TITLE_KO = {"hook": "막이 오르다", "build": "세계", "change": "전환점", "resolve": "새로운 빛"}
TITLE_EN = {"hook": "The Signal", "build": "The World", "change": "The Turning", "resolve": "New Light"}


def keywords(topic: str, lang: str, n=3):
    words = [w for w in re.split(r"\s+", topic.strip()) if w]
    if not words:
        words = ["이야기"] if lang == "ko" else ["the story"]
    return words[:n]


def plan_story(topic: str, duration: float, style: dict, lang: str, seed: int) -> dict:
    """이야기 구조 설계. 영상 길이에 맞춰 장면 수 결정 (장면당 약 4~6초)."""
    rng = rng_for("director", topic, style.get("id"), seed)
    kw = keywords(topic, lang)
    main_kw = kw[0]
    n_scenes = max(2, min(12, round(duration / 5.0)))
    # 아크 배분: hook 1, resolve 1, 나머지를 build/change에 배분
    acts = ["hook"] + ["build"] * max(1, (n_scenes - 2 + 1) // 2) + ["change"] * max(1, (n_scenes - 2) // 2)
    acts = (acts + ["resolve"])[:n_scenes]
    while len(acts) < n_scenes:
        acts.insert(-1, "change" if rng.random() < 0.5 else "build")
    templates = NARR_KO if lang == "ko" else NARR_EN
    titles = TITLE_KO if lang == "ko" else TITLE_EN
    scenes = []
    used_comp = []
    for i, act in enumerate(acts):
        comp = COMPOSITIONS[(i * 2 + int(rng.integers(0, 3))) % len(COMPOSITIONS)]
        if used_comp and comp == used_comp[-1]:
            comp = COMPOSITIONS[(COMPOSITIONS.index(comp) + 2) % len(COMPOSITIONS)]
        used_comp.append(comp)
        tpl = templates[act][int(rng.integers(0, len(templates[act])))]
        scenes.append({
            "scene_id": i + 1,
            "act": act,
            "title": titles[act],
            "purpose": next(a for a in ACTS if a["act"] == act)["purpose_ko" if lang == "ko" else "purpose_en"],
            "subject": SUBJECTS[int(rng.integers(0, len(SUBJECTS)))],
            "composition": comp,
            "action": ACTIONS[int(rng.integers(0, len(ACTIONS)))],
            "energy": next(a for a in ACTS if a["act"] == act)["energy"],
            "narration": tpl.format(kw=main_kw),
        })
    # 주인공은 가장 많이 등장하는 피사체
    protagonist = max(set(s["subject"] for s in scenes), key=lambda s: sum(1 for x in scenes if x["subject"] == s))
    msg = f"{main_kw}의 여정을 통해 변화와 희망을 전한다." if lang == "ko" \
        else f"A journey of {main_kw}, delivering change and hope."
    return {"message": msg, "protagonist": protagonist, "keywords": kw, "scenes": scenes}
