import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listUsersAdmin } from "@/server/services/admin";
import { adminListQuerySchema } from "@/server/validation";

/** 사용자 목록 (?q=&status=active|suspended&role=user|admin&page=&pageSize=) */
export const GET = apiRoute(async (req) => {
  await requireAdmin();
  return json(await listUsersAdmin(readQuery(req, adminListQuerySchema)));
});
