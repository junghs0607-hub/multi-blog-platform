import { getViewer } from "@/server/auth/session";
import { apiRoute, Errors, parseId } from "@/server/http";
import { getPinOriginal } from "@/server/services/pins";
import { getDriver, type StorageDriverName } from "@/server/storage";

/** 원본 이미지 다운로드 (열람 권한 확인). ?inline=1 이면 브라우저에서 바로 표시 */
export const GET = apiRoute<{ id: string }>(async (req, ctx) => {
  const id = parseId((await ctx.params).id);
  const original = await getPinOriginal(id, await getViewer());
  const obj = await getDriver(original.driver as StorageDriverName).get(original.key);
  if (!obj) throw Errors.notFound("원본 파일을 찾을 수 없습니다.");
  const ext = original.key.split(".").pop();
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const headers = new Headers({
    "Content-Type": original.mime,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="mosaic-${id}.${ext}"`,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (obj.size) headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { headers });
});
