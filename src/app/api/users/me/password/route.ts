import { getCurrentSessionId, requireViewer } from "@/server/auth/session";
import { apiRoute, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { changePassword } from "@/server/services/users";
import { changePasswordSchema } from "@/server/validation";

/** 비밀번호 변경 (현재 세션을 제외한 다른 기기의 세션은 모두 로그아웃) */
export const PATCH = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("login", `pw:${viewer.id}`);
  const { currentPassword, newPassword } = await readJson(req, changePasswordSchema);
  await changePassword(viewer, currentPassword, newPassword, await getCurrentSessionId());
  return json({ ok: true });
});
