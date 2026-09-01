import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "개인정보처리방침 - BlogHub",
  description: "BlogHub 개인정보처리방침입니다.",
};

export default async function PrivacyPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role } : null} />

      {/* Header */}
      <section className="bg-white border-b border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold">개인정보처리방침</h1>
          <p className="text-gray-500 mt-2">최종 수정일: 2024년 1월 1일</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="prose prose-gray max-w-none space-y-8">

            <section>
              <p className="text-gray-600 leading-relaxed">
                BlogHub(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 
                관련 법령을 준수하고 있습니다. 회사는 개인정보처리방침을 통하여 이용자의 개인정보가 어떠한 목적과 방식으로 이용되고 있으며, 
                개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제1조 (수집하는 개인정보 항목)</h2>
              <p className="text-gray-600 leading-relaxed mb-3">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
              
              <div className="bg-gray-50 rounded-xl p-5 mb-4">
                <h3 className="font-bold mb-2">1. 필수 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>이메일 주소</li>
                  <li>비밀번호 (암호화 저장)</li>
                  <li>사용자명 (블로그 주소)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 mb-4">
                <h3 className="font-bold mb-2">2. 선택 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>표시 이름</li>
                  <li>프로필 이미지</li>
                  <li>자기소개</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-bold mb-2">3. 자동 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>접속 IP 주소</li>
                  <li>접속 일시</li>
                  <li>브라우저 정보</li>
                  <li>서비스 이용 기록</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제2조 (개인정보의 수집 및 이용 목적)</h2>
              <p className="text-gray-600 leading-relaxed mb-3">회사는 수집한 개인정보를 다음의 목적을 위해 이용합니다.</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>회원 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인식별, 불량회원의 부정 이용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리</li>
                <li><strong>서비스 제공:</strong> 블로그 서비스 제공, 콘텐츠 제공, 맞춤 서비스 제공</li>
                <li><strong>서비스 개선:</strong> 신규 서비스 개발 및 맞춤 서비스 제공, 통계학적 특성에 따른 서비스 제공, 서비스의 유효성 확인</li>
                <li><strong>안전한 서비스 환경 조성:</strong> 보안, 프라이버시, 안전 측면에서 이용자가 안심하고 이용할 수 있는 서비스 환경 구축</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제3조 (개인정보의 보유 및 이용 기간)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 이용자의 개인정보를 원칙적으로 회원 탈퇴 시까지 보유합니다.</li>
                <li>단, 다음의 정보에 대해서는 명시한 기간 동안 보존합니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>서비스 이용 관련 개인정보: 회원 탈퇴 후 30일</li>
                    <li>관련 법령에 의한 정보 보유: 해당 법령에서 정한 기간</li>
                  </ul>
                </li>
                <li>관련 법령에 의한 보존 기간:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                    <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제4조 (개인정보의 제3자 제공)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</li>
                <li>다만, 다음의 경우에는 예외로 합니다:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>이용자가 사전에 동의한 경우</li>
                    <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제5조 (개인정보 처리의 위탁)</h2>
              <p className="text-gray-600 leading-relaxed">
                회사는 현재 개인정보 처리를 위탁하고 있지 않습니다. 
                향후 위탁이 필요한 경우 위탁 대상자와 위탁 업무 내용을 개인정보처리방침에 공개하겠습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제6조 (이용자 및 법정대리인의 권리와 행사 방법)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있습니다.</li>
                <li>이용자는 언제든지 개인정보 처리의 동의를 철회할 수 있습니다.</li>
                <li>이용자는 개인정보의 오류에 대한 정정을 요청할 수 있습니다.</li>
                <li>이용자는 개인정보의 삭제를 요청할 수 있습니다.</li>
                <li>위 권리 행사는 대시보드의 프로필 설정에서 직접 처리하거나, 이메일을 통해 요청할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제7조 (개인정보의 파기 절차 및 방법)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</li>
                <li>파기 절차:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</li>
                  </ul>
                </li>
                <li>파기 방법:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
                    <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제8조 (개인정보의 안전성 확보 조치)</h2>
              <p className="text-gray-600 leading-relaxed mb-3">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>개인정보의 암호화:</strong> 비밀번호는 암호화되어 저장 및 관리되고 있습니다.</li>
                <li><strong>해킹 등에 대비한 기술적 대책:</strong> 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적으로 갱신·점검합니다.</li>
                <li><strong>개인정보에 대한 접근 제한:</strong> 개인정보를 처리하는 데이터베이스시스템에 대한 접근 권한의 부여, 변경, 말소를 통하여 개인정보에 대한 접근을 통제합니다.</li>
                <li><strong>접속기록의 보관:</strong> 개인정보처리시스템에 접속한 기록을 최소 1년 이상 보관합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제9조 (쿠키의 사용)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 '쿠키(cookie)'를 사용합니다.</li>
                <li>쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며, 이용자의 컴퓨터에 저장됩니다.</li>
                <li>이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.</li>
                <li>쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제10조 (AI 서비스 관련 개인정보)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>회원이 AI 글쓰기 기능을 이용하기 위해 등록한 API 키는 암호화되어 안전하게 저장됩니다.</li>
                <li>AI 서비스 이용 기록(프롬프트, 응답)은 서비스 개선 목적으로 저장될 수 있습니다.</li>
                <li>회원은 언제든지 자신의 AI 설정 및 이용 기록을 삭제할 수 있습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제11조 (개인정보 보호책임자)</h2>
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-gray-600 mb-3">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                <ul className="space-y-1 text-gray-600">
                  <li><strong>개인정보 보호책임자</strong></li>
                  <li>직책: 서비스 운영팀</li>
                  <li>이메일: privacy@bloghub.com</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제12조 (권익침해 구제방법)</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                이용자는 개인정보 침해로 인한 피해를 구제받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
                <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
                <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
                <li>경찰청 사이버안전국: (국번없이) 182 (cyberbureau.police.go.kr)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">제13조 (개인정보처리방침의 변경)</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지합니다.</li>
                <li>이 개인정보처리방침은 2024년 1월 1일부터 적용됩니다.</li>
              </ol>
            </section>

            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-2">부칙</h2>
              <p className="text-gray-600">이 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.</p>
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
