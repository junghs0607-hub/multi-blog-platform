import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogSubscriptions, blogs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { blogId } = await req.json();
    if (!blogId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const [existing] = await db.select().from(blogSubscriptions)
      .where(and(eq(blogSubscriptions.blogId, blogId), eq(blogSubscriptions.userId, user.id))).limit(1);

    if (existing) {
      await db.delete(blogSubscriptions).where(eq(blogSubscriptions.id, existing.id));
      return NextResponse.json({ subscribed: false });
    } else {
      await db.insert(blogSubscriptions).values({ blogId, userId: user.id });
      return NextResponse.json({ subscribed: true });
    }
  } catch (error) {
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const blogId = parseInt(req.nextUrl.searchParams.get("blogId") || "0");
  if (!blogId || !user) return NextResponse.json({ subscribed: false, count: 0 });

  const [existing] = await db.select().from(blogSubscriptions)
    .where(and(eq(blogSubscriptions.blogId, blogId), eq(blogSubscriptions.userId, user.id))).limit(1);

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(blogSubscriptions).where(eq(blogSubscriptions.blogId, blogId));

  return NextResponse.json({ subscribed: !!existing, count: countResult.count });
}
