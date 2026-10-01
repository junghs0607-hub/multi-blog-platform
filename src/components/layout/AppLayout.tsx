"use client";

import React, { useState, ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MarketTickerBar } from "@/components/dashboard/MarketTickerBar";
import { AddAssetModal } from "@/components/modals/AddAssetModal";
import { TradeModal } from "@/components/modals/TradeModal";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AssetItem, AssetCategory } from "@/types/asset";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [addAssetCategory, setAddAssetCategory] = useState<AssetCategory>("KR_STOCK");

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAssetId, setTradeAssetId] = useState<string | undefined>(undefined);

  const [detailAsset, setDetailAsset] = useState<AssetItem | null>(null);

  const handleOpenAddAsset = (cat: AssetCategory = "KR_STOCK") => {
    setAddAssetCategory(cat);
    setIsAddAssetOpen(true);
  };

  const handleOpenTradeModal = (assetId?: string) => {
    setTradeAssetId(assetId);
    setIsTradeModalOpen(true);
  };

  const handleSelectAsset = (asset: AssetItem) => {
    setDetailAsset(asset);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenAddAsset={() => handleOpenAddAsset("KR_STOCK")}
        onOpenTradeModal={() => handleOpenTradeModal()}
      />

      {/* Running Market Ticker Bar */}
      <MarketTickerBar />

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1680px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-full overflow-x-hidden">
          {/* Inject helper handlers into children via React Clone if needed, or children consume context */}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />

      {/* Modals */}
      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        defaultCategory={addAssetCategory}
      />

      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        defaultAssetId={tradeAssetId}
      />

      <AssetDetailModal
        asset={detailAsset}
        isOpen={detailAsset !== null}
        onClose={() => setDetailAsset(null)}
        onOpenTrade={(id) => handleOpenTradeModal(id)}
      />
    </div>
  );
}
