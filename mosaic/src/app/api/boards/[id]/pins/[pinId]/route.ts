import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { removePinFromBoard } from "@/server/services/boards";

/** 보드에서 핀 저장 취소 */
export const DELETE = apiRoute<{ id: string; pinId: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const { id, pinId } = await ctx.params;
  return json(await removePinFromBoard(parseId(id), parseId(pinId), viewer));
});
