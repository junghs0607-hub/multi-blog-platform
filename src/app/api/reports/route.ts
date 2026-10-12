import { requireViewer } from "@/server/auth/session";
import { apiRoute, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { createReport } from "@/server/services/reports";
import { reportSchema } from "@/server/validation";

/** 신고 접수 (핀/댓글/사용자/보드) */
export const POST = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("report", viewer.id);
  const input = await readJson(req, reportSchema);
  return json(await createReport(viewer, input), 201);
});
