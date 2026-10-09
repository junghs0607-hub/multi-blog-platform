#!/usr/bin/env bash
# 전체 파이프라인 실행: bash scripts/render.sh [프로젝트명] [추가 cinema.py 옵션...]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:-example}"
shift || true
python3 cinema.py --name "$NAME" "$@" all
