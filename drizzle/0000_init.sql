CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('follow', 'like', 'comment', 'save', 'system');--> statement-breakpoint
CREATE TYPE "public"."pin_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'nudity', 'violence', 'hate', 'harassment', 'copyright', 'misinformation', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('pin', 'comment', 'user', 'board');--> statement-breakpoint
CREATE TYPE "public"."tag_source" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"admin_id" bigint,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" bigint,
	"details" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_pins" (
	"board_id" bigint NOT NULL,
	"pin_id" bigint NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_pins_board_id_pin_id_pk" PRIMARY KEY("board_id","pin_id")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "boards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_id" bigint NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(500),
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"cover_pin_id" bigint,
	"pin_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(50) NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pin_id" bigint NOT NULL,
	"author_id" bigint NOT NULL,
	"parent_id" bigint,
	"body" varchar(1000) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" bigint NOT NULL,
	"following_id" bigint NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_no_self_follow" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
CREATE TABLE "image_analyses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "image_analyses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"image_id" bigint NOT NULL,
	"analyzer" varchar(50) NOT NULL,
	"model_version" varchar(100),
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"labels" jsonb,
	"caption" text,
	"colors" jsonb,
	"raw" jsonb,
	"error" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "image_embeddings" (
	"image_id" bigint NOT NULL,
	"model" varchar(100) NOT NULL,
	"dimensions" integer NOT NULL,
	"embedding" real[] NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_embeddings_image_id_model_pk" PRIMARY KEY("image_id","model")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sha256" char(64) NOT NULL,
	"phash" bigint,
	"phash_a" integer GENERATED ALWAYS AS ((("phash" >> 48) & 65535)::integer) STORED,
	"phash_b" integer GENERATED ALWAYS AS ((("phash" >> 32) & 65535)::integer) STORED,
	"phash_c" integer GENERATED ALWAYS AS ((("phash" >> 16) & 65535)::integer) STORED,
	"phash_d" integer GENERATED ALWAYS AS (("phash" & 65535)::integer) STORED,
	"storage_driver" varchar(16) NOT NULL,
	"original_key" text NOT NULL,
	"medium_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"format" varchar(10) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"medium_width" integer NOT NULL,
	"medium_height" integer NOT NULL,
	"thumb_width" integer NOT NULL,
	"thumb_height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"dominant_color" varchar(7),
	"is_animated" boolean DEFAULT false NOT NULL,
	"uploaded_by" bigint,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "jobs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp (3) with time zone,
	"last_error" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"recipient_id" bigint NOT NULL,
	"actor_id" bigint,
	"type" "notification_type" NOT NULL,
	"pin_id" bigint,
	"board_id" bigint,
	"comment_id" bigint,
	"message" varchar(500),
	"read_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pin_likes" (
	"user_id" bigint NOT NULL,
	"pin_id" bigint NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pin_likes_user_id_pin_id_pk" PRIMARY KEY("user_id","pin_id")
);
--> statement-breakpoint
CREATE TABLE "pin_tags" (
	"pin_id" bigint NOT NULL,
	"tag_id" bigint NOT NULL,
	"source" "tag_source" DEFAULT 'user' NOT NULL,
	"confidence" real,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pin_tags_pin_id_tag_id_pk" PRIMARY KEY("pin_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "pins" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"author_id" bigint NOT NULL,
	"image_id" bigint NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"source_url" varchar(2048),
	"source_domain" varchar(255),
	"category_id" integer,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"status" "pin_status" DEFAULT 'active' NOT NULL,
	"tags_text" text DEFAULT '' NOT NULL,
	"search_ngrams" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A')
        || setweight(to_tsvector('simple', coalesce("tags_text", '')), 'A')
        || setweight(to_tsvector('simple', coalesce("description", '')), 'B')
        || setweight(to_tsvector('simple', coalesce("search_ngrams", '')), 'C')) STORED,
	"like_count" integer DEFAULT 0 NOT NULL,
	"save_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"popularity" integer GENERATED ALWAYS AS (("like_count" + "save_count" * 2 + "comment_count" + "share_count")) STORED,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"reporter_id" bigint,
	"target_type" "report_target" NOT NULL,
	"target_id" bigint NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" varchar(1000),
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" bigint,
	"resolution_note" varchar(1000),
	"resolved_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"user_agent" varchar(512),
	"ip" varchar(64),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(50) NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"bio" varchar(500),
	"website_url" varchar(2048),
	"avatar_key" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"pin_count" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[a-z0-9_]{3,30}$')
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_pins" ADD CONSTRAINT "board_pins_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_pins" ADD CONSTRAINT "board_pins_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_cover_pin_id_pins_id_fk" FOREIGN KEY ("cover_pin_id") REFERENCES "public"."pins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_analyses" ADD CONSTRAINT "image_analyses_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_embeddings" ADD CONSTRAINT "image_embeddings_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_likes" ADD CONSTRAINT "pin_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_likes" ADD CONSTRAINT "pin_likes_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_tags" ADD CONSTRAINT "pin_tags_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin_tags" ADD CONSTRAINT "pin_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "board_pins_pin_idx" ON "board_pins" USING btree ("pin_id");--> statement-breakpoint
CREATE INDEX "board_pins_board_created_idx" ON "board_pins" USING btree ("board_id","created_at" DESC NULLS FIRST,"pin_id" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "boards_owner_name_uq" ON "boards" USING btree ("owner_id",lower("name"));--> statement-breakpoint
CREATE INDEX "boards_owner_idx" ON "boards" USING btree ("owner_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "comments_pin_idx" ON "comments" USING btree ("pin_id","id");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "follows_follower_created_idx" ON "follows" USING btree ("follower_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "image_analyses_image_analyzer_uq" ON "image_analyses" USING btree ("image_id","analyzer");--> statement-breakpoint
CREATE UNIQUE INDEX "images_sha256_uq" ON "images" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "images_phash_a_idx" ON "images" USING btree ("phash_a");--> statement-breakpoint
CREATE INDEX "images_phash_b_idx" ON "images" USING btree ("phash_b");--> statement-breakpoint
CREATE INDEX "images_phash_c_idx" ON "images" USING btree ("phash_c");--> statement-breakpoint
CREATE INDEX "images_phash_d_idx" ON "images" USING btree ("phash_d");--> statement-breakpoint
CREATE INDEX "jobs_pending_idx" ON "jobs" USING btree ("run_at","id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_id") WHERE read_at IS NULL;--> statement-breakpoint
CREATE INDEX "pin_likes_pin_idx" ON "pin_likes" USING btree ("pin_id");--> statement-breakpoint
CREATE INDEX "pin_likes_user_created_idx" ON "pin_likes" USING btree ("user_id","created_at" DESC NULLS FIRST,"pin_id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "pin_tags_tag_idx" ON "pin_tags" USING btree ("tag_id","pin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pins_author_image_uq" ON "pins" USING btree ("author_id","image_id");--> statement-breakpoint
CREATE INDEX "pins_image_idx" ON "pins" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "pins_created_idx" ON "pins" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pins_author_idx" ON "pins" USING btree ("author_id","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "pins_public_latest_idx" ON "pins" USING btree ("id" DESC NULLS FIRST) WHERE status = 'active' AND visibility = 'public';--> statement-breakpoint
CREATE INDEX "pins_public_popular_idx" ON "pins" USING btree ("popularity" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE status = 'active' AND visibility = 'public';--> statement-breakpoint
CREATE INDEX "pins_category_idx" ON "pins" USING btree ("category_id","id" DESC NULLS FIRST) WHERE status = 'active' AND visibility = 'public';--> statement-breakpoint
CREATE INDEX "pins_search_idx" ON "pins" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_pending_uq" ON "reports" USING btree ("reporter_id","target_type","target_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_uq" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_name_prefix_idx" ON "tags" USING btree ("name" varchar_pattern_ops);--> statement-breakpoint
CREATE INDEX "tags_usage_idx" ON "tags" USING btree ("usage_count" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_username_prefix_idx" ON "users" USING btree ("username" varchar_pattern_ops);--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "users" USING btree ("created_at" DESC NULLS FIRST);