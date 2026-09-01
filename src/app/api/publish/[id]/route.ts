import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/db";
import { articlePublish, articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getPublishLogs } from "@/lib/publish-service";
import { isRetryable } from "@/publisher/core/PublishResult";

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
    // Standing worker will pick it up.
  }
}

async function authorize(publishId: number, user: { id: number; role: string }) {
  const [row] = await db
    .select({ publish: articlePublish, authorId: articles.authorId })
    .from(articlePublish)
    .leftJoin(articles, eq(articlePublish.articleId, articles.id))
    .where(eq(articlePublish.id, publishId))
    .limit(1);

  if (!row) return { error: "발행 기록을 찾을 수 없습니다.", status: 404 as const };
  if (row.authorId !== user.id && user.role === "USER") {
    return { error: "권한이 없습니다.", status: 403 as const };
  }
  return { row };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const publishId = Number(id);
  const auth = await authorize(publishId, user);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({ state: auth.row.publish, logs: await getPublishLogs(publishId) });
}

/** Retry a failed job, or reschedule an existing one. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const publishId = Number(id);
  const auth = await authorize(publishId, user);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const state = auth.row.publish;
  if (state.status === "PUBLISHING") {
    return NextResponse.json({ error: "이미 발행이 진행 중입니다." }, { status: 409 });
  }
  if (state.status === "FAILED" && !isRetryable(state.errorCode)) {
    // Login/session issues need operator action first, but we still allow a
    // retry after they refresh the session, so this is a soft warning only.
    if (state.errorCode === "LOGIN_REQUIRED" || state.errorCode === "SESSION_EXPIRED") {
      const [reset] = await db
        .update(articlePublish)
        .set({ status: "PENDING", errorCode: null, errorMessage: null, lockedAt: null, updatedAt: new Date() })
        .where(eq(articlePublish.id, publishId))
        .returning();
      triggerWorkerTick();
      return NextResponse.json({
        success: true,
        state: reset,
        warning: "로그인 세션 오류였습니다. 세션이 갱신되지 않았다면 다시 실패할 수 있습니다.",
      });
    }
  }

  const [updated] = await db
    .update(articlePublish)
    .set({ status: "PENDING", errorCode: null, errorMessage: null, lockedAt: null, updatedAt: new Date() })
    .where(eq(articlePublish.id, publishId))
    .returning();

  triggerWorkerTick();
  return NextResponse.json({ success: true, state: updated });
}

/** Cancel a pending or scheduled job. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const publishId = Number(id);
  const auth = await authorize(publishId, user);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [updated] = await db
    .update(articlePublish)
    .set({ status: "CANCELLED", lockedAt: null, updatedAt: new Date() })
    .where(eq(articlePublish.id, publishId))
    .returning();

  return NextResponse.json({ success: true, state: updated });
}
