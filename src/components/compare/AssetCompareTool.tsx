"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem } from "@/types/asset";
import { formatKRW, formatCurrency, formatPercent, getPnLColor, CATEGORY_META } from "@/lib/utils";
import { Scale, Plus, X, ArrowUpDown, TrendingUp } from "lucide-react";

export function AssetCompareTool() {
  const { filteredAssets } = useAsset();

  const [selectedCodes, setSelectedCodes] = useState<string[]>(["005930", "000660", "SCHD"]);
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y" | "3Y">("1Y");

  // Selected assets
  const comparedAssets = useMemo(() => {
    return selectedCodes
      .map((code) => filteredAssets.find((a) => a.code === code))
      .filter(Boolean) as AssetItem[];
  }, [selectedCodes, filteredAssets]);

  const addAssetToCompare = (code: string) => {
    if (selectedCodes.length >= 4) {
      alert("최대 4개 종목까지 동시에 비교할 수 있습니다.");
      return;
    }
    if (!selectedCodes.includes(code)) {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const removeAssetFromCompare = (code: string) => {
    setSelectedCodes(selectedCodes.filter((c) => c !== code));
  };

  // Generate normalized comparative price curves (starting at 100%)
  const chartCurves = useMemo(() => {
    const points = 30;
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6"];

    return comparedAssets.map((asset, aIdx) => {
      const annualYield = asset.pnlPercent || 12;
      const baseGrowth = (annualYield / 100) * (timeframe === "1M" ? 0.08 : timeframe === "3M" ? 0.25 : timeframe === "6M" ? 0.5 : 1.0);
      const startPrice = 100;
      const endPrice = 100 * (1 + baseGrowth);

      const pathPoints = [];
      for (let i = 0; i < points; i++) {
        const prog = i / (points - 1);
        const wave = Math.sin(prog * Math.PI * 2 + aIdx) * 3;
        const val = startPrice + (endPrice - startPrice) * prog + wave;
        pathPoints.push({
          x: (i / (points - 1)) * 500,
          y: 160 - ((val - 80) / 70) * 160,
        });
      }

      const pathStr = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

      return {
        asset,
        color: colors[aIdx % colors.length],
        pathStr,
        finalReturn: (endPrice - 100),
      };
    });
  }, [comparedAssets, timeframe]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              다중 종목 비교 분석실 (Side-by-Side Comparison)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              종목 간 수익률 & 배당 & 밸류에이션 맞비교
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              국내주식, 미국주식, ETF, 코인을 정규화 차트로 동일선상에서 비교 분석합니다.
            </p>
          </div>
        </div>

        {/* Selected Compare Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-white/10">
          <span className="text-xs font-bold text-gray-400 mr-1">비교 중인 종목:</span>
          {comparedAssets.map((asset, idx) => {
            const colors = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6"];
            return (
              <div
                key={asset.code}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span>{asset.name} ({asset.code})</span>
                <button
                  onClick={() => removeAssetFromCompare(asset.code)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* Add more select */}
          {comparedAssets.length < 4 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addAssetToCompare(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="px-3 py-1.5 text-xs rounded-xl bg-white/10 border border-white/10 text-white outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-800 text-gray-400">
                + 비교 종목 추가...
              </option>
              {filteredAssets
                .filter((a) => !selectedCodes.includes(a.code))
                .map((a) => (
                  <option key={a.id} value={a.code} className="bg-gray-800 text-white">
                    {a.name} ({a.code})
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {/* Normalized Performance Chart */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              정규화 수익률 비교 차트 (기준점 = 100%)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              각 자산의 시작 시점을 100%로 환산하여 동일한 출발선에서 성과를 추적합니다.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
            {(["1M", "3M", "6M", "1Y", "3Y"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  timeframe === tf
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Comparative Chart */}
        <div className="w-full h-56 pt-2">
          <svg viewBox="0 0 500 160" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {/* Zero/Baseline Line (100%) */}
            <line x1="0" y1="115" x2="500" y2="115" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            {chartCurves.map((curve) => (
              <path
                key={curve.asset.code}
                d={curve.pathStr}
                fill="none"
                stroke={curve.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Side-by-Side Comparison Metrics Table */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-x-auto">
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white mb-4">
          핵심 투자 지표 맞비교 표
        </h3>

        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-3 px-4">비교 항목</th>
              {comparedAssets.map((asset) => (
                <th key={asset.code} className="py-3 px-4 font-extrabold text-gray-900 dark:text-white text-sm">
                  {asset.name}
                  <div className="text-[10px] text-gray-400 font-normal">{asset.code}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">자산 분류</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                  {CATEGORY_META[a.category].label}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">현재 시세</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 font-black text-gray-900 dark:text-white">
                  {formatCurrency(a.currentPrice, a.currency)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">보유 수익률</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className={`py-3 px-4 font-black ${getPnLColor(a.pnlPercent)}`}>
                  {formatPercent(a.pnlPercent)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">배당 / 분배 수익률</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                  {a.dividendYield ? `연 ${a.dividendYield}%` : "-"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">배당 주기</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 text-gray-700 dark:text-gray-300">
                  {a.dividendFrequency || "-"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">PER (주가수익비율)</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 text-gray-700 dark:text-gray-300">
                  {a.per ? `${a.per}배` : "-"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-gray-400">총보수 (운용수수료)</td>
              {comparedAssets.map((a) => (
                <td key={a.code} className="py-3 px-4 text-gray-700 dark:text-gray-300">
                  {a.expenseRatio ? `${a.expenseRatio}%` : "해당 없음"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
