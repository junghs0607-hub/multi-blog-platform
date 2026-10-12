"use client";

import { Clock, Hash, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FollowUserItem, TagSuggestion } from "@/types";

const RECENT_KEY = "mosaic:recent-searches";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x !== q)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** URL 의 검색어가 바뀌면 key 로 리마운트되어 입력값이 동기화됩니다. */
export function SearchBarWithParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const q = pathname === "/search" ? (params.get("q") ?? (params.get("tag") ? `#${params.get("tag")}` : "")) : "";
  return <SearchBar key={q} initialQuery={q} />;
}

function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [tags, setTags] = useState<TagSuggestion[]>([]);
  const [people, setPeople] = useState<FollowUserItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동완성 (디바운스)
  useEffect(() => {
    if (!open) return;
    const term = q.trim().replace(/^#/, "");
    const timer = setTimeout(async () => {
      try {
        const [t, u] = await Promise.all([
          api<{ items: TagSuggestion[] }>("/api/tags", { query: { q: term, limit: 8 } }),
          term && !q.trim().startsWith("#")
            ? api<{ items: FollowUserItem[] }>("/api/users", { query: { q: term, limit: 4 } })
            : Promise.resolve({ items: [] as FollowUserItem[] }),
        ]);
        setTags(t.items);
        setPeople(u.items);
      } catch {
        /* 자동완성 실패는 무시 */
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (value: string) => {
    const term = value.trim();
    setOpen(false);
    inputRef.current?.blur();
    if (!term) return;
    pushRecent(term);
    if (term.startsWith("#") && term.length > 1) router.push(`/search?tag=${encodeURIComponent(term.slice(1))}`);
    else router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-neutral-500" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="검색 (예: 인테리어, #고양이)"
          aria-label="검색"
          className="h-11 w-full rounded-full bg-neutral-100 pr-10 pl-12 text-[15px] placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 md:h-12"
        />
        {q && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:bg-neutral-200"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          {!q.trim() && recent.length > 0 && (
            <section className="mb-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-neutral-700">최근 검색</h3>
                <button
                  type="button"
                  className="text-xs text-neutral-500 hover:underline"
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecent([]);
                  }}
                >
                  모두 지우기
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => go(r)} className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200">
                    <Clock className="size-3.5 text-neutral-500" />
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}
          {people.length > 0 && (
            <section className="mb-3">
              <h3 className="mb-1 px-1 text-sm font-semibold text-neutral-700">사용자</h3>
              {people.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/u/${u.username}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-100"
                >
                  <Avatar src={u.avatarUrl} name={u.displayName} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.displayName}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      @{u.username} · 팔로워 {u.followerCount}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}
          <section>
            <h3 className="mb-2 px-1 text-sm font-semibold text-neutral-700">{q.trim() ? "태그" : "인기 태그"}</h3>
            {tags.length === 0 ? (
              <p className="px-1 text-sm text-neutral-500">{q.trim() ? "일치하는 태그가 없어요. Enter 로 전체 검색" : "불러오는 중..."}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => go(`#${t.name}`)}
                    className={cn("flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium hover:bg-neutral-200")}
                  >
                    <Hash className="size-3.5 text-neutral-500" />
                    {t.name}
                    <span className="text-xs text-neutral-400">{t.usageCount}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
