import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json } from "@/server/http";
import { getAdminStats } from "@/server/services/admin";

/** 관리자 대시보드 통계 */
export const GET = apiRoute(async () => {
  await requireAdmin();
  return json(await getAdminStats());
});
