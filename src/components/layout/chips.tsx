import Link from "next/link";
import { cn } from "@/lib/utils";

/** 가로 스크롤 칩 목록 (카테고리/정렬 필터) */
export function ChipLinks({ items, className }: { items: { href: string; label: string; active: boolean }[]; className?: string }) {
  return (
    <div className={cn("scrollbar-none -mx-2 flex gap-2 overflow-x-auto px-2 py-1", className)}>
      {items.map((it) => (
        <Link
          key={it.href + it.label}
          href={it.href}
          scroll={false}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
            it.active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

/** 밑줄 탭 */
export function TabLinks({ items, className }: { items: { href: string; label: string; active: boolean }[]; className?: string }) {
  return (
    <div className={cn("flex justify-center gap-2", className)}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          scroll={false}
          className={cn(
            "relative px-3 py-2 text-[15px] font-semibold",
            it.active ? "text-neutral-900 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-neutral-900" : "text-neutral-500 hover:text-neutral-900",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function buildHref(base: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
