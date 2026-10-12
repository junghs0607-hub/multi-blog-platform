import { z } from "zod";
import { getViewer } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listFollows } from "@/server/services/follows";
import { cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(30, 50) });

/** following 목록 */
export const GET = apiRoute<{ username: string }>(async (req, ctx) => {
  const { username } = await ctx.params;
  const { cursor, limit } = readQuery(req, querySchema);
  return json(await listFollows("following", decodeURIComponent(username), await getViewer(), cursor, limit));
});
