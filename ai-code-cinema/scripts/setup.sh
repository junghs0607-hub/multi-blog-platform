#!/usr/bin/env bash
# AI Code Cinema 설치 스크립트
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Python 의존성 설치 =="
pip install -r requirements.txt

echo "== 폰트 확인 =="
if [ ! -f assets/fonts/NotoSansKR-Regular.ttf ]; then
  echo "한글 폰트가 없습니다. scripts/fetch_font.sh 실행:"
  echo "  bash scripts/fetch_font.sh"
else
  echo "폰트 OK"
fi

echo "== 스타일 정의 생성 =="
python3 styles/_generate.py

echo "== ffmpeg 확인 =="
python3 -c "import sys; sys.path.insert(0,'.'); from core.common import ffmpeg_exe; print(ffmpeg_exe())"

echo "설치 완료. 테스트: python3 cinema.py --name test --duration 5 --resolution 1280x720"
