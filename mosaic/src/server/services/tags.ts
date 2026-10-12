import { and, asc, desc, eq, gt, inArray, like, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { pinTags, pins, tags } from "@/db/schema";
import { normalizeTag, normalizeTags } from "@/lib/validators";
import { buildSearchNgrams } from "@/server/search";
import type { TagSuggestion } from "@/types";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** 새로 연결되는 태그를 upsert 하고 사용 횟수를 1 증가시킵니다. */
async function attachTagNames(tx: DbOrTx, names: string[]) {
  if (names.length === 0) return [];
  return tx
    .insert(tags)
    .values(names.map((name) => ({ name, usageCount: 1 })))
    .onConflictDoUpdate({ target: tags.name, set: { usageCount: sql`${tags.usageCount} + 1` } })
    .returning({ id: tags.id, name: tags.name });
}

/** pins.tags_text / search_ngrams (검색용 비정규화 컬럼) 재계산 → search_vector 생성 컬럼이 자동 갱신됨 */
export async function refreshPinSearchFields(tx: DbOrTx, pinId: number) {
  const [pin] = await tx
    .select({ title: pins.title, description: pins.description })
    .from(pins)
    .where(eq(pins.id, pinId));
  if (!pin) return;
  const names = (
    await tx
      .select({ name: tags.name })
      .from(pinTags)
      .innerJoin(tags, eq(tags.id, pinTags.tagId))
      .where(eq(pinTags.pinId, pinId))
      .orderBy(asc(tags.name))
  ).map((r) => r.name);
  const tagsText = names.join(" ");
  await tx
    .update(pins)
    .set({ tagsText, searchNgrams: buildSearchNgrams(pin.title, pin.description, tagsText) })
    .where(eq(pins.id, pinId));
}

/**
 * 핀의 태그를 원하는 목록으로 동기화합니다 (추가/삭제 diff 적용 + usage_count 보정).
 * 목록에 남아있는 AI 태그는 source='ai' 를 유지하고, 새로 추가되는 태그는 source='user' 입니다.
 */
export async function setPinTags(tx: DbOrTx, pinId: number, desiredRaw: string[]) {
  const desired = normalizeTags(desiredRaw);
  const current = await tx
    .select({ tagId: pinTags.tagId, name: tags.name })
    .from(pinTags)
    .innerJoin(tags, eq(tags.id, pinTags.tagId))
    .where(eq(pinTags.pinId, pinId));

  const desiredSet = new Set(desired);
  const currentNames = new Set(current.map((c) => c.name));
  const removed = current.filter((c) => !desiredSet.has(c.name)).map((c) => c.tagId);
  const added = desired.filter((n) => !currentNames.has(n));

  if (removed.length) {
    await tx.delete(pinTags).where(and(eq(pinTags.pinId, pinId), inArray(pinTags.tagId, removed)));
    await tx
      .update(tags)
      .set({ usageCount: sql`greatest(${tags.usageCount} - 1, 0)` })
      .where(inArray(tags.id, removed));
  }
  if (added.length) {
    const rows = await attachTagNames(tx, added);
    await tx
      .insert(pinTags)
      .values(rows.map((r) => ({ pinId, tagId: r.id, source: "user" as const })))
      .onConflictDoNothing();
  }
  await refreshPinSearchFields(tx, pinId);
}

/** AI 분석 라벨을 자동 태그(source='ai')로 추가. 이미 존재하는 태그는 건너뜁니다. */
export async function addAiTags(
  tx: DbOrTx,
  pinId: number,
  labels: { name: string; confidence: number }[],
  maxTags = 6,
): Promise<number> {
  const confidence = new Map<string, number>();
  for (const l of labels) {
    const n = normalizeTag(l.name);
    if (n && !confidence.has(n)) confidence.set(n, l.confidence);
  }
  if (confidence.size === 0) return 0;
  const existing = await tx
    .select({ name: tags.name })
    .from(pinTags)
    .innerJoin(tags, eq(tags.id, pinTags.tagId))
    .where(eq(pinTags.pinId, pinId));
  const have = new Set(existing.map((e) => e.name));
  const toAdd = [...confidence.keys()].filter((n) => !have.has(n)).slice(0, maxTags);
  if (toAdd.length === 0) return 0;
  const rows = await attachTagNames(tx, toAdd);
  await tx
    .insert(pinTags)
    .values(rows.map((r) => ({ pinId, tagId: r.id, source: "ai" as const, confidence: confidence.get(r.name) ?? null })))
    .onConflictDoNothing();
  await refreshPinSearchFields(tx, pinId);
  return rows.length;
}

/** 핀 삭제 전 해당 핀 태그들의 사용 횟수 차감 */
export async function releasePinTags(tx: DbOrTx, pinId: number) {
  await tx
    .update(tags)
    .set({ usageCount: sql`greatest(${tags.usageCount} - 1, 0)` })
    .where(sql`${tags.id} in (select tag_id from pin_tags where pin_id = ${pinId})`);
}

/**
 * 인기 태그 (usage_count 인덱스 순회)
 * userOnly: 사용자가 직접 단 적이 있는 태그만 (AI 색상 태그가 탐색 화면을 독점하지 않도록)
 */
export async function popularTags(limit = 20, opts: { userOnly?: boolean } = {}): Promise<TagSuggestion[]> {
  const conds = [gt(tags.usageCount, 0)];
  if (opts.userOnly) {
    // 단일 테이블 select 이므로 상관 서브쿼리에서는 테이블명을 명시합니다.
    conds.push(sql`exists (select 1 from pin_tags pt where pt.tag_id = "tags"."id" and pt.source = 'user')`);
  }
  return db
    .select({ name: tags.name, usageCount: tags.usageCount })
    .from(tags)
    .where(and(...conds))
    .orderBy(desc(tags.usageCount), asc(tags.name))
    .limit(limit);
}

/** 태그 자동완성 (varchar_pattern_ops 인덱스를 사용하는 접두 검색) */
export async function suggestTags(prefix: string, limit = 10): Promise<TagSuggestion[]> {
  const p = normalizeTag(prefix);
  if (!p) return popularTags(limit, { userOnly: true });
  return db
    .select({ name: tags.name, usageCount: tags.usageCount })
    .from(tags)
    .where(and(like(tags.name, `${escapeLike(p)}%`), gt(tags.usageCount, 0)))
    .orderBy(desc(tags.usageCount), asc(tags.name))
    .limit(limit);
}
