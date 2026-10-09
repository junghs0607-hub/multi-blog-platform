"use client";

import React from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, getPnLColor, FX_RATES } from "@/lib/utils";
import {
  Activity,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function AnalyticsView() {
  const {
    totalPnLKRW,
    totalReturnPercent,
    totalInvestedKRW,
    totalAssetsKRW,
    annualDividendsKRW,
    dividendYieldOnTotal,
    dividendYieldOnCost,
    isPrivateMode,
    filteredAssets,
  } = useAsset();

  // Monthly Return Heatmap mock (2025 - 2026)
  const heatmapData = [
    { year: 2026, months: [2.4, -1.1, 3.8, 1.2, 4.5, -0.8, 2.9, 1.6, 2.5, 0.5, 0, 0] },
    { year: 2025, months: [1.8, 2.2, -3.1, 4.1, 1.9, 2.8, 3.4, -1.5, 1.2, 3.9, 4.8, 2.1] },
    { year: 2024, months: [-2.1, 1.5, 2.9, -1.8, 3.2, 1.4, -0.9, 2.1, 3.5, -2.4, 4.1, 3.8] },
  ];

  // FX vs Capital Decomposition for Overseas assets
  const usAssets = filteredAssets.filter((a) => a.currency === "USD");
  const usInvestedKRW = usAssets.reduce((sum, a) => sum + a.investedKRW, 0);
  const usValuationKRW = usAssets.reduce((sum, a) => sum + a.valuationKRW, 0);
  const usTotalPnL = usValuationKRW - usInvestedKRW;
  const usReturnPct = usInvestedKRW > 0 ? (usTotalPnL / usInvestedKRW) * 100 : 0;

  // Estimated FX gain portion: ~5.5% from USD/KRW appreciation
  const fxPortionPct = 5.2;
  const stockPurePortionPct = usReturnPct - fxPortionPct;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              수익률 & 성과 심층 분석 (TWR / YoC / Heatmap)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              누적 총 수익률: {formatPercent(totalReturnPercent)}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              순 평가손익 <span className="font-bold text-emerald-400">{isPrivateMode ? "•••" : formatKRW(totalPnLKRW)}</span> 및 배당 재투자 복리 성과를 종합 분석합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-gray-300">시간가중 수익률 (TWR)</div>
              <div className="text-lg font-black text-blue-400 mt-0.5">+18.42%</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-gray-300">금액가중 수익률 (MWR)</div>
              <div className="text-lg font-black text-indigo-400 mt-0.5">+16.95%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Yield on Cost (YoC) vs Current Yield Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              배당수익률 vs 투자원금 대비 배당률 (YoC)
            </h3>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            주가가 상승함에 따라 현재 시가 배당률보다 초기 매수단가 기준 배당률(Yield on Cost)이 월등히 높아지는 배당성장 효과를 확인하세요.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                투자원금 대비 배당률 (YoC)
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {dividendYieldOnCost.toFixed(2)}%
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">매입원가 대비 연 수령액</div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40">
              <div className="text-xs text-blue-700 dark:text-blue-400 font-bold">
                현재 평가액 기준 배당률
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {dividendYieldOnTotal.toFixed(2)}%
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">현재 시세 기준 연 배당률</div>
            </div>
          </div>
        </div>

        {/* FX Effect vs Pure Stock Return */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              해외주식 주가수익 vs 환차익 분해
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
              USD/KRW
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            미국 자산의 총 원화 수익률 중 순수 주가 상승분과 달러 환율 변동 효과를 분리하여 진단합니다.
          </p>

          <div className="space-y-3 pt-2 text-xs font-bold">
            <div>
              <div className="flex justify-between mb-1">
                <span>순수 주가 상승 기여도</span>
                <span className="text-blue-500">+{stockPurePortionPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>달러 환율 상승 기여도 (환차익)</span>
                <span className="text-emerald-500">+{fxPortionPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Return Heatmap (월별 수익률 히트맵) */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              월별 투자 수익률 히트맵 (Monthly Heatmap)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              연도별 1월부터 12월까지의 월간 자산 증감률 현황
            </p>
          </div>
        </div>

        <table className="w-full text-center text-xs min-w-[700px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-2.5 px-2 text-left">연도</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} className="py-2.5 px-2">{i + 1}월</th>
              ))}
              <th className="py-2.5 px-2 font-black text-gray-900 dark:text-white">연간 합계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {heatmapData.map((row) => {
              const yearTotal = row.months.reduce((sum, v) => sum + v, 0);
              return (
                <tr key={row.year} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-2 text-left font-black text-gray-900 dark:text-white">
                    {row.year}년
                  </td>
                  {row.months.map((val, mIdx) => {
                    const isZero = val === 0;
                    const isPos = val > 0;
                    const bgClass = isZero
                      ? "bg-gray-50 dark:bg-gray-800 text-gray-400"
                      : isPos
                      ? val > 3
                        ? "bg-rose-500 text-white font-bold"
                        : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold"
                      : val < -2
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold";

                    return (
                      <td key={mIdx} className="p-1">
                        <div className={`py-2 px-1 rounded-xl text-[11px] ${bgClass}`}>
                          {isZero ? "-" : `${isPos ? "+" : ""}${val.toFixed(1)}%`}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-3 px-2 font-black text-sm text-gray-900 dark:text-white">
                    {yearTotal > 0 ? "+" : ""}{yearTotal.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
