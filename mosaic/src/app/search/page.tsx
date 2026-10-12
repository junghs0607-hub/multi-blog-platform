import { Hash } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buildHref, ChipLinks, TabLinks } from "@/components/layout/chips";
import { PinFeed } from "@/components/pins/pin-feed";
import { Avatar } from "@/components/ui/misc";
import { withQuery } from "@/lib/api";
import { getViewer } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { popularTags } from "@/server/services/tags";
import { searchUsers } from "@/server/services/users";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** 기본 분석기(basic)가 생성하는 색상 태그 */
const COLOR_TAGS = [
  { name: "빨강", hex: "#e53935" },
  { name: "주황", hex: "#fb8c00" },
  { name: "노랑", hex: "#fdd835" },
  { name: "초록", hex: "#43a047" },
  { name: "청록", hex: "#00897b" },
  { name: "파랑", hex: "#1e88e5" },
  { name: "보라", hex: "#8e24aa" },
  { name: "분홍", hex: "#f06292" },
  { name: "갈색", hex: "#795548" },
  { name: "검정", hex: "#212121" },
  { name: "흰색", hex: "#fafafa" },
  { name: "회색", hex: "#9e9e9e" },
];
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim().slice(0, 100) : "");

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = str(sp.q);
  const tag = str(sp.tag);
  return { title: q ? `'${q}' 검색` : tag ? `#${tag}` : "탐색" };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = str(sp.q);
  const tag = str(sp.tag).replace(/^#/, "");
  const [viewer, categories] = await Promise.all([getViewer(), listCategories()]);
  const category = categories.some((c) => c.slug === sp.category) ? str(sp.category) : "";
  const defaultSort = q ? "relevance" : "popular";
  const sort = ["relevance", "latest", "popular"].includes(str(sp.sort)) ? str(sp.sort) : defaultSort;
  const effectiveSort = sort === "relevance" && !q ? "popular" : sort;

  const [people, tags] = await Promise.all([q ? searchUsers(q, viewer, 8) : Promise.resolve([]), popularTags(24, { userOnly: true })]);
  const url = withQuery("/api/pins", { q, tag, category, sort: effectiveSort });
  const base = { q: q || undefined, tag: tag || undefined, category: category || undefined };

  return (
    <div className="px-2 md:px-4">
      <div className="mx-auto max-w-5xl pt-2 pb-4 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">
          {q ? (
            <>
              <span className="text-brand">&lsquo;{q}&rsquo;</span> 검색 결과
            </>
          ) : tag ? (
            <span className="inline-flex items-center gap-1">
              <Hash className="size-7 text-brand" />
              {tag}
            </span>
          ) : (
            "탐색"
          )}
        </h1>
        {!q && !tag && <p className="mt-2 text-neutral-500">인기 태그와 카테고리에서 새로운 영감을 찾아보세요.</p>}
      </div>

      {!q && (
        <section className="mx-auto mb-6 max-w-4xl text-center">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">색상으로 찾기 · AI 이미지 분석</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {COLOR_TAGS.map((c) => (
              <Link
                key={c.name}
                href={`/search?tag=${encodeURIComponent(c.name)}`}
                className={`flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold ring-1 transition ${tag === c.name ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white ring-neutral-200 hover:bg-neutral-50"}`}
              >
                <span className="size-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!q && !tag && (
        <div className="mx-auto mb-6 flex max-w-4xl flex-wrap justify-center gap-2">
          {tags.map((t) => (
            <Link key={t.name} href={`/search?tag=${encodeURIComponent(t.name)}`} className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold hover:bg-neutral-200">
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {people.length > 0 && (
        <section className="mx-auto mb-6 max-w-5xl">
          <h2 className="mb-3 px-1 text-lg font-semibold">사용자</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {people.map((u) => (
              <Link key={u.id} href={`/u/${u.username}`} className="flex w-36 shrink-0 flex-col items-center rounded-3xl bg-neutral-50 p-4 text-center hover:bg-neutral-100">
                <Avatar src={u.avatarUrl} name={u.displayName} size={72} />
                <span className="mt-2 w-full truncate font-semibold">{u.displayName}</span>
                <span className="w-full truncate text-xs text-neutral-500">@{u.username}</span>
                <span className="mt-1 text-xs text-neutral-500">팔로워 {u.followerCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="sticky top-16 z-30 -mx-2 mb-3 bg-white/95 px-2 pt-1 pb-2 backdrop-blur md:top-20 md:-mx-4 md:px-4">
        <TabLinks
          className="mb-2"
          items={[
            ...(q ? [{ href: buildHref("/search", { ...base, sort: "relevance" }), label: "관련도순", active: effectiveSort === "relevance" }] : []),
            { href: buildHref("/search", { ...base, sort: "popular" }), label: "인기순", active: effectiveSort === "popular" },
            { href: buildHref("/search", { ...base, sort: "latest" }), label: "최신순", active: effectiveSort === "latest" },
          ]}
        />
        <ChipLinks
          items={[
            { href: buildHref("/search", { ...base, category: undefined, sort }), label: "전체", active: !category },
            ...categories.map((c) => ({
              href: buildHref("/search", { ...base, category: c.slug, sort }),
              label: c.name,
              active: category === c.slug,
            })),
          ]}
        />
      </div>

      <PinFeed
        key={url}
        url={url}
        emptyTitle="검색 결과가 없어요"
        emptyDescription="다른 검색어나 카테고리를 선택해보세요. 태그는 #태그 형식으로 검색할 수 있어요."
      />
    </div>
  );
}
