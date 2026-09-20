import { db } from "@/db";
import { blogs, users, articles, categories, blogSubscriptions, pageViews } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { BlogHeader } from "@/components/BlogHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  try {
    const [blog] = await db.select({ name: blogs.name, description: blogs.description, themeSettings: blogs.themeSettings })
      .from(blogs).where(eq(blogs.slug, username)).limit(1);
    if (!blog) return { title: "블로그를 찾을 수 없습니다" };
    
    const ts = (blog.themeSettings as any) || {};
    
    return {
      title: blog.name + " - BlogHub",
      description: blog.description || "",
      openGraph: { title: blog.name, description: blog.description || "" },
      verification: ts.googleSiteVerification ? { google: ts.googleSiteVerification } : undefined,
    };
  } catch {
    return { title: "BlogHub" };
  }
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;

  // 1. Find blog
  const blogRows = await db
    .select({
      id: blogs.id,
      name: blogs.name,
      slug: blogs.slug,
      description: blogs.description,
      profileImage: blogs.profileImage,
      coverImage: blogs.coverImage,
      theme: blogs.theme,
      themeSettings: blogs.themeSettings,
      userId: blogs.userId,
      ownerName: users.displayName,
      ownerUsername: users.username,
      ownerAvatar: users.avatarUrl,
      ownerBio: users.bio,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.userId, users.id))
    .where(eq(blogs.slug, username))
    .limit(1);

  if (blogRows.length === 0) notFound();
  const blog = blogRows[0];

  // 2. Get categories
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.blogId, blog.id))
    .orderBy(categories.sortOrder);

  // 3. Build query for articles
  let categoryFilter: number | null = null;
  if (sp.category) {
    const catRows = await db
      .select()
      .from(categories)
      .where(and(eq(categories.blogId, blog.id), eq(categories.slug, sp.category)))
      .limit(1);
    if (catRows.length > 0) {
      categoryFilter = catRows[0].id;
    }
  }

  const page = parseInt(sp.page || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  // 4. Fetch articles
  const whereCondition = categoryFilter
    ? and(eq(articles.blogId, blog.id), eq(articles.status, "published"), eq(articles.categoryId, categoryFilter))
    : and(eq(articles.blogId, blog.id), eq(articles.status, "published"));

  const postList = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      thumbnailUrl: articles.thumbnailUrl,
      viewCount: articles.viewCount,
      likeCount: articles.likeCount,
      commentCount: articles.commentCount,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      categoryId: articles.categoryId,
    })
    .from(articles)
    .where(whereCondition)
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset);

  // 5. Map category names
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const postsWithCategory = postList.map((p) => ({
    ...p,
    categoryName: p.categoryId ? catMap.get(p.categoryId)?.name || null : null,
    categorySlug: p.categoryId ? catMap.get(p.categoryId)?.slug || null : null,
  }));

  // 6. Count
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(articles)
    .where(whereCondition);
  const totalCount = countRows[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // 7. Subscriber count
  const subRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blogSubscriptions)
    .where(eq(blogSubscriptions.blogId, blog.id));
  const subscriberCount = subRows[0]?.count || 0;

  // 8. Current user
  const currentUser = await getCurrentUser();

  // 9. Record page view (IP & User-Agent)
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "";
    const referer = headersList.get("referer") || "";

    await db.insert(pageViews).values({
      blogId: blog.id,
      ip,
      userAgent,
      referer,
    });
  } catch (error) {
    // Ignore error if recording fails
  }

  const ts = (blog.themeSettings || {}) as any;
  const isDark = blog.theme === "dark" || ts.darkMode;
  const primaryColor = ts.primaryColor || "#03c75a";

  return (
    <div 
      className={`min-h-screen ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}
      style={ts.backgroundImage ? { backgroundImage: `url(${ts.backgroundImage})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' } : {}}
    >
      <BlogHeader blog={blog} subscriberCount={subscriberCount} currentUser={currentUser} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-5 border ${isDark ? "border-gray-700" : "border-gray-100"} shadow-sm`}>
              <h3 className="font-bold mb-3 text-sm">카테고리</h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/blog/${username}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      !sp.category
                        ? "bg-green-50 text-green-700 font-medium"
                        : isDark
                        ? "text-gray-300 hover:bg-gray-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    전체 ({totalCount})
                  </Link>
                </li>
                {cats.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/blog/${username}?category=${c.slug}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        sp.category === c.slug
                          ? "bg-green-50 text-green-700 font-medium"
                          : isDark
                          ? "text-gray-300 hover:bg-gray-700"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {postsWithCategory.length === 0 ? (
              <div
                className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-12 text-center border ${
                  isDark ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <span className="text-5xl block mb-4">📝</span>
                <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-400"}`}>게시글이 없습니다</p>
                {currentUser && currentUser.username === username && (
                  <Link
                    href="/dashboard/write"
                    className="mt-4 inline-block text-green-600 font-medium hover:underline"
                  >
                    첫 번째 글을 작성하세요 →
                  </Link>
                )}
              </div>
            ) : ts.layout === "grid" ? (
              /* Grid layout */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {postsWithCategory.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${username}/post/${post.slug}`}
                    className={`group block ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border hover:-translate-y-1`}
                  >
                    <div className="aspect-video overflow-hidden">
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-gray-100 to-gray-50"}`}
                        >
                          <span className="text-5xl opacity-20">📝</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {post.categoryName && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: primaryColor + "15", color: primaryColor }}
                        >
                          {post.categoryName}
                        </span>
                      )}
                      <h2 className="font-bold text-lg mt-2 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className={`text-sm line-clamp-2 mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString("ko-KR")
                            : new Date(post.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                        <span>👁 {post.viewCount || 0}</span>
                        <span>❤️ {post.likeCount || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* List layout */
              <div className="space-y-4">
                {postsWithCategory.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${username}/post/${post.slug}`}
                    className={`group block ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border hover:-translate-y-0.5`}
                  >
                    <div className="flex">
                      {/* Thumbnail */}
                      <div className="w-40 sm:w-52 flex-shrink-0 overflow-hidden">
                        {post.thumbnailUrl ? (
                          <img
                            src={post.thumbnailUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ minHeight: "140px" }}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-gray-100 to-gray-50"}`}
                            style={{ minHeight: "140px" }}
                          >
                            <span className="text-4xl opacity-20">📝</span>
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-5 flex-1 min-w-0 flex flex-col justify-center">
                        {post.categoryName && (
                          <span
                            className="self-start text-xs font-medium px-2 py-0.5 rounded-full mb-1"
                            style={{ backgroundColor: primaryColor + "15", color: primaryColor }}
                          >
                            {post.categoryName}
                          </span>
                        )}
                        <h2 className="font-bold text-lg mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className={`text-sm line-clamp-2 mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto">
                          <span>
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString("ko-KR")
                              : new Date(post.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                          <span>👁 {post.viewCount || 0}</span>
                          <span>❤️ {post.likeCount || 0}</span>
                          <span>💬 {post.commentCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/blog/${username}?page=${p}${sp.category ? `&category=${sp.category}` : ""}`}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      p === page
                        ? "text-white"
                        : `${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white hover:bg-gray-100 border border-gray-200"}`
                    }`}
                    style={p === page ? { backgroundColor: primaryColor } : {}}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
