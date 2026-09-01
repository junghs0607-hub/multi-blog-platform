import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, blogs, tags, articleTags, users, categories } from "@/db/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const blogSlug = url.searchParams.get("blog");
  const status = url.searchParams.get("status");
  const categorySlug = url.searchParams.get("category");
  const tagSlug = url.searchParams.get("tag");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  try {
    let conditions: any[] = [];

    if (blogSlug) {
      const [blog] = await db.select().from(blogs).where(eq(blogs.slug, blogSlug)).limit(1);
      if (!blog) return NextResponse.json({ articles: [], total: 0 });
      conditions.push(eq(articles.blogId, blog.id));

      if (categorySlug) {
        const [cat] = await db.select().from(categories)
          .where(and(eq(categories.blogId, blog.id), eq(categories.slug, categorySlug))).limit(1);
        if (cat) conditions.push(eq(articles.categoryId, cat.id));
      }
    }

    if (status) {
      conditions.push(eq(articles.status, status as any));
    } else {
      conditions.push(eq(articles.status, "published"));
    }

    if (search) {
      conditions.push(ilike(articles.title, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        thumbnailUrl: articles.thumbnailUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        likeCount: articles.likeCount,
        commentCount: articles.commentCount,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        authorName: users.displayName,
        authorUsername: users.username,
        authorAvatar: users.avatarUrl,
        categoryName: categories.name,
        categorySlug: categories.slug,
        blogSlug: blogs.slug,
        blogName: blogs.name,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(blogs, eq(articles.blogId, blogs.id))
      .where(where)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(where);

    return NextResponse.json({ articles: rows, total: countResult.count, page, limit });
  } catch (error) {
    console.error("Articles GET error:", error);
    return NextResponse.json({ error: "게시글 목록을 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const { title, content, excerpt, categoryId, tagNames, status: artStatus, thumbnailUrl, seoTitle, seoDescription, scheduledAt } = body;

    if (!title) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });

    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "블로그가 없습니다." }, { status: 400 });

    const slug = createSlug(title) + "-" + Date.now().toString(36);
    const finalStatus = artStatus || "draft";

    const [article] = await db.insert(articles).values({
      blogId: blog.id,
      authorId: user.id,
      title,
      slug,
      content: content || "",
      excerpt: excerpt || "",
      thumbnailUrl: thumbnailUrl || null,
      categoryId: categoryId || null,
      status: finalStatus,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt || "",
      publishedAt: finalStatus === "published" ? new Date() : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    }).returning();

    // Handle tags
    if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const tagSlug = createSlug(tagName);
        let [existingTag] = await db.select().from(tags)
          .where(and(eq(tags.blogId, blog.id), eq(tags.slug, tagSlug))).limit(1);

        if (!existingTag) {
          [existingTag] = await db.insert(tags).values({
            blogId: blog.id,
            name: tagName.trim(),
            slug: tagSlug || tagName.trim().toLowerCase(),
          }).returning();
        }

        await db.insert(articleTags).values({
          articleId: article.id,
          tagId: existingTag.id,
        });
      }
    }

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error("Article POST error:", error);
    return NextResponse.json({ error: "게시글 작성에 실패했습니다." }, { status: 500 });
  }
}
