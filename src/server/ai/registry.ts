import { env } from "@/server/env";
import { BasicColorAnalyzer } from "./analyzers/basic";
import type { ImageAnalyzer } from "./types";

/**
 * 사용 가능한 분석기 레지스트리.
 * 예) OpenAI Vision / Google Vision / CLIP 임베딩 분석기를 추가하려면:
 *   1. src/server/ai/analyzers/<name>.ts 에 ImageAnalyzer 구현
 *   2. 아래 factories 에 등록
 *   3. .env 의 AI_ANALYZERS=basic,<name> 으로 활성화
 */
const factories: Record<string, () => ImageAnalyzer> = {
  basic: () => new BasicColorAnalyzer(),
};

export function getEnabledAnalyzers(): ImageAnalyzer[] {
  return env.AI_ANALYZERS.flatMap((id) => {
    const factory = factories[id];
    if (!factory) {
      console.warn(`[ai] 알 수 없는 분석기 "${id}" 는 무시됩니다.`);
      return [];
    }
    return [factory()];
  });
}

export function registeredAnalyzerIds(): string[] {
  return Object.keys(factories);
}
