import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { images, pins, users } from "@/db/schema";
import { getDomain } from "@/lib/validators";
import { applyExistingAnalysis } from "@/server/ai/pipeline";
import type { Viewer } from "@/server/auth/types";
import { Errors, pgConstraint, pgErrorCode } from "@/server/http";
import { computeDHash, inspectImage, renderVariants, sha256Hex } from "@/server/images/process";
import { enqueueJob } from "@/server/jobs/queue";
import { getStorage, storageKey } from "@/server/storage";
import type { Visibility } from "@/types";
import { addPinToBoardTx, getOwnedBoard } from "./boards";
import { getCategoryById } from "./categories";
import { findDuplicatePin, findImageBySha, findSimilarPins } from "./images";
import { setPinTags } from "./tags";

export interface UploadFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface CreatePinInput {
  title: string;
  description: string | null;
  sourceUrl: string | null;
  tags: string[];
  categoryId: number | null;
  boardId: number | null;
  visibility: Visibility;
  /** 유사 이미지 경고를 확인하고도 업로드하는 경우 true */
  allowSimilar: boolean;
}

/**
 * 이미지 업로드 → 핀 생성
 *
 *  1. 파일 검증 (크기/매직바이트/MIME·확장자 일치/디코딩/해상도)
 *  2. SHA-256 정확 중복 검사
 *     - 내가 이미 올린 이미지 → 409 DUPLICATE_IMAGE
 *     - 다른 사람의 공개 핀에 있는 이미지 → 409 DUPLICATE_IMAGE (저장 유도)
 *     - 그 외(비공개 핀에만 존재) → 파일 재사용 (저장 공간 중복 없음)
 *  3. dHash 유사 이미지 검사 → 409 SIMILAR_IMAGE (allowSimilar=true 로 재요청 시 통과)
 *  4. 원본/중간/썸네일 생성 후 저장소에 업로드 (콘텐츠 주소 키)
 *  5. 단일 트랜잭션: images + pins + 태그 + 보드 저장 + 카운터 + 분석 작업(enqueue)
 *  6. 트랜잭션 실패 시 업로드한 파일 보상 삭제
 */
export async function createPinFromUpload(
  viewer: Viewer,
  file: UploadFile,
  input: CreatePinInput,
): Promise<{ pinId: number; jobIds: number[]; reusedImage: boolean }> {
  const inspected = await inspectImage(file.buffer, { mimeType: file.mimeType, filename: file.filename });
  const sha = sha256Hex(file.buffer);

  if (input.categoryId && !(await getCategoryById(input.categoryId))) {
    throw Errors.unprocessable("INVALID_CATEGORY", "존재하지 않는 카테고리입니다.");
  }
  const board = input.boardId ? await getOwnedBoard(input.boardId, viewer) : null;

  const existing = await findImageBySha(sha);
  if (existing) {
    const dup = await findDuplicatePin(existing.id, viewer);
    if (dup) {
      throw Errors.conflict(
        "DUPLICATE_IMAGE",
        dup.own
          ? "이미 업로드한 이미지입니다."
          : "이미 등록된 이미지입니다. 새로 올리는 대신 기존 핀을 내 보드에 저장해보세요.",
        { existingPinId: dup.pinId, own: dup.own },
      );
    }
  }

  const storage = getStorage();
  let writtenKeys: string[] = [];
  let newImageValues: typeof images.$inferInsert | null = null;

  if (!existing) {
    const phash = await computeDHash(file.buffer);
    if (!input.allowSimilar) {
      const similar = await findSimilarPins(phash, viewer);
      if (similar.length) {
        throw Errors.conflict("SIMILAR_IMAGE", "이미 등록된 이미지와 매우 유사합니다. 그래도 업로드하시겠습니까?", {
          candidates: similar,
        });
      }
    }
    const rendered = await renderVariants(file.buffer, inspected);
    const keys = {
      original: storageKey("originals", sha, rendered.original.ext),
      medium: storageKey("medium", sha, rendered.medium.ext),
      thumb: storageKey("thumbs", sha, rendered.thumb.ext),
    };
    await Promise.all([
      storage.put(keys.original, rendered.original.data, rendered.original.mime),
      storage.put(keys.medium, rendered.medium.data, rendered.medium.mime),
      storage.put(keys.thumb, rendered.thumb.data, rendered.thumb.mime),
    ]);
    writtenKeys = [keys.original, keys.medium, keys.thumb];
    newImageValues = {
      sha256: sha,
      phash,
      storageDriver: storage.name,
      originalKey: keys.original,
      mediumKey: keys.medium,
      thumbKey: keys.thumb,
      mimeType: rendered.original.mime,
      format: inspected.format,
      width: inspected.width,
      height: inspected.height,
      mediumWidth: rendered.medium.width,
      mediumHeight: rendered.medium.height,
      thumbWidth: rendered.thumb.width,
      thumbHeight: rendered.thumb.height,
      sizeBytes: rendered.original.data.length,
      dominantColor: rendered.dominantColor,
      isAnimated: inspected.isAnimated,
      uploadedBy: viewer.id,
    };
  }

  try {
    return await db.transaction(async (tx) => {
      let imageId: number;
      let createdImage = false;
      if (existing) {
        imageId = existing.id;
      } else {
        const inserted = await tx
          .insert(images)
          .values(newImageValues!)
          .onConflictDoNothing({ target: images.sha256 })
          .returning({ id: images.id });
        if (inserted[0]) {
          imageId = inserted[0].id;
          createdImage = true;
        } else {
          // 동시에 같은 파일이 업로드된 경우: 먼저 저장된 이미지 행을 사용 (파일 키가 같으므로 삭제하면 안 됨)
          const [again] = await tx.select({ id: images.id }).from(images).where(eq(images.sha256, sha));
          imageId = again!.id;
          writtenKeys = [];
        }
      }

      const [pin] = await tx
        .insert(pins)
        .values({
          authorId: viewer.id,
          imageId,
          title: input.title,
          description: input.description,
          sourceUrl: input.sourceUrl,
          sourceDomain: getDomain(input.sourceUrl),
          categoryId: input.categoryId,
          visibility: input.visibility,
        })
        .returning({ id: pins.id });
      const pinId = pin!.id;

      await setPinTags(tx, pinId, input.tags);
      await tx
        .update(users)
        .set({ pinCount: sql`${users.pinCount} + 1` })
        .where(eq(users.id, viewer.id));
      if (board) await addPinToBoardTx(tx, board, pinId, viewer, viewer.id);

      const jobIds: number[] = [];
      if (createdImage) jobIds.push(await enqueueJob(tx, "image.analyze", { imageId }));
      else await applyExistingAnalysis(tx, imageId, pinId);

      return { pinId, jobIds, reusedImage: !createdImage };
    });
  } catch (err) {
    if (writtenKeys.length && !(await findImageBySha(sha))) {
      await Promise.allSettled(writtenKeys.map((k) => storage.delete(k)));
    }
    if (pgErrorCode(err) === "23505" && pgConstraint(err) === "pins_author_image_uq") {
      throw Errors.conflict("DUPLICATE_IMAGE", "이미 업로드한 이미지입니다.", { own: true });
    }
    throw err;
  }
}
