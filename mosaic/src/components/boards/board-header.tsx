"use client";

import { Flag, Lock, MoreHorizontal, Pencil, Share } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportDialog } from "@/components/pins/report-dialog";
import { ShareDialog } from "@/components/pins/share-dialog";
import { useAuth, useRequireAuth } from "@/components/providers";
import { buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import type { Board } from "@/types";
import { BoardFormDialog } from "./board-form-dialog";

export function BoardHeader({ board }: { board: Board }) {
  const { user, isAdmin } = useAuth();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/api/boards/${board.id}`, { method: "DELETE" });
      toast.success("보드를 삭제했어요.");
      router.push(`/u/${board.owner.username}?tab=saved`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-6 text-center md:pt-8">
      <h1 className="flex items-center justify-center gap-2 text-3xl font-bold md:text-4xl">
        {board.name}
        {board.visibility === "private" && <Lock className="size-6 text-neutral-500" aria-label="비공개 보드" />}
      </h1>
      {board.description && <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-neutral-600">{board.description}</p>}
      <Link href={`/u/${board.owner.username}`} className="mt-4 inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-neutral-100">
        <Avatar src={board.owner.avatarUrl} name={board.owner.displayName} size={32} />
        <span className="font-medium">{board.owner.displayName}</span>
      </Link>
      <p className="mt-1 text-sm text-neutral-500">
        핀 {board.pinCount}개{board.visibility === "private" ? " · 비공개 보드 (나만 보기)" : ""}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => setShareOpen(true)} className={buttonClass("secondary", "icon")} aria-label="보드 공유">
          <Share className="size-5" />
        </button>
        {board.isOwner && (
          <button type="button" onClick={() => setEditOpen(true)} className={buttonClass("secondary", "md")}>
            <Pencil className="size-4" /> 보드 수정
          </button>
        )}
        {!board.isOwner && user && (
          <Dropdown
            label="보드 메뉴"
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} className={buttonClass("secondary", "icon")} aria-label="더보기">
                <MoreHorizontal className="size-5" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  onClick={() => {
                    close();
                    if (requireAuth()) setReportOpen(true);
                  }}
                >
                  <Flag className="size-4" /> 보드 신고
                </MenuItem>
                {isAdmin && (
                  <MenuItem
                    danger
                    onClick={() => {
                      close();
                      setDeleteOpen(true);
                    }}
                  >
                    보드 삭제 (관리자)
                  </MenuItem>
                )}
              </>
            )}
          </Dropdown>
        )}
      </div>

      <BoardFormDialog
        key={`${board.id}-${board.updatedAt}`}
        open={editOpen}
        board={board}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          router.refresh();
        }}
        onDelete={() => {
          setEditOpen(false);
          setDeleteOpen(true);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        loading={deleting}
        danger
        title="보드를 삭제할까요?"
        description="보드와 저장 목록이 삭제됩니다. 보드에 저장된 핀 자체는 삭제되지 않아요."
        confirmLabel="삭제"
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} path={`/boards/${board.id}`} title={board.name} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="board" targetId={board.id} />
    </div>
  );
}
