import { env } from "@/server/env";
import { apiRoute, Errors } from "@/server/http";
import { CONTENT_TYPES, getDriver, getStorage, STORAGE_KEY_RE } from "@/server/storage";

/**
 * 저장소 파일 서빙 (local 드라이버 / 비공개 S3 버킷 프록시)
 * 키는 콘텐츠 주소(SHA-256) 기반이므로 내용이 바뀌지 않아 1년 immutable 캐시를 적용합니다.
 */
export const GET = apiRoute<{ key: string[] }>(async (req, ctx) => {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!STORAGE_KEY_RE.test(key)) throw Errors.notFound();

  const [prefix, , , file] = key.split("/");
  const etag = `"${prefix}-${file!.slice(0, 40)}"`;
  const cacheHeaders = {
    ETag: etag,
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: cacheHeaders });

  let obj = await getStorage().get(key);
  if (!obj && env.STORAGE_DRIVER !== "local") obj = await getDriver("local").get(key);
  if (!obj) throw Errors.notFound("파일을 찾을 수 없습니다.");

  const ext = key.split(".").pop()!;
  const headers = new Headers({
    ...cacheHeaders,
    "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (obj.size) headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { headers });
});
