/**
 * 서버(API)와 클라이언트가 공유하는 DTO 타입.
 * 날짜는 JSON 직렬화를 위해 ISO 문자열로 전달합니다.
 */

export type Visibility = "public" | "private";
export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";
export type PinStatus = "active" | "hidden";
export type TagSource = "user" | "ai";
export type NotificationType = "follow" | "like" | "comment" | "save" | "system";
export type ReportTarget = "pin" | "comment" | "user" | "board";
export type ReportReason =
  | "spam"
  | "nudity"
  | "violence"
  | "hate"
  | "harassment"
  | "copyright"
  | "misinformation"
  | "other";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** 로그인한 사용자 (클라이언트 AuthContext) */
export interface SessionUser extends UserSummary {
  email: string;
  role: UserRole;
}

export interface UserProfile extends UserSummary {
  bio: string | null;
  websiteUrl: string | null;
  followerCount: number;
  followingCount: number;
  pinCount: number;
  createdAt: string;
  isMe: boolean;
  isFollowing: boolean;
}

export interface FollowUserItem extends UserSummary {
  bio: string | null;
  followerCount: number;
  isFollowing: boolean;
  isMe: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

export interface PinImage {
  thumbUrl: string;
  mediumUrl: string;
  width: number;
  height: number;
  dominantColor: string | null;
  isAnimated: boolean;
}

export interface PinCard {
  id: number;
  title: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  visibility: Visibility;
  image: PinImage;
  author: UserSummary;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  /** 현재 사용자가 자신의 보드 중 하나 이상에 저장했는지 */
  saved: boolean;
  createdAt: string;
}

export interface PinTag {
  name: string;
  source: TagSource;
  confidence: number | null;
}

export interface PaletteColor {
  hex: string;
  ratio: number;
  name?: string;
}

export interface PinDetail extends PinCard {
  description: string | null;
  status: PinStatus;
  category: Category | null;
  tags: PinTag[];
  shareCount: number;
  updatedAt: string;
  image: PinImage & {
    originalUrl: string;
    downloadUrl: string;
    mediumWidth: number;
    mediumHeight: number;
    sizeBytes: number;
    mimeType: string;
    format: string;
  };
  palette: PaletteColor[];
  viewer: {
    liked: boolean;
    savedBoardIds: number[];
    isOwner: boolean;
    isFollowingAuthor: boolean;
    canModerate: boolean;
  };
}

export interface Board {
  id: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  pinCount: number;
  owner: UserSummary;
  coverUrls: string[];
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
}

/** 핀 저장 다이얼로그용 내 보드 목록 */
export interface BoardOption {
  id: number;
  name: string;
  visibility: Visibility;
  pinCount: number;
  coverUrl: string | null;
  saved: boolean;
}

export interface CommentItem {
  id: number;
  body: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  actor: UserSummary | null;
  pin: { id: number; title: string; thumbUrl: string } | null;
  board: { id: number; name: string } | null;
  comment: { id: number; body: string } | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TagSuggestion {
  name: string;
  usageCount: number;
}

export interface SimilarCandidate {
  pinId: number;
  title: string;
  thumbUrl: string;
  distance: number;
}

export interface UploadConfig {
  maxBytes: number;
  allowedMimeTypes: string[];
  minDimension: number;
  maxDimension: number;
}

/** API 에러 응답 형식 */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
