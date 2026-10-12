import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/server/env";
import { Errors } from "@/server/http";
import { toSessionUser } from "@/server/services/mappers";
import type { SessionUser } from "@/types";
import type { Viewer } from "./types";

/**
 * DB 기반 세션
 *  - 쿠키에는 32바이트 난수 토큰만 저장, DB 에는 SHA-256 해시만 저장 (DB 유출 시에도 세션 탈취 불가)
 *  - 로그아웃/정지/비밀번호 변경 시 서버에서 즉시 무효화 가능
 */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number, meta: { userAgent?: string | null; ip?: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
    ip: meta.ip?.slice(0, 64) ?? null,
  });
  return { token, expiresAt };
}

export async function getViewerByToken(token: string): Promise<Viewer | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      avatarKey: users.avatarKey,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

/** 현재 요청의 로그인 사용자 (요청 단위로 캐시) */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token || token.length > 128) return null;
  return getViewerByToken(token);
});

export async function getSessionUser(): Promise<SessionUser | null> {
  const viewer = await getViewer();
  return viewer ? toSessionUser(viewer) : null;
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw Errors.unauthorized();
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") throw Errors.forbidden("관리자만 접근할 수 있습니다.");
  return viewer;
}

function cookieSecure(isHttps: boolean): boolean {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return isHttps;
}

export async function setSessionCookie(token: string, expiresAt: Date, isHttps: boolean) {
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(isHttps),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(env.SESSION_COOKIE_NAME);
}

export async function getCurrentSessionId(): Promise<string | null> {
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  return token ? hashToken(token) : null;
}
