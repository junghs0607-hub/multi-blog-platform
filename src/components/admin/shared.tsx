"use client";

import { ChevronLeft, ChevronRight, ClipboardList, Flag, Images, LayoutDashboard, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, withQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/admin";

const NAV = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "사용자", icon: Users },
  { href: "/admin/pins", label: "이미지(핀)", icon: Images },
  { href: "/admin/reports", label: "신고", icon: Flag },
  { href: "/admin/audit", label: "감사 로그", icon: ClipboardList },
];

export function AdminSidebar({ pendingReports }: { pendingReports: number }) {
  const pathname = usePathname();
  return (
    <aside className="border-b border-neutral-200 bg-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-5 py-4">
        <LogoMark className="size-7" />
        <span className="font-bold">Mosaic 관리자</span>
      </div>
      <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100",
              )}
            >
              <Icon className="size-4" />
              {label}
              {href === "/admin/reports" && pendingReports > 0 && (
                <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", active ? "bg-white text-neutral-900" : "bg-brand text-white")}>{pendingReports}</span>
              )}
            </Link>
          );
        })}
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-neutral-500 hover:bg-neutral-100 md:mt-6">
          <LogOut className="size-4" /> 서비스로 돌아가기
        </Link>
      </nav>
    </aside>
  );
}

/** 관리자 목록 공통 훅: 파라미터가 바뀌면 다시 조회 (로딩 상태는 요청 키 비교로 계산) */
export function useAdminList<T>(url: string, params: Record<string, string | number | undefined>) {
  const toast = useToast();
  const key = withQuery(url, params);
  const [data, setData] = useState<{ key: string; result: Paginated<T> } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<Paginated<T>>(key)
      .then((result) => {
        if (!cancelled) setData({ key, result });
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken, toast]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  return { result: data?.result ?? null, loading: !data || data.key !== key, reload };
}

/** 입력값 디바운스 (콜백 내부에서 setState) */
export function useDebounced<T>(value: T, delay = 300, onChange?: () => void) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(value);
      onChange?.();
    }, delay);
    return () => clearTimeout(t);
    // onChange 는 매 렌더 새로 생성될 수 있으므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);
  return debounced;
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 py-4 text-sm text-neutral-600">
      <span>
        총 <strong className="text-neutral-900">{total.toLocaleString()}</strong>건 · {page}/{pages} 페이지
      </span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-full p-2 hover:bg-neutral-200 disabled:opacity-30" aria-label="이전 페이지">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-full p-2 hover:bg-neutral-200 disabled:opacity-30" aria-label="다음 페이지">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "red" | "amber" | "violet" | "blue" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-sky-50 text-sky-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  );
}
