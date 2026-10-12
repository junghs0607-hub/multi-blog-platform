import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { deleteComment, updateComment } from "@/server/services/comments";
import { commentSchema } from "@/server/validation";

/** 댓글 수정 (작성자) */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const viewer = await requireViewer();
  limit("comment", viewer.id);
  const id = parseId((await ctx.params).id);
  const { body } = await readJson(req, commentSchema);
  return json({ comment: await updateComment(id, viewer, body) });
});

/** 댓글 삭제 (작성자 / 핀 작성자 / 관리자) */
export const DELETE = apiRoute<{ id: string }>(async (_req, ctx) => {
  const viewer = await requireViewer();
  const id = parseId((await ctx.params).id);
  return json(await deleteComment(id, viewer));
});
