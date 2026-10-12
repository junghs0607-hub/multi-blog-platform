import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, comments, reports, users } from "@/db/schema";
import type { Viewer } from "@/server/auth/types";
import { Errors, pgConstraint, pgErrorCode } from "@/server/http";
import type { ReportReason, ReportTarget } from "@/types";
import { canViewBoard } from "./boards";
import { getViewablePin } from "./pins";

/** 신고 대상의 존재 여부와 소유자 확인 (열람할 수 없는 대상은 신고 불가) */
async function resolveTargetOwner(type: ReportTarget, id: number, viewer: Viewer): Promise<number> {
  switch (type) {
    case "pin": {
      const p = await getViewablePin(id, viewer);
      return p.authorId;
    }
    case "comment": {
      const [c] = await db.select({ authorId: comments.authorId, pinId: comments.pinId }).from(comments).where(eq(comments.id, id));
      if (!c) throw Errors.notFound("댓글을 찾을 수 없습니다.");
      await getViewablePin(c.pinId, viewer);
      return c.authorId;
    }
    case "user": {
      const [u] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, id));
      if (!u) throw Errors.notFound("사용자를 찾을 수 없습니다.");
      return u.id;
    }
    case "board": {
      const [b] = await db
        .select({ ownerId: boards.ownerId, visibility: boards.visibility, ownerStatus: users.status })
        .from(boards)
        .innerJoin(users, eq(users.id, boards.ownerId))
        .where(eq(boards.id, id));
      if (!b || !canViewBoard(b, viewer)) throw Errors.notFound("보드를 찾을 수 없습니다.");
      return b.ownerId;
    }
  }
}

export async function createReport(
  viewer: Viewer,
  input: { targetType: ReportTarget; targetId: number; reason: ReportReason; details: string | null },
) {
  const ownerId = await resolveTargetOwner(input.targetType, input.targetId, viewer);
  if (ownerId === viewer.id) throw Errors.badRequest("본인의 콘텐츠는 신고할 수 없습니다.");
  try {
    const [r] = await db
      .insert(reports)
      .values({
        reporterId: viewer.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
      })
      .returning({ id: reports.id });
    return { id: r!.id };
  } catch (err) {
    if (pgErrorCode(err) === "23505" && pgConstraint(err) === "reports_pending_uq") {
      throw Errors.conflict("ALREADY_REPORTED", "이미 신고한 대상입니다. 검토 후 조치하겠습니다.");
    }
    throw err;
  }
}
