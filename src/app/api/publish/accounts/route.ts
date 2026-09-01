import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { publishAccounts } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const PLATFORMS = ["NAVER", "TISTORY"] as const;
type Platform = (typeof PLATFORMS)[number];

function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rows = await db
    .select({
      id: publishAccounts.id,
      platform: publishAccounts.platform,
      label: publishAccounts.label,
      loginId: publishAccounts.loginId,
      profileDir: publishAccounts.profileDir,
      blogAddress: publishAccounts.blogAddress,
      defaultCategory: publishAccounts.defaultCategory,
      sessionStatus: publishAccounts.sessionStatus,
      sessionMessage: publishAccounts.sessionMessage,
      sessionCheckedAt: publishAccounts.sessionCheckedAt,
      isActive: publishAccounts.isActive,
    })
    .from(publishAccounts)
    .where(eq(publishAccounts.userId, user.id))
    .orderBy(asc(publishAccounts.platform), asc(publishAccounts.id));

  // No credential material is ever returned — only profile metadata.
  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const platform = body.platform as Platform;
    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "지원하지 않는 플랫폼입니다." }, { status: 400 });
    }

    const label = String(body.label || "").trim() || `${platform} 계정`;
    const blogAddress = String(body.blogAddress || "").trim() || null;
    const loginId = String(body.loginId || "").trim() || null;

    const base = sanitizeSlug(`${platform}-${blogAddress || loginId || label}`) || `${platform.toLowerCase()}-account`;
    const profileDir = `${base}-${Date.now().toString(36)}`;

    const [created] = await db
      .insert(publishAccounts)
      .values({
        userId: user.id,
        platform,
        label,
        loginId,
        blogAddress,
        defaultCategory: String(body.defaultCategory || "").trim() || null,
        profileDir,
        sessionStatus: "UNKNOWN",
      })
      .returning();

    return NextResponse.json({ success: true, account: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "계정 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const [existing] = await db.select().from(publishAccounts).where(eq(publishAccounts.id, id)).limit(1);
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.label !== undefined) patch.label = String(body.label).trim();
    if (body.loginId !== undefined) patch.loginId = String(body.loginId).trim() || null;
    if (body.blogAddress !== undefined) patch.blogAddress = String(body.blogAddress).trim() || null;
    if (body.defaultCategory !== undefined) patch.defaultCategory = String(body.defaultCategory).trim() || null;
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

    const [updated] = await db.update(publishAccounts).set(patch).where(eq(publishAccounts.id, id)).returning();
    return NextResponse.json({ success: true, account: updated });
  } catch {
    return NextResponse.json({ error: "계정 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const id = Number(req.nextUrl.searchParams.get("id") || 0);
  if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const [existing] = await db.select().from(publishAccounts).where(eq(publishAccounts.id, id)).limit(1);
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await db.delete(publishAccounts).where(eq(publishAccounts.id, id));
  return NextResponse.json({ success: true });
}
