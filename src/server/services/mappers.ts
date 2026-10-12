import { env } from "@/server/env";
import { fileUrl } from "@/server/storage";
import type { Viewer } from "@/server/auth/types";
import type { PinCard, SessionUser, UserSummary, Visibility } from "@/types";

export function avatarUrl(key: string | null | undefined): string | null {
  return key ? fileUrl(env.STORAGE_DRIVER, key) : null;
}

export function toUserSummary(u: {
  id: number;
  username: string;
  displayName: string;
  avatarKey: string | null;
}): UserSummary {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: avatarUrl(u.avatarKey) };
}

export function toSessionUser(v: Viewer): SessionUser {
  return { ...toUserSummary(v), email: v.email, role: v.role };
}

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
export { iso };

/** 피드 카드 조회 결과 행 → PinCard DTO */
export interface PinCardRow {
  id: number;
  title: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  visibility: Visibility;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  createdAt: Date;
  imgDriver: string;
  thumbKey: string;
  mediumKey: string;
  width: number;
  height: number;
  dominantColor: string | null;
  isAnimated: boolean;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarKey: string | null;
  saved: boolean;
}

export function toPinCard(r: PinCardRow): PinCard {
  return {
    id: r.id,
    title: r.title,
    sourceUrl: r.sourceUrl,
    sourceDomain: r.sourceDomain,
    visibility: r.visibility,
    image: {
      thumbUrl: fileUrl(r.imgDriver, r.thumbKey),
      mediumUrl: fileUrl(r.imgDriver, r.mediumKey),
      width: r.width,
      height: r.height,
      dominantColor: r.dominantColor,
      isAnimated: r.isAnimated,
    },
    author: toUserSummary({
      id: r.authorId,
      username: r.authorUsername,
      displayName: r.authorDisplayName,
      avatarKey: r.authorAvatarKey,
    }),
    likeCount: r.likeCount,
    saveCount: r.saveCount,
    commentCount: r.commentCount,
    saved: Boolean(r.saved),
    createdAt: iso(r.createdAt),
  };
}

/* ────────────── 커서 (base64url JSON) ────────────── */

export type Cursor = { id?: number; p?: number; o?: number; t?: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!v || typeof v !== "object") return null;
    const c: Cursor = {};
    if (Number.isSafeInteger(v.id) && v.id > 0) c.id = v.id;
    if (Number.isSafeInteger(v.p)) c.p = v.p;
    if (Number.isSafeInteger(v.o) && v.o >= 0 && v.o <= 5000) c.o = v.o;
    if (typeof v.t === "string" && !Number.isNaN(Date.parse(v.t))) c.t = v.t;
    return c;
  } catch {
    return null;
  }
}
