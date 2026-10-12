"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ReportReason, ReportTarget } from "@/types";

const TARGET_LABEL: Record<ReportTarget, string> = { pin: "핀", comment: "댓글", user: "사용자", board: "보드" };

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: number;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await api("/api/reports", { body: { targetType, targetId, reason, details } });
      toast.success("신고가 접수되었어요. 검토 후 조치하겠습니다.");
      setReason(null);
      setDetails("");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${TARGET_LABEL[targetType]} 신고`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => void submit()} disabled={!reason} loading={busy}>
            신고하기
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-neutral-500">신고 사유를 선택해주세요. 신고자 정보는 상대방에게 공개되지 않습니다.</p>
      <div className="space-y-1">
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-neutral-50",
              reason === r.value && "bg-neutral-100",
            )}
          >
            <input
              type="radio"
              name="report-reason"
              className="mt-1 size-4 accent-neutral-900"
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
            />
            <span>
              <span className="block font-medium">{r.label}</span>
              <span className="block text-sm text-neutral-500">{r.description}</span>
            </span>
          </label>
        ))}
      </div>
      <Textarea
        className="mt-3"
        placeholder="자세한 내용 (선택)"
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
    </Modal>
  );
}
