/**
 * Publisher Worker — standalone process.
 *
 *   npm run publisher:worker          # standing loop (polls every 15s)
 *   npm run publisher:tick            # single pass, used by the API trigger
 *   npx tsx scripts/publisher-worker.ts test-session <accountId>
 *   npx tsx scripts/publisher-worker.ts login <accountId>
 *
 * Playwright only ever runs here, never inside the Next.js server.
 */
import { loadEnvConfig } from "@next/env";
const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { publishAccounts } from "../src/db/schema";
import { withAccountLock } from "../src/publisher/core/BrowserSession";
import { cleanupTempDir, resolveArticleImages } from "../src/publisher/core/ImageUploader";
import { createPublisher } from "../src/publisher";
import type { PublishAccountConfig } from "../src/publisher/core/PublishResult";
import {
  buildPublishArticle,
  claimDueJobs,
  markFailed,
  markPublished,
  resolveAccount,
  writeLogs,
} from "../src/lib/publish-service";

const SITE_ORIGIN = process.env.PUBLISHER_SITE_ORIGIN || "http://127.0.0.1:3000";
const POLL_INTERVAL = Number(process.env.PUBLISHER_POLL_MS || 15_000);

function log(message: string) {
  console.log(`[publisher] ${new Date().toISOString()} ${message}`);
}

function toAccountConfig(row: typeof publishAccounts.$inferSelect): PublishAccountConfig {
  return {
    id: row.id,
    platform: row.platform,
    label: row.label,
    loginId: row.loginId,
    profileDir: row.profileDir,
    blogAddress: row.blogAddress,
    defaultCategory: row.defaultCategory,
  };
}

/** Runs a single claimed job end-to-end. Never throws to the caller. */
async function runJob(job: {
  id: number;
  articleId: number;
  platform: "NAVER" | "TISTORY";
  accountId: number | null;
  visibility: string | null;
  scheduledAt: Date | null;
}) {
  const accountRow = await resolveAccount(job.platform, job.accountId);
  if (!accountRow) {
    await markFailed(job.id, "LOGIN_REQUIRED", `${job.platform} 계정이 등록되어 있지 않습니다.`);
    log(`job#${job.id} ${job.platform} 실패: 계정 없음`);
    return;
  }

  const visibility = job.visibility === "private" ? "private" : "public";
  const article = await buildPublishArticle(job.articleId, visibility, job.scheduledAt);
  if (!article) {
    await markFailed(job.id, "PUBLISH_FAILED", "게시글을 찾을 수 없습니다.");
    return;
  }

  // Prepare real image files for the platform's native uploader.
  const { images, tempDir, warnings } = await resolveArticleImages(article.contentHtml, {
    siteOrigin: SITE_ORIGIN,
  });
  article.images = images;

  const accountKey = `${accountRow.platform}:${accountRow.id}`;
  try {
    // Per-account lock: only one Playwright session per external account.
    const result = await withAccountLock(accountKey, async () => {
      const publisher = createPublisher(toAccountConfig(accountRow));
      return publisher.publish(article);
    });

    const extraLogs = warnings.map((message) => ({
      step: "image-prepare",
      level: "warn" as const,
      message,
    }));
    await writeLogs(job.id, [...extraLogs, ...result.logs]);

    if (result.ok) {
      await markPublished(job.id, result.externalUrl);
      log(`job#${job.id} ${job.platform} 발행 완료 → ${result.externalUrl ?? "(URL 미확인)"}`);
    } else {
      await markFailed(job.id, result.code, result.message);
      log(`job#${job.id} ${job.platform} 실패 [${result.code}] ${result.message}`);
    }
  } catch (error) {
    // A crash in one platform must not affect the other jobs.
    const message = error instanceof Error ? error.message : String(error);
    await markFailed(job.id, "UNKNOWN_ERROR", message);
    log(`job#${job.id} ${job.platform} 예외: ${message}`);
  } finally {
    await cleanupTempDir(tempDir);
  }
}

async function tick(): Promise<number> {
  const jobs = await claimDueJobs(Number(process.env.PUBLISHER_BATCH || 3));
  if (jobs.length === 0) return 0;

  log(`${jobs.length}건의 발행 작업을 시작합니다.`);
  // Different platforms run in parallel; same-account work serializes on the lock.
  await Promise.allSettled(
    jobs.map((job) =>
      runJob({
        id: job.id,
        articleId: job.articleId,
        platform: job.platform,
        accountId: job.accountId,
        visibility: job.visibility,
        scheduledAt: job.scheduledAt,
      }),
    ),
  );
  return jobs.length;
}

async function testSession(accountId: number) {
  const [row] = await db.select().from(publishAccounts).where(eq(publishAccounts.id, accountId)).limit(1);
  if (!row) {
    console.log(`__RESULT__ ${JSON.stringify({ ok: false, message: "계정을 찾을 수 없습니다." })}`);
    return;
  }
  const publisher = createPublisher(toAccountConfig(row));
  const result = await publisher.testSession();
  console.log(`__RESULT__ ${JSON.stringify(result)}`);
}

async function interactiveLogin(accountId: number) {
  const [row] = await db.select().from(publishAccounts).where(eq(publishAccounts.id, accountId)).limit(1);
  if (!row) {
    console.log(`__RESULT__ ${JSON.stringify({ ok: false, message: "계정을 찾을 수 없습니다." })}`);
    return;
  }
  // Login always needs a visible window for captcha / 2FA.
  process.env.PUBLISHER_HEADLESS = "false";
  const publisher = createPublisher(toAccountConfig(row)) as {
    interactiveLogin?: (waitMs?: number) => Promise<{ ok: boolean; message: string }>;
    testSession: () => Promise<{ ok: boolean; message: string }>;
  };
  const result = publisher.interactiveLogin
    ? await publisher.interactiveLogin(Number(process.env.PUBLISHER_LOGIN_WAIT_MS || 150_000))
    : await publisher.testSession();
  console.log(`__RESULT__ ${JSON.stringify(result)}`);
}

async function main() {
  const [command, argument] = process.argv.slice(2);

  switch (command) {
    case "tick":
      await tick();
      break;
    case "test-session":
      await testSession(Number(argument));
      break;
    case "login":
      await interactiveLogin(Number(argument));
      break;
    case "loop":
    default: {
      log(`Publisher Worker 시작 (폴링 ${POLL_INTERVAL}ms)`);
      let running = true;
      const stop = () => {
        running = false;
        log("종료 신호를 받았습니다. 진행 중 작업 완료 후 종료합니다.");
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);

      while (running) {
        try {
          await tick();
        } catch (error) {
          log(`tick 오류: ${error instanceof Error ? error.message : String(error)}`);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
      break;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[publisher] fatal:", error);
    process.exit(1);
  });
