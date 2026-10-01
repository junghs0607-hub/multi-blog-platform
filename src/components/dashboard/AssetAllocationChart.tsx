"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent } from "@/lib/utils";
import { PieChart as PieIcon, Globe2, ShieldCheck, DollarSign, Layers } from "lucide-react";

type AllocationMode = "category" | "country" | "currency" | "risk" | "income";

export function AssetAllocationChart() {
  const { filteredAssets, totalAssetsKRW, isPrivateMode, categoryAllocations } = useAsset();
  const [mode, setMode] = useState<AllocationMode>("category");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const allocationData = useMemo(() => {
    if (totalAssetsKRW === 0) return [];

    if (mode === "category") {
      return categoryAllocations.map((c) => ({
        label: c.label,
        value: c.valueKRW,
        percent: c.percent,
        color: c.color,
        count: c.count,
      }));
    }

    if (mode === "country") {
      const countryMap: Record<string, { label: string; value: number; color: string; count: number }> = {
        KR: { label: "국내 자산 (KR)", value: 0, color: "#ef4444", count: 0 },
        US: { label: "미국 자산 (US)", value: 0, color: "#3b82f6", count: 0 },
        GLOBAL: { label: "글로벌 / 크립토", value: 0, color: "#f59e0b", count: 0 },
        OTHER: { label: "기타", value: 0, color: "#8b5cf6", count: 0 },
      };

      filteredAssets.forEach((a) => {
        const c = a.country || (a.currency === "USD" ? "US" : a.currency === "KRW" ? "KR" : "GLOBAL");
        if (countryMap[c]) {
          countryMap[c].value += a.valuationKRW;
          countryMap[c].count += 1;
        } else {
          countryMap.OTHER.value += a.valuationKRW;
          countryMap.OTHER.count += 1;
        }
      });

      return Object.values(countryMap)
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          percent: (item.value / totalAssetsKRW) * 100,
        }))
        .sort((a, b) => b.value - a.value);
    }

    if (mode === "currency") {
      const currMap: Record<string, { label: string; value: number; color: string; count: number }> = {
        KRW: { label: "원화 (KRW)", value: 0, color: "#0ea5e9", count: 0 },
        USD: { label: "달러 (USD)", value: 0, color: "#10b981", count: 0 },
        JPY: { label: "엔화 (JPY)", value: 0, color: "#ec4899", count: 0 },
        EUR: { label: "유로 (EUR)", value: 0, color: "#a855f7", count: 0 },
      };

      filteredAssets.forEach((a) => {
        if (currMap[a.currency]) {
          currMap[a.currency].value += a.valuationKRW;
          currMap[a.currency].count += 1;
        }
      });

      return Object.values(currMap)
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          percent: (item.value / totalAssetsKRW) * 100,
        }))
        .sort((a, b) => b.value - a.value);
    }

    if (mode === "risk") {
      const riskMap: Record<string, { label: string; value: number; color: string; count: number }> = {
        SAFE: { label: "안전자산 (금/국채/현금)", value: 0, color: "#10b981", count: 0 },
        LOW_RISK: { label: "중저위험 (배당주/부동산)", value: 0, color: "#06b6d4", count: 0 },
        MEDIUM: { label: "중위험 (대형주/지수ETF)", value: 0, color: "#3b82f6", count: 0 },
        HIGH: { label: "고위험 (빅테크/가상자산)", value: 0, color: "#ef4444", count: 0 },
      };

      filteredAssets.forEach((a) => {
        const r = a.riskLevel === "SAFE" ? "SAFE" : a.riskLevel === "HIGH" ? "HIGH" : a.riskLevel === "LOW_RISK" ? "LOW_RISK" : "MEDIUM";
        riskMap[r].value += a.valuationKRW;
        riskMap[r].count += 1;
      });

      return Object.values(riskMap)
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          percent: (item.value / totalAssetsKRW) * 100,
        }))
        .sort((a, b) => b.value - a.value);
    }

    // mode === "income" (배당/인컴형 vs 자본성장형)
    const incomeMap = {
      INCOME: { label: "배당 / 인컴 자산", value: 0, color: "#8b5cf6", count: 0 },
      GROWTH: { label: "자본 성장형 자산", value: 0, color: "#f59e0b", count: 0 },
      CASH_SAFE: { label: "유동성 & 안전자산", value: 0, color: "#64748b", count: 0 },
    };

    filteredAssets.forEach((a) => {
      if (a.category === "CASH" || a.category === "FX" || a.category === "BOND" || a.category === "COMMODITY") {
        incomeMap.CASH_SAFE.value += a.valuationKRW;
        incomeMap.CASH_SAFE.count += 1;
      } else if (a.category === "COVERED_CALL" || a.category === "REAL_ESTATE" || (a.dividendYield && a.dividendYield >= 3)) {
        incomeMap.INCOME.value += a.valuationKRW;
        incomeMap.INCOME.count += 1;
      } else {
        incomeMap.GROWTH.value += a.valuationKRW;
        incomeMap.GROWTH.count += 1;
      }
    });

    return Object.values(incomeMap)
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percent: (item.value / totalAssetsKRW) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAssets, totalAssetsKRW, mode, categoryAllocations]);

  // Compute SVG Donut Chart Paths
  const svgDonut = useMemo(() => {
    let cumulative = 0;
    const slices = allocationData.map((d, idx) => {
      const startPct = cumulative;
      cumulative += d.percent;
      const endPct = cumulative;

      const startAngle = (startPct / 100) * 360 - 90;
      const endAngle = (endPct / 100) * 360 - 90;

      const radStart = (startAngle * Math.PI) / 180;
      const radEnd = (endAngle * Math.PI) / 180;

      const cx = 100;
      const cy = 100;
      const rOuter = 82;
      const rInner = 56;

      const x1 = cx + rOuter * Math.cos(radStart);
      const y1 = cy + rOuter * Math.sin(radStart);
      const x2 = cx + rOuter * Math.cos(radEnd);
      const y2 = cy + rOuter * Math.sin(radEnd);

      const x3 = cx + rInner * Math.cos(radEnd);
      const y3 = cy + rInner * Math.sin(radEnd);
      const x4 = cx + rInner * Math.cos(radStart);
      const y4 = cy + rInner * Math.sin(radStart);

      const largeArc = d.percent > 50 ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;

      return {
        ...d,
        index: idx,
        pathData,
      };
    });

    return slices;
  }, [allocationData]);

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-500" />
            자산 배분 분석
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            포트폴리오 비중 및 분산도 다각도 분석
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setMode("category")}
            className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              mode === "category"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            자산군별
          </button>
          <button
            onClick={() => setMode("country")}
            className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              mode === "country"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            국가별
          </button>
          <button
            onClick={() => setMode("currency")}
            className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              mode === "currency"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            통화별
          </button>
          <button
            onClick={() => setMode("risk")}
            className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              mode === "risk"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            위험도별
          </button>
          <button
            onClick={() => setMode("income")}
            className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              mode === "income"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            배당/성장
          </button>
        </div>
      </div>

      {/* Chart & Breakdown Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-6">
        {/* Donut Chart View */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {svgDonut.map((slice) => (
                <path
                  key={slice.index}
                  d={slice.pathData}
                  fill={slice.color}
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  style={{
                    transformOrigin: "100px 100px",
                    transform: hoveredIndex === slice.index ? "scale(1.05)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {hoveredIndex !== null && allocationData[hoveredIndex] ? (
                <>
                  <div className="text-[11px] font-bold text-gray-400">
                    {allocationData[hoveredIndex].label}
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {allocationData[hoveredIndex].percent.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {isPrivateMode ? "•••" : formatKRW(allocationData[hoveredIndex].value, true)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold text-gray-400 uppercase">
                    총 자산
                  </div>
                  <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {isPrivateMode ? "•••" : formatKRW(totalAssetsKRW, true)}
                  </div>
                  <div className="text-[10px] text-blue-500 font-bold">
                    {allocationData.length}개 분류
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="md:col-span-7 space-y-2 max-h-72 overflow-y-auto pr-1">
          {allocationData.map((item, idx) => (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                hoveredIndex === idx
                  ? "bg-blue-50/50 dark:bg-gray-800 border-blue-300 dark:border-blue-700 shadow-sm"
                  : "bg-gray-50/60 dark:bg-gray-800/60 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {item.count}개 종목/자산
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  {isPrivateMode ? "•••" : formatKRW(item.value)}
                </div>
                <div className="font-extrabold text-[11px] text-blue-600 dark:text-blue-400">
                  {item.percent.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
