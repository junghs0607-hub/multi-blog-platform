import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BoardHeader } from "@/components/boards/board-header";
import { PinFeed } from "@/components/pins/pin-feed";
import { buttonClass } from "@/components/ui/button";
import { getViewer } from "@/server/auth/session";
import { getBoard } from "@/server/services/boards";

type Params = Promise<{ id: string }>;

const loadBoard = cache(async (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return getBoard(id, await getViewer());
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const board = await loadBoard((await params).id);
  if (!board) return { title: "보드를 찾을 수 없습니다" };
  return {
    title: `${board.name} · ${board.owner.displayName}`,
    description: board.description ?? undefined,
    robots: board.visibility === "private" ? { index: false } : undefined,
  };
}

export default async function BoardPage({ params }: { params: Params }) {
  const board = await loadBoard((await params).id);
  // 비공개 보드는 소유자/관리자 외에는 404 (존재 여부 비노출)
  if (!board) notFound();

  return (
    <div className="pb-10">
      <BoardHeader key={`${board.id}-${board.updatedAt}`} board={board} />
      <div className="px-2 md:px-4">
        <PinFeed
          key={`board-${board.id}`}
          url={`/api/boards/${board.id}/pins`}
          removableBoardId={board.isOwner ? board.id : undefined}
          emptyTitle="아직 저장된 핀이 없어요"
          emptyDescription={board.isOwner ? "홈 피드에서 마음에 드는 핀을 찾아 이 보드에 저장해보세요." : undefined}
          emptyAction={
            board.isOwner ? (
              <Link href="/" className={buttonClass("primary")}>
                핀 둘러보기
              </Link>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
