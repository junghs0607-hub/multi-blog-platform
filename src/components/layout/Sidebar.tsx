"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Coins,
  Building2,
  Scroll,
  Coins as CashIcon,
  DollarSign,
  Gem,
  CalendarDays,
  FileSpreadsheet,
  Layers,
  Star,
  Bell,
  Scale,
  Activity,
  Receipt,
  Sparkles,
  ShieldCheck,
  Globe2,
  Landmark,
  Database,
  ArrowRightLeft,
  Flame,
} from "lucide-react";

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    isHot?: boolean;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
      { href: "/portfolio", label: "포트폴리오 분석", icon: PieChart },
      { href: "/dividends", label: "배당 & 분배금 허브", icon: DollarSign, badge: "인기", isHot: true },
      { href: "/transactions", label: "통합 거래내역", icon: ArrowRightLeft },
    ],
  },
  {
    title: "자산군별 상세 관리",
    items: [
      { href: "/assets/kr-stock", label: "국내주식", icon: TrendingUp },
      { href: "/assets/us-stock", label: "해외주식 (미국)", icon: Globe2 },
      { href: "/assets/etf", label: "ETF / 커버드콜", icon: Layers, badge: "고배당" },
      { href: "/assets/crypto", label: "가상자산 / 김프", icon: Coins, badge: "24h" },
      { href: "/assets/real-estate", label: "부동산 / 월세", icon: Building2 },
      { href: "/assets/funds-bonds", label: "펀드 / 채권", icon: Scroll },
      { href: "/assets/cash-fx", label: "현금 / 외화 (FX)", icon: CashIcon },
      { href: "/assets/gold-commodities", label: "금 / 원자재", icon: Gem },
    ],
  },
  {
    title: "투자 도구 & 분석",
    items: [
      { href: "/analytics", label: "수익률 & 성과 분석", icon: Activity },
      { href: "/cashflow", label: "현금흐름 & FIRE", icon: Flame },
      { href: "/compare", label: "종목 비교 분석실", icon: Scale },
      { href: "/taxes", label: "세금 & 절세 계산기", icon: Receipt },
      { href: "/watchlist", label: "관심종목 & 시세", icon: Star },
      { href: "/alerts", label: "가격 / 조건 알림", icon: Bell },
      { href: "/calendar", label: "투자 & 경제 캘린더", icon: CalendarDays },
      { href: "/market", label: "글로벌 시장 지수", icon: Globe2 },
      { href: "/accounts", label: "다중 투자계좌 관리", icon: Landmark },
    ],
  },
  {
    title: "스마트 서비스 & 시스템",
    items: [
      { href: "/ai-advisor", label: "AI 자산진단 & 리포트", icon: Sparkles, badge: "AI", isHot: true },
      { href: "/data-io", label: "데이터 가져오기 / CSV", icon: FileSpreadsheet },
      { href: "/admin", label: "관리자 포털", icon: ShieldCheck },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto px-3 py-4 select-none">
      <div className="space-y-6">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                {section.title}
              </div>
            )}
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold"
                        : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400 dark:text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.isHot
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
          DOMINO X Asset Platform v2.5
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          실시간 자산 & 현금흐름 올인원
        </div>
      </div>
    </aside>
  );
}
