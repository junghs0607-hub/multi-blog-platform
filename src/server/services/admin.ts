import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbOrTx } from "@/db";
import { adminAuditLogs, boards, comments, images, pins, reports, sessions, users } from "@/db/schema";
import type { Viewer } from "@/server/auth/types";
import { Errors } from "@/server/http";
import { buildTsQuery } from "@/server/search";
import { fileUrl } from "@/server/storage";
import type {
  AdminAuditLogItem,
  AdminPinItem,
  AdminReportItem,
  AdminReportTarget,
  AdminStats,
  AdminUserItem,
  Paginated,
} from "@/types/admin";
import type { ReportStatus } from "@/types";
import { deleteComment } from "./comments";
import { cleanupImageIfOrphan } from "./images";
import { iso, toUserSummary } from "./mappers";
import { notify } from "./notifications";
import { deletePin } from "./pins";
import { popularTags } from "./tags";
import { purgeUser } from "./users";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

async function audit(
  tx: DbOrTx,
  admin: Viewer,
  action: string,
  targetType: string,
  targetId: number | null,
  details?: Record<string, unknown>,
) {
  await tx.insert(adminAuditLogs).values({ adminId: admin.id, action, targetType, targetId, details: details ?? null });
}

/* ────────────────────────── 대시보드 ────────────────────────── */

export async function getAdminStats(): Promise<AdminStats> {
  const totalsRes = await db.execute<Record<string, number | string>>(sql`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where status = 'suspended') as suspended_users,
      (select count(*)::int from users where role = 'admin') as admins,
      (select count(*)::int from pins) as pins,
      (select count(*)::int from pins where status = 'hidden') as hidden_pins,
      (select count(*)::int from pins where visibility = 'private') as private_pins,
      (select count(*)::int from boards) as boards,
      (select count(*)::int from comments) as comments,
      (select count(*)::int from pin_likes) as likes,
      (select count(*)::int from reports where status = 'pending') as pending_reports,
      (select count(*)::int from images) as images,
      (select coalesce(sum(size_bytes), 0)::bigint from images) as storage_bytes,
      (select count(*)::int from jobs where status in ('pending', 'running')) as pending_jobs,
      (select count(*)::int from jobs where status = 'failed') as failed_jobs,
      (select count(*)::int from users where created_at >= now() - interval '7 days') as users_7d,
      (select count(*)::int from pins where created_at >= now() - interval '7 days') as pins_7d
  `);
  const t = totalsRes.rows[0]!;
  const n = (k: string) => Number(t[k] ?? 0);

  const dailyRes = await db.execute<{ day: string; users: number; pins: number }>(sql`
    with days as (
      select generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as d
    )
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*)::int from users u where u.created_at >= d and u.created_at < d + interval '1 day') as users,
      (select count(*)::int from pins p where p.created_at >= d and p.created_at < d + interval '1 day') as pins
    from days order by d
  `);

  return {
    totals: {
      users: n("users"),
      suspendedUsers: n("suspended_users"),
      admins: n("admins"),
      pins: n("pins"),
      hiddenPins: n("hidden_pins"),
      privatePins: n("private_pins"),
      boards: n("boards"),
      comments: n("comments"),
      likes: n("likes"),
      pendingReports: n("pending_reports"),
      images: n("images"),
      storageBytes: n("storage_bytes"),
      pendingJobs: n("pending_jobs"),
      failedJobs: n("failed_jobs"),
    },
    last7d: { users: n("users_7d"), pins: n("pins_7d") },
    daily: dailyRes.rows,
    topTags: await popularTags(10),
  };
}

/* ────────────────────────── 사용자 관리 ────────────────────────── */

export async function listUsersAdmin(q: {
  q?: string;
  status?: string;
  role?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<AdminUserItem>> {
  const conds: SQL[] = [];
  if (q.q) {
    const term = `%${escapeLike(q.q.toLowerCase())}%`;
    conds.push(or(ilike(users.email, term), ilike(users.username, term), ilike(users.displayName, term))!);
  }
  if (q.status === "active" || q.status === "suspended") conds.push(eq(users.status, q.status));
  if (q.role === "user" || q.role === "admin") conds.push(eq(users.role, q.role));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
  ]);
  return {
    items: rows.map((u) => ({
      ...toUserSummary(u),
      email: u.email,
      role: u.role,
      status: u.status,
      pinCount: u.pinCount,
      followerCount: u.followerCount,
      createdAt: iso(u.createdAt),
      lastLoginAt: u.lastLoginAt ? iso(u.lastLoginAt) : null,
    })),
    total: countRows[0]?.count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function updateUserAdmin(
  admin: Viewer,
  userId: number,
  patch: { role?: "user" | "admin"; status?: "active" | "suspended" },
  tx: DbOrTx = db,
) {
  if (userId === admin.id) throw Errors.forbidden("자신의 권한이나 상태는 변경할 수 없습니다.");
  const [u] = await tx.select({ id: users.id, role: users.role, status: users.status }).from(users).where(eq(users.id, userId));
  if (!u) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (patch.role) set.role = patch.role;
  if (patch.status) set.status = patch.status;
  await tx.update(users).set(set).where(eq(users.id, userId));
  // 정지 시 모든 세션 즉시 무효화
  if (patch.status === "suspended") await tx.delete(sessions).where(eq(sessions.userId, userId));
  await audit(tx, admin, "user.update", "user", userId, { before: { role: u.role, status: u.status }, after: patch });
}

export async function deleteUserAdmin(admin: Viewer, userId: number) {
  if (userId === admin.id) throw Errors.forbidden("자신의 계정은 관리자 화면에서 삭제할 수 없습니다.");
  const [u] = await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, userId));
  if (!u) throw Errors.notFound("사용자를 찾을 수 없습니다.");
  const imageIds = await db.transaction(async (tx) => {
    const ids = await purgeUser(tx, userId);
    await audit(tx, admin, "user.delete", "user", userId, { username: u.username, email: u.email });
    return ids;
  });
  for (const id of imageIds) await cleanupImageIfOrphan(id).catch(() => undefined);
}

/* ────────────────────────── 핀 관리 ────────────────────────── */

export async function listPinsAdmin(q: {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<AdminPinItem>> {
  const conds: SQL[] = [];
  if (q.q) {
    if (/^\d+$/.test(q.q)) conds.push(eq(pins.id, Number(q.q)));
    else {
      const tsq = buildTsQuery(q.q);
      const like = ilike(pins.title, `%${escapeLike(q.q)}%`);
      conds.push(tsq ? or(like, sql`${pins.searchVector} @@ to_tsquery('simple', ${tsq})`)! : like);
    }
  }
  if (q.status === "active" || q.status === "hidden") conds.push(eq(pins.status, q.status));
  if (q.status === "private") conds.push(eq(pins.visibility, "private"));
  if (q.status === "reported") {
    // count 쿼리(단일 테이블)에서도 올바르게 바인딩되도록 테이블명을 명시합니다.
    conds.push(sql`exists (select 1 from reports r where r.target_type = 'pin' and r.target_id = "pins"."id" and r.status = 'pending')`);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: pins.id,
        title: pins.title,
        status: pins.status,
        visibility: pins.visibility,
        likeCount: pins.likeCount,
        saveCount: pins.saveCount,
        commentCount: pins.commentCount,
        createdAt: pins.createdAt,
        thumbKey: images.thumbKey,
        imgDriver: images.storageDriver,
        authorId: users.id,
        authorUsername: users.username,
        authorDisplayName: users.displayName,
        authorAvatarKey: users.avatarKey,
        pendingReports: sql<number>`(select count(*)::int from reports r where r.target_type = 'pin' and r.target_id = "pins"."id" and r.status = 'pending')`,
      })
      .from(pins)
      .innerJoin(images, eq(images.id, pins.imageId))
      .innerJoin(users, eq(users.id, pins.authorId))
      .where(where)
      .orderBy(desc(pins.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pins)
      .where(where),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      visibility: r.visibility,
      thumbUrl: fileUrl(r.imgDriver, r.thumbKey),
      author: toUserSummary({
        id: r.authorId,
        username: r.authorUsername,
        displayName: r.authorDisplayName,
        avatarKey: r.authorAvatarKey,
      }),
      likeCount: r.likeCount,
      saveCount: r.saveCount,
      commentCount: r.commentCount,
      pendingReports: r.pendingReports,
      createdAt: iso(r.createdAt),
    })),
    total: countRows[0]?.count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function setPinStatusAdmin(
  admin: Viewer,
  pinId: number,
  status: "active" | "hidden",
  reason?: string | null,
  tx: DbOrTx = db,
) {
  const [p] = await tx.select({ id: pins.id, authorId: pins.authorId, title: pins.title, status: pins.status }).from(pins).where(eq(pins.id, pinId));
  if (!p) throw Errors.notFound("핀을 찾을 수 없습니다.");
  await tx.update(pins).set({ status }).where(eq(pins.id, pinId));
  await audit(tx, admin, status === "hidden" ? "pin.hide" : "pin.restore", "pin", pinId, { title: p.title, reason });
  if (p.status !== status) {
    await notify(tx, {
      recipientId: p.authorId,
      type: "system",
      pinId,
      message:
        status === "hidden"
          ? `회원님의 핀 "${p.title}"이(가) 운영 정책에 따라 숨김 처리되었습니다.${reason ? ` (사유: ${reason})` : ""}`
          : `회원님의 핀 "${p.title}"이(가) 다시 공개되었습니다.`,
    });
  }
}

export async function deletePinAdmin(admin: Viewer, pinId: number, reason?: string | null) {
  const [p] = await db.select({ authorId: pins.authorId, title: pins.title }).from(pins).where(eq(pins.id, pinId));
  if (!p) throw Errors.notFound("핀을 찾을 수 없습니다.");
  await deletePin(pinId, admin);
  await db.transaction(async (tx) => {
    await audit(tx, admin, "pin.delete", "pin", pinId, { title: p.title, reason });
    await notify(tx, {
      recipientId: p.authorId,
      type: "system",
      message: `회원님의 핀 "${p.title}"이(가) 운영 정책에 따라 삭제되었습니다.${reason ? ` (사유: ${reason})` : ""}`,
    });
  });
}

/* ────────────────────────── 신고 관리 ────────────────────────── */

const reporter = alias(users, "reporter");
const resolver = alias(users, "resolver");

export async function listReportsAdmin(q: { status?: string; page: number; pageSize: number }): Promise<Paginated<AdminReportItem>> {
  const status = (["pending", "resolved", "dismissed"] as const).find((s) => s === q.status);
  const where = status ? eq(reports.status, status) : undefined;
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        details: reports.details,
        status: reports.status,
        resolutionNote: reports.resolutionNote,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
        reporterId: reporter.id,
        reporterUsername: reporter.username,
        reporterDisplayName: reporter.displayName,
        reporterAvatarKey: reporter.avatarKey,
        resolverId: resolver.id,
        resolverUsername: resolver.username,
        resolverDisplayName: resolver.displayName,
        resolverAvatarKey: resolver.avatarKey,
        pendingForTarget: sql<number>`(select count(*)::int from reports r2 where r2.target_type = ${reports.targetType} and r2.target_id = ${reports.targetId} and r2.status = 'pending')`,
      })
      .from(reports)
      .leftJoin(reporter, eq(reporter.id, reports.reporterId))
      .leftJoin(resolver, eq(resolver.id, reports.resolvedBy))
      .where(where)
      .orderBy(desc(reports.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(reports).where(where),
  ]);

  const targets = await loadReportTargets(rows.map((r) => ({ type: r.targetType, id: r.targetId })));

  return {
    items: rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolutionNote: r.resolutionNote,
      createdAt: iso(r.createdAt),
      resolvedAt: r.resolvedAt ? iso(r.resolvedAt) : null,
      reporter:
        r.reporterId && r.reporterUsername && r.reporterDisplayName
          ? toUserSummary({ id: r.reporterId, username: r.reporterUsername, displayName: r.reporterDisplayName, avatarKey: r.reporterAvatarKey })
          : null,
      resolvedBy:
        r.resolverId && r.resolverUsername && r.resolverDisplayName
          ? toUserSummary({ id: r.resolverId, username: r.resolverUsername, displayName: r.resolverDisplayName, avatarKey: r.resolverAvatarKey })
          : null,
      target: targets.get(`${r.targetType}:${r.targetId}`) ?? { exists: false, label: "(삭제됨)", url: null, thumbUrl: null, owner: null, state: null },
      pendingForTarget: r.pendingForTarget,
    })),
    total: countRows[0]?.count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

async function loadReportTargets(list: { type: string; id: number }[]) {
  const map = new Map<string, AdminReportTarget>();
  const ids = (type: string) => [...new Set(list.filter((l) => l.type === type).map((l) => l.id))];
  const owner = alias(users, "owner");

  const pinIds = ids("pin");
  if (pinIds.length) {
    const rows = await db
      .select({ id: pins.id, title: pins.title, status: pins.status, visibility: pins.visibility, thumbKey: images.thumbKey, driver: images.storageDriver, oId: owner.id, oUsername: owner.username, oDisplayName: owner.displayName, oAvatarKey: owner.avatarKey })
      .from(pins)
      .innerJoin(images, eq(images.id, pins.imageId))
      .innerJoin(owner, eq(owner.id, pins.authorId))
      .where(inArray(pins.id, pinIds));
    for (const r of rows) {
      map.set(`pin:${r.id}`, {
        exists: true,
        label: r.title,
        url: `/pins/${r.id}`,
        thumbUrl: fileUrl(r.driver, r.thumbKey),
        owner: toUserSummary({ id: r.oId, username: r.oUsername, displayName: r.oDisplayName, avatarKey: r.oAvatarKey }),
        state: r.status === "hidden" ? "숨김" : r.visibility === "private" ? "비공개" : "공개",
      });
    }
  }
  const commentIds = ids("comment");
  if (commentIds.length) {
    const rows = await db
      .select({ id: comments.id, body: comments.body, pinId: comments.pinId, oId: owner.id, oUsername: owner.username, oDisplayName: owner.displayName, oAvatarKey: owner.avatarKey })
      .from(comments)
      .innerJoin(owner, eq(owner.id, comments.authorId))
      .where(inArray(comments.id, commentIds));
    for (const r of rows) {
      map.set(`comment:${r.id}`, {
        exists: true,
        label: r.body.length > 80 ? `${r.body.slice(0, 80)}…` : r.body,
        url: `/pins/${r.pinId}`,
        thumbUrl: null,
        owner: toUserSummary({ id: r.oId, username: r.oUsername, displayName: r.oDisplayName, avatarKey: r.oAvatarKey }),
        state: null,
      });
    }
  }
  const userIds = ids("user");
  if (userIds.length) {
    const rows = await db.select().from(users).where(inArray(users.id, userIds));
    for (const u of rows) {
      map.set(`user:${u.id}`, {
        exists: true,
        label: `${u.displayName} (@${u.username})`,
        url: `/u/${u.username}`,
        thumbUrl: toUserSummary(u).avatarUrl,
        owner: toUserSummary(u),
        state: u.status === "suspended" ? "정지됨" : "정상",
      });
    }
  }
  const boardIds = ids("board");
  if (boardIds.length) {
    const rows = await db
      .select({ id: boards.id, name: boards.name, visibility: boards.visibility, oId: owner.id, oUsername: owner.username, oDisplayName: owner.displayName, oAvatarKey: owner.avatarKey })
      .from(boards)
      .innerJoin(owner, eq(owner.id, boards.ownerId))
      .where(inArray(boards.id, boardIds));
    for (const r of rows) {
      map.set(`board:${r.id}`, {
        exists: true,
        label: r.name,
        url: `/boards/${r.id}`,
        thumbUrl: null,
        owner: toUserSummary({ id: r.oId, username: r.oUsername, displayName: r.oDisplayName, avatarKey: r.oAvatarKey }),
        state: r.visibility === "private" ? "비공개" : "공개",
      });
    }
  }
  return map;
}

/**
 * 신고 처리: 조치(숨김/댓글 삭제/계정 정지/보드 비공개) 실행 후
 * 같은 대상에 대한 대기 중인 신고를 모두 같은 결과로 일괄 처리합니다.
 */
export async function resolveReportAdmin(
  admin: Viewer,
  reportId: number,
  input: {
    status: Exclude<ReportStatus, "pending">;
    action: "none" | "hide_pin" | "delete_comment" | "suspend_user" | "make_board_private";
    note: string | null;
  },
) {
  const [r] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!r) throw Errors.notFound("신고를 찾을 수 없습니다.");
  if (r.status !== "pending") throw Errors.conflict("ALREADY_RESOLVED", "이미 처리된 신고입니다.");

  const action = input.status === "resolved" ? input.action : "none";
  const mismatch = () => Errors.unprocessable("INVALID_ACTION", "신고 대상에 적용할 수 없는 조치입니다.");

  if (action === "delete_comment") {
    if (r.targetType !== "comment") throw mismatch();
    await deleteComment(r.targetId, admin).catch((err) => {
      if ((err as { status?: number }).status !== 404) throw err;
    });
  }

  await db.transaction(async (tx) => {
    if (action === "hide_pin") {
      if (r.targetType !== "pin") throw mismatch();
      await setPinStatusAdmin(admin, r.targetId, "hidden", input.note, tx);
    } else if (action === "make_board_private") {
      if (r.targetType !== "board") throw mismatch();
      await tx.update(boards).set({ visibility: "private" }).where(eq(boards.id, r.targetId));
      await audit(tx, admin, "board.make_private", "board", r.targetId);
    } else if (action === "suspend_user") {
      let userId: number | null = null;
      if (r.targetType === "user") userId = r.targetId;
      else if (r.targetType === "pin") userId = (await tx.select({ id: pins.authorId }).from(pins).where(eq(pins.id, r.targetId)))[0]?.id ?? null;
      else if (r.targetType === "comment") userId = (await tx.select({ id: comments.authorId }).from(comments).where(eq(comments.id, r.targetId)))[0]?.id ?? null;
      else if (r.targetType === "board") userId = (await tx.select({ id: boards.ownerId }).from(boards).where(eq(boards.id, r.targetId)))[0]?.id ?? null;
      if (!userId) throw Errors.notFound("정지할 사용자를 찾을 수 없습니다.");
      await updateUserAdmin(admin, userId, { status: "suspended" }, tx);
    }

    await tx
      .update(reports)
      .set({ status: input.status, resolvedBy: admin.id, resolvedAt: new Date(), resolutionNote: input.note })
      .where(and(eq(reports.targetType, r.targetType), eq(reports.targetId, r.targetId), eq(reports.status, "pending")));
    await audit(tx, admin, `report.${input.status}`, r.targetType, r.targetId, { reportId, action, note: input.note });
  });
}

/* ────────────────────────── 감사 로그 ────────────────────────── */

export async function listAuditLogs(q: { page: number; pageSize: number }): Promise<Paginated<AdminAuditLogItem>> {
  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        details: adminAuditLogs.details,
        createdAt: adminAuditLogs.createdAt,
        adminId: users.id,
        adminUsername: users.username,
        adminDisplayName: users.displayName,
        adminAvatarKey: users.avatarKey,
      })
      .from(adminAuditLogs)
      .leftJoin(users, eq(users.id, adminAuditLogs.adminId))
      .orderBy(desc(adminAuditLogs.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(adminAuditLogs),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      details: r.details,
      createdAt: iso(r.createdAt),
      admin:
        r.adminId && r.adminUsername && r.adminDisplayName
          ? toUserSummary({ id: r.adminId, username: r.adminUsername, displayName: r.adminDisplayName, avatarKey: r.adminAvatarKey })
          : null,
    })),
    total: countRows[0]?.count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}
