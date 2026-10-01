"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem, AssetCategory } from "@/types/asset";
import {
  formatKRW,
  formatCurrency,
  formatPercent,
  getPnLColor,
  getPnLBg,
  CATEGORY_META,
} from "@/lib/utils";
import {
  Search,
  Filter,
  ArrowUpDown,
  Star,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  Building2,
  Coins,
  TrendingUp,
  Layers,
  Sparkles,
} from "lucide-react";

interface AssetTableProps {
  initialCategory?: AssetCategory | "ALL";
  onSelectAsset?: (asset: AssetItem) => void;
  onOpenAddAsset?: () => void;
  onOpenTrade?: (assetId: string) => void;
  hideCategoryTabs?: boolean;
}

type SortField = "valuationKRW" | "pnlKRW" | "pnlPercent" | "name" | "currentPrice" | "dividendYield";
type SortOrder = "asc" | "desc";

export function AssetTable({
  initialCategory = "ALL",
  onSelectAsset,
  onOpenAddAsset,
  onOpenTrade,
  hideCategoryTabs = false,
}: AssetTableProps) {
  const { filteredAssets, totalAssetsKRW, isPrivateMode, toggleWatchlist, isWatchlisted } = useAsset();

  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "ALL">(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("valuationKRW");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtered & Sorted Assets
  const displayAssets = useMemo(() => {
    let result = [...filteredAssets];

    if (categoryFilter !== "ALL") {
      result = result.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.accountName?.toLowerCase().includes(q) ||
          a.customTags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortField] || 0;
      let valB: any = b[sortField] || 0;

      if (sortField === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [filteredAssets, categoryFilter, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const categories: { key: AssetCategory | "ALL"; label: string; icon?: string }[] = [
    { key: "ALL", label: "전체 자산" },
    { key: "KR_STOCK", label: "국내주식", icon: "🇰🇷" },
    { key: "US_STOCK", label: "해외주식", icon: "🇺🇸" },
    { key: "ETF", label: "ETF", icon: "📊" },
    { key: "COVERED_CALL", label: "커버드콜", icon: "💰" },
    { key: "CRYPTO", label: "가상자산", icon: "🪙" },
    { key: "REAL_ESTATE", label: "부동산", icon: "🏢" },
    { key: "BOND", label: "채권", icon: "📜" },
    { key: "FUND", label: "펀드", icon: "📑" },
    { key: "CASH", label: "현금", icon: "💵" },
    { key: "FX", label: "외화", icon: "💱" },
    { key: "COMMODITY", label: "금/원자재", icon: "🧈" },
  ];

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 space-y-4">
        {/* Category Tabs */}
        {!hideCategoryTabs && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((c) => {
              const isSelected = categoryFilter === c.key;
              const count = c.key === "ALL" ? filteredAssets.length : filteredAssets.filter((a) => a.category === c.key).length;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategoryFilter(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {c.icon && <span>{c.icon}</span>}
                  <span>{c.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="종목명, 티커, 태그, 계좌명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddAsset && (
              <button
                onClick={onOpenAddAsset}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>자산 추가</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/75 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 uppercase font-bold border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-3.5 pl-6 pr-2">종목명 / 자산</th>
              <th className="py-3.5 px-3">보유 수량</th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("currentPrice")}>
                <div className="flex items-center gap-1">
                  <span>현재가</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">평균매수가</th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("valuationKRW")}>
                <div className="flex items-center gap-1">
                  <span>평가금액 (비중)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("pnlPercent")}>
                <div className="flex items-center gap-1">
                  <span>평가손익 (수익률)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort("dividendYield")}>
                <div className="flex items-center gap-1">
                  <span>배당수익률</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 pr-6 pl-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayAssets.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <div className="text-base font-bold text-gray-500 mb-1">등록된 자산이 없습니다</div>
                  <p className="text-xs">상단의 '자산 추가' 버튼을 눌러 첫 자산을 포트폴리오에 등록해보세요.</p>
                </td>
              </tr>
            ) : (
              displayAssets.map((asset) => {
                const meta = CATEGORY_META[asset.category];
                const weightPct = totalAssetsKRW > 0 ? (asset.valuationKRW / totalAssetsKRW) * 100 : 0;
                const isWatch = isWatchlisted(asset.code);

                return (
                  <tr
                    key={asset.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition-colors group cursor-pointer"
                    onClick={() => onSelectAsset && onSelectAsset(asset)}
                  >
                    {/* Name & Ticker */}
                    <td className="py-4 pl-6 pr-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist({
                              code: asset.code,
                              name: asset.name,
                              category: asset.category,
                              currency: asset.currency,
                              currentPrice: asset.currentPrice,
                              changePercent: asset.change24hPercent,
                            });
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isWatch
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300 dark:text-gray-600 hover:text-amber-400"
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isWatch ? "fill-amber-400" : ""}`} />
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-xl">{meta.icon}</span>
                          <div>
                            <div className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>{asset.name}</span>
                              <span className="text-[11px] font-bold text-gray-400">({asset.code})</span>
                              {asset.isCoveredCall && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                                  커버드콜
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                              <span>{asset.accountName || "메인계좌"}</span>
                              {asset.sector && <span>· {asset.sector}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-3 font-semibold text-gray-800 dark:text-gray-200">
                      {asset.quantity.toLocaleString()} {asset.category === "COMMODITY" ? asset.unit || "g" : "주"}
                    </td>

                    {/* Current Price */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(asset.currentPrice, asset.currency)}
                      </div>
                      <div className={`text-[11px] font-bold ${getPnLColor(asset.change24hPercent)}`}>
                        {asset.change24hPercent && asset.change24hPercent > 0 ? "+" : ""}
                        {asset.change24hPercent?.toFixed(2)}%
                      </div>
                    </td>

                    {/* Avg Buy Price */}
                    <td className="py-4 px-3 text-gray-600 dark:text-gray-400">
                      {formatCurrency(asset.avgBuyPrice, asset.currency)}
                    </td>

                    {/* Valuation & Weight */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW)}
                      </div>
                      <div className="text-[11px] text-blue-500 font-semibold">
                        비중 {weightPct.toFixed(1)}%
                      </div>
                    </td>

                    {/* PnL & Return % */}
                    <td className="py-4 px-3">
                      <div className={`font-bold ${getPnLColor(asset.pnlKRW)}`}>
                        {isPrivateMode ? "•••" : formatKRW(asset.pnlKRW)}
                      </div>
                      <div className={`text-[11px] font-bold ${getPnLColor(asset.pnlPercent)}`}>
                        {formatPercent(asset.pnlPercent)}
                      </div>
                    </td>

                    {/* Dividend Yield */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {asset.dividendYield ? `${asset.dividendYield}%` : "-"}
                      </div>
                      {asset.annualExpectedDividendKRW && (
                        <div className="text-[10px] text-gray-400">
                          연 {isPrivateMode ? "•••" : formatKRW(asset.annualExpectedDividendKRW, true)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-6 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {onOpenTrade && (
                          <button
                            onClick={() => onOpenTrade(asset.id)}
                            title="거래 기록"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectAsset && onSelectAsset(asset)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {displayAssets.map((asset) => {
          const meta = CATEGORY_META[asset.category];
          const weightPct = totalAssetsKRW > 0 ? (asset.valuationKRW / totalAssetsKRW) * 100 : 0;
          return (
            <div
              key={asset.id}
              onClick={() => onSelectAsset && onSelectAsset(asset)}
              className="p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition-colors cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{asset.name}</span>
                      <span className="text-[11px] text-gray-400 font-normal">({asset.code})</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {asset.accountName} · 비중 {weightPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-sm text-gray-900 dark:text-white">
                    {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW)}
                  </div>
                  <div className={`text-xs font-bold ${getPnLColor(asset.pnlPercent)}`}>
                    {formatPercent(asset.pnlPercent)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-gray-800/80">
                <div>
                  <span className="text-gray-400 text-[10px] block">현재가</span>
                  <span className="font-bold">{formatCurrency(asset.currentPrice, asset.currency)}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">보유수량</span>
                  <span className="font-semibold">{asset.quantity}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">예상 배당</span>
                  <span className="font-bold text-emerald-600">
                    {asset.dividendYield ? `${asset.dividendYield}%` : "-"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
