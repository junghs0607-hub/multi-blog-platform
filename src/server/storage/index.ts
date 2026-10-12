import { env } from "@/server/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageDriver, StorageDriverName, StoragePrefix } from "./types";

export type { StorageDriver, StorageDriverName, StoragePrefix, StoredObject } from "./types";

/**
 * 저장소 키 형식: {originals|medium|thumbs|avatars}/<sha 1–2번째 글자>/<sha 3–4번째 글자>/<sha256>.<ext>
 * 콘텐츠 주소 기반이라 같은 파일은 같은 키가 됩니다. /api/files 는 이 형식이 아닌 키를 모두 거부합니다.
 */
export const STORAGE_KEY_RE =
  /^(originals|medium|thumbs|avatars)\/([0-9a-f]{2})\/([0-9a-f]{2})\/\2\3[0-9a-f]{60}\.(jpg|png|webp|gif|avif)$/;

/** 확장자 → Content-Type */
export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function storageKey(prefix: StoragePrefix, sha256: string, ext: string): string {
  return `${prefix}/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}.${ext}`;
}

const drivers = new Map<StorageDriverName, StorageDriver>();

/** 이름으로 드라이버 가져오기. 이미지 행에 기록된 드라이버로 읽고 지울 때 사용합니다. */
export function getDriver(name: StorageDriverName): StorageDriver {
  let driver = drivers.get(name);
  if (!driver) {
    driver =
      name === "s3"
        ? new S3Storage({
            bucket: env.S3_BUCKET,
            region: env.S3_REGION,
            endpoint: env.S3_ENDPOINT,
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            forcePathStyle: env.S3_FORCE_PATH_STYLE,
          })
        : new LocalStorage(env.LOCAL_STORAGE_DIR);
    drivers.set(name, driver);
  }
  return driver;
}

/** 새 파일을 저장할 기본 드라이버 (STORAGE_DRIVER) */
export function getStorage(): StorageDriver {
  return getDriver(env.STORAGE_DRIVER);
}

/**
 * 브라우저에서 쓸 파일 URL.
 * S3 + S3_PUBLIC_URL 이면 CDN 에서 직접, 그 밖에는 /api/files/* 프록시로 서빙합니다.
 */
export function fileUrl(driver: string, key: string): string {
  if (driver === "s3" && env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  return `/api/files/${key}`;
}
