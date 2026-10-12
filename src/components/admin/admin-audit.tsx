"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/misc";
import type { AdminAuditLogItem } from "@/types/admin";
import { Badge, PageTitle, Pagination, useAdminList } from "./shared";

const ACTION_LABEL: Record<string, string> = {
  "user.update": "사용자 변경",
  "user.delete": "사용자 삭제",
  "pin.hide": "핀 숨김",
  "pin.restore": "핀 복구",
  "pin.delete": "핀 삭제",
  "board.make_private": "보드 비공개",
  "report.resolved": "신고 조치",
  "report.dismissed": "신고 기각",
};

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const { result, loading } = useAdminList<AdminAuditLogItem>("/api/admin/audit-logs", { page, pageSize: 30 });

  return (
    <div>
      <PageTitle title="감사 로그" description="관리자가 수행한 모든 작업이 기록됩니다." />
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-neutral-100">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">시각</th>
              <th className="px-4 py-3 font-medium">관리자</th>
              <th className="px-4 py-3 font-medium">작업</th>
              <th className="px-4 py-3 font-medium">대상</th>
              <th className="px-4 py-3 font-medium">상세</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50" : ""}>
            {!result ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-500">
                  기록된 작업이 없어요.
                </td>
              </tr>
            ) : (
              result.items.map((l) => (
                <tr key={l.id} className="border-b border-neutral-50 align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{new Date(l.createdAt).toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3">{l.admin ? `@${l.admin.username}` : "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={l.action.includes("delete") ? "red" : l.action.includes("hide") ? "amber" : "neutral"}>{ACTION_LABEL[l.action] ?? l.action}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.targetType} #{l.targetId ?? "-"}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <code className="block truncate text-xs text-neutral-500" title={JSON.stringify(l.details)}>
                      {l.details ? JSON.stringify(l.details) : "-"}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {result && <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} />}
    </div>
  );
}
