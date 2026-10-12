"use client";

import { Flag, Link2, MoreHorizontal, Share } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReportDialog } from "@/components/pins/report-dialog";
import { ShareDialog } from "@/components/pins/share-dialog";
import { useAuth, useRequireAuth } from "@/components/providers";
import { buttonClass } from "@/components/ui/button";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/misc";
import { formatCount } from "@/lib/utils";
import type { UserProfile } from "@/types";
import { FollowButton } from "./follow-button";
import { FollowListDialog } from "./follow-list-dialog";

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [followers, setFollowers] = useState(profile.followerCount);
  const [listKind, setListKind] = useState<"followers" | "following" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-4 text-center md:pt-8">
      <Avatar src={profile.avatarUrl} name={profile.displayName} size={120} className="shadow-sm" />
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">{profile.displayName}</h1>
      <p className="mt-1 text-sm text-neutral-500">@{profile.username}</p>
      {profile.bio && <p className="mt-3 max-w-lg whitespace-pre-line text-neutral-700">{profile.bio}</p>}
      {profile.websiteUrl && (
        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 flex items-center gap-1 text-sm font-semibold hover:underline">
          <Link2 className="size-4" />
          {profile.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      )}
      <div className="mt-3 flex items-center gap-1 text-[15px]">
        <button type="button" onClick={() => setListKind("followers")} className="rounded-full px-2 py-1 hover:bg-neutral-100">
          팔로워 <strong>{formatCount(followers)}</strong>명
        </button>
        <span className="text-neutral-400">·</span>
        <button type="button" onClick={() => setListKind("following")} className="rounded-full px-2 py-1 hover:bg-neutral-100">
          팔로잉 <strong>{formatCount(profile.followingCount)}</strong>명
        </button>
        <span className="text-neutral-400">·</span>
        <span className="px-2">
          핀 <strong>{formatCount(profile.pinCount)}</strong>개
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <button type="button" onClick={() => setShareOpen(true)} className={buttonClass("secondary", "icon")} aria-label="프로필 공유">
          <Share className="size-5" />
        </button>
        {profile.isMe ? (
          <Link href="/settings" className={buttonClass("secondary", "lg")}>
            프로필 수정
          </Link>
        ) : (
          <FollowButton size="lg" username={profile.username} initialFollowing={profile.isFollowing} onChange={(_, n) => setFollowers(n)} />
        )}
        {!profile.isMe && user && (
          <Dropdown
            label="프로필 메뉴"
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} className={buttonClass("secondary", "icon")} aria-label="더보기">
                <MoreHorizontal className="size-5" />
              </button>
            )}
          >
            {(close) => (
              <MenuItem
                onClick={() => {
                  close();
                  if (requireAuth()) setReportOpen(true);
                }}
              >
                <Flag className="size-4" /> 사용자 신고
              </MenuItem>
            )}
          </Dropdown>
        )}
      </div>

      {listKind && (
        <FollowListDialog key={listKind} open kind={listKind} username={profile.username} onClose={() => setListKind(null)} />
      )}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} path={`/u/${profile.username}`} title={`${profile.displayName}님의 Mosaic`} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={profile.id} />
    </div>
  );
}
