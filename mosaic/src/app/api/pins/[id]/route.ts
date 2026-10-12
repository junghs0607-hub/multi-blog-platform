import { getViewer, requireViewer } from "@/server/auth/session";
import { apiRoute, Errors, json, parseId, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { deletePin, getPinDetail, updatePin } from "@/server/services/pins";
import { updatePinSchema } from "@/server/validation";

/** 핀 상세 */
export const GET = apiRoute<{ id: string }>(async (_req, ctx) => {
  const id = parseId((await ctx.params).id);
  const pin = await getPinDetail(id, await getViewer());
  if (!pin) throw Errors.notFound("핀을 찾을 수 없습니다.");
  return json({ pin });
});

/** 핀 수정 (작성자) */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const id = parseId((await ctx.params).id);
  const input = await readJson(req, updatePinSchema);
  return json({ pin: await updatePin(id, viewer, input) });
});

/** 핀 삭제 (작성자 또는 관리자) */
export const DELETE = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  const id = parseId((await ctx.params).id);
  await deletePin(id, viewer);
  return json({ ok: true });
});
