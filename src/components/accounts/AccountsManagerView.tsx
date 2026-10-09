"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { Account, AccountType } from "@/types/asset";
import { formatKRW } from "@/lib/utils";
import { Landmark, Plus, Trash2, Edit, ShieldCheck, Wallet, ChevronRight } from "lucide-react";

export function AccountsManagerView() {
  const { accounts, assets, addAccount, updateAccount, deleteAccount, isPrivateMode } = useAsset();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BROKERAGE");
  const [provider, setProvider] = useState("토스증권");
  const [accountNumber, setAccountNumber] = useState("");
  const [isTaxAdvantaged, setIsTaxAdvantaged] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    addAccount({
      name,
      type,
      provider,
      accountNumber,
      balanceKRW: 0,
      isTaxAdvantaged,
      icon: type === "CRYPTO_EXCHANGE" ? "🪙" : type === "ISA" ? "🌱" : type === "PENSION" ? "🛡️" : "🏦",
    });

    setIsModalOpen(false);
    setName("");
    setAccountNumber("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Landmark className="w-4 h-4" />
              다중 투자계좌 & 금융기관 관리
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              증권사 · ISA · 연금저축 · 은행 · 코인 거래소 통합 관리
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              계좌별 자산 현황과 절세계좌 혜택을 구분하여 한곳에서 체계적으로 관리합니다.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>새 계좌 등록</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const accountAssets = assets.filter((a) => a.accountId === acc.id);
          const totalValuation = accountAssets.reduce((sum, a) => sum + a.valuationKRW, 0);

          return (
            <div
              key={acc.id}
              className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4 hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-2xl">
                    {acc.icon || "🏦"}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                      {acc.name}
                    </h3>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {acc.provider} {acc.accountNumber ? `· ${acc.accountNumber}` : ""}
                    </div>
                  </div>
                </div>

                {acc.isTaxAdvantaged && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    절세계좌
                  </span>
                )}
              </div>

              {/* Valuation */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <div className="text-[11px] font-bold text-gray-400 uppercase">보유 자산 평가액</div>
                <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                  {isPrivateMode ? "•••" : formatKRW(totalValuation)}
                </div>
                <div className="text-xs text-blue-500 font-semibold mt-1">
                  {accountAssets.length}개 종목/자산 보유 중
                </div>
              </div>

              {/* Asset Names Preview */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase">포함된 자산</div>
                <div className="flex flex-wrap gap-1">
                  {accountAssets.slice(0, 4).map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-750 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                    >
                      {a.name}
                    </span>
                  ))}
                  {accountAssets.length > 4 && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-750 text-[11px] text-gray-400">
                      +{accountAssets.length - 4}개
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    if (confirm(`'${acc.name}' 계좌를 삭제하시겠습니까?`)) {
                      deleteAccount(acc.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              새로운 금융 계좌 등록
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 font-bold mb-1">계좌 별칭 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 토스증권 메인계좌, 미래에셋 ISA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">계좌 유형</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as AccountType);
                    if (e.target.value === "ISA" || e.target.value === "PENSION" || e.target.value === "IRP") {
                      setIsTaxAdvantaged(true);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  <option value="BROKERAGE">일반 증권위탁계좌</option>
                  <option value="ISA">ISA (개인종합자산관리계좌)</option>
                  <option value="PENSION">연금저축펀드</option>
                  <option value="IRP">개인형 퇴직연금 (IRP)</option>
                  <option value="BANK">은행 예적금 통장</option>
                  <option value="CRYPTO_EXCHANGE">가상자산 거래소</option>
                  <option value="WALLET">개인지갑 (메타마스크/레저)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">금융기관 / 거래소명</label>
                <input
                  type="text"
                  placeholder="예: 토스증권, 미래에셋, 키움증권, 업비트, 신한은행"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">계좌번호 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 720-91-882910"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="taxAdvCheck"
                  checked={isTaxAdvantaged}
                  onChange={(e) => setIsTaxAdvantaged(e.target.checked)}
                  className="rounded accent-blue-600"
                />
                <label htmlFor="taxAdvCheck" className="text-gray-700 dark:text-gray-300 font-bold">
                  절세계좌 (비과세 및 세액공제 혜택 계좌)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  계좌 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
