# Mosaic 아키텍처

## 1. 전체 프로젝트 구조

```
mosaic/
├── .env.example               # 환경 변수 예시 (cp .env.example .env.local)
├── docker-compose.yml         # PostgreSQL 17 / MinIO(S3) / 앱 컨테이너
├── Dockerfile                 # 프로덕션 이미지 (시작 시 마이그레이션 적용)
├── drizzle.config.ts          # drizzle-kit 설정
├── next.config.ts             # 보안 헤더, sharp/pg 외부 패키지, 원격 개발 허용 Origin
├── eslint.config.mjs          # eslint-config-next (core-web-vitals + TS + React Compiler 규칙)
├── drizzle/                   # SQL 마이그레이션 (0000_init, 0001_seed_categories)
├── docs/                      # ARCHITECTURE / DATABASE / API 문서
├── public/favicon.svg
├── scripts/                   # tsx 로 실행하는 운영 스크립트
│   ├── load-env.ts            #   Next.js 와 동일한 규칙으로 .env* 로드
│   ├── migrate.ts             #   마이그레이션 적용
│   ├── seed.ts                #   데모 데이터 (실제 업로드 파이프라인 사용)
│   ├── worker.ts              #   백그라운드 작업 워커
│   ├── create-admin.ts        #   관리자 생성/승격
│   └── lib/{art,seed-data}.ts #   절차적 이미지 생성기, 시드 문구
├── storage/                   # (gitignore) 로컬 이미지 저장소
└── src/
    ├── app/                   # ── Next.js App Router ──────────────────────
    │   ├── layout.tsx         # 루트 레이아웃: 세션 사용자 조회 → Providers, 헤더, 모바일 탭
    │   ├── page.tsx           # 홈 피드 (최신/인기/팔로잉 + 카테고리)
    │   ├── search/            # 검색·탐색 (색상으로 찾기, 인기 태그, 사용자 결과)
    │   ├── pins/[id]/         # 핀 상세 (+ edit/)
    │   ├── create/            # 업로드
    │   ├── u/[username]/      # 프로필 (생성됨/보드/좋아요 탭)
    │   ├── boards/[id]/       # 보드
    │   ├── notifications/     # 알림
    │   ├── settings/          # 프로필·계정 설정
    │   ├── login/, signup/    # 인증
    │   ├── admin/             # 관리자 (layout 에서 권한 확인)
    │   └── api/               # REST API Route Handlers (45개 라우트 파일)
    ├── components/            # ── UI (클라이언트 컴포넌트 위주) ────────────
    │   ├── ui/                # Button, Input, Modal, Dropdown, Toast, TagInput …
    │   ├── layout/            # Header, SearchBar(자동완성), MobileNav, Logo, Chips
    │   ├── pins/              # MasonryGrid, PinCard, PinFeed(무한 스크롤), PinDetail,
    │   │                      # PinForm(업로드/수정), SaveDialog, ShareDialog, ReportDialog, Comments
    │   ├── boards/ users/ notifications/ settings/ auth/ admin/
    │   └── providers.tsx      # AuthContext + ToastProvider
    ├── hooks/                 # useInfiniteList(커서), useIntersection(센티널)
    ├── lib/                   # 클라이언트·서버 공용 (API 클라이언트, 검증 유틸, 상수)
    ├── types/                 # 공용 DTO 타입 (index.ts, admin.ts)
    ├── db/                    # Drizzle 스키마 + 커넥션 풀
    └── server/                # ── 서버 전용 ───────────────────────────────
        ├── env.ts             # zod 로 검증되는 환경 변수 (모두 기본값 보유)
        ├── http.ts            # apiRoute 래퍼(CSRF·에러 변환), AppError, 입력 파싱
        ├── validation.ts      # 요청 zod 스키마
        ├── rate-limit.ts      # 레이트 리미터
        ├── multipart.ts       # 업로드 파싱
        ├── search.ts          # 검색어 → tsquery, CJK 바이그램
        ├── auth/              # scrypt 비밀번호, DB 세션, Viewer 타입
        ├── storage/           # StorageDriver 인터페이스 + local / s3(aws4fetch)
        ├── images/process.ts  # 형식 판별, 검증, SHA-256, dHash, 변형 생성
        ├── jobs/              # PostgreSQL 작업 큐 (enqueue/claim/retry), inline 스케줄러
        ├── ai/                # 분석기 인터페이스, 레지스트리, 기본 색상 분석기, 파이프라인
        └── services/          # 도메인 로직 (pins, upload, boards, users, follows, comments,
                               # notifications, reports, admin, tags, categories, images, mappers)
```

## 2. 계층 구조와 요청 흐름

```
Browser ──fetch(x-mosaic-csrf)──▶ app/api/**/route.ts ──▶ server/services/* ──▶ Drizzle ──▶ PostgreSQL
   ▲                                   │ apiRoute()           │                     └──▶ StorageDriver (local | S3)
   │                                   │ zod 검증              └─ enqueueJob() ──▶ jobs ──▶ after()/worker ──▶ ai/pipeline
   └──── Server Components (app/**/page.tsx) ── services 직접 호출 (같은 권한 로직 재사용)
```

- **Route Handler 는 얇게**: 인증(`requireViewer`) → 레이트 리밋 → zod 검증 → 서비스 호출 → JSON 응답.
- **서비스 계층은 Next.js 에 의존하지 않음**: `Viewer` 객체를 인자로 받으므로 시드/워커 스크립트에서도 동일한 로직(권한, 카운터, 알림)을 그대로 사용합니다.
- **서버 컴포넌트**는 초기 데이터(핀 상세, 프로필, 보드)를 서비스에서 직접 조회해 SEO 메타데이터와 함께 렌더링하고, 무한 목록은 클라이언트에서 API 로 이어 받습니다.
- 에러는 `{ "error": { "code", "message", "details" } }` 형식으로 통일 (AppError / ZodError / PG unique 위반 자동 변환).

## 3. 인증과 세션

| 항목 | 구현 |
| --- | --- |
| 비밀번호 | Node 내장 `scrypt` (N=16384, r=8, p=1, 64B) + 16B salt, `timingSafeEqual` 비교, 없는 계정도 더미 해시 검증으로 타이밍 공격 완화 |
| 세션 | 32바이트 난수 토큰 → 쿠키(`httpOnly`, `SameSite=Lax`, HTTPS 시 `Secure`), DB 에는 **SHA-256 해시만** 저장 (`sessions`) |
| 무효화 | 로그아웃, 계정 정지(전체 세션 삭제), 비밀번호 변경(현재 세션 제외 삭제), 만료 세션은 워커가 정리 |
| CSRF | 상태 변경 요청에 커스텀 헤더 `x-mosaic-csrf: 1` 필수 (크로스 오리진에서 preflight 없이 보낼 수 없음) + SameSite=Lax |
| 레이트 리밋 | 로그인 10회/분, 가입 5회/10분(IP), 업로드 30회/시간, 댓글 20회/분, 신고 10회/시간(사용자) |
| 관리자 | `users.role = 'admin'` — `ADMIN_EMAILS` 로 가입하거나 `npm run admin:create` |

## 4. 권한 모델 (접근 제어)

| 리소스 | 비로그인 | 로그인 사용자 | 소유자 | 관리자 |
| --- | --- | --- | --- | --- |
| 공개 핀 (활성) | 열람 | 열람·좋아요·댓글·저장·신고 | 수정·삭제 | 숨김·삭제 |
| 비공개 핀 | **404** | **404** | 열람·수정·삭제 | 열람·삭제 |
| 숨김 처리된 핀 | 404 | 404 | 열람(안내 배너) | 열람·복구 |
| 공개 보드 | 열람 | 열람·신고 | 수정·삭제·핀 추가/제거 | 열람·삭제 |
| 비공개 보드 | **404** | **404** | 전체 | 열람·삭제 |
| 댓글 | 열람 | 작성·신고 | 작성자: 수정·삭제 / 핀 작성자: 삭제 | 삭제 |
| 정지된 사용자의 콘텐츠 | 비노출 | 비노출 | 로그인 불가 | 열람 |

- 권한이 없는 비공개 리소스는 403 이 아닌 **404** 로 응답하여 존재 여부를 노출하지 않습니다.
- 공개 보드 안에 있더라도 이후 비공개/숨김 처리된 핀은 목록에서 제외됩니다 (`viewablePinCondition`).
- 비공개 보드에 저장한 사실은 핀 작성자에게 알리지 않습니다.
- 관리자 페이지(`/admin/*`)는 서버 레이아웃에서 권한을 확인하고, 일반 사용자에게는 404 를 반환합니다.

## 5. 이미지 업로드 파이프라인

```
POST /api/pins (multipart)
 ├─ 1. Content-Length 1차 차단 → formData 파싱 → 파일 크기 재확인 (UPLOAD_MAX_MB)
 ├─ 2. 매직 바이트로 실제 형식 판별 (JPEG/PNG/GIF/WebP/AVIF, SVG·HEIC 등 거부)
 ├─ 3. 선언된 MIME·확장자와 실제 형식 일치 확인 (위장 파일 차단)
 ├─ 4. sharp 메타데이터: 해상도 최소/최대, 총 픽셀 수(디컴프레션 폭탄) 제한
 ├─ 5. SHA-256 → images 조회
 │     ├─ 내가 올린 이미지        → 409 DUPLICATE_IMAGE {own:true}
 │     ├─ 타인의 공개 핀 이미지    → 409 DUPLICATE_IMAGE {existingPinId} (저장 유도)
 │     └─ 비공개 핀에만 존재       → 파일 재사용 (저장 공간 중복 없음)
 ├─ 6. dHash(64bit) → Multi-Index Hashing 으로 해밍 거리 ≤ 6(설정값) 후보 검색
 │     └─ 유사 이미지 존재 → 409 SIMILAR_IMAGE {candidates} → 사용자가 확인 후 allowSimilar=1 재요청
 ├─ 7. 변형 생성 (디코딩 실패 시 422 CORRUPT_IMAGE)
 │     ├─ original : EXIF/XMP/IPTC 또는 회전 정보가 있으면 방향 보정 + 메타데이터 제거 재인코딩,
 │     │             없으면 업로드 바이트 그대로 보존
 │     ├─ medium   : 최대 폭 1200px WebP (GIF/애니메이션은 애니메이션 WebP)
 │     └─ thumb    : 폭 474px 정지 WebP (피드 236px 컬럼의 2x)
 ├─ 8. 저장소 업로드 — 콘텐츠 주소 키: {originals|medium|thumbs}/ab/cd/<sha256>.<ext>
 ├─ 9. 단일 트랜잭션: images + pins + 태그 + (선택)보드 저장 + users.pin_count + jobs(image.analyze)
 └─ 10. 실패 시 보상: 이미지 행이 없으면 업로드한 파일 삭제 / 동시 업로드 경합은 ON CONFLICT 로 처리
응답 후 after(): image.analyze 작업 실행 → 색상 팔레트, AI 태그
```

- 브라우저는 업로드 전에 Web Crypto 로 SHA-256 을 계산해 `GET /api/images/check` 로 중복을 미리 안내합니다 (최종 판정은 서버).
- 원본과 썸네일은 서로 다른 키로 분리 저장되며, `images` 행에 `original_key / medium_key / thumb_key` 와 각 크기, 대표 색상(`dominant_color`)을 함께 기록합니다. 피드는 썸네일만, 상세는 중간 크기, "원본 보기/다운로드"는 원본을 사용합니다.
- 파일은 `/api/files/*` 에서 엄격한 키 정규식 검사 후 `Cache-Control: immutable` + ETag 로 서빙합니다. S3 + `S3_PUBLIC_URL` 이면 CDN 에서 직접 서빙됩니다.
- 더 이상 어떤 핀도 참조하지 않는 이미지(핀 삭제·탈퇴)는 DB 행과 3개 파일을 함께 정리합니다 (`ON DELETE RESTRICT` 로 경합 시 안전).

## 6. 검색 설계 (한국어 지원)

PostgreSQL `simple` 텍스트 검색 구성은 공백 단위로 토큰화하므로 "고양이가" 같은 교착어 형태에서 "고양이" 부분 일치가 어렵습니다. 확장 모듈 없이 이를 해결하기 위해:

1. **문서 측**: `pins.search_vector` 는 생성 컬럼(STORED)
   `setweight(title,'A') || setweight(tags_text,'A') || setweight(description,'B') || setweight(search_ngrams,'C')`
   `search_ngrams` 는 제목·설명·태그의 CJK 연속 문자열을 **문자 바이그램**으로 분해한 값(애플리케이션에서 계산)입니다.
2. **질의 측**: 검색어마다 `('고양이':* | ('고양' & '양이'))` 처럼 **접두 일치 OR 바이그램 AND** 로 변환하여 `to_tsquery('simple', $1)` 에 바인딩합니다 (특수문자 제거, 파라미터 바인딩으로 인젝션 불가).
3. **인덱스**: `pins_search_idx` (GIN). 관련도는 `ts_rank` → 인기도 → 최신순.
4. `#태그` 는 `tags.name` 정확 일치(`pin_tags_tag_idx`), 태그 자동완성은 `varchar_pattern_ops` 인덱스 접두 검색입니다.

## 7. 피드·페이지네이션·성능

| 목록 | 정렬 | 페이지네이션 | 인덱스 |
| --- | --- | --- | --- |
| 최신 피드 | `id DESC` | 키셋 `id < cursor` | `pins_public_latest_idx` (부분 인덱스) |
| 인기 피드 | `popularity DESC, id DESC` | 키셋 `(popularity,id) < (…)` | `pins_public_popular_idx` (생성 컬럼) |
| 카테고리 | `id DESC` | 키셋 | `pins_category_idx` (부분 인덱스) |
| 검색 | `ts_rank` | 오프셋 커서(최대 5000) | `pins_search_idx` (GIN) |
| 프로필 핀 | `id DESC` | 키셋 | `pins_author_idx` |
| 보드 핀 | 저장 시각 DESC | 키셋 `(created_at, pin_id)` | `board_pins_board_created_idx` |
| 알림 | `id DESC` | 키셋 | `notifications_recipient_idx`, 미읽음 수는 부분 인덱스 |

- 좋아요/저장/댓글/공유/팔로워/핀/보드 핀 수는 **비정규화 카운터**로 트랜잭션 안에서 갱신하여 목록 조회 시 `COUNT(*)` 가 없습니다. 인기 점수 `popularity` 는 카운터로부터 자동 계산되는 생성 컬럼입니다.
- 타임스탬프는 밀리초 정밀도(`timestamptz(3)`)로 저장하여 JS `Date` 기반 커서가 정확히 왕복됩니다.
- DESC 인덱스는 `DESC NULLS FIRST`(표준 DESC)로 생성해 `ORDER BY … DESC` 와 정확히 일치시킵니다.
- 피드 카드는 저장된 `width/height` 로 높이를 미리 계산하는 JS Masonry + 대표 색상 플레이스홀더 + `loading="lazy"` 로 레이아웃 이동(CLS)이 없습니다.
- 카테고리는 1분 메모리 캐시, 이미지 파일은 1년 immutable 캐시 + ETag.

## 8. 관련 핀 추천

후보 생성기 점수 합산 방식(`services/pins.ts#getRelatedPins`):

| 후보 생성기 | 점수 |
| --- | --- |
| 태그 공유 | 공유 태그 수 × 3 |
| 같은 **공개** 보드에 함께 저장됨 (협업 필터링) | 공동 저장 수 × 2 |
| 같은 카테고리 | +1 |
| 같은 작성자 | +1 |

부족하면 인기 핀으로 채웁니다. 새 생성기(예: 이미지 임베딩 유사도)는 CTE 하나를 `UNION ALL` 에 추가하면 됩니다.

## 9. 백그라운드 작업

- `jobs` 테이블 기반 큐: 트랜잭션 안에서 enqueue (Transactional Outbox) → `FOR UPDATE SKIP LOCKED` 로 점유 → 지수 백오프 재시도 → `max_attempts` 초과 시 failed.
- `JOB_MODE=inline`(기본): Next.js `after()` 로 응답 직후 같은 프로세스에서 실행.
- `JOB_MODE=worker`: `npm run worker` 를 여러 개 띄워 수평 확장. 워커는 오래 멈춘 작업 복구, 만료 세션 정리도 수행합니다.

## 10. AI 확장 설계 (자동 태깅 · 이미지 분석 · 유사도 검색)

이미 동작하는 파이프라인 위에 분석기만 추가하면 됩니다.

```
업로드 → jobs(image.analyze) → ai/pipeline.analyzeImage()
           └─ getEnabledAnalyzers()  (AI_ANALYZERS=basic,openai,...)
                 ├─ analyze() → image_analyses (분석기별 upsert: labels, caption, colors, raw)
                 ├─ embedding  → image_embeddings (real[], 모델별)
                 └─ labels(confidence ≥ AUTO_TAG_MIN_CONFIDENCE) → pin_tags(source='ai', confidence)
                                                                  → tags_text/search_ngrams 갱신 → 검색 반영
```

현재 포함된 `basic` 분석기는 외부 의존성 없이 색상 팔레트와 색상 태그(빨강·파랑…)를 생성합니다. 덕분에 "색상으로 찾기"와 ✨AI 태그 표시가 실제로 동작하며, 이후 모델 기반 분석기도 같은 경로로 연결됩니다.

### 10.1 새 분석기 추가 예시 (비전 LLM 자동 태깅)

```ts
// src/server/ai/analyzers/vision-llm.ts
import type { AnalyzerInput, AnalyzerResult, ImageAnalyzer } from "../types";

export class VisionLlmAnalyzer implements ImageAnalyzer {
  readonly id = "vision";
  readonly version = "vision-llm@1";
  async analyze(input: AnalyzerInput): Promise<AnalyzerResult> {
    const res = await fetch(process.env.VISION_API_URL!, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.VISION_API_KEY}` },
      body: JSON.stringify({ image: input.buffer.toString("base64"), task: "tags+caption", lang: "ko" }),
    });
    const data = (await res.json()) as { tags: { name: string; score: number }[]; caption: string };
    return {
      labels: data.tags.map((t) => ({ name: t.name, confidence: t.score })),
      caption: data.caption,
      raw: data,
    };
  }
}
// registry.ts 의 factories 에 `vision: () => new VisionLlmAnalyzer()` 추가 후 AI_ANALYZERS=basic,vision
```

### 10.2 유사 이미지 검색 (pgvector 도입 절차)

1. 임베딩 분석기(CLIP 등)가 `embedding: { model: "clip-vit-b32", vector }` 를 반환하도록 구현 → `image_embeddings` 에 저장됩니다.
2. 확장 설치 후 컬럼/인덱스 추가 (커스텀 마이그레이션):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ALTER TABLE image_embeddings ADD COLUMN embedding_vec vector(512);
   UPDATE image_embeddings SET embedding_vec = embedding::vector WHERE dimensions = 512;
   CREATE INDEX image_embeddings_hnsw ON image_embeddings USING hnsw (embedding_vec vector_cosine_ops);
   ```
3. 관련 핀에 후보 생성기 추가:
   ```sql
   visual AS (
     SELECT p.id AS pin_id, 4 AS score
     FROM image_embeddings e JOIN pins p ON p.image_id = e.image_id
     WHERE e.model = 'clip-vit-b32'
     ORDER BY e.embedding_vec <=> (SELECT embedding_vec FROM image_embeddings WHERE image_id = $imageId AND model = 'clip-vit-b32')
     LIMIT 100
   )
   ```
4. "이 이미지와 비슷한 이미지 검색"(이미지로 검색) API 도 같은 쿼리로 구현할 수 있습니다.

현재의 dHash(64bit) + Multi-Index Hashing 은 **근접 중복**(리사이즈/재압축) 판정용이며, 의미적 유사도는 임베딩으로 확장하는 구조입니다.

## 11. 확장·운영 고려사항

| 항목 | 현재 | 확장 방법 |
| --- | --- | --- |
| 레이트 리밋 | 인스턴스 메모리 | Redis(`INCR`+`EXPIRE`) 구현으로 교체 (`server/rate-limit.ts`) |
| 작업 큐 | PostgreSQL jobs | 처리량이 커지면 워커 수 증가 → 필요 시 SQS/BullMQ 로 교체 (`server/jobs`) |
| 이미지 서빙 | `/api/files` (local) | S3 + CDN(`S3_PUBLIC_URL`)으로 앱 서버 우회 |
| 검색 | PostgreSQL FTS + 바이그램 | 형태소 분석이 필요하면 OpenSearch(nori) 로 색인 이관, `search_vector` 와 병행 |
| 통계 | 실시간 COUNT | 대규모에서는 `pg_class.reltuples` 추정치 또는 집계 테이블 |
| 클라이언트 IP | `X-Real-IP` / XFF 마지막 값 | 반드시 리버스 프록시(nginx 등) 뒤에 배포 |
