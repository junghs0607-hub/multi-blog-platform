"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface NavBarProps {
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  } | null;
}

export function NavBar({ user }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-green-600 hover:text-green-700">
            <span className="text-2xl">📝</span>
            <span>BlogHub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-green-600 font-medium transition-colors">대시보드</Link>
                <Link href="/dashboard/write" className="bg-green-500 text-white px-5 py-2 rounded-full font-medium hover:bg-green-600 transition-all text-sm">
                  ✏️ 글쓰기
                </Link>
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 text-gray-600 hover:text-green-600">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700 overflow-hidden">
                      {user.avatarUrl ? <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" /> : (user.displayName?.[0] || user.username[0]).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{user.displayName || user.username}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in z-50">
                      <Link href={`/blog/${user.username}`} className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">🏠 내 블로그</Link>
                      <Link href="/dashboard" className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">📊 대시보드</Link>
                      <Link href="/dashboard/settings" className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">⚙️ 블로그 설정</Link>
                      <Link href="/dashboard/profile" className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">👤 프로필 설정</Link>
                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <Link href="/admin" className="block px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">🛡️ 관리자</Link>
                      )}
                      <hr className="my-2" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-red-500">로그아웃</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-600 hover:text-green-600 font-medium">로그인</Link>
                <Link href="/auth/register" className="bg-green-500 text-white px-5 py-2 rounded-full font-medium hover:bg-green-600 transition-all text-sm">
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 animate-fade-in">
            {user ? (
              <div className="space-y-2">
                <Link href="/dashboard" className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">📊 대시보드</Link>
                <Link href="/dashboard/write" className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">✏️ 글쓰기</Link>
                <Link href={`/blog/${user.username}`} className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">🏠 내 블로그</Link>
                <Link href="/dashboard/settings" className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">⚙️ 설정</Link>
                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Link href="/admin" className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">🛡️ 관리자</Link>
                )}
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-red-50 text-red-500 font-medium">로그아웃</button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/login" className="block px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium">로그인</Link>
                <Link href="/auth/register" className="block px-4 py-2.5 rounded-lg bg-green-50 text-green-600 font-medium">회원가입</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
