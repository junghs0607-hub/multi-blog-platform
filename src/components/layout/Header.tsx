"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAsset } from "@/context/AssetContext";
import {
  Wallet,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Bell,
  Plus,
  ArrowRightLeft,
  Sparkles,
  Radio,
  ChevronDown,
  Check,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";

interface HeaderProps {
  onOpenAddAsset?: () => void;
  onOpenTradeModal?: () => void;
}

export function Header({ onOpenAddAsset, onOpenTradeModal }: HeaderProps) {
  const {
    accounts,
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
    alerts,
    economicEvents,
    netWorthKRW,
  } = useAsset();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const unreadAlerts = alerts.filter((a) => a.isTriggered);
  const upcomingEvents = economicEvents.slice(0, 3);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-xl tracking-tighter">DX</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-white">
                  DOMINO <span className="text-blue-500">X</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                통합 자산관리 & 배당 플랫폼
              </p>
            </div>
          </Link>

          {/* Account Selector Dropdown */}
          <div className="relative ml-2 sm:ml-4">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-800 dark:text-gray-200 transition-colors border border-gray-200/80 dark:border-gray-700"
            >
              <Wallet className="w-4 h-4 text-blue-500" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {selectedAccountId === "ALL" ? "전체 자산 (통합)" : selectedAccount?.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isAccountOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAccountOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fade-in">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    계좌 선택
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAccountId("ALL");
                      setIsAccountOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                      selectedAccountId === "ALL"
                        ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌐</span>
                      <div>
                        <div>전체 자산 (통합 포트폴리오)</div>
                        <div className="text-[11px] text-gray-400">
                          순자산 {isPrivateMode ? "•••" : formatKRW(netWorthKRW, true)}
                        </div>
                      </div>
                    </div>
                    {selectedAccountId === "ALL" && <Check className="w-4 h-4 text-blue-500" />}
                  </button>

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700/80" />

                  <div className="max-h-60 overflow-y-auto">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsAccountOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                          selectedAccountId === acc.id
                            ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{acc.icon || "🏦"}</span>
                          <div>
                            <div className="font-medium text-xs sm:text-sm">{acc.name}</div>
                            <div className="text-[10px] text-gray-400">
                              {acc.provider} {acc.accountNumber ? `· ${acc.accountNumber}` : ""}
                            </div>
                          </div>
                        </div>
                        {selectedAccountId === acc.id && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Tools & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Live Market Pulse Indicator */}
          <button
            onClick={toggleLiveTick}
            title={isLiveTickActive ? "실시간 시세 변동 반영 중 (클릭 시 일시정지)" : "실시간 시세 일시정지 됨 (클릭 시 재개)"}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${
              isLiveTickActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveTickActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            <span className="font-semibold">{isLiveTickActive ? "LIVE 시세" : "일시정지"}</span>
          </button>

          {/* Currency Switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/80 dark:border-gray-700 text-xs font-bold">
            <button
              onClick={() => setDisplayCurrency("KRW")}
              className={`px-2 py-1 rounded-md transition-colors ${
                displayCurrency === "KRW"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              ₩
            </button>
            <button
              onClick={() => setDisplayCurrency("USD")}
              className={`px-2 py-1 rounded-md transition-colors ${
                displayCurrency === "USD"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              $
            </button>
          </div>

          {/* Privacy Toggle (Hide Amounts) */}
          <button
            onClick={togglePrivateMode}
            title={isPrivateMode ? "금액 표시하기" : "금액 숨기기"}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isPrivateMode ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title="다크/라이트 모드 전환"
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-500" />
                      투자 알림 & 주요 일정
                    </div>
                    <Link
                      href="/alerts"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      전체보기
                    </Link>
                  </div>

                  {/* Triggered Alerts */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      발생한 알림 ({unreadAlerts.length})
                    </div>
                    {unreadAlerts.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">새로운 알림이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {unreadAlerts.map((a) => (
                          <div
                            key={a.id}
                            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs"
                          >
                            <div className="font-bold text-rose-700 dark:text-rose-400">
                              {a.assetName} ({a.code})
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 mt-0.5">{a.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Calendar Events */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      다가오는 경제/배당 일정
                    </div>
                    <div className="space-y-1.5">
                      {upcomingEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-start justify-between text-xs p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{ev.title}</div>
                            <div className="text-[11px] text-gray-400">{ev.date} {ev.time || ""}</div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                            {ev.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Action Buttons */}
          {onOpenTradeModal && (
            <button
              onClick={onOpenTradeModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all border border-gray-200 dark:border-gray-700"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
              <span>거래 기록</span>
            </button>
          )}

          {onOpenAddAsset && (
            <button
              onClick={onOpenAddAsset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>자산 추가</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
