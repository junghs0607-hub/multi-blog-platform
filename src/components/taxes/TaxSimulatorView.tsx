"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, calculateOverseasStockTax, calculateDividendTax } from "@/lib/utils";
import {
  Receipt,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Sparkles,
  Calculator,
} from "lucide-react";

export function TaxSimulatorView() {
  const { annualDividendsKRW, filteredAssets, isPrivateMode } = useAsset();

  // US Stock Tax state
  const [usRealizedProfitKRW, setUsRealizedProfitKRW] = useState<number>(8500000); // 850만원 실현손익 가정
  const [usLossHarvestingKRW, setUsLossHarvestingKRW] = useState<number>(2000000); // 200만원 손실확정 매매 가정

  // Pension Tax state
  const [pensionDepositKRW, setPensionDepositKRW] = useState<number>(6000000);
  const [irpDepositKRW, setIrpDepositKRW] = useState<number>(3000000);
  const [taxCreditRate, setTaxCreditRate] = useState<number>(16.5); // 16.5% (총급여 5500만 이하) or 13.2%

  // Calculations
  const adjustedUsProfit = Math.max(0, usRealizedProfitKRW - usLossHarvestingKRW);
  const usTaxCalc = calculateOverseasStockTax(adjustedUsProfit);
  const rawUsTaxCalc = calculateOverseasStockTax(usRealizedProfitKRW);
  const savedTaxFromHarvesting = rawUsTaxCalc.taxAmountKRW - usTaxCalc.taxAmountKRW;

  const divTaxCalc = calculateDividendTax(annualDividendsKRW);

  const totalPensionDeposit = Math.min(9000000, pensionDepositKRW + irpDepositKRW);
  const pensionTaxRefund = totalPensionDeposit * (taxCreditRate / 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-rose-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Receipt className="w-4 h-4" />
              세금 관리 & 절세 시뮬레이터 (Tax Engine)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              국내/해외주식 & 배당소득세 & 절세계좌 시뮬레이션
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              해외주식 250만원 기본공제, 배당소득세 15.4%, ISA 및 연금저축 세액공제 혜택을 한눈에 계산합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Income Comprehensive Tax Warning (금융소득종합과세 2000만원 모니터링) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
              금융소득종합과세 (2,000만원 한도) 안전선 모니터링
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            기준선 2,000만원
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-gray-500">
              현재 연간 총 배당/이자 소득: <span className="text-gray-900 dark:text-white font-black">{isPrivateMode ? "•••" : formatKRW(annualDividendsKRW)}</span>
            </span>
            <span className={annualDividendsKRW >= 20000000 ? "text-rose-500 font-black" : "text-emerald-500 font-black"}>
              {annualDividendsKRW >= 20000000
                ? "⚠️ 종합과세 대상 초과"
                : `✓ 안전 구간 (잔여 한도: ${formatKRW(20000000 - annualDividendsKRW, true)})`}
            </span>
          </div>

          <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                annualDividendsKRW >= 20000000 ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, (annualDividendsKRW / 20000000) * 100)}%` }}
            />
          </div>

          <div className="text-xs text-gray-400">
            * 2,000만원 초과 시 다른 종합소득(근로소득, 사업소득 등)과 합산되어 최고 45% 누진세율이 적용됩니다. 초과분은 ISA 및 비과세 계좌를 활용하세요.
          </div>
        </div>
      </div>

      {/* Overseas Capital Gains Tax Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              해외주식 양도소득세 & 손실확정 절세 계산
            </h3>
          </div>

          <p className="text-xs text-gray-400">
            해외주식은 연간 250만원 공제 후 초과 실현손익에 대해 22% 단일세율이 부과됩니다.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-gray-500 font-bold mb-1">올해 실현 수익 (원)</label>
              <input
                type="number"
                step={500000}
                value={usRealizedProfitKRW}
                onChange={(e) => setUsRealizedProfitKRW(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-500 font-bold mb-1">
                손실확정 매매 금액 (Loss Harvesting, 절세 매도)
              </label>
              <input
                type="number"
                step={500000}
                value={usLossHarvestingKRW}
                onChange={(e) => setUsLossHarvestingKRW(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold text-blue-600"
              />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">기본공제 (250만원)</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">-2,500,000원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">과세표준 금액</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatKRW(usTaxCalc.taxableIncome)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-800 dark:text-gray-200">최종 예상 양도세 (22%)</span>
                <span className="font-black text-rose-500 text-sm">{formatKRW(usTaxCalc.taxAmountKRW)}</span>
              </div>
              {savedTaxFromHarvesting > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold pt-1">
                  <span>손실확정 절세 절감액</span>
                  <span>+{formatKRW(savedTaxFromHarvesting)} 절세 성공!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pension Savings & IRP Tax Refund Simulator */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              연금저축 & IRP 연말정산 세액공제 환급 계산
            </h3>
          </div>

          <p className="text-xs text-gray-400">
            연금저축(최대 600만) + IRP 합산 최대 900만원 납입 시 16.5% 또는 13.2% 세액환급
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 font-bold mb-1">연금저축 납입액</label>
                <input
                  type="number"
                  step={500000}
                  value={pensionDepositKRW}
                  onChange={(e) => setPensionDepositKRW(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">IRP 납입액</label>
                <input
                  type="number"
                  step={500000}
                  value={irpDepositKRW}
                  onChange={(e) => setIrpDepositKRW(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 font-bold mb-1">총급여 기준 공제율</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaxCreditRate(16.5)}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                    taxCreditRate === 16.5
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  16.5% (총급여 5,500만원 이하)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxCreditRate(13.2)}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                    taxCreditRate === 13.2
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  13.2% (총급여 5,500만원 초과)
                </button>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">세액공제 인정 납입한도</span>
                <span className="font-bold">{formatKRW(totalPensionDeposit)} / 9,000,000원</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-emerald-200 dark:border-emerald-900/50">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">연말정산 13월의 월급 환급액</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                  +{formatKRW(pensionTaxRefund)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
