import type { NextRequest } from "next/server";
import { z } from "zod";
import { CSRF_HEADER } from "@/lib/constants";

/* ────────────────────────── 에러 ────────────────────────── */

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message = "잘못된 요청입니다.", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "로그인이 필요합니다.") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "권한이 없습니다.") => new AppError(403, "FORBIDDEN", message),
  notFound: (message = "요청한 리소스를 찾을 수 없습니다.") => new AppError(404, "NOT_FOUND", message),
  conflict: (code: string, message: string, details?: unknown) => new AppError(409, code, message, details),
  tooLarge: (message: string) => new AppError(413, "FILE_TOO_LARGE", message),
  unsupported: (code: string, message: string) => new AppError(415, code, message),
  unprocessable: (code: string, message: string, details?: unknown) => new AppError(422, code, message, details),
  rateLimited: (retryAfterSec?: number) =>
    new AppError(429, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", { retryAfterSec }),
};

/** pg 드라이버 에러 코드 추출 (drizzle 이 cause 로 감싸는 경우 포함) */
export function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 3 && cur && typeof cur === "object"; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

export function pgConstraint(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 3 && cur && typeof cur === "object"; i++) {
    const c = (cur as { constraint?: unknown }).constraint;
    if (typeof c === "string") return c;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

export function json(data: unknown, init?: number | ResponseInit): Response {
  const opts = typeof init === "number" ? { status: init } : init;
  return Response.json(data, opts);
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const headers: Record<string, string> = {};
    if (err.status === 429) {
      const retry = (err.details as { retryAfterSec?: number } | undefined)?.retryAfterSec;
      if (retry) headers["Retry-After"] = String(retry);
    }
    return json(
      { error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) } },
      { status: err.status, headers },
    );
  }
  if (err instanceof z.ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json(
      { error: { code: "VALIDATION_ERROR", message: issues[0]?.message ?? "입력값을 확인해주세요.", details: issues } },
      422,
    );
  }
  const code = pgErrorCode(err);
  if (code === "23505") {
    return json({ error: { code: "CONFLICT", message: "이미 존재하는 데이터입니다.", details: pgConstraint(err) } }, 409);
  }
  if (code === "23503") {
    return json({ error: { code: "REFERENCE_ERROR", message: "참조하는 데이터가 존재하지 않습니다." } }, 409);
  }
  console.error("[api] unhandled error:", err);
  return json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, 500);
}

/* ────────────────────────── 라우트 래퍼 ────────────────────────── */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type Params = Record<string, string | string[]>;
export type Ctx<P extends Params = Record<string, string>> = { params: Promise<P> };

/**
 * 모든 API 라우트 핸들러를 감싸는 래퍼
 *  - 상태 변경 요청(POST/PUT/PATCH/DELETE)에 CSRF 커스텀 헤더 강제
 *    (커스텀 헤더는 크로스 오리진에서 CORS preflight 없이 보낼 수 없음 + SameSite=Lax 쿠키)
 *  - AppError / ZodError / PG 에러를 일관된 JSON 에러 응답으로 변환
 */
export function apiRoute<P extends Params = Record<string, string>>(
  handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      if (MUTATING_METHODS.has(req.method) && req.headers.get(CSRF_HEADER) !== "1") {
        throw new AppError(403, "CSRF_REJECTED", "허용되지 않은 요청입니다. (CSRF 보호 헤더 누락)");
      }
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/* ────────────────────────── 입력 파싱 ────────────────────────── */

export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw Errors.badRequest("요청 본문이 올바른 JSON 형식이 아닙니다.");
  }
  return schema.parse(body);
}

export function readQuery<T extends z.ZodType>(req: NextRequest, schema: T): z.output<T> {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    if (v !== "") obj[k] = v;
  });
  return schema.parse(obj);
}

/** URL 경로의 숫자 ID 파싱 (유효하지 않으면 404) */
export function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw Errors.notFound();
  return n;
}

/**
 * 클라이언트 IP (레이트 리밋 키)
 * X-Forwarded-For 의 첫 값은 클라이언트가 위조할 수 있으므로, 리버스 프록시가 설정하는 X-Real-IP 또는
 * 프록시가 마지막에 덧붙인 값(가장 오른쪽)을 사용합니다. 운영 시 nginx 등 리버스 프록시 뒤에 배포하세요.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]!;
  }
  return "unknown";
}

export function isHttpsRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]!.trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
