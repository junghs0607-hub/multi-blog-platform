# 📊 DOMINO X - 웹 기반 올인원 통합 자산관리 플랫폼

주식 투자관리 앱 「도미노(Domino)」 스타일의 **웹 기반 통합 자산관리 서비스**입니다.  
국내주식, 해외주식, ETF, 커버드콜, 가상자산, 부동산, 채권, 펀드, 현금, 외화, 금/원자재를 하나의 대시보드와 포트폴리오에서 통합 관리하고 실시간 현금흐름과 배당 스노우볼을 시뮬레이션할 수 있습니다.

---

## 🛠️ 개발 환경 및 셋팅 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
* **Node.js**: v18.17.0 이상 (v20+ 권장)
* **패키지 매니저**: `npm`, `pnpm`, 또는 `yarn`

---

### 2. 설치 및 로컬 실행 (Installation)

```bash
# 1. 저장소 클론 (특정 브랜치 클론 시)
git clone -b arena/01a0f522-multi-blog-platform https://github.com/junghs0607-hub/multi-blog-platform.git domino-asset-manager
cd domino-asset-manager

# 2. 의존성 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 확인
# http://localhost:3000 접속
```

---

### 3. 프로덕션 빌드 및 배포 실행 (Production Build)

```bash
# 1. 프로덕션 빌드
npm run build

# 2. 프로덕션 서버 실행
npm start
```

---

### 4. 새로운 GitHub 저장소로 이전하는 방법 (New Repository Setup)

새로운 본인 계정의 저장소(예: `domino-asset-manager`)로 코드를 업로드하려면 아래 명령어를 실행하세요:

```bash
# 1. 새 저장소 URL로 원격지(remote) 변경
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_NEW_REPO_NAME.git

# 2. 기본 브랜치를 main으로 설정
git branch -M main

# 3. 새 저장소로 푸시
git push -u origin main --force
```

---

### 5. Vercel 원클릭 클라우드 배포 (Vercel Deployment)

1. [Vercel](https://vercel.com/)에 로그인하고 **Add New Project**를 선택합니다.
2. 생성한 GitHub 저장소를 연결합니다.
3. **Framework Preset**으로 `Next.js`를 선택하고 **Deploy** 버튼을 클릭하면 1분 안에 배포가 완료됩니다.

---

## ✨ 핵심 기능 안내

### 1. 전체 자산 대시보드 (`/`)
* **통합 순자산 (Net Worth)**: 총자산 - 부채(주담대/임대보증금) = 실질 순자산 실시간 계산
* **프라이버시 모드**: 헤더의 눈 아이콘 클릭 시 모든 금액 `•••••• 원` 마스킹
* **다각도 자산배분 차트**: 자산군별, 국가별, 통화별, 위험도별, 배당/성장형 비중 인터랙티브 도넛 차트
* **순자산 성장 추이 타임라인**: 1W, 1M, 3M, 6M, 1Y, ALL 기간별 순자산 vs 투자원금 비교 곡선

### 2. 11개 자산군 세부 관리 (`/assets/...`)
* **국내주식 (`/assets/kr-stock`)**: KOSPI/KOSDAQ 실시간 시세, PER/PBR/EPS/ROE, 52주 고저, 분기 배당금
* **해외주식 (`/assets/us-stock`)**: USD/KRW 원화 및 달러 동시 표기, 환율 영향 및 환차익 분해
* **ETF & 커버드콜 (`/assets/etf`)**: JEPI, JEPQ, TSLY 등 고배당 커버드콜 별도 태깅, 월분배금 일정
* **가상자산 (`/assets/crypto`)**: BTC, ETH, SOL, XRP 24시간 시세, **실시간 김치 프리미엄 계산기**, 거래소별 자산 및 거래소 간 이동 기록, PoS 스테이킹 보상 관리
* **부동산 (`/assets/real-estate`)**: 아파트, 오피스텔, 빌라, 상가 실거래가, 주택담보대출, 임대보증금 및 월세 순현금흐름 계산, 실질 순자산(Equity)
* **펀드 / 채권 (`/assets/funds-bonds`)**: 국채 10년, 회사채 확정 이자 스케줄, TDF 펀드
* **현금 / 외화 (`/assets/cash-fx`)**: 원화, 달러, 엔화, 유로 환율 및 환차익 관리
* **금 / 원자재 (`/assets/gold-commodities`)**: KRX 금현물(1g), 은, WTI 원유 선물

### 3. 배당 및 분배금 허브 (`/dividends`)
* 연간 및 월평균 예상 배당금 자동 집계
* 1월 ~ 12월 인터랙티브 월별 배당 캘린더 (입금 예정 종목 및 금액)
* 배당 재투자 복리 스노우볼 시뮬레이터 (10년 후 미래 자산 및 월 배당금 예측)

### 4. 통합 거래내역 원장 (`/transactions`)
* 매수, 매도, 배당금, ETF 분배금, 채권 이자, 부동산 월세, 거래소 자산이동, 환전 다중 필터 지원

### 5. 포트폴리오 분석 & 리밸런싱 계산기 (`/portfolio`)
* 목표 비중 슬라이더 조절 시 **자산군별 정확한 매수/매도 필요 금액(원화)** 자동 산출

### 6. 종목 비교 분석실 (`/compare`)
* 2~4개 종목 100% 기준 정규화 수익률 비교 차트 및 재무 지표 맞비교

### 7. 성과 분석 & 현금흐름 & FIRE 플래너 (`/analytics`, `/cashflow`)
* TWR(시간가중수익률), MWR(금액가중수익률), 월별 수익률 히트맵 그리드
* FIRE 조기은퇴 게이지 및 경제적 자유 달성도 측정

### 8. 세금 관리 & 절세 계산기 (`/taxes`)
* 해외주식 양도소득세 (250만 공제 + 22%) 및 손실확정 절세 매매 시뮬레이션
* 금융소득종합과세 2,000만원 모니터링 경고 게이지
* 연금저축/IRP 세액공제 환급 계산기 (최대 900만원 한도)

### 9. AI 포트폴리오 어드바이저 (`/ai-advisor`)
* 포트폴리오 건전성 스코어 (0-100점), 실시간 대화형 AI 금융 챗봇

### 10. 관심종목, 캘린더, 다중 계좌, 관리자 & 데이터 I/O
* 실시간 스파크라인 시세판 (`/watchlist`)
* 투자 & 경제 캘린더 (`/calendar`)
* 다중 금융계좌 관리 (`/accounts`)
* CSV 가져오기 & JSON 전체 백업 및 원클릭 복원 (`/data-io`)
* 관리자 포털 (`/admin`)

---

## 📂 프로젝트 폴더 구조

```
├── public/                 # 정적 리소스
├── src/
│   ├── app/                # Next.js App Router 페이지 및 API 라우트
│   │   ├── accounts/       # 다중 투자계좌 관리
│   │   ├── admin/          # 관리자 포털
│   │   ├── ai-advisor/     # AI 자산진단 & 챗봇
│   │   ├── alerts/         # 가격 & 조건 알림
│   │   ├── analytics/      # 수익률 & 성과 심층 분석
│   │   ├── assets/         # 자산군별 상세 페이지 (국내/해외주식, ETF, 코인, 부동산 등)
│   │   ├── calendar/       # 투자 & 경제 캘린더
│   │   ├── cashflow/       # 현금흐름 & FIRE 플래너
│   │   ├── compare/        # 종목 비교 분석실
│   │   ├── data-io/        # CSV 가져오기 / JSON 백업
│   │   ├── dividends/      # 배당 & 분배금 캘린더
│   │   ├── market/         # 글로벌 시장 지수
│   │   ├── portfolio/      # 포트폴리오 분석 & 리밸런싱
│   │   ├── taxes/          # 세금 관리 & 절세 시뮬레이터
│   │   ├── transactions/   # 통합 거래내역 원장
│   │   ├── watchlist/      # 관심종목 시세판
│   │   ├── page.tsx        # 메인 대시보드
│   │   ├── layout.tsx      # 루트 레이아웃 & 테마 설정
│   │   └── globals.css     # Tailwind CSS 전역 스타일
│   ├── components/         # 모듈별 UI 컴포넌트 & 모달
│   │   ├── accounts/
│   │   ├── admin/
│   │   ├── ai/
│   │   ├── alerts/
│   │   ├── analytics/
│   │   ├── assets/
│   │   ├── calendar/
│   │   ├── cashflow/
│   │   ├── compare/
│   │   ├── crypto/
│   │   ├── dashboard/
│   │   ├── data/
│   │   ├── dividends/
│   │   ├── layout/         # Header, Sidebar, MobileNav, AppLayout
│   │   ├── modals/         # 자산추가, 거래입력, 자산상세 모달
│   │   ├── portfolio/
│   │   ├── realestate/
│   │   ├── taxes/
│   │   └── watchlist/
│   ├── context/            # 전역 자산 상태 관리 (AssetContext)
│   ├── lib/                # 모의 데이터 및 금융 계산 유틸리티
│   └── types/              # TypeScript 도메인 타입 정의
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛡️ 보안 및 데이터 보호
* 본 프로젝트는 API 키나 비밀번호 등 민감 정보를 저장소에 커밋하지 않으며, 모든 로컬 데이터는 브라우저 LocalStorage에 안전하게 보관됩니다.
* 필요 시 `/data-io` 메뉴에서 언제든지 전체 포트폴리오 데이터를 JSON으로 내보내기/복원하거나 CSV로 일괄 등록할 수 있습니다.
