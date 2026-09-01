/**
 * Shared result / error contract for every platform publisher.
 * Kept free of Next.js and Playwright imports so it is safe to use
 * from both the worker process and the web API layer.
 */

export const PublishErrorCode = {
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  EDITOR_NOT_FOUND: "EDITOR_NOT_FOUND",
  IMAGE_UPLOAD_FAILED: "IMAGE_UPLOAD_FAILED",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  TAG_INPUT_FAILED: "TAG_INPUT_FAILED",
  PUBLISH_FAILED: "PUBLISH_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type PublishErrorCodeType = (typeof PublishErrorCode)[keyof typeof PublishErrorCode];

/** Errors the operator can fix by retrying later without changing anything. */
const RETRYABLE: PublishErrorCodeType[] = [
  PublishErrorCode.NETWORK_ERROR,
  PublishErrorCode.TIMEOUT,
  PublishErrorCode.EDITOR_NOT_FOUND,
  PublishErrorCode.IMAGE_UPLOAD_FAILED,
  PublishErrorCode.PUBLISH_FAILED,
  PublishErrorCode.UNKNOWN_ERROR,
];

export function isRetryable(code: string | null | undefined): boolean {
  return RETRYABLE.includes(code as PublishErrorCodeType);
}

export class PublishError extends Error {
  code: PublishErrorCodeType;
  constructor(code: PublishErrorCodeType, message: string) {
    super(message);
    this.name = "PublishError";
    this.code = code;
  }
}

/** Normalizes any thrown value into a typed PublishError. */
export function toPublishError(error: unknown): PublishError {
  if (error instanceof PublishError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return new PublishError(PublishErrorCode.TIMEOUT, message);
  }
  if (lower.includes("net::") || lower.includes("econnrefused") || lower.includes("enotfound")) {
    return new PublishError(PublishErrorCode.NETWORK_ERROR, message);
  }
  return new PublishError(PublishErrorCode.UNKNOWN_ERROR, message);
}

export type PublishResult =
  | { ok: true; externalUrl: string | null; logs: PublishLogEntry[] }
  | { ok: false; code: PublishErrorCodeType; message: string; logs: PublishLogEntry[] };

export type PublishLogEntry = {
  step: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type SessionCheckResult = {
  ok: boolean;
  code?: PublishErrorCodeType;
  message: string;
  /** True when the writer page itself was reachable, not just the landing page. */
  canWrite?: boolean;
};

/** Platform-neutral article payload handed to publishers. */
export type PublishArticle = {
  id: number;
  title: string;
  contentHtml: string;
  excerpt: string;
  tags: string[];
  category: string | null;
  images: PublishImage[];
  visibility: "public" | "private";
  scheduledAt: Date | null;
};

export type PublishImage = {
  /** Absolute path on local disk, ready for Playwright setInputFiles. */
  localPath: string;
  /** Original src as it appears in the article HTML. */
  originalSrc: string;
  alt: string;
};

export type PublishAccountConfig = {
  id: number;
  platform: "NAVER" | "TISTORY";
  label: string;
  loginId: string | null;
  profileDir: string;
  blogAddress: string | null;
  defaultCategory: string | null;
};
