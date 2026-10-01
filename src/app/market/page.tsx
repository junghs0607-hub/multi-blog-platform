"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAsset } from "@/context/AssetContext";
import { formatPercent, getPnLColor, FX_RATES } from "@/lib/utils";
import { Globe2, TrendingUp, Zap, Sparkles, Activity } from "lucide-react";

export default function MarketPage() {
  const { marketIndices } = useAsset();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Globe2 className="w-4 h-4" />
              글로벌 시장 지수 & 시황 종합 (Global Market Board)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              국내외 주요 지수 · 환율 · 원자재 · 가상자산 시세
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              실시간 금융 시장 데이터와 심리 지수(Fear & Greed)를 한눈에 파악합니다.
            </p>
          </div>
        </div>

        {/* Fear & Greed & Kimchi Premium Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                글로벌 시장 심리 (Fear & Greed Index)
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                탐욕 (Greed)
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-500">68 / 100</div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full" style={{ width: "68%" }} />
            </div>
            <div className="text-xs text-gray-400">
              투자 심리가 개선되며 미국 기술주 및 가상자산으로 자금 유입이 지속되고 있습니다.
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                원/달러 환율 및 김치 프리미엄
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                +1.42% (안정)
              </span>
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-white">
              ₩{FX_RATES.USD.toFixed(1)} <span className="text-sm font-normal text-gray-400">/ USD</span>
            </div>
            <div className="text-xs text-gray-400">
              비트코인 국내가 1억 3,540만원 vs 해외가 $96,800 (괴리율 1.42%)
            </div>
          </div>
        </div>

        {/* Market Ticker Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketIndices.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div
                key={idx.id}
                className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-2 hover:border-blue-500/50 transition-all"
              >
                <div className="text-xs font-bold text-gray-400">{idx.name}</div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {idx.unit === "$" ? "$" : ""}
                  {idx.value.toLocaleString()}
                  {idx.unit && idx.unit !== "$" ? idx.unit : ""}
                </div>
                <div className={`text-xs font-bold ${getPnLColor(idx.change)}`}>
                  {isUp ? "+" : ""}
                  {idx.changePercent.toFixed(2)}% ({isUp ? "+" : ""}{idx.change})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
