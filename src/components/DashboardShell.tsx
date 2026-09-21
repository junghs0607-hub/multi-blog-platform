"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  user: { id: number; username: string; displayName: string | null; avatarUrl: string | null; role: string };
  children: React.ReactNode;
}

const menuItems = [
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/dashboard/articles", label: "게시글 관리", icon: "📝" },
  { href: "/dashboard/write", label: "새 글쓰기", icon: "✏️" },
  { href: "/dashboard/comments", label: "댓글 관리", icon: "💬" },
  { href: "/dashboard/visitors", label: "방문자 로그", icon: "🕵️" },
  { href: "/dashboard/categories", label: "카테고리/태그", icon: "📁" },
  { href: "/dashboard/media", label: "미디어", icon: "🖼️" },
  { href: "/dashboard/ai", label: "AI 글쓰기", icon: "🤖" },
  { href: "/dashboard/ai-settings", label: "AI 설정", icon: "⚙️" },
  { href: "/dashboard/settings", label: "블로그 설정", icon: "🎨" },
  { href: "/dashboard/profile", label: "프로필 설정", icon: "👤" },
];

export function DashboardShell({ user, children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-green-600">
              <span>📝</span> BlogHub
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-50 text-green-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <>
                <hr className="my-3" />
                <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <span>🛡️</span><span>관리자 페이지</span>
                </Link>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 overflow-hidden">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" /> : (user.displayName?.[0] || user.username[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <Link href={`/blog/${user.username}`} className="text-xs text-green-600 hover:underline">내 블로그 보기 →</Link>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full text-left text-sm text-gray-400 hover:text-red-500 transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:px-6 sticky top-0 z-20">
          <button className="lg:hidden p-2 mr-2 -ml-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <Link href="/dashboard/write" className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-green-600 transition-all">
            ✏️ 새 글
          </Link>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
