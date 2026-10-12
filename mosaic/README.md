# Mosaic — 이미지 큐레이션 플랫폼

Pinterest 스타일의 이미지 큐레이션 웹 서비스입니다. 이미지를 업로드해 **핀**을 만들고, **보드**에 모으고, 검색·좋아요·댓글·팔로우로 영감을 공유합니다.
모든 기능은 실제 PostgreSQL 데이터베이스와 REST API(CRUD)로 동작합니다.

| 영역 | 기술 |
| --- | --- |
| 프론트엔드 | Next.js 16 (App Router, React 19), Tailwind CSS 4, lucide-react |
| 백엔드 | Next.js Route Handlers (REST API), zod 검증 |
| 데이터베이스 | PostgreSQL 14+ (권장 17), Drizzle ORM / drizzle-kit 마이그레이션 |
| 이미지 처리 | sharp (libvips) — 검증, 원본 정제, 중간/썸네일 WebP 생성, 지각 해시 |
| 스토리지 | 로컬 디스크(기본) 또는 S3 호환 객체 스토리지 (AWS S3, MinIO, Cloudflare R2 등) |

## 주요 기능

| # | 기능 | 구현 내용 |
| --- | --- | --- |
| 1 | 회원 | 회원가입·로그인·로그아웃, 프로필 편집, 프로필 사진, 비밀번호 변경, 회원 탈퇴 (DB 세션 + scrypt) |
| 2 | 피드 | 반응형 Masonry 레이아웃, IntersectionObserver 무한 스크롤, 최신/인기/팔로잉 탭, 키셋 커서 페이지네이션 |
| 3 | 업로드 | 드래그 앤 드롭, 제목·설명·태그·원본 URL·카테고리·공개 범위, 업로드 진행률 |
| 4 | 상세 | 원본/중간 이미지, 색상 팔레트, 태그(사용자 + ✨AI), 관련 핀 추천 |
| 5 | 보드 | 생성·수정·삭제, 공개/비공개, 커버 콜라주 |
| 6 | 저장 | 한 핀을 여러 보드에 저장, 저장 취소, 저장 수 집계 |
| 7 | 검색 | 제목·설명·태그 전문 검색(한글 부분 일치), `#태그` 검색, 카테고리 필터, 관련도/인기/최신 정렬, 자동완성, 색상으로 찾기 |
| 8 | 소셜 | 좋아요, 댓글(수정·삭제), 공유(링크 복사·SNS·Web Share API) |
| 9 | 팔로우·알림 | 팔로우/언팔로우, 팔로워/팔로잉 목록, 팔로잉 피드, 팔로우·좋아요·댓글·저장·운영 알림 |
| 10 | 관리자 | 대시보드 통계, 사용자(권한/정지/삭제), 이미지(숨김/복구/삭제), 신고 처리, 감사 로그 |
| 11 | 반응형 | 모바일 2열 ~ 데스크톱 7열, 모바일 하단 탭 바, 바텀 시트형 다이얼로그 |
| 12 | 중복·검증 | SHA-256 정확 중복 차단, dHash 유사 이미지 경고, 매직 바이트 형식 검증, 크기·해상도 제한, EXIF 제거 |

## 빠른 시작

### 1. 요구 사항
- Node.js **20.9 이상** (22 LTS 권장)
- PostgreSQL **14 이상** (Docker 사용 시 자동)

### 2. 설치 및 실행

```bash
cd mosaic
npm install

# PostgreSQL 실행 (Docker)
docker compose up -d db

# 환경 변수 (기본값만으로도 docker compose DB 에 연결됩니다)
cp .env.example .env.local

# 마이그레이션 + 데모 데이터 (사용자 6명, 핀 72개, 보드 13개 …)
npm run db:migrate
npm run db:seed

# 개발 서버
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

| 데모 계정 | 아이디 / 이메일 | 비밀번호 |
| --- | --- | --- |
| 관리자 | `admin` / admin@mosaic.local | `admin1234` |
| 일반 사용자 | `minji`, `junho`, `seoyeon`, `hyunwoo`, `jiwoo` (@mosaic.local) | `mosaic1234` |

> Docker 없이 로컬 PostgreSQL 을 사용한다면 `DATABASE_URL` 만 바꿔주세요.
> 예) `createdb mosaic && DATABASE_URL=postgres://<user>:<password>@localhost:5432/mosaic`

### 3. 프로덕션 실행

```bash
npm run build
npm run start            # 기본 3000 포트

# 또는 Docker 로 앱까지 실행
docker compose --profile app up -d --build
```

S3 호환 스토리지(MinIO)를 쓰려면 `docker compose --profile s3 up -d` 후 `.env.local` 에서 `STORAGE_DRIVER=s3` 로 변경하세요.

## npm 스크립트

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript 검사 |
| `npm run db:generate` | 스키마 변경 → SQL 마이그레이션 생성 (`drizzle/`) |
| `npm run db:migrate` | 마이그레이션 적용 |
| `npm run db:seed` | 데모 데이터 생성 (빈 DB 에서만) |
| `npm run db:reset` | 모든 데이터·로컬 이미지 삭제 후 데모 데이터 재생성 |
| `npm run db:studio` | Drizzle Studio (DB 브라우저) |
| `npm run worker` | 백그라운드 작업 워커 (`JOB_MODE=worker` 일 때) |
| `npm run admin:create -- <아이디>` | 기존 사용자를 관리자로 승격 (또는 `--email --username --password` 로 생성) |

## 환경 변수

전체 목록과 설명은 [`.env.example`](./.env.example) 을 참고하세요. 주요 항목:

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://mosaic:mosaic@localhost:5432/mosaic` | PostgreSQL 접속 URL |
| `STORAGE_DRIVER` | `local` | `local` 또는 `s3` |
| `LOCAL_STORAGE_DIR` | `./storage` | 로컬 이미지 저장 경로 |
| `S3_*` | – | 버킷/리전/엔드포인트/키, `S3_PUBLIC_URL`(CDN) |
| `UPLOAD_MAX_MB` | `10` | 업로드 최대 크기 |
| `DUPLICATE_PHASH_THRESHOLD` | `6` | 유사 이미지 판정 해밍 거리 (0~11, 7 이하 재현율 100% 탐색) |
| `ADMIN_EMAILS` | – | 이 이메일로 가입 시 관리자 권한 부여 |
| `JOB_MODE` | `inline` | `inline`(응답 후 즉시 실행) / `worker`(별도 워커) |
| `AI_ANALYZERS` | `basic` | 활성화할 이미지 분석기 |

## 문서

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 전체 프로젝트 구조, 계층 설계, 업로드 파이프라인, 권한 모델, 성능, AI 확장 설계
- [docs/DATABASE.md](./docs/DATABASE.md) — ERD, 테이블 정의, 인덱스 전략
- [docs/API.md](./docs/API.md) — REST API 명세 (요청/응답/에러 코드)

## 검증 현황

- `npm run typecheck`, `npm run lint`(React Compiler 규칙 포함), `npm run build` 통과
- 실제 PostgreSQL 17 + 로컬 스토리지 환경에서 API 통합 테스트 132개 시나리오 통과
  (인증, 업로드 검증, 정확/유사 중복, 비공개 보드 접근 제어, 권한, 신고 처리, 계정 정지, 탈퇴 시 정리, 카운터 정합성 등)
- 헤드리스 브라우저로 로그인 → 업로드 → 상세 → 좋아요 → 댓글 → 보드 저장 UI 흐름 검증
