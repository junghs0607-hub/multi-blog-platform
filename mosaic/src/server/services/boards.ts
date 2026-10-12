import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { boardPins, boards, images, pins, users } from "@/db/schema";
import { isAdmin, type Viewer } from "@/server/auth/types";
import { Errors, pgConstraint, pgErrorCode } from "@/server/http";
import { fileUrl } from "@/server/storage";
import { patchValue } from "@/server/validation";
import type { Board, BoardOption, Page, PinCard, Visibility } from "@/types";
import { decodeCursor, encodeCursor, iso, toPinCard, toUserSummary, type PinCardRow } from "./mappers";
import { notify, retractNotification } from "./notifications";
import { getViewablePin, pinCardSelection, viewablePinCondition } from "./pins";

/* ────────────────────────── 접근 제어 ────────────────────────── */

interface BoardAccess {
  id: number;
  ownerId: number;
  name: string;
  visibility: Visibility;
  ownerStatus: "active" | "suspended";
}

async function loadBoardAccess(boardId: number): Promise<BoardAccess | null> {
  const [row] = await db
    .select({
      id: boards.id,
      ownerId: boards.ownerId,
      name: boards.name,
      visibility: boards.visibility,
      ownerStatus: users.status,
    })
    .from(boards)
    .innerJoin(users, eq(users.id, boards.ownerId))
    .where(eq(boards.id, boardId))
    .limit(1);
  return row ?? null;
}

/** 비공개 보드는 소유자와 관리자만 열람할 수 있습니다. */
export function canViewBoard(b: Pick<BoardAccess, "ownerId" | "visibility" | "ownerStatus">, viewer: Viewer | null) {
  if (isAdmin(viewer)) return true;
  if (viewer && viewer.id === b.ownerId) return true;
  return b.visibility === "public" && b.ownerStatus === "active";
}

async function getViewableBoard(boardId: number, viewer: Viewer | null): Promise<BoardAccess> {
  const b = await loadBoardAccess(boardId);
  // 비공개 보드의 존재 자체를 노출하지 않도록 403 대신 404
  if (!b || !canViewBoard(b, viewer)) throw Errors.notFound("보드를 찾을 수 없습니다.");
  return b;
}

/** 보드 수정/핀 추가는 소유자만 가능 */
export async function getOwnedBoard(boardId: number, viewer: Viewer): Promise<BoardAccess> {
  const b = await getViewableBoard(boardId, viewer);
  if (b.ownerId !== viewer.id) throw Errors.forbidden("본인의 보드만 수정할 수 있습니다.");
  return b;
}

/* ────────────────────────── 조회 ────────────────────────── */

/** 보드 커버: 지정된 커버 핀 우선, 이후 최근 저장된 핀 썸네일 최대 3개 */
function coverSelection(viewerId: number | null) {
  const visible = viewerId
    ? sql`(p.visibility = 'public' or p.author_id = ${viewerId})`
    : sql`p.visibility = 'public'`;
  return sql<string[] | null>`(
    select array_agg(x.k order by x.ord) from (
      select i.storage_driver || ':' || i.thumb_key as k,
             row_number() over (order by (p.id = ${boards.coverPinId}) desc nulls last, bp.created_at desc) as ord
      from board_pins bp
      join pins p on p.id = bp.pin_id
      join images i on i.id = p.image_id
      where bp.board_id = ${boards.id} and p.status = 'active' and ${visible}
      order by ord
      limit 3
    ) x
  )`;
}

function boardSelection(viewerId: number | null) {
  return {
    id: boards.id,
    name: boards.name,
    description: boards.description,
    visibility: boards.visibility,
    pinCount: boards.pinCount,
    createdAt: boards.createdAt,
    updatedAt: boards.updatedAt,
    ownerId: users.id,
    ownerUsername: users.username,
    ownerDisplayName: users.displayName,
    ownerAvatarKey: users.avatarKey,
    covers: coverSelection(viewerId),
  };
}

type BoardRowSel = {
  id: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  pinCount: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: number;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarKey: string | null;
  covers: string[] | null;
};

function coverUrlsFrom(covers: string[] | null): string[] {
  return (covers ?? []).map((c) => {
    const idx = c.indexOf(":");
    return fileUrl(c.slice(0, idx), c.slice(idx + 1));
  });
}

function toBoard(r: BoardRowSel, viewer: Viewer | null): Board {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    visibility: r.visibility,
    pinCount: r.pinCount,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    owner: toUserSummary({
      id: r.ownerId,
      username: r.ownerUsername,
      displayName: r.ownerDisplayName,
      avatarKey: r.ownerAvatarKey,
    }),
    coverUrls: coverUrlsFrom(r.covers),
    isOwner: viewer?.id === r.ownerId,
  };
}

export async function listBoardsForUser(ownerId: number, viewer: Viewer | null): Promise<Board[]> {
  const viewerId = viewer?.id ?? null;
  const conds: SQL[] = [eq(boards.ownerId, ownerId)];
  if (viewerId !== ownerId && !isAdmin(viewer)) conds.push(eq(boards.visibility, "public"));
  const rows = await db
    .select(boardSelection(viewerId))
    .from(boards)
    .innerJoin(users, eq(users.id, boards.ownerId))
    .where(and(...conds))
    .orderBy(desc(boards.updatedAt), desc(boards.id))
    .limit(200);
  return rows.map((r) => toBoard(r, viewer));
}

export async function getBoard(boardId: number, viewer: Viewer | null): Promise<Board | null> {
  const access = await loadBoardAccess(boardId);
  if (!access || !canViewBoard(access, viewer)) return null;
  const [row] = await db
    .select(boardSelection(viewer?.id ?? null))
    .from(boards)
    .innerJoin(users, eq(users.id, boards.ownerId))
    .where(eq(boards.id, boardId));
  return row ? toBoard(row, viewer) : null;
}

/** 보드에 저장된 핀 목록 (저장 시각 역순 키셋 페이지네이션) */
export async function listBoardPins(
  boardId: number,
  viewer: Viewer | null,
  cursorRaw: string | undefined,
  limit: number,
): Promise<Page<PinCard>> {
  await getViewableBoard(boardId, viewer);
  const viewerId = viewer?.id ?? null;
  const cursor = decodeCursor(cursorRaw);
  const conds: SQL[] = [eq(boardPins.boardId, boardId), viewablePinCondition(viewerId)];
  if (cursor?.t && cursor.id) {
    conds.push(sql`(${boardPins.createdAt}, ${boardPins.pinId}) < (${cursor.t}::timestamptz, ${cursor.id}::bigint)`);
  }
  const rows = await db
    .select({ ...pinCardSelection(viewerId), savedAt: boardPins.createdAt })
    .from(boardPins)
    .innerJoin(pins, eq(pins.id, boardPins.pinId))
    .innerJoin(images, eq(images.id, pins.imageId))
    .innerJoin(users, eq(users.id, pins.authorId))
    .where(and(...conds))
    .orderBy(desc(boardPins.createdAt), desc(boardPins.pinId))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((r) => toPinCard(r as PinCardRow)),
    nextCursor: rows.length > limit && last ? encodeCursor({ t: iso(last.savedAt), id: last.id }) : null,
  };
}

/** 핀 저장 다이얼로그: 내 보드 목록 + 해당 핀 저장 여부 */
export async function listMyBoardOptions(viewer: Viewer, pinId?: number): Promise<BoardOption[]> {
  const rows = await db
    .select({
      id: boards.id,
      name: boards.name,
      visibility: boards.visibility,
      pinCount: boards.pinCount,
      // 단일 테이블 select 에서는 drizzle 이 컬럼을 테이블명 없이 렌더링하므로 상관 서브쿼리에서는 명시적으로 한정합니다.
      saved: pinId
        ? sql<boolean>`exists (select 1 from board_pins x where x.board_id = "boards"."id" and x.pin_id = ${pinId})`
        : sql<boolean>`false`,
      cover: sql<string | null>`(
        select i.storage_driver || ':' || i.thumb_key from board_pins bp
        join pins p on p.id = bp.pin_id join images i on i.id = p.image_id
        where bp.board_id = "boards"."id" and p.status = 'active'
        order by (p.id = "boards"."cover_pin_id") desc nulls last, bp.created_at desc limit 1
      )`,
    })
    .from(boards)
    .where(eq(boards.ownerId, viewer.id))
    .orderBy(desc(boards.updatedAt), desc(boards.id))
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    visibility: r.visibility,
    pinCount: r.pinCount,
    saved: Boolean(r.saved),
    coverUrl: r.cover ? coverUrlsFrom([r.cover])[0]! : null,
  }));
}

/* ────────────────────────── 생성 / 수정 / 삭제 ────────────────────────── */

function boardNameConflict(err: unknown) {
  if (pgErrorCode(err) === "23505" && pgConstraint(err) === "boards_owner_name_uq") {
    return Errors.conflict("BOARD_NAME_TAKEN", "같은 이름의 보드가 이미 있습니다.");
  }
  return err;
}

export async function createBoard(
  viewer: Viewer,
  input: { name: string; description: string | null; visibility: Visibility },
): Promise<Board> {
  try {
    const [row] = await db
      .insert(boards)
      .values({ ownerId: viewer.id, name: input.name, description: input.description, visibility: input.visibility })
      .returning({ id: boards.id });
    return (await getBoard(row!.id, viewer))!;
  } catch (err) {
    throw boardNameConflict(err);
  }
}

export async function updateBoard(
  boardId: number,
  viewer: Viewer,
  input: {
    name?: string;
    description?: string | null;
    visibility?: Visibility;
    coverPinId?: number | "" | null;
  },
): Promise<Board> {
  await getOwnedBoard(boardId, viewer);
  const set: Partial<typeof boards.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  const description = patchValue(input.description);
  if (description !== undefined) set.description = description;
  if (input.visibility) set.visibility = input.visibility;
  const coverPinId = patchValue(input.coverPinId);
  if (coverPinId !== undefined) {
    if (typeof coverPinId === "number") {
      const [inBoard] = await db
        .select({ one: sql<number>`1` })
        .from(boardPins)
        .where(and(eq(boardPins.boardId, boardId), eq(boardPins.pinId, coverPinId)));
      if (!inBoard) throw Errors.unprocessable("INVALID_COVER", "보드에 저장된 핀만 커버로 지정할 수 있습니다.");
    }
    set.coverPinId = coverPinId as number | null;
  }
  try {
    await db.update(boards).set(set).where(eq(boards.id, boardId));
  } catch (err) {
    throw boardNameConflict(err);
  }
  return (await getBoard(boardId, viewer))!;
}

export async function deleteBoard(boardId: number, viewer: Viewer): Promise<void> {
  const b = await getViewableBoard(boardId, viewer);
  if (b.ownerId !== viewer.id && !isAdmin(viewer)) throw Errors.forbidden("본인의 보드만 삭제할 수 있습니다.");
  await db.transaction(async (tx) => {
    // 보드에 저장되어 있던 핀들의 저장 수 보정
    await tx
      .update(pins)
      .set({ saveCount: sql`greatest(${pins.saveCount} - 1, 0)` })
      .where(sql`${pins.id} in (select pin_id from board_pins where board_id = ${boardId})`);
    await tx.delete(boards).where(eq(boards.id, boardId));
  });
}

/* ────────────────────────── 핀 저장 / 저장 취소 ────────────────────────── */

/** 트랜잭션 내부에서 보드에 핀 추가 (업로드 시 보드 선택 / 저장 API 공용) */
export async function addPinToBoardTx(
  tx: DbOrTx,
  board: Pick<BoardAccess, "id" | "visibility">,
  pinId: number,
  actor: Viewer,
  pinAuthorId: number,
): Promise<boolean> {
  const inserted = await tx
    .insert(boardPins)
    .values({ boardId: board.id, pinId })
    .onConflictDoNothing()
    .returning({ pinId: boardPins.pinId });
  if (!inserted.length) return false;
  await tx
    .update(boards)
    .set({ pinCount: sql`${boards.pinCount} + 1`, updatedAt: new Date() })
    .where(eq(boards.id, board.id));
  await tx
    .update(pins)
    .set({ saveCount: sql`${pins.saveCount} + 1` })
    .where(eq(pins.id, pinId));
  // 비공개 보드에 저장한 사실은 알리지 않습니다.
  if (board.visibility === "public") {
    await notify(tx, { recipientId: pinAuthorId, actorId: actor.id, type: "save", pinId, boardId: board.id });
  }
  return true;
}

export async function savePinToBoard(boardId: number, pinId: number, viewer: Viewer) {
  const board = await getOwnedBoard(boardId, viewer);
  const pin = await getViewablePin(pinId, viewer);
  return db.transaction(async (tx) => {
    const added = await addPinToBoardTx(tx, board, pinId, viewer, pin.authorId);
    const [counts] = await tx
      .select({ saveCount: pins.saveCount, pinCount: boards.pinCount })
      .from(pins)
      .innerJoin(boards, eq(boards.id, boardId))
      .where(eq(pins.id, pinId));
    return { saved: true, added, saveCount: counts!.saveCount, boardPinCount: counts!.pinCount };
  });
}

export async function removePinFromBoard(boardId: number, pinId: number, viewer: Viewer) {
  await getOwnedBoard(boardId, viewer);
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(boardPins)
      .where(and(eq(boardPins.boardId, boardId), eq(boardPins.pinId, pinId)))
      .returning({ pinId: boardPins.pinId });
    if (deleted.length) {
      await tx
        .update(boards)
        .set({
          pinCount: sql`greatest(${boards.pinCount} - 1, 0)`,
          coverPinId: sql`case when ${boards.coverPinId} = ${pinId} then null else ${boards.coverPinId} end`,
        })
        .where(eq(boards.id, boardId));
      const [p] = await tx
        .update(pins)
        .set({ saveCount: sql`greatest(${pins.saveCount} - 1, 0)` })
        .where(eq(pins.id, pinId))
        .returning({ authorId: pins.authorId });
      if (p) await retractNotification(tx, { recipientId: p.authorId, actorId: viewer.id, type: "save", pinId, boardId });
    }
    const [counts] = await tx
      .select({ saveCount: pins.saveCount, pinCount: boards.pinCount })
      .from(pins)
      .innerJoin(boards, eq(boards.id, boardId))
      .where(eq(pins.id, pinId));
    return { saved: false, removed: deleted.length > 0, saveCount: counts?.saveCount ?? 0, boardPinCount: counts?.pinCount ?? 0 };
  });
}
