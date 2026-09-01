import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const { displayName, bio, avatarUrl, currentPassword, newPassword } = body;

    const updateData: any = { updatedAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: "현재 비밀번호를 입력하세요." }, { status: 400 });
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
      updateData.passwordHash = await hashPassword(newPassword);
    }

    await db.update(users).set(updateData).where(eq(users.id, user.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "프로필 수정에 실패했습니다." }, { status: 500 });
  }
}
