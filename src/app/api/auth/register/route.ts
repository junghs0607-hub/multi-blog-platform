import { createSession, setSessionCookie } from "@/server/auth/session";
import { apiRoute, getClientIp, isHttpsRequest, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { toSessionUser } from "@/server/services/mappers";
import { registerUser } from "@/server/services/users";
import { registerSchema } from "@/server/validation";

/** 회원가입 → 자동 로그인 */
export const POST = apiRoute(async (req) => {
  const ip = getClientIp(req);
  limit("register", ip);
  const input = await readJson(req, registerSchema);
  const user = await registerUser(input);
  const { token, expiresAt } = await createSession(user.id, { userAgent: req.headers.get("user-agent"), ip });
  await setSessionCookie(token, expiresAt, isHttpsRequest(req));
  return json({ user: toSessionUser(user) }, 201);
});
