"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  DollarSign,
  ArrowRightLeft,
  Menu,
  X,
  TrendingUp,
  Globe2,
  Layers,
  Coins,
  Building2,
  Scroll,
  Gem,
  Activity,
  Receipt,
  Scale,
  Star,
  Bell,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Landmark,
  Flame,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const mainItems = [
    { href: "/", label: "홈", icon: LayoutDashboard },
    { href: "/portfolio", label: "포트폴리오", icon: PieChart },
    { href: "/dividends", label: "배당", icon: DollarSign },
    { href: "/transactions", label: "거래", icon: ArrowRightLeft },
  ];

  const allCategories = [
    { href: "/assets/kr-stock", label: "국내주식", icon: TrendingUp },
    { href: "/assets/us-stock", label: "해외주식 (미국)", icon: Globe2 },
    { href: "/assets/etf", label: "ETF / 커버드콜", icon: Layers },
    { href: "/assets/crypto", label: "가상자산 / 김프", icon: Coins },
    { href: "/assets/real-estate", label: "부동산 / 월세", icon: Building2 },
    { href: "/assets/funds-bonds", label: "펀드 / 채권", icon: Scroll },
    { href: "/assets/cash-fx", label: "현금 / 외화 (FX)", icon: Coins },
    { href: "/assets/gold-commodities", label: "금 / 원자재", icon: Gem },
  ];

  const allTools = [
    { href: "/analytics", label: "수익률 & 성과 분석", icon: Activity },
    { href: "/cashflow", label: "현금흐름 & FIRE 플래너", icon: Flame },
    { href: "/compare", label: "종목 비교 분석", icon: Scale },
    { href: "/taxes", label: "세금 & 절세 계산기", icon: Receipt },
    { href: "/watchlist", label: "관심종목 & 시세", icon: Star },
    { href: "/alerts", label: "가격 & 조건 알림", icon: Bell },
    { href: "/calendar", label: "투자 & 경제 캘린더", icon: CalendarDays },
    { href: "/market", label: "글로벌 시장 지수", icon: Globe2 },
    { href: "/accounts", label: "다중 투자계좌 관리", icon: Landmark },
    { href: "/ai-advisor", label: "AI 자산진단 & 리포트", icon: Sparkles },
    { href: "/data-io", label: "데이터 가져오기 / CSV", icon: FileSpreadsheet },
    { href: "/admin", label: "관리자 포털", icon: ShieldCheck },
  ];

  return (
    <>
      {/* Bottom Floating Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-2 py-1 flex items-center justify-around safe-area-pb">
        {mainItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">전체메뉴</span>
        </button>
      </nav>

      {/* Full Screen Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-fade-in overflow-y-auto pb-20">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                DX
              </div>
              <span className="font-extrabold text-base text-gray-900 dark:text-white">
                DOMINO X 전체 메뉴
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                자산군별 상세
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200"
                    >
                      <Icon className="w-4 h-4 text-blue-500" />
                      <span>{cat.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                투자 분석 & 도구
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200"
                    >
                      <Icon className="w-4 h-4 text-indigo-500" />
                      <span>{tool.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
