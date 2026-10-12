import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, readQuery } from "@/server/http";
import { listPinsAdmin } from "@/server/services/admin";
import { adminListQuerySchema } from "@/server/validation";

/** 이미지(핀) 목록 (?q=&status=active|hidden|private|reported&page=) */
export const GET = apiRoute(async (req) => {
  await requireAdmin();
  return json(await listPinsAdmin(readQuery(req, adminListQuerySchema)));
});
