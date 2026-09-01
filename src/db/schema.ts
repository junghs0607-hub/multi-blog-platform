import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  serial,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role_enum", ["SUPER_ADMIN", "ADMIN", "USER"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "published", "scheduled", "private"]);

// ─── USERS ───
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  role: roleEnum("role").default("USER").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── BLOGS ───
export const blogs = pgTable("blogs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  profileImage: text("profile_image"),
  coverImage: text("cover_image"),
  theme: varchar("theme", { length: 50 }).default("basic"),
  themeSettings: jsonb("theme_settings").default({}),
  postsPerPage: integer("posts_per_page").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── CATEGORIES ───
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cat_blog_idx").on(table.blogId),
]);

// ─── TAGS ───
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tag_blog_idx").on(table.blogId),
]);

// ─── ARTICLES ───
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  thumbnailUrl: text("thumbnail_url"),
  status: articleStatusEnum("status").default("draft").notNull(),
  seoTitle: varchar("seo_title", { length: 200 }),
  seoDescription: text("seo_description"),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("art_blog_idx").on(table.blogId),
  index("art_author_idx").on(table.authorId),
  index("art_status_idx").on(table.status),
]);

// ─── ARTICLE TAGS ───
export const articleTags = pgTable("article_tags", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  index("at_article_idx").on(table.articleId),
]);

// ─── COMMENTS ───
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("cmt_article_idx").on(table.articleId),
]);

// ─── ARTICLE LIKES ───
export const articleLikes = pgTable("article_likes", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("like_unique").on(table.articleId, table.userId),
]);

// ─── BLOG SUBSCRIPTIONS ───
export const blogSubscriptions = pgTable("blog_subscriptions", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("sub_unique").on(table.blogId, table.userId),
]);

// ─── MEDIA ───
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("media_blog_idx").on(table.blogId),
]);

// ─── NOTIFICATIONS ───
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notif_user_idx").on(table.userId),
]);

// ─── PAGE VIEWS ───
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
  referer: text("referer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pv_blog_idx").on(table.blogId),
  index("pv_date_idx").on(table.createdAt),
]);

// ─── AI SETTINGS ───
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 50 }).default("openai"),
  apiBaseUrl: text("api_base_url"),
  apiKey: text("api_key"),
  model: varchar("model", { length: 100 }).default("gpt-3.5-turbo"),
  temperature: integer("temperature").default(7),
  maxTokens: integer("max_tokens").default(2000),
  systemPrompt: text("system_prompt"),
  imageProvider: varchar("image_provider", { length: 50 }).default("openverse"),
  imageApiBaseUrl: text("image_api_base_url"),
  imageApiKey: text("image_api_key"),
  imageModel: varchar("image_model", { length: 100 }).default("gpt-image-1"),
  imageCount: integer("image_count").default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── AI LOGS ───
export const aiLogs = pgTable("ai_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 50 }),
  model: varchar("model", { length: 100 }),
  prompt: text("prompt"),
  response: text("response"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── SITE SETTINGS ───
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── ADVERTISEMENTS ───
export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  position: varchar("position", { length: 50 }).default("sidebar"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── REPORTS ───
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── GUESTBOOK ───
export const guestbook = pgTable("guestbook", {
  id: serial("id").primaryKey(),
  blogId: integer("blog_id").references(() => blogs.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ══════════════════════════════════════════════════════════
// EXTERNAL PLATFORM PUBLISHING (additive module)
// ══════════════════════════════════════════════════════════

export const publishPlatformEnum = pgEnum("publish_platform", ["NAVER", "TISTORY"]);
export const publishStatusEnum = pgEnum("publish_status", [
  "PENDING",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "SCHEDULED",
  "CANCELLED",
]);

// ─── EXTERNAL PLATFORM ACCOUNTS ───
export const publishAccounts = pgTable("publish_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  platform: publishPlatformEnum("platform").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  loginId: varchar("login_id", { length: 200 }),
  // Per-account isolated Playwright profile directory name (never a password).
  profileDir: varchar("profile_dir", { length: 200 }).notNull().unique(),
  // Tistory blog address, e.g. myblog (myblog.tistory.com)
  blogAddress: varchar("blog_address", { length: 200 }),
  defaultCategory: varchar("default_category", { length: 200 }),
  sessionStatus: varchar("session_status", { length: 30 }).default("UNKNOWN"),
  sessionMessage: text("session_message"),
  sessionCheckedAt: timestamp("session_checked_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pub_acc_user_idx").on(table.userId),
]);

// ─── PER-ARTICLE / PER-PLATFORM PUBLISH STATE ───
export const articlePublish = pgTable("article_publish", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  accountId: integer("account_id").references(() => publishAccounts.id, { onDelete: "set null" }),
  platform: publishPlatformEnum("platform").notNull(),
  status: publishStatusEnum("status").default("PENDING").notNull(),
  visibility: varchar("visibility", { length: 20 }).default("public"),
  externalUrl: text("external_url"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("article_platform_unique").on(table.articleId, table.platform),
  index("ap_status_idx").on(table.status),
  index("ap_scheduled_idx").on(table.scheduledAt),
]);

// ─── PUBLISH JOB LOGS ───
export const publishLogs = pgTable("publish_logs", {
  id: serial("id").primaryKey(),
  publishId: integer("publish_id").references(() => articlePublish.id, { onDelete: "cascade" }).notNull(),
  step: varchar("step", { length: 60 }).notNull(),
  level: varchar("level", { length: 20 }).default("info").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pub_log_pid_idx").on(table.publishId),
]);
