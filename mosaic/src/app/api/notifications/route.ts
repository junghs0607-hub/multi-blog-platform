import { z } from "zod";
import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listNotifications } from "@/server/services/notifications";
import { cursorSchema, limitSchema } from "@/server/validation";

const querySchema = z.object({ cursor: cursorSchema, limit: limitSchema(20, 50) });

/** 내 알림 목록 (최신순) */
export const GET = apiRoute(async (req) => {
  const viewer = await requireViewer();
  const { cursor, limit } = readQuery(req, querySchema);
  return json(await listNotifications(viewer, cursor, limit));
});
