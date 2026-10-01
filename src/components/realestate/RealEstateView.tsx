"use client";

import React from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem } from "@/types/asset";
import { formatKRW, formatPercent, getPnLColor } from "@/lib/utils";
import {
  Building2,
  Plus,
  Home,
  ShieldCheck,
  TrendingUp,
  Percent,
  Banknote,
  DollarSign,
  Calendar,
} from "lucide-react";

interface RealEstateViewProps {
  onSelectAsset?: (asset: AssetItem) => void;
  onOpenAddAsset?: () => void;
}

export function RealEstateView({ onSelectAsset, onOpenAddAsset }: RealEstateViewProps) {
  const { filteredAssets, isPrivateMode, totalAssetsKRW } = useAsset();

  const realEstateAssets = filteredAssets.filter((a) => a.category === "REAL_ESTATE");

  let totalValuationKRW = 0;
  let totalInvestedKRW = 0;
  let totalLoanKRW = 0;
  let totalDepositKRW = 0;
  let totalMonthlyRentKRW = 0;
  let totalMonthlyInterestKRW = 0;

  realEstateAssets.forEach((p) => {
    totalValuationKRW += p.valuationKRW || 0;
    totalInvestedKRW += p.investedKRW || 0;
    totalLoanKRW += p.loanAmount || 0;
    totalDepositKRW += p.leaseDeposit || 0;
    totalMonthlyRentKRW += p.monthlyRentIncome || 0;
    totalMonthlyInterestKRW += p.monthlyLoanInterest || 0;
  });

  const netEquityKRW = totalValuationKRW - totalLoanKRW - totalDepositKRW;
  const netMonthlyCashflowKRW = totalMonthlyRentKRW - totalMonthlyInterestKRW;
  const ltvPercent = totalValuationKRW > 0 ? (totalLoanKRW / totalValuationKRW) * 100 : 0;
  const capRate = totalValuationKRW > 0 ? ((totalMonthlyRentKRW * 12) / totalValuationKRW) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              부동산 & 실물자산 통합 관리
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              부동산 실질 순자산 (Equity): {isPrivateMode ? "•••" : formatKRW(netEquityKRW)}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              총 평가액 <span className="font-bold text-white">{isPrivateMode ? "•••" : formatKRW(totalValuationKRW)}</span>에서 대출 및 임대보증금을 차감한 순자산입니다.
            </p>
          </div>

          {onOpenAddAsset && (
            <button
              onClick={onOpenAddAsset}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>부동산 추가</span>
            </button>
          )}
        </div>

        {/* 4 Financial Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400">월세 순 현금흐름</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
              +{isPrivateMode ? "•••" : formatKRW(netMonthlyCashflowKRW)}/월
            </div>
            <div className="text-[10px] text-gray-400">
              수입 {formatKRW(totalMonthlyRentKRW, true)} - 이자 {formatKRW(totalMonthlyInterestKRW, true)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400">주담대 대출 총액</div>
            <div className="text-base sm:text-lg font-black text-rose-300 mt-1">
              {isPrivateMode ? "•••" : formatKRW(totalLoanKRW)}
            </div>
            <div className="text-[10px] text-gray-400">LTV {ltvPercent.toFixed(1)}%</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400">임대보증금 합계</div>
            <div className="text-base sm:text-lg font-black text-gray-200 mt-1">
              {isPrivateMode ? "•••" : formatKRW(totalDepositKRW)}
            </div>
            <div className="text-[10px] text-gray-400">전/월세 보증금 부채</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-gray-400">부동산 임대수익률</div>
            <div className="text-base sm:text-lg font-black text-teal-400 mt-1">
              연 {capRate.toFixed(2)}%
            </div>
            <div className="text-[10px] text-gray-400">총 평가액 대비 연 임대료</div>
          </div>
        </div>
      </div>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {realEstateAssets.map((property) => {
          const equity = property.valuationKRW - (property.loanAmount || 0) - (property.leaseDeposit || 0);
          const pnl = property.valuationKRW - property.investedKRW;
          const pnlPct = property.investedKRW > 0 ? (pnl / property.investedKRW) * 100 : 0;
          const netMonthly = (property.monthlyRentIncome || 0) - (property.monthlyLoanInterest || 0);

          return (
            <div
              key={property.id}
              onClick={() => onSelectAsset && onSelectAsset(property)}
              className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-teal-500/60 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏢</span>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                      {property.name}
                    </h3>
                  </div>
                  {property.address && (
                    <div className="text-xs text-gray-400 mt-1">
                      📍 {property.address} {property.areaPyeong ? `(${property.areaPyeong}평)` : ""}
                    </div>
                  )}
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                  {property.propertyType}
                </span>
              </div>

              {/* Price & Equity Breakdown */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-xs">
                <div>
                  <div className="text-gray-400">현재 평가 시세</div>
                  <div className="font-black text-base text-gray-900 dark:text-white mt-0.5">
                    {isPrivateMode ? "•••" : formatKRW(property.valuationKRW)}
                  </div>
                  <div className={`text-[11px] font-bold ${getPnLColor(pnlPct)}`}>
                    시세차익 {isPrivateMode ? "•••" : formatKRW(pnl, true)} ({formatPercent(pnlPct)})
                  </div>
                </div>

                <div>
                  <div className="text-gray-400">실질 순자산 (Equity)</div>
                  <div className="font-black text-base text-teal-600 dark:text-teal-400 mt-0.5">
                    {isPrivateMode ? "•••" : formatKRW(equity)}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    부채 {formatKRW((property.loanAmount || 0) + (property.leaseDeposit || 0), true)} 공제 후
                  </div>
                </div>
              </div>

              {/* Debt & Cash flow */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-gray-400 text-[10px] block">대출금 (금리)</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {isPrivateMode ? "•••" : formatKRW(property.loanAmount, true)}
                  </span>
                  <span className="text-[10px] text-gray-400 block">연 {property.loanInterestRate}%</span>
                </div>

                <div>
                  <span className="text-gray-400 text-[10px] block">보증금</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {isPrivateMode ? "•••" : formatKRW(property.leaseDeposit, true)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-[10px] block">월세 순수익</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    +{isPrivateMode ? "•••" : formatKRW(netMonthly, true)}/월
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
