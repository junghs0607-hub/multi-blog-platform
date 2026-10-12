import sharp from "sharp";
import type { AnalyzerInput, AnalyzerResult, ImageAnalyzer } from "../types";

/**
 * 기본 분석기 (외부 API/모델 없이 동작)
 *  - 64x64 로 축소한 픽셀을 HSL 기반으로 12가지 이름 있는 색상에 분류
 *  - 비율 상위 색상을 팔레트로, 일정 비율 이상인 색상을 "색상 태그" 라벨로 반환
 *  → "파랑", "분홍" 같은 색상 검색이 가능해지고, AI 자동 태그 파이프라인 전체를 검증할 수 있습니다.
 */

type ColorName =
  | "빨강"
  | "주황"
  | "노랑"
  | "초록"
  | "청록"
  | "파랑"
  | "보라"
  | "분홍"
  | "갈색"
  | "검정"
  | "흰색"
  | "회색";

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function classifyColor(r: number, g: number, b: number): ColorName {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.13) return "검정";
  if (l > 0.93) return "흰색";
  if (s < 0.15) return l > 0.8 ? "흰색" : l < 0.22 ? "검정" : "회색";
  if (h < 12 || h >= 340) return l > 0.72 ? "분홍" : l < 0.3 && s < 0.6 ? "갈색" : "빨강";
  if (h < 42) return l < 0.42 || (s < 0.45 && l < 0.6) ? "갈색" : "주황";
  if (h < 68) return l < 0.3 ? "갈색" : "노랑";
  if (h < 165) return "초록";
  if (h < 195) return "청록";
  if (h < 255) return "파랑";
  if (h < 290) return "보라";
  return l > 0.55 ? "분홍" : "보라";
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export class BasicColorAnalyzer implements ImageAnalyzer {
  readonly id = "basic";
  readonly version = "basic-color@1";

  async analyze(input: AnalyzerInput): Promise<AnalyzerResult> {
    const { data, info } = await sharp(input.buffer, { animated: false })
      .resize(64, 64, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<ColorName, { count: number; r: number; g: number; b: number }>();
    const total = info.width * info.height;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const name = classifyColor(r, g, b);
      const bucket = buckets.get(name) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(name, bucket);
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count);
    const colors = sorted.slice(0, 6).map(([name, v]) => ({
      name,
      ratio: Math.round((v.count / total) * 1000) / 1000,
      hex: `#${toHex(v.r / v.count)}${toHex(v.g / v.count)}${toHex(v.b / v.count)}`,
    }));

    // 무채색(흰색/회색/검정)은 배경색일 가능성이 높아 더 높은 비율에서만 라벨로 사용합니다.
    const labels = colors
      .filter((c) => (["흰색", "회색", "검정"].includes(c.name) ? c.ratio >= 0.45 : c.ratio >= 0.12))
      .slice(0, 3)
      .map((c) => ({ name: c.name, confidence: c.ratio }));

    return { labels, colors, modelVersion: this.version, raw: { sampled: total } };
  }
}
