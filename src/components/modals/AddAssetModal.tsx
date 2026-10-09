"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { AssetCategory, Currency } from "@/types/asset";
import { CATEGORY_META, FX_RATES } from "@/lib/utils";
import { X, Plus, Search, Building2, Coins, TrendingUp, Layers, Gem } from "lucide-react";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: AssetCategory;
}

const PRESET_POPULAR_ASSETS = [
  { category: "KR_STOCK" as AssetCategory, name: "삼성전자", code: "005930", currency: "KRW" as Currency, price: 74200, yield: 2.18 },
  { category: "KR_STOCK" as AssetCategory, name: "SK하이닉스", code: "000660", currency: "KRW" as Currency, price: 198000, yield: 1.21 },
  { category: "KR_STOCK" as AssetCategory, name: "현대차", code: "005380", currency: "KRW" as Currency, price: 254000, yield: 4.72 },
  { category: "US_STOCK" as AssetCategory, name: "NVIDIA Corp", code: "NVDA", currency: "USD" as Currency, price: 132.8, yield: 0.08 },
  { category: "US_STOCK" as AssetCategory, name: "Apple Inc", code: "AAPL", currency: "USD" as Currency, price: 228.5, yield: 0.44 },
  { category: "US_STOCK" as AssetCategory, name: "Realty Income", code: "O", currency: "USD" as Currency, price: 62.4, yield: 5.08 },
  { category: "ETF" as AssetCategory, name: "Schwab US Dividend Equity ETF", code: "SCHD", currency: "USD" as Currency, price: 83.2, yield: 3.42 },
  { category: "COVERED_CALL" as AssetCategory, name: "JPMorgan Equity Premium ETF", code: "JEPI", currency: "USD" as Currency, price: 58.6, yield: 7.65 },
  { category: "COVERED_CALL" as AssetCategory, name: "JPMorgan Nasdaq Equity Premium", code: "JEPQ", currency: "USD" as Currency, price: 55.2, yield: 9.42 },
  { category: "ETF" as AssetCategory, name: "TIGER 미국배당다우존스", code: "458730", currency: "KRW" as Currency, price: 11980, yield: 3.65 },
  { category: "CRYPTO" as AssetCategory, name: "비트코인 (Bitcoin)", code: "BTC", currency: "KRW" as Currency, price: 135400000, yield: 0 },
  { category: "CRYPTO" as AssetCategory, name: "이더리움 (Ethereum)", code: "ETH", currency: "KRW" as Currency, price: 4850000, yield: 3.85 },
  { category: "CRYPTO" as AssetCategory, name: "솔라나 (Solana)", code: "SOL", currency: "USD" as Currency, price: 182.4, yield: 6.8 },
  { category: "COMMODITY" as AssetCategory, name: "KRX 금 현물 (1g)", code: "KRX-GOLD", currency: "KRW" as Currency, price: 118500, yield: 0 },
];

export function AddAssetModal({ isOpen, onClose, defaultCategory = "KR_STOCK" }: AddAssetModalProps) {
  const { accounts, addAsset } = useAsset();

  const [category, setCategory] = useState<AssetCategory>(defaultCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [quantity, setQuantity] = useState<string>("10");
  const [avgBuyPrice, setAvgBuyPrice] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [dividendYield, setDividendYield] = useState<string>("");
  const [dividendFrequency, setDividendFrequency] = useState<"monthly" | "quarterly" | "semiannual" | "annual" | "none">("quarterly");

  // Real estate specifics
  const [propertyType, setPropertyType] = useState<"APARTMENT" | "OFFICETEL" | "VILLA" | "COMMERCIAL" | "LAND">("APARTMENT");
  const [address, setAddress] = useState("");
  const [loanAmount, setLoanAmount] = useState<string>("0");
  const [loanInterestRate, setLoanInterestRate] = useState<string>("3.8");
  const [leaseDeposit, setLeaseDeposit] = useState<string>("0");
  const [monthlyRentIncome, setMonthlyRentIncome] = useState<string>("0");

  if (!isOpen) return null;

  const selectPreset = (item: typeof PRESET_POPULAR_ASSETS[0]) => {
    setCategory(item.category);
    setName(item.name);
    setCode(item.code);
    setCurrency(item.currency);
    setCurrentPrice(item.price.toString());
    setAvgBuyPrice(item.price.toString());
    setDividendYield(item.yield.toString());
  };

  const filteredPresets = PRESET_POPULAR_ASSETS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const qty = parseFloat(quantity) || 1;
    const curPrice = parseFloat(currentPrice) || parseFloat(avgBuyPrice) || 0;
    const buyPrice = parseFloat(avgBuyPrice) || curPrice;
    const divYield = parseFloat(dividendYield) || 0;

    let annualDivKRW = 0;
    if (category === "REAL_ESTATE") {
      annualDivKRW = (parseFloat(monthlyRentIncome) || 0) * 12;
    } else if (divYield > 0) {
      const rate = FX_RATES[currency] || 1;
      const totalVal = curPrice * qty * rate;
      annualDivKRW = totalVal * (divYield / 100);
    }

    addAsset({
      category,
      name,
      code: code || name.slice(0, 6).toUpperCase(),
      currency,
      accountId: accountId || accounts[0]?.id,
      quantity: qty,
      avgBuyPrice: buyPrice,
      currentPrice: curPrice,
      dividendYield: divYield,
      annualExpectedDividendKRW: annualDivKRW,
      dividendFrequency: category === "REAL_ESTATE" ? "monthly" : dividendFrequency,
      isCoveredCall: category === "COVERED_CALL",
      propertyType: category === "REAL_ESTATE" ? propertyType : undefined,
      address: category === "REAL_ESTATE" ? address : undefined,
      loanAmount: category === "REAL_ESTATE" ? parseFloat(loanAmount) || 0 : undefined,
      loanInterestRate: category === "REAL_ESTATE" ? parseFloat(loanInterestRate) || 0 : undefined,
      leaseDeposit: category === "REAL_ESTATE" ? parseFloat(leaseDeposit) || 0 : undefined,
      monthlyRentIncome: category === "REAL_ESTATE" ? parseFloat(monthlyRentIncome) || 0 : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                새로운 자산 추가
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                국내/해외주식, ETF, 코인, 부동산, 채권 등 모든 자산군 등록
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Category Selector Pills */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
              자산군 선택
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_META) as AssetCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (cat === "US_STOCK" || cat === "COVERED_CALL") setCurrency("USD");
                      else if (cat === "KR_STOCK" || cat === "REAL_ESTATE") setCurrency("KRW");
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span className="truncate">{meta.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Search Bar */}
          {category !== "REAL_ESTATE" && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  인기 종목에서 빠른 선택
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                {filteredPresets.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => selectPreset(p)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:text-blue-500 font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {p.name} ({p.code})
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Asset Name & Ticker Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  자산명 / 종목명 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 삼성전자, NVIDIA, 비트코인, 마포 래미안"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  종목코드 / 티커 / 식별자
                </label>
                <input
                  type="text"
                  placeholder="예: 005930, NVDA, BTC, SCHD"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Account & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  보유 계좌 선택
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  표시 통화
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="KRW">원화 (KRW ₩)</option>
                  <option value="USD">미국 달러 (USD $)</option>
                  <option value="JPY">일본 엔화 (JPY ¥)</option>
                  <option value="EUR">유럽 유로 (EUR €)</option>
                </select>
              </div>
            </div>

            {/* Quantity, Buy Price, Current Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  보유 수량 *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="예: 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  평균 매수가 ({currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="예: 70000"
                  value={avgBuyPrice}
                  onChange={(e) => setAvgBuyPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  현재 평가가 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="미입력 시 매수가와 동일"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Dividend & Yield */}
            {category !== "REAL_ESTATE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    예상 연간 배당수익률 (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="예: 3.5"
                    value={dividendYield}
                    onChange={(e) => setDividendYield(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    배당 / 분배 주기
                  </label>
                  <select
                    value={dividendFrequency}
                    onChange={(e) => setDividendFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="monthly">월배당 (매월)</option>
                    <option value="quarterly">분기배당 (3/6/9/12월)</option>
                    <option value="semiannual">반기배당 (6/12월)</option>
                    <option value="annual">연배당 (연 1회)</option>
                    <option value="none">배당 없음 (성장주)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Real Estate Specifics */}
            {category === "REAL_ESTATE" && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50 space-y-3">
                <div className="font-bold text-xs text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  부동산 대출 & 임대차 정보
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      부동산 유형
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    >
                      <option value="APARTMENT">아파트</option>
                      <option value="OFFICETEL">오피스텔</option>
                      <option value="VILLA">빌라/연립</option>
                      <option value="COMMERCIAL">상가/빌딩</option>
                      <option value="LAND">토지</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      소재지 주소
                    </label>
                    <input
                      type="text"
                      placeholder="예: 서울 마포구 아현동"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      대출금 (주담대, 원)
                    </label>
                    <input
                      type="number"
                      placeholder="400000000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      대출금리 (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3.85"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      임대 보증금 (원)
                    </label>
                    <input
                      type="number"
                      placeholder="200000000"
                      value={leaseDeposit}
                      onChange={(e) => setLeaseDeposit(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      월세 수입 (월, 원)
                    </label>
                    <input
                      type="number"
                      placeholder="1800000"
                      value={monthlyRentIncome}
                      onChange={(e) => setMonthlyRentIncome(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                자산 포트폴리오에 등록하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
