"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem } from "@/types/asset";
import {
  formatKRW,
  formatCurrency,
  formatPercent,
  getPnLColor,
  getPnLBg,
  CATEGORY_META,
  FX_RATES,
} from "@/lib/utils";
import {
  X,
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  Coins,
  Shield,
  Layers,
  ArrowRightLeft,
  Trash2,
  Edit,
  Tag,
  ExternalLink,
} from "lucide-react";

interface AssetDetailModalProps {
  asset: AssetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTrade?: (assetId: string) => void;
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  onOpenTrade,
}: AssetDetailModalProps) {
  const { deleteAsset, updateAsset, transactions, isPrivateMode, totalAssetsKRW } = useAsset();
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "transactions" | "settings">("overview");
  const [isEditing, setIsEditing] = useState(false);

  // Edit states
  const [editQty, setEditQty] = useState(asset?.quantity.toString() || "0");
  const [editBuyPrice, setEditBuyPrice] = useState(asset?.avgBuyPrice.toString() || "0");
  const [editCurPrice, setEditCurPrice] = useState(asset?.currentPrice.toString() || "0");
  const [editNotes, setEditNotes] = useState(asset?.notes || "");

  if (!isOpen || !asset) return null;

  const meta = CATEGORY_META[asset.category];
  const weightPercent = totalAssetsKRW > 0 ? (asset.valuationKRW / totalAssetsKRW) * 100 : 0;
  const assetTransactions = transactions.filter((t) => t.assetId === asset.id || t.code === asset.code);

  const handleSaveEdit = () => {
    updateAsset(asset.id, {
      quantity: parseFloat(editQty) || asset.quantity,
      avgBuyPrice: parseFloat(editBuyPrice) || asset.avgBuyPrice,
      currentPrice: parseFloat(editCurPrice) || asset.currentPrice,
      notes: editNotes,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`'${asset.name}' 자산을 포트폴리오에서 삭제하시겠습니까?`)) {
      deleteAsset(asset.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-850 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-750 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/80 dark:to-gray-850">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-200/50 dark:border-gray-700"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <span>{meta.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    {asset.name}
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-gray-750 text-gray-700 dark:text-gray-300">
                    {asset.code}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.bg}`}>
                    {meta.label}
                  </span>
                  {asset.isCoveredCall && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                      커버드콜
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>시장: {asset.market || meta.label}</span>
                  <span>·</span>
                  <span>보유 계좌: {asset.accountName || "메인계좌"}</span>
                  <span>·</span>
                  <span>자산 비중: {weightPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenTrade && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenTrade(asset.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>거래 입력</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Current Price Banner */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase">현재 평가액</div>
              <div className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW)}
              </div>
              {asset.currency !== "KRW" && (
                <div className="text-[11px] text-gray-400">
                  {isPrivateMode ? "•••" : formatCurrency(asset.valuationUSD, asset.currency)}
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase">평가 손익</div>
              <div className={`text-lg font-black mt-0.5 ${getPnLColor(asset.pnlKRW)}`}>
                {isPrivateMode ? "•••" : formatKRW(asset.pnlKRW)}
              </div>
              <div className={`text-xs font-bold ${getPnLColor(asset.pnlPercent)}`}>
                {formatPercent(asset.pnlPercent)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase">현재 시세 / 단가</div>
              <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                {formatCurrency(asset.currentPrice, asset.currency)}
              </div>
              <div className="text-[11px] text-gray-400">
                매수가: {formatCurrency(asset.avgBuyPrice, asset.currency)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase">보유 수량</div>
              <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                {asset.quantity.toLocaleString()} {asset.category === "COMMODITY" ? asset.unit || "g" : "주"}
              </div>
              <div className="text-[11px] text-gray-400">
                매입총액: {isPrivateMode ? "•••" : formatKRW(asset.investedKRW, true)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-750 px-6 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            자산 개요 & 상세
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "metrics"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            배당 및 지표
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "transactions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            거래 내역 ({assetTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            수정 및 관리
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Category-Specific Visual Box */}
              {asset.category === "REAL_ESTATE" && (
                <div className="p-5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      부동산 자산 및 레버리지 분석 (순자산 / 부채 / 현금흐름)
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                      {asset.propertyType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">실질 순자산 (Equity)</div>
                      <div className="font-black text-sm text-teal-600 dark:text-teal-400 mt-1">
                        {isPrivateMode
                          ? "•••"
                          : formatKRW(
                              asset.valuationKRW - (asset.loanAmount || 0) - (asset.leaseDeposit || 0)
                            )}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">대출 원금 (주담대)</div>
                      <div className="font-bold text-sm text-rose-500 mt-1">
                        {isPrivateMode ? "•••" : formatKRW(asset.loanAmount)}
                      </div>
                      <div className="text-[10px] text-gray-400">연 {asset.loanInterestRate}%</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">임대 보증금</div>
                      <div className="font-bold text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {isPrivateMode ? "•••" : formatKRW(asset.leaseDeposit)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">월세 순 현금흐름</div>
                      <div className="font-bold text-sm text-emerald-600 mt-1">
                        +
                        {isPrivateMode
                          ? "•••"
                          : formatKRW(
                              (asset.monthlyRentIncome || 0) - (asset.monthlyLoanInterest || 0)
                            )}
                        /월
                      </div>
                      <div className="text-[10px] text-gray-400">
                        수입 {formatKRW(asset.monthlyRentIncome)} - 이자 {formatKRW(asset.monthlyLoanInterest)}
                      </div>
                    </div>
                  </div>

                  {asset.address && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      📍 주소: <span className="font-medium text-gray-900 dark:text-white">{asset.address}</span>
                      {asset.areaPyeong && <span> ({asset.areaPyeong}평)</span>}
                    </div>
                  )}
                </div>
              )}

              {asset.category === "CRYPTO" && (
                <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-orange-900 dark:text-orange-200 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-orange-600" />
                      가상자산 거래소 & 김치프리미엄 & 스테이킹
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-200/60 text-orange-800 dark:text-orange-300">
                      {asset.exchange || "UPBIT"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">김치 프리미엄</div>
                      <div className="font-bold text-sm text-orange-600 dark:text-orange-400 mt-1">
                        +{asset.kimchiPremiumPercent || 1.45}%
                      </div>
                      <div className="text-[10px] text-gray-400">해외 대비 국내가</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">스테이킹 상태</div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {asset.isStaked ? "🔒 스테이킹 중" : "일반 보유"}
                      </div>
                      {asset.stakingApy && (
                        <div className="text-[10px] text-emerald-500 font-semibold">
                          연이율 {asset.stakingApy}%
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">누적 보상액</div>
                      <div className="font-bold text-sm text-emerald-600 mt-1">
                        {isPrivateMode
                          ? "•••"
                          : formatKRW(asset.accumulatedStakingRewardKRW || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                      <div className="text-gray-400 font-medium">24시간 거래대금</div>
                      <div className="font-bold text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {formatKRW(asset.volume24h, true)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 52-Week Range Bar */}
              {(asset.high52w || asset.low52w) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
                    <span>52주 최저: {formatCurrency(asset.low52w, asset.currency)}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      현재가: {formatCurrency(asset.currentPrice, asset.currency)}
                    </span>
                    <span>52주 최고: {formatCurrency(asset.high52w, asset.currency)}</span>
                  </div>
                  {asset.high52w && asset.low52w && (
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              ((asset.currentPrice - asset.low52w) /
                                (asset.high52w - asset.low52w)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Notes & Tags */}
              {asset.notes && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-900/40">
                  <div className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">
                    📝 투자 메모 / 분석 노트
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {asset.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "metrics" && (
            <div className="space-y-4">
              {/* Dividend / Income Box */}
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  배당 / 분배금 현황
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                    <div className="text-gray-400 font-medium">연간 예상 배당금</div>
                    <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      {isPrivateMode ? "•••" : formatKRW(asset.annualExpectedDividendKRW)}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                    <div className="text-gray-400 font-medium">배당수익률 (Yield)</div>
                    <div className="font-bold text-sm text-emerald-600 mt-1">
                      {asset.dividendYield ? `${asset.dividendYield}%` : "0%"}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                    <div className="text-gray-400 font-medium">배당 주기</div>
                    <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                      {asset.dividendFrequency === "monthly"
                        ? "매월 (월배당)"
                        : asset.dividendFrequency === "quarterly"
                        ? "분기 (3/6/9/12월)"
                        : asset.dividendFrequency === "semiannual"
                        ? "반기 (6/12월)"
                        : asset.dividendFrequency === "annual"
                        ? "연 1회"
                        : "해당 없음"}
                    </div>
                  </div>
                </div>

                {(asset.exDividendDate || asset.dividendPayDate) && (
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-1">
                    {asset.exDividendDate && <span>📅 배당락일: {asset.exDividendDate}</span>}
                    {asset.dividendPayDate && <span>💰 지급예정일: {asset.dividendPayDate}</span>}
                  </div>
                )}
              </div>

              {/* Financial Ratios Grid (Stocks & ETFs) */}
              {(asset.per || asset.pbr || asset.eps || asset.roe) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="font-bold text-xs text-gray-500 uppercase">재무 정보 및 밸류에이션</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white dark:bg-gray-750 rounded-xl">
                      <div className="text-gray-400">PER (주가수익비율)</div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {asset.per ? `${asset.per}배` : "-"}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-750 rounded-xl">
                      <div className="text-gray-400">PBR (주가순자산비율)</div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {asset.pbr ? `${asset.pbr}배` : "-"}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-750 rounded-xl">
                      <div className="text-gray-400">EPS (주당순이익)</div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {asset.eps ? formatCurrency(asset.eps, asset.currency) : "-"}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-750 rounded-xl">
                      <div className="text-gray-400">ROE (자기자본이익률)</div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-1">
                        {asset.roe ? `${asset.roe}%` : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  이 종목의 거래 이력 ({assetTransactions.length}건)
                </span>
              </div>
              {assetTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  등록된 거래 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {assetTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {tx.type === "BUY"
                              ? "매수"
                              : tx.type === "SELL"
                              ? "매도"
                              : tx.type === "DIVIDEND"
                              ? "배당금 수령"
                              : tx.type === "RENT"
                              ? "월세 수입"
                              : tx.type}
                          </span>
                          <span className="text-gray-400">{tx.date}</span>
                        </div>
                        {tx.notes && <div className="text-gray-500 text-[11px] mt-0.5">{tx.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatKRW(tx.amountKRW)}
                        </div>
                        {tx.quantity && (
                          <div className="text-gray-400 text-[11px]">
                            {tx.quantity}개 @ {formatCurrency(tx.price, tx.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="font-bold text-xs text-gray-700 dark:text-gray-300">
                  자산 정보 직접 수정
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">보유 수량</label>
                    <input
                      type="number"
                      step="any"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      평균 매수가 ({asset.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editBuyPrice}
                      onChange={(e) => setEditBuyPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      현재 평가가 ({asset.currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editCurPrice}
                      onChange={(e) => setEditCurPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">투자 메모</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  변경사항 저장
                </button>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-rose-700 dark:text-rose-400">
                    자산 삭제
                  </div>
                  <div className="text-[11px] text-gray-500">
                    포트폴리오에서 이 자산을 영구히 제거합니다.
                  </div>
                </div>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
