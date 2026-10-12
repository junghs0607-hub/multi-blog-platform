import { getViewer } from "@/server/auth/session";
import { apiRoute, json, parseId } from "@/server/http";
import { getRelatedPins } from "@/server/services/pins";

/** 관련 핀 (태그·보드 공동 저장·카테고리 기반 추천) */
export const GET = apiRoute<{ id: string }>(async (_req, ctx) => {
  const id = parseId((await ctx.params).id);
  const items = await getRelatedPins(id, await getViewer(), 40);
  return json({ items, nextCursor: null });
});
