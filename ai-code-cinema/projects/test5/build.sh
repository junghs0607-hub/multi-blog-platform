#!/usr/bin/env bash
# 5초 테스트 영상 재생성 (1280x720, 수채화)
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 cinema.py --name test5 --topic "작은 신호에서 시작되는 변화" --duration 5 \
  --resolution 1280x720 --style watercolor-brush all
