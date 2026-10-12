import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { follows, sessions, users } from "@/db/schema";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import { isAdmin, type Viewer } from "@/server/auth/types";
import { env } from "@/server/env";
import { AppError, Errors, pgConstraint, pgErrorCode } from "@/server/http";
import { inspectImage, renderAvatar, sha256Hex } from "@/server/images/process";
import { getStorage, storageKey } from "@/server/storage";
import { patchValue } from "@/server/validation";
import type { FollowUserItem, SessionUser, UserProfile } from "@/types";
import { cleanupImageIfOrphan } from "./images";
import { iso, toSessionUser, toUserSummary } from "./mappers";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/* ────────────────────────── 가입 / 로그인 ────────────────────────── */

export async function registerUser(input: { email: string; username: string; displayName: string; password: string }) {
  const [taken] = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.username, input.username)))
    .limit(1);
  if (taken?.email === input.email) throw Errors.conflict("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
  if (taken?.username === input.username) throw Errors.conflict("USERNAME_TAKEN", "이미 사용 중인 아이디입니다.");

  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        role: env.ADMIN_EMAILS.includes(input.email) ? "admin" : "user",
        lastLoginAt: new Date(),
      })
      .returning();
    return user!;
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      const c = pgConstraint(err);
      if (c === "users_email_uq") throw Errors.conflict("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
      if (c === "users_username_uq") throw Errors.conflict("USERNAME_TAKEN", "이미 사용 중인 아이디입니다.");
    }
    throw err;
  }
}

export async function authenticate(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(id.includes("@") ? eq(users.email, id) : eq(users.username, id))
    .limit(1);
  if (!user) {
    await burnPasswordCheck(password);
    throw new AppError(401, "INVALID_CREDENTIALS", "이메일(아이디) 또는 비밀번호가 올바르지 않습니다.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "이메일(아이디) 또는 비밀번호가 올바르지 않습니다.");
  }
  if (user.status === "suspended") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "운영 정책 위반으로 이용이 정지된 계정입니다.");
  }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return user;
}

/* ────────────────────────── 프로필 ────────────────────────── */

export async function findUserByUsername(username: string) {
  const [u] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return u ?? null;
}

/** 공개 프로필 (정지된 계정은 관리자에게만 노출) */
export async function getProfile(username: string, viewer: Viewer | null): Promise<UserProfile | null> {
  const u = await findUserByUsername(username);
  if (!u) return null;
  if (u.status !== "active" && !isAdmin(viewer) && viewer?.id !== u.id) return null;
  let isFollowing = false;
  if (viewer && viewer.id !== u.id) {
    const [f] = await db
      .select({ one: sql<number>`1` })
      .from(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, u.id)))
      .limit(1);
    isFollowing = Boolean(f);
  }
  return {
    ...toUserSummary(u),
    bio: u.bio,
    websiteUrl: u.websiteUrl,
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    pinCount: u.pinCount,
    createdAt: iso(u.createdAt),
    isMe: viewer?.id === u.id,
    isFollowing,
  };
}

/** 설정 화면용 내 계정 정보 */
export async function getMyAccount(viewer: Viewer) {
  const [u] = await db.select().from(users).where(eq(users.id, viewer.id));
  if (!u) throw Errors.unauthorized();
  return {
    ...toSessionUser({ ...viewer, avatarKey: u.avatarKey, displayName: u.displayName, username: u.username }),
    bio: u.bio,
    websiteUrl: u.websiteUrl,
    createdAt: iso(u.createdAt),
  };
}

export async function updateProfile(
  viewer: Viewer,
  input: { displayName?: string; username?: string; bio?: string | null; websiteUrl?: string | null },
): Promise<SessionUser> {
  if (input.username && input.username !== viewer.username) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, input.username), ne(users.id, viewer.id)))
      .limit(1);
    if (taken) throw Errors.conflict("USERNAME_TAKEN", "이미 사용 중인 아이디입니다.");
  }
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.displayName !== undefined) set.displayName = input.displayName;
  if (input.username !== undefined) set.username = input.username;
  const bio = patchValue(input.bio);
  if (bio !== undefined) set.bio = bio;
  const websiteUrl = patchValue(input.websiteUrl);
  if (websiteUrl !== undefined) set.websiteUrl = websiteUrl;
  try {
    const [u] = await db.update(users).set(set).where(eq(users.id, viewer.id)).returning();
    return toSessionUser({ ...viewer, username: u!.username, displayName: u!.displayName, avatarKey: u!.avatarKey });
  } catch (err) {
    if (pgErrorCode(err) === "23505") throw Errors.conflict("USERNAME_TAKEN", "이미 사용 중인 아이디입니다.");
    throw err;
  }
}

/** 비밀번호 변경: 현재 세션을 제외한 모든 세션을 무효화합니다. */
export async function changePassword(viewer: Viewer, currentPassword: string, newPassword: string, keepSessionId: string | null) {
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, viewer.id));
  if (!u || !(await verifyPassword(currentPassword, u.hash))) {
    throw Errors.unprocessable("INVALID_PASSWORD", "현재 비밀번호가 올바르지 않습니다.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, viewer.id));
    await tx
      .delete(sessions)
      .where(keepSessionId ? and(eq(sessions.userId, viewer.id), ne(sessions.id, keepSessionId)) : eq(sessions.userId, viewer.id));
  });
}

/* ────────────────────────── 프로필 이미지 ────────────────────────── */

export async function setAvatar(viewer: Viewer, file: { buffer: Buffer; mimeType: string; filename: string }) {
  await inspectImage(file.buffer, { mimeType: file.mimeType, filename: file.filename });
  const data = await renderAvatar(file.buffer);
  const key = storageKey("avatars", sha256Hex(data), "webp");
  const storage = getStorage();
  await storage.put(key, data, "image/webp");
  const [prev] = await db.select({ key: users.avatarKey }).from(users).where(eq(users.id, viewer.id));
  await db.update(users).set({ avatarKey: key, updatedAt: new Date() }).where(eq(users.id, viewer.id));
  if (prev?.key && prev.key !== key) await deleteAvatarIfUnused(prev.key);
  return key;
}

export async function removeAvatar(viewer: Viewer) {
  const [prev] = await db.select({ key: users.avatarKey }).from(users).where(eq(users.id, viewer.id));
  await db.update(users).set({ avatarKey: null, updatedAt: new Date() }).where(eq(users.id, viewer.id));
  if (prev?.key) await deleteAvatarIfUnused(prev.key);
}

async function deleteAvatarIfUnused(key: string) {
  const [used] = await db.select({ id: users.id }).from(users).where(eq(users.avatarKey, key)).limit(1);
  if (!used) await getStorage().delete(key).catch(() => undefined);
}

/* ────────────────────────── 계정 삭제 ────────────────────────── */

/**
 * 사용자와 사용자가 만든 모든 데이터 삭제 (FK CASCADE) + 다른 엔티티의 비정규화 카운터 보정.
 * 반환값: 고아가 되었을 수 있는 이미지 ID 목록 (트랜잭션 이후 정리)
 */
export async function purgeUser(tx: DbOrTx, userId: number): Promise<number[]> {
  // 이 사용자가 누른 좋아요
  await tx.execute(sql`
    update pins set like_count = greatest(like_count - 1, 0)
    where id in (select pin_id from pin_likes where user_id = ${userId})`);
  // 이 사용자가 작성한 댓글
  await tx.execute(sql`
    update pins p set comment_count = greatest(p.comment_count - c.cnt, 0)
    from (select pin_id, count(*)::int as cnt from comments where author_id = ${userId} group by pin_id) c
    where p.id = c.pin_id`);
  // 팔로우 관계
  await tx.execute(sql`
    update users set follower_count = greatest(follower_count - 1, 0)
    where id in (select following_id from follows where follower_id = ${userId})`);
  await tx.execute(sql`
    update users set following_count = greatest(following_count - 1, 0)
    where id in (select follower_id from follows where following_id = ${userId})`);
  // 이 사용자의 보드에 저장되어 있던 (다른 사람의) 핀 저장 수
  await tx.execute(sql`
    update pins p set save_count = greatest(p.save_count - s.cnt, 0)
    from (select bp.pin_id, count(*)::int as cnt from board_pins bp join boards b on b.id = bp.board_id
          where b.owner_id = ${userId} group by bp.pin_id) s
    where p.id = s.pin_id`);
  // 이 사용자의 핀을 저장하고 있던 다른 사람 보드의 핀 수
  await tx.execute(sql`
    update boards b set pin_count = greatest(b.pin_count - s.cnt, 0)
    from (select bp.board_id, count(*)::int as cnt from board_pins bp join pins p on p.id = bp.pin_id
          where p.author_id = ${userId} group by bp.board_id) s
    where b.id = s.board_id`);
  // 태그 사용 횟수
  await tx.execute(sql`
    update tags t set usage_count = greatest(t.usage_count - s.cnt, 0)
    from (select pt.tag_id, count(*)::int as cnt from pin_tags pt join pins p on p.id = pt.pin_id
          where p.author_id = ${userId} group by pt.tag_id) s
    where t.id = s.tag_id`);
  const imageRows = await tx.execute<{ image_id: string | number }>(
    sql`select distinct image_id from pins where author_id = ${userId}`,
  );
  await tx.delete(users).where(eq(users.id, userId));
  return imageRows.rows.map((r) => Number(r.image_id));
}

export async function deleteAccount(viewer: Viewer, password: string) {
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, viewer.id));
  if (!u || !(await verifyPassword(password, u.hash))) {
    throw Errors.unprocessable("INVALID_PASSWORD", "비밀번호가 올바르지 않습니다.");
  }
  const imageIds = await db.transaction((tx) => purgeUser(tx, viewer.id));
  for (const id of imageIds) await cleanupImageIfOrphan(id).catch(() => undefined);
}

/* ────────────────────────── 검색 ────────────────────────── */

export async function searchUsers(q: string, viewer: Viewer | null, limit = 10): Promise<FollowUserItem[]> {
  const term = q.trim().replace(/^@/, "").toLowerCase().slice(0, 50);
  if (!term) return [];
  const viewerId = viewer?.id ?? 0;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarKey: users.avatarKey,
      bio: users.bio,
      followerCount: users.followerCount,
      isFollowing: sql<boolean>`exists (select 1 from follows f where f.follower_id = ${viewerId} and f.following_id = "users"."id")`,
    })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        or(ilike(users.username, `${escapeLike(term)}%`), ilike(users.displayName, `%${escapeLike(term)}%`)),
      ),
    )
    .orderBy(desc(users.followerCount), users.id)
    .limit(limit);
  return rows.map((r) => ({
    ...toUserSummary(r),
    bio: r.bio,
    followerCount: r.followerCount,
    isFollowing: Boolean(r.isFollowing),
    isMe: r.id === viewer?.id,
  }));
}
