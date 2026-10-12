"use client";

import { Eye, EyeOff, Flag, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Spinner, TimeAgo } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminPinItem } from "@/types/admin";
import { Badge, PageTitle, Pagination, useAdminList, useDebounced } from "./shared";

const FILTERS = [
  { value: "", label: "전체" },
  { value: "active", label: "게시 중" },
  { value: "hidden", label: "숨김" },
  { value: "private", label: "비공개" },
  { value: "reported", label: "신고 접수" },
];

export function AdminPins() {
  const toast = useToast();
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(qInput, 300, () => setPage(1));
  const [status, setStatus] = useState("");
  const { result, loading, reload } = useAdminList<AdminPinItem>("/api/admin/pins", { q, status, page, pageSize: 24 });
  const [target, setTarget] = useState<{ pin: AdminPinItem; action: "hide" | "delete" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const restore = async (pin: AdminPinItem) => {
    try {
      await api(`/api/admin/pins/${pin.id}`, { method: "PATCH", body: { status: "active" } });
      toast.success("핀을 다시 공개했어요.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (target.action === "hide") {
        await api(`/api/admin/pins/${target.pin.id}`, { method: "PATCH", body: { status: "hidden", reason: reason || undefined } });
        toast.success("핀을 숨김 처리했어요. 작성자에게 알림이 발송됩니다.");
      } else {
        await api(`/api/admin/pins/${target.pin.id}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
        toast.success("핀을 삭제했어요.");
      }
      setTarget(null);
      setReason("");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="이미지(핀) 관리" description="부적절한 핀을 숨기거나 삭제합니다. 숨김 처리된 핀은 작성자와 관리자만 볼 수 있어요." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400" />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="제목·태그·설명 검색 또는 핀 ID" className="pl-10" />
        </div>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", status === f.value ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-200 hover:bg-neutral-100")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !result ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : result && result.items.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">조건에 맞는 핀이 없어요.</p>
      ) : (
        <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6", loading && "opacity-50")}>
          {result?.items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-100">
              <Link href={`/pins/${p.id}`} className="relative block aspect-square bg-neutral-100">
                <img src={p.thumbUrl} alt={p.title} className={cn("size-full object-cover", p.status === "hidden" && "opacity-40 grayscale")} loading="lazy" />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {p.status === "hidden" && <Badge tone="red">숨김</Badge>}
                  {p.visibility === "private" && <Badge>비공개</Badge>}
                  {p.pendingReports > 0 && (
                    <Badge tone="amber">
                      <Flag className="mr-1 size-3" />
                      신고 {p.pendingReports}
                    </Badge>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="truncate text-xs text-neutral-500">
                  #{p.id} · @{p.author.username} · <TimeAgo date={p.createdAt} />
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  좋아요 {p.likeCount} · 저장 {p.saveCount} · 댓글 {p.commentCount}
                </p>
                <div className="mt-2 flex gap-1.5">
                  {p.status === "hidden" ? (
                    <Button size="sm" variant="secondary" className="h-8 flex-1 px-2" onClick={() => void restore(p)}>
                      <Eye className="size-3.5" /> 복구
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="h-8 flex-1 px-2" onClick={() => setTarget({ pin: p, action: "hide" })}>
                      <EyeOff className="size-3.5" /> 숨김
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-red-600 hover:bg-red-50" onClick={() => setTarget({ pin: p, action: "delete" })} aria-label="삭제">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {result && <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} />}

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={() => void confirm()}
        loading={busy}
        danger={target?.action === "delete"}
        title={target?.action === "delete" ? "핀을 삭제할까요?" : "핀을 숨길까요?"}
        description={`"${target?.pin.title ?? ""}" — 처리 사유는 작성자에게 알림으로 전달됩니다.`}
        confirmLabel={target?.action === "delete" ? "삭제" : "숨김 처리"}
      >
        <Input className="mt-4" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (선택) 예: 저작권 침해 신고 접수" maxLength={500} />
      </ConfirmDialog>
    </div>
  );
}
