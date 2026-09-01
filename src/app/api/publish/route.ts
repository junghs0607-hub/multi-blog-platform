import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/db";
import { articles, publishAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enqueuePublishJobs, listPublishStates, type Platform } from "@/lib/publish-service";

const PLATFORMS: Platform[] = ["NAVER", "TISTORY"];

/** Fire-and-forget worker tick. Failure here never affects the API response. */
function triggerWorkerTick() {
  try {
    const child = spawn(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        path.join(process.cwd(), "scripts", "publisher-worker.ts"),
        "tick",
      ],
      { cwd: process.cwd(), env: { ...process.env }, detached: true, stdio: "ignore" },
    );
    child.unref();
  } catch {
    // The standing worker loop will pick the job up on its next poll.
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const articleId = Number(req.nextUrl.searchParams.get("articleId") || 0);
  if (!articleId) return NextResponse.json({ states: [] });

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) return NextResponse.json({ states: [] });
  if (article.authorId !== user.id && user.role === "USER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ states: await listPublishStates(articleId) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const articleId = Number(body.articleId);
    const platforms: Platform[] = Array.isArray(body.platforms)
      ? body.platforms.filter((platform: string): platform is Platform => PLATFORMS.includes(platform as Platform))
      : [];

    if (!articleId || platforms.length === 0) {
      return NextResponse.json({ error: "게시글과 플랫폼을 선택하세요." }, { status: 400 });
    }

    const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!article) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    if (article.authorId !== user.id && user.role === "USER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "예약 시간이 올바르지 않습니다." }, { status: 400 });
    }
    const visibility: "public" | "private" = body.visibility === "private" ? "private" : "public";

    // Bind each job to an active account for that platform.
    const accountIdByPlatform: Partial<Record<Platform, number>> = {};
    const missing: Platform[] = [];
    for (const platform of platforms) {
      const [account] = await db
        .select()
        .from(publishAccounts)
        .where(
          and(
            eq(publishAccounts.userId, user.id),
            eq(publishAccounts.platform, platform),
            eq(publishAccounts.isActive, true),
          ),
        )
        .limit(1);
      if (account) accountIdByPlatform[platform] = account.id;
      else missing.push(platform);
    }

    if (missing.length === platforms.length) {
      return NextResponse.json(
        { error: `연결된 계정이 없습니다: ${missing.join(", ")}. 관리자 > 외부 블로그 계정에서 먼저 등록하세요.` },
        { status: 400 },
      );
    }

    const jobs = await enqueuePublishJobs({
      articleId,
      platforms,
      scheduledAt,
      visibility,
      accountIdByPlatform,
    });

    if (!scheduledAt) triggerWorkerTick();

    return NextResponse.json({
      success: true,
      jobs,
      warning: missing.length ? `계정 미등록 플랫폼: ${missing.join(", ")}` : null,
      states: await listPublishStates(articleId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "발행 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
