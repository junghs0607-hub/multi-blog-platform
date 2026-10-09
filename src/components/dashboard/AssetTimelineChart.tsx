"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, getPnLColor } from "@/lib/utils";
import { TrendingUp, Calendar, Activity } from "lucide-react";

type Timeframe = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export function AssetTimelineChart() {
  const { netWorthKRW, totalInvestedKRW, isPrivateMode } = useAsset();
  const [timeframe, setTimeframe] = useState<Timeframe>("6M");
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    value: number;
    invested: number;
    pnl: number;
    returnPct: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate realistic historical curve based on current net worth & timeframe
  const historyData = useMemo(() => {
    const pointsCount = timeframe === "1W" ? 7 : timeframe === "1M" ? 30 : timeframe === "3M" ? 45 : timeframe === "6M" ? 60 : timeframe === "1Y" ? 52 : 70;
    const currentVal = netWorthKRW;
    const currentInv = totalInvestedKRW;

    const baseGrowth = timeframe === "1W" ? 0.015 : timeframe === "1M" ? 0.04 : timeframe === "3M" ? 0.09 : timeframe === "6M" ? 0.16 : 0.28;
    const startVal = currentVal / (1 + baseGrowth);
    const startInv = currentInv * 0.88;

    const result = [];
    const now = new Date("2026-10-01");

    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      const daysAgo = Math.round((pointsCount - 1 - i) * (timeframe === "1W" ? 1 : timeframe === "1M" ? 1 : timeframe === "3M" ? 2 : timeframe === "6M" ? 3 : 5));
      const dateObj = new Date(now);
      dateObj.setDate(dateObj.getDate() - daysAgo);

      // Add gentle random walk curvature
      const wave = Math.sin(progress * Math.PI * 3) * (currentVal * 0.02) + Math.cos(progress * Math.PI * 1.5) * (currentVal * 0.015);
      const val = progress === 1 ? currentVal : Math.max(1000000, startVal + (currentVal - startVal) * Math.pow(progress, 0.9) + wave);
      const inv = progress === 1 ? currentInv : startInv + (currentInv - startInv) * progress;
      const pnl = val - inv;
      const retPct = inv > 0 ? (pnl / inv) * 100 : 0;

      const dateStr = dateObj.toISOString().slice(5, 10); // MM-DD

      result.push({
        date: dateStr,
        value: Math.round(val),
        invested: Math.round(inv),
        pnl: Math.round(pnl),
        returnPct: Number(retPct.toFixed(2)),
      });
    }

    return result;
  }, [netWorthKRW, totalInvestedKRW, timeframe]);

  // Compute SVG Points & Paths
  const svgData = useMemo(() => {
    if (historyData.length === 0) return { pathVal: "", pathInv: "", pathArea: "", points: [], minVal: 0, maxVal: 0 };

    const vals = historyData.map((d) => d.value);
    const invs = historyData.map((d) => d.invested);
    const minVal = Math.min(...vals, ...invs) * 0.95;
    const maxVal = Math.max(...vals, ...invs) * 1.05;

    const width = 600;
    const height = 200;

    const points = historyData.map((d, i) => {
      const x = (i / (historyData.length - 1)) * width;
      const yVal = height - ((d.value - minVal) / (maxVal - minVal)) * height;
      const yInv = height - ((d.invested - minVal) / (maxVal - minVal)) * height;
      return {
        ...d,
        x,
        yVal,
        yInv,
      };
    });

    const pathVal = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.yVal.toFixed(1)}`).join(" ");
    const pathInv = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.yInv.toFixed(1)}`).join(" ");
    const pathArea = `${pathVal} L ${width} ${height} L 0 ${height} Z`;

    return { pathVal, pathInv, pathArea, points, minVal, maxVal };
  }, [historyData]);

  const startVal = historyData[0]?.value || 0;
  const currentVal = historyData[historyData.length - 1]?.value || 0;
  const periodPnL = currentVal - startVal;
  const periodReturnPct = startVal > 0 ? (periodPnL / startVal) * 100 : 0;
  const isPeriodUp = periodPnL >= 0;

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              순자산 성장 추이
            </h2>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isPeriodUp
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
              }`}
            >
              기간 성과 {isPeriodUp ? "+" : ""}{formatKRW(periodPnL, true)} ({formatPercent(periodReturnPct)})
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            총 순자산(파란선) vs 투자 원금(점선) 비교
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
          {(["1W", "1M", "3M", "6M", "1Y", "ALL"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setHoveredPoint(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeframe === tf
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative pt-6 pb-2">
        <div className="w-full h-48 sm:h-56 relative">
          <svg
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Area Fill */}
            <path d={svgData.pathArea} fill="url(#areaGradient)" />

            {/* Invested Principal Line (Dashed Slate) */}
            <path
              d={svgData.pathInv}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.7"
            />

            {/* Valuation Line (Solid Vibrant Blue) */}
            <path
              d={svgData.pathVal}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Trigger Vertical Line & Circles */}
            {hoveredPoint && (
              <>
                <line
                  x1={hoveredPoint.x}
                  y1="0"
                  x2={hoveredPoint.x}
                  y2="200"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="5"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Invisible Hitboxes for Hover */}
            {svgData.points.map((p, idx) => (
              <rect
                key={idx}
                x={Math.max(0, p.x - 300 / svgData.points.length)}
                y="0"
                width={600 / svgData.points.length}
                height="200"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: p.date,
                    value: p.value,
                    invested: p.invested,
                    pnl: p.pnl,
                    returnPct: p.returnPct,
                    x: p.x,
                    y: p.yVal,
                  })
                }
              />
            ))}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 bg-gray-900/90 dark:bg-black/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-gray-700 text-xs min-w-[150px] -translate-x-1/2 -translate-y-full mb-3"
              style={{
                left: `${(hoveredPoint.x / 600) * 100}%`,
                top: `${(hoveredPoint.y / 200) * 100}%`,
              }}
            >
              <div className="font-bold text-gray-400 pb-1 border-b border-gray-700">
                {hoveredPoint.date}
              </div>
              <div className="mt-1.5 space-y-0.5">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">순자산:</span>
                  <span className="font-bold text-blue-400">
                    {isPrivateMode ? "•••" : formatKRW(hoveredPoint.value)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">원금:</span>
                  <span className="font-medium text-gray-300">
                    {isPrivateMode ? "•••" : formatKRW(hoveredPoint.invested, true)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 pt-1 border-t border-gray-800">
                  <span className="text-gray-400">수익률:</span>
                  <span className={`font-bold ${getPnLColor(hoveredPoint.returnPct)}`}>
                    {formatPercent(hoveredPoint.returnPct)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Legend */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 px-1">
          <span>{historyData[0]?.date}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-blue-500 rounded" />
              순자산 평가액
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-gray-400" />
              투자 원금
            </span>
          </div>
          <span>{historyData[historyData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
