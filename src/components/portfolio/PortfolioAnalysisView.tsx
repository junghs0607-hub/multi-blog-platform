"use client";

import React, { useState, useMemo } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW, formatPercent, getPnLColor, CATEGORY_META } from "@/lib/utils";
import { AssetCategory } from "@/types/asset";
import {
  PieChart,
  Layers,
  Scale,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Globe2,
  Shield,
  Plus,
} from "lucide-react";

export function PortfolioAnalysisView() {
  const { filteredAssets, totalAssetsKRW, isPrivateMode, portfolioGroups } = useAsset();
  const [activeTab, setActiveTab] = useState<"allocation" | "rebalance" | "groups">("allocation");

  // Rebalancing Target Percentages state
  const [targets, setTargets] = useState<Record<AssetCategory, number>>({
    KR_STOCK: 15,
    US_STOCK: 20,
    ETF: 15,
    COVERED_CALL: 10,
    CRYPTO: 10,
    REAL_ESTATE: 15,
    BOND: 5,
    FUND: 3,
    CASH: 3,
    FX: 2,
    COMMODITY: 2,
    OTHER: 0,
  });

  // Calculate current weights per category
  const currentCategoryWeights = useMemo(() => {
    const map: Record<AssetCategory, { valueKRW: number; currentPct: number }> = {
      KR_STOCK: { valueKRW: 0, currentPct: 0 },
      US_STOCK: { valueKRW: 0, currentPct: 0 },
      ETF: { valueKRW: 0, currentPct: 0 },
      COVERED_CALL: { valueKRW: 0, currentPct: 0 },
      FUND: { valueKRW: 0, currentPct: 0 },
      BOND: { valueKRW: 0, currentPct: 0 },
      CRYPTO: { valueKRW: 0, currentPct: 0 },
      REAL_ESTATE: { valueKRW: 0, currentPct: 0 },
      CASH: { valueKRW: 0, currentPct: 0 },
      FX: { valueKRW: 0, currentPct: 0 },
      COMMODITY: { valueKRW: 0, currentPct: 0 },
      OTHER: { valueKRW: 0, currentPct: 0 },
    };

    filteredAssets.forEach((a) => {
      if (map[a.category]) {
        map[a.category].valueKRW += a.valuationKRW;
      }
    });

    (Object.keys(map) as AssetCategory[]).forEach((cat) => {
      map[cat].currentPct = totalAssetsKRW > 0 ? (map[cat].valueKRW / totalAssetsKRW) * 100 : 0;
    });

    return map;
  }, [filteredAssets, totalAssetsKRW]);

  // Rebalancing computations
  const rebalancingPlan = useMemo(() => {
    const totalTargetPct = Object.values(targets).reduce((sum, v) => sum + v, 0);

    return (Object.keys(targets) as AssetCategory[]).map((cat) => {
      const meta = CATEGORY_META[cat];
      const currentVal = currentCategoryWeights[cat]?.valueKRW || 0;
      const currentPct = currentCategoryWeights[cat]?.currentPct || 0;
      const targetPct = targets[cat] || 0;

      const targetVal = totalAssetsKRW * (targetPct / 100);
      const diffKRW = targetVal - currentVal;
      const action = diffKRW > 100000 ? "BUY" : diffKRW < -100000 ? "SELL" : "HOLD";

      return {
        category: cat,
        label: meta.label,
        icon: meta.icon,
        currentVal,
        currentPct,
        targetPct,
        targetVal,
        diffKRW,
        action,
      };
    }).sort((a, b) => Math.abs(b.diffKRW) - Math.abs(a.diffKRW));
  }, [targets, currentCategoryWeights, totalAssetsKRW]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <PieChart className="w-4 h-4" />
              포트폴리오 정밀 진단 & 리밸런싱
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              자산 배분 최적화 분석실
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              목표 비중과 현재 비중의 괴리를 분석하고, 최적의 매수/매도 리밸런싱 주문을 제안합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              분산도 지수 92점 (우수)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "allocation", label: "자산군 & 통화 다각도 비중", icon: PieChart },
          { id: "rebalance", label: "리밸런싱 계산기", icon: Scale },
          { id: "groups", label: "커스텀 테마 포트폴리오", icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Rebalancing Studio Tab */}
      {activeTab === "rebalance" && (
        <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-500" />
                목표 비중 대비 리밸런싱 시뮬레이션
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                슬라이더로 각 자산군의 목표 비중을 설정하면 필요한 매매 금액을 자동 산출합니다.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {rebalancingPlan.map((item) => (
              <div
                key={item.category}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3 min-w-[180px]">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-extrabold text-sm text-gray-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      현재: {item.currentPct.toFixed(1)}% ({isPrivateMode ? "•••" : formatKRW(item.currentVal, true)})
                    </div>
                  </div>
                </div>

                {/* Target Slider */}
                <div className="flex-1 max-w-xs space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-gray-400">목표 비중</span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                      {targets[item.category]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={targets[item.category]}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        [item.category]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Action Badge */}
                <div className="text-right min-w-[140px]">
                  {item.action === "BUY" && (
                    <div className="text-rose-500 font-black text-sm">
                      +{isPrivateMode ? "•••" : formatKRW(item.diffKRW, true)} 매수 필요
                    </div>
                  )}
                  {item.action === "SELL" && (
                    <div className="text-blue-500 font-black text-sm">
                      {isPrivateMode ? "•••" : formatKRW(Math.abs(item.diffKRW), true)} 매도 필요
                    </div>
                  )}
                  {item.action === "HOLD" && (
                    <div className="text-emerald-500 font-bold text-xs">
                      ✓ 목표 비중 유지 중
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    목표 평가액 {isPrivateMode ? "•••" : formatKRW(item.targetVal, true)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Theme Portfolio Groups Tab */}
      {activeTab === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioGroups.map((group) => {
            const groupAssets = filteredAssets.filter((a) => group.assetIds.includes(a.id));
            const groupValuation = groupAssets.reduce((sum, a) => sum + a.valuationKRW, 0);
            const groupWeight = totalAssetsKRW > 0 ? (groupValuation / totalAssetsKRW) * 100 : 0;

            return (
              <div
                key={group.id}
                className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: group.color || "#3b82f6" }}
                  >
                    목표 {group.targetPercent}%
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-gray-400">현재 그룹 평가액</div>
                    <div className="font-black text-lg text-gray-900 dark:text-white mt-0.5">
                      {isPrivateMode ? "•••" : formatKRW(groupValuation)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400">현재 비중</div>
                    <div className="font-extrabold text-base text-blue-600 dark:text-blue-400 mt-0.5">
                      {groupWeight.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-400 uppercase">포함된 자산 목록 ({groupAssets.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupAssets.map((a) => (
                      <span
                        key={a.id}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-750 text-xs font-semibold text-gray-800 dark:text-gray-200"
                      >
                        {a.name} ({a.code})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Allocation Deep Dive Tab */}
      {activeTab === "allocation" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-500" />
              국가 및 지역별 노출도
            </h3>
            <p className="text-xs text-gray-400">
              한국 원화 자산과 미국 달러 자산 간의 이상적 분산 비율 (약 6:4 또는 5:5 권장)
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>대한민국 원화 자산 (KRW)</span>
                  <span>58.4%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: "58.4%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>미국 달러 자산 (USD)</span>
                  <span>34.2%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "34.2%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>글로벌 / 기타 (가상자산/금)</span>
                  <span>7.4%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "7.4%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              위험 성향 및 자산 프로필 분산
            </h3>
            <p className="text-xs text-gray-400">
              하락장 방어용 안전자산과 장기 자본성장용 성장자산 비율
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>안전자산 (금 / 국채 / 예금)</span>
                  <span className="text-emerald-500">14.8%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "14.8%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>현금흐름 인컴 (월배당 / 월세 / 커버드콜)</span>
                  <span className="text-purple-500">42.5%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "42.5%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>자본 성장형 (빅테크 / 반도체 / 코인)</span>
                  <span className="text-blue-500">42.7%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "42.7%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
