import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PinDetailView } from "@/components/pins/pin-detail";
import { PinFeed } from "@/components/pins/pin-feed";
import { getViewer } from "@/server/auth/session";
import { getPinDetail } from "@/server/services/pins";
import { getProfile } from "@/server/services/users";

type Params = Promise<{ id: string }>;

const loadPin = cache(async (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return getPinDetail(id, await getViewer());
});

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : undefined;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pin = await loadPin((await params).id);
  if (!pin) return { title: "핀을 찾을 수 없습니다" };
  const base = await origin();
  const image = base ? new URL(pin.image.mediumUrl, base).toString() : pin.image.mediumUrl;
  return {
    title: pin.title,
    description: pin.description?.slice(0, 160) ?? `${pin.author.displayName}님의 핀`,
    robots: pin.visibility === "private" || pin.status !== "active" ? { index: false } : undefined,
    openGraph: {
      title: pin.title,
      description: pin.description?.slice(0, 160) ?? undefined,
      images: [{ url: image, width: pin.image.mediumWidth, height: pin.image.mediumHeight }],
    },
    twitter: { card: "summary_large_image", title: pin.title, images: [image] },
  };
}

export default async function PinPage({ params }: { params: Params }) {
  const { id } = await params;
  const pin = await loadPin(id);
  if (!pin) notFound();
  const author = await getProfile(pin.author.username, await getViewer());

  return (
    <div className="pb-8">
      <PinDetailView key={pin.id} pin={pin} authorFollowerCount={author?.followerCount ?? 0} />
      <section className="mt-10 px-2 md:px-4">
        <h2 className="mb-4 text-center text-xl font-semibold">더 둘러보기</h2>
        <PinFeed key={`related-${pin.id}`} url={`/api/pins/${pin.id}/related`} emptyTitle="관련 핀이 없어요" />
      </section>
    </div>
  );
}
