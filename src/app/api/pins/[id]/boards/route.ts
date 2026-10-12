import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId } from "@/server/http";
import { listMyBoardOptions } from "@/server/services/boards";
import { getViewablePin } from "@/server/services/pins";

/** 저장 다이얼로그: 내 보드 목록 + 이 핀의 저장 여부 */
export const GET = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  const id = parseId((await ctx.params).id);
  await getViewablePin(id, viewer);
  return json({ items: await listMyBoardOptions(viewer, id) });
});
