import { and, asc, eq, gt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { comments, pins, users } from "@/db/schema";
import { isAdmin, type Viewer } from "@/server/auth/types";
import { Errors } from "@/server/http";
import type { CommentItem, Page } from "@/types";
import { decodeCursor, encodeCursor, iso, toUserSummary } from "./mappers";
import { notify } from "./notifications";
import { canViewPin, getViewablePin, loadPinAccess } from "./pins";

function toItem(
  r: {
    id: number;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: number;
    authorUsername: string;
    authorDisplayName: string;
    authorAvatarKey: string | null;
  },
  pinAuthorId: number,
  viewer: Viewer | null,
): CommentItem {
  const isAuthor = viewer?.id === r.authorId;
  return {
    id: r.id,
    body: r.body,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    author: toUserSummary({
      id: r.authorId,
      username: r.authorUsername,
      displayName: r.authorDisplayName,
      avatarKey: r.authorAvatarKey,
    }),
    canEdit: isAuthor,
    // 댓글 작성자, 핀 작성자, 관리자는 삭제 가능
    canDelete: isAuthor || viewer?.id === pinAuthorId || isAdmin(viewer),
  };
}

const commentSelection = {
  id: comments.id,
  body: comments.body,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
  authorId: users.id,
  authorUsername: users.username,
  authorDisplayName: users.displayName,
  authorAvatarKey: users.avatarKey,
};

/** 댓글 목록 (작성순, id 키셋 페이지네이션) */
export async function listComments(
  pinId: number,
  viewer: Viewer | null,
  cursorRaw: string | undefined,
  limit: number,
): Promise<Page<CommentItem>> {
  const pin = await getViewablePin(pinId, viewer);
  const cursor = decodeCursor(cursorRaw);
  const conds: SQL[] = [eq(comments.pinId, pinId), eq(users.status, "active")];
  if (cursor?.id) conds.push(gt(comments.id, cursor.id));
  const rows = await db
    .select(commentSelection)
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(...conds))
    .orderBy(asc(comments.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit).map((r) => toItem(r, pin.authorId, viewer));
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ id: last.id }) : null };
}

export async function createComment(pinId: number, viewer: Viewer, body: string): Promise<CommentItem> {
  const pin = await getViewablePin(pinId, viewer);
  const id = await db.transaction(async (tx) => {
    const [c] = await tx.insert(comments).values({ pinId, authorId: viewer.id, body }).returning({ id: comments.id });
    await tx
      .update(pins)
      .set({ commentCount: sql`${pins.commentCount} + 1` })
      .where(eq(pins.id, pinId));
    await notify(tx, { recipientId: pin.authorId, actorId: viewer.id, type: "comment", pinId, commentId: c!.id });
    return c!.id;
  });
  const [row] = await db
    .select(commentSelection)
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.id, id));
  return toItem(row!, pin.authorId, viewer);
}

async function loadComment(commentId: number, viewer: Viewer) {
  const [c] = await db
    .select({ id: comments.id, pinId: comments.pinId, authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!c) throw Errors.notFound("댓글을 찾을 수 없습니다.");
  const pin = await loadPinAccess(c.pinId);
  if (!pin || !canViewPin(pin, viewer)) throw Errors.notFound("댓글을 찾을 수 없습니다.");
  return { comment: c, pin };
}

export async function updateComment(commentId: number, viewer: Viewer, body: string): Promise<CommentItem> {
  const { comment, pin } = await loadComment(commentId, viewer);
  if (comment.authorId !== viewer.id) throw Errors.forbidden("본인이 작성한 댓글만 수정할 수 있습니다.");
  await db.update(comments).set({ body, updatedAt: new Date() }).where(eq(comments.id, commentId));
  const [row] = await db
    .select(commentSelection)
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.id, commentId));
  return toItem(row!, pin.authorId, viewer);
}

export async function deleteComment(commentId: number, viewer: Viewer): Promise<{ commentCount: number }> {
  const { comment, pin } = await loadComment(commentId, viewer);
  if (comment.authorId !== viewer.id && pin.authorId !== viewer.id && !isAdmin(viewer)) {
    throw Errors.forbidden("댓글을 삭제할 권한이 없습니다.");
  }
  return db.transaction(async (tx) => {
    // 답글(parent_id)이 있다면 CASCADE 로 함께 삭제되므로 실제 삭제된 개수만큼 차감
    const res = await tx.execute<{ cnt: number }>(sql`
      with recursive tree as (
        select id from comments where id = ${commentId}
        union all
        select c.id from comments c join tree t on c.parent_id = t.id
      )
      select count(*)::int as cnt from tree`);
    const removed = res.rows[0]?.cnt ?? 1;
    await tx.delete(comments).where(eq(comments.id, commentId));
    const [p] = await tx
      .update(pins)
      .set({ commentCount: sql`greatest(${pins.commentCount} - ${removed}, 0)` })
      .where(eq(pins.id, comment.pinId))
      .returning({ commentCount: pins.commentCount });
    return { commentCount: p?.commentCount ?? 0 };
  });
}
