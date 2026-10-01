"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAsset } from "@/context/AssetContext";
import { Transaction, TransactionType, AssetCategory } from "@/types/asset";
import { formatKRW, formatCurrency, CATEGORY_META } from "@/lib/utils";
import { TradeModal } from "@/components/modals/TradeModal";
import {
  ArrowRightLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  Download,
  Calendar,
} from "lucide-react";

export default function TransactionsPage() {
  const { transactions, deleteTransaction, isPrivateMode } = useAsset();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !t.assetName.toLowerCase().includes(q) &&
          !t.code?.toLowerCase().includes(q) &&
          !t.notes?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, searchQuery]);

  // Aggregate stats
  const totalBuyKRW = filteredTransactions
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.amountKRW, 0);

  const totalSellKRW = filteredTransactions
    .filter((t) => t.type === "SELL")
    .reduce((sum, t) => sum + t.amountKRW, 0);

  const totalIncomeKRW = filteredTransactions
    .filter((t) => t.type === "DIVIDEND" || t.type === "DISTRIBUTION" || t.type === "RENT" || t.type === "INTEREST" || t.type === "STAKING_REWARD")
    .reduce((sum, t) => sum + t.amountKRW, 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <ArrowRightLeft className="w-4 h-4" />
                통합 거래내역 원장 (Transaction Ledger)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                매수 · 매도 · 배당수령 · 월세 · 환전 통합 기록
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                모든 자산의 거래 내역과 수수료, 세금을 투명하고 정확하게 기록 관리합니다.
              </p>
            </div>

            <button
              onClick={() => setIsTradeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>거래 기록하기</span>
            </button>
          </div>

          {/* 3 Summary Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-gray-400">총 매수 금액</div>
              <div className="text-base sm:text-lg font-black text-rose-300 mt-1">
                {isPrivateMode ? "•••" : formatKRW(totalBuyKRW)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-gray-400">총 매도 회수액</div>
              <div className="text-base sm:text-lg font-black text-blue-300 mt-1">
                {isPrivateMode ? "•••" : formatKRW(totalSellKRW)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-gray-400">총 수령 배당/이자/월세</div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                +{isPrivateMode ? "•••" : formatKRW(totalIncomeKRW)}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-850 rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
              {[
                { id: "ALL", label: "전체" },
                { id: "BUY", label: "매수" },
                { id: "SELL", label: "매도" },
                { id: "DIVIDEND", label: "배당금" },
                { id: "DISTRIBUTION", label: "분배금" },
                { id: "RENT", label: "월세" },
                { id: "INTEREST", label: "이자" },
                { id: "STAKING_REWARD", label: "스테이킹" },
                { id: "TRANSFER", label: "자산이동" },
                { id: "FX_EXCHANGE", label: "환전" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                    typeFilter === f.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="종목명, 메모 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">일시</th>
                  <th className="py-3 px-3">구분</th>
                  <th className="py-3 px-3">자산명 / 종목</th>
                  <th className="py-3 px-3">수량 / 단가</th>
                  <th className="py-3 px-3">총 금액 (원화)</th>
                  <th className="py-3 px-3">계좌</th>
                  <th className="py-3 px-3">메모</th>
                  <th className="py-3 px-4 text-right">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                          tx.type === "BUY"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : tx.type === "SELL"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {tx.type === "BUY"
                          ? "매수"
                          : tx.type === "SELL"
                          ? "매도"
                          : tx.type === "DIVIDEND"
                          ? "배당금"
                          : tx.type === "DISTRIBUTION"
                          ? "분배금"
                          : tx.type === "RENT"
                          ? "월세"
                          : tx.type === "STAKING_REWARD"
                          ? "스테이킹"
                          : tx.type === "TRANSFER"
                          ? "자산이동"
                          : tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white">
                      {tx.assetName}
                      {tx.code && <span className="text-[10px] text-gray-400 ml-1">({tx.code})</span>}
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 dark:text-gray-300">
                      {tx.quantity ? `${tx.quantity}개` : "-"}
                      {tx.price ? ` @ ${formatCurrency(tx.price, tx.currency)}` : ""}
                    </td>
                    <td className="py-3.5 px-3 font-black text-gray-900 dark:text-white">
                      {isPrivateMode ? "•••" : formatKRW(tx.amountKRW)}
                    </td>
                    <td className="py-3.5 px-3 text-gray-500 text-[11px]">{tx.accountName || "메인"}</td>
                    <td className="py-3.5 px-3 text-gray-400 text-[11px] max-w-[150px] truncate">{tx.notes || "-"}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
