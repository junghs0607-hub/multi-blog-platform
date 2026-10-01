"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import {
  AssetItem,
  Account,
  Transaction,
  WatchlistItem,
  PriceAlert,
  EconomicEvent,
  MarketIndex,
  PortfolioGroup,
  AIAnalysisResult,
  AssetCategory,
  Currency,
} from "@/types/asset";
import {
  INITIAL_ACCOUNTS,
  INITIAL_ASSETS,
  INITIAL_TRANSACTIONS,
  INITIAL_WATCHLIST,
  INITIAL_ALERTS,
  INITIAL_MARKET_INDICES,
  INITIAL_ECONOMIC_EVENTS,
  INITIAL_PORTFOLIO_GROUPS,
  INITIAL_AI_ANALYSIS,
} from "@/lib/mockData";
import { FX_RATES, CATEGORY_META, convertToKRW, calculateKimchiPremium } from "@/lib/utils";

interface CategoryAllocation {
  category: AssetCategory;
  label: string;
  short: string;
  valueKRW: number;
  percent: number;
  color: string;
  count: number;
}

interface AssetContextType {
  // Data
  assets: AssetItem[];
  filteredAssets: AssetItem[];
  accounts: Account[];
  transactions: Transaction[];
  watchlist: WatchlistItem[];
  alerts: PriceAlert[];
  marketIndices: MarketIndex[];
  economicEvents: EconomicEvent[];
  portfolioGroups: PortfolioGroup[];
  aiAnalysis: AIAnalysisResult;

  // Global Settings & Filters
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (curr: Currency) => void;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  isLiveTickActive: boolean;
  toggleLiveTick: () => void;

  // Real-time Aggregates
  totalAssetsKRW: number;
  totalDebtKRW: number;
  netWorthKRW: number;
  totalInvestedKRW: number;
  totalPnLKRW: number;
  totalReturnPercent: number;
  todayPnLKRW: number;
  todayPnLPercent: number;
  annualDividendsKRW: number;
  monthlyAverageDividendKRW: number;
  dividendYieldOnTotal: number;
  dividendYieldOnCost: number;
  categoryAllocations: CategoryAllocation[];

  // Actions
  addAsset: (asset: Partial<AssetItem>) => void;
  updateAsset: (id: string, updates: Partial<AssetItem>) => void;
  deleteAsset: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (acc: Omit<Account, "id">) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  toggleWatchlist: (item: Partial<WatchlistItem>) => void;
  isWatchlisted: (code: string) => boolean;
  addAlert: (alert: Omit<PriceAlert, "id" | "createdAt" | "isTriggered">) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  simulateTick: () => void;
  resetToDemoData: () => void;
  exportToJSON: () => string;
  importFromJSON: (jsonString: string) => boolean;
  importFromCSV: (rows: any[]) => void;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ASSETS: "domino_assets_v2",
  ACCOUNTS: "domino_accounts_v2",
  TRANSACTIONS: "domino_transactions_v2",
  WATCHLIST: "domino_watchlist_v2",
  ALERTS: "domino_alerts_v2",
  SETTINGS: "domino_settings_v2",
};

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<AssetItem[]>(INITIAL_ASSETS);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(INITIAL_WATCHLIST);
  const [alerts, setAlerts] = useState<PriceAlert[]>(INITIAL_ALERTS);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>(INITIAL_MARKET_INDICES);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>(INITIAL_ECONOMIC_EVENTS);
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroup[]>(INITIAL_PORTFOLIO_GROUPS);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult>(INITIAL_AI_ANALYSIS);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("KRW");
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isLiveTickActive, setIsLiveTickActive] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
      const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const savedWatchlist = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      const savedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

      if (savedAssets) setAssets(JSON.parse(savedAssets));
      if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.displayCurrency) setDisplayCurrency(parsed.displayCurrency);
        if (parsed.isPrivateMode !== undefined) setIsPrivateMode(parsed.isPrivateMode);
        if (parsed.theme) setTheme(parsed.theme);
      }
    } catch (e) {
      console.warn("Error loading data from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ displayCurrency, isPrivateMode, theme })
      );
    } catch (e) {
      console.warn("Error saving to localStorage:", e);
    }
  }, [assets, accounts, transactions, watchlist, alerts, displayCurrency, isPrivateMode, theme, isHydrated]);

  // Sync theme to document root
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Filtered Assets based on selected account
  const filteredAssets = useMemo(() => {
    if (selectedAccountId === "ALL") return assets;
    return assets.filter((a) => a.accountId === selectedAccountId);
  }, [assets, selectedAccountId]);

  // Calculations for Real-time Aggregates
  const {
    totalAssetsKRW,
    totalDebtKRW,
    netWorthKRW,
    totalInvestedKRW,
    totalPnLKRW,
    totalReturnPercent,
    todayPnLKRW,
    todayPnLPercent,
    annualDividendsKRW,
    monthlyAverageDividendKRW,
    dividendYieldOnTotal,
    dividendYieldOnCost,
    categoryAllocations,
  } = useMemo(() => {
    let tVal = 0;
    let tInvest = 0;
    let tDebt = 0;
    let tTodayPnL = 0;
    let tAnnualDiv = 0;

    const catMap: Record<AssetCategory, { valueKRW: number; count: number }> = {
      KR_STOCK: { valueKRW: 0, count: 0 },
      US_STOCK: { valueKRW: 0, count: 0 },
      ETF: { valueKRW: 0, count: 0 },
      COVERED_CALL: { valueKRW: 0, count: 0 },
      FUND: { valueKRW: 0, count: 0 },
      BOND: { valueKRW: 0, count: 0 },
      CRYPTO: { valueKRW: 0, count: 0 },
      REAL_ESTATE: { valueKRW: 0, count: 0 },
      CASH: { valueKRW: 0, count: 0 },
      FX: { valueKRW: 0, count: 0 },
      COMMODITY: { valueKRW: 0, count: 0 },
      OTHER: { valueKRW: 0, count: 0 },
    };

    filteredAssets.forEach((asset) => {
      const val = asset.valuationKRW || 0;
      const inv = asset.investedKRW || 0;
      tVal += val;
      tInvest += inv;

      // Real estate debt (mortgage + deposit)
      if (asset.category === "REAL_ESTATE") {
        tDebt += (asset.loanAmount || 0) + (asset.leaseDeposit || 0);
      }

      // Today PnL
      if (asset.change24h && asset.quantity) {
        const rate = FX_RATES[asset.currency] || 1;
        const todayChangeKRW = asset.change24h * asset.quantity * rate;
        tTodayPnL += todayChangeKRW;
      }

      // Expected annual income / dividends / rent / coupons / staking
      if (asset.annualExpectedDividendKRW) {
        tAnnualDiv += asset.annualExpectedDividendKRW;
      }

      // Grouping
      if (catMap[asset.category]) {
        catMap[asset.category].valueKRW += val;
        catMap[asset.category].count += 1;
      }
    });

    const netWorth = tVal - tDebt;
    const pnl = tVal - tInvest;
    const returnPct = tInvest > 0 ? (pnl / tInvest) * 100 : 0;
    const prevDayVal = tVal - tTodayPnL;
    const todayPct = prevDayVal > 0 ? (tTodayPnL / prevDayVal) * 100 : 0;
    const monthlyDiv = tAnnualDiv / 12;
    const divYieldTotal = tVal > 0 ? (tAnnualDiv / tVal) * 100 : 0;
    const divYieldCost = tInvest > 0 ? (tAnnualDiv / tInvest) * 100 : 0;

    const allocations: CategoryAllocation[] = (Object.keys(catMap) as AssetCategory[])
      .filter((cat) => catMap[cat].valueKRW > 0 || catMap[cat].count > 0)
      .map((cat) => {
        const meta = CATEGORY_META[cat];
        const val = catMap[cat].valueKRW;
        return {
          category: cat,
          label: meta.label,
          short: meta.short,
          valueKRW: val,
          percent: tVal > 0 ? (val / tVal) * 100 : 0,
          color: meta.color,
          count: catMap[cat].count,
        };
      })
      .sort((a, b) => b.valueKRW - a.valueKRW);

    return {
      totalAssetsKRW: tVal,
      totalDebtKRW: tDebt,
      netWorthKRW: netWorth,
      totalInvestedKRW: tInvest,
      totalPnLKRW: pnl,
      totalReturnPercent: returnPct,
      todayPnLKRW: tTodayPnL,
      todayPnLPercent: todayPct,
      annualDividendsKRW: tAnnualDiv,
      monthlyAverageDividendKRW: monthlyDiv,
      dividendYieldOnTotal: divYieldTotal,
      dividendYieldOnCost: divYieldCost,
      categoryAllocations: allocations,
    };
  }, [filteredAssets]);

  // Real-time market tick simulator (subtle fluctuations)
  const simulateTick = () => {
    setAssets((prev) =>
      prev.map((asset) => {
        // Skip real estate & cash for ticks
        if (asset.category === "REAL_ESTATE" || asset.category === "CASH") return asset;

        const maxFluct = asset.category === "CRYPTO" ? 0.008 : 0.003;
        const deltaPct = (Math.random() * 2 - 1) * maxFluct; // -0.3% to +0.3%
        const newPrice = Math.max(0.01, asset.currentPrice * (1 + deltaPct));
        const prevClose = asset.previousClosePrice || asset.currentPrice;
        const change = newPrice - prevClose;
        const changePct = (change / prevClose) * 100;
        const rate = FX_RATES[asset.currency] || 1;

        const valOrig = newPrice * asset.quantity;
        const valKRW = asset.currency === "KRW" ? valOrig : valOrig * rate;
        const valUSD = asset.currency === "USD" ? valOrig : valKRW / FX_RATES.USD;

        const investedKRW = asset.investedKRW || (asset.avgBuyPrice * asset.quantity * rate);
        const pnlKRW = valKRW - investedKRW;
        const pnlPct = investedKRW > 0 ? (pnlKRW / investedKRW) * 100 : 0;

        return {
          ...asset,
          currentPrice: Number(newPrice.toFixed(asset.currency === "USD" ? 2 : 0)),
          change24h: Number(change.toFixed(asset.currency === "USD" ? 2 : 0)),
          change24hPercent: Number(changePct.toFixed(2)),
          valuationKRW: Math.round(valKRW),
          valuationUSD: Number(valUSD.toFixed(2)),
          pnlKRW: Math.round(pnlKRW),
          pnlPercent: Number(pnlPct.toFixed(2)),
        };
      })
    );

    // Also tick market indices
    setMarketIndices((prev) =>
      prev.map((idx) => {
        const deltaPct = (Math.random() * 2 - 1) * 0.002;
        const newVal = idx.value * (1 + deltaPct);
        const change = newVal - (idx.value - idx.change);
        const changePct = ((newVal - (idx.value - idx.change)) / (idx.value - idx.change)) * 100;
        return {
          ...idx,
          value: Number(newVal.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePct.toFixed(2)),
        };
      })
    );
  };

  // Background ticker loop
  useEffect(() => {
    if (!isLiveTickActive) return;
    const interval = setInterval(() => {
      simulateTick();
    }, 4500);
    return () => clearInterval(interval);
  }, [isLiveTickActive]);

  // Actions
  const addAsset = (newAssetData: Partial<AssetItem>) => {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const currency = newAssetData.currency || "KRW";
    const rate = FX_RATES[currency] || 1;
    const quantity = Number(newAssetData.quantity) || 1;
    const currentPrice = Number(newAssetData.currentPrice) || Number(newAssetData.avgBuyPrice) || 0;
    const avgBuyPrice = Number(newAssetData.avgBuyPrice) || currentPrice;

    const valOrig = currentPrice * quantity;
    const valKRW = currency === "KRW" ? valOrig : valOrig * rate;
    const valUSD = currency === "USD" ? valOrig : valKRW / FX_RATES.USD;

    const invOrig = avgBuyPrice * quantity;
    const invKRW = currency === "KRW" ? invOrig : invOrig * rate;
    const invUSD = currency === "USD" ? invOrig : invKRW / FX_RATES.USD;

    const pnlKRW = valKRW - invKRW;
    const pnlPercent = invKRW > 0 ? (pnlKRW / invKRW) * 100 : 0;

    const asset: AssetItem = {
      id,
      category: newAssetData.category || "KR_STOCK",
      name: newAssetData.name || "신규 자산",
      code: newAssetData.code || "NEW",
      currency,
      accountId: newAssetData.accountId || accounts[0]?.id || "acc-toss-brokerage",
      accountName: accounts.find((a) => a.id === newAssetData.accountId)?.name || "기본계좌",
      quantity,
      avgBuyPrice,
      currentPrice,
      previousClosePrice: currentPrice,
      change24h: 0,
      change24hPercent: 0,
      valuationKRW: Math.round(valKRW),
      valuationUSD: Number(valUSD.toFixed(2)),
      investedKRW: Math.round(invKRW),
      investedUSD: Number(invUSD.toFixed(2)),
      pnlKRW: Math.round(pnlKRW),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      customTags: newAssetData.customTags || [],
      ...newAssetData,
    };

    setAssets((prev) => [asset, ...prev]);
  };

  const updateAsset = (id: string, updates: Partial<AssetItem>) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...updates };
        const rate = FX_RATES[merged.currency] || 1;
        const valOrig = merged.currentPrice * merged.quantity;
        const valKRW = merged.currency === "KRW" ? valOrig : valOrig * rate;
        const valUSD = merged.currency === "USD" ? valOrig : valKRW / FX_RATES.USD;

        const invOrig = merged.avgBuyPrice * merged.quantity;
        const invKRW = merged.currency === "KRW" ? invOrig : invOrig * rate;
        const invUSD = merged.currency === "USD" ? invOrig : invKRW / FX_RATES.USD;

        const pnlKRW = valKRW - invKRW;
        const pnlPercent = invKRW > 0 ? (pnlKRW / invKRW) * 100 : 0;

        return {
          ...merged,
          valuationKRW: Math.round(valKRW),
          valuationUSD: Number(valUSD.toFixed(2)),
          investedKRW: Math.round(invKRW),
          investedUSD: Number(invUSD.toFixed(2)),
          pnlKRW: Math.round(pnlKRW),
          pnlPercent: Number(pnlPercent.toFixed(2)),
        };
      })
    );
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const addTransaction = (txData: Omit<Transaction, "id">) => {
    const id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const tx: Transaction = {
      id,
      ...txData,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Automatically update or adjust related asset if it's BUY/SELL
    if (tx.assetId && (tx.type === "BUY" || tx.type === "SELL")) {
      const asset = assets.find((a) => a.id === tx.assetId);
      if (asset) {
        if (tx.type === "BUY" && tx.quantity && tx.price) {
          const newQty = asset.quantity + tx.quantity;
          const newInvested = asset.investedKRW + tx.amountKRW;
          const newAvgPrice = newQty > 0 ? (asset.avgBuyPrice * asset.quantity + tx.price * tx.quantity) / newQty : asset.avgBuyPrice;
          updateAsset(asset.id, {
            quantity: newQty,
            avgBuyPrice: Number(newAvgPrice.toFixed(2)),
            investedKRW: newInvested,
          });
        } else if (tx.type === "SELL" && tx.quantity) {
          const newQty = Math.max(0, asset.quantity - tx.quantity);
          updateAsset(asset.id, {
            quantity: newQty,
          });
        }
      }
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addAccount = (accData: Omit<Account, "id">) => {
    const id = `acc-${Date.now()}`;
    setAccounts((prev) => [...prev, { id, ...accData }]);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (selectedAccountId === id) setSelectedAccountId("ALL");
  };

  const toggleWatchlist = (item: Partial<WatchlistItem>) => {
    if (!item.code) return;
    const exists = watchlist.some((w) => w.code === item.code);
    if (exists) {
      setWatchlist((prev) => prev.filter((w) => w.code !== item.code));
    } else {
      const newItem: WatchlistItem = {
        id: `wl-${Date.now()}`,
        code: item.code,
        name: item.name || item.code,
        category: item.category || "KR_STOCK",
        currency: item.currency || "KRW",
        currentPrice: item.currentPrice || 1000,
        change24h: item.change24h || 0,
        changePercent: item.changePercent || 0,
        sparkline: item.sparkline || [95, 98, 102, 100, 104, 105, 108],
        ...item,
      };
      setWatchlist((prev) => [...prev, newItem]);
    }
  };

  const isWatchlisted = (code: string) => {
    return watchlist.some((w) => w.code === code);
  };

  const addAlert = (alertData: Omit<PriceAlert, "id" | "createdAt" | "isTriggered">) => {
    const id = `alt-${Date.now()}`;
    const newAlert: PriceAlert = {
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      isTriggered: false,
      ...alertData,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    );
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const togglePrivateMode = () => {
    setIsPrivateMode((prev) => !prev);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleLiveTick = () => {
    setIsLiveTickActive((prev) => !prev);
  };

  const resetToDemoData = () => {
    setAssets(INITIAL_ASSETS);
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setWatchlist(INITIAL_WATCHLIST);
    setAlerts(INITIAL_ALERTS);
    setMarketIndices(INITIAL_MARKET_INDICES);
    setEconomicEvents(INITIAL_ECONOMIC_EVENTS);
    setPortfolioGroups(INITIAL_PORTFOLIO_GROUPS);
    setAiAnalysis(INITIAL_AI_ANALYSIS);
    setSelectedAccountId("ALL");
  };

  const exportToJSON = () => {
    const backup = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      assets,
      accounts,
      transactions,
      watchlist,
      alerts,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importFromJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.assets)) setAssets(data.assets);
      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.watchlist)) setWatchlist(data.watchlist);
      if (Array.isArray(data.alerts)) setAlerts(data.alerts);
      return true;
    } catch (e) {
      console.error("Failed to parse JSON backup:", e);
      return false;
    }
  };

  const importFromCSV = (rows: any[]) => {
    const newAssets: AssetItem[] = [];
    rows.forEach((r, idx) => {
      if (!r.name && !r.code) return;
      const currency: Currency = r.currency?.toUpperCase() === "USD" ? "USD" : "KRW";
      const rate = FX_RATES[currency] || 1;
      const quantity = Number(r.quantity) || 1;
      const avgBuyPrice = Number(r.avgBuyPrice) || Number(r.price) || 1000;
      const currentPrice = Number(r.currentPrice) || avgBuyPrice;

      const valOrig = currentPrice * quantity;
      const valKRW = currency === "KRW" ? valOrig : valOrig * rate;
      const invOrig = avgBuyPrice * quantity;
      const invKRW = currency === "KRW" ? invOrig : invOrig * rate;
      const pnlKRW = valKRW - invKRW;
      const pnlPercent = invKRW > 0 ? (pnlKRW / invKRW) * 100 : 0;

      newAssets.push({
        id: `csv-${Date.now()}-${idx}`,
        category: (r.category as AssetCategory) || "KR_STOCK",
        name: r.name || r.code || `CSV 자산 ${idx + 1}`,
        code: r.code || `CSV-${idx + 1}`,
        currency,
        accountId: accounts[0]?.id || "acc-toss-brokerage",
        accountName: accounts[0]?.name || "기본계좌",
        quantity,
        avgBuyPrice,
        currentPrice,
        previousClosePrice: currentPrice,
        change24h: 0,
        change24hPercent: 0,
        valuationKRW: Math.round(valKRW),
        valuationUSD: Number((valKRW / FX_RATES.USD).toFixed(2)),
        investedKRW: Math.round(invKRW),
        investedUSD: Number((invKRW / FX_RATES.USD).toFixed(2)),
        pnlKRW: Math.round(pnlKRW),
        pnlPercent: Number(pnlPercent.toFixed(2)),
        customTags: ["CSV가져오기"],
      });
    });

    if (newAssets.length > 0) {
      setAssets((prev) => [...newAssets, ...prev]);
    }
  };

  return (
    <AssetContext.Provider
      value={{
        assets,
        filteredAssets,
        accounts,
        transactions,
        watchlist,
        alerts,
        marketIndices,
        economicEvents,
        portfolioGroups,
        aiAnalysis,

        selectedAccountId,
        setSelectedAccountId,
        displayCurrency,
        setDisplayCurrency,
        isPrivateMode,
        togglePrivateMode,
        theme,
        toggleTheme,
        isLiveTickActive,
        toggleLiveTick,

        totalAssetsKRW,
        totalDebtKRW,
        netWorthKRW,
        totalInvestedKRW,
        totalPnLKRW,
        totalReturnPercent,
        todayPnLKRW,
        todayPnLPercent,
        annualDividendsKRW,
        monthlyAverageDividendKRW,
        dividendYieldOnTotal,
        dividendYieldOnCost,
        categoryAllocations,

        addAsset,
        updateAsset,
        deleteAsset,
        addTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        toggleWatchlist,
        isWatchlisted,
        addAlert,
        toggleAlert,
        deleteAlert,
        simulateTick,
        resetToDemoData,
        exportToJSON,
        importFromJSON,
        importFromCSV,
      }}
    >
      {children}
    </AssetContext.Provider>
  );
}

export function useAsset() {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error("useAsset must be used within an AssetProvider");
  }
  return context;
}
