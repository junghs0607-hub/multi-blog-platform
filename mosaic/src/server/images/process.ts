import { createHash } from "node:crypto";
import sharp, { type Metadata, type Sharp } from "sharp";
import { env, UPLOAD_MAX_BYTES } from "@/server/env";
import { AppError, Errors } from "@/server/http";

/**
 * 업로드 이미지 검증 및 변환 파이프라인
 *
 *  1) 크기 제한 → 2) 매직 바이트로 실제 형식 판별(확장자/Content-Type 불신)
 *  3) 선언된 MIME/확장자와 실제 형식 일치 확인 → 4) sharp 로 디코딩 가능 여부 + 해상도/픽셀 수 제한(디컴프레션 폭탄 방지)
 *  5) SHA-256(정확 중복), dHash(유사 중복) 계산 → 6) 원본 정제 + medium/thumb 변형 생성
 */

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "avif";

export const FORMAT_INFO: Record<ImageFormat, { mime: string; ext: string; exts: string[] }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg", exts: ["jpg", "jpeg", "jfif", "jpe"] },
  png: { mime: "image/png", ext: "png", exts: ["png"] },
  webp: { mime: "image/webp", ext: "webp", exts: ["webp"] },
  gif: { mime: "image/gif", ext: "gif", exts: ["gif"] },
  avif: { mime: "image/avif", ext: "avif", exts: ["avif"] },
};

export const ALLOWED_MIME_TYPES = Object.values(FORMAT_INFO).map((f) => f.mime);

export const THUMB_WIDTH = 474; // 236px 컬럼의 2x (Retina)
export const MEDIUM_WIDTH = 1200;
export const AVATAR_SIZE = 320;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 파일 앞부분의 시그니처(매직 바이트)로 실제 이미지 형식을 판별합니다. SVG 등은 거부됩니다. */
export function sniffFormat(buf: Buffer): ImageFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (buf.length >= 6) {
    const head = buf.toString("ascii", 0, 6);
    if (head === "GIF87a" || head === "GIF89a") return "gif";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (buf.length >= 16 && buf.toString("ascii", 4, 8) === "ftyp") {
    const boxSize = Math.min(buf.readUInt32BE(0), buf.length, 256);
    const brands = [buf.toString("ascii", 8, 12)];
    for (let off = 16; off + 4 <= boxSize; off += 4) brands.push(buf.toString("ascii", off, off + 4));
    if (brands.includes("avif") || brands.includes("avis")) return "avif";
  }
  return null;
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export interface InspectedImage {
  format: ImageFormat;
  mime: string;
  ext: string;
  /** EXIF 방향을 반영한 실제 표시 크기 */
  width: number;
  height: number;
  isAnimated: boolean;
  /** EXIF/XMP/IPTC 메타데이터(위치정보 등) 존재 또는 회전 필요 → 원본 정제 필요 */
  needsSanitize: boolean;
}

function uploadError(status: number, code: string, message: string) {
  return new AppError(status, code, message);
}

/** 헤더는 정상이지만 본문이 손상된 파일은 실제 디코딩 단계에서 실패하므로 422 로 변환합니다. */
async function decodeGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.warn("[images] decode failed:", (err as Error).message);
    throw uploadError(422, "CORRUPT_IMAGE", "손상되었거나 읽을 수 없는 이미지입니다.");
  }
}

export async function inspectImage(
  buf: Buffer,
  declared: { mimeType?: string | null; filename?: string | null } = {},
): Promise<InspectedImage> {
  if (buf.length === 0) throw uploadError(400, "FILE_EMPTY", "빈 파일입니다.");
  if (buf.length > UPLOAD_MAX_BYTES) {
    throw Errors.tooLarge(`파일 크기는 최대 ${env.UPLOAD_MAX_MB}MB 까지 업로드할 수 있습니다.`);
  }

  const format = sniffFormat(buf);
  if (!format) {
    throw Errors.unsupported(
      "UNSUPPORTED_TYPE",
      "지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF, AVIF 이미지만 업로드할 수 있습니다.",
    );
  }
  const info = FORMAT_INFO[format];

  // 선언된 Content-Type 이 이미지 MIME 이라면 실제 형식과 일치해야 합니다.
  const declaredMime = (declared.mimeType ?? "").toLowerCase().split(";")[0]!.trim();
  if (declaredMime && declaredMime !== "application/octet-stream") {
    const normalized = declaredMime === "image/jpg" || declaredMime === "image/pjpeg" ? "image/jpeg" : declaredMime;
    if (normalized !== info.mime) {
      throw uploadError(415, "TYPE_MISMATCH", "파일 내용과 형식(Content-Type)이 일치하지 않습니다.");
    }
  }
  const ext = declared.filename?.includes(".") ? declared.filename.split(".").pop()!.toLowerCase() : "";
  if (ext && !info.exts.includes(ext)) {
    throw uploadError(415, "TYPE_MISMATCH", `파일 확장자(.${ext})와 실제 이미지 형식(${format.toUpperCase()})이 일치하지 않습니다.`);
  }

  let meta: Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: env.UPLOAD_MAX_PIXELS, failOn: "error" }).metadata();
  } catch (err) {
    const msg = String((err as Error).message ?? "");
    if (/pixel limit/i.test(msg)) {
      throw uploadError(422, "DIMENSIONS_TOO_LARGE", "이미지 해상도가 너무 큽니다.");
    }
    throw uploadError(422, "CORRUPT_IMAGE", "손상되었거나 읽을 수 없는 이미지입니다.");
  }
  if (!meta.width || !meta.height) throw uploadError(422, "CORRUPT_IMAGE", "이미지 크기를 확인할 수 없습니다.");

  const pages = meta.pages ?? 1;
  const frameHeight = meta.pageHeight ?? (pages > 1 ? Math.round(meta.height / pages) : meta.height);
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? frameHeight : meta.width;
  const height = rotated ? meta.width : frameHeight;

  if (width < env.UPLOAD_MIN_DIMENSION || height < env.UPLOAD_MIN_DIMENSION) {
    throw uploadError(
      422,
      "DIMENSIONS_TOO_SMALL",
      `이미지가 너무 작습니다. 가로·세로 최소 ${env.UPLOAD_MIN_DIMENSION}px 이상이어야 합니다.`,
    );
  }
  if (width > env.UPLOAD_MAX_DIMENSION || height > env.UPLOAD_MAX_DIMENSION || width * height > env.UPLOAD_MAX_PIXELS) {
    throw uploadError(
      422,
      "DIMENSIONS_TOO_LARGE",
      `이미지 해상도가 너무 큽니다. 가로·세로 최대 ${env.UPLOAD_MAX_DIMENSION}px 까지 허용됩니다.`,
    );
  }

  return {
    format,
    mime: info.mime,
    ext: info.ext,
    width,
    height,
    isAnimated: pages > 1,
    needsSanitize: format !== "gif" && (Boolean(meta.exif || meta.xmp || meta.iptc) || (meta.orientation ?? 1) !== 1),
  };
}

/**
 * 64bit difference hash (dHash)
 * 9x8 그레이스케일로 축소 후 가로로 인접한 픽셀 밝기를 비교. 리사이즈/재압축에 강인합니다.
 * PostgreSQL bigint(부호 있음)에 저장하기 위해 signed 64bit 로 변환합니다.
 */
export async function computeDHash(buf: Buffer): Promise<bigint> {
  // 같은 픽셀이면 파일 형식(JPEG/PNG/WebP…)과 무관하게 같은 해시가 나오도록 합니다.
  //  - libvips 는 압축 원본에서 바로 축소할 때 JPEG/WebP 디코더 단계 축소(shrink-on-load)를 사용하므로
  //    먼저 원시 RGB 픽셀로 디코딩한 뒤 축소합니다. (1600만 화소 초과는 메모리 보호를 위해 4096px 로 선축소)
  //  - 그레이스케일은 디코더(JPEG Y 채널 직접 추출 등)에 맡기지 않고 직접 계산(BT.601)합니다.
  return decodeGuard(async () => {
    const opts = { limitInputPixels: env.UPLOAD_MAX_PIXELS, autoOrient: true, animated: false } as const;
    const meta = await sharp(buf, opts).metadata();
    let pipeline = sharp(buf, opts).flatten({ background: "#ffffff" }).toColourspace("srgb");
    if ((meta.width ?? 0) * (meta.height ?? 0) > 16_000_000) pipeline = pipeline.resize(4096, 4096, { fit: "inside" });
    const full = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const { data, info } = await sharp(full.data, {
      raw: { width: full.info.width, height: full.info.height, channels: full.info.channels },
    })
      .resize(9, 8, { fit: "fill", kernel: "cubic" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ch = info.channels;
    const luma = (x: number, y: number) => {
      const i = (y * 9 + x) * ch;
      return ch >= 3 ? 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]! : data[i]!;
    };
    let hash = BigInt(0);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        hash = (hash << BigInt(1)) | (luma(x, y) > luma(x + 1, y) ? BigInt(1) : BigInt(0));
      }
    }
    return BigInt.asIntN(64, hash);
  });
}

/** dHash 를 Multi-Index Hashing 용 16bit 청크 4개로 분할 (DB 생성 컬럼과 동일한 규칙) */
export function phashChunks(h: bigint): [number, number, number, number] {
  const u = BigInt.asUintN(64, h);
  const mask = BigInt(0xffff);
  return [
    Number((u >> BigInt(48)) & mask),
    Number((u >> BigInt(32)) & mask),
    Number((u >> BigInt(16)) & mask),
    Number(u & mask),
  ];
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = BigInt.asUintN(64, a ^ b);
  let count = 0;
  while (x > BigInt(0)) {
    count += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return count;
}

export interface RenderedVariant {
  data: Buffer;
  width: number;
  height: number;
  mime: string;
  ext: string;
}

export interface RenderedImage {
  original: RenderedVariant;
  medium: RenderedVariant;
  thumb: RenderedVariant;
  dominantColor: string;
}

function scaled(width: number, height: number, maxWidth: number) {
  const w = Math.min(width, maxWidth);
  return { width: w, height: Math.max(1, Math.round((height * w) / width)) };
}

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/**
 * 원본/중간/썸네일 변형 생성
 *  - original: 메타데이터(EXIF GPS 등) 또는 회전 정보가 있으면 방향 보정 + 메타데이터 제거 후 고화질 재인코딩,
 *              없으면 업로드된 바이트를 그대로 보존 (진짜 원본)
 *  - medium:   최대 폭 1200px WebP (애니메이션은 애니메이션 WebP)
 *  - thumb:    폭 474px 정지 WebP (피드용)
 */
export async function renderVariants(buf: Buffer, img: InspectedImage): Promise<RenderedImage> {
  return decodeGuard(() => renderVariantsUnsafe(buf, img));
}

async function renderVariantsUnsafe(buf: Buffer, img: InspectedImage): Promise<RenderedImage> {
  const base = { limitInputPixels: env.UPLOAD_MAX_PIXELS, autoOrient: true } as const;

  let original: RenderedVariant = { data: buf, width: img.width, height: img.height, mime: img.mime, ext: img.ext };
  if (img.needsSanitize) {
    const pipeline = sharp(buf, { ...base, animated: img.isAnimated });
    let out: Sharp;
    switch (img.format) {
      case "jpeg":
        out = pipeline.jpeg({ quality: 92, mozjpeg: true });
        break;
      case "png":
        out = pipeline.png({ compressionLevel: 8 });
        break;
      case "webp":
        out = pipeline.webp({ quality: 92 });
        break;
      case "avif":
        out = pipeline.avif({ quality: 70, effort: 4 });
        break;
      default:
        out = pipeline;
    }
    original = { ...original, data: await out.toBuffer() };
  }

  const mediumSize = scaled(img.width, img.height, MEDIUM_WIDTH);
  const mediumData = await sharp(buf, { ...base, animated: img.isAnimated })
    .resize({ width: mediumSize.width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const thumbSize = scaled(img.width, img.height, THUMB_WIDTH);
  const thumbData = await sharp(buf, { ...base, animated: false })
    .resize({ width: thumbSize.width, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();

  const stats = await sharp(thumbData).stats();
  const { r, g, b } = stats.dominant;

  return {
    original,
    medium: { data: mediumData, ...mediumSize, mime: "image/webp", ext: "webp" },
    thumb: { data: thumbData, ...thumbSize, mime: "image/webp", ext: "webp" },
    dominantColor: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
  };
}

/** 프로필 이미지: 정사각형 크롭 320px WebP */
export async function renderAvatar(buf: Buffer): Promise<Buffer> {
  return decodeGuard(() =>
    sharp(buf, { limitInputPixels: env.UPLOAD_MAX_PIXELS, autoOrient: true, animated: false })
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer(),
  );
}
