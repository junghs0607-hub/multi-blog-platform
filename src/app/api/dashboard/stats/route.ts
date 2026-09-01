import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, blogs, comments, pageViews, blogSubscriptions, articleLikes } from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "블로그가 없습니다." }, { status: 400 });

    // Total articles
    const [articleCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(articles).where(eq(articles.blogId, blog.id));

    // Published articles
    const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(articles).where(and(eq(articles.blogId, blog.id), eq(articles.status, "published")));

    // Total views
    const [viewCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(pageViews).where(eq(pageViews.blogId, blog.id));

    // Today views
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayViews] = await db.select({ count: sql<number>`count(*)::int` })
      .from(pageViews).where(and(eq(pageViews.blogId, blog.id), gte(pageViews.createdAt, today)));

    // Total comments
    const [commentCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .where(eq(articles.blogId, blog.id));

    // Subscribers
    const [subCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(blogSubscriptions).where(eq(blogSubscriptions.blogId, blog.id));

    // Total likes
    const [likeCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(articleLikes)
      .leftJoin(articles, eq(articleLikes.articleId, articles.id))
      .where(eq(articles.blogId, blog.id));

    // Recent 7 days views
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyViews = await db.select({
      date: sql<string>`TO_CHAR(${pageViews.createdAt}, 'MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
      .from(pageViews)
      .where(and(eq(pageViews.blogId, blog.id), gte(pageViews.createdAt, sevenDaysAgo)))
      .groupBy(sql`TO_CHAR(${pageViews.createdAt}, 'MM-DD')`)
      .orderBy(sql`TO_CHAR(${pageViews.createdAt}, 'MM-DD')`);

    // Popular articles
    const popularArticles = await db.select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      viewCount: articles.viewCount,
      likeCount: articles.likeCount,
    })
      .from(articles)
      .where(and(eq(articles.blogId, blog.id), eq(articles.status, "published")))
      .orderBy(desc(articles.viewCount))
      .limit(5);

    return NextResponse.json({
      stats: {
        totalArticles: articleCount.count,
        publishedArticles: publishedCount.count,
        totalViews: viewCount.count,
        todayViews: todayViews.count,
        totalComments: commentCount.count,
        subscribers: subCount.count,
        totalLikes: likeCount.count,
        dailyViews,
        popularArticles,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "통계를 불러올 수 없습니다." }, { status: 500 });
  }
}
