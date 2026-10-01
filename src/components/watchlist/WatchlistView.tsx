"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { WatchlistItem } from "@/types/asset";
import { formatCurrency, formatPercent, getPnLColor, CATEGORY_META } from "@/lib/utils";
import { Star, Plus, Trash2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

interface WatchlistViewProps {
  onOpenAddAsset?: () => void;
}

export function WatchlistView({ onOpenAddAsset }: WatchlistViewProps) {
  const { watchlist, toggleWatchlist } = useAsset();
  const [filter, setFilter] = useState<string>("ALL");

  const filteredWatchlist = watchlist.filter((item) => {
    if (filter === "ALL") return true;
    return item.category === filter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              관심종목 & 실시간 모니터링 시세판
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              실시간 호가 & 52주 고저 & 스파크라인 차트
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              관심 있는 국내외 주식, ETF, 코인, 금을 등록하고 실시간 변동을 추적하세요.
            </p>
          </div>

          {onOpenAddAsset && (
            <button
              onClick={onOpenAddAsset}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>종목 추가</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "ALL", label: "전체 관심종목" },
          { id: "KR_STOCK", label: "국내주식" },
          { id: "US_STOCK", label: "해외주식" },
          { id: "ETF", label: "ETF" },
          { id: "COVERED_CALL", label: "커버드콜" },
          { id: "CRYPTO", label: "가상자산" },
          { id: "COMMODITY", label: "금/원자재" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === f.id
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Watchlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWatchlist.map((item) => {
          const meta = CATEGORY_META[item.category] || CATEGORY_META.KR_STOCK;
          const isUp = item.changePercent >= 0;

          // Render mini SVG sparkline
          const sparkMax = Math.max(...item.sparkline);
          const sparkMin = Math.min(...item.sparkline);
          const sparkDiff = sparkMax - sparkMin || 1;
          const sparkPoints = item.sparkline
            .map((val, idx) => {
              const x = (idx / (item.sparkline.length - 1)) * 120;
              const y = 35 - ((val - sparkMin) / sparkDiff) * 30;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");

          return (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-amber-500/50 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <div className="text-[11px] text-gray-400">
                      {item.code} · {meta.label}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleWatchlist(item)}
                  className="text-amber-400 hover:text-gray-400 p-1"
                >
                  <Star className="w-4 h-4 fill-amber-400" />
                </button>
              </div>

              {/* Price & Sparkline */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {formatCurrency(item.currentPrice, item.currency)}
                  </div>
                  <div className={`text-xs font-bold ${getPnLColor(item.changePercent)}`}>
                    {isUp ? "+" : ""}{item.changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* SVG Sparkline */}
                <div className="w-28 h-9">
                  <svg viewBox="0 0 120 40" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke={isUp ? "#ef4444" : "#3b82f6"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparkPoints}
                    />
                  </svg>
                </div>
              </div>

              {/* 52W Range Bar */}
              {item.high52w && item.low52w && (
                <div className="space-y-1 text-[10px] text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between font-semibold">
                    <span>52W 저: {formatCurrency(item.low52w, item.currency)}</span>
                    <span>52W 고: {formatCurrency(item.high52w, item.currency)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((item.currentPrice - item.low52w) /
                              (item.high52w - item.low52w)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
