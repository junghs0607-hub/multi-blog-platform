"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, CATEGORY_META } from "@/lib/utils";
import {
  DollarSign,
  Calendar,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
  Calculator,
  Clock,
  CheckCircle2,
} from "lucide-react";

export function DividendCalendarView() {
  const { filteredAssets, annualDividendsKRW, monthlyAverageDividendKRW, isPrivateMode, totalAssetsKRW } = useAsset();
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Default to October (10월)
  const [frequencyFilter, setFrequencyFilter] = useState<string>("ALL");

  // Reinvestment Simulator state
  const [reinvestYears, setReinvestYears] = useState<number>(10);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(500000);
  const [expectedDividendGrowth, setExpectedDividendGrowth] = useState<number>(7.0);

  // Filter income assets
  const incomeAssets = useMemo(() => {
    return filteredAssets.filter((a) => {
      const hasIncome = (a.annualExpectedDividendKRW || 0) > 0 || (a.dividendYield || 0) > 0;
      if (!hasIncome) return false;
      if (frequencyFilter === "ALL") return true;
      if (frequencyFilter === "MONTHLY") return a.dividendFrequency === "monthly";
      if (frequencyFilter === "QUARTERLY") return a.dividendFrequency === "quarterly";
      if (frequencyFilter === "SEMIANNUAL") return a.dividendFrequency === "semiannual";
      if (frequencyFilter === "ANNUAL") return a.dividendFrequency === "annual";
      return true;
    });
  }, [filteredAssets, frequencyFilter]);

  // Generate 12-month expected cash flows per month
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalExpectedKRW: 0,
      actualKRW: 0,
      items: [] as {
        assetName: string;
        code: string;
        category: string;
        amountKRW: number;
        frequency: string;
        payDay: number;
      }[],
    }));

    incomeAssets.forEach((asset) => {
      const annualAmt = asset.annualExpectedDividendKRW || 0;
      if (annualAmt <= 0) return;

      if (asset.dividendFrequency === "monthly" || asset.category === "REAL_ESTATE") {
        const monthlyAmt = Math.round(annualAmt / 12);
        months.forEach((m) => {
          m.totalExpectedKRW += monthlyAmt;
          m.items.push({
            assetName: asset.name,
            code: asset.code,
            category: asset.category,
            amountKRW: monthlyAmt,
            frequency: "월배당",
            payDay: 15,
          });
        });
      } else if (asset.dividendFrequency === "quarterly") {
        const quarterlyAmt = Math.round(annualAmt / 4);
        [3, 6, 9, 12].forEach((mNum) => {
          months[mNum - 1].totalExpectedKRW += quarterlyAmt;
          months[mNum - 1].items.push({
            assetName: asset.name,
            code: asset.code,
            category: asset.category,
            amountKRW: quarterlyAmt,
            frequency: "분기배당",
            payDay: 20,
          });
        });
      } else if (asset.dividendFrequency === "semiannual") {
        const semiAmt = Math.round(annualAmt / 2);
        [6, 12].forEach((mNum) => {
          months[mNum - 1].totalExpectedKRW += semiAmt;
          months[mNum - 1].items.push({
            assetName: asset.name,
            code: asset.code,
            category: asset.category,
            amountKRW: semiAmt,
            frequency: "반기배당",
            payDay: 25,
          });
        });
      } else {
        // Annual
        months[3].totalExpectedKRW += annualAmt; // April in KR
        months[3].items.push({
          assetName: asset.name,
          code: asset.code,
          category: asset.category,
          amountKRW: annualAmt,
          frequency: "연배당",
          payDay: 10,
        });
      }
    });

    return months;
  }, [incomeAssets]);

  const maxMonthlyVal = Math.max(...monthlyData.map((m) => m.totalExpectedKRW), 1000000);
  const selectedMonthData = monthlyData[selectedMonth - 1];

  // Reinvestment Compound Growth Calculation
  const compoundProjection = useMemo(() => {
    let principal = 0;
    let portfolioVal = totalAssetsKRW;
    let annualIncome = annualDividendsKRW;

    const yearlyResults = [];

    for (let yr = 1; yr <= reinvestYears; yr++) {
      principal += monthlyContribution * 12;
      const reinvestedDividends = annualIncome;
      portfolioVal = (portfolioVal + monthlyContribution * 12 + reinvestedDividends) * 1.05; // 5% capital growth
      annualIncome = annualIncome * (1 + expectedDividendGrowth / 100) + (monthlyContribution * 12 + reinvestedDividends) * 0.045; // 4.5% yield on new money

      yearlyResults.push({
        year: yr,
        portfolioValue: Math.round(portfolioVal),
        annualIncome: Math.round(annualIncome),
        monthlyIncome: Math.round(annualIncome / 12),
      });
    }

    return yearlyResults;
  }, [totalAssetsKRW, annualDividendsKRW, reinvestYears, monthlyContribution, expectedDividendGrowth]);

  const finalYear = compoundProjection[compoundProjection.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Overview */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              배당 및 인컴 캐시플로우 허브
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              연간 예상 인컴: {isPrivateMode ? "•••" : formatKRW(annualDividendsKRW)}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              월평균 <span className="font-bold text-emerald-400">{isPrivateMode ? "•••" : formatKRW(monthlyAverageDividendKRW)}</span>의 패시브 인컴이 매월 자동으로 입금됩니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-gray-300">포트폴리오 배당수익률</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {totalAssetsKRW > 0 ? ((annualDividendsKRW / totalAssetsKRW) * 100).toFixed(2) : "0"}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Interactive Dividend Calendar Bar */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              12개월 배당 캘린더 & 월별 예상 현금흐름
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              원하는 월을 클릭하여 세부 입금 내역을 확인하세요.
            </p>
          </div>

          {/* Frequency Filters */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
            {[
              { id: "ALL", label: "전체" },
              { id: "MONTHLY", label: "월배당" },
              { id: "QUARTERLY", label: "분기배당" },
              { id: "SEMIANNUAL", label: "반기배당" },
              { id: "ANNUAL", label: "연배당" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFrequencyFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  frequencyFilter === f.id
                    ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 12-Month Bars */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-6 pb-2 items-end">
          {monthlyData.map((m) => {
            const isSelected = selectedMonth === m.month;
            const heightPct = Math.round((m.totalExpectedKRW / maxMonthlyVal) * 100);
            return (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-sm"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                  {isPrivateMode ? "•••" : formatKRW(m.totalExpectedKRW, true, false)}
                </div>

                <div className="w-full h-24 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[24px] rounded-t-lg transition-all duration-300 ${
                      isSelected
                        ? "bg-emerald-500 shadow-md shadow-emerald-500/30"
                        : "bg-emerald-200 dark:bg-emerald-900/60 hover:bg-emerald-400"
                    }`}
                    style={{ height: `${Math.max(12, heightPct)}%` }}
                  />
                </div>

                <span
                  className={`text-xs font-bold ${
                    isSelected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {m.month}월
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Month Detail View */}
        <div className="mt-6 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                {selectedMonth}월
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {selectedMonth}월 예상 배당금 상세 ({selectedMonthData?.items.length}건)
                </h3>
                <div className="text-xs text-gray-400">
                  총 예상 입금액: <span className="font-bold text-emerald-600 dark:text-emerald-400">{isPrivateMode ? "•••" : formatKRW(selectedMonthData?.totalExpectedKRW)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {selectedMonthData?.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{item.assetName}</span>
                    <span className="text-[10px] text-gray-400">({item.code})</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {item.frequency} · 매월 {item.payDay}일경 지급 예정
                  </div>
                </div>
                <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {isPrivateMode ? "•••" : formatKRW(item.amountKRW)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dividend Reinvestment Compound Simulator (배당 재투자 복리 시뮬레이터) */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-500" />
              배당 재투자 복리 성장 시뮬레이터 (스노우볼 효과)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              배당금을 재투자하고 매월 적립 매수할 때의 미래 자산 및 월배당금 예측
            </p>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-xs">
          <div>
            <label className="block text-gray-500 font-bold mb-1">
              투자 시뮬레이션 기간: <span className="text-blue-600">{reinvestYears}년</span>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={reinvestYears}
              onChange={(e) => setReinvestYears(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-bold mb-1">
              월 추가 적립액: <span className="text-blue-600">{formatKRW(monthlyContribution, true)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={3000000}
              step={100000}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-bold mb-1">
              연간 배당 성장률: <span className="text-blue-600">{expectedDividendGrowth}%</span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={expectedDividendGrowth}
              onChange={(e) => setExpectedDividendGrowth(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Projected Future Banner */}
        {finalYear && (
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white shadow-lg border border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {reinvestYears}년 후 예상 복리 스노우볼 결과
              </div>
              <div className="text-3xl font-black mt-2">
                예상 총 자산: {formatKRW(finalYear.portfolioValue)}
              </div>
              <div className="text-sm text-gray-300 mt-1">
                월 예상 배당금: <span className="font-extrabold text-emerald-400">{formatKRW(finalYear.monthlyIncome)}/월</span> (연 {formatKRW(finalYear.annualIncome)})
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-xs text-gray-300">현재 대비 월 배당 증가율</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                +{(finalYear.monthlyIncome / (monthlyAverageDividendKRW || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
