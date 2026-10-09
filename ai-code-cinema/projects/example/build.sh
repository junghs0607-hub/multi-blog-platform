#!/usr/bin/env bash
# 예제 프로젝트 재생성 (30초, 1920x1080, 수채화)
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 cinema.py --name example --topic "파도 위를 걷는 꿈" --duration 30 \
  --resolution 1920x1080 --style watercolor-brush --workers 2 all
