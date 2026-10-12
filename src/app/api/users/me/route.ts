import { destroyCurrentSession, requireViewer } from "@/server/auth/session";
import { apiRoute, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { deleteAccount, getMyAccount, updateProfile } from "@/server/services/users";
import { deleteAccountSchema, updateProfileSchema } from "@/server/validation";

/** 내 계정 정보 */
export const GET = apiRoute(async () => {
  const viewer = await requireViewer();
  return json({ user: await getMyAccount(viewer) });
});

/** 프로필 수정 (이름, 아이디, 소개, 웹사이트) */
export const PATCH = apiRoute(async (req) => {
  const viewer = await requireViewer();
  limit("write", viewer.id);
  const input = await readJson(req, updateProfileSchema);
  return json({ user: await updateProfile(viewer, input) });
});

/** 회원 탈퇴 (비밀번호 확인) */
export const DELETE = apiRoute(async (req) => {
  const viewer = await requireViewer();
  const { password } = await readJson(req, deleteAccountSchema);
  await deleteAccount(viewer, password);
  await destroyCurrentSession();
  return json({ ok: true });
});
