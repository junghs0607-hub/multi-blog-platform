import { and, eq, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { imageAnalyses, imageEmbeddings, images, pins } from "@/db/schema";
import { env } from "@/server/env";
import { getDriver, type StorageDriverName } from "@/server/storage";
import { addAiTags } from "@/server/services/tags";
import { getEnabledAnalyzers } from "./registry";
import type { AnalyzerLabel } from "./types";

/**
 * 이미지 분석 파이프라인 (jobs: image.analyze)
 *  1) 활성화된 분석기 실행 → image_analyses 에 결과 저장 (분석기별 upsert)
 *  2) 임베딩 결과는 image_embeddings 에 저장
 *  3) AUTO_TAG_ENABLED 이면 신뢰도 기준을 넘는 라벨을 이 이미지를 사용하는 모든 핀에 AI 태그로 추가
 */
export async function analyzeImage(imageId: number): Promise<void> {
  const [img] = await db.select().from(images).where(eq(images.id, imageId));
  if (!img) return;

  const analyzers = getEnabledAnalyzers();
  if (analyzers.length === 0) {
    await db.update(images).set({ analysisStatus: "skipped" }).where(eq(images.id, imageId));
    return;
  }
  await db.update(images).set({ analysisStatus: "processing" }).where(eq(images.id, imageId));

  const buffer = await getDriver(img.storageDriver as StorageDriverName).getBuffer(img.mediumKey);
  if (!buffer) {
    await db.update(images).set({ analysisStatus: "failed" }).where(eq(images.id, imageId));
    throw new Error(`분석할 이미지 파일을 찾을 수 없습니다: ${img.mediumKey}`);
  }

  const labels: AnalyzerLabel[] = [];
  let succeeded = 0;
  for (const analyzer of analyzers) {
    try {
      const result = await analyzer.analyze({
        imageId,
        buffer,
        mimeType: "image/webp",
        width: img.mediumWidth,
        height: img.mediumHeight,
      });
      const values = {
        imageId,
        analyzer: analyzer.id,
        modelVersion: result.modelVersion ?? analyzer.version,
        status: "completed" as const,
        labels: result.labels,
        caption: result.caption ?? null,
        colors: result.colors ?? null,
        raw: result.raw ?? null,
        error: null,
        completedAt: new Date(),
      };
      await db
        .insert(imageAnalyses)
        .values(values)
        .onConflictDoUpdate({ target: [imageAnalyses.imageId, imageAnalyses.analyzer], set: values });
      if (result.embedding) {
        const emb = {
          imageId,
          model: result.embedding.model,
          dimensions: result.embedding.vector.length,
          embedding: result.embedding.vector,
        };
        await db
          .insert(imageEmbeddings)
          .values(emb)
          .onConflictDoUpdate({ target: [imageEmbeddings.imageId, imageEmbeddings.model], set: emb });
      }
      labels.push(...result.labels);
      succeeded += 1;
    } catch (err) {
      console.error(`[ai] analyzer "${analyzer.id}" failed for image ${imageId}:`, err);
      const values = {
        imageId,
        analyzer: analyzer.id,
        modelVersion: analyzer.version,
        status: "failed" as const,
        error: String((err as Error).message ?? err).slice(0, 2000),
        completedAt: new Date(),
      };
      await db
        .insert(imageAnalyses)
        .values(values)
        .onConflictDoUpdate({ target: [imageAnalyses.imageId, imageAnalyses.analyzer], set: values });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(images)
      .set({ analysisStatus: succeeded > 0 ? "completed" : "failed" })
      .where(eq(images.id, imageId));
    if (succeeded > 0 && env.AUTO_TAG_ENABLED) {
      const pinRows = await tx.select({ id: pins.id }).from(pins).where(eq(pins.imageId, imageId));
      for (const p of pinRows) await applyLabels(tx, p.id, labels);
    }
  });
}

async function applyLabels(tx: DbOrTx, pinId: number, labels: AnalyzerLabel[]) {
  const accepted = labels.filter((l) => l.confidence >= env.AUTO_TAG_MIN_CONFIDENCE);
  if (accepted.length) await addAiTags(tx, pinId, accepted);
}

/** 이미 분석이 끝난 이미지로 새 핀이 만들어질 때, 기존 분석 라벨을 즉시 자동 태그로 적용 */
export async function applyExistingAnalysis(tx: DbOrTx, imageId: number, pinId: number) {
  if (!env.AUTO_TAG_ENABLED) return;
  const rows = await tx
    .select({ labels: imageAnalyses.labels })
    .from(imageAnalyses)
    .where(and(eq(imageAnalyses.imageId, imageId), eq(imageAnalyses.status, "completed")));
  const labels = rows.flatMap((r) => r.labels ?? []);
  if (labels.length) await applyLabels(tx, pinId, labels);
}

/** 분석 대기/실패 이미지를 다시 큐에 넣습니다 (관리 스크립트용). */
export async function countImagesByAnalysisStatus() {
  const res = await db.execute<{ status: string; count: number }>(
    sql`select analysis_status as status, count(*)::int as count from images group by analysis_status`,
  );
  return res.rows;
}
