"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetItem, Currency } from "@/types/asset";
import { formatKRW, formatPercent, getPnLColor, FX_RATES } from "@/lib/utils";
import {
  Coins,
  ArrowRightLeft,
  Lock,
  Zap,
  Globe2,
  Wallet,
  ShieldCheck,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface CryptoDashboardViewProps {
  onSelectAsset?: (asset: AssetItem) => void;
  onOpenTrade?: (assetId: string) => void;
  onOpenAddAsset?: () => void;
}

export function CryptoDashboardView({
  onSelectAsset,
  onOpenTrade,
  onOpenAddAsset,
}: CryptoDashboardViewProps) {
  const { filteredAssets, totalAssetsKRW, isPrivateMode, addTransaction } = useAsset();
  const [activeTab, setActiveTab] = useState<"overview" | "exchanges" | "staking" | "transfer">("overview");

  // Transfer modal state
  const [transferCoin, setTransferCoin] = useState("BTC");
  const [transferQty, setTransferQty] = useState("0.1");
  const [fromExchange, setFromExchange] = useState("업비트");
  const [toExchange, setToExchange] = useState("바이낸스");
  const [transferNotes, setTransferNotes] = useState("트래블룰 정상 승인");

  const cryptoAssets = filteredAssets.filter((a) => a.category === "CRYPTO");

  const totalCryptoKRW = cryptoAssets.reduce((sum, a) => sum + a.valuationKRW, 0);
  const totalCryptoInvestedKRW = cryptoAssets.reduce((sum, a) => sum + a.investedKRW, 0);
  const cryptoPnL = totalCryptoKRW - totalCryptoInvestedKRW;
  const cryptoReturnPct = totalCryptoInvestedKRW > 0 ? (cryptoPnL / totalCryptoInvestedKRW) * 100 : 0;

  // Staked assets
  const stakedAssets = cryptoAssets.filter((a) => a.isStaked);
  const totalStakingRewardsKRW = cryptoAssets.reduce(
    (sum, a) => sum + (a.accumulatedStakingRewardKRW || 0),
    0
  );

  // Exchange breakdown
  const exchangeMap: Record<string, { valueKRW: number; count: number; coins: string[] }> = {
    업비트: { valueKRW: 0, count: 0, coins: [] },
    바이낸스: { valueKRW: 0, count: 0, coins: [] },
    빗썸: { valueKRW: 0, count: 0, coins: [] },
    개인지갑: { valueKRW: 0, count: 0, coins: [] },
  };

  cryptoAssets.forEach((a) => {
    const ex = a.exchange === "BINANCE" ? "바이낸스" : a.exchange === "WALLET" ? "개인지갑" : a.exchange === "BITHUMB" ? "빗썸" : "업비트";
    if (exchangeMap[ex]) {
      exchangeMap[ex].valueKRW += a.valuationKRW;
      exchangeMap[ex].count += 1;
      exchangeMap[ex].coins.push(a.code);
    }
  });

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty) || 0;
    const targetAsset = cryptoAssets.find((a) => a.code === transferCoin) || cryptoAssets[0];
    const unitPrice = targetAsset?.currentPrice || 100000000;
    const rate = FX_RATES[targetAsset?.currency || "KRW"] || 1;
    const amtKRW = qty * unitPrice * rate;

    addTransaction({
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      assetId: targetAsset?.id,
      assetName: targetAsset?.name || `${transferCoin} 자산이동`,
      code: transferCoin,
      category: "CRYPTO",
      type: "TRANSFER",
      quantity: qty,
      price: unitPrice,
      currency: targetAsset?.currency || "KRW",
      amountKRW: amtKRW,
      accountId: targetAsset?.accountId || "acc-upbit",
      notes: `${fromExchange} ➔ ${toExchange} 이동: ${transferNotes}`,
    });

    alert(`${transferCoin} ${qty}개가 ${fromExchange}에서 ${toExchange}(으)로 안전하게 이동 기록되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-orange-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <Coins className="w-4 h-4" />
              가상자산 통합 관리 & 김치 프리미엄
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              가상자산 평가액: {isPrivateMode ? "•••" : formatKRW(totalCryptoKRW)}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm">
              <span className={`font-bold px-2.5 py-0.5 rounded-full ${cryptoPnL >= 0 ? "bg-rose-500/20 text-rose-300" : "bg-blue-500/20 text-blue-300"}`}>
                평가손익 {cryptoPnL >= 0 ? "+" : ""}{isPrivateMode ? "•••" : formatKRW(cryptoPnL, true)} ({formatPercent(cryptoReturnPct)})
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-300">총 {cryptoAssets.length}개 코인 보유</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddAsset && (
              <button
                onClick={onOpenAddAsset}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>코인 추가</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "보유 코인 & 시세", icon: Coins },
          { id: "exchanges", label: "거래소별 자산", icon: Globe2 },
          { id: "staking", label: "스테이킹 & 보상", icon: Lock },
          { id: "transfer", label: "거래소 간 자산 이동", icon: ArrowRightLeft },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? "bg-orange-600 text-white shadow-md shadow-orange-500/25"
                  : "bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cryptoAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelectAsset && onSelectAsset(asset)}
              className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-orange-500/60 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg">
                    🪙
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{asset.name}</span>
                      <span className="text-xs font-bold text-gray-400">({asset.code})</span>
                    </h3>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      거래소: <span className="font-semibold text-gray-700 dark:text-gray-300">{asset.exchange || "UPBIT"}</span>
                      {asset.isStaked && <span className="ml-2 text-emerald-500 font-bold">🔒 스테이킹 중</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-base text-gray-900 dark:text-white">
                    {isPrivateMode ? "•••" : formatKRW(asset.valuationKRW)}
                  </div>
                  <div className={`text-xs font-bold ${getPnLColor(asset.pnlPercent)}`}>
                    {formatPercent(asset.pnlPercent)}
                  </div>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-xs">
                <div>
                  <div className="text-gray-400 text-[10px]">보유 수량</div>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {asset.quantity} {asset.code}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">현재 시세</div>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {asset.currentPrice.toLocaleString()} {asset.currency}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">김치 프리미엄</div>
                  <div className="font-black text-orange-600 dark:text-orange-400 mt-0.5">
                    +{asset.kimchiPremiumPercent || 1.4}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "exchanges" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(exchangeMap).map(([exName, info]) => (
            <div
              key={exName}
              className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {exName}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  {info.count}개 코인
                </span>
              </div>

              <div className="text-xl font-black text-gray-900 dark:text-white">
                {isPrivateMode ? "•••" : formatKRW(info.valueKRW)}
              </div>

              <div className="text-xs text-gray-400">
                보유: {info.coins.length > 0 ? info.coins.join(", ") : "없음"}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "staking" && (
        <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                스테이킹 및 PoS 이자 보상 현황
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                누적 수령 보상액: <span className="font-bold text-emerald-500">{isPrivateMode ? "•••" : formatKRW(totalStakingRewardsKRW)}</span>
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {stakedAssets.map((asset) => (
              <div key={asset.id} className="py-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{asset.name}</span>
                    <span className="text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      연이율 {asset.stakingApy}%
                    </span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    스테이킹 수량: {asset.stakedAmount} {asset.code} · 매월 자동 지급
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    연간 예상: {isPrivateMode ? "•••" : formatKRW(asset.annualExpectedDividendKRW)}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    누적 수령: {isPrivateMode ? "•••" : formatKRW(asset.accumulatedStakingRewardKRW || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              거래소 간 / 개인지갑 자산 이동 기록
            </h3>
          </div>

          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 font-bold mb-1">출발 거래소/지갑</label>
                <select
                  value={fromExchange}
                  onChange={(e) => setFromExchange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="업비트">업비트 (Upbit)</option>
                  <option value="바이낸스">바이낸스 (Binance)</option>
                  <option value="빗썸">빗썸 (Bithumb)</option>
                  <option value="메타마스크">메타마스크 (개인지갑)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">도착 거래소/지갑</label>
                <select
                  value={toExchange}
                  onChange={(e) => setToExchange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="바이낸스">바이낸스 (Binance)</option>
                  <option value="업비트">업비트 (Upbit)</option>
                  <option value="빗썸">빗썸 (Bithumb)</option>
                  <option value="메타마스크">메타마스크 (개인지갑)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 font-bold mb-1">이동 코인</label>
                <select
                  value={transferCoin}
                  onChange={(e) => setTransferCoin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="BTC">비트코인 (BTC)</option>
                  <option value="ETH">이더리움 (ETH)</option>
                  <option value="SOL">솔라나 (SOL)</option>
                  <option value="XRP">리플 (XRP)</option>
                  <option value="USDT">테더 (USDT)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">이동 수량</label>
                <input
                  type="number"
                  step="any"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 font-bold mb-1">트랜잭션 메모</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
            >
              자산 이동 기록하기
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
