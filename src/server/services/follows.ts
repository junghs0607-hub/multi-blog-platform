import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { isAdmin, type Viewer } from "@/server/auth/types";
import { Errors } from "@/server/http";
import type { FollowUserItem, Page } from "@/types";
import { decodeCursor, encodeCursor, iso, toUserSummary } from "./mappers";
import { notify, retractNotification } from "./notifications";

async function getActiveUser(username: string, viewer: Viewer | null) {
  const [u] = await db
    .select({ id: users.id, status: users.status, followerCount: users.followerCount })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  if (!u || (u.status !== "active" && !isAdmin(viewer))) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  return u;
}

export async function followUser(viewer: Viewer, username: string) {
  const target = await getActiveUser(username, viewer);
  if (target.id === viewer.id) throw Errors.badRequest("자기 자신은 팔로우할 수 없습니다.");
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(follows)
      .values({ followerId: viewer.id, followingId: target.id })
      .onConflictDoNothing()
      .returning({ id: follows.followingId });
    if (inserted.length) {
      await tx
        .update(users)
        .set({ followerCount: sql`${users.followerCount} + 1` })
        .where(eq(users.id, target.id));
      await tx
        .update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, viewer.id));
      await notify(tx, { recipientId: target.id, actorId: viewer.id, type: "follow" });
    }
    const [r] = await tx.select({ followerCount: users.followerCount }).from(users).where(eq(users.id, target.id));
    return { following: true, followerCount: r!.followerCount };
  });
}

export async function unfollowUser(viewer: Viewer, username: string) {
  const target = await getActiveUser(username, viewer);
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, target.id)))
      .returning({ id: follows.followingId });
    if (deleted.length) {
      await tx
        .update(users)
        .set({ followerCount: sql`greatest(${users.followerCount} - 1, 0)` })
        .where(eq(users.id, target.id));
      await tx
        .update(users)
        .set({ followingCount: sql`greatest(${users.followingCount} - 1, 0)` })
        .where(eq(users.id, viewer.id));
      await retractNotification(tx, { recipientId: target.id, actorId: viewer.id, type: "follow" });
    }
    const [r] = await tx.select({ followerCount: users.followerCount }).from(users).where(eq(users.id, target.id));
    return { following: false, followerCount: r!.followerCount };
  });
}

/** 팔로워 / 팔로잉 목록 (팔로우한 시각 역순 키셋 페이지네이션) */
export async function listFollows(
  kind: "followers" | "following",
  username: string,
  viewer: Viewer | null,
  cursorRaw: string | undefined,
  limit: number,
): Promise<Page<FollowUserItem>> {
  const target = await getActiveUser(username, viewer);
  const cursor = decodeCursor(cursorRaw);
  const viewerId = viewer?.id ?? 0;
  const otherCol = kind === "followers" ? follows.followerId : follows.followingId;
  const selfCol = kind === "followers" ? follows.followingId : follows.followerId;

  const conds: SQL[] = [eq(selfCol, target.id), eq(users.status, "active")];
  if (cursor?.t && cursor.id) {
    conds.push(sql`(${follows.createdAt}, ${otherCol}) < (${cursor.t}::timestamptz, ${cursor.id}::bigint)`);
  }
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarKey: users.avatarKey,
      bio: users.bio,
      followerCount: users.followerCount,
      followedAt: follows.createdAt,
      isFollowing: sql<boolean>`exists (select 1 from follows f2 where f2.follower_id = ${viewerId} and f2.following_id = ${users.id})`,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, otherCol))
    .where(and(...conds))
    .orderBy(desc(follows.createdAt), desc(otherCol))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((r) => ({
      ...toUserSummary(r),
      bio: r.bio,
      followerCount: r.followerCount,
      isFollowing: Boolean(r.isFollowing),
      isMe: r.id === viewer?.id,
    })),
    nextCursor: rows.length > limit && last ? encodeCursor({ t: iso(last.followedAt), id: last.id }) : null,
  };
}
