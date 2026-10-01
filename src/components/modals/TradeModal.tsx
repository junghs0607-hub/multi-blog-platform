"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { TransactionType, Currency, AssetCategory } from "@/types/asset";
import { FX_RATES, formatKRW } from "@/lib/utils";
import { X, ArrowRightLeft, Plus } from "lucide-react";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAssetId?: string;
}

const TX_TYPES: { type: TransactionType; label: string; color: string }[] = [
  { type: "BUY", label: "매수", color: "text-rose-500" },
  { type: "SELL", label: "매도", color: "text-blue-500" },
  { type: "DIVIDEND", label: "배당금 수령", color: "text-emerald-500" },
  { type: "DISTRIBUTION", label: "ETF 분배금", color: "text-purple-500" },
  { type: "RENT", label: "부동산 월세", color: "text-teal-500" },
  { type: "INTEREST", label: "이자 수령", color: "text-amber-500" },
  { type: "STAKING_REWARD", label: "스테이킹 보상", color: "text-orange-500" },
  { type: "DEPOSIT", label: "계좌 입금", color: "text-green-500" },
  { type: "WITHDRAW", label: "계좌 출금", color: "text-gray-500" },
  { type: "TRANSFER", label: "자산/거래소 이동", color: "text-indigo-500" },
  { type: "FX_EXCHANGE", label: "외화 환전", color: "text-cyan-500" },
];

export function TradeModal({ isOpen, onClose, defaultAssetId }: TradeModalProps) {
  const { assets, accounts, addTransaction } = useAsset();

  const [txType, setTxType] = useState<TransactionType>("BUY");
  const [selectedAssetId, setSelectedAssetId] = useState<string>(defaultAssetId || assets[0]?.id || "");
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16).replace("T", " ");
  });
  const [quantity, setQuantity] = useState<string>("1");
  const [price, setPrice] = useState<string>("");
  const [amountKRW, setAmountKRW] = useState<string>("");
  const [feeKRW, setFeeKRW] = useState<string>("0");
  const [taxKRW, setTaxKRW] = useState<string>("0");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen) return null;

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const currency: Currency = selectedAsset?.currency || "KRW";

  const handlePriceOrQtyChange = (newQty: string, newPrice: string) => {
    const q = parseFloat(newQty) || 0;
    const p = parseFloat(newPrice) || 0;
    const rate = FX_RATES[currency] || 1;
    const totalKRW = Math.round(q * p * rate);
    if (totalKRW > 0) {
      setAmountKRW(totalKRW.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amtKRW = parseFloat(amountKRW) || (parseFloat(quantity) * parseFloat(price) * (FX_RATES[currency] || 1)) || 0;

    addTransaction({
      date,
      assetId: selectedAsset?.id,
      assetName: selectedAsset?.name || "기타 거래",
      code: selectedAsset?.code,
      category: selectedAsset?.category || "OTHER",
      type: txType,
      quantity: parseFloat(quantity) || undefined,
      price: parseFloat(price) || undefined,
      currency,
      amountKRW: amtKRW,
      amountForeign: currency !== "KRW" ? (parseFloat(quantity) * parseFloat(price)) : undefined,
      feeKRW: parseFloat(feeKRW) || 0,
      taxKRW: parseFloat(taxKRW) || 0,
      accountId: accountId || accounts[0]?.id,
      accountName: accounts.find((a) => a.id === accountId)?.name,
      targetAccountId: txType === "TRANSFER" ? targetAccountId : undefined,
      notes: notes || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                거래 내역 기록 (매수 / 매도 / 배당 등)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                정확한 투자 성과 및 현금흐름 반영
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Trade Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
              거래 유형
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {TX_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setTxType(t.type)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    txType === t.type
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              대상 자산 선택
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                const asset = assets.find((a) => a.id === e.target.value);
                if (asset) {
                  setPrice(asset.currentPrice.toString());
                  handlePriceOrQtyChange(quantity, asset.currentPrice.toString());
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.category}] {a.name} ({a.code}) - {a.currency}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                거래 일시
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                계좌
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                수량
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  handlePriceOrQtyChange(e.target.value, price);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                단가 ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  handlePriceOrQtyChange(quantity, e.target.value);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Total Amount KRW & Fee/Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                총 원화 금액 (KRW) *
              </label>
              <input
                type="number"
                required
                value={amountKRW}
                onChange={(e) => setAmountKRW(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none font-bold text-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                수수료 (원)
              </label>
              <input
                type="number"
                value={feeKRW}
                onChange={(e) => setFeeKRW(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                세금 (원천징수/거래세)
              </label>
              <input
                type="number"
                value={taxKRW}
                onChange={(e) => setTaxKRW(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              메모
            </label>
            <input
              type="text"
              placeholder="예: 분할매수 1차, 분배금 재투자 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all"
            >
              거래 내역 저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
