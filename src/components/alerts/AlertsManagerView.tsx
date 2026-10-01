"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { PriceAlert, AlertCondition } from "@/types/asset";
import { formatKRW, formatPercent } from "@/lib/utils";
import { Bell, Plus, Trash2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";

export function AlertsManagerView() {
  const { alerts, addAlert, toggleAlert, deleteAlert, assets } = useAsset();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || "");
  const [conditionType, setConditionType] = useState<AlertCondition>("TARGET_PRICE_ABOVE");
  const [targetValue, setTargetValue] = useState("80000");
  const [message, setMessage] = useState("");

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === selectedAssetId) || assets[0];
    if (!asset) return;

    addAlert({
      assetId: asset.id,
      assetName: asset.name,
      code: asset.code,
      category: asset.category,
      conditionType,
      targetValue: parseFloat(targetValue) || asset.currentPrice,
      currentValue: asset.currentPrice,
      isEnabled: true,
      message: message || `${asset.name} 조건 알림 설정`,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              가격 및 조건 알림 센터
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              목표가 도달 · 급등락 · 배당락 임박 스마트 알림
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              원하는 목표가 또는 변동률에 도달했을 때 실시간으로 푸시 및 브라우저 알림을 받습니다.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>새 알림 등록</span>
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alt) => (
          <div
            key={alt.id}
            className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              alt.isTriggered
                ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                : "bg-white dark:bg-gray-850 border-gray-200/80 dark:border-gray-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  alt.isTriggered ? "bg-rose-500 text-white" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600"
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                    {alt.assetName} ({alt.code})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {alt.conditionType === "TARGET_PRICE_ABOVE"
                      ? "목표가 이상"
                      : alt.conditionType === "TARGET_PRICE_BELOW"
                      ? "목표가 이하"
                      : alt.conditionType === "PERCENT_CHANGE_UP"
                      ? "급등 알림"
                      : "배당락 알림"}
                  </span>
                  {alt.isTriggered && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      조건 도달 완료
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {alt.message}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-gray-400 mt-2">
                  <span>목표 기준치: {alt.targetValue.toLocaleString()}</span>
                  <span>·</span>
                  <span>현재 시세: {alt.currentValue.toLocaleString()}</span>
                  <span>·</span>
                  <span>생성일: {alt.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => toggleAlert(alt.id)}
                className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                  alt.isEnabled
                    ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    : "text-gray-400 hover:bg-gray-100"
                }`}
              >
                {alt.isEnabled ? "활성화 됨" : "일시정지"}
              </button>

              <button
                onClick={() => deleteAlert(alt.id)}
                className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Alert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              새로운 가격 / 조건 알림 등록
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-500 font-bold mb-1">대상 자산</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code}) - 현재가: {a.currentPrice.toLocaleString()} {a.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">알림 조건</label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  <option value="TARGET_PRICE_ABOVE">목표 가격 이상 상승 시 (≥)</option>
                  <option value="TARGET_PRICE_BELOW">목표 가격 이하 하락 시 (≤)</option>
                  <option value="PERCENT_CHANGE_UP">당일 일정 비율 급등 시 (+%)</option>
                  <option value="PERCENT_CHANGE_DOWN">당일 일정 비율 급락 시 (-%)</option>
                  <option value="EX_DIVIDEND_SOON">배당락일 D-3일 전 알림</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">목표 가격 / 수치</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">알림 메모 / 비고</label>
                <input
                  type="text"
                  placeholder="예: 8만원 도달 시 50% 분할 익절"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  알림 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
