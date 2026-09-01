import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlogHub - 나만의 블로그 플랫폼",
  description: "프리미엄 멀티 블로그 플랫폼. 회원가입 후 나만의 개인 블로그를 만들어보세요.",
  openGraph: {
    title: "BlogHub - 나만의 블로그 플랫폼",
    description: "프리미엄 멀티 블로그 플랫폼",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
        <div id="toast-root"></div>
      </body>
    </html>
  );
}
