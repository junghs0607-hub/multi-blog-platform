import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AssetProvider } from "@/context/AssetContext";

export const metadata: Metadata = {
  title: "DOMINO X - 통합 자산관리 & 배당 플랫폼",
  description:
    "국내주식, 해외주식, ETF, 커버드콜, 가상자산, 부동산, 채권, 외화, 금/원자재를 하나의 화면에서 통합 관리하는 프리미엄 자산관리 서비스",
  keywords: [
    "도미노",
    "자산관리",
    "배당주",
    "커버드콜",
    "미국주식",
    "국내주식",
    "가상자산",
    "부동산",
    "포트폴리오",
    "김치프리미엄",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>"
        />
      </head>
      <body className="bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased min-h-screen">
        <AssetProvider>{children}</AssetProvider>
      </body>
    </html>
  );
}
