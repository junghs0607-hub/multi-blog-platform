"use client";

import { Bell, ChevronDown, LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { buttonClass } from "@/components/ui/button";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { SearchBarWithParams } from "./search-bar";

export const NOTIFICATIONS_READ_EVENT = "mosaic:notifications-read";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-3 text-[15px] font-semibold transition-colors",
        active ? "bg-neutral-900 text-white" : "text-neutral-900 hover:bg-neutral-100",
      )}
    >
      {children}
    </Link>
  );
}

function NotificationBell() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api<{ count: number }>("/api/notifications/unread-count");
        if (!cancelled) setCount(r.count);
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = setInterval(load, 30_000);
    const onEvent = () => void load();
    window.addEventListener("focus", onEvent);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onEvent);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onEvent);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, onEvent);
    };
  }, [pathname]);

  return (
    <Link href="/notifications" className="relative hidden rounded-full p-3 text-neutral-600 hover:bg-neutral-100 md:block" aria-label={`알림 ${count}개`}>
      <Bell className="size-6" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function UserMenu() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  if (!user) return null;

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      toast.show("로그아웃했어요.");
      router.push("/");
      router.refresh();
    }
  };

  return (
    <Dropdown
      label="계정 메뉴"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="flex items-center gap-0.5 rounded-full p-1.5 hover:bg-neutral-100" aria-label="계정 메뉴">
          <Avatar src={user.avatarUrl} name={user.displayName} size={32} />
          <ChevronDown className="hidden size-4 text-neutral-600 md:block" />
        </button>
      )}
    >
      {(close) => (
        <>
          <Link href={`/u/${user.username}`} onClick={close} className="mb-1 flex items-center gap-3 rounded-xl p-2 hover:bg-neutral-100">
            <Avatar src={user.avatarUrl} name={user.displayName} size={44} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user.displayName}</span>
              <span className="block truncate text-xs text-neutral-500">{user.email}</span>
            </span>
          </Link>
          <MenuItem href={`/u/${user.username}`} onClick={close}>
            <User className="size-4" /> 내 프로필
          </MenuItem>
          <MenuItem href="/settings" onClick={close}>
            <Settings className="size-4" /> 설정
          </MenuItem>
          {isAdmin && (
            <MenuItem href="/admin" onClick={close}>
              <Shield className="size-4" /> 관리자
            </MenuItem>
          )}
          <div className="my-1 h-px bg-neutral-100" />
          <MenuItem
            onClick={() => {
              close();
              void logout();
            }}
          >
            <LogOut className="size-4" /> 로그아웃
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-16 items-center gap-1.5 px-2 md:h-20 md:gap-2 md:px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">홈</NavLink>
          <NavLink href="/search">탐색</NavLink>
          {user && <NavLink href="/create">만들기</NavLink>}
        </nav>
        <Suspense fallback={<div className="h-11 flex-1 rounded-full bg-neutral-100 md:h-12" />}>
          <SearchBarWithParams />
        </Suspense>
        {user ? (
          <div className="flex items-center">
            <NotificationBell />
            <UserMenu />
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-1">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClass("primary", "md", "h-10 px-4 md:h-11")}>
              로그인
            </Link>
            <Link href="/signup" className={buttonClass("secondary", "md", "hidden sm:inline-flex")}>
              가입하기
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
