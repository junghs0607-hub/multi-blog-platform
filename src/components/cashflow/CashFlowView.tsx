"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent } from "@/lib/utils";
import {
  Flame,
  TrendingUp,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export function CashFlowView() {
  const { filteredAssets, annualDividendsKRW, monthlyAverageDividendKRW, isPrivateMode, totalAssetsKRW } = useAsset();

  // FIRE Goals state
  const [targetMonthlyExpense, setTargetMonthlyExpense] = useState<number>(3500000); // 350만원 목표

  // Calculate detailed inflows
  let rentInflowMonthly = 0;
  let dividendInflowMonthly = 0;
  let interestInflowMonthly = 0;
  let stakingInflowMonthly = 0;

  // Calculate detailed outflows
  let loanInterestOutflowMonthly = 0;
  let maintenanceCostMonthly = 0;

  filteredAssets.forEach((a) => {
    if (a.category === "REAL_ESTATE") {
      rentInflowMonthly += a.monthlyRentIncome || 0;
      loanInterestOutflowMonthly += a.monthlyLoanInterest || 0;
      maintenanceCostMonthly += a.maintenanceCostMonthly || 0;
    } else if (a.category === "BOND") {
      interestInflowMonthly += (a.annualExpectedDividendKRW || 0) / 12;
    } else if (a.category === "CRYPTO" && a.isStaked) {
      stakingInflowMonthly += (a.annualExpectedDividendKRW || 0) / 12;
    } else if (a.annualExpectedDividendKRW) {
      dividendInflowMonthly += a.annualExpectedDividendKRW / 12;
    }
  });

  const totalInflowsMonthly = rentInflowMonthly + dividendInflowMonthly + interestInflowMonthly + stakingInflowMonthly;
  const totalOutflowsMonthly = loanInterestOutflowMonthly + maintenanceCostMonthly;
  const netMonthlyCashflow = totalInflowsMonthly - totalOutflowsMonthly;

  // FIRE progress %
  const fireProgressPct = targetMonthlyExpense > 0 ? (netMonthlyCashflow / targetMonthlyExpense) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              현금흐름 (Cash Flow) & FIRE 조기은퇴 플래너
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              월 순 현금흐름: {isPrivateMode ? "•••" : `+${formatKRW(netMonthlyCashflow)}`}/월
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              수입(배당/월세/이자)에서 고정 지출(대출이자/관리비)을 차감한 실제 매월 통장에 남는 잉여 현금입니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              FIRE 달성률 {fireProgressPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* FIRE Progress & Freedom Meter */}
      <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              재정적 자유 (FIRE) 달성 게이지
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              목표 월 생활비를 매월 발생하는 패시브 인컴으로 100% 충당할 수 있는지 점검합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-400">목표 월 생활비:</span>
            <input
              type="number"
              step={100000}
              value={targetMonthlyExpense}
              onChange={(e) => setTargetMonthlyExpense(parseInt(e.target.value) || 0)}
              className="px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white w-32 font-bold text-center"
            />
            <span>원</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-black">
            <span className="text-emerald-600 dark:text-emerald-400">
              현재 패시브 인컴: {isPrivateMode ? "•••" : formatKRW(netMonthlyCashflow)}/월
            </span>
            <span className="text-gray-500">
              목표: {formatKRW(targetMonthlyExpense)}/월 ({fireProgressPct.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, fireProgressPct))}%` }}
            />
          </div>
          {fireProgressPct >= 100 ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
              <CheckCircle2 className="w-4 h-4" />
              축하합니다! 현재 패시브 인컴만으로 목표 월 생활비를 100% 충당하는 완전한 경제적 자유를 달성했습니다!
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-1">
              목표 달성까지 매월 <span className="font-bold text-blue-500">{isPrivateMode ? "•••" : formatKRW(targetMonthlyExpense - netMonthlyCashflow)}</span>의 추가 현금흐름이 필요합니다.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Inflows vs Outflows Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inflows Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              월간 수입 (Inflow) 상세
            </h3>
            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
              +{isPrivateMode ? "•••" : formatKRW(totalInflowsMonthly)}/월
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">🏢 부동산 월세 수입</span>
              <span className="font-black text-gray-900 dark:text-white">
                +{isPrivateMode ? "•••" : formatKRW(rentInflowMonthly)}/월
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">💰 주식 & ETF 배당 / 분배금</span>
              <span className="font-black text-gray-900 dark:text-white">
                +{isPrivateMode ? "•••" : formatKRW(dividendInflowMonthly)}/월
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">📜 채권 및 예금 확정 이자</span>
              <span className="font-black text-gray-900 dark:text-white">
                +{isPrivateMode ? "•••" : formatKRW(interestInflowMonthly)}/월
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">🪙 가상자산 PoS 스테이킹 보상</span>
              <span className="font-black text-gray-900 dark:text-white">
                +{isPrivateMode ? "•••" : formatKRW(stakingInflowMonthly)}/월
              </span>
            </div>
          </div>
        </div>

        {/* Outflows Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
              월간 지출 (Outflow) 상세
            </h3>
            <span className="font-black text-sm text-rose-500">
              -{isPrivateMode ? "•••" : formatKRW(totalOutflowsMonthly)}/월
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">🏦 부동산 주택담보대출 이자</span>
              <span className="font-black text-rose-500">
                -{isPrivateMode ? "•••" : formatKRW(loanInterestOutflowMonthly)}/월
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">🛠️ 부동산 공과금 & 관리비</span>
              <span className="font-black text-rose-500">
                -{isPrivateMode ? "•••" : formatKRW(maintenanceCostMonthly)}/월
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-300 font-bold">🧾 거래 수수료 및 유관비용</span>
              <span className="font-black text-gray-500">
                약 -15,000원/월
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
