import { and, asc, desc, eq, inArray, lt, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  boardPins,
  boards,
  categories,
  follows,
  imageAnalyses,
  images,
  pinLikes,
  pinTags,
  pins,
  tags,
  users,
} from "@/db/schema";
import { getDomain } from "@/lib/validators";
import { isAdmin, type Viewer } from "@/server/auth/types";
import { Errors } from "@/server/http";
import { buildTsQuery } from "@/server/search";
import { fileUrl } from "@/server/storage";
import { patchValue } from "@/server/validation";
import type { Page, PaletteColor, PinCard, PinDetail, Visibility } from "@/types";
import { getCategoryById, getCategoryBySlug } from "./categories";
import { cleanupImageIfOrphan } from "./images";
import { decodeCursor, encodeCursor, iso, toPinCard, toUserSummary, type PinCardRow } from "./mappers";
import { notify, retractNotification } from "./notifications";
import { refreshPinSearchFields, releasePinTags, setPinTags } from "./tags";

/* ────────────────────────── 접근 제어 ────────────────────────── */

export interface PinAccess {
  id: number;
  authorId: number;
  status: "active" | "hidden";
  visibility: Visibility;
  imageId: number;
  title: string;
  categoryId: number | null;
  authorStatus: "active" | "suspended";
}

export async function loadPinAccess(pinId: number): Promise<PinAccess | null> {
  const [row] = await db
    .select({
      id: pins.id,
      authorId: pins.authorId,
      status: pins.status,
      visibility: pins.visibility,
      imageId: pins.imageId,
      title: pins.title,
      categoryId: pins.categoryId,
      authorStatus: users.status,
    })
    .from(pins)
    .innerJoin(users, eq(users.id, pins.authorId))
    .where(eq(pins.id, pinId))
    .limit(1);
  return row ?? null;
}

/**
 * 핀 열람 권한
 *  - 관리자, 작성자 본인: 항상 가능 (숨김 처리된 핀 포함)
 *  - 그 외: 활성 상태 + 공개 + 작성자 계정 정상일 때만
 */
export function canViewPin(
  p: Pick<PinAccess, "authorId" | "status" | "visibility" | "authorStatus">,
  viewer: Viewer | null,
): boolean {
  if (isAdmin(viewer)) return true;
  if (viewer && viewer.id === p.authorId) return true;
  return p.status === "active" && p.authorStatus === "active" && p.visibility === "public";
}

/** 열람 불가 시 존재 여부를 숨기기 위해 404 를 던집니다. */
export async function getViewablePin(pinId: number, viewer: Viewer | null): Promise<PinAccess> {
  const p = await loadPinAccess(pinId);
  if (!p || !canViewPin(p, viewer)) throw Errors.notFound("핀을 찾을 수 없습니다.");
  return p;
}

/** 목록 조회 시 공통으로 적용하는 "열람 가능한 핀" 조건 */
export function viewablePinCondition(viewerId: number | null): SQL {
  const base = sql`${pins.status} = 'active' and ${users.status} = 'active'`;
  return viewerId
    ? sql`(${base} and (${pins.visibility} = 'public' or ${pins.authorId} = ${viewerId}))`
    : sql`(${base} and ${pins.visibility} = 'public')`;
}

/* ────────────────────────── 카드 조회 ────────────────────────── */

export function pinCardSelection(viewerId: number | null) {
  return {
    id: pins.id,
    title: pins.title,
    sourceUrl: pins.sourceUrl,
    sourceDomain: pins.sourceDomain,
    visibility: pins.visibility,
    likeCount: pins.likeCount,
    saveCount: pins.saveCount,
    commentCount: pins.commentCount,
    popularity: pins.popularity,
    createdAt: pins.createdAt,
    imgDriver: images.storageDriver,
    thumbKey: images.thumbKey,
    mediumKey: images.mediumKey,
    width: images.width,
    height: images.height,
    dominantColor: images.dominantColor,
    isAnimated: images.isAnimated,
    authorId: users.id,
    authorUsername: users.username,
    authorDisplayName: users.displayName,
    authorAvatarKey: users.avatarKey,
    saved: viewerId
      ? sql<boolean>`exists (select 1 from board_pins bp inner join boards b on b.id = bp.board_id where bp.pin_id = ${pins.id} and b.owner_id = ${viewerId})`
      : sql<boolean>`false`,
  };
}

export async function listPinCardsByIds(ids: number[], viewer: Viewer | null): Promise<PinCard[]> {
  if (ids.length === 0) return [];
  const viewerId = viewer?.id ?? null;
  const rows = await db
    .select(pinCardSelection(viewerId))
    .from(pins)
    .innerJoin(images, eq(images.id, pins.imageId))
    .innerJoin(users, eq(users.id, pins.authorId))
    .where(and(inArray(pins.id, ids), viewablePinCondition(viewerId)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toPinCard(r as PinCardRow)] : [];
  });
}

export interface ListPinsParams {
  viewer: Viewer | null;
  q?: string;
  tag?: string;
  categorySlug?: string;
  feed?: "all" | "following";
  sort?: "latest" | "popular" | "relevance";
  authorId?: number;
  cursor?: string;
  limit: number;
}

/**
 * 피드 / 검색 / 프로필 핀 목록 (커서 페이지네이션)
 *  - latest:    id DESC 키셋 (pins_public_latest_idx)
 *  - popular:   (popularity, id) DESC 키셋 (pins_public_popular_idx)
 *  - relevance: ts_rank 정렬 + 오프셋 커서 (검색 전용, 최대 5000)
 */
export async function listPins(p: ListPinsParams): Promise<Page<PinCard>> {
  const viewerId = p.viewer?.id ?? null;
  const empty: Page<PinCard> = { items: [], nextCursor: null };
  const conds: SQL[] = [eq(pins.status, "active"), eq(users.status, "active")];

  // 본인 프로필에서는 비공개 핀도 표시
  if (p.authorId && viewerId === p.authorId) conds.push(eq(pins.authorId, p.authorId));
  else {
    conds.push(eq(pins.visibility, "public"));
    if (p.authorId) conds.push(eq(pins.authorId, p.authorId));
  }

  if (p.feed === "following") {
    if (!viewerId) return empty;
    conds.push(sql`${pins.authorId} in (select ${follows.followingId} from ${follows} where ${follows.followerId} = ${viewerId})`);
  }
  if (p.categorySlug) {
    const cat = await getCategoryBySlug(p.categorySlug);
    if (!cat) return empty;
    conds.push(eq(pins.categoryId, cat.id));
  }
  if (p.tag) {
    const tagName = p.tag.replace(/^#/, "").toLowerCase();
    conds.push(
      sql`${pins.id} in (select pt.pin_id from pin_tags pt inner join tags t on t.id = pt.tag_id where t.name = ${tagName})`,
    );
  }
  let tsq: string | null = null;
  if (p.q) {
    tsq = buildTsQuery(p.q);
    if (!tsq) return empty;
    conds.push(sql`${pins.searchVector} @@ to_tsquery('simple', ${tsq})`);
  }

  const sort = p.sort === "relevance" && !tsq ? "latest" : (p.sort ?? (tsq ? "relevance" : "latest"));
  const cursor = decodeCursor(p.cursor);
  let orderBy: SQL[];
  let offset = 0;
  if (sort === "popular") {
    if (cursor?.p !== undefined && cursor.id) {
      conds.push(sql`(${pins.popularity}, ${pins.id}) < (${cursor.p}::integer, ${cursor.id}::bigint)`);
    }
    orderBy = [desc(pins.popularity), desc(pins.id)];
  } else if (sort === "relevance" && tsq) {
    offset = cursor?.o ?? 0;
    orderBy = [sql`ts_rank(${pins.searchVector}, to_tsquery('simple', ${tsq})) desc`, desc(pins.popularity), desc(pins.id)];
  } else {
    if (cursor?.id) conds.push(lt(pins.id, cursor.id));
    orderBy = [desc(pins.id)];
  }

  const rows = await db
    .select(pinCardSelection(viewerId))
    .from(pins)
    .innerJoin(images, eq(images.id, pins.imageId))
    .innerJoin(users, eq(users.id, pins.authorId))
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(p.limit + 1)
    .offset(offset);

  const items = rows.slice(0, p.limit);
  const last = items[items.length - 1];
  let nextCursor: string | null = null;
  if (rows.length > p.limit && last) {
    nextCursor =
      sort === "popular"
        ? encodeCursor({ p: last.popularity ?? 0, id: last.id })
        : sort === "relevance" && tsq
          ? offset + p.limit <= 5000
            ? encodeCursor({ o: offset + p.limit })
            : null
          : encodeCursor({ id: last.id });
  }
  return { items: items.map((r) => toPinCard(r as PinCardRow)), nextCursor };
}

/** 내가 좋아요한 핀 (좋아요한 시간 역순) */
export async function listLikedPins(viewer: Viewer, cursorRaw: string | undefined, limit: number): Promise<Page<PinCard>> {
  const cursor = decodeCursor(cursorRaw);
  const conds: SQL[] = [eq(pinLikes.userId, viewer.id), viewablePinCondition(viewer.id)];
  if (cursor?.t && cursor.id) {
    conds.push(sql`(${pinLikes.createdAt}, ${pinLikes.pinId}) < (${cursor.t}::timestamptz, ${cursor.id}::bigint)`);
  }
  const rows = await db
    .select({ ...pinCardSelection(viewer.id), likedAt: pinLikes.createdAt })
    .from(pinLikes)
    .innerJoin(pins, eq(pins.id, pinLikes.pinId))
    .innerJoin(images, eq(images.id, pins.imageId))
    .innerJoin(users, eq(users.id, pins.authorId))
    .where(and(...conds))
    .orderBy(desc(pinLikes.createdAt), desc(pinLikes.pinId))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((r) => toPinCard(r as PinCardRow)),
    nextCursor: rows.length > limit && last ? encodeCursor({ t: iso(last.likedAt), id: last.id }) : null,
  };
}

/* ────────────────────────── 상세 ────────────────────────── */

export async function getPinDetail(pinId: number, viewer: Viewer | null): Promise<PinDetail | null> {
  const [row] = await db
    .select({
      id: pins.id,
      title: pins.title,
      description: pins.description,
      sourceUrl: pins.sourceUrl,
      sourceDomain: pins.sourceDomain,
      visibility: pins.visibility,
      status: pins.status,
      likeCount: pins.likeCount,
      saveCount: pins.saveCount,
      commentCount: pins.commentCount,
      shareCount: pins.shareCount,
      createdAt: pins.createdAt,
      updatedAt: pins.updatedAt,
      imageId: images.id,
      imgDriver: images.storageDriver,
      originalKey: images.originalKey,
      mediumKey: images.mediumKey,
      thumbKey: images.thumbKey,
      width: images.width,
      height: images.height,
      mediumWidth: images.mediumWidth,
      mediumHeight: images.mediumHeight,
      sizeBytes: images.sizeBytes,
      mimeType: images.mimeType,
      format: images.format,
      dominantColor: images.dominantColor,
      isAnimated: images.isAnimated,
      authorId: users.id,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarKey: users.avatarKey,
      authorStatus: users.status,
      categoryId: categories.id,
      categorySlug: categories.slug,
      categoryName: categories.name,
      categoryDescription: categories.description,
    })
    .from(pins)
    .innerJoin(images, eq(images.id, pins.imageId))
    .innerJoin(users, eq(users.id, pins.authorId))
    .leftJoin(categories, eq(categories.id, pins.categoryId))
    .where(eq(pins.id, pinId))
    .limit(1);
  if (!row || !canViewPin(row, viewer)) return null;

  const viewerId = viewer?.id ?? null;
  const [tagRows, likedRows, savedRows, followRows, paletteRows] = await Promise.all([
    db
      .select({ name: tags.name, source: pinTags.source, confidence: pinTags.confidence })
      .from(pinTags)
      .innerJoin(tags, eq(tags.id, pinTags.tagId))
      .where(eq(pinTags.pinId, pinId))
      .orderBy(asc(pinTags.source), asc(tags.name)),
    viewerId
      ? db
          .select({ one: sql<number>`1` })
          .from(pinLikes)
          .where(and(eq(pinLikes.userId, viewerId), eq(pinLikes.pinId, pinId)))
          .limit(1)
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ boardId: boardPins.boardId })
          .from(boardPins)
          .innerJoin(boards, eq(boards.id, boardPins.boardId))
          .where(and(eq(boardPins.pinId, pinId), eq(boards.ownerId, viewerId)))
      : Promise.resolve([]),
    viewerId && viewerId !== row.authorId
      ? db
          .select({ one: sql<number>`1` })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, row.authorId)))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ colors: imageAnalyses.colors })
      .from(imageAnalyses)
      .where(
        and(
          eq(imageAnalyses.imageId, row.imageId),
          eq(imageAnalyses.analyzer, "basic"),
          eq(imageAnalyses.status, "completed"),
        ),
      )
      .limit(1),
  ]);

  const palette: PaletteColor[] = (paletteRows[0]?.colors ?? []).slice(0, 6);
  const isOwner = viewerId === row.authorId;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceUrl: row.sourceUrl,
    sourceDomain: row.sourceDomain,
    visibility: row.visibility,
    status: row.status,
    likeCount: row.likeCount,
    saveCount: row.saveCount,
    commentCount: row.commentCount,
    shareCount: row.shareCount,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    saved: savedRows.length > 0,
    author: toUserSummary({
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarKey: row.authorAvatarKey,
    }),
    category:
      row.categoryId && row.categorySlug && row.categoryName
        ? { id: row.categoryId, slug: row.categorySlug, name: row.categoryName, description: row.categoryDescription }
        : null,
    tags: tagRows,
    image: {
      thumbUrl: fileUrl(row.imgDriver, row.thumbKey),
      mediumUrl: fileUrl(row.imgDriver, row.mediumKey),
      originalUrl: fileUrl(row.imgDriver, row.originalKey),
      downloadUrl: `/api/pins/${row.id}/original`,
      width: row.width,
      height: row.height,
      mediumWidth: row.mediumWidth,
      mediumHeight: row.mediumHeight,
      sizeBytes: row.sizeBytes,
      mimeType: row.mimeType,
      format: row.format,
      dominantColor: row.dominantColor,
      isAnimated: row.isAnimated,
    },
    palette,
    viewer: {
      liked: likedRows.length > 0,
      savedBoardIds: savedRows.map((r) => r.boardId),
      isOwner,
      isFollowingAuthor: followRows.length > 0,
      canModerate: isAdmin(viewer),
    },
  };
}

/** 원본 다운로드용 정보 (접근 권한 확인 포함) */
export async function getPinOriginal(pinId: number, viewer: Viewer | null) {
  await getViewablePin(pinId, viewer);
  const [row] = await db
    .select({ driver: images.storageDriver, key: images.originalKey, mime: images.mimeType, format: images.format })
    .from(pins)
    .innerJoin(images, eq(images.id, pins.imageId))
    .where(eq(pins.id, pinId));
  if (!row) throw Errors.notFound();
  return row;
}

/* ────────────────────────── 수정 / 삭제 ────────────────────────── */

export interface UpdatePinInput {
  title?: string;
  description?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  categoryId?: number | "" | null;
  visibility?: Visibility;
}

export async function updatePin(pinId: number, viewer: Viewer, input: UpdatePinInput): Promise<PinDetail> {
  const p = await loadPinAccess(pinId);
  if (!p || !canViewPin(p, viewer)) throw Errors.notFound("핀을 찾을 수 없습니다.");
  if (p.authorId !== viewer.id) throw Errors.forbidden("본인이 작성한 핀만 수정할 수 있습니다.");

  const categoryId = patchValue(input.categoryId);
  if (typeof categoryId === "number" && !(await getCategoryById(categoryId))) {
    throw Errors.unprocessable("INVALID_CATEGORY", "존재하지 않는 카테고리입니다.");
  }

  await db.transaction(async (tx) => {
    const set: Partial<typeof pins.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) set.title = input.title;
    const description = patchValue(input.description);
    if (description !== undefined) set.description = description;
    const sourceUrl = patchValue(input.sourceUrl);
    if (sourceUrl !== undefined) {
      set.sourceUrl = sourceUrl;
      set.sourceDomain = getDomain(sourceUrl);
    }
    if (categoryId !== undefined) set.categoryId = categoryId as number | null;
    if (input.visibility) set.visibility = input.visibility;
    await tx.update(pins).set(set).where(eq(pins.id, pinId));

    if (input.tags !== undefined) await setPinTags(tx, pinId, input.tags);
    else if (input.title !== undefined || description !== undefined) await refreshPinSearchFields(tx, pinId);
  });

  const detail = await getPinDetail(pinId, viewer);
  if (!detail) throw Errors.notFound();
  return detail;
}

/** 핀 삭제 (작성자 또는 관리자). 관련 카운터를 보정하고 고아가 된 이미지 파일을 정리합니다. */
export async function deletePin(pinId: number, viewer: Viewer): Promise<void> {
  const p = await loadPinAccess(pinId);
  if (!p || !canViewPin(p, viewer)) throw Errors.notFound("핀을 찾을 수 없습니다.");
  if (p.authorId !== viewer.id && !isAdmin(viewer)) throw Errors.forbidden("본인이 작성한 핀만 삭제할 수 있습니다.");

  await db.transaction(async (tx) => {
    await releasePinTags(tx, pinId);
    await tx
      .update(boards)
      .set({ pinCount: sql`greatest(${boards.pinCount} - 1, 0)` })
      .where(sql`${boards.id} in (select board_id from board_pins where pin_id = ${pinId})`);
    await tx.delete(pins).where(eq(pins.id, pinId));
    await tx
      .update(users)
      .set({ pinCount: sql`greatest(${users.pinCount} - 1, 0)` })
      .where(eq(users.id, p.authorId));
  });
  await cleanupImageIfOrphan(p.imageId).catch((err) => console.error("[pins] image cleanup failed:", err));
}

/* ────────────────────────── 좋아요 / 공유 ────────────────────────── */

export async function likePin(pinId: number, viewer: Viewer): Promise<{ liked: boolean; likeCount: number }> {
  const p = await getViewablePin(pinId, viewer);
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(pinLikes)
      .values({ userId: viewer.id, pinId })
      .onConflictDoNothing()
      .returning({ pinId: pinLikes.pinId });
    if (inserted.length) {
      const [r] = await tx
        .update(pins)
        .set({ likeCount: sql`${pins.likeCount} + 1` })
        .where(eq(pins.id, pinId))
        .returning({ likeCount: pins.likeCount });
      await notify(tx, { recipientId: p.authorId, actorId: viewer.id, type: "like", pinId });
      return { liked: true, likeCount: r!.likeCount };
    }
    const [r] = await tx.select({ likeCount: pins.likeCount }).from(pins).where(eq(pins.id, pinId));
    return { liked: true, likeCount: r!.likeCount };
  });
}

export async function unlikePin(pinId: number, viewer: Viewer): Promise<{ liked: boolean; likeCount: number }> {
  const p = await getViewablePin(pinId, viewer);
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(pinLikes)
      .where(and(eq(pinLikes.userId, viewer.id), eq(pinLikes.pinId, pinId)))
      .returning({ pinId: pinLikes.pinId });
    if (deleted.length) {
      const [r] = await tx
        .update(pins)
        .set({ likeCount: sql`greatest(${pins.likeCount} - 1, 0)` })
        .where(eq(pins.id, pinId))
        .returning({ likeCount: pins.likeCount });
      await retractNotification(tx, { recipientId: p.authorId, actorId: viewer.id, type: "like", pinId });
      return { liked: false, likeCount: r!.likeCount };
    }
    const [r] = await tx.select({ likeCount: pins.likeCount }).from(pins).where(eq(pins.id, pinId));
    return { liked: false, likeCount: r!.likeCount };
  });
}

export async function recordShare(pinId: number, viewer: Viewer | null): Promise<{ shareCount: number }> {
  await getViewablePin(pinId, viewer);
  const [r] = await db
    .update(pins)
    .set({ shareCount: sql`${pins.shareCount} + 1` })
    .where(eq(pins.id, pinId))
    .returning({ shareCount: pins.shareCount });
  return { shareCount: r!.shareCount };
}

/* ────────────────────────── 관련 핀 ────────────────────────── */

/**
 * 관련 핀 추천 (후보 생성기 + 점수 합산 방식)
 *  - 태그 공유(공유 태그 수 × 3) / 같은 공개 보드에 함께 저장(× 2) / 같은 카테고리(+1) / 같은 작성자(+1)
 *  - 부족하면 인기 핀으로 채움
 * 향후 이미지 임베딩(pgvector) 기반 "시각적 유사도" 후보 생성기를 같은 방식으로 UNION 하면 됩니다.
 */
export async function getRelatedPins(pinId: number, viewer: Viewer | null, limit = 30): Promise<PinCard[]> {
  const p = await getViewablePin(pinId, viewer);
  const res = await db.execute<{ pin_id: string | number }>(sql`
    with tt as (select tag_id from pin_tags where pin_id = ${pinId}),
    tag_matches as (
      select pt.pin_id, count(*)::int * 3 as score
      from pin_tags pt join tt using (tag_id)
      where pt.pin_id <> ${pinId}
      group by pt.pin_id order by score desc limit 300
    ),
    cosave as (
      select bp2.pin_id, count(*)::int * 2 as score
      from board_pins bp1
      join boards b on b.id = bp1.board_id and b.visibility = 'public'
      join board_pins bp2 on bp2.board_id = bp1.board_id and bp2.pin_id <> ${pinId}
      where bp1.pin_id = ${pinId}
      group by bp2.pin_id order by score desc limit 150
    ),
    cat_matches as (
      select id as pin_id, 1 as score from pins
      where category_id = ${p.categoryId} and id <> ${pinId} and status = 'active' and visibility = 'public'
      order by id desc limit 150
    ),
    same_author as (
      select id as pin_id, 1 as score from pins
      where author_id = ${p.authorId} and id <> ${pinId} and status = 'active' and visibility = 'public'
      order by id desc limit 30
    ),
    scored as (
      select pin_id, sum(score)::int as score from (
        select * from tag_matches union all select * from cosave
        union all select * from cat_matches union all select * from same_author
      ) s group by pin_id
    )
    select s.pin_id from scored s
    join pins p on p.id = s.pin_id
    join users u on u.id = p.author_id
    where p.status = 'active' and p.visibility = 'public' and u.status = 'active'
    order by s.score desc, p.popularity desc, p.id desc
    limit ${limit}
  `);
  const ids = res.rows.map((r) => Number(r.pin_id));

  if (ids.length < limit) {
    const exclude = [pinId, ...ids];
    const filler = await db
      .select({ id: pins.id })
      .from(pins)
      .innerJoin(users, eq(users.id, pins.authorId))
      .where(
        and(
          eq(pins.status, "active"),
          eq(pins.visibility, "public"),
          eq(users.status, "active"),
          notInArray(pins.id, exclude),
        ),
      )
      .orderBy(desc(pins.popularity), desc(pins.id))
      .limit(limit - ids.length);
    ids.push(...filler.map((f) => f.id));
  }
  return listPinCardsByIds(ids, viewer);
}

/** 관리자/통계용: 핀 존재 여부와 작성자 */
export async function getPinOwner(pinId: number) {
  const [r] = await db.select({ authorId: pins.authorId, title: pins.title }).from(pins).where(eq(pins.id, pinId));
  return r ?? null;
}

