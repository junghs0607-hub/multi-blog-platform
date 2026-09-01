import { db } from "@/db";
import { blogs, articles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap() {
  const entries: any[] = [
    { url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}`, lastModified: new Date() },
  ];

  try {
    const allBlogs = await db.select({ slug: blogs.slug }).from(blogs);
    for (const b of allBlogs) {
      entries.push({
        url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/blog/${b.slug}`,
        lastModified: new Date(),
      });
    }

    const allArticles = await db
      .select({ slug: articles.slug, blogId: articles.blogId, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.status, "published"));

    const blogMap = new Map<number, string>();
    for (const b of allBlogs) {
      const [full] = await db.select({ id: blogs.id, slug: blogs.slug }).from(blogs).where(eq(blogs.slug, b.slug));
      if (full) blogMap.set(full.id, full.slug);
    }

    for (const a of allArticles) {
      const blogSlug = blogMap.get(a.blogId);
      if (blogSlug) {
        entries.push({
          url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/blog/${blogSlug}/post/${a.slug}`,
          lastModified: a.updatedAt,
        });
      }
    }
  } catch {}

  return entries;
}
