/**
 * Mosaic 데이터베이스 스키마 (PostgreSQL + Drizzle ORM)
 *
 * 설계 원칙
 *  - images(물리 파일) 와 pins(사용자 게시물) 분리 → 동일 파일은 한 번만 저장(SHA-256 기준), 원본/중간/썸네일 키를 함께 관리
 *  - 집계 카운터(좋아요/저장/댓글/팔로워 수)는 비정규화하여 목록 조회 시 COUNT(*) 를 피함
 *  - 피드/목록은 키셋(커서) 페이지네이션 + 부분 인덱스
 *  - 검색: tsvector 생성 컬럼(제목 A, 태그 A, 설명 B, CJK 바이그램 C 가중치) + GIN 인덱스
 *  - 유사 이미지: 64bit dHash + 16bit 청크 4개(Multi-Index Hashing) 인덱스
 *  - AI 확장: image_analyses / image_embeddings / pin_tags.source('ai') / jobs 큐
 */
import { sql, type SQL } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  char,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ────────────────────────────── helpers ────────────────────────────── */

/** JS Date 와 정확히 왕복되도록 밀리초(3) 정밀도의 timestamptz 를 사용합니다. */
const ts = (name: string) => timestamp(name, { withTimezone: true, precision: 3, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
/** 콘텐츠가 수정될 때만 서비스 계층에서 명시적으로 갱신합니다 (카운터 변경은 제외). */
const updatedAt = () => ts("updated_at").notNull().defaultNow();
const id = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const ref = (name: string) => bigint(name, { mode: "number" });

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ────────────────────────────── enums ────────────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const pinStatusEnum = pgEnum("pin_status", ["active", "hidden"]);
export const tagSourceEnum = pgEnum("tag_source", ["user", "ai"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "follow",
  "like",
  "comment",
  "save",
  "system",
]);
export const reportTargetEnum = pgEnum("report_target", ["pin", "comment", "user", "board"]);
export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "nudity",
  "violence",
  "hate",
  "harassment",
  "copyright",
  "misinformation",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved", "dismissed"]);
export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "running", "completed", "failed"]);

/* ────────────────────────────── users & auth ────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    /** 항상 소문자로 정규화하여 저장 */
    email: varchar("email", { length: 255 }).notNull(),
    /** 항상 소문자 [a-z0-9_]{3,30} */
    username: varchar("username", { length: 30 }).notNull(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    bio: varchar("bio", { length: 500 }),
    websiteUrl: varchar("website_url", { length: 2048 }),
    avatarKey: text("avatar_key"),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    pinCount: integer("pin_count").notNull().default(0),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_username_uq").on(t.username),
    // 사용자 검색/자동완성: username LIKE 'prefix%'
    index("users_username_prefix_idx").on(t.username.op("varchar_pattern_ops")),
    index("users_created_idx").on(t.createdAt.desc().nullsFirst()),
    check("users_username_format", sql`${t.username} ~ '^[a-z0-9_]{3,30}$'`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** 세션 토큰의 SHA-256 해시 (원문 토큰은 쿠키에만 존재) */
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    ip: varchar("ip", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/* ────────────────────────────── taxonomy ────────────────────────────── */

export const categories = pgTable(
  "categories",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar("slug", { length: 50 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    description: varchar("description", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    /** 정규화된 태그명 (소문자, 공백 → _ , '#' 제거) */
    name: varchar("name", { length: 50 }).notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("tags_name_uq").on(t.name),
    // 태그 자동완성: name LIKE 'prefix%'
    index("tags_name_prefix_idx").on(t.name.op("varchar_pattern_ops")),
    index("tags_usage_idx").on(t.usageCount.desc().nullsFirst()),
  ],
);

/* ────────────────────────────── images (physical files) ────────────────────────────── */

export const images = pgTable(
  "images",
  {
    id: id(),
    /** 업로드된 원본 바이트의 SHA-256 (정확한 중복 판정) */
    sha256: char("sha256", { length: 64 }).notNull(),
    /** 64bit difference hash (지각 해시, 유사/근접 중복 판정) */
    phash: bigint("phash", { mode: "bigint" }),
    /** Multi-Index Hashing: 해밍 거리 ≤ 3 이면 4개 청크 중 최소 1개가 정확히 일치 (비둘기집 원리) */
    phashA: integer("phash_a").generatedAlwaysAs(sql`(("phash" >> 48) & 65535)::integer`),
    phashB: integer("phash_b").generatedAlwaysAs(sql`(("phash" >> 32) & 65535)::integer`),
    phashC: integer("phash_c").generatedAlwaysAs(sql`(("phash" >> 16) & 65535)::integer`),
    phashD: integer("phash_d").generatedAlwaysAs(sql`("phash" & 65535)::integer`),
    storageDriver: varchar("storage_driver", { length: 16 }).notNull(),
    /** 원본 (메타데이터 제거/방향 보정된 고화질) */
    originalKey: text("original_key").notNull(),
    /** 상세 페이지용 중간 크기 (최대 폭 1200px, WebP) */
    mediumKey: text("medium_key").notNull(),
    /** 피드용 썸네일 (폭 474px, WebP) */
    thumbKey: text("thumb_key").notNull(),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    format: varchar("format", { length: 10 }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    mediumWidth: integer("medium_width").notNull(),
    mediumHeight: integer("medium_height").notNull(),
    thumbWidth: integer("thumb_width").notNull(),
    thumbHeight: integer("thumb_height").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    dominantColor: varchar("dominant_color", { length: 7 }),
    isAnimated: boolean("is_animated").notNull().default(false),
    uploadedBy: ref("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    analysisStatus: analysisStatusEnum("analysis_status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("images_sha256_uq").on(t.sha256),
    index("images_phash_a_idx").on(t.phashA),
    index("images_phash_b_idx").on(t.phashB),
    index("images_phash_c_idx").on(t.phashC),
    index("images_phash_d_idx").on(t.phashD),
  ],
);

/** AI/분석기 결과 (분석기별 1행). 예: basic(색상), openai-vision(캡션/라벨), clip(임베딩) */
export const imageAnalyses = pgTable(
  "image_analyses",
  {
    id: id(),
    imageId: ref("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "cascade" }),
    analyzer: varchar("analyzer", { length: 50 }).notNull(),
    modelVersion: varchar("model_version", { length: 100 }),
    status: analysisStatusEnum("status").notNull().default("pending"),
    labels: jsonb("labels").$type<{ name: string; confidence: number }[]>(),
    caption: text("caption"),
    colors: jsonb("colors").$type<{ hex: string; ratio: number; name?: string }[]>(),
    raw: jsonb("raw"),
    error: text("error"),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
  },
  (t) => [uniqueIndex("image_analyses_image_analyzer_uq").on(t.imageId, t.analyzer)],
);

/**
 * 이미지 임베딩 (향후 유사도 검색용).
 * 확장 설치 없이 동작하도록 real[] 로 저장하며, pgvector 도입 시 vector(N) 컬럼 + HNSW 인덱스로 전환합니다.
 * (docs/ARCHITECTURE.md 의 "AI 확장 설계" 참고)
 */
export const imageEmbeddings = pgTable(
  "image_embeddings",
  {
    imageId: ref("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "cascade" }),
    model: varchar("model", { length: 100 }).notNull(),
    dimensions: integer("dimensions").notNull(),
    embedding: real("embedding").array().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.imageId, t.model] })],
);

/* ────────────────────────────── pins ────────────────────────────── */

export const pins = pgTable(
  "pins",
  {
    id: id(),
    authorId: ref("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageId: ref("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description"),
    sourceUrl: varchar("source_url", { length: 2048 }),
    sourceDomain: varchar("source_domain", { length: 255 }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    status: pinStatusEnum("status").notNull().default("active"),
    /** 검색용 비정규화 태그 문자열 (공백 구분) */
    tagsText: text("tags_text").notNull().default(""),
    /** 한글/CJK 부분 일치 검색을 위한 문자 바이그램 (애플리케이션에서 계산) */
    searchNgrams: text("search_ngrams").notNull().default(""),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL => sql`setweight(to_tsvector('simple', coalesce("title", '')), 'A')
        || setweight(to_tsvector('simple', coalesce("tags_text", '')), 'A')
        || setweight(to_tsvector('simple', coalesce("description", '')), 'B')
        || setweight(to_tsvector('simple', coalesce("search_ngrams", '')), 'C')`,
    ),
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    /** 인기순 정렬 점수 (카운터 변경 시 자동 갱신되는 생성 컬럼) */
    popularity: integer("popularity").generatedAlwaysAs(
      sql`("like_count" + "save_count" * 2 + "comment_count" + "share_count")`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // 같은 사용자가 같은 이미지를 두 번 등록하는 것을 DB 레벨에서 방지
    uniqueIndex("pins_author_image_uq").on(t.authorId, t.imageId),
    index("pins_image_idx").on(t.imageId),
    index("pins_created_idx").on(t.createdAt),
    index("pins_author_idx").on(t.authorId, t.id.desc().nullsFirst()),
    // 최신 피드 (공개 + 활성)
    index("pins_public_latest_idx")
      .on(t.id.desc().nullsFirst())
      .where(sql`status = 'active' AND visibility = 'public'`),
    // 인기 피드
    index("pins_public_popular_idx")
      .on(t.popularity.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`status = 'active' AND visibility = 'public'`),
    // 카테고리 필터
    index("pins_category_idx")
      .on(t.categoryId, t.id.desc().nullsFirst())
      .where(sql`status = 'active' AND visibility = 'public'`),
    // 전문 검색
    index("pins_search_idx").using("gin", t.searchVector),
  ],
);

export const pinTags = pgTable(
  "pin_tags",
  {
    pinId: ref("pin_id")
      .notNull()
      .references(() => pins.id, { onDelete: "cascade" }),
    tagId: ref("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    /** user: 사용자가 입력 / ai: 분석기가 자동 생성 */
    source: tagSourceEnum("source").notNull().default("user"),
    confidence: real("confidence"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.pinId, t.tagId] }), index("pin_tags_tag_idx").on(t.tagId, t.pinId)],
);

/* ────────────────────────────── boards ────────────────────────────── */

export const boards = pgTable(
  "boards",
  {
    id: id(),
    ownerId: ref("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    description: varchar("description", { length: 500 }),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    coverPinId: ref("cover_pin_id").references(() => pins.id, { onDelete: "set null" }),
    pinCount: integer("pin_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // 사용자별 보드 이름 중복 방지 (대소문자 무시)
    uniqueIndex("boards_owner_name_uq").on(t.ownerId, sql`lower(${t.name})`),
    index("boards_owner_idx").on(t.ownerId, t.updatedAt.desc().nullsFirst()),
  ],
);

export const boardPins = pgTable(
  "board_pins",
  {
    boardId: ref("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    pinId: ref("pin_id")
      .notNull()
      .references(() => pins.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.boardId, t.pinId] }),
    index("board_pins_pin_idx").on(t.pinId),
    index("board_pins_board_created_idx").on(t.boardId, t.createdAt.desc().nullsFirst(), t.pinId.desc().nullsFirst()),
  ],
);

/* ────────────────────────────── social ────────────────────────────── */

export const pinLikes = pgTable(
  "pin_likes",
  {
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pinId: ref("pin_id")
      .notNull()
      .references(() => pins.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.pinId] }),
    index("pin_likes_pin_idx").on(t.pinId),
    index("pin_likes_user_created_idx").on(t.userId, t.createdAt.desc().nullsFirst(), t.pinId.desc().nullsFirst()),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    pinId: ref("pin_id")
      .notNull()
      .references(() => pins.id, { onDelete: "cascade" }),
    authorId: ref("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 답글(스레드) 확장용 */
    parentId: ref("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("comments_pin_idx").on(t.pinId, t.id), index("comments_author_idx").on(t.authorId)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: ref("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: ref("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId, t.createdAt.desc().nullsFirst()),
    index("follows_follower_created_idx").on(t.followerId, t.createdAt.desc().nullsFirst()),
    check("follows_no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    recipientId: ref("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: ref("actor_id").references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    pinId: ref("pin_id").references(() => pins.id, { onDelete: "cascade" }),
    boardId: ref("board_id").references(() => boards.id, { onDelete: "cascade" }),
    commentId: ref("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    message: varchar("message", { length: 500 }),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.id.desc().nullsFirst()),
    index("notifications_unread_idx")
      .on(t.recipientId)
      .where(sql`read_at IS NULL`),
  ],
);

/* ────────────────────────────── moderation ────────────────────────────── */

export const reports = pgTable(
  "reports",
  {
    id: id(),
    reporterId: ref("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: reportTargetEnum("target_type").notNull(),
    targetId: bigint("target_id", { mode: "number" }).notNull(),
    reason: reportReasonEnum("reason").notNull(),
    details: varchar("details", { length: 1000 }),
    status: reportStatusEnum("status").notNull().default("pending"),
    resolvedBy: ref("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolutionNote: varchar("resolution_note", { length: 1000 }),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.id.desc().nullsFirst()),
    index("reports_target_idx").on(t.targetType, t.targetId),
    // 같은 사용자가 같은 대상을 중복 신고(처리 대기 중)하지 못하도록
    uniqueIndex("reports_pending_uq")
      .on(t.reporterId, t.targetType, t.targetId)
      .where(sql`status = 'pending'`),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: id(),
    adminId: ref("admin_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: bigint("target_id", { mode: "number" }),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (t) => [index("admin_audit_logs_created_idx").on(t.id.desc().nullsFirst())],
);

/* ────────────────────────────── background jobs ────────────────────────────── */

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    type: varchar("type", { length: 50 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: ts("run_at").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
  },
  (t) => [
    index("jobs_pending_idx")
      .on(t.runAt, t.id)
      .where(sql`status = 'pending'`),
  ],
);

/* ────────────────────────────── types ────────────────────────────── */

export type UserRow = typeof users.$inferSelect;
export type PinRow = typeof pins.$inferSelect;
export type ImageRow = typeof images.$inferSelect;
export type BoardRow = typeof boards.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type ReportReason = (typeof reportReasonEnum.enumValues)[number];
export type ReportTarget = (typeof reportTargetEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
