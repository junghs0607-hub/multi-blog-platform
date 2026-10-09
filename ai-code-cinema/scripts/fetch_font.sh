#!/usr/bin/env bash
# Noto Sans KR (OFL 라이선스) 폰트 확보: npm @fontsource -> woff2 -> TTF 변환
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
cd "$TMP"
npm pack @fontsource/noto-sans-kr >/dev/null
tar xzf fontsource-noto-sans-kr-*.tgz
pip install -q fonttools brotli
python3 -c "
from fontTools.ttLib import TTFont
for w, n in [('400','Regular'), ('700','Bold')]:
    f = TTFont(f'package/files/noto-sans-kr-korean-{w}-normal.woff2')
    f.flavor = None
    f.save(f'NotoSansKR-{n}.ttf')
print('converted')
"
mkdir -p ../assets/fonts
cp NotoSansKR-Regular.ttf NotoSansKR-Bold.ttf ../assets/fonts/
cd - >/dev/null
rm -rf "$TMP"
echo "폰트 저장 완료: assets/fonts/"
