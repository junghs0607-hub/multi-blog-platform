import { db } from "@/db";
import { articles, blogs, users, categories, tags, articleTags, pageViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ArticleInteractions } from "@/components/ArticleInteractions";
import { CommentSection } from "@/components/CommentSection";
import { ArticleContent } from "@/components/ArticleContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const [blog] = await db.select().from(blogs).where(eq(blogs.slug, username)).limit(1);
  if (!blog) return {};

  const [article] = await db.select({
    title: articles.title,
    excerpt: articles.excerpt,
    seoTitle: articles.seoTitle,
    seoDescription: articles.seoDescription,
    thumbnailUrl: articles.thumbnailUrl,
  }).from(articles).where(and(eq(articles.blogId, blog.id), eq(articles.slug, slug))).limit(1);

  if (!article) return {};

  return {
    title: (article.seoTitle || article.title) + ` - ${username}`,
    description: article.seoDescription || article.excerpt || "",
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || "",
      images: article.thumbnailUrl ? [article.thumbnailUrl] : [],
      type: "article",
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;

  const [blog] = await db.select({
    id: blogs.id, name: blogs.name, slug: blogs.slug, theme: blogs.theme, themeSettings: blogs.themeSettings,
    ownerName: users.displayName, ownerAvatar: users.avatarUrl,
  })
    .from(blogs).leftJoin(users, eq(blogs.userId, users.id))
    .where(eq(blogs.slug, username)).limit(1);

  if (!blog) notFound();

  const [article] = await db
    .select({
      id: articles.id, title: articles.title, slug: articles.slug, content: articles.content,
      excerpt: articles.excerpt, thumbnailUrl: articles.thumbnailUrl, status: articles.status,
      viewCount: articles.viewCount, likeCount: articles.likeCount, commentCount: articles.commentCount,
      publishedAt: articles.publishedAt, createdAt: articles.createdAt,
      authorId: articles.authorId, categoryId: articles.categoryId,
      seoTitle: articles.seoTitle, seoDescription: articles.seoDescription,
      categoryName: categories.name, categorySlug: categories.slug,
      authorName: users.displayName, authorAvatar: users.avatarUrl,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(and(eq(articles.blogId, blog.id), eq(articles.slug, slug)))
    .limit(1);

  if (!article || (article.status !== "published")) notFound();

  // Update view count
  await db.update(articles).set({ viewCount: (article.viewCount || 0) + 1 }).where(eq(articles.id, article.id));

  // Get tags
  const tagList = await db
    .select({ name: tags.name, slug: tags.slug })
    .from(articleTags)
    .leftJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, article.id));

  const currentUser = await getCurrentUser();
  const ts = (blog.themeSettings || {}) as any;
  const isDark = blog.theme === "dark" || ts.darkMode;
  const primaryColor = ts.primaryColor || "#03c75a";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50"}`}>
      {/* Nav */}
      <nav className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b sticky top-0 z-50`}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/blog/${username}`} className="font-bold" style={{ color: primaryColor }}>
            ← {blog.name}
          </Link>
          <Link href="/" className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>BlogHub</Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 md:p-10 shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} mb-6`}>
          {article.categoryName && (
            <Link href={`/blog/${username}?category=${article.categorySlug}`}
              className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: primaryColor + "15", color: primaryColor }}>
              {article.categoryName}
            </Link>
          )}

          <h1 className="text-2xl md:text-4xl font-bold mt-4 mb-6 leading-tight">{article.title}</h1>

          <div className={`flex items-center gap-4 pb-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: primaryColor + "20" }}>
              {article.authorAvatar ? (
                <img src={article.authorAvatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: primaryColor }}>
                  {(article.authorName?.[0] || "?").toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{article.authorName}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : ""}
                {" · "}조회 {(article.viewCount || 0) + 1}
              </p>
            </div>
          </div>

          {/* Thumbnail */}
          {article.thumbnailUrl && (
            <div className="my-6 rounded-xl overflow-hidden">
              <img src={article.thumbnailUrl} alt={article.title} className="w-full object-cover max-h-[500px]" />
            </div>
          )}

          {/* Content */}
          <div className="mt-6">
            <ArticleContent content={article.content || ""} isDark={isDark} />
          </div>

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
              {tagList.map((t, i) => (
                <Link key={i} href={`/blog/${username}?tag=${t.slug}`}
                  className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors">
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Interactions */}
        <ArticleInteractions articleId={article.id} likeCount={article.likeCount || 0} currentUser={currentUser ? { id: currentUser.id, username: currentUser.username } : null} />

        {/* Comments */}
        <CommentSection articleId={article.id} currentUser={currentUser ? { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl } : null} isDark={isDark} />
      </article>
    </div>
  );
}
