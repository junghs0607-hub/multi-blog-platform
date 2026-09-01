import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, blogs } from "@/db/schema";
import { eq, desc, sql, ilike } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const rows = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    return NextResponse.json({ users: rows, total: countResult.count });
  } catch (error) {
    return NextResponse.json({ error: "사용자 목록을 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const { userId, role, isActive } = await req.json();
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.update(users).set(updateData).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}
