"use client";

import React, { useState, use } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssetTable } from "@/components/assets/AssetTable";
import { CryptoDashboardView } from "@/components/crypto/CryptoDashboardView";
import { RealEstateView } from "@/components/realestate/RealEstateView";
import { AssetDetailModal } from "@/components/modals/AssetDetailModal";
import { AddAssetModal } from "@/components/modals/AddAssetModal";
import { TradeModal } from "@/components/modals/TradeModal";
import { AssetItem, AssetCategory } from "@/types/asset";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, CATEGORY_META } from "@/lib/utils";
import { Plus } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default function CategoryAssetPage({ params }: CategoryPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.category;

  const { filteredAssets, isPrivateMode } = useAsset();
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAssetId, setTradeAssetId] = useState<string | undefined>(undefined);

  // Map slug to category details
  let mappedCategory: AssetCategory = "KR_STOCK";
  let title = "국내주식 관리";
  let desc = "KOSPI, KOSDAQ 상장주식 실시간 시세, PER/PBR, 재무정보 및 배당 관리";
  let icon = "🇰🇷";

  if (slug === "us-stock") {
    mappedCategory = "US_STOCK";
    title = "해외주식 (미국 직투)";
    desc = "NASDAQ, NYSE 상장주식 실시간 시세, 환율 영향 및 250만원 양도세 시뮬레이션";
    icon = "🇺🇸";
  } else if (slug === "etf") {
    mappedCategory = "ETF";
    title = "ETF & 커버드콜 관리";
    desc = "국내외 지수/섹터 ETF, 고배당 커버드콜(JEPI, JEPQ) 및 월배당 분배금 추적";
    icon = "📊";
  } else if (slug === "crypto") {
    mappedCategory = "CRYPTO";
    title = "가상자산 (크립토 & 김치프리미엄)";
    desc = "24시간 실시간 시세, 업비트/바이낸스 김프, 스테이킹 보상 및 거래소 이동";
    icon = "🪙";
  } else if (slug === "real-estate") {
    mappedCategory = "REAL_ESTATE";
    title = "부동산 & 실물자산 관리";
    desc = "아파트, 오피스텔, 상가 실거래가 시세, 주담대 대출, 보증금 및 월세 순현금흐름";
    icon = "🏢";
  } else if (slug === "funds-bonds") {
    mappedCategory = "BOND";
    title = "펀드 & 채권 관리";
    desc = "국채 10년, 회사채 확정 이자수익, TDF 및 공모펀드 누적수익률";
    icon = "📜";
  } else if (slug === "cash-fx") {
    mappedCategory = "FX";
    title = "현금 & 외화 (FX) 관리";
    desc = "원화 예금, 미국 달러(USD), 엔화(JPY), 유로(EUR) 환율 및 환차익";
    icon = "💵";
  } else if (slug === "gold-commodities") {
    mappedCategory = "COMMODITY";
    title = "금 & 원자재 관리";
    desc = "KRX 금현물(1g), 은, WTI 원유 및 인플레이션 헤지 원자재";
    icon = "🧈";
  }

  // Filter category assets
  const categoryAssets = filteredAssets.filter((a) => {
    if (slug === "etf") return a.category === "ETF" || a.category === "COVERED_CALL";
    if (slug === "funds-bonds") return a.category === "BOND" || a.category === "FUND";
    if (slug === "cash-fx") return a.category === "CASH" || a.category === "FX";
    return a.category === mappedCategory;
  });

  const totalCatValuation = categoryAssets.reduce((sum, a) => sum + a.valuationKRW, 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <span>{icon}</span>
                <span>{title}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl">
                {desc}
              </p>
              <div className="mt-3 text-xs text-blue-300 font-bold">
                보유 {categoryAssets.length}개 종목 · 총 평가액 {isPrivateMode ? "•••" : formatKRW(totalCatValuation)}
              </div>
            </div>

            <button
              onClick={() => setIsAddAssetOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>종목 추가</span>
            </button>
          </div>
        </div>

        {/* Specialized Hub or Universal Table */}
        {slug === "crypto" ? (
          <CryptoDashboardView
            onSelectAsset={(a) => setSelectedAsset(a)}
            onOpenAddAsset={() => setIsAddAssetOpen(true)}
            onOpenTrade={(id) => {
              setTradeAssetId(id);
              setIsTradeModalOpen(true);
            }}
          />
        ) : slug === "real-estate" ? (
          <RealEstateView
            onSelectAsset={(a) => setSelectedAsset(a)}
            onOpenAddAsset={() => setIsAddAssetOpen(true)}
          />
        ) : (
          <AssetTable
            initialCategory={mappedCategory}
            hideCategoryTabs={true}
            onSelectAsset={(a) => setSelectedAsset(a)}
            onOpenAddAsset={() => setIsAddAssetOpen(true)}
            onOpenTrade={(id) => {
              setTradeAssetId(id);
              setIsTradeModalOpen(true);
            }}
          />
        )}

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
          defaultCategory={mappedCategory}
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
