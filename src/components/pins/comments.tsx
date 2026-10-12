"use client";

import { MoreHorizontal, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Avatar, Spinner, TimeAgo } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, withQuery } from "@/lib/api";
import { COMMENT_MAX } from "@/lib/constants";
import type { CommentItem, Page } from "@/types";
import { ReportDialog } from "./report-dialog";

export function CommentSection({
  pinId,
  initialCount,
  onCountChange,
}: {
  pinId: number;
  initialCount: number;
  onCountChange?: (n: number) => void;
}) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportId, setReportId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Page<CommentItem>>(withQuery(`/api/pins/${pinId}/comments`, { limit: 20 }))
      .then((p) => {
        if (cancelled) return;
        setItems(p.items);
        setCursor(p.nextCursor);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pinId]);

  const changeCount = (n: number) => {
    setCount(n);
    onCountChange?.(n);
  };

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const p = await api<Page<CommentItem>>(withQuery(`/api/pins/${pinId}/comments`, { cursor, limit: 20 }));
      setItems((prev) => [...(prev ?? []), ...p.items]);
      setCursor(p.nextCursor);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const post = async () => {
    if (!requireAuth() || !body.trim()) return;
    setPosting(true);
    try {
      const { comment } = await api<{ comment: CommentItem }>(`/api/pins/${pinId}/comments`, { body: { body } });
      setItems((prev) => [...(prev ?? []), comment]);
      changeCount(count + 1);
      setBody("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (id: number) => {
    try {
      const { comment } = await api<{ comment: CommentItem }>(`/api/comments/${id}`, { method: "PATCH", body: { body: editBody } });
      setItems((prev) => (prev ?? []).map((c) => (c.id === id ? comment : c)));
      setEditingId(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    try {
      const r = await api<{ commentCount: number }>(`/api/comments/${id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((c) => c.id !== id));
      changeCount(r.commentCount);
      toast.success("댓글을 삭제했어요.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">댓글 {count > 0 && <span className="text-neutral-500">{count}</span>}</h2>

      <div className="mt-3 space-y-4">
        {items === null ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="group flex gap-3">
              <Link href={`/u/${c.author.username}`}>
                <Avatar src={c.author.avatarUrl} name={c.author.displayName} size={32} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <Link href={`/u/${c.author.username}`} className="text-sm font-semibold hover:underline">
                    {c.author.displayName}
                  </Link>
                  <TimeAgo date={c.createdAt} className="text-xs text-neutral-500" />
                  {c.updatedAt !== c.createdAt && <span className="text-xs text-neutral-400">(수정됨)</span>}
                </div>
                {editingId === c.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editBody}
                      maxLength={COMMENT_MAX}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full rounded-xl border-2 border-neutral-200 p-2 text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveEdit(c.id)} disabled={!editBody.trim()}>
                        저장
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[15px] whitespace-pre-line text-neutral-800">{c.body}</p>
                )}
              </div>
              {user && editingId !== c.id && (
                <Dropdown
                  label="댓글 메뉴"
                  trigger={({ toggle }) => (
                    <button type="button" onClick={toggle} className="h-fit rounded-full p-1.5 text-neutral-500 opacity-60 hover:bg-neutral-100 group-hover:opacity-100" aria-label="댓글 메뉴">
                      <MoreHorizontal className="size-4" />
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      {c.canEdit && (
                        <MenuItem
                          onClick={() => {
                            close();
                            setEditBody(c.body);
                            setEditingId(c.id);
                          }}
                        >
                          수정
                        </MenuItem>
                      )}
                      {c.canDelete && (
                        <MenuItem
                          danger
                          onClick={() => {
                            close();
                            void remove(c.id);
                          }}
                        >
                          삭제
                        </MenuItem>
                      )}
                      {c.author.id !== user.id && (
                        <MenuItem
                          onClick={() => {
                            close();
                            setReportId(c.id);
                          }}
                        >
                          신고
                        </MenuItem>
                      )}
                    </>
                  )}
                </Dropdown>
              )}
            </div>
          ))
        )}
        {cursor && (
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={() => void loadMore()}>
            댓글 더 보기
          </Button>
        )}
      </div>

      <div className="sticky bottom-0 mt-5 flex items-end gap-2 border-t border-neutral-100 bg-white pt-4">
        {user && <Avatar src={user.avatarUrl} name={user.displayName} size={40} />}
        <div className="relative flex-1">
          <textarea
            value={body}
            rows={1}
            maxLength={COMMENT_MAX}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => requireAuth()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void post();
              }
            }}
            placeholder={user ? "댓글 추가" : "로그인하고 댓글을 남겨보세요"}
            className="block max-h-32 min-h-12 w-full resize-none rounded-3xl bg-neutral-100 py-3 pr-12 pl-4 text-[15px] focus:bg-white focus:ring-2 focus:ring-neutral-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void post()}
            disabled={!body.trim() || posting}
            className="absolute right-2 bottom-2 rounded-full bg-brand p-2 text-white transition disabled:bg-neutral-300"
            aria-label="댓글 등록"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>

      {reportId !== null && <ReportDialog open onClose={() => setReportId(null)} targetType="comment" targetId={reportId} />}
    </section>
  );
}
