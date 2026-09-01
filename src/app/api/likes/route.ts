import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleLikes, articles } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { articleId } = await req.json();
    if (!articleId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const [existing] = await db.select().from(articleLikes)
      .where(and(eq(articleLikes.articleId, articleId), eq(articleLikes.userId, user.id))).limit(1);

    if (existing) {
      await db.delete(articleLikes).where(eq(articleLikes.id, existing.id));
      await db.update(articles).set({ likeCount: sql`GREATEST(${articles.likeCount} - 1, 0)` }).where(eq(articles.id, articleId));
      return NextResponse.json({ liked: false });
    } else {
      await db.insert(articleLikes).values({ articleId, userId: user.id });
      await db.update(articles).set({ likeCount: sql`${articles.likeCount} + 1` }).where(eq(articles.id, articleId));
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const articleId = parseInt(req.nextUrl.searchParams.get("articleId") || "0");
  if (!articleId) return NextResponse.json({ liked: false });

  if (!user) return NextResponse.json({ liked: false });

  const [existing] = await db.select().from(articleLikes)
    .where(and(eq(articleLikes.articleId, articleId), eq(articleLikes.userId, user.id))).limit(1);

  return NextResponse.json({ liked: !!existing });
}
