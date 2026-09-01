"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Platform = "NAVER" | "TISTORY";

type PublishState = {
  id: number;
  platform: Platform;
  status: "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "SCHEDULED" | "CANCELLED";
  externalUrl: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  accountLabel: string | null;
};

type Account = {
  id: number;
  platform: Platform;
  label: string;
  sessionStatus: string | null;
  isActive: boolean;
};

const PLATFORM_META: Record<Platform, { label: string; icon: string; color: string }> = {
  NAVER: { label: "Naver Blog", icon: "🟢", color: "text-green-700 bg-green-50 border-green-200" },
  TISTORY: { label: "Tistory", icon: "🟠", color: "text-orange-700 bg-orange-50 border-orange-200" },
};

const STATUS_META: Record<PublishState["status"], { label: string; className: string; icon: string }> = {
  PENDING: { label: "대기 중", className: "bg-gray-100 text-gray-600", icon: "⏳" },
  PUBLISHING: { label: "발행 중", className: "bg-blue-100 text-blue-700 animate-pulse", icon: "🔄" },
  PUBLISHED: { label: "발행 완료", className: "bg-green-100 text-green-700", icon: "✓" },
  FAILED: { label: "발행 실패", className: "bg-red-100 text-red-700", icon: "⚠" },
  SCHEDULED: { label: "예약됨", className: "bg-purple-100 text-purple-700", icon: "📅" },
  CANCELLED: { label: "취소됨", className: "bg-gray-100 text-gray-400", icon: "—" },
};

/**
 * Drop-in panel for the editor. Purely additive: when no articleId exists yet
 * it simply tells the author to save first, and never blocks the normal flow.
 */
export function ExternalPublishPanel({ articleId }: { articleId: number | null }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Platform[]>([]);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [states, setStates] = useState<PublishState[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStates = useCallback(async () => {
    if (!articleId) return;
    try {
      const response = await fetch(`/api/publish?articleId=${articleId}`);
      const data = await response.json();
      setStates(data.states || []);
    } catch {
      // Status polling must never surface as a blocking error.
    }
  }, [articleId]);

  useEffect(() => {
    fetch("/api/publish/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // Poll while a job is in flight so the operator sees live progress.
  useEffect(() => {
    const active = states.some((s) => s.status === "PUBLISHING" || s.status === "PENDING");
    if (!active) return;
    const timer = setInterval(loadStates, 4000);
    return () => clearInterval(timer);
  }, [states, loadStates]);

  const togglePlatform = (platform: Platform) => {
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const submit = async () => {
    if (!articleId) {
      setNotice("게시글을 먼저 저장한 뒤 외부 발행을 요청하세요.");
      return;
    }
    if (selected.length === 0) {
      setNotice("발행할 플랫폼을 선택하세요.");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      setNotice("예약 시간을 입력하세요.");
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          platforms: selected,
          visibility,
          scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "발행 요청에 실패했습니다.");
        return;
      }
      setStates(data.states || []);
      setNotice(data.warning || (mode === "schedule" ? "예약 발행이 등록되었습니다." : "발행 작업을 시작했습니다."));
    } catch {
      setNotice("발행 요청 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const retry = async (publishId: number) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/publish/${publishId}`, { method: "POST" });
      const data = await response.json();
      if (data.warning) setNotice(data.warning);
      await loadStates();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (publishId: number) => {
    setBusy(true);
    try {
      await fetch(`/api/publish/${publishId}`, { method: "DELETE" });
      await loadStates();
    } finally {
      setBusy(false);
    }
  };

  const accountFor = (platform: Platform) => accounts.find((a) => a.platform === platform && a.isActive);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <button onClick={() => setOpen(!open)} className="font-bold text-sm flex items-center gap-2 w-full text-left">
        🌐 외부 플랫폼 발행
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        {states.length > 0 && (
          <span className="ml-auto flex gap-1">
            {states.map((s) => (
              <span key={s.id} className={`px-2 py-0.5 rounded-full text-[11px] ${STATUS_META[s.status].className}`}>
                {PLATFORM_META[s.platform].label.split(" ")[0]} {STATUS_META[s.status].icon}
              </span>
            ))}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {!articleId && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              게시글을 저장하면 외부 플랫폼 발행을 요청할 수 있습니다.
            </p>
          )}

          {/* Platform selection */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-400">발행 대상</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                <input type="checkbox" checked readOnly className="accent-green-500" />
                <span className="text-sm font-medium text-green-800">현재 블로그 (BlogHub)</span>
                <span className="ml-auto text-xs text-green-600">기본 발행</span>
              </label>

              {(Object.keys(PLATFORM_META) as Platform[]).map((platform) => {
                const account = accountFor(platform);
                return (
                  <label
                    key={platform}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                      selected.includes(platform) ? PLATFORM_META[platform].color : "border-gray-200 bg-white"
                    } ${account ? "cursor-pointer" : "opacity-60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                      disabled={!account}
                      className="accent-green-500"
                    />
                    <span className="text-sm font-medium">
                      {PLATFORM_META[platform].icon} {PLATFORM_META[platform].label}
                    </span>
                    <span className="ml-auto text-xs">
                      {account ? (
                        <span className="text-gray-500">{account.label}</span>
                      ) : (
                        <Link href="/admin?tab=publish" className="text-blue-600 hover:underline">
                          계정 등록 필요
                        </Link>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Mode */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-400">발행 방식</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} className="accent-green-500" />
                  즉시 발행
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="accent-green-500" />
                  예약 발행
                </label>
              </div>
              {mode === "schedule" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-400">외부 공개 설정</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} className="accent-green-500" />
                  공개
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} className="accent-green-500" />
                  비공개
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy || !articleId}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "처리 중..." : "🌐 외부 플랫폼 발행"}
          </button>

          {notice && <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">{notice}</p>}

          {/* Results */}
          {states.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase text-gray-400">발행 결과</p>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                <span className="font-medium">내 블로그</span>
                <span className="text-green-600">✓ 발행 완료</span>
              </div>
              {states.map((state) => (
                <div key={state.id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">
                      {PLATFORM_META[state.platform].icon} {PLATFORM_META[state.platform].label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_META[state.status].className}`}>
                      {STATUS_META[state.status].icon} {STATUS_META[state.status].label}
                    </span>
                    {state.retryCount > 0 && <span className="text-[11px] text-gray-400">재시도 {state.retryCount}회</span>}
                    <span className="ml-auto flex gap-2">
                      {state.externalUrl && (
                        <a
                          href={state.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          {state.platform === "NAVER" ? "네이버 글 보기" : "티스토리 글 보기"}
                        </a>
                      )}
                      {(state.status === "FAILED" || state.status === "CANCELLED") && (
                        <button
                          onClick={() => retry(state.id)}
                          disabled={busy}
                          className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                        >
                          재발행
                        </button>
                      )}
                      {(state.status === "SCHEDULED" || state.status === "PENDING") && (
                        <button
                          onClick={() => cancel(state.id)}
                          disabled={busy}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          취소
                        </button>
                      )}
                    </span>
                  </div>
                  {state.scheduledAt && state.status === "SCHEDULED" && (
                    <p className="mt-1 text-xs text-purple-600">
                      예약: {new Date(state.scheduledAt).toLocaleString("ko-KR")}
                    </p>
                  )}
                  {state.errorMessage && (
                    <p className="mt-1 text-xs text-red-500">
                      [{state.errorCode}] {state.errorMessage.slice(0, 160)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
