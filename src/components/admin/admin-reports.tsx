"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Avatar, Spinner, TimeAgo } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { REPORT_REASON_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminReportItem } from "@/types/admin";
import { Badge, PageTitle, Pagination, useAdminList } from "./shared";

const TABS = [
  { value: "pending", label: "처리 대기" },
  { value: "resolved", label: "조치 완료" },
  { value: "dismissed", label: "기각" },
  { value: "", label: "전체" },
];

const TARGET_LABEL = { pin: "핀", comment: "댓글", user: "사용자", board: "보드" } as const;

const ACTIONS: Record<AdminReportItem["targetType"], { value: string; label: string }[]> = {
  pin: [
    { value: "hide_pin", label: "핀 숨김 처리" },
    { value: "suspend_user", label: "작성자 계정 정지" },
    { value: "none", label: "조치 없이 완료" },
  ],
  comment: [
    { value: "delete_comment", label: "댓글 삭제" },
    { value: "suspend_user", label: "작성자 계정 정지" },
    { value: "none", label: "조치 없이 완료" },
  ],
  user: [
    { value: "suspend_user", label: "계정 정지" },
    { value: "none", label: "조치 없이 완료" },
  ],
  board: [
    { value: "make_board_private", label: "보드 비공개 전환" },
    { value: "suspend_user", label: "소유자 계정 정지" },
    { value: "none", label: "조치 없이 완료" },
  ],
};

export function AdminReports() {
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { result, loading, reload } = useAdminList<AdminReportItem>("/api/admin/reports", { status, page, pageSize: 20 });
  const [resolving, setResolving] = useState<AdminReportItem | null>(null);
  const [action, setAction] = useState("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (r: AdminReportItem) => {
    setResolving(r);
    setAction(ACTIONS[r.targetType][0]!.value);
    setNote("");
  };

  const submit = async (decision: "resolved" | "dismissed") => {
    if (!resolving) return;
    setBusy(true);
    try {
      await api(`/api/admin/reports/${resolving.id}`, {
        method: "PATCH",
        body: { status: decision, action: decision === "resolved" ? action : "none", note },
      });
      toast.success(decision === "resolved" ? "신고를 처리했어요." : "신고를 기각했어요.");
      setResolving(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="신고 관리" description="같은 대상에 대한 대기 중인 신고는 함께 처리됩니다." />
      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", status === t.value ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-200 hover:bg-neutral-100")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !result ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : result && result.items.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">{status === "pending" ? "처리 대기 중인 신고가 없어요 🎉" : "신고 내역이 없어요."}</p>
      ) : (
        <ul className={cn("space-y-3", loading && "opacity-50")}>
          {result?.items.map((r) => (
            <li key={r.id} className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-neutral-100 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                  {r.target.thumbUrl && <img src={r.target.thumbUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue">{TARGET_LABEL[r.targetType]}</Badge>
                    <Badge tone="amber">{REPORT_REASON_LABEL[r.reason]}</Badge>
                    {r.status === "pending" && r.pendingForTarget > 1 && <Badge tone="red">누적 {r.pendingForTarget}건</Badge>}
                    {r.status === "resolved" && <Badge tone="green">조치 완료</Badge>}
                    {r.status === "dismissed" && <Badge>기각</Badge>}
                    {r.target.state && <Badge>{r.target.state}</Badge>}
                  </div>
                  <p className="mt-1 truncate font-semibold">
                    {r.target.url ? (
                      <Link href={r.target.url} target="_blank" className="inline-flex items-center gap-1 hover:underline">
                        {r.target.label} <ExternalLink className="size-3.5" />
                      </Link>
                    ) : (
                      r.target.label
                    )}
                  </p>
                  {r.details && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-600">&ldquo;{r.details}&rdquo;</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-neutral-500">
                    신고자 {r.reporter ? `@${r.reporter.username}` : "(탈퇴)"} · <TimeAgo date={r.createdAt} />
                    {r.target.owner && (
                      <>
                        {" "}
                        · 대상 소유자 <Avatar src={r.target.owner.avatarUrl} name={r.target.owner.displayName} size={16} /> @{r.target.owner.username}
                      </>
                    )}
                  </p>
                  {r.status !== "pending" && (
                    <p className="mt-1 text-xs text-neutral-500">
                      처리: {r.resolvedBy ? `@${r.resolvedBy.username}` : "-"} {r.resolvedAt && <TimeAgo date={r.resolvedAt} />}
                      {r.resolutionNote && ` · ${r.resolutionNote}`}
                    </p>
                  )}
                </div>
              </div>
              {r.status === "pending" && (
                <Button variant="dark" onClick={() => open(r)} className="shrink-0">
                  처리하기
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} />}

      <Modal
        open={resolving !== null}
        onClose={() => setResolving(null)}
        title="신고 처리"
        footer={
          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => void submit("dismissed")} disabled={busy}>
              기각
            </Button>
            <Button onClick={() => void submit("resolved")} loading={busy}>
              조치 후 완료
            </Button>
          </div>
        }
      >
        {resolving && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-neutral-50 p-4 text-sm">
              <p className="font-semibold">
                [{TARGET_LABEL[resolving.targetType]}] {resolving.target.label}
              </p>
              <p className="mt-1 text-neutral-600">
                사유: {REPORT_REASON_LABEL[resolving.reason]}
                {resolving.pendingForTarget > 1 && ` · 같은 대상 대기 신고 ${resolving.pendingForTarget}건 일괄 처리`}
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="px-1 text-sm font-medium text-neutral-700">조치</span>
              <Select value={action} onChange={(e) => setAction(e.target.value)}>
                {ACTIONS[resolving.targetType].map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5">
              <span className="px-1 text-sm font-medium text-neutral-700">처리 메모 (작성자 알림에 사유로 포함될 수 있음)</span>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="예: 저작권 침해 확인" />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
