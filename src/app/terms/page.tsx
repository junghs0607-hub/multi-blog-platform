import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "이용약관 - BlogHub",
  description: "BlogHub 서비스 이용약관입니다.",
};

export default async function TermsPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role } : null} />

      {/* Header */}
      <section className="bg-white border-b border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold">이용약관</h1>
          <p className="text-gray-500 mt-2">최종 수정일: 2024년 1월 1일</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="prose prose-gray max-w-none space-y-8">

            <section>
              <h2 className="text-xl font-bold mb-4">제1조 (목적)</h2>
              <p className="text-gray-600 leading-relaxed">
                이 약관은 BlogHub(이하 "회사")가 제공하는 블로그 서비스(이하 "서비스")의 이용 조건 및 절차, 
                회사와 이용자의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제2조 (정의)</h2>
              <p className="text-gray-600 leading-relaxed mb-3">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li><strong>"서비스"</strong>란 회사가 제공하는 블로그 플랫폼 및 관련 제반 서비스를 의미합니다.</li>
                <li><strong>"이용자"</strong>란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li><strong>"회원"</strong>이란 서비스에 가입하여 아이디를 부여받은 자로서 계속적으로 서비스를 이용할 수 있는 자를 말합니다.</li>
                <li><strong>"블로그"</strong>란 회원이 서비스 내에서 생성하고 운영하는 개인 블로그를 의미합니다.</li>
                <li><strong>"게시물"</strong>이란 회원이 서비스를 이용하면서 게시한 글, 사진, 동영상, 파일, 링크 등을 말합니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제3조 (약관의 효력 및 변경)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
                <li>약관이 변경되는 경우 회사는 변경사항을 시행일 7일 전부터 서비스 내 공지사항에 공지합니다.</li>
                <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제4조 (서비스의 제공 및 변경)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 다음과 같은 서비스를 제공합니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>개인 블로그 생성 및 운영 서비스</li>
                    <li>게시물 작성, 편집, 삭제 기능</li>
                    <li>AI 글쓰기 보조 기능</li>
                    <li>이미지 및 미디어 업로드 기능</li>
                    <li>댓글, 좋아요, 구독 등 소셜 기능</li>
                    <li>방문자 통계 서비스</li>
                  </ul>
                </li>
                <li>회사는 서비스의 품질 향상을 위해 서비스의 내용을 변경할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제5조 (회원가입)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>이용자는 회사가 정한 가입 양식에 따라 회원 정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거부할 수 있습니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>타인의 명의를 사용하여 신청한 경우</li>
                    <li>허위의 정보를 기재한 경우</li>
                    <li>사회의 안녕, 질서 또는 미풍양속을 해할 목적으로 신청한 경우</li>
                    <li>기타 회사가 정한 가입 요건을 충족하지 못한 경우</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제6조 (회원의 의무)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회원은 서비스 이용과 관련하여 다음 행위를 하여서는 안 됩니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>타인의 정보 도용</li>
                    <li>회사가 게시한 정보의 변경</li>
                    <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 전송 또는 게시</li>
                    <li>회사 및 제3자의 저작권 등 지적재산권 침해</li>
                    <li>회사 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                    <li>음란, 폭력적인 메시지, 기타 공서양속에 반하는 정보 공개 또는 게시</li>
                    <li>해킹, 악성코드 유포 등 서비스의 정상적 운영을 방해하는 행위</li>
                  </ul>
                </li>
                <li>회원은 관계 법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제7조 (게시물의 관리)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회원이 서비스에 게시한 게시물의 저작권은 해당 회원에게 귀속됩니다.</li>
                <li>회사는 게시물이 다음 각 호에 해당하는 경우 사전 통지 없이 삭제하거나 이동 또는 등록을 거부할 수 있습니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>다른 회원 또는 제3자를 비방하거나 명예를 손상시키는 내용</li>
                    <li>공공질서 및 미풍양속에 위반되는 내용</li>
                    <li>범죄적 행위에 결부된다고 인정되는 내용</li>
                    <li>회사 또는 제3자의 저작권 등 기타 권리를 침해하는 내용</li>
                    <li>기타 관계 법령에 위반된다고 판단되는 내용</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제8조 (AI 서비스 이용)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회원은 AI 글쓰기 기능을 이용하기 위해 자신의 AI API 키를 등록할 수 있습니다.</li>
                <li>AI가 생성한 콘텐츠에 대한 최종 책임은 해당 콘텐츠를 게시한 회원에게 있습니다.</li>
                <li>회원은 AI 생성 콘텐츠를 반드시 검토한 후 게시하여야 합니다.</li>
                <li>회사는 AI 서비스의 정확성, 완전성을 보장하지 않습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제9조 (서비스 이용의 제한 및 중지)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할 수 있습니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                    <li>전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지했을 경우</li>
                    <li>기타 불가항력적 사유가 있는 경우</li>
                  </ul>
                </li>
                <li>회사는 회원이 이 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우 서비스 이용을 제한할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제10조 (회원 탈퇴 및 자격 상실)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회원은 언제든지 회사에 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.</li>
                <li>회원 탈퇴 시 해당 회원의 블로그 및 게시물은 삭제됩니다.</li>
                <li>회사는 회원이 다음 각 호의 사유에 해당하는 경우 회원 자격을 제한 또는 정지시킬 수 있습니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>가입 신청 시 허위 내용을 등록한 경우</li>
                    <li>다른 사람의 서비스 이용을 방해하거나 정보를 도용하는 경우</li>
                    <li>서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 하는 경우</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제11조 (면책 조항)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.</li>
                <li>회사는 회원이 게시 또는 전송한 자료의 신뢰도, 정확성 등에 대해서는 책임을 지지 않습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제12조 (분쟁 해결)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 회사의 본사 소재지를 관할하는 법원을 전속 관할로 합니다.</li>
                <li>회사와 회원 간에 제기된 소송에는 대한민국 법을 적용합니다.</li>
              </ol>
            </section>

            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-2">부칙</h2>
              <p className="text-gray-600">이 약관은 2024년 1월 1일부터 시행됩니다.</p>
            </section>

          </div>
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
