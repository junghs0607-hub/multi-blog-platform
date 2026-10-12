# Mosaic REST API 명세

Base URL: `/api` · 형식: JSON (업로드는 `multipart/form-data`) · 인증: 세션 쿠키 `mosaic_session`

## 공통 규칙

| 항목 | 내용 |
| --- | --- |
| 인증 | 로그인/가입 시 `HttpOnly` 세션 쿠키 발급. 🔒 표시는 로그인 필요, 🛡️ 는 관리자 전용 |
| CSRF | `POST/PUT/PATCH/DELETE` 요청은 헤더 **`x-mosaic-csrf: 1`** 필수 (없으면 `403 CSRF_REJECTED`) |
| 페이지네이션 | 목록 응답 `{ "items": [...], "nextCursor": "eyJpZCI6NDZ9" \| null }` → 다음 요청에 `?cursor=` 전달. `limit` 기본 25, 최대 50 |
| 관리자 목록 | `{ items, total, page, pageSize }` (오프셋 페이지) |
| 날짜 | ISO 8601 문자열 |
| PATCH | 보내지 않은 필드는 변경 없음, `""` 또는 `null` 은 값 삭제 |

### 에러 형식

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "제목을 입력해주세요.", "details": [{ "path": "title", "message": "제목을 입력해주세요." }] } }
```

| HTTP | code | 상황 |
| --- | --- | --- |
| 400 | BAD_REQUEST | 잘못된 요청 (JSON 파싱 실패, 자기 자신 팔로우 등) |
| 401 | UNAUTHORIZED / INVALID_CREDENTIALS | 로그인 필요 / 로그인 실패 |
| 403 | FORBIDDEN / CSRF_REJECTED / ACCOUNT_SUSPENDED | 권한 없음 / CSRF 헤더 누락 / 정지 계정 |
| 404 | NOT_FOUND | 없거나 **열람 권한이 없는 비공개 리소스** |
| 409 | EMAIL_TAKEN, USERNAME_TAKEN, BOARD_NAME_TAKEN, DUPLICATE_IMAGE, SIMILAR_IMAGE, ALREADY_REPORTED, ALREADY_RESOLVED, CONFLICT | 중복/충돌 |
| 413 | FILE_TOO_LARGE | 업로드 크기 초과 |
| 415 | UNSUPPORTED_TYPE, TYPE_MISMATCH | 허용되지 않는 형식 / 확장자·MIME 과 실제 형식 불일치 |
| 422 | VALIDATION_ERROR, CORRUPT_IMAGE, DIMENSIONS_TOO_SMALL, DIMENSIONS_TOO_LARGE, INVALID_PASSWORD, INVALID_CATEGORY | 입력값 오류 |
| 429 | RATE_LIMITED | 요청 과다 (`Retry-After` 헤더) |

### 공통 객체

```jsonc
// UserSummary
{ "id": 2, "username": "minji", "displayName": "김민지", "avatarUrl": "/api/files/avatars/ab/cd/<sha>.webp" }

// PinCard (피드 카드)
{
  "id": 40, "title": "플라워 데코레이션", "sourceUrl": "https://…", "sourceDomain": "wedding.example.com",
  "visibility": "public",
  "image": { "thumbUrl": "/api/files/thumbs/…webp", "mediumUrl": "/api/files/medium/…webp",
             "width": 720, "height": 1080, "dominantColor": "#e87058", "isAnimated": false },
  "author": UserSummary, "likeCount": 2, "saveCount": 1, "commentCount": 2,
  "saved": false,               // 내가 내 보드 중 하나에 저장했는지
  "createdAt": "2026-10-03T12:00:00.000Z"
}

// PinDetail = PinCard + 아래 필드
{
  "description": "…", "status": "active", "shareCount": 0, "updatedAt": "…",
  "category": { "id": 14, "slug": "wedding", "name": "웨딩", "description": "…" },
  "tags": [{ "name": "꽃", "source": "user", "confidence": null }, { "name": "주황", "source": "ai", "confidence": 0.81 }],
  "image": { …, "originalUrl": "/api/files/originals/…jpg", "downloadUrl": "/api/pins/40/original",
             "mediumWidth": 720, "mediumHeight": 1080, "sizeBytes": 28877, "mimeType": "image/jpeg", "format": "jpeg" },
  "palette": [{ "hex": "#e87058", "ratio": 0.81, "name": "주황" }],
  "viewer": { "liked": false, "savedBoardIds": [], "isOwner": false, "isFollowingAuthor": false, "canModerate": false }
}

// Board
{ "id": 2, "name": "홈카페 레시피", "description": "…", "visibility": "public", "pinCount": 6,
  "owner": UserSummary, "coverUrls": ["/api/files/thumbs/…"], "createdAt": "…", "updatedAt": "…", "isOwner": true }
```

---

## 1. 인증

| Method | Path | 설명 | Body / 응답 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 회원가입 + 자동 로그인 | `{ email, username, displayName, password }` → `201 { user: SessionUser }` |
| POST | `/auth/login` | 로그인 (이메일 또는 아이디) | `{ identifier, password }` → `{ user }` |
| POST | `/auth/logout` | 로그아웃 (서버 세션 삭제) | → `{ ok: true }` |
| GET | `/auth/me` | 현재 사용자 | → `{ user: SessionUser \| null }` |

- 비밀번호: 8~128자, 영문+숫자 포함. 아이디: `^[a-z0-9_]{3,30}$` (소문자 정규화)
- `SessionUser = UserSummary + { email, role }`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' -H 'x-mosaic-csrf: 1' \
  -d '{"identifier":"minji","password":"mosaic1234"}' -c cookies.txt
```

## 2. 사용자 / 프로필

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/users?q=&limit=` | 사용자 검색 (아이디 접두 / 이름 부분 일치) → `{ items: FollowUserItem[] }` |
| GET | `/users/:username` | 공개 프로필 → `{ user: UserProfile }` (bio, websiteUrl, follower/following/pinCount, isMe, isFollowing) |
| GET | `/users/:username/pins` | 사용자가 만든 핀 (본인이면 비공개 포함) → Page\<PinCard\> |
| GET | `/users/:username/boards` | 보드 목록 (타인에게는 공개 보드만) → `{ items: Board[] }` |
| POST 🔒 | `/users/:username/follow` | 팔로우 → `{ following: true, followerCount }` |
| DELETE 🔒 | `/users/:username/follow` | 언팔로우 → `{ following: false, followerCount }` |
| GET | `/users/:username/followers` | 팔로워 목록 → Page\<FollowUserItem\> |
| GET | `/users/:username/following` | 팔로잉 목록 → Page\<FollowUserItem\> |
| GET 🔒 | `/users/me` | 내 계정 정보 |
| PATCH 🔒 | `/users/me` | 프로필 수정 `{ displayName?, username?, bio?, websiteUrl? }` → `{ user }` |
| DELETE 🔒 | `/users/me` | 회원 탈퇴 `{ password }` (모든 콘텐츠 삭제, 카운터 보정, 고아 이미지 정리) |
| PATCH 🔒 | `/users/me/password` | `{ currentPassword, newPassword }` — 다른 기기 세션 로그아웃 |
| POST 🔒 | `/users/me/avatar` | multipart `file` → 320px 정사각 WebP → `{ avatarUrl }` |
| DELETE 🔒 | `/users/me/avatar` | 프로필 사진 삭제 |
| GET 🔒 | `/users/me/likes` | 내가 좋아요한 핀 → Page\<PinCard\> |

## 3. 핀 (피드 · 검색 · 업로드)

### GET `/pins` — 피드 / 검색

| Query | 값 | 설명 |
| --- | --- | --- |
| `q` | 문자열 (≤100자) | 제목·설명·태그 전문 검색 (한글 부분 일치 지원) |
| `tag` | 태그명 | 태그 정확 일치 (`#` 생략 가능) |
| `category` | slug | 카테고리 필터 (`/categories` 참고) |
| `feed` | `all`(기본) \| `following` | 팔로우한 사용자의 핀 (로그인 필요, 비로그인 시 빈 목록) |
| `sort` | `latest` \| `popular` \| `relevance` | 기본: `q` 있으면 relevance, 없으면 latest |
| `cursor`, `limit` | | 커서 페이지네이션 |

→ `Page<PinCard>` (공개·활성 핀만, 정지 사용자 제외)

### POST 🔒 `/pins` — 이미지 업로드 + 핀 생성 (`multipart/form-data`)

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `file` | ✅ | JPG/PNG/WEBP/GIF/AVIF, 최대 `UPLOAD_MAX_MB`(10MB), 가로·세로 64~12000px |
| `title` | ✅ | 1~100자 |
| `description` | | ≤1000자 |
| `sourceUrl` | | http/https URL |
| `tags` | | 쉼표 구분 문자열 또는 JSON 배열, 최대 15개 (정규화: 소문자, `#` 제거, 공백→`_`) |
| `categoryId` | | 카테고리 ID |
| `boardId` | | 게시와 동시에 저장할 **내 보드** ID |
| `visibility` | | `public`(기본) \| `private` |
| `allowSimilar` | | `1` 이면 유사 이미지 경고 무시 |

응답 `201 { pin: PinDetail, reusedImage: boolean }`

```bash
curl -X POST http://localhost:3000/api/pins -b cookies.txt -H 'x-mosaic-csrf: 1' \
  -F file=@photo.jpg -F title='주말 브런치' -F tags='브런치,홈카페' -F categoryId=3
```

중복/유사 응답:
```jsonc
// 409 — 정확히 같은 파일(SHA-256)
{ "error": { "code": "DUPLICATE_IMAGE", "message": "이미 등록된 이미지입니다. …", "details": { "existingPinId": 73, "own": false } } }
// 409 — 리사이즈/재압축/형식 변환 등 거의 같은 이미지 (dHash 해밍 거리 ≤ DUPLICATE_PHASH_THRESHOLD, 기본 6)
{ "error": { "code": "SIMILAR_IMAGE", "message": "…그래도 업로드하시겠습니까?",
             "details": { "candidates": [{ "pinId": 73, "title": "…", "thumbUrl": "…", "distance": 1 }] } } }
```

### 단건 / 상호작용

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/pins/:id` | 핀 상세 → `{ pin: PinDetail }` (비공개·숨김은 작성자/관리자만, 그 외 404) |
| PATCH 🔒 | `/pins/:id` | 수정 (작성자) `{ title?, description?, sourceUrl?, tags?, categoryId?, visibility? }` → `{ pin }` |
| DELETE 🔒 | `/pins/:id` | 삭제 (작성자 또는 관리자) |
| GET | `/pins/:id/related` | 관련 핀 최대 40개 → `{ items: PinCard[], nextCursor: null }` |
| POST 🔒 | `/pins/:id/like` | 좋아요 (멱등) → `{ liked: true, likeCount }` |
| DELETE 🔒 | `/pins/:id/like` | 좋아요 취소 (알림 회수) → `{ liked: false, likeCount }` |
| GET | `/pins/:id/comments` | 댓글 (작성순) → Page\<CommentItem\> (`canEdit`, `canDelete` 포함) |
| POST 🔒 | `/pins/:id/comments` | `{ body }` (≤1000자) → `201 { comment }` |
| POST | `/pins/:id/share` | 공유 집계 `{ channel: copy\|native\|twitter\|facebook\|kakao\|email\|other }` → `{ counted, shareCount? }` (IP·핀당 10분 1회) |
| GET 🔒 | `/pins/:id/boards` | 저장 다이얼로그용 내 보드 + 저장 여부 → `{ items: BoardOption[] }` |
| GET | `/pins/:id/original` | 원본 파일 다운로드 (`?inline=1` 이면 브라우저 표시) |

## 4. 댓글

| Method | Path | 설명 |
| --- | --- | --- |
| PATCH 🔒 | `/comments/:id` | 수정 (작성자) `{ body }` → `{ comment }` |
| DELETE 🔒 | `/comments/:id` | 삭제 (작성자 / 핀 작성자 / 관리자) → `{ commentCount }` |

## 5. 보드

| Method | Path | 설명 |
| --- | --- | --- |
| GET 🔒 | `/boards` | 내 보드 요약 목록 → `{ items: BoardOption[] }` |
| POST 🔒 | `/boards` | 생성 `{ name, description?, visibility? }` → `201 { board }` (이름 중복 시 409 BOARD_NAME_TAKEN) |
| GET | `/boards/:id` | 보드 상세 (비공개는 소유자/관리자만, 그 외 404) → `{ board }` |
| PATCH 🔒 | `/boards/:id` | 수정 (소유자) `{ name?, description?, visibility?, coverPinId? }` → `{ board }` |
| DELETE 🔒 | `/boards/:id` | 삭제 (소유자/관리자) — 핀 자체는 유지, 저장 수 보정 |
| GET | `/boards/:id/pins` | 보드의 핀 (저장 시각 역순) → Page\<PinCard\> |
| POST 🔒 | `/boards/:id/pins` | 핀 저장 `{ pinId }` → `{ saved, added, saveCount, boardPinCount }` |
| DELETE 🔒 | `/boards/:id/pins/:pinId` | 저장 취소 → `{ saved: false, removed, saveCount, boardPinCount }` |

## 6. 카테고리 · 태그 · 이미지

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/categories` | `{ items: Category[] }` |
| GET | `/tags?q=&limit=` | `q` 있으면 접두 자동완성, 없으면 인기 태그 → `{ items: [{ name, usageCount }] }` |
| GET 🔒 | `/images/check?sha256=` | 업로드 전 중복 확인 → `{ duplicate: { existingPinId, own } \| null }` |
| GET | `/files/{originals\|medium\|thumbs\|avatars}/ab/cd/<sha256>.<ext>` | 이미지 파일 (immutable 캐시 + ETag/304) |

## 7. 알림

| Method | Path | 설명 |
| --- | --- | --- |
| GET 🔒 | `/notifications` | → Page\<NotificationItem\> (`type`: follow/like/comment/save/system, actor, pin, board, comment, message, readAt) |
| GET | `/notifications/unread-count` | → `{ count }` (비로그인 0) |
| POST 🔒 | `/notifications/read` | `{ all: true }` 또는 `{ ids: [1,2] }` → `{ updated }` |

## 8. 신고

| Method | Path | 설명 |
| --- | --- | --- |
| POST 🔒 | `/reports` | `{ targetType: pin\|comment\|user\|board, targetId, reason, details? }` → `201 { id }` — 본인 콘텐츠 신고 불가(400), 처리 대기 중 중복 신고 409 |

`reason`: `spam`, `nudity`, `violence`, `hate`, `harassment`, `copyright`, `misinformation`, `other`

## 9. 관리자 🛡️

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/admin/stats` | 대시보드 통계 (totals, 최근 7일, 14일 일별 가입/업로드, 인기 태그) |
| GET | `/admin/users?q=&status=active\|suspended&role=user\|admin&page=&pageSize=` | 사용자 목록 |
| PATCH | `/admin/users/:id` | `{ role?, status? }` — 정지 시 전체 세션 무효화, 본인 변경 불가 |
| DELETE | `/admin/users/:id` | 사용자 강제 삭제 (콘텐츠 포함) |
| GET | `/admin/pins?q=&status=active\|hidden\|private\|reported&page=` | 핀 목록 (`q` 는 제목/전문검색/핀 ID) |
| PATCH | `/admin/pins/:id` | `{ status: active\|hidden, reason? }` — 작성자에게 system 알림 |
| DELETE | `/admin/pins/:id?reason=` | 핀 삭제 + 작성자 알림 |
| GET | `/admin/reports?status=pending\|resolved\|dismissed&page=` | 신고 목록 (대상 미리보기, 대상별 누적 건수) |
| PATCH | `/admin/reports/:id` | `{ status: resolved\|dismissed, action: none\|hide_pin\|delete_comment\|suspend_user\|make_board_private, note? }` — 같은 대상의 대기 신고 일괄 처리 |
| GET | `/admin/audit-logs?page=` | 관리자 작업 감사 로그 |

## 10. 기타

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/health` | `{ status: "ok", db: "ok", latencyMs }` — 로드밸런서 헬스 체크용 |
