"use client";

import { useEffect, useState } from "react";

type Platform = "NAVER" | "TISTORY";

type Account = {
  id: number;
  platform: Platform;
  label: string;
  loginId: string | null;
  profileDir: string;
  blogAddress: string | null;
  defaultCategory: string | null;
  sessionStatus: string | null;
  sessionMessage: string | null;
  sessionCheckedAt: string | null;
  isActive: boolean;
};

const PLATFORM_INFO: Record<Platform, { label: string; icon: string; addressLabel: string; hint: string }> = {
  NAVER: {
    label: "Naver Blog",
    icon: "🟢",
    addressLabel: "네이버 블로그 ID",
    hint: "blog.naver.com/<ID> 의 ID 부분",
  },
  TISTORY: {
    label: "Tistory",
    icon: "🟠",
    addressLabel: "티스토리 주소",
    hint: "<주소>.tistory.com 의 주소 부분",
  },
};

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  READY: { dot: "bg-green-500", text: "text-green-700", label: "정상 (글쓰기 가능)" },
  LOGGED_IN: { dot: "bg-yellow-500", text: "text-yellow-700", label: "로그인됨" },
  LOGIN_REQUIRED: { dot: "bg-red-500", text: "text-red-700", label: "로그인 필요" },
  UNKNOWN: { dot: "bg-gray-300", text: "text-gray-500", label: "확인 안 됨" },
};

export function PublishAccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    platform: "NAVER" as Platform,
    label: "",
    loginId: "",
    blogAddress: "",
    defaultCategory: "",
  });

  const load = async () => {
    try {
      const response = await fetch("/api/publish/accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addAccount = async () => {
    if (!form.blogAddress.trim()) {
      setNotice(`${PLATFORM_INFO[form.platform].addressLabel}을(를) 입력하세요.`);
      return;
    }
    setBusyId(-1);
    try {
      const response = await fetch("/api/publish/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "계정 등록에 실패했습니다.");
        return;
      }
      setForm({ platform: form.platform, label: "", loginId: "", blogAddress: "", defaultCategory: "" });
      setNotice("계정이 등록되었습니다. [로그인 갱신]으로 브라우저 세션을 만드세요.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const runSession = async (accountId: number, action: "test" | "login") => {
    setBusyId(accountId);
    setNotice(action === "login" ? "브라우저 창에서 로그인을 완료하세요. (최대 3분 대기)" : "세션을 확인하는 중입니다...");
    try {
      const response = await fetch("/api/publish/accounts/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action }),
      });
      const data = await response.json();
      setNotice(`${data.success ? "✅" : "⚠️"} ${data.message || data.error || "결과 없음"}`);
      await load();
    } catch {
      setNotice("세션 처리 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const removeAccount = async (accountId: number) => {
    if (!confirm("계정을 삭제할까요? 저장된 브라우저 프로필은 서버에 남습니다.")) return;
    setBusyId(accountId);
    try {
      await fetch(`/api/publish/accounts?id=${accountId}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">외부 블로그 계정</h2>
        <p className="mt-1 text-sm text-gray-500">
          계정마다 독립된 브라우저 프로필을 사용합니다. 비밀번호는 저장하지 않으며, 로그인 세션만 프로필에 보관됩니다.
        </p>
      </div>

      {notice && <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}

      {/* Registered accounts */}
      {loading ? (
        <div className="h-24 skeleton rounded-2xl" />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-400">
          등록된 외부 계정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const status = STATUS_STYLE[account.sessionStatus || "UNKNOWN"] || STATUS_STYLE.UNKNOWN;
            return (
              <div key={account.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg">{PLATFORM_INFO[account.platform].icon}</span>
                  <div className="min-w-0">
                    <p className="font-bold">{PLATFORM_INFO[account.platform].label}</p>
                    <p className="text-xs text-gray-500">
                      {account.label}
                      {account.blogAddress ? ` · ${account.blogAddress}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                      <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => runSession(account.id, "test")}
                    disabled={busyId !== null}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    {busyId === account.id ? "확인 중..." : "세션 테스트"}
                  </button>
                  <button
                    onClick={() => runSession(account.id, "login")}
                    disabled={busyId !== null}
                    className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    로그인 갱신
                  </button>
                  <button
                    onClick={() => removeAccount(account.id)}
                    disabled={busyId !== null}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    삭제
                  </button>
                  <span className="ml-auto font-mono text-[11px] text-gray-400">
                    browser-profiles/{account.profileDir}
                  </span>
                </div>

                {account.sessionMessage && (
                  <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{account.sessionMessage}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add account */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-bold">계정 추가</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">플랫폼</label>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <option value="NAVER">Naver Blog</option>
              <option value="TISTORY">Tistory</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">계정 이름</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 메인 계정"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {PLATFORM_INFO[form.platform].addressLabel}
            </label>
            <input
              type="text"
              value={form.blogAddress}
              onChange={(e) => setForm({ ...form, blogAddress: e.target.value })}
              placeholder={PLATFORM_INFO[form.platform].hint}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">기본 카테고리 (선택)</label>
            <input
              type="text"
              value={form.defaultCategory}
              onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })}
              placeholder="외부 블로그의 카테고리명"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          비밀번호는 입력하지 않습니다. 등록 후 [로그인 갱신]을 눌러 브라우저에서 직접 로그인하면 세션이 프로필에 저장됩니다.
        </p>

        <button
          onClick={addAccount}
          disabled={busyId !== null}
          className="mt-4 rounded-xl bg-green-500 px-5 py-3 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          계정 등록
        </button>
      </div>

      {/* Worker guide */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
        <h3 className="mb-2 font-bold">Publisher Worker 실행</h3>
        <p className="mb-3 text-gray-600">
          외부 발행은 별도 프로세스에서 처리됩니다. 예약 발행을 사용하려면 워커를 상시 실행하세요.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
{`npx playwright install chromium   # 최초 1회
npm run publisher:worker          # 상시 워커 (예약 발행 처리)
npm run publisher:tick            # 1회 실행`}
        </pre>
      </div>
    </div>
  );
}
