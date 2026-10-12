"use client";

import { LayoutGrid, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { Board } from "@/types";
import { BoardCard } from "./board-card";
import { BoardFormDialog } from "./board-form-dialog";

export function ProfileBoards({ boards, isMe }: { boards: Board[]; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  return (
    <div>
      {isMe && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setFormKey((k) => k + 1);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> 보드 만들기
          </Button>
        </div>
      )}
      {boards.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-8" />}
          title={isMe ? "아직 보드가 없어요" : "공개된 보드가 없어요"}
          description={isMe ? "보드를 만들고 마음에 드는 핀을 모아보세요." : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {boards.map((b) => (
            <BoardCard key={b.id} board={b} />
          ))}
        </div>
      )}
      <BoardFormDialog
        key={formKey}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(board) => {
          setOpen(false);
          router.push(`/boards/${board.id}`);
        }}
      />
    </div>
  );
}
