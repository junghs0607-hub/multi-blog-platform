"use client";

import {
  ArrowUpRight,
  Download,
  EyeOff,
  Flag,
  Heart,
  Lock,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Share,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useRequireAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Avatar, TimeAgo } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { FollowButton } from "@/components/users/follow-button";
import { api, errorMessage } from "@/lib/api";
import { cn, formatBytes, formatCount } from "@/lib/utils";
import type { PinDetail } from "@/types";
import { CommentSection } from "./comments";
import { ReportDialog } from "./report-dialog";
import { SaveDialog } from "./save-dialog";
import { ShareDialog } from "./share-dialog";

export function PinDetailView({ pin, authorFollowerCount }: { pin: PinDetail; authorFollowerCount: number }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const toast = useToast();

  const [liked, setLiked] = useState(pin.viewer.liked);
  const [likeCount, setLikeCount] = useState(pin.likeCount);
  const [savedIds, setSavedIds] = useState(pin.viewer.savedBoardIds);
  const [followers, setFollowers] = useState(authorFollowerCount);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const toggleLike = async () => {
    if (!requireAuth() || likeBusy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setLikeBusy(true);
    try {
      const r = await api<{ liked: boolean; likeCount: number }>(`/api/pins/${pin.id}/like`, { method: next ? "POST" : "DELETE" });
      setLiked(r.liked);
      setLikeCount(r.likeCount);
    } catch (err) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error(errorMessage(err));
    } finally {
      setLikeBusy(false);
    }
  };

  const deletePin = async () => {
    setDeleting(true);
    try {
      await api(`/api/pins/${pin.id}`, { method: "DELETE" });
      toast.success("핀을 삭제했어요.");
      router.push(`/u/${pin.author.username}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  const ratio = pin.image.height / pin.image.width;
  const isOwner = pin.viewer.isOwner;
  const userTags = pin.tags.filter((t) => t.source === "user");
  const aiTags = pin.tags.filter((t) => t.source === "ai");

  return (
    <div className="mx-auto max-w-[1016px] md:px-4 md:pt-2">
      {pin.status === "hidden" && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-0">
          <EyeOff className="size-4 shrink-0" /> 운영 정책에 따라 숨김 처리된 핀입니다. 작성자와 관리자만 볼 수 있어요.
        </div>
      )}
      <article className="overflow-hidden bg-white md:grid md:grid-cols-2 md:rounded-[32px] md:shadow-[0_1px_24px_rgba(0,0,0,0.12)]">
        {/* 이미지 */}
        <div className="relative bg-neutral-50 md:p-4">
          <div
            className="relative overflow-hidden md:rounded-3xl"
            style={{ backgroundColor: pin.image.dominantColor ?? "#eee", aspectRatio: `1 / ${Math.min(ratio, 3)}` }}
          >
            <img
              src={pin.image.mediumUrl}
              alt={pin.title}
              className={cn("absolute inset-0 size-full", ratio > 3 ? "object-cover object-top" : "object-contain")}
            />
          </div>
          <a
            href={pin.image.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold shadow hover:bg-white md:bottom-7 md:left-7"
          >
            <Maximize2 className="size-3.5" /> 원본 보기
          </a>
        </div>

        {/* 정보 */}
        <div className="flex flex-col px-4 pt-4 pb-6 md:px-8 md:pt-6">
          <div className="sticky top-16 z-10 -mx-4 flex items-center justify-between gap-2 bg-white px-4 py-2 md:static md:mx-0 md:px-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void toggleLike()}
                className="flex items-center gap-1.5 rounded-full px-3 py-3 font-semibold hover:bg-neutral-100"
                aria-pressed={liked}
                aria-label="좋아요"
              >
                <Heart className={cn("size-6 transition", liked ? "fill-brand text-brand" : "text-neutral-800")} />
                {likeCount > 0 && <span className="text-sm">{formatCount(likeCount)}</span>}
              </button>
              <button type="button" onClick={() => setShareOpen(true)} className="rounded-full p-3 hover:bg-neutral-100" aria-label="공유">
                <Share className="size-6" />
              </button>
              <Dropdown
                align="left"
                label="핀 메뉴"
                trigger={({ toggle }) => (
                  <button type="button" onClick={toggle} className="rounded-full p-3 hover:bg-neutral-100" aria-label="더보기">
                    <MoreHorizontal className="size-6" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <a href={pin.image.downloadUrl} onClick={close} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium hover:bg-neutral-100">
                      <Download className="size-4" /> 원본 이미지 다운로드
                    </a>
                    {isOwner && (
                      <MenuItem href={`/pins/${pin.id}/edit`} onClick={close}>
                        <Pencil className="size-4" /> 핀 수정
                      </MenuItem>
                    )}
                    {(isOwner || pin.viewer.canModerate) && (
                      <MenuItem
                        danger
                        onClick={() => {
                          close();
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" /> 핀 삭제
                      </MenuItem>
                    )}
                    {!isOwner && (
                      <MenuItem
                        onClick={() => {
                          close();
                          if (requireAuth()) setReportOpen(true);
                        }}
                      >
                        <Flag className="size-4" /> 핀 신고
                      </MenuItem>
                    )}
                  </>
                )}
              </Dropdown>
            </div>
            <Button
              size="lg"
              variant={savedIds.length ? "dark" : "primary"}
              onClick={() => requireAuth() && setSaveOpen(true)}
            >
              {savedIds.length ? `저장됨${savedIds.length > 1 ? ` (${savedIds.length})` : ""}` : "저장"}
            </Button>
          </div>

          {pin.sourceUrl && pin.sourceDomain && (
            <a
              href={pin.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-3 flex w-fit items-center gap-1 text-sm font-medium text-neutral-700 underline-offset-2 hover:underline"
            >
              <ArrowUpRight className="size-4" /> {pin.sourceDomain}
            </a>
          )}

          <h1 className="mt-3 text-2xl leading-tight font-bold md:text-[28px]">{pin.title}</h1>
          {pin.visibility === "private" && (
            <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
              <Lock className="size-3.5" /> 비공개 핀 · 나만 볼 수 있어요
            </p>
          )}
          {pin.description && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-neutral-800">{pin.description}</p>}

          {(userTags.length > 0 || aiTags.length > 0 || pin.category) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {pin.category && (
                <Link href={`/?category=${pin.category.slug}`} className="rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
                  {pin.category.name}
                </Link>
              )}
              {userTags.map((t) => (
                <Link key={t.name} href={`/search?tag=${encodeURIComponent(t.name)}`} className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium hover:bg-neutral-200">
                  #{t.name}
                </Link>
              ))}
              {aiTags.map((t) => (
                <Link
                  key={t.name}
                  href={`/search?tag=${encodeURIComponent(t.name)}`}
                  title={`AI 자동 태그 (신뢰도 ${Math.round((t.confidence ?? 0) * 100)}%)`}
                  className="flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100"
                >
                  <Sparkles className="size-3.5" /> {t.name}
                </Link>
              ))}
            </div>
          )}

          {pin.palette.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">색상 팔레트</h2>
              <div className="flex overflow-hidden rounded-xl">
                {pin.palette.map((c) => (
                  <div key={c.hex + c.ratio} className="group relative h-9" style={{ backgroundColor: c.hex, flexGrow: Math.max(c.ratio, 0.04) }} title={`${c.name ?? ""} ${c.hex} · ${Math.round(c.ratio * 100)}%`} />
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-neutral-500">
            {pin.image.width}×{pin.image.height} · {pin.image.format.toUpperCase()} · {formatBytes(pin.image.sizeBytes)} · 저장 {pin.saveCount} · 공유 {pin.shareCount} ·{" "}
            <TimeAgo date={pin.createdAt} />
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Link href={`/u/${pin.author.username}`} className="flex min-w-0 items-center gap-3">
              <Avatar src={pin.author.avatarUrl} name={pin.author.displayName} size={48} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{pin.author.displayName}</span>
                <span className="block text-sm text-neutral-500">팔로워 {formatCount(followers)}명</span>
              </span>
            </Link>
            {!isOwner && user?.id !== pin.author.id && (
              <FollowButton username={pin.author.username} initialFollowing={pin.viewer.isFollowingAuthor} onChange={(_, n) => setFollowers(n)} />
            )}
          </div>

          <CommentSection pinId={pin.id} initialCount={pin.commentCount} />
        </div>
      </article>

      <SaveDialog pinId={pin.id} pinTitle={pin.title} open={saveOpen} onClose={() => setSaveOpen(false)} onChange={(_, ids) => setSavedIds(ids)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} path={`/pins/${pin.id}`} title={pin.title} pinId={pin.id} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="pin" targetId={pin.id} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void deletePin()}
        loading={deleting}
        danger
        title="핀을 삭제할까요?"
        description="삭제한 핀은 복구할 수 없으며, 다른 사용자의 보드에서도 사라집니다."
        confirmLabel="삭제"
      />
    </div>
  );
}
