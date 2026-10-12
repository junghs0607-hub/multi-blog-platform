import { and, desc, eq, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbOrTx } from "@/db";
import { boards, comments, images, notifications, pins, users } from "@/db/schema";
import type { Viewer } from "@/server/auth/types";
import { fileUrl } from "@/server/storage";
import type { NotificationItem, NotificationType, Page } from "@/types";
import { decodeCursor, encodeCursor, iso, toUserSummary } from "./mappers";

export interface NotifyInput {
  recipientId: number;
  actorId?: number | null;
  type: NotificationType;
  pinId?: number | null;
  boardId?: number | null;
  commentId?: number | null;
  message?: string | null;
}

/** 알림 생성 (자기 자신에 대한 행동은 알리지 않음) */
export async function notify(tx: DbOrTx, n: NotifyInput) {
  if (n.actorId && n.actorId === n.recipientId) return;
  await tx.insert(notifications).values({
    recipientId: n.recipientId,
    actorId: n.actorId ?? null,
    type: n.type,
    pinId: n.pinId ?? null,
    boardId: n.boardId ?? null,
    commentId: n.commentId ?? null,
    message: n.message ?? null,
  });
}

/** 좋아요 취소/언팔로우/저장 취소 시 해당 알림 회수 (알림 스팸 방지) */
export async function retractNotification(
  tx: DbOrTx,
  m: { recipientId: number; actorId: number; type: NotificationType; pinId?: number; boardId?: number },
) {
  const conds: SQL[] = [
    eq(notifications.recipientId, m.recipientId),
    eq(notifications.actorId, m.actorId),
    eq(notifications.type, m.type),
  ];
  if (m.pinId) conds.push(eq(notifications.pinId, m.pinId));
  if (m.boardId) conds.push(eq(notifications.boardId, m.boardId));
  await tx.delete(notifications).where(and(...conds));
}

const actor = alias(users, "actor");

export async function listNotifications(viewer: Viewer, cursorRaw: string | undefined, limit: number): Promise<Page<NotificationItem>> {
  const cursor = decodeCursor(cursorRaw);
  const conds: SQL[] = [eq(notifications.recipientId, viewer.id)];
  if (cursor?.id) conds.push(lt(notifications.id, cursor.id));

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actorId: actor.id,
      actorUsername: actor.username,
      actorDisplayName: actor.displayName,
      actorAvatarKey: actor.avatarKey,
      pinId: pins.id,
      pinTitle: pins.title,
      thumbKey: images.thumbKey,
      imgDriver: images.storageDriver,
      boardId: boards.id,
      boardName: boards.name,
      boardVisible: sql<boolean>`(${boards.visibility} = 'public' or ${boards.ownerId} = ${viewer.id})`,
      commentId: comments.id,
      commentBody: comments.body,
    })
    .from(notifications)
    .leftJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(pins, eq(pins.id, notifications.pinId))
    .leftJoin(images, eq(images.id, pins.imageId))
    .leftJoin(boards, eq(boards.id, notifications.boardId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .where(and(...conds))
    .orderBy(desc(notifications.id))
    .limit(limit + 1);

  const items: NotificationItem[] = rows.slice(0, limit).map((r) => ({
    id: r.id,
    type: r.type,
    message: r.message,
    readAt: r.readAt ? iso(r.readAt) : null,
    createdAt: iso(r.createdAt),
    actor:
      r.actorId && r.actorUsername && r.actorDisplayName
        ? toUserSummary({
            id: r.actorId,
            username: r.actorUsername,
            displayName: r.actorDisplayName,
            avatarKey: r.actorAvatarKey,
          })
        : null,
    pin:
      r.pinId && r.pinTitle && r.thumbKey && r.imgDriver
        ? { id: r.pinId, title: r.pinTitle, thumbUrl: fileUrl(r.imgDriver, r.thumbKey) }
        : null,
    board: r.boardId && r.boardName && r.boardVisible ? { id: r.boardId, name: r.boardName } : null,
    comment: r.commentId && r.commentBody ? { id: r.commentId, body: r.commentBody } : null,
  }));
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ id: last.id }) : null };
}

export async function unreadCount(viewer: Viewer): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, viewer.id), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

export async function markRead(viewer: Viewer, target: { all: true } | { ids: number[] }): Promise<number> {
  const conds: SQL[] = [eq(notifications.recipientId, viewer.id), isNull(notifications.readAt)];
  if ("ids" in target) conds.push(inArray(notifications.id, target.ids));
  const res = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...conds))
    .returning({ id: notifications.id });
  return res.length;
}
