import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson } from "@/server/http";
import { resolveReportAdmin } from "@/server/services/admin";
import { adminResolveReportSchema } from "@/server/validation";

/** 신고 처리: { status: resolved|dismissed, action: none|hide_pin|delete_comment|suspend_user|make_board_private, note } */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  await resolveReportAdmin(admin, id, await readJson(req, adminResolveReportSchema));
  return json({ ok: true });
});
