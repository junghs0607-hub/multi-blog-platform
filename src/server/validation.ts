import { z } from "zod";
import {
  BOARD_DESCRIPTION_MAX,
  BOARD_NAME_MAX,
  COMMENT_MAX,
  PIN_DESCRIPTION_MAX,
  PIN_TITLE_MAX,
} from "@/lib/constants";
import { MAX_TAGS, USERNAME_RE, isHttpUrl, normalizeTags, parseTagsInput } from "@/lib/validators";

/* ────────────── 공통 ────────────── */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, "이메일이 너무 깁니다.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "올바른 이메일 주소를 입력해주세요.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, "아이디는 영문 소문자·숫자·밑줄(_) 3~30자로 입력해주세요.");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(128, "비밀번호는 128자 이하여야 합니다.")
  .regex(/[A-Za-z]/, "비밀번호에 영문자를 포함해주세요.")
  .regex(/[0-9]/, "비밀번호에 숫자를 포함해주세요.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해주세요.")
  .max(50, "이름은 50자 이하로 입력해주세요.");

const httpUrl = z
  .string()
  .trim()
  .max(2048, "URL 이 너무 깁니다.")
  .refine(isHttpUrl, "http:// 또는 https:// 로 시작하는 올바른 URL 을 입력해주세요.");

/** 빈 문자열/누락은 null 로 */
export const optionalUrlSchema = z
  .union([z.literal(""), z.null(), httpUrl])
  .optional()
  .transform((v) => (v ? v : null));

export const visibilitySchema = z.enum(["public", "private"]);

export const tagsSchema = z
  .unknown()
  .transform((v) => normalizeTags(parseTagsInput(v)))
  .pipe(z.array(z.string()).max(MAX_TAGS, `태그는 최대 ${MAX_TAGS}개까지 입력할 수 있습니다.`));

const optionalId = z
  .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
  .optional()
  .transform((v) => (typeof v === "number" ? v : null));

/**
 * PATCH 용 필드: undefined = 변경 없음, "" 또는 null = 값 삭제
 */
const patchText = (max: number, message: string) => z.string().trim().max(max, message).nullable().optional();
const patchUrl = z.union([z.literal(""), z.null(), httpUrl]).optional();
const patchId = z.union([z.literal(""), z.null(), z.coerce.number().int().positive()]).optional();

/** PATCH 필드 값을 DB 값으로 변환 (undefined 는 그대로 유지하여 '변경 없음'을 표현) */
export function patchValue<T>(v: T | "" | null | undefined): T | null | undefined {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  return v;
}

export const cursorSchema = z.string().max(500).optional();
export const limitSchema = (def = 25, max = 50) => z.coerce.number().int().min(1).max(max).optional().default(def);

/* ────────────── 인증 / 사용자 ────────────── */

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "이메일 또는 아이디를 입력해주세요.").max(255),
  password: z.string().min(1, "비밀번호를 입력해주세요.").max(128),
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  username: usernameSchema.optional(),
  bio: patchText(500, "소개는 500자 이하로 입력해주세요."),
  websiteUrl: patchUrl,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

/* ────────────── 핀 ────────────── */

export const pinFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요.")
    .max(PIN_TITLE_MAX, `제목은 ${PIN_TITLE_MAX}자 이하로 입력해주세요.`),
  description: z
    .string()
    .trim()
    .max(PIN_DESCRIPTION_MAX, `설명은 ${PIN_DESCRIPTION_MAX}자 이하로 입력해주세요.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  sourceUrl: optionalUrlSchema,
  tags: tagsSchema.optional().default([]),
  categoryId: optionalId,
  visibility: visibilitySchema.optional().default("public"),
});

export const createPinSchema = pinFieldsSchema.extend({
  boardId: optionalId,
  allowSimilar: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "1" || v === "true"),
});

export const updatePinSchema = z.object({
  title: pinFieldsSchema.shape.title.optional(),
  description: patchText(PIN_DESCRIPTION_MAX, `설명은 ${PIN_DESCRIPTION_MAX}자 이하로 입력해주세요.`),
  sourceUrl: patchUrl,
  tags: tagsSchema.optional(),
  categoryId: patchId,
  visibility: visibilitySchema.optional(),
});

export const listPinsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(60).optional(),
  category: z.string().trim().max(50).optional(),
  feed: z.enum(["all", "following"]).optional().default("all"),
  sort: z.enum(["latest", "popular", "relevance"]).optional(),
  cursor: cursorSchema,
  limit: limitSchema(25, 50),
});

export const shareSchema = z.object({
  channel: z.enum(["copy", "native", "twitter", "facebook", "kakao", "email", "other"]).optional().default("other"),
});

/* ────────────── 보드 ────────────── */

export const createBoardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "보드 이름을 입력해주세요.")
    .max(BOARD_NAME_MAX, `보드 이름은 ${BOARD_NAME_MAX}자 이하로 입력해주세요.`),
  description: z
    .string()
    .trim()
    .max(BOARD_DESCRIPTION_MAX, `설명은 ${BOARD_DESCRIPTION_MAX}자 이하로 입력해주세요.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  visibility: visibilitySchema.optional().default("public"),
});

export const updateBoardSchema = z.object({
  name: createBoardSchema.shape.name.optional(),
  description: patchText(BOARD_DESCRIPTION_MAX, `설명은 ${BOARD_DESCRIPTION_MAX}자 이하로 입력해주세요.`),
  visibility: visibilitySchema.optional(),
  coverPinId: patchId,
});

export const boardPinSchema = z.object({
  pinId: z.coerce.number().int().positive(),
});

/* ────────────── 댓글 / 신고 / 알림 ────────────── */

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "댓글 내용을 입력해주세요.")
    .max(COMMENT_MAX, `댓글은 ${COMMENT_MAX}자 이하로 입력해주세요.`),
});

export const reportSchema = z.object({
  targetType: z.enum(["pin", "comment", "user", "board"]),
  targetId: z.coerce.number().int().positive(),
  reason: z.enum(["spam", "nudity", "violence", "hate", "harassment", "copyright", "misinformation", "other"]),
  details: z
    .string()
    .trim()
    .max(1000, "상세 내용은 1000자 이하로 입력해주세요.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const markReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }),
]);

/* ────────────── 관리자 ────────────── */

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(20).optional(),
  role: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(20),
});

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, "변경할 항목이 없습니다.");

export const adminUpdatePinSchema = z.object({
  status: z.enum(["active", "hidden"]),
  reason: z.string().trim().max(500).optional(),
});

export const adminResolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  action: z.enum(["none", "hide_pin", "delete_comment", "suspend_user", "make_board_private"]).optional().default("none"),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});
