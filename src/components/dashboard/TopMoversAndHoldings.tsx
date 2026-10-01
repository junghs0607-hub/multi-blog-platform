"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem } from "@/types/asset";
import { formatKRW, formatPercent, getPnLColor, CATEGORY_META } from "@/lib/utils";
import { TrendingUp, Award, Flame, ArrowUpRight } from "lucide-react";

interface TopMoversAndHoldingsProps {
  onSelectAsset?: (asset: AssetItem) => void;
}

export function TopMoversAndHoldings({ onSelectAsset }: TopMoversAndHoldingsProps) {
  const { filteredAssets, totalAssetsKRW, isPrivateMode } = useAsset();
  const [tab, setTab] = useState<"weight" | "movers">("weight");

  // Top holdings sorted by valuation
  const topHoldings = [...filteredAssets]
    .sort((a, b) => b.valuationKRW - a.valuationKRW)
    .slice(0, 5);

  // Top movers sorted by 24h change %
  const topMovers = [...filteredAssets]
    .filter((a) => a.change24hPercent !== undefined && a.change24hPercent !== 0)
    .sort((a, b) => Math.abs(b.change24hPercent || 0) - Math.abs(a.change24hPercent || 0))
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            핵심 보유 종목 & 급등락
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            포트폴리오 주도 자산 현황
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setTab("weight")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              tab === "weight"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            비중 상위
          </button>
          <button
            onClick={() => setTab("movers")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              tab === "movers"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            오늘의 변동
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800/80 pt-2">
        {tab === "weight"
          ? topHoldings.map((asset, idx) => {
              const meta = CATEGORY_META[asset.category];
              const weightPct = totalAssetsKRW > 0 ? (asset.valuationKRW / totalAssetsKRW) * 100 : 0;
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelectAsset && onSelectAsset(asset)}
                  className="py-3 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/50 px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-black text-xs text-gray-400">{idx + 1}</span>
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{asset.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({asset.code})</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        비중 <span className="text-blue-500 font-bold">{weightPct.toFixed(1)}%</span> · {asset.accountName || "메인"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW)}
                    </div>
                    <div className={`text-[11px] font-bold ${getPnLColor(asset.pnlPercent)}`}>
                      {formatPercent(asset.pnlPercent)}
                    </div>
                  </div>
                </div>
              );
            })
          : topMovers.map((asset, idx) => {
              const meta = CATEGORY_META[asset.category];
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelectAsset && onSelectAsset(asset)}
                  className="py-3 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/50 px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-black text-xs text-gray-400">{idx + 1}</span>
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{asset.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({asset.code})</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        현재가 {asset.currentPrice.toLocaleString()} {asset.currency}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold text-xs sm:text-sm ${getPnLColor(asset.change24hPercent)}`}>
                      {asset.change24hPercent && asset.change24hPercent > 0 ? "+" : ""}
                      {asset.change24hPercent?.toFixed(2)}%
                    </div>
                    <div className="text-[11px] text-gray-400">
                      평가액 {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW, true)}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
