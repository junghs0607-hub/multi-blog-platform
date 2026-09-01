import { db } from "@/db";
import { articles, users, blogs, categories } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  let recentArticles: any[] = [];
  try {
    const rows = await db
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
        authorId: articles.authorId,
        blogId: articles.blogId,
        categoryId: articles.categoryId,
      })
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.createdAt))
      .limit(12);

    // Enrich with user/blog/category info
    for (const row of rows) {
      const [author] = await db.select({ displayName: users.displayName, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, row.authorId)).limit(1);
      const [blog] = await db.select({ slug: blogs.slug, name: blogs.name }).from(blogs).where(eq(blogs.id, row.blogId)).limit(1);
      let categoryName: string | null = null;
      if (row.categoryId) {
        const [cat] = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, row.categoryId)).limit(1);
        if (cat) categoryName = cat.name;
      }
      recentArticles.push({
        ...row,
        authorName: author?.displayName || null,
        authorUsername: author?.username || null,
        authorAvatar: author?.avatarUrl || null,
        blogSlug: blog?.slug || null,
        blogName: blog?.name || null,
        categoryName,
      });
    }
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="min-h-screen">
      <NavBar user={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role } : null} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              나만의 블로그를<br />
              <span className="text-yellow-300">지금 바로 시작하세요</span>
            </h1>
            <p className="text-lg md:text-xl mb-10 text-green-100 max-w-2xl mx-auto">
              BlogHub에서 프리미엄 개인 블로그를 무료로 만들고, AI 글쓰기로 더 쉽게, 더 멋지게 콘텐츠를 발행하세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!user ? (
                <>
                  <Link href="/auth/register" className="bg-white text-green-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
                    무료로 시작하기 →
                  </Link>
                  <Link href="/auth/login" className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
                    로그인
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="bg-white text-green-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-green-50 transition-all shadow-xl">
                    대시보드 가기 →
                  </Link>
                  <Link href={`/blog/${user.username}`} className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
                    내 블로그 보기
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">왜 BlogHub인가요?</h2>
        <p className="text-gray-500 text-center mb-14 text-lg">블로그 운영에 필요한 모든 것을 한 곳에서</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🎨", title: "6가지 프리미엄 스킨", desc: "Basic, Minimal, Magazine, Portfolio, Photo, Dark 스킨을 자유롭게 변경하세요." },
            { icon: "🤖", title: "AI 글쓰기 어시스턴트", desc: "주제만 입력하면 AI가 제목, 본문, SEO, 태그를 자동 생성합니다." },
            { icon: "📊", title: "방문자 통계", desc: "일별 방문자, 인기 글, 좋아요, 구독자를 한눈에 확인하세요." },
            { icon: "📝", title: "스마트 에디터", desc: "이미지, 표, 영상, 인용문 등 다양한 편집 기능을 지원합니다." },
            { icon: "💬", title: "소셜 기능", desc: "댓글, 대댓글, 좋아요, 구독, 알림 기능을 제공합니다." },
            { icon: "🔍", title: "SEO 최적화", desc: "Open Graph, Schema, Sitemap, RSS를 자동으로 생성합니다." },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold mb-10">최신 게시글</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((art) => (
              <Link key={art.id} href={`/blog/${art.blogSlug}/post/${art.slug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:-translate-y-1">
                {art.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img src={art.thumbnailUrl} alt={art.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center">
                    <span className="text-4xl opacity-30">📝</span>
                  </div>
                )}
                <div className="p-5">
                  {art.categoryName && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{art.categoryName}</span>
                  )}
                  <h3 className="font-bold text-lg mt-2 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">{art.title}</h3>
                  {art.excerpt && <p className="text-gray-500 text-sm line-clamp-2 mb-3">{art.excerpt}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">
                        {art.authorAvatar ? <img src={art.authorAvatar} className="w-6 h-6 rounded-full" /> : art.authorName?.[0] || "?"}
                      </div>
                      <span>{art.authorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>👁 {art.viewCount || 0}</span>
                      <span>♥ {art.likeCount || 0}</span>
                      <span>💬 {art.commentCount || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {!user && (
        <section className="bg-gray-900 text-white py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">지금 바로 블로그를 시작하세요</h2>
            <p className="text-gray-400 text-lg mb-10">회원가입 즉시 개인 블로그가 자동 생성됩니다. 5초면 충분합니다.</p>
            <Link href="/auth/register" className="inline-block bg-green-500 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-green-400 transition-all shadow-xl">
              무료 회원가입 →
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="font-bold text-gray-600 text-lg mb-2">📝 BlogHub</p>
          <p>프리미엄 멀티 블로그 플랫폼</p>
          <div className="flex justify-center gap-6 mt-6 mb-4">
            <Link href="/about" className="hover:text-green-600 transition-colors">서비스 소개</Link>
            <Link href="/terms" className="hover:text-green-600 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-green-600 transition-colors">개인정보처리방침</Link>
          </div>
          <p className="mt-4">© 2024 BlogHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
