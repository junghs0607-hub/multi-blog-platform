import { requireAdmin } from "@/server/auth/session";
import { apiRoute, json, parseId, readJson } from "@/server/http";
import { deleteUserAdmin, updateUserAdmin } from "@/server/services/admin";
import { adminUpdateUserSchema } from "@/server/validation";

/** 권한 변경 / 정지·해제 */
export const PATCH = apiRoute<{ id: string }>(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  await updateUserAdmin(admin, id, await readJson(req, adminUpdateUserSchema));
  return json({ ok: true });
});

/** 사용자 강제 삭제 (작성 콘텐츠 포함) */
export const DELETE = apiRoute<{ id: string }>(async (_req, ctx) => {
  const admin = await requireAdmin();
  await deleteUserAdmin(admin, parseId((await ctx.params).id));
  return json({ ok: true });
});
