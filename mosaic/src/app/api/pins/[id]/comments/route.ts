import { z } from "zod";
import { getViewer, requireViewer } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson, readQuery } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { createComment, listComments } from "@/server/services/comments";
import { commentSchema, cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(20, 50) });

/** 댓글 목록 (작성순) */
export const GET = apiRoute<{ id: string }>(async (req, ctx) => {
  const id = parseId((await ctx.params).id);
  const { cursor, limit: size } = readQuery(req, querySchema);
  return json(await listComments(id, await getViewer(), cursor, size));
});

/** 댓글 작성 */
export const POST = apiRoute<{ id: string }>(async (req, ctx) => {
  const viewer = await requireViewer();
  limit("comment", viewer.id);
  const id = parseId((await ctx.params).id);
  const { body } = await readJson(req, commentSchema);
  return json({ comment: await createComment(id, viewer, body) }, 201);
});
