import { createSession, setSessionCookie } from "@/server/auth/session";
import { apiRoute, getClientIp, isHttpsRequest, json, readJson } from "@/server/http";
import { limit } from "@/server/rate-limit";
import { toSessionUser } from "@/server/services/mappers";
import { authenticate } from "@/server/services/users";
import { loginSchema } from "@/server/validation";

/** 로그인 (이메일 또는 아이디) */
export const POST = apiRoute(async (req) => {
  const ip = getClientIp(req);
  limit("login", ip);
  const { identifier, password } = await readJson(req, loginSchema);
  const user = await authenticate(identifier, password);
  const { token, expiresAt } = await createSession(user.id, { userAgent: req.headers.get("user-agent"), ip });
  await setSessionCookie(token, expiresAt, isHttpsRequest(req));
  return json({ user: toSessionUser(user) });
});
