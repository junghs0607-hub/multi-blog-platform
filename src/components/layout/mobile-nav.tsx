"use client";

import { Bell, Home, PlusSquare, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers";
import { cn } from "@/lib/utils";

/** 모바일 하단 탭 바 (md 미만에서만 표시) */
export function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;

  const loginHref = (next: string) => `/login?next=${encodeURIComponent(next)}`;
  const items = [
    { href: "/", label: "홈", icon: Home, active: pathname === "/" },
    { href: "/search", label: "검색", icon: Search, active: pathname.startsWith("/search") },
    { href: user ? "/create" : loginHref("/create"), label: "만들기", icon: PlusSquare, active: pathname.startsWith("/create") },
    { href: user ? "/notifications" : loginHref("/notifications"), label: "알림", icon: Bell, active: pathname.startsWith("/notifications") },
    {
      href: user ? `/u/${user.username}` : loginHref("/"),
      label: "프로필",
      icon: User,
      active: Boolean(user && pathname.startsWith(`/u/${user.username}`)),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-neutral-900" : "text-neutral-500")}
            >
              <Icon className={cn("size-6", active && "stroke-[2.5]")} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
