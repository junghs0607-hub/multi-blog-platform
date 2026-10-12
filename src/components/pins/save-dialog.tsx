"use client";

import { Check, Lock, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Switch } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Board, BoardOption } from "@/types";

/**
 * 핀을 내 보드에 저장/저장 취소 (여러 보드에 동시에 저장 가능) + 새 보드 만들기
 */
export function SaveDialog({
  pinId,
  pinTitle,
  open,
  onClose,
  onChange,
}: {
  pinId: number;
  pinTitle?: string;
  open: boolean;
  onClose: () => void;
  /** 하나 이상의 보드에 저장되어 있는지, 저장된 보드 ID 목록 */
  onChange?: (savedAny: boolean, savedBoardIds: number[]) => void;
}) {
  const toast = useToast();
  const [boards, setBoards] = useState<BoardOption[] | null>(null);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrivate, setNewPrivate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api<{ items: BoardOption[] }>(`/api/pins/${pinId}/boards`)
      .then((r) => {
        if (!cancelled) setBoards(r.items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, pinId, toast]);

  const emit = (next: BoardOption[]) => {
    const ids = next.filter((b) => b.saved).map((b) => b.id);
    onChange?.(ids.length > 0, ids);
  };

  const toggle = async (board: BoardOption) => {
    setBusyId(board.id);
    try {
      if (board.saved) await api(`/api/boards/${board.id}/pins/${pinId}`, { method: "DELETE" });
      else await api(`/api/boards/${board.id}/pins`, { body: { pinId } });
      const next = (boards ?? []).map((b) =>
        b.id === board.id ? { ...b, saved: !b.saved, pinCount: b.pinCount + (b.saved ? -1 : 1) } : b,
      );
      setBoards(next);
      emit(next);
      toast.success(board.saved ? `'${board.name}'에서 저장을 취소했어요.` : `'${board.name}'에 저장했어요.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const createAndSave = async () => {
    if (!newName.trim()) return;
    setCreateBusy(true);
    try {
      const { board } = await api<{ board: Board }>("/api/boards", {
        body: { name: newName.trim(), visibility: newPrivate ? "private" : "public" },
      });
      await api(`/api/boards/${board.id}/pins`, { body: { pinId } });
      const created: BoardOption = { id: board.id, name: board.name, visibility: board.visibility, pinCount: 1, coverUrl: null, saved: true };
      const next = [created, ...(boards ?? [])];
      setBoards(next);
      emit(next);
      setCreating(false);
      setNewName("");
      setNewPrivate(false);
      toast.success(`새 보드 '${board.name}'에 저장했어요.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const filtered = (boards ?? []).filter((b) => b.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title={creating ? "보드 만들기" : "보드에 저장"} size="sm">
      {creating ? (
        <div className="space-y-4 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder='예: "여행 가고 싶은 곳"'
            maxLength={50}
            data-autofocus
            onKeyDown={(e) => e.key === "Enter" && void createAndSave()}
          />
          <Switch checked={newPrivate} onChange={setNewPrivate} label="비공개 보드" description="나만 볼 수 있어요" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              취소
            </Button>
            <Button onClick={() => void createAndSave()} loading={createBusy} disabled={!newName.trim()}>
              만들고 저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pinTitle && <p className="truncate text-sm text-neutral-500">{pinTitle}</p>}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="보드 검색" className="h-11 pl-10" />
          </div>
          <div className="-mx-2 max-h-80 overflow-y-auto">
            {boards === null ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">{boards.length ? "검색 결과가 없어요." : "아직 보드가 없어요. 첫 보드를 만들어보세요!"}</p>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => void toggle(b)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-100 disabled:opacity-60"
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                    {b.coverUrl && <img src={b.coverUrl} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{b.name}</span>
                      {b.visibility === "private" && <Lock className="size-3.5 shrink-0 text-neutral-500" />}
                    </span>
                    <span className="text-xs text-neutral-500">핀 {b.pinCount}개</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold",
                      b.saved ? "bg-neutral-900 text-white" : "bg-brand text-white opacity-0 group-hover:opacity-100 max-md:opacity-100",
                    )}
                  >
                    {b.saved ? (
                      <span className="flex items-center gap-1">
                        <Check className="size-4" /> 저장됨
                      </span>
                    ) : (
                      "저장"
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left font-semibold hover:bg-neutral-100"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-neutral-200">
              <Plus className="size-5" />
            </span>
            보드 만들기
          </button>
        </div>
      )}
    </Modal>
  );
}
