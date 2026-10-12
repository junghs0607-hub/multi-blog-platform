"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/api";
import { BOARD_DESCRIPTION_MAX, BOARD_NAME_MAX } from "@/lib/constants";
import type { Board } from "@/types";

/** 보드 생성/수정 다이얼로그. 열 때마다 key 로 리마운트하여 초기값을 반영하세요. */
export function BoardFormDialog({
  open,
  onClose,
  board,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  board?: Board;
  onSaved: (board: Board) => void;
  onDelete?: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(board?.visibility === "private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("보드 이름을 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), description: description.trim(), visibility: isPrivate ? "private" : "public" };
      const res = board
        ? await api<{ board: Board }>(`/api/boards/${board.id}`, { method: "PATCH", body })
        : await api<{ board: Board }>("/api/boards", { body });
      toast.success(board ? "보드를 수정했어요." : `'${res.board.name}' 보드를 만들었어요.`);
      onSaved(res.board);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) setError(err.message);
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={board ? "보드 수정" : "보드 만들기"}
      footer={
        <div className="flex items-center justify-between gap-2">
          {board && onDelete ? (
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
              보드 삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={() => void submit()} loading={busy} disabled={!name.trim()}>
              {board ? "저장" : "만들기"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="이름" htmlFor="board-name" error={error}>
          <Input
            id="board-name"
            data-autofocus
            value={name}
            maxLength={BOARD_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder='예: "주말 브런치 레시피"'
            aria-invalid={Boolean(error)}
          />
        </Field>
        <Field label="설명" htmlFor="board-desc" hint={`${description.length}/${BOARD_DESCRIPTION_MAX}`}>
          <Textarea
            id="board-desc"
            value={description}
            maxLength={BOARD_DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 보드에는 어떤 핀을 모으나요?"
          />
        </Field>
        <Switch
          id="board-private"
          checked={isPrivate}
          onChange={setIsPrivate}
          label="비공개 보드"
          description="나만 볼 수 있어요. 비공개 보드에 저장해도 작성자에게 알림이 가지 않아요."
        />
      </div>
    </Modal>
  );
}
