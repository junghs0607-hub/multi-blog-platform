import { z } from "zod";
import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listLikedPins } from "@/server/services/pins";
import { cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(25, 50) });

/** 내가 좋아요한 핀 */
export const GET = apiRoute(async (req) => {
  const viewer = await requireViewer();
  const { cursor, limit } = readQuery(req, querySchema);
  return json(await listLikedPins(viewer, cursor, limit));
});
