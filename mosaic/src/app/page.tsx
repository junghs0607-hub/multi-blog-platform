import Link from "next/link";
import { buildHref, ChipLinks, TabLinks } from "@/components/layout/chips";
import { PinFeed } from "@/components/pins/pin-feed";
import { buttonClass } from "@/components/ui/button";
import { withQuery } from "@/lib/api";
import { getViewer } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [viewer, categories] = await Promise.all([getViewer(), listCategories()]);

  const feed = sp.feed === "following" && viewer ? "following" : "all";
  const sort = sp.sort === "popular" ? "popular" : "latest";
  const category = typeof sp.category === "string" && categories.some((c) => c.slug === sp.category) ? sp.category : undefined;
  const url = withQuery("/api/pins", { feed, sort, category });

  const tabParams = (p: { feed?: string; sort?: string }) => ({ category, ...p });

  return (
    <div className="px-2 md:px-4">
      {!viewer && (
        <section className="mx-auto mb-6 max-w-4xl rounded-[32px] bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 px-6 py-10 text-center md:py-14">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">다음 영감을 찾아보세요</h1>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600 md:text-lg">
            인테리어, 레시피, 여행지까지. 마음에 드는 이미지를 발견하고 나만의 보드에 모아보세요.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/signup" className={buttonClass("primary", "lg")}>
              무료로 가입하기
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              로그인
            </Link>
          </div>
        </section>
      )}

      <div className="sticky top-16 z-30 -mx-2 mb-3 bg-white/95 px-2 pt-1 pb-2 backdrop-blur md:top-20 md:-mx-4 md:px-4">
        <TabLinks
          className="mb-2"
          items={[
            { href: buildHref("/", tabParams({})), label: "최신", active: feed === "all" && sort === "latest" },
            { href: buildHref("/", tabParams({ sort: "popular" })), label: "인기", active: feed === "all" && sort === "popular" },
            ...(viewer
              ? [{ href: buildHref("/", tabParams({ feed: "following" })), label: "팔로잉", active: feed === "following" }]
              : []),
          ]}
        />
        <ChipLinks
          items={[
            { href: buildHref("/", { feed: feed === "following" ? feed : undefined, sort: sort === "popular" ? sort : undefined }), label: "전체", active: !category },
            ...categories.map((c) => ({
              href: buildHref("/", { feed: feed === "following" ? feed : undefined, sort: sort === "popular" ? sort : undefined, category: c.slug }),
              label: c.name,
              active: category === c.slug,
            })),
          ]}
        />
      </div>

      <PinFeed
        key={url}
        url={url}
        emptyTitle={feed === "following" ? "팔로잉 피드가 비어 있어요" : "아직 핀이 없어요"}
        emptyDescription={feed === "following" ? "관심 있는 사용자를 팔로우하면 새 핀이 이곳에 표시돼요." : "첫 번째 핀을 올려보세요!"}
        emptyAction={
          viewer ? (
            <Link href={feed === "following" ? "/search" : "/create"} className={buttonClass("primary")}>
              {feed === "following" ? "사용자 찾아보기" : "핀 만들기"}
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
