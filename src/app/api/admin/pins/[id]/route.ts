import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson } from "@/server/http";
import { deletePinAdmin, setPinStatusAdmin } from "@/server/services/admin";
import { adminUpdatePinSchema } from "@/server/validation";

/** 핀 숨김/복구 */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  const { status, reason } = await readJson(req, adminUpdatePinSchema);
  await setPinStatusAdmin(admin, id, status, reason ?? null);
  return json({ ok: true });
});

/** 핀 삭제 (?reason=) */
export const DELETE = apiRoute<{ id: string }>(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  await deletePinAdmin(admin, id, req.nextUrl.searchParams.get("reason")?.slice(0, 500) ?? null);
  return json({ ok: true });
});
