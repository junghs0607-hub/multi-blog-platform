import { destroyCurrentSession } from "@/server/auth/session";
import { apiRoute, json } from "@/server/http";

/** 로그아웃: 서버 세션 삭제 + 쿠키 제거 */
export const POST = apiRoute(async () => {
  await destroyCurrentSession();
  return json({ ok: true });
});
