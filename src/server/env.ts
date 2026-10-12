import { z } from "zod";

/**
 * 서버 환경 변수 (모두 기본값을 가지므로 .env 없이도 로컬 실행이 가능합니다)
 */
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const int = (def: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number.parseInt(v, 10)))
    .pipe(z.number().int().min(min));

const num = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number());

const str = (def: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : v));

const list = (def: string) =>
  str(def).transform((v) =>
    v
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: str("development"),
  DATABASE_URL: str("postgres://mosaic:mosaic@localhost:5432/mosaic"),
  DB_POOL_MAX: int(10, 1),

  APP_URL: str("http://localhost:3000"),
  SESSION_COOKIE_NAME: str("mosaic_session"),
  SESSION_TTL_DAYS: int(30, 1),
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).optional().default("auto"),
  ADMIN_EMAILS: list(""),

  STORAGE_DRIVER: z.enum(["local", "s3"]).optional().default("local"),
  LOCAL_STORAGE_DIR: str("./storage"),
  S3_BUCKET: str(""),
  S3_REGION: str("us-east-1"),
  S3_ENDPOINT: str(""),
  S3_ACCESS_KEY_ID: str(""),
  S3_SECRET_ACCESS_KEY: str(""),
  S3_FORCE_PATH_STYLE: bool(true),
  S3_PUBLIC_URL: str(""),

  UPLOAD_MAX_MB: num(10),
  UPLOAD_MIN_DIMENSION: int(64, 1),
  UPLOAD_MAX_DIMENSION: int(12000, 100),
  UPLOAD_MAX_PIXELS: int(80_000_000, 10_000),
  DUPLICATE_PHASH_THRESHOLD: int(6, 0).pipe(z.number().max(11)),

  RATE_LIMIT_ENABLED: bool(true),

  JOB_MODE: z.enum(["inline", "worker"]).optional().default("inline"),
  AI_ANALYZERS: list("basic"),
  AUTO_TAG_ENABLED: bool(true),
  AUTO_TAG_MIN_CONFIDENCE: num(0.2),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export const UPLOAD_MAX_BYTES = Math.round(env.UPLOAD_MAX_MB * 1024 * 1024);
export const isProduction = env.NODE_ENV === "production";
