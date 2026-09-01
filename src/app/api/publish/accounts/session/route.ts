import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/db";
import { publishAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

/**
 * Runs the publisher CLI in a child process so Playwright never executes inside
 * the Next.js server runtime. Long browser work stays fully isolated.
 */
function runWorkerCommand(args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), path.join(process.cwd(), "scripts", "publisher-worker.ts"), ...args],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(error) });
    });
  });
}

function parseResult(stdout: string): { ok: boolean; message: string; canWrite?: boolean } | null {
  const line = stdout
    .split("\n")
    .reverse()
    .find((entry) => entry.trim().startsWith("__RESULT__"));
  if (!line) return null;
  try {
    return JSON.parse(line.replace("__RESULT__", "").trim());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { accountId, action } = await req.json();
    const id = Number(accountId);
    if (!id) return NextResponse.json({ error: "계정을 선택하세요." }, { status: 400 });

    const [account] = await db.select().from(publishAccounts).where(eq(publishAccounts.id, id)).limit(1);
    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const isLogin = action === "login";
    const command = isLogin ? "login" : "test-session";
    const timeout = isLogin ? 200_000 : 90_000;

    const { stdout, stderr } = await runWorkerCommand([command, String(id)], timeout);
    const parsed = parseResult(stdout);

    const ok = parsed?.ok ?? false;
    const message =
      parsed?.message ||
      (stderr.trim() ? stderr.trim().split("\n").slice(-2).join(" ") : "세션 확인 결과를 읽지 못했습니다.");

    await db
      .update(publishAccounts)
      .set({
        sessionStatus: ok ? (parsed?.canWrite ? "READY" : "LOGGED_IN") : "LOGIN_REQUIRED",
        sessionMessage: message.slice(0, 1000),
        sessionCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(publishAccounts.id, id));

    return NextResponse.json({ success: ok, message, canWrite: parsed?.canWrite ?? false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "세션 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
