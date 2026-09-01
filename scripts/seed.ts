import { db } from "../src/db";
import { users, blogs, categories, articles, tags, articleTags } from "../src/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Check if admin exists
  const [existingAdmin] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  if (existingAdmin) {
    console.log("Admin already exists, skipping.");
    process.exit(0);
  }

  // Create admin
  const adminHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db.insert(users).values({
    username: "admin",
    email: "admin@bloghub.com",
    passwordHash: adminHash,
    displayName: "관리자",
    role: "SUPER_ADMIN",
  }).returning();

  // Create admin blog
  const [adminBlog] = await db.insert(blogs).values({
    userId: admin.id,
    name: "BlogHub 공식 블로그",
    slug: "admin",
    description: "BlogHub 공식 블로그입니다. 플랫폼 소식과 업데이트를 전해드립니다.",
    theme: "basic",
    themeSettings: { primaryColor: "#03c75a", layout: "list", darkMode: false, fontFamily: "default" },
  }).returning();

  // Categories
  const [cat1] = await db.insert(categories).values({ blogId: adminBlog.id, name: "공지사항", slug: "notice", sortOrder: 0 }).returning();
  const [cat2] = await db.insert(categories).values({ blogId: adminBlog.id, name: "업데이트", slug: "updates", sortOrder: 1 }).returning();
  const [cat3] = await db.insert(categories).values({ blogId: adminBlog.id, name: "팁 & 가이드", slug: "tips", sortOrder: 2 }).returning();

  // Tags
  const [tag1] = await db.insert(tags).values({ blogId: adminBlog.id, name: "블로그", slug: "blog" }).returning();
  const [tag2] = await db.insert(tags).values({ blogId: adminBlog.id, name: "가이드", slug: "guide" }).returning();
  const [tag3] = await db.insert(tags).values({ blogId: adminBlog.id, name: "AI", slug: "ai" }).returning();

  // Sample articles
  const sampleArticles = [
    {
      title: "BlogHub에 오신 것을 환영합니다! 🎉",
      slug: "welcome-to-bloghub",
      content: `<h2>BlogHub이란?</h2><p>BlogHub은 프리미엄 멀티 블로그 플랫폼입니다. 회원가입 즉시 자신만의 개인 블로그가 자동 생성됩니다.</p><h2>주요 기능</h2><ul><li><strong>6가지 프리미엄 스킨</strong> - Basic, Minimal, Magazine, Portfolio, Photo, Dark</li><li><strong>AI 글쓰기 어시스턴트</strong> - 주제만 입력하면 AI가 글을 작성해줍니다</li><li><strong>스마트 에디터</strong> - 이미지, 표, 동영상, 인용문 등 다양한 편집 기능</li><li><strong>댓글 & 좋아요</strong> - 방문자와 소통할 수 있는 소셜 기능</li><li><strong>방문자 통계</strong> - 일별 방문자, 인기 글, 구독자 현황</li><li><strong>SEO 최적화</strong> - Open Graph, Sitemap, RSS 자동 생성</li></ul><h2>시작하기</h2><p>지금 바로 <a href="/auth/register">회원가입</a>하고 나만의 블로그를 시작하세요!</p><blockquote>모든 기능은 완전 무료입니다.</blockquote>`,
      excerpt: "BlogHub 프리미엄 멀티 블로그 플랫폼의 모든 기능을 소개합니다.",
      categoryId: cat1.id,
      status: "published" as const,
    },
    {
      title: "AI 글쓰기 기능 사용법 가이드 🤖",
      slug: "ai-writing-guide",
      content: `<h2>AI 글쓰기란?</h2><p>BlogHub의 AI 글쓰기 기능을 사용하면 주제만 입력하면 AI가 자동으로 블로그 글을 작성해줍니다.</p><h2>사용 방법</h2><ol><li><strong>대시보드 → AI 설정</strong>에서 AI Provider와 API 키를 설정합니다</li><li><strong>대시보드 → AI 글쓰기</strong>에서 주제를 입력합니다</li><li>AI가 생성한 결과를 검토하고 에디터에 삽입합니다</li><li>검수 후 발행합니다</li></ol><h2>지원 기능</h2><ul><li>✨ AI 글쓰기 - 전체 블로그 글 자동 생성</li><li>💡 제목 추천 - 매력적인 제목 5개 추천</li><li>📋 요약 - 글의 핵심 요약</li><li>✍️ 문장 개선 - 문장 다듬기</li><li>🏷️ 태그 생성 - 적합한 태그 추천</li><li>🔍 SEO 최적화 - SEO 제목/설명 생성</li></ul><blockquote>AI 생성 결과는 반드시 검수 후 사용하세요.</blockquote>`,
      excerpt: "BlogHub AI 글쓰기 기능을 활용하여 더 쉽게 블로그 글을 작성하는 방법을 알아보세요.",
      categoryId: cat3.id,
      status: "published" as const,
    },
    {
      title: "블로그 스킨 변경하기 🎨",
      slug: "how-to-change-theme",
      content: `<h2>6가지 프리미엄 스킨</h2><p>BlogHub은 6가지 프리미엄 스킨을 제공합니다.</p><h3>🏠 Basic</h3><p>깔끔하고 정돈된 기본 스킨입니다. 모든 유형의 블로그에 적합합니다.</p><h3>✨ Minimal</h3><p>미니멀하고 심플한 디자인으로 콘텐츠에 집중할 수 있습니다.</p><h3>📰 Magazine</h3><p>매거진 스타일의 레이아웃으로 뉴스나 미디어 블로그에 적합합니다.</p><h3>💼 Portfolio</h3><p>포트폴리오 스타일의 그리드 레이아웃입니다.</p><h3>📷 Photo</h3><p>사진 중심의 갤러리 스타일 블로그입니다.</p><h3>🌙 Dark</h3><p>다크 테마로 눈이 편안합니다.</p><h2>변경 방법</h2><p><strong>대시보드 → 블로그 설정</strong>에서 원하는 스킨을 선택하세요.</p>`,
      excerpt: "BlogHub의 6가지 프리미엄 스킨을 소개하고 변경하는 방법을 알아봅니다.",
      categoryId: cat3.id,
      status: "published" as const,
    },
  ];

  for (const art of sampleArticles) {
    const [article] = await db.insert(articles).values({
      blogId: adminBlog.id,
      authorId: admin.id,
      ...art,
      publishedAt: new Date(),
      seoTitle: art.title,
      seoDescription: art.excerpt,
    }).returning();

    // Add tags
    await db.insert(articleTags).values({ articleId: article.id, tagId: tag1.id });
    await db.insert(articleTags).values({ articleId: article.id, tagId: tag2.id });
  }

  // Create demo user
  const demoHash = await bcrypt.hash("demo123", 12);
  const [demo] = await db.insert(users).values({
    username: "demo",
    email: "demo@bloghub.com",
    passwordHash: demoHash,
    displayName: "데모 사용자",
    role: "USER",
  }).returning();

  const [demoBlog] = await db.insert(blogs).values({
    userId: demo.id,
    name: "데모의 일상 블로그",
    slug: "demo",
    description: "일상과 여행, 그리고 맛집 이야기를 나누는 블로그입니다.",
    theme: "minimal",
    themeSettings: { primaryColor: "#7c3aed", layout: "grid", darkMode: false, fontFamily: "default" },
  }).returning();

  await db.insert(categories).values([
    { blogId: demoBlog.id, name: "일상", slug: "daily", sortOrder: 0 },
    { blogId: demoBlog.id, name: "여행", slug: "travel", sortOrder: 1 },
    { blogId: demoBlog.id, name: "맛집", slug: "food", sortOrder: 2 },
  ]);

  console.log("Seed complete!");
  console.log("Admin: admin@bloghub.com / admin123");
  console.log("Demo: demo@bloghub.com / demo123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
