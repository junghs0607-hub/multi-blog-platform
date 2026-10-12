"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, Spinner } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import type { FollowUserItem } from "@/types";
import { FollowButton } from "./follow-button";

export function FollowListDialog({
  open,
  onClose,
  kind,
  username,
}: {
  open: boolean;
  onClose: () => void;
  kind: "followers" | "following";
  username: string;
}) {
  const list = useInfiniteList<FollowUserItem>(`/api/users/${username}/${kind}`, 30);

  return (
    <Modal open={open} onClose={onClose} title={kind === "followers" ? "팔로워" : "팔로잉"} size="sm">
      {!list.loaded ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : list.items.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">{kind === "followers" ? "아직 팔로워가 없어요." : "아직 팔로우하는 사람이 없어요."}</p>
      ) : (
        <ul className="-mx-2">
          {list.items.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-50">
              <Link href={`/u/${u.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={u.avatarUrl} name={u.displayName} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{u.displayName}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    @{u.username} · 팔로워 {u.followerCount}
                  </span>
                </span>
              </Link>
              {!u.isMe && <FollowButton size="sm" username={u.username} initialFollowing={u.isFollowing} />}
            </li>
          ))}
        </ul>
      )}
      {list.loaded && !list.done && (
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" size="sm" onClick={() => void list.loadMore()}>
            더 보기
          </Button>
        </div>
      )}
    </Modal>
  );
}
