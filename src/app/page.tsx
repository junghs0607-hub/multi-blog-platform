"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TotalAssetCard } from "@/components/dashboard/TotalAssetCard";
import { AssetAllocationChart } from "@/components/dashboard/AssetAllocationChart";
import { AssetTimelineChart } from "@/components/dashboard/AssetTimelineChart";
import { AssetClassGrid } from "@/components/dashboard/AssetClassGrid";
import { TopMoversAndHoldings } from "@/components/dashboard/TopMoversAndHoldings";
import { DividendPreviewWidget } from "@/components/dashboard/DividendPreviewWidget";
import { KimchiPremiumWidget } from "@/components/dashboard/KimchiPremiumWidget";
import { AssetTable } from "@/components/assets/AssetTable";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AddAssetModal } from "@/components/modals/AddAssetModal";
import { TradeModal } from "@/components/modals/TradeModal";
import { AssetItem, AssetCategory } from "@/types/asset";

export default function HomePage() {
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAssetId, setTradeAssetId] = useState<string | undefined>(undefined);

  const handleOpenTrade = (assetId?: string) => {
    setTradeAssetId(assetId);
    setIsTradeModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        {/* Hero Section: Net Worth & Total Assets */}
        <TotalAssetCard
          onOpenAddAsset={() => setIsAddAssetOpen(true)}
          onOpenTradeModal={() => handleOpenTrade()}
        />

        {/* 2-Column Interactive Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetAllocationChart />
          <AssetTimelineChart />
        </div>

        {/* 11 Asset Classes Overview Grid */}
        <AssetClassGrid onSelectAsset={() => setIsAddAssetOpen(true)} />

        {/* 2-Column Widgets: Top Holdings & Dividend Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopMoversAndHoldings onSelectAsset={(a) => setSelectedAsset(a)} />
          <DividendPreviewWidget />
        </div>

        {/* 2-Column Widgets: Kimchi Premium & Quick Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KimchiPremiumWidget />
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-sm border border-indigo-900/50 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                DOMINO X 스마트 자산 팁
              </div>
              <h3 className="text-lg font-black mt-1">
                월 370만원 패시브 인컴 파이프라인 운용 중
              </h3>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                현재 부동산 월세(180만), SCHD/JEPI 미국 배당(140만), 국내 ISA 월배당(40만), 이더리움 스테이킹(10만)으로 안정적인 현금흐름이 구축되어 있습니다.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-gray-400">배당 재투자 복리 효과</span>
              <span className="font-bold text-emerald-400">10년 후 월 850만원 예상</span>
            </div>
          </div>
        </div>

        {/* Integrated Asset Ledger Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                보유 자산 전체 목록
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                모든 금융 및 실물 자산 실시간 시세와 손익 현황
              </p>
            </div>
          </div>
          <AssetTable
            onSelectAsset={(a) => setSelectedAsset(a)}
            onOpenAddAsset={() => setIsAddAssetOpen(true)}
            onOpenTrade={(id) => handleOpenTrade(id)}
          />
        </div>
      </div>

      {/* Modals */}
      <AssetDetailModal
        asset={selectedAsset}
        isOpen={selectedAsset !== null}
        onClose={() => setSelectedAsset(null)}
        onOpenTrade={(id) => handleOpenTrade(id)}
      />

      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
      />

      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        defaultAssetId={tradeAssetId}
      />
    </AppLayout>
  );
}
