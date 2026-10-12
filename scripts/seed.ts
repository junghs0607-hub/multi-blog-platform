/**
 * 데모 데이터 생성
 *   npm run db:seed          # 빈 DB 에 데모 데이터 생성
 *   npm run db:reset         # 모든 데이터/로컬 이미지 삭제 후 다시 생성
 *
 * 이미지는 절차적으로 생성한 SVG 를 래스터화한 뒤, 실제 서비스와 동일한 업로드 파이프라인
 * (검증 → 해시 → 원본/중간/썸네일 생성 → 저장소 → DB 트랜잭션 → AI 분석 작업)을 그대로 통과합니다.
 */
import "./load-env";
import fs from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { db, pool } from "@/db";
import { pins, users } from "@/db/schema";
import { hashPassword } from "@/server/auth/password";
import type { Viewer } from "@/server/auth/types";
import { env } from "@/server/env";
import { processPendingJobs } from "@/server/jobs/runner";
import { createBoard, savePinToBoard } from "@/server/services/boards";
import { listCategories } from "@/server/services/categories";
import { createComment } from "@/server/services/comments";
import { followUser } from "@/server/services/follows";
import { likePin } from "@/server/services/pins";
import { createReport } from "@/server/services/reports";
import { createPinFromUpload } from "@/server/services/upload";
import { setAvatar } from "@/server/services/users";
import { avatarSvg, mulberry32, pick, renderSvg } from "./lib/art";
import { ADMIN_PASSWORD, BOARDS, COMMENTS, DEMO_PASSWORD, DEMO_USERS, THEMES } from "./lib/seed-data";

const RESET = process.argv.includes("--reset");
const PINS_PER_THEME = 6;

const APP_TABLES = [
  "admin_audit_logs",
  "reports",
  "notifications",
  "follows",
  "comments",
  "pin_likes",
  "board_pins",
  "boards",
  "pin_tags",
  "tags",
  "pins",
  "image_embeddings",
  "image_analyses",
  "images",
  "jobs",
  "sessions",
  "users",
];

async function reset() {
  console.log("🧹 기존 데이터 삭제 중...");
  await db.execute(sql.raw(`truncate table ${APP_TABLES.join(", ")} restart identity cascade`));
  if (env.STORAGE_DRIVER === "local") {
    await fs.rm(path.resolve(env.LOCAL_STORAGE_DIR), { recursive: true, force: true });
  } else {
    console.log("ℹ️  S3 저장소의 기존 파일은 삭제하지 않습니다. 필요하면 버킷을 직접 비워주세요.");
  }
}

async function main() {
  const [{ count }] = (await db.execute<{ count: number }>(sql`select count(*)::int as count from users`)).rows as [
    { count: number },
  ];
  if (count > 0 && !RESET) {
    console.log("⚠️  이미 사용자 데이터가 있습니다. 초기화 후 다시 생성하려면: npm run db:reset");
    return;
  }
  if (RESET) await reset();

  const rand = mulberry32(20261011);
  const categories = await listCategories();
  const catId = (slug: string) => categories.find((c) => c.slug === slug)?.id ?? null;

  /* 1. 사용자 */
  console.log("👤 사용자 생성...");
  const viewers = new Map<string, Viewer>();
  const now = Date.now();
  for (const [i, u] of DEMO_USERS.entries()) {
    const [row] = await db
      .insert(users)
      .values({
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        role: u.role,
        passwordHash: await hashPassword(u.role === "admin" ? ADMIN_PASSWORD : DEMO_PASSWORD),
        createdAt: new Date(now - (60 - i) * 86_400_000),
      })
      .returning();
    const viewer: Viewer = {
      id: row!.id,
      email: row!.email,
      username: row!.username,
      displayName: row!.displayName,
      avatarKey: null,
      role: row!.role,
    };
    if (u.username !== "admin") {
      const png = await sharp(Buffer.from(avatarSvg(i + 7))).png().toBuffer();
      viewer.avatarKey = await setAvatar(viewer, { buffer: png, mimeType: "image/png", filename: "avatar.png" });
    }
    viewers.set(u.username, viewer);
  }

  /* 2. 핀 (실제 업로드 파이프라인 사용) */
  console.log("🖼️  이미지 생성 및 업로드...");
  const plan: { theme: (typeof THEMES)[number]; index: number }[] = [];
  for (const theme of THEMES) for (let i = 0; i < PINS_PER_THEME; i++) plan.push({ theme, index: i });
  // 테마가 섞이도록 셔플
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [plan[i], plan[j]] = [plan[j]!, plan[i]!];
  }

  const pinsByTheme = new Map<string, number[]>();
  const pinAuthor = new Map<number, string>();
  const startTime = now - 30 * 86_400_000;
  for (const [n, { theme, index }] of plan.entries()) {
    const seed = 1000 + n * 17;
    const palette = theme.palettes[index % theme.palettes.length]!;
    const { svg } = renderSvg(theme.theme, seed, palette);
    const asPng = ["pattern", "cat", "leaves", "abstract"].includes(theme.theme);
    const raster = asPng
      ? await sharp(Buffer.from(svg)).png().toBuffer()
      : await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();

    const authorName = theme.authors[(index + n) % theme.authors.length]!;
    const author = viewers.get(authorName)!;
    const tagCount = 3 + Math.floor(rand() * 3);
    const tags = [...theme.tags].sort(() => rand() - 0.5).slice(0, tagCount);
    const { pinId, jobIds } = await createPinFromUpload(
      author,
      { buffer: raster, mimeType: asPng ? "image/png" : "image/jpeg", filename: `${theme.theme}-${index}.${asPng ? "png" : "jpg"}` },
      {
        title: theme.titles[index % theme.titles.length]!,
        description: pick(rand, theme.descriptions),
        sourceUrl: rand() > 0.25 ? `${pick(rand, theme.domains)}/${seed}` : null,
        tags,
        categoryId: catId(theme.category),
        boardId: null,
        visibility: rand() < 0.08 ? "private" : "public",
        allowSimilar: true,
      },
    );
    void jobIds;
    // 피드가 자연스럽도록 생성 시각을 지난 30일에 걸쳐 분산 (id 순서와 동일하게 증가)
    const createdAt = new Date(startTime + Math.round(((n + 1) / plan.length) * 29 * 86_400_000));
    await db.update(pins).set({ createdAt, updatedAt: createdAt }).where(eq(pins.id, pinId));
    pinsByTheme.set(theme.theme, [...(pinsByTheme.get(theme.theme) ?? []), pinId]);
    pinAuthor.set(pinId, authorName);
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  /* 3. 보드 + 저장 */
  console.log("📌 보드 생성 및 핀 저장...");
  const boardIds: number[] = [];
  for (const b of BOARDS) {
    const owner = viewers.get(b.owner)!;
    const board = await createBoard(owner, { name: b.name, description: b.description, visibility: b.visibility });
    boardIds.push(board.id);
    const candidates = b.themes.flatMap((t) => pinsByTheme.get(t) ?? []).sort(() => rand() - 0.5);
    const count = Math.min(candidates.length, 4 + Math.floor(rand() * 6));
    for (const pinId of candidates.slice(0, count)) {
      try {
        await savePinToBoard(board.id, pinId, owner);
      } catch {
        /* 다른 사람의 비공개 핀 등은 저장 불가 → 건너뜀 */
      }
    }
  }

  /* 4. 팔로우 */
  console.log("🤝 팔로우 관계...");
  const names = DEMO_USERS.map((u) => u.username).filter((n) => n !== "admin");
  for (const a of names) {
    for (const b of names) {
      if (a !== b && rand() < 0.6) await followUser(viewers.get(a)!, b);
    }
  }

  /* 5. 좋아요 + 댓글 */
  console.log("❤️  좋아요 / 💬 댓글...");
  const allPins = [...pinAuthor.keys()];
  for (const pinId of allPins) {
    const author = pinAuthor.get(pinId)!;
    for (const name of names) {
      if (name === author) continue;
      if (rand() < 0.35) await likePin(pinId, viewers.get(name)!).catch(() => undefined);
      if (rand() < 0.12) await createComment(pinId, viewers.get(name)!, pick(rand, COMMENTS)).catch(() => undefined);
    }
  }

  /* 6. 신고 (관리자 화면 데모) */
  console.log("🚩 샘플 신고...");
  const jiwooPin = allPins.find((id) => pinAuthor.get(id) === "jiwoo");
  const junhoPin = allPins.find((id) => pinAuthor.get(id) === "junho");
  if (jiwooPin) {
    await createReport(viewers.get("junho")!, { targetType: "pin", targetId: jiwooPin, reason: "copyright", details: "제가 예전에 올린 그림과 너무 비슷합니다." }).catch(() => undefined);
  }
  if (junhoPin) {
    await createReport(viewers.get("minji")!, { targetType: "pin", targetId: junhoPin, reason: "spam", details: "같은 이미지가 반복적으로 올라오는 것 같아요." }).catch(() => undefined);
  }

  /* 7. 이미지 분석 작업 처리 (색상 팔레트 + AI 색상 태그) */
  console.log("🤖 이미지 분석 작업 처리...");
  let processed = 0;
  for (;;) {
    const n = await processPendingJobs(50);
    processed += n;
    if (n === 0) break;
  }
  console.log(`   ${processed}개 작업 완료`);

  console.log("\n✅ 시드 완료!");
  console.log(`   핀 ${allPins.length}개, 보드 ${boardIds.length}개, 사용자 ${DEMO_USERS.length}명`);
  console.log(`   관리자:  admin@mosaic.local / ${ADMIN_PASSWORD}`);
  console.log(`   데모:    minji@mosaic.local (junho, seoyeon, hyunwoo, jiwoo) / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ 시드 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
