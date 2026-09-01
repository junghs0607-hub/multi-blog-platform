import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogs, articles, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [blog] = await db.select().from(blogs).where(eq(blogs.slug, slug)).limit(1);
    if (!blog) return new NextResponse("Blog not found", { status: 404 });

    const posts = await db.select({
      title: articles.title, slug: articles.slug, excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
    })
      .from(articles)
      .where(and(eq(articles.blogId, blog.id), eq(articles.status, "published")))
      .orderBy(desc(articles.publishedAt))
      .limit(20);

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(blog.name)}</title>
    <link>${baseUrl}/blog/${slug}</link>
    <description>${escapeXml(blog.description || "")}</description>
    ${posts.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${baseUrl}/blog/${slug}/post/${p.slug}</link>
      <description>${escapeXml(p.excerpt || "")}</description>
      <pubDate>${p.publishedAt ? new Date(p.publishedAt).toUTCString() : ""}</pubDate>
    </item>`).join("")}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
