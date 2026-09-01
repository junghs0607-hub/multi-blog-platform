import { and, asc, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articlePublish,
  articles,
  articleTags,
  categories,
  publishAccounts,
  publishLogs,
  tags,
} from "@/db/schema";
import type { PublishArticle, PublishLogEntry } from "@/publisher/core/PublishResult";

export type Platform = "NAVER" | "TISTORY";
export type PublishStatus =
  | "PENDING"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "SCHEDULED"
  | "CANCELLED";

/**
 * DB-backed job queue. Intentionally simple (status + scheduled_at polling) so
 * it can be swapped for Redis/BullMQ later without touching publishers or UI.
 */

/** Creates or resets one publish job per platform for an article. */
export async function enqueuePublishJobs(params: {
  articleId: number;
  platforms: Platform[];
  scheduledAt: Date | null;
  visibility: "public" | "private";
  accountIdByPlatform: Partial<Record<Platform, number>>;
}) {
  const status: PublishStatus = params.scheduledAt ? "SCHEDULED" : "PENDING";
  const results = [];

  for (const platform of params.platforms) {
    const [row] = await db
      .insert(articlePublish)
      .values({
        articleId: params.articleId,
        platform,
        accountId: params.accountIdByPlatform[platform] ?? null,
        status,
        visibility: params.visibility,
        scheduledAt: params.scheduledAt,
        errorCode: null,
        errorMessage: null,
        lockedAt: null,
      })
      .onConflictDoUpdate({
        target: [articlePublish.articleId, articlePublish.platform],
        set: {
          status,
          accountId: params.accountIdByPlatform[platform] ?? null,
          visibility: params.visibility,
          scheduledAt: params.scheduledAt,
          errorCode: null,
          errorMessage: null,
          lockedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    results.push(row);
  }
  return results;
}

export async function listPublishStates(articleId: number) {
  return db
    .select({
      id: articlePublish.id,
      platform: articlePublish.platform,
      status: articlePublish.status,
      externalUrl: articlePublish.externalUrl,
      scheduledAt: articlePublish.scheduledAt,
      publishedAt: articlePublish.publishedAt,
      errorCode: articlePublish.errorCode,
      errorMessage: articlePublish.errorMessage,
      retryCount: articlePublish.retryCount,
      updatedAt: articlePublish.updatedAt,
      accountId: articlePublish.accountId,
      accountLabel: publishAccounts.label,
    })
    .from(articlePublish)
    .leftJoin(publishAccounts, eq(articlePublish.accountId, publishAccounts.id))
    .where(eq(articlePublish.articleId, articleId))
    .orderBy(asc(articlePublish.platform));
}

/**
 * Atomically claims runnable jobs so multiple worker instances never grab the
 * same row. Stale PUBLISHING rows (crashed worker) are reclaimed after 15 min.
 */
export async function claimDueJobs(limit = 3) {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const now = new Date();

  const candidates = await db
    .select({ id: articlePublish.id })
    .from(articlePublish)
    .where(
      or(
        eq(articlePublish.status, "PENDING"),
        and(eq(articlePublish.status, "SCHEDULED"), lte(articlePublish.scheduledAt, now)),
        and(eq(articlePublish.status, "PUBLISHING"), lte(articlePublish.lockedAt, staleBefore)),
      ),
    )
    .orderBy(asc(articlePublish.scheduledAt), asc(articlePublish.id))
    .limit(limit);

  if (candidates.length === 0) return [];

  const claimed = await db
    .update(articlePublish)
    .set({ status: "PUBLISHING", lockedAt: now, updatedAt: now })
    .where(
      and(
        inArray(
          articlePublish.id,
          candidates.map((row) => row.id),
        ),
        or(
          eq(articlePublish.status, "PENDING"),
          eq(articlePublish.status, "SCHEDULED"),
          and(eq(articlePublish.status, "PUBLISHING"), lte(articlePublish.lockedAt, staleBefore)),
        ),
      ),
    )
    .returning();

  return claimed;
}

export async function markPublished(publishId: number, externalUrl: string | null) {
  await db
    .update(articlePublish)
    .set({
      status: "PUBLISHED",
      externalUrl,
      publishedAt: new Date(),
      errorCode: null,
      errorMessage: null,
      lockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(articlePublish.id, publishId));
}

export async function markFailed(publishId: number, code: string, message: string) {
  await db
    .update(articlePublish)
    .set({
      status: "FAILED",
      errorCode: code,
      errorMessage: message.slice(0, 2000),
      retryCount: sql`${articlePublish.retryCount} + 1`,
      lockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(articlePublish.id, publishId));
}

export async function writeLogs(publishId: number, entries: PublishLogEntry[]) {
  if (entries.length === 0) return;
  await db.insert(publishLogs).values(
    entries.slice(-60).map((entry) => ({
      publishId,
      step: entry.step.slice(0, 60),
      level: entry.level,
      message: entry.message.slice(0, 2000),
    })),
  );
}

export async function getPublishLogs(publishId: number) {
  return db
    .select()
    .from(publishLogs)
    .where(eq(publishLogs.publishId, publishId))
    .orderBy(desc(publishLogs.id))
    .limit(50);
}

/**
 * Builds the platform-neutral payload from existing article tables.
 * Read-only: the source article is never modified.
 */
export async function buildPublishArticle(
  articleId: number,
  visibility: "public" | "private",
  scheduledAt: Date | null,
): Promise<PublishArticle | null> {
  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      excerpt: articles.excerpt,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(articleTags)
    .leftJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId));

  return {
    id: article.id,
    title: article.title,
    contentHtml: article.content || "",
    excerpt: article.excerpt || "",
    tags: tagRows.map((row) => row.name).filter((name): name is string => Boolean(name)),
    category: article.categoryName,
    images: [],
    visibility,
    scheduledAt,
  };
}

/** Resolves the account to use, preferring the one pinned on the job. */
export async function resolveAccount(platform: Platform, accountId: number | null) {
  if (accountId) {
    const [account] = await db
      .select()
      .from(publishAccounts)
      .where(eq(publishAccounts.id, accountId))
      .limit(1);
    if (account) return account;
  }
  const [fallback] = await db
    .select()
    .from(publishAccounts)
    .where(and(eq(publishAccounts.platform, platform), eq(publishAccounts.isActive, true)))
    .orderBy(asc(publishAccounts.id))
    .limit(1);
  return fallback ?? null;
}
