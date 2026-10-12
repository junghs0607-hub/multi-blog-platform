import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { likePin, unlikePin } from "@/server/services/pins";

/** 좋아요 */
export const POST = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  return json(await likePin(parseId((await ctx.params).id), viewer));
});

/** 좋아요 취소 */
export const DELETE = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  return json(await unlikePin(parseId((await ctx.params).id), viewer));
});
