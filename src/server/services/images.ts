import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { images, pins } from "@/db/schema";
import type { Viewer } from "@/server/auth/types";
import { env } from "@/server/env";
import { phashChunks } from "@/server/images/process";
import { fileUrl, getDriver, type StorageDriverName } from "@/server/storage";
import type { SimilarCandidate } from "@/types";

export async function findImageBySha(sha256: string) {
  const [row] = await db
    .select({ id: images.id, storageDriver: images.storageDriver })
    .from(images)
    .where(eq(images.sha256, sha256))
    .limit(1);
  return row ?? null;
}

/**
 * 정확히 같은 파일(SHA-256)로 만들어진 핀 중 업로더에게 "중복"으로 안내해야 할 핀을 찾습니다.
 *  - 내가 이미 올린 핀 (own=true)
 *  - 다른 사용자의 공개 핀 (own=false) → 새로 올리는 대신 저장하도록 유도
 * 다른 사용자의 비공개 핀만 있다면 존재를 노출하지 않고 업로드를 허용합니다 (파일은 재사용).
 */
export async function findDuplicatePin(imageId: number, viewer: Viewer) {
  const res = await db.execute<{ id: string | number; own: boolean }>(sql`
    select p.id, (p.author_id = ${viewer.id}) as own
    from pins p join users u on u.id = p.author_id
    where p.image_id = ${imageId}
      and (p.author_id = ${viewer.id} or (p.status = 'active' and p.visibility = 'public' and u.status = 'active'))
    order by (p.author_id = ${viewer.id}) desc, p.id asc
    limit 1
  `);
  const r = res.rows[0];
  return r ? { pinId: Number(r.id), own: Boolean(r.own) } : null;
}

/** 16bit 값에서 해밍 거리 radius 이내의 모든 값 */
function chunkNeighbors(v: number, radius: number): number[] {
  const out = [v];
  if (radius >= 1) for (let i = 0; i < 16; i++) out.push(v ^ (1 << i));
  if (radius >= 2) for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) out.push(v ^ (1 << i) ^ (1 << j));
  return out;
}

/**
 * dHash 해밍 거리 기반 유사 이미지 검색 (Multi-Index Hashing)
 * 64bit 해시를 16bit 청크 4개로 나누면, 전체 거리가 t 이하일 때 적어도 한 청크의 거리는 ⌊t/4⌋ 이하입니다(비둘기집 원리).
 * 각 청크에 대해 반경 ⌊t/4⌋ 이내의 값들(t≤7 이면 17개)을 IN 조건으로 인덱스 조회해 후보를 추린 뒤
 * bit_count 로 정밀 비교하므로, 전체 테이블 스캔 없이 누락 없이(재현율 100%) 찾습니다.
 */
export async function findSimilarPins(
  phash: bigint,
  viewer: Viewer,
  threshold = env.DUPLICATE_PHASH_THRESHOLD,
  limit = 6,
): Promise<SimilarCandidate[]> {
  const radius = Math.min(2, Math.floor(threshold / 4));
  const [a, b, c, d] = phashChunks(phash).map((v) => chunkNeighbors(v, radius)) as [number[], number[], number[], number[]];
  const list = (vals: number[]) => sql.join(vals.map((v) => sql`${v}`), sql`, `);
  const h = phash.toString();
  const res = await db.execute<{
    pin_id: string | number;
    title: string;
    thumb_key: string;
    storage_driver: string;
    distance: number;
  }>(sql`
    select p.id as pin_id, p.title, i.thumb_key, i.storage_driver,
           bit_count((i.phash # ${h}::bigint)::bit(64))::int as distance
    from images i
    join pins p on p.image_id = i.id
    join users u on u.id = p.author_id
    where (i.phash_a in (${list(a)}) or i.phash_b in (${list(b)}) or i.phash_c in (${list(c)}) or i.phash_d in (${list(d)}))
      and bit_count((i.phash # ${h}::bigint)::bit(64)) <= ${threshold}
      and (p.author_id = ${viewer.id} or (p.status = 'active' and p.visibility = 'public' and u.status = 'active'))
    order by distance asc, p.id desc
    limit ${limit}
  `);
  return res.rows.map((r) => ({
    pinId: Number(r.pin_id),
    title: r.title,
    thumbUrl: fileUrl(r.storage_driver, r.thumb_key),
    distance: r.distance,
  }));
}

/**
 * 더 이상 어떤 핀도 참조하지 않는 이미지의 DB 행과 파일(원본/중간/썸네일)을 삭제합니다.
 * pins.image_id 의 FK(ON DELETE RESTRICT) 덕분에 동시에 새 핀이 연결되면 삭제가 실패하여 안전합니다.
 */
export async function cleanupImageIfOrphan(imageId: number): Promise<boolean> {
  const [ref] = await db.select({ id: pins.id }).from(pins).where(eq(pins.imageId, imageId)).limit(1);
  if (ref) return false;
  let deleted: { driver: string; keys: string[] } | null = null;
  try {
    const rows = await db
      .delete(images)
      .where(eq(images.id, imageId))
      .returning({
        driver: images.storageDriver,
        original: images.originalKey,
        medium: images.mediumKey,
        thumb: images.thumbKey,
      });
    if (rows[0]) deleted = { driver: rows[0].driver, keys: [rows[0].original, rows[0].medium, rows[0].thumb] };
  } catch (err) {
    console.warn(`[images] cleanup skipped for image ${imageId}:`, (err as Error).message);
    return false;
  }
  if (!deleted) return false;
  const driver = getDriver(deleted.driver as StorageDriverName);
  await Promise.allSettled(deleted.keys.map((k) => driver.delete(k)));
  return true;
}
