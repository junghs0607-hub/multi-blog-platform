"use client";

import React from "react";
import Link from "next/link";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, getPnLColor, FX_RATES } from "@/lib/utils";
import { Coins, ArrowRight, RefreshCw, Zap } from "lucide-react";

export function KimchiPremiumWidget() {
  const { assets } = useAsset();

  const cryptoCoins = [
    { code: "BTC", name: "비트코인", krwPrice: 135400000, usdPrice: 96800, change24h: 1.88 },
    { code: "ETH", name: "이더리움", krwPrice: 4850000, usdPrice: 3450, change24h: 1.25 },
    { code: "SOL", name: "솔라나", krwPrice: 255000, usdPrice: 182.4, change24h: 2.36 },
    { code: "XRP", name: "리플", krwPrice: 815, usdPrice: 0.58, change24h: 1.62 },
  ];

  const usdKrw = FX_RATES.USD;

  return (
    <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-orange-500" />
            실시간 김치 프리미엄 (가상자산)
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            업비트(KRW) vs 바이낸스(USD) 실시간 괴리율
          </p>
        </div>

        <Link
          href="/assets/crypto"
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>가상자산 허브</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Kimchi Premium Overview Card */}
      <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200 dark:border-orange-900/40 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            비트코인 김치 프리미엄
          </div>
          <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-0.5">
            +1.42%
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-gray-400">환율 기준: ₩{usdKrw.toFixed(1)}</div>
          <div className="font-bold text-gray-700 dark:text-gray-300">
            차액 +{formatKRW(135400000 - 96800 * usdKrw, true)}
          </div>
        </div>
      </div>

      {/* Multi-coin Table */}
      <div className="space-y-2 pt-1">
        {cryptoCoins.map((coin) => {
          const globalKRW = coin.usdPrice * usdKrw;
          const kimpPercent = ((coin.krwPrice / globalKRW) - 1) * 100;
          return (
            <div
              key={coin.code}
              className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {coin.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">({coin.code})</span>
                  <span className={`text-[10px] font-bold ${getPnLColor(coin.change24h)}`}>
                    +{coin.change24h}%
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  업비트: <span className="font-semibold text-gray-700 dark:text-gray-300">{coin.krwPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div className="text-right">
                <div className="font-black text-orange-600 dark:text-orange-400">
                  +{kimpPercent.toFixed(2)}%
                </div>
                <div className="text-[10px] text-gray-400">
                  바이낸스: ${coin.usdPrice.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
