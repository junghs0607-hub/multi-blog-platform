import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, blogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const blogSlug = req.nextUrl.searchParams.get("blog");
  const blogId = req.nextUrl.searchParams.get("blogId");

  try {
    if (blogId) {
      const rows = await db.select().from(categories).where(eq(categories.blogId, parseInt(blogId))).orderBy(categories.sortOrder);
      return NextResponse.json({ categories: rows });
    }
    if (blogSlug) {
      const [blog] = await db.select().from(blogs).where(eq(blogs.slug, blogSlug)).limit(1);
      if (!blog) return NextResponse.json({ categories: [] });
      const rows = await db.select().from(categories).where(eq(categories.blogId, blog.id)).orderBy(categories.sortOrder);
      return NextResponse.json({ categories: rows });
    }
    return NextResponse.json({ categories: [] });
  } catch (error) {
    return NextResponse.json({ error: "카테고리를 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "카테고리명을 입력하세요." }, { status: 400 });

    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "블로그가 없습니다." }, { status: 400 });

    const slug = createSlug(name) || name.trim().toLowerCase();
    const [category] = await db.insert(categories).values({
      blogId: blog.id, name: name.trim(), slug,
    }).returning();

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const catId = parseInt(req.nextUrl.searchParams.get("id") || "0");
  if (!catId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  try {
    await db.delete(categories).where(eq(categories.id, catId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
