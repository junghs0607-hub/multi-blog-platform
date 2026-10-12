import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Providers } from "@/components/providers";
import { getSessionUser } from "@/server/auth/session";
import { env } from "@/server/env";
import "@fontsource-variable/noto-sans-kr";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "Mosaic — 영감을 모으는 이미지 큐레이션", template: "%s | Mosaic" },
  description: "마음에 드는 이미지를 발견하고, 보드에 모으고, 공유하세요. Mosaic 이미지 큐레이션 플랫폼",
  icons: { icon: "/favicon.svg" },
  openGraph: { siteName: "Mosaic", type: "website", locale: "ko_KR" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="ko">
      <body>
        <Providers initialUser={user}>
          <Header />
          <main className="min-h-[calc(100dvh-5rem)] pb-24 md:pb-10">{children}</main>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
