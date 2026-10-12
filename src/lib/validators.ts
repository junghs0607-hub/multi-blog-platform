/**
 * 클라이언트/서버 공용 순수 함수 (입력 정규화 및 검증)
 */

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
export const MAX_TAGS = 15;
export const MAX_TAG_LENGTH = 30;

/** "#Living Room " → "living_room" */
export function normalizeTag(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const t = normalizeTag(r);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** "a, b,#c" 또는 '["a","b"]' 형태의 입력을 배열로 변환 */
export function parseTagsInput(input: unknown): string[] {
  if (Array.isArray(input)) return input.filter((v): v is string => typeof v === "string");
  if (typeof input !== "string") return [];
  const s = input.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      /* fallthrough */
    }
  }
  return s.split(/[,\n]/);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** https://www.example.com/a → example.com */
export function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").slice(0, 255);
  } catch {
    return null;
  }
}

/** 로그인 후 이동 경로 검증 (오픈 리다이렉트 방지) */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
