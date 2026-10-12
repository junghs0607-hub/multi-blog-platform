import type {
  PinStatus,
  ReportReason,
  ReportStatus,
  ReportTarget,
  UserRole,
  UserStatus,
  UserSummary,
  Visibility,
} from "./index";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  totals: {
    users: number;
    suspendedUsers: number;
    admins: number;
    pins: number;
    hiddenPins: number;
    privatePins: number;
    boards: number;
    comments: number;
    likes: number;
    pendingReports: number;
    images: number;
    storageBytes: number;
    pendingJobs: number;
    failedJobs: number;
  };
  last7d: { users: number; pins: number };
  daily: { day: string; users: number; pins: number }[];
  topTags: { name: string; usageCount: number }[];
}

export interface AdminUserItem extends UserSummary {
  email: string;
  role: UserRole;
  status: UserStatus;
  pinCount: number;
  followerCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminPinItem {
  id: number;
  title: string;
  status: PinStatus;
  visibility: Visibility;
  thumbUrl: string;
  author: UserSummary;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  pendingReports: number;
  createdAt: string;
}

export interface AdminReportTarget {
  exists: boolean;
  label: string;
  url: string | null;
  thumbUrl: string | null;
  owner: UserSummary | null;
  state: string | null;
}

export interface AdminReportItem {
  id: number;
  targetType: ReportTarget;
  targetId: number;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: UserSummary | null;
  resolvedBy: UserSummary | null;
  target: AdminReportTarget;
  pendingForTarget: number;
}

export interface AdminAuditLogItem {
  id: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details: unknown;
  admin: UserSummary | null;
  createdAt: string;
}
