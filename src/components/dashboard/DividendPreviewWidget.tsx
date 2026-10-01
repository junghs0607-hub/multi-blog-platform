"use client";

import React from "react";
import Link from "next/link";
import { useAsset } from "@/context/AssetContext";
import { formatKRW } from "@/lib/utils";
import { DollarSign, Calendar, ArrowRight, Sparkles } from "lucide-react";

export function DividendPreviewWidget() {
  const { annualDividendsKRW, monthlyAverageDividendKRW, isPrivateMode, filteredAssets } = useAsset();

  // Upcoming payouts in next 30 days
  const upcomingIncomeAssets = filteredAssets
    .filter((a) => (a.annualExpectedDividendKRW || 0) > 0)
    .sort((a, b) => (b.annualExpectedDividendKRW || 0) - (a.annualExpectedDividendKRW || 0))
    .slice(0, 4);

  // Mock 12-Month Distribution Heights
  const monthlyValues = [
    monthlyAverageDividendKRW * 0.85,
    monthlyAverageDividendKRW * 0.9,
    monthlyAverageDividendKRW * 1.35, // Q1
    monthlyAverageDividendKRW * 1.4,  // April KR dividend peak
    monthlyAverageDividendKRW * 0.88,
    monthlyAverageDividendKRW * 1.3,  // Q2
    monthlyAverageDividendKRW * 0.92,
    monthlyAverageDividendKRW * 0.86,
    monthlyAverageDividendKRW * 1.25, // Q3
    monthlyAverageDividendKRW * 0.95,
    monthlyAverageDividendKRW * 0.9,
    monthlyAverageDividendKRW * 1.45, // Q4
  ];

  const maxMonth = Math.max(...monthlyValues, 1000000);

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            배당 & 월세 현금흐름 요약
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            연간 예상 수령액 및 12개월 분배 시뮬레이션
          </p>
        </div>

        <Link
          href="/dividends"
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>배당 캘린더</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3 py-4">
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
            연간 예상 인컴
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {isPrivateMode ? "•••" : formatKRW(annualDividendsKRW)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
            월평균 수령액
          </div>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
            {isPrivateMode ? "•••" : formatKRW(monthlyAverageDividendKRW)}
          </div>
        </div>
      </div>

      {/* Mini 12-Month Bar Chart */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase">월별 예상 배당 분포</div>
        <div className="grid grid-cols-12 gap-1.5 h-16 items-end pt-2">
          {monthlyValues.map((val, idx) => {
            const heightPct = Math.round((val / maxMonth) * 100);
            const isCurrentMonth = idx === 9; // October (10월)
            return (
              <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group relative">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isCurrentMonth
                      ? "bg-emerald-500 shadow-sm"
                      : "bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500"
                  }`}
                  style={{ height: `${Math.max(15, heightPct)}%` }}
                />
                <span
                  className={`text-[9px] font-bold ${
                    isCurrentMonth ? "text-emerald-500" : "text-gray-400"
                  }`}
                >
                  {idx + 1}월
                </span>

                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 bg-gray-900 text-white text-[10px] py-1 px-1.5 rounded-md whitespace-nowrap shadow-md pointer-events-none">
                  {idx + 1}월: {isPrivateMode ? "•••" : formatKRW(val, true)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Dividend Assets */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="text-[11px] font-bold text-gray-400 uppercase">주요 인컴 발생 자산</div>
        <div className="space-y-1.5">
          {upcomingIncomeAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200">{asset.name}</span>
                <span className="text-[10px] text-gray-400">
                  {asset.dividendFrequency === "monthly" ? "월배당" : "분기배당"}
                </span>
              </div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                연 {isPrivateMode ? "•••" : formatKRW(asset.annualExpectedDividendKRW, true)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
