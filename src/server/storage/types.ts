/** 저장소 드라이버 이름 (images.storage_driver 컬럼 값) */
export type StorageDriverName = "local" | "s3";

/** 키 접두어: 원본 / 중간 크기 / 썸네일 / 프로필 이미지 */
export type StoragePrefix = "originals" | "medium" | "thumbs" | "avatars";

/** get() 결과. body 는 Response 에 그대로 넘길 수 있습니다. */
export interface StoredObject {
  body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>;
  /** 바이트 수 (알 수 없으면 undefined) */
  size?: number;
  contentType?: string;
}

/**
 * 객체 저장소 추상화.
 * 키는 콘텐츠 주소(SHA-256) 기반이라 같은 키의 내용은 바뀌지 않습니다.
 */
export interface StorageDriver {
  readonly name: StorageDriverName;
  /** 저장 (같은 키가 있으면 덮어씀) */
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  /** 스트리밍 읽기. 없으면 null */
  get(key: string): Promise<StoredObject | null>;
  /** 전체를 메모리로 읽기 (이미지 분석 등). 없으면 null */
  getBuffer(key: string): Promise<Buffer | null>;
  /** 삭제. 없는 키는 무시합니다. */
  delete(key: string): Promise<void>;
}
