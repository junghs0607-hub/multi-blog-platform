"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/types";
import { ToastProvider } from "./ui/toast";

interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, isAdmin: false });

/**
 * 로그인 사용자는 서버(루트 레이아웃)에서 세션 쿠키로 조회하여 내려줍니다.
 * 로그인/로그아웃/프로필 변경 후에는 router.refresh() 로 서버 컴포넌트를 다시 렌더링합니다.
 */
export function Providers({ initialUser, children }: { initialUser: SessionUser | null; children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: initialUser, isAdmin: initialUser?.role === "admin" }}>
      <ToastProvider>{children}</ToastProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** 로그인이 필요한 동작 전에 호출: 비로그인 시 로그인 페이지로 이동하고 false 반환 */
export function useRequireAuth() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (user) return true;
    router.push(`/login?next=${encodeURIComponent(pathname || "/")}`);
    return false;
  }, [user, router, pathname]);
}
