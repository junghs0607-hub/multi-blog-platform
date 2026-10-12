"use client";

import { ImageOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { useIntersection } from "@/hooks/use-intersection";
import { api, errorMessage } from "@/lib/api";
import type { PinCard as PinCardType } from "@/types";
import { MasonryGrid, MasonrySkeleton } from "./masonry";
import { clampRatio, PinCard } from "./pin-card";

/**
 * 무한 스크롤 핀 피드. url 이 바뀌면 상위에서 key={url} 로 리마운트하세요.
 */
export function PinFeed({
  url,
  emptyTitle = "아직 핀이 없어요",
  emptyDescription,
  emptyAction,
  removableBoardId,
}: {
  url: string;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** 지정 시 카드에 '보드에서 제거' 버튼 표시 (보드 소유자) */
  removableBoardId?: number;
}) {
  const list = useInfiniteList<PinCardType>(url);
  const toast = useToast();
  const sentinelRef = useIntersection<HTMLDivElement>(list.loadMore, list.loaded && !list.done && !list.error, "1000px", list.items.length);

  const removeFromBoard = async (pinId: number) => {
    if (!removableBoardId) return;
    try {
      await api(`/api/boards/${removableBoardId}/pins/${pinId}`, { method: "DELETE" });
      list.removeItem(pinId);
      toast.success("보드에서 제거했어요.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (!list.loaded) return <MasonrySkeleton />;

  if (list.items.length === 0) {
    if (list.error) {
      return (
        <div className="py-16 text-center">
          <p className="text-neutral-600">{list.error}</p>
          <Button variant="secondary" className="mt-4" onClick={list.retry}>
            다시 시도
          </Button>
        </div>
      );
    }
    return <EmptyState icon={<ImageOff className="size-8" />} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div>
      <MasonryGrid
        items={list.items}
        getRatio={clampRatio}
        renderItem={(pin) => (
          <PinCard
            pin={pin}
            onSavedChange={(saved) => list.updateItem(pin.id, { saved })}
            onRemove={removableBoardId ? () => void removeFromBoard(pin.id) : undefined}
          />
        )}
      />
      {list.error ? (
        <div className="py-10 text-center">
          <p className="text-sm text-neutral-600">{list.error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={list.retry}>
            다시 시도
          </Button>
        </div>
      ) : !list.done ? (
        <div ref={sentinelRef} className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-neutral-400">모든 핀을 확인했어요 ✨</p>
      )}
    </div>
  );
}
