import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listReportsAdmin } from "@/server/services/admin";
import { adminListQuerySchema } from "@/server/validation";

/** 신고 목록 (?status=pending|resolved|dismissed&page=) */
export const GET = apiRoute(async (req) => {
  await requireAdmin();
  return json(await listReportsAdmin(readQuery(req, adminListQuerySchema)));
});
