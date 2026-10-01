"use client";

import React from "react";
import Link from "next/link";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, getPnLColor, CATEGORY_META } from "@/lib/utils";
import { AssetCategory } from "@/types/asset";
import { ArrowUpRight, TrendingUp } from "lucide-react";

interface CategorySummary {
  category: AssetCategory;
  href: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  valuationKRW: number;
  pnlKRW: number;
  returnPercent: number;
  count: number;
  weightPercent: number;
}

export function AssetClassGrid({ onSelectAsset }: { onSelectAsset?: (category: AssetCategory) => void }) {
  const { filteredAssets, totalAssetsKRW, isPrivateMode } = useAsset();

  const categories: { category: AssetCategory; href: string }[] = [
    { category: "KR_STOCK", href: "/assets/kr-stock" },
    { category: "US_STOCK", href: "/assets/us-stock" },
    { category: "ETF", href: "/assets/etf" },
    { category: "COVERED_CALL", href: "/assets/etf" },
    { category: "CRYPTO", href: "/assets/crypto" },
    { category: "REAL_ESTATE", href: "/assets/real-estate" },
    { category: "BOND", href: "/assets/funds-bonds" },
    { category: "FUND", href: "/assets/funds-bonds" },
    { category: "CASH", href: "/assets/cash-fx" },
    { category: "FX", href: "/assets/cash-fx" },
    { category: "COMMODITY", href: "/assets/gold-commodities" },
  ];

  const categorySummaries: CategorySummary[] = categories.map(({ category, href }) => {
    const meta = CATEGORY_META[category];
    const items = filteredAssets.filter((a) => a.category === category);
    const count = items.length;

    let valKRW = 0;
    let invKRW = 0;
    let pnlKRW = 0;

    items.forEach((a) => {
      valKRW += a.valuationKRW || 0;
      invKRW += a.investedKRW || 0;
      pnlKRW += a.pnlKRW || 0;
    });

    const returnPct = invKRW > 0 ? (pnlKRW / invKRW) * 100 : 0;
    const weightPct = totalAssetsKRW > 0 ? (valKRW / totalAssetsKRW) * 100 : 0;

    return {
      category,
      href,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      bg: meta.bg,
      valuationKRW: valKRW,
      pnlKRW,
      returnPercent: returnPct,
      count,
      weightPercent: weightPct,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            자산군별 통합 현황
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            11개 자산 카테고리별 실시간 평가금액 및 수익률
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {categorySummaries.map((cat) => {
          const hasAssets = cat.count > 0;
          return (
            <Link
              key={cat.category}
              href={cat.href}
              className={`p-4 rounded-3xl border transition-all relative overflow-hidden group flex flex-col justify-between ${
                hasAssets
                  ? "bg-white dark:bg-gray-850 border-gray-200/80 dark:border-gray-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 opacity-70 hover:opacity-100"
              }`}
            >
              {/* Top Row: Icon & Tag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {cat.label}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              {/* Middle Row: Valuation Amount */}
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-gray-400">
                  {cat.count > 0 ? `${cat.count}개 종목` : "보유 없음"}
                </div>
                <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 truncate">
                  {isPrivateMode ? "•••" : formatKRW(cat.valuationKRW)}
                </div>
              </div>

              {/* Bottom Row: Profit / Yield & Weight */}
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className={`font-bold ${getPnLColor(cat.pnlKRW)}`}>
                  {cat.pnlKRW !== 0 ? formatPercent(cat.returnPercent) : "-"}
                </span>
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                  비중 {cat.weightPercent.toFixed(1)}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
