import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogs, users, categories, blogSubscriptions, articles } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [blog] = await db
      .select({
        id: blogs.id,
        name: blogs.name,
        slug: blogs.slug,
        description: blogs.description,
        profileImage: blogs.profileImage,
        coverImage: blogs.coverImage,
        theme: blogs.theme,
        themeSettings: blogs.themeSettings,
        userId: blogs.userId,
        createdAt: blogs.createdAt,
        ownerName: users.displayName,
        ownerUsername: users.username,
        ownerAvatar: users.avatarUrl,
        ownerBio: users.bio,
      })
      .from(blogs)
      .leftJoin(users, eq(blogs.userId, users.id))
      .where(eq(blogs.slug, slug))
      .limit(1);

    if (!blog) {
      return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });
    }

    const cats = await db.select().from(categories).where(eq(categories.blogId, blog.id)).orderBy(categories.sortOrder);

    const [subCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(blogSubscriptions).where(eq(blogSubscriptions.blogId, blog.id));

    const [artCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(articles).where(and(eq(articles.blogId, blog.id), eq(articles.status, "published")));

    return NextResponse.json({
      blog: {
        ...blog,
        categories: cats,
        subscriberCount: subCount.count,
        articleCount: artCount.count,
      },
    });
  } catch (error) {
    console.error("Blog GET error:", error);
    return NextResponse.json({ error: "블로그를 불러올 수 없습니다." }, { status: 500 });
  }
}
