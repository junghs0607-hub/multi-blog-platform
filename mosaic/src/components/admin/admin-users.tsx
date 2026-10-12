"use client";

import { MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Input, Select } from "@/components/ui/input";
import { Avatar, Spinner, TimeAgo } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import type { AdminUserItem } from "@/types/admin";
import { Badge, PageTitle, Pagination, useAdminList, useDebounced } from "./shared";

export function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(qInput, 300, () => setPage(1));
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const { result, loading, reload } = useAdminList<AdminUserItem>("/api/admin/users", { q, status, role, page, pageSize: 20 });
  const [toDelete, setToDelete] = useState<AdminUserItem | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = async (u: AdminUserItem, body: { role?: string; status?: string }, message: string) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body });
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${toDelete.id}`, { method: "DELETE" });
      toast.success(`@${toDelete.username} 계정을 삭제했어요.`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="사용자 관리" description="권한 변경, 계정 정지/해제, 강제 탈퇴를 처리합니다. 모든 작업은 감사 로그에 기록됩니다." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400" />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="이메일, 아이디, 이름 검색" className="pl-10" />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">모든 상태</option>
          <option value="active">정상</option>
          <option value="suspended">정지</option>
        </Select>
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">모든 권한</option>
          <option value="user">일반</option>
          <option value="admin">관리자</option>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-neutral-100">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">사용자</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">권한 / 상태</th>
              <th className="px-4 py-3 text-right font-medium">핀</th>
              <th className="px-4 py-3 text-right font-medium">팔로워</th>
              <th className="px-4 py-3 font-medium">가입 / 최근 로그인</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : result && result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-500">
                  조건에 맞는 사용자가 없어요.
                </td>
              </tr>
            ) : (
              result?.items.map((u) => (
                <tr key={u.id} className={`border-b border-neutral-50 last:border-0 ${loading ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/u/${u.username}`} className="flex items-center gap-3">
                      <Avatar src={u.avatarUrl} name={u.displayName} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{u.displayName}</span>
                        <span className="block truncate text-xs text-neutral-500">@{u.username}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                  <td className="space-x-1 px-4 py-3">
                    {u.role === "admin" ? <Badge tone="violet">관리자</Badge> : <Badge>일반</Badge>}
                    {u.status === "suspended" ? <Badge tone="red">정지</Badge> : <Badge tone="green">정상</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.pinCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.followerCount}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    <TimeAgo date={u.createdAt} />
                    <br />
                    {u.lastLoginAt ? <TimeAgo date={u.lastLoginAt} /> : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me?.id && (
                      <Dropdown
                        label="사용자 작업"
                        trigger={({ toggle }) => (
                          <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-neutral-100" aria-label="작업">
                            <MoreHorizontal className="size-4" />
                          </button>
                        )}
                      >
                        {(close) => (
                          <>
                            <MenuItem
                              onClick={() => {
                                close();
                                void patch(u, { role: u.role === "admin" ? "user" : "admin" }, u.role === "admin" ? "관리자 권한을 해제했어요." : "관리자로 지정했어요.");
                              }}
                            >
                              {u.role === "admin" ? "관리자 권한 해제" : "관리자로 지정"}
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                close();
                                void patch(u, { status: u.status === "suspended" ? "active" : "suspended" }, u.status === "suspended" ? "정지를 해제했어요." : "계정을 정지했어요. (모든 세션 로그아웃)");
                              }}
                            >
                              {u.status === "suspended" ? "정지 해제" : "계정 정지"}
                            </MenuItem>
                            <MenuItem
                              danger
                              onClick={() => {
                                close();
                                setToDelete(u);
                              }}
                            >
                              계정 삭제
                            </MenuItem>
                          </>
                        )}
                      </Dropdown>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {result && <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} />}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void remove()}
        loading={busy}
        danger
        title="계정을 삭제할까요?"
        description={`@${toDelete?.username ?? ""} 사용자의 핀, 보드, 댓글이 모두 삭제되며 복구할 수 없어요.`}
        confirmLabel="삭제"
      />
    </div>
  );
}
