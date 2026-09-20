import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews, articles, blogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "No blog found" }, { status: 404 });

    const logs = await db
      .select({
        id: pageViews.id,
        ip: pageViews.ip,
        userAgent: pageViews.userAgent,
        referer: pageViews.referer,
        createdAt: pageViews.createdAt,
        articleTitle: articles.title,
      })
      .from(pageViews)
      .leftJoin(articles, eq(pageViews.articleId, articles.id))
      .where(eq(pageViews.blogId, blog.id))
      .orderBy(desc(pageViews.createdAt))
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load visitors" }, { status: 500 });
  }
}
