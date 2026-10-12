/**
 * 이미지 분석기 플러그인 인터페이스
 *
 * 새로운 AI 기능(자동 태그, 캡션, 임베딩 기반 유사도 검색 등)은 이 인터페이스를 구현한 뒤
 * registry.ts 에 등록하고 AI_ANALYZERS 환경 변수에 id 를 추가하면 업로드 파이프라인에 자동으로 연결됩니다.
 *
 *  - labels    → confidence ≥ AUTO_TAG_MIN_CONFIDENCE 이면 핀의 자동 태그(pin_tags.source='ai')로 추가
 *  - caption   → image_analyses.caption 에 저장 (대체 텍스트/검색 확장에 활용 가능)
 *  - colors    → 색상 팔레트 (상세 페이지 표시)
 *  - embedding → image_embeddings 에 저장 (pgvector 도입 시 유사 이미지 검색)
 */
export interface AnalyzerInput {
  imageId: number;
  /** 분석용 이미지 (최대 폭 1200px WebP) */
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

export interface AnalyzerLabel {
  name: string;
  /** 0 ~ 1 */
  confidence: number;
}

export interface AnalyzerResult {
  labels: AnalyzerLabel[];
  caption?: string | null;
  colors?: { hex: string; ratio: number; name?: string }[];
  embedding?: { model: string; vector: number[] } | null;
  raw?: unknown;
  modelVersion?: string;
}

export interface ImageAnalyzer {
  /** AI_ANALYZERS 에서 사용하는 식별자 (image_analyses.analyzer) */
  readonly id: string;
  readonly version: string;
  analyze(input: AnalyzerInput): Promise<AnalyzerResult>;
}
