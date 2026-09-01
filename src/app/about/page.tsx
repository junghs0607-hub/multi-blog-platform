import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "서비스 소개 - BlogHub",
  description: "BlogHub 프리미엄 멀티 블로그 플랫폼을 소개합니다.",
};

export default async function AboutPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role } : null} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">BlogHub 소개</h1>
          <p className="text-xl text-green-100">프리미엄 멀티 블로그 플랫폼</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-12">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">📝</span> BlogHub이란?
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              BlogHub은 누구나 쉽게 자신만의 프리미엄 블로그를 만들고 운영할 수 있는 멀티 블로그 플랫폼입니다. 
              회원가입 즉시 개인 블로그가 자동 생성되며, 다양한 스킨과 AI 글쓰기 기능을 활용하여 
              전문적인 블로그를 손쉽게 운영할 수 있습니다.
            </p>
            <p className="text-gray-600 leading-relaxed">
              블로거, 크리에이터, 개인 브랜딩을 원하는 모든 분들을 위한 최적의 플랫폼입니다.
            </p>
          </section>

          {/* Features */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-3xl">✨</span> 주요 기능
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: "🎨",
                  title: "6가지 프리미엄 스킨",
                  desc: "Basic, Minimal, Magazine, Portfolio, Photo, Dark 등 다양한 스킨을 제공합니다. 색상, 폰트, 레이아웃을 자유롭게 커스터마이징할 수 있습니다."
                },
                {
                  icon: "🤖",
                  title: "AI 글쓰기 어시스턴트",
                  desc: "주제만 입력하면 AI가 제목, 본문, 태그, SEO 정보를 자동으로 생성합니다. OpenAI, Claude 등 다양한 AI 서비스를 연동할 수 있습니다."
                },
                {
                  icon: "📝",
                  title: "스마트 에디터",
                  desc: "글꼴, 크기, 색상 변경은 물론 이미지, 표, YouTube, 인용문 등 다양한 요소를 삽입할 수 있는 강력한 에디터를 제공합니다."
                },
                {
                  icon: "📊",
                  title: "방문자 통계",
                  desc: "일별 방문자 수, 인기 게시글, 좋아요, 구독자 현황을 한눈에 확인할 수 있는 대시보드를 제공합니다."
                },
                {
                  icon: "💬",
                  title: "소셜 기능",
                  desc: "댓글, 대댓글, 좋아요, 구독 기능을 통해 방문자와 소통할 수 있습니다."
                },
                {
                  icon: "🔍",
                  title: "SEO 최적화",
                  desc: "Open Graph, Sitemap, RSS를 자동 생성하여 검색 엔진 최적화를 지원합니다."
                },
              ].map((feature, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-5">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-3xl">🚀</span> 시작하는 방법
            </h2>
            <div className="space-y-4">
              {[
                { step: 1, title: "회원가입", desc: "이메일과 비밀번호로 간단하게 가입하세요. 가입 즉시 개인 블로그가 생성됩니다." },
                { step: 2, title: "블로그 설정", desc: "블로그 이름, 소개, 스킨을 설정하고 나만의 블로그를 꾸며보세요." },
                { step: 3, title: "글 작성", desc: "스마트 에디터로 글을 작성하거나 AI의 도움을 받아 손쉽게 콘텐츠를 만드세요." },
                { step: 4, title: "발행 & 공유", desc: "글을 발행하고 SNS에 공유하여 더 많은 독자를 만나보세요." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-3xl">💰</span> 요금 안내
            </h2>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="text-center">
                <span className="text-4xl font-bold text-green-600">무료</span>
                <p className="text-gray-600 mt-2">BlogHub의 모든 기능은 무료로 제공됩니다.</p>
                <ul className="mt-4 text-sm text-gray-600 space-y-1">
                  <li>✓ 무제한 게시글 작성</li>
                  <li>✓ 6가지 프리미엄 스킨</li>
                  <li>✓ AI 글쓰기 (자체 API 키 사용)</li>
                  <li>✓ 이미지 업로드 10MB/파일</li>
                  <li>✓ 방문자 통계</li>
                  <li>✓ SEO 최적화</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">📧</span> 문의하기
            </h2>
            <p className="text-gray-600 mb-4">
              서비스 이용 중 궁금한 점이나 제안 사항이 있으시면 언제든지 연락해 주세요.
            </p>
            <p className="text-gray-600">
              이메일: <a href="mailto:support@bloghub.com" className="text-green-600 hover:underline">support@bloghub.com</a>
            </p>
          </section>

          {/* CTA */}
          <section className="text-center pt-8 border-t border-gray-100">
            <h3 className="text-xl font-bold mb-4">지금 바로 블로그를 시작하세요!</h3>
            <Link href="/auth/register" className="inline-block bg-green-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20">
              무료 회원가입 →
            </Link>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/about" className="hover:text-green-600">서비스 소개</Link>
            <Link href="/terms" className="hover:text-green-600">이용약관</Link>
            <Link href="/privacy" className="hover:text-green-600">개인정보처리방침</Link>
          </div>
          <p>© 2024 BlogHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
