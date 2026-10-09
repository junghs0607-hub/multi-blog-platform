import { AssetCategory, Currency } from "@/types/asset";

export const FX_RATES: Record<Currency, number> = {
  KRW: 1,
  USD: 1385.5,
  JPY: 9.15, // 100 JPY = 915 KRW -> 1 JPY = 9.15 KRW
  EUR: 1510.2,
  CNY: 191.4,
  GBP: 1790.0,
};

/**
 * Format a number into clean Korean currency string (억원, 만원, 원)
 * Example: 125,400,000 -> 1억 2,540만원
 */
export function formatKRW(val: number | undefined | null, isCompact = false, showUnit = true): string {
  if (val === undefined || val === null || isNaN(val)) return "0원";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (isCompact) {
    if (abs >= 100_000_000) {
      const eok = abs / 100_000_000;
      return `${sign}${eok.toFixed(1)}억${showUnit ? "원" : ""}`;
    }
    if (abs >= 10_000) {
      const man = Math.round(abs / 10_000);
      return `${sign}${man.toLocaleString()}만${showUnit ? "원" : ""}`;
    }
    return `${sign}${Math.round(abs).toLocaleString()}${showUnit ? "원" : ""}`;
  }

  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.floor((abs % 100_000_000) / 10_000);
    if (man === 0) return `${sign}${eok.toLocaleString()}억${showUnit ? "원" : ""}`;
    return `${sign}${eok.toLocaleString()}억 ${man.toLocaleString()}만${showUnit ? "원" : ""}`;
  }

  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000);
    const rest = Math.round(abs % 10_000);
    if (rest === 0) return `${sign}${man.toLocaleString()}만${showUnit ? "원" : ""}`;
    return `${sign}${man.toLocaleString()}만 ${rest.toLocaleString()}${showUnit ? "원" : ""}`;
  }

  return `${sign}${Math.round(abs).toLocaleString()}${showUnit ? "원" : ""}`;
}

/**
 * Format number into standard comma-separated with currency sign
 */
export function formatCurrency(
  val: number | undefined | null,
  currency: Currency = "KRW",
  decimals?: number
): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (currency === "KRW") {
    return `${sign}₩${Math.round(abs).toLocaleString()}`;
  }
  if (currency === "USD") {
    const dec = decimals !== undefined ? decimals : 2;
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  }
  if (currency === "JPY") {
    return `${sign}¥${Math.round(abs).toLocaleString()}`;
  }
  if (currency === "EUR") {
    const dec = decimals !== undefined ? decimals : 2;
    return `${sign}€${abs.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  }
  return `${sign}${abs.toLocaleString()} ${currency}`;
}

/**
 * Format percentage with + / - sign
 */
export function formatPercent(val: number | undefined | null, showPlus = true, decimals = 2): string {
  if (val === undefined || val === null || isNaN(val)) return "0.00%";
  const sign = val > 0 && showPlus ? "+" : "";
  return `${sign}${val.toFixed(decimals)}%`;
}

/**
 * Get standard Tailwind color class for profit / loss
 * Korea standard: Red is UP / Gain (+), Blue is DOWN / Loss (-)
 */
export function getPnLColor(val: number | undefined | null): string {
  if (!val || Math.abs(val) < 0.0001) return "text-gray-400";
  return val > 0 ? "text-rose-500 dark:text-rose-400" : "text-blue-500 dark:text-blue-400";
}

export function getPnLBg(val: number | undefined | null): string {
  if (!val || Math.abs(val) < 0.0001) return "bg-gray-100 dark:bg-gray-800 text-gray-500";
  return val > 0
    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50";
}

/**
 * Category friendly names & badges
 */
export const CATEGORY_META: Record<
  AssetCategory,
  { label: string; short: string; color: string; bg: string; icon: string }
> = {
  KR_STOCK: { label: "국내주식", short: "국내", color: "#ef4444", bg: "bg-red-500/10 text-red-500", icon: "🇰🇷" },
  US_STOCK: { label: "해외주식", short: "해외", color: "#3b82f6", bg: "bg-blue-500/10 text-blue-500", icon: "🇺🇸" },
  ETF: { label: "ETF", short: "ETF", color: "#10b981", bg: "bg-emerald-500/10 text-emerald-500", icon: "📊" },
  COVERED_CALL: { label: "커버드콜 ETF", short: "커버드콜", color: "#8b5cf6", bg: "bg-purple-500/10 text-purple-500", icon: "💰" },
  FUND: { label: "펀드", short: "펀드", color: "#06b6d4", bg: "bg-cyan-500/10 text-cyan-500", icon: "📑" },
  BOND: { label: "채권", short: "채권", color: "#f59e0b", bg: "bg-amber-500/10 text-amber-500", icon: "📜" },
  CRYPTO: { label: "가상자산", short: "코인", color: "#f97316", bg: "bg-orange-500/10 text-orange-500", icon: "🪙" },
  REAL_ESTATE: { label: "부동산", short: "부동산", color: "#14b8a6", bg: "bg-teal-500/10 text-teal-500", icon: "🏢" },
  CASH: { label: "현금", short: "현금", color: "#64748b", bg: "bg-slate-500/10 text-slate-400", icon: "💵" },
  FX: { label: "외화", short: "외화", color: "#6366f1", bg: "bg-indigo-500/10 text-indigo-500", icon: "💱" },
  COMMODITY: { label: "금/원자재", short: "원자재", color: "#eab308", bg: "bg-yellow-500/10 text-yellow-500", icon: "🧈" },
  OTHER: { label: "기타 자산", short: "기타", color: "#a855f7", bg: "bg-fuchsia-500/10 text-fuchsia-500", icon: "📦" },
};

/**
 * Calculate Kimchi Premium %
 * Kimchi Premium = ((KRW Price on Upbit) / (USD Price on Binance * USD/KRW Rate) - 1) * 100
 */
export function calculateKimchiPremium(krwPrice: number, usdPrice: number, usdKrwRate: number = FX_RATES.USD): number {
  if (!usdPrice || !usdKrwRate) return 0;
  const globalKRW = usdPrice * usdKrwRate;
  return ((krwPrice / globalKRW) - 1) * 100;
}

/**
 * Convert value to KRW
 */
export function convertToKRW(val: number, currency: Currency): number {
  const rate = FX_RATES[currency] || 1;
  return val * rate;
}

/**
 * Calculate Capital Gains Tax for US Stocks in Korea
 * - 250만원 (2.5M KRW) basic deduction per year
 * - 22% tax on gains above deduction
 */
export function calculateOverseasStockTax(realizedGainKRW: number): {
  taxableIncome: number;
  taxAmountKRW: number;
  deductionKRW: number;
  taxRatePercent: number;
} {
  const deductionKRW = 2_500_000;
  const taxableIncome = Math.max(0, realizedGainKRW - deductionKRW);
  const taxRatePercent = 22; // 20% 양도세 + 2% 지방소득세
  const taxAmountKRW = taxableIncome * (taxRatePercent / 100);

  return {
    taxableIncome,
    taxAmountKRW,
    deductionKRW,
    taxRatePercent,
  };
}

/**
 * Calculate Dividend Tax in Korea
 * - 15.4% withholding tax (14% dividend income tax + 1.4% local income tax)
 * - Financial Income Comprehensive Taxation threshold: 20,000,000 KRW
 */
export function calculateDividendTax(annualDividendKRW: number): {
  withholdingTaxKRW: number;
  netDividendKRW: number;
  isComprehensiveTaxTarget: boolean;
  excessAmountKRW: number;
} {
  const withholdingTaxKRW = annualDividendKRW * 0.154;
  const netDividendKRW = annualDividendKRW - withholdingTaxKRW;
  const threshold = 20_000_000;
  const isComprehensiveTaxTarget = annualDividendKRW > threshold;
  const excessAmountKRW = Math.max(0, annualDividendKRW - threshold);

  return {
    withholdingTaxKRW,
    netDividendKRW,
    isComprehensiveTaxTarget,
    excessAmountKRW,
  };
}
