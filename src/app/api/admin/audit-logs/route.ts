import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listAuditLogs } from "@/server/services/admin";
import { adminListQuerySchema } from "@/server/validation";

/** 관리자 작업 감사 로그 */
export const GET = apiRoute(async (req) => {
  await requireAdmin();
  const { page, pageSize } = readQuery(req, adminListQuerySchema);
  return json(await listAuditLogs({ page, pageSize }));
});
