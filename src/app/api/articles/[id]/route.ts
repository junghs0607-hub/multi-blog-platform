import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, blogs, users, categories, tags, articleTags, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createSlug } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [article] = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        excerpt: articles.excerpt,
        thumbnailUrl: articles.thumbnailUrl,
        status: articles.status,
        viewCount: articles.viewCount,
        likeCount: articles.likeCount,
        commentCount: articles.commentCount,
        seoTitle: articles.seoTitle,
        seoDescription: articles.seoDescription,
        publishedAt: articles.publishedAt,
        scheduledAt: articles.scheduledAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        categoryId: articles.categoryId,
        authorId: articles.authorId,
        blogId: articles.blogId,
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
      .where(eq(articles.id, parseInt(id)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    // Get tags
    const articleTagRows = await db
      .select({ name: tags.name, slug: tags.slug })
      .from(articleTags)
      .leftJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id));

    // Increment view
    await db.update(articles).set({ viewCount: (article.viewCount || 0) + 1 }).where(eq(articles.id, article.id));

    // Record page view
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await db.insert(pageViews).values({
      blogId: article.blogId,
      articleId: article.id,
      ip,
      userAgent: req.headers.get("user-agent") || "",
      referer: req.headers.get("referer") || "",
    });

    return NextResponse.json({ article: { ...article, tags: articleTagRows } });
  } catch (error) {
    console.error("Article GET error:", error);
    return NextResponse.json({ error: "게시글을 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const articleId = parseInt(id);
    const [existing] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!existing) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    if (existing.authorId !== user.id && user.role === "USER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, excerpt, categoryId, tagNames, status: artStatus, thumbnailUrl, seoTitle, seoDescription, scheduledAt } = body;

    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (artStatus !== undefined) {
      updateData.status = artStatus;
      if (artStatus === "published" && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const [updated] = await db.update(articles).set(updateData).where(eq(articles.id, articleId)).returning();

    // Update tags
    if (tagNames && Array.isArray(tagNames)) {
      await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
      const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
      if (blog) {
        for (const tagName of tagNames) {
          const tagSlug = createSlug(tagName);
          let [existingTag] = await db.select().from(tags)
            .where(and(eq(tags.blogId, blog.id), eq(tags.slug, tagSlug))).limit(1);
          if (!existingTag) {
            [existingTag] = await db.insert(tags).values({
              blogId: blog.id, name: tagName.trim(), slug: tagSlug || tagName.trim().toLowerCase(),
            }).returning();
          }
          await db.insert(articleTags).values({ articleId, tagId: existingTag.id });
        }
      }
    }

    return NextResponse.json({ success: true, article: updated });
  } catch (error) {
    console.error("Article PUT error:", error);
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const articleId = parseInt(id);
    const [existing] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!existing) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    if (existing.authorId !== user.id && user.role === "USER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await db.delete(articles).where(eq(articles.id, articleId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Article DELETE error:", error);
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
