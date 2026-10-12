import { z } from "zod";
import { getViewer } from "@/server/auth/session";
import { apiRoute, Errors, json, readQuery } from "@/server/http";
import { listPins } from "@/server/services/pins";
import { getProfile } from "@/server/services/users";
import { cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(25, 50) });

/** 사용자가 만든 핀 (본인이면 비공개 핀 포함) */
export const GET = apiRoute<{ username: string }>(async (req, ctx) => {
  const { username } = await ctx.params;
  const viewer = await getViewer();
  const profile = await getProfile(decodeURIComponent(username), viewer);
  if (!profile) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  const { cursor, limit } = readQuery(req, querySchema);
  return json(await listPins({ viewer, authorId: profile.id, cursor, limit, sort: "latest" }));
});
