import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
  return NextResponse.json({ blog });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const { name, description, theme, themeSettings, profileImage, coverImage } = body;

    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "블로그가 없습니다." }, { status: 400 });

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (theme !== undefined) updateData.theme = theme;
    if (themeSettings !== undefined) updateData.themeSettings = themeSettings;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (coverImage !== undefined) updateData.coverImage = coverImage;

    const [updated] = await db.update(blogs).set(updateData).where(eq(blogs.id, blog.id)).returning();
    return NextResponse.json({ success: true, blog: updated });
  } catch (error) {
    return NextResponse.json({ error: "설정 변경에 실패했습니다." }, { status: 500 });
  }
}
