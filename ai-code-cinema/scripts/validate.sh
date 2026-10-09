#!/usr/bin/env bash
# 검증만 실행: bash scripts/validate.sh [프로젝트명]
set -euo pipefail
cd "$(dirname "$0")/.."
python3 cinema.py --name "${1:-example}" validate
