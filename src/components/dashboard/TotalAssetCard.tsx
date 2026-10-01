"use client";

import React from "react";
import { useAsset } from "@/context/AssetContext";
import {
  formatKRW,
  formatCurrency,
  formatPercent,
  getPnLColor,
  getPnLBg,
  FX_RATES,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  DollarSign,
  Sparkles,
  ArrowRightLeft,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
} from "lucide-react";

interface TotalAssetCardProps {
  onOpenAddAsset?: () => void;
  onOpenTradeModal?: () => void;
  onOpenAiChat?: () => void;
}

export function TotalAssetCard({
  onOpenAddAsset,
  onOpenTradeModal,
  onOpenAiChat,
}: TotalAssetCardProps) {
  const {
    netWorthKRW,
    totalAssetsKRW,
    totalDebtKRW,
    totalInvestedKRW,
    totalPnLKRW,
    totalReturnPercent,
    todayPnLKRW,
    todayPnLPercent,
    annualDividendsKRW,
    monthlyAverageDividendKRW,
    isPrivateMode,
    togglePrivateMode,
    displayCurrency,
    simulateTick,
  } = useAsset();

  const isTodayUp = todayPnLKRW >= 0;
  const isTotalUp = totalPnLKRW >= 0;

  // Currency conversions
  const netWorthUSD = netWorthKRW / FX_RATES.USD;
  const todayPnLUSD = todayPnLKRW / FX_RATES.USD;
  const totalPnLUSD = totalPnLKRW / FX_RATES.USD;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-gray-800">
      {/* Background Glow Accents */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between gap-6">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
              통합 순자산 (NET WORTH)
            </span>
            <button
              onClick={togglePrivateMode}
              className="p-1 rounded-md text-gray-400 hover:text-white transition-colors"
              title={isPrivateMode ? "금액 표시" : "금액 숨기기"}
            >
              {isPrivateMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={simulateTick}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              title="시세 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새로고침</span>
            </button>
          </div>
        </div>

        {/* Main Big Net Worth Number */}
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              {isPrivateMode
                ? "•••••••• 원"
                : displayCurrency === "KRW"
                ? formatKRW(netWorthKRW)
                : formatCurrency(netWorthUSD, "USD")}
            </h1>
          </div>

          {/* Today Profit & Total Return Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs sm:text-sm">
            {/* Today Profit Badge */}
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold ${
                isTodayUp ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              {isTodayUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>오늘</span>
              <span>
                {isPrivateMode
                  ? "•••"
                  : displayCurrency === "KRW"
                  ? `${isTodayUp ? "+" : ""}${formatKRW(todayPnLKRW, true)}`
                  : `${isTodayUp ? "+" : ""}${formatCurrency(todayPnLUSD, "USD")}`}
              </span>
              <span>({formatPercent(todayPnLPercent)})</span>
            </div>

            {/* Total Return Badge */}
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold ${
                isTotalUp ? "bg-rose-500/10 text-rose-300" : "bg-blue-500/10 text-blue-300"
              }`}
            >
              <span>전체 수익</span>
              <span>
                {isPrivateMode
                  ? "•••"
                  : displayCurrency === "KRW"
                  ? `${isTotalUp ? "+" : ""}${formatKRW(totalPnLKRW, true)}`
                  : `${isTotalUp ? "+" : ""}${formatCurrency(totalPnLUSD, "USD")}`}
              </span>
              <span>({formatPercent(totalReturnPercent)})</span>
            </div>
          </div>
        </div>

        {/* 4 Key Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400 font-medium flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              총자산 (자산 합계)
            </div>
            <div className="font-bold text-sm sm:text-base text-white mt-1">
              {isPrivateMode ? "•••" : formatKRW(totalAssetsKRW, true)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400 font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              부채 / 대출금
            </div>
            <div className="font-bold text-sm sm:text-base text-rose-300 mt-1">
              {isPrivateMode ? "•••" : formatKRW(totalDebtKRW, true)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              예상 연간 배당/인컴
            </div>
            <div className="font-bold text-sm sm:text-base text-emerald-400 mt-1">
              {isPrivateMode ? "•••" : formatKRW(annualDividendsKRW, true)}
              <span className="text-[10px] font-normal text-emerald-300 ml-1">
                (월 {isPrivateMode ? "•••" : formatKRW(monthlyAverageDividendKRW, true)})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400 font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              투자 원금 (매입액)
            </div>
            <div className="font-bold text-sm sm:text-base text-gray-200 mt-1">
              {isPrivateMode ? "•••" : formatKRW(totalInvestedKRW, true)}
            </div>
          </div>
        </div>

        {/* Quick Action Bar inside Hero Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {onOpenAddAsset && (
              <button
                onClick={onOpenAddAsset}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>자산 추가</span>
              </button>
            )}

            {onOpenTradeModal && (
              <button
                onClick={onOpenTradeModal}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span>거래 기록</span>
              </button>
            )}
          </div>

          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI 자산진단</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
