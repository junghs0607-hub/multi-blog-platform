import type { UserRole } from "@/types";

/**
 * 요청을 보낸 인증된 사용자. 서비스 계층은 Next.js 에 의존하지 않도록 이 타입만 받습니다.
 */
export interface Viewer {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatarKey: string | null;
  role: UserRole;
}

export const isAdmin = (v: Viewer | null | undefined): boolean => v?.role === "admin";
