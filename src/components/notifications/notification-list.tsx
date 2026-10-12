"use client";

import { Bell, CheckCheck, Heart, Megaphone, MessageCircle, Pin, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NOTIFICATIONS_READ_EVENT } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, Spinner, TimeAgo } from "@/components/ui/misc";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { useIntersection } from "@/hooks/use-intersection";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const ICONS = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  save: Pin,
  system: Megaphone,
} as const;

function describe(n: NotificationItem) {
  const name = <strong className="font-semibold">{n.actor?.displayName ?? "알 수 없음"}</strong>;
  switch (n.type) {
    case "follow":
      return <>{name}님이 회원님을 팔로우하기 시작했습니다.</>;
    case "like":
      return <>{name}님이 회원님의 핀 &lsquo;{n.pin?.title}&rsquo;을(를) 좋아합니다.</>;
    case "comment":
      return (
        <>
          {name}님이 댓글을 남겼습니다: <span className="text-neutral-600">&ldquo;{n.comment?.body}&rdquo;</span>
        </>
      );
    case "save":
      return (
        <>
          {name}님이 회원님의 핀을 {n.board ? <>&lsquo;{n.board.name}&rsquo; 보드에</> : "보드에"} 저장했습니다.
        </>
      );
    default:
      return <>{n.message}</>;
  }
}

function hrefOf(n: NotificationItem) {
  if (n.pin) return `/pins/${n.pin.id}`;
  if (n.type === "follow" && n.actor) return `/u/${n.actor.username}`;
  return null;
}

export function NotificationList() {
  const list = useInfiniteList<NotificationItem>("/api/notifications", 20);
  const sentinelRef = useIntersection<HTMLDivElement>(list.loadMore, list.loaded && !list.done && !list.error, "400px", list.items.length);
  const [allRead, setAllRead] = useState(false);
  const markedRef = useRef(false);

  // 첫 페이지를 본 뒤 모두 읽음 처리 (읽지 않았던 항목은 강조 표시 유지)
  useEffect(() => {
    if (!list.loaded || markedRef.current) return;
    if (!list.items.some((n) => !n.readAt)) return;
    markedRef.current = true;
    void api("/api/notifications/read", { body: { all: true } })
      .then(() => window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT)))
      .catch(() => undefined);
  }, [list.loaded, list.items]);

  const markAll = async () => {
    await api("/api/notifications/read", { body: { all: true } }).catch(() => undefined);
    setAllRead(true);
    window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  };

  if (!list.loaded) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (list.items.length === 0) {
    return <EmptyState icon={<Bell className="size-8" />} title="새로운 알림이 없어요" description="팔로우, 좋아요, 댓글, 저장 소식이 여기에 표시돼요." />;
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => void markAll()}>
          <CheckCheck className="size-4" /> 모두 읽음
        </Button>
      </div>
      <ul className="space-y-1">
        {list.items.map((n) => {
          const Icon = ICONS[n.type];
          const href = hrefOf(n);
          const unread = !n.readAt && !allRead;
          const body = (
            <div className={cn("flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-neutral-50", unread && "bg-rose-50/70 hover:bg-rose-50")}>
              <div className="relative">
                {n.actor ? (
                  <Avatar src={n.actor.avatarUrl} name={n.actor.displayName} size={48} />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-full bg-neutral-900 text-white">
                    <Megaphone className="size-5" />
                  </span>
                )}
                <span className="absolute -right-1 -bottom-1 rounded-full bg-white p-1 shadow">
                  <Icon className={cn("size-3.5", n.type === "like" ? "fill-brand text-brand" : "text-neutral-700")} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] leading-snug">{describe(n)}</p>
                <TimeAgo date={n.createdAt} className="text-xs text-neutral-500" />
              </div>
              {n.pin && <img src={n.pin.thumbUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />}
              {unread && <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label="읽지 않음" />}
            </div>
          );
          return <li key={n.id}>{href ? <Link href={href}>{body}</Link> : body}</li>;
        })}
      </ul>
      {!list.done && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
    </div>
  );
}
