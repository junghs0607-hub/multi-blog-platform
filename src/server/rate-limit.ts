import { env } from "./env";
import { Errors } from "./http";

/**
 * 고정 윈도 기반 인메모리 레이트 리미터.
 * 단일 인스턴스 배포를 가정하며, 다중 인스턴스 환경에서는 Redis(INCR + EXPIRE) 구현으로 교체하세요.
 */
type Bucket = { count: number; resetAt: number };
const globalForRl = globalThis as unknown as { __mosaicRateLimit?: Map<string, Bucket> };
const buckets = (globalForRl.__mosaicRateLimit ??= new Map<string, Bucket>());

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number): void {
  if (!env.RATE_LIMIT_ENABLED) return;
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (b.count >= limit) throw Errors.rateLimited(Math.ceil((b.resetAt - now) / 1000));
  b.count += 1;
}

export const RateLimits = {
  login: { limit: 10, windowMs: 60_000 },
  register: { limit: 5, windowMs: 10 * 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  comment: { limit: 20, windowMs: 60_000 },
  report: { limit: 10, windowMs: 60 * 60_000 },
  write: { limit: 120, windowMs: 60_000 },
} as const;

export function limit(kind: keyof typeof RateLimits, id: string | number) {
  const cfg = RateLimits[kind];
  rateLimit(`${kind}:${id}`, cfg.limit, cfg.windowMs);
}
