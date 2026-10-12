import { getViewer, requireViewer } from "@/server/auth/session";
import { apiRoute, Errors, json, parseId, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { deleteBoard, getBoard, updateBoard } from "@/server/services/boards";
import { updateBoardSchema } from "@/server/validation";

/** 보드 상세 (비공개 보드는 소유자/관리자만) */
export const GET = apiRoute<{ id: string }>(async (_req, ctx) => {
  const id = parseId((await ctx.params).id);
  const board = await getBoard(id, await getViewer());
  if (!board) throw Errors.notFound("보드를 찾을 수 없습니다.");
  return json({ board });
});

/** 보드 수정 (이름, 설명, 공개 범위, 커버) */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const id = parseId((await ctx.params).id);
  const input = await readJson(req, updateBoardSchema);
  return json({ board: await updateBoard(id, viewer, input) });
});

/** 보드 삭제 (보드 안의 핀 자체는 삭제되지 않음) */
export const DELETE = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  await deleteBoard(parseId((await ctx.params).id), viewer);
  return json({ ok: true });
});
