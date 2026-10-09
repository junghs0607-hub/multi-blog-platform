#!/usr/bin/env bash
# 9:16 세로형 테스트 (720x1280, 픽셀 RPG)
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 cinema.py --name test916 --topic "픽셀 용사의 모험" --duration 5 \
  --aspect 9:16 --resolution 720x1280 --style pixel-rpg-16bit --workers 2 all
