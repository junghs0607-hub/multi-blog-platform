import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments, users, articles } from "@/db/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const articleId = parseInt(req.nextUrl.searchParams.get("articleId") || "0");
  if (!articleId) return NextResponse.json({ comments: [] });

  try {
    const rows = await db
      .select({
        id: comments.id,
        content: comments.content,
        parentId: comments.parentId,
        isDeleted: comments.isDeleted,
        createdAt: comments.createdAt,
        authorId: comments.authorId,
        authorName: users.displayName,
        authorUsername: users.username,
        authorAvatar: users.avatarUrl,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.articleId, articleId))
      .orderBy(comments.createdAt);

    return NextResponse.json({ comments: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "댓글을 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { articleId, content, parentId } = await req.json();
    if (!articleId || !content?.trim()) {
      return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 });
    }

    const [comment] = await db.insert(comments).values({
      articleId,
      authorId: user.id,
      content: content.trim(),
      parentId: parentId || null,
    }).returning();

    await db.update(articles).set({
      commentCount: sql`${articles.commentCount} + 1`,
    }).where(eq(articles.id, articleId));

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "댓글 작성에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const commentId = parseInt(req.nextUrl.searchParams.get("id") || "0");
  if (!commentId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  try {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!comment) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    if (comment.authorId !== user.id && user.role === "USER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await db.update(comments).set({ isDeleted: true, content: "삭제된 댓글입니다." }).where(eq(comments.id, commentId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
