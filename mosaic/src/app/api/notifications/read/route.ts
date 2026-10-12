import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readJson } from "@/server/http";
import { markRead } from "@/server/services/notifications";
import { markReadSchema } from "@/server/validation";

/** 알림 읽음 처리: { all: true } 또는 { ids: [1,2,3] } */
export const POST = apiRoute(async (req) => {
  const viewer = await requireViewer();
  const body = await readJson(req, markReadSchema);
  return json({ updated: await markRead(viewer, body) });
});
