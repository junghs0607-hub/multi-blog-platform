"use client";

import React from "react";
import { useAsset } from "@/context/AssetContext";
import { formatPercent, getPnLColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Radio } from "lucide-react";

export function MarketTickerBar() {
  const { marketIndices, isLiveTickActive } = useAsset();

  return (
    <div className="w-full bg-gray-50/90 dark:bg-gray-900/90 border-b border-gray-200/80 dark:border-gray-800 py-2 px-4 overflow-x-auto no-scrollbar backdrop-blur-sm select-none">
      <div className="flex items-center gap-6 min-w-max">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
          <span className={`w-2 h-2 rounded-full ${isLiveTickActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
          <span>MARKET LIVE</span>
        </div>

        <div className="flex items-center gap-5 text-xs">
          {marketIndices.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div
                key={idx.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-750 shadow-xs hover:border-blue-500/50 transition-colors"
              >
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {idx.name.split(" ")[0]}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {idx.unit === "$" ? "$" : ""}
                  {idx.value.toLocaleString()}
                  {idx.unit && idx.unit !== "$" ? idx.unit : ""}
                </span>
                <span className={`font-bold flex items-center text-[11px] ${getPnLColor(idx.change)}`}>
                  {isUp ? "+" : ""}
                  {idx.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
