"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssetTable } from "@/components/assets/AssetTable";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AddAssetModal } from "@/components/modals/AddAssetModal";
import { TradeModal } from "@/components/modals/TradeModal";
import { AssetItem, AssetCategory } from "@/types/asset";
import { useAsset } from "@/context/AssetContext";
import { formatKRW } from "@/lib/utils";
import { Layers, Plus } from "lucide-react";

export default function AssetsPage() {
  const { filteredAssets, totalAssetsKRW, isPrivateMode } = useAsset();
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAssetId, setTradeAssetId] = useState<string | undefined>(undefined);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                통합 자산 관리 (ALL ASSETS)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                전체 자산 포트폴리오 원장
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                총 {filteredAssets.length}개 자산 · 합계 평가액 {isPrivateMode ? "•••" : formatKRW(totalAssetsKRW)}
              </p>
            </div>

            <button
              onClick={() => setIsAddAssetOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>자산 추가</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <AssetTable
          onSelectAsset={(a) => setSelectedAsset(a)}
          onOpenAddAsset={() => setIsAddAssetOpen(true)}
          onOpenTrade={(id) => {
            setTradeAssetId(id);
            setIsTradeModalOpen(true);
          }}
        />

        {/* Modals */}
        <AssetDetailModal
          asset={selectedAsset}
          isOpen={selectedAsset !== null}
          onClose={() => setSelectedAsset(null)}
          onOpenTrade={(id) => {
            setTradeAssetId(id);
            setIsTradeModalOpen(true);
          }}
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
      </div>
    </AppLayout>
  );
}
