import { getSessionUser } from "@/server/auth/session";
import { apiRoute, json } from "@/server/http";

/** 현재 로그인 사용자 (비로그인 시 user: null) */
export const GET = apiRoute(async () => {
  return json({ user: await getSessionUser() });
});
