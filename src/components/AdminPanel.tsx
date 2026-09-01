"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublishAccountManager } from "./PublishAccountManager";

interface Props {
  user: { id: number; username: string; displayName: string | null; role: string };
  counts: { users: number; blogs: number; articles: number; comments: number };
}

export function AdminPanel({ user, counts }: Props) {
  const [tab, setTab] = useState("dashboard");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const r = await fetch("/api/admin/users");
    const d = await r.json();
    setUsersList(d.users || []);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]);

  const updateUserRole = async (userId: number, role: string) => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    loadUsers();
  };

  const toggleUserActive = async (userId: number, isActive: boolean) => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive }),
    });
    loadUsers();
  };

  const tabs = [
    { id: "dashboard", label: "📊 대시보드" },
    { id: "users", label: "👥 회원 관리" },
    { id: "publish", label: "🌐 외부 블로그 계정" },
    { id: "settings", label: "⚙️ 사이트 설정" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg">📝 BlogHub</Link>
            <span className="text-gray-400 text-sm">관리자</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">{user.displayName || user.username}</span>
            <span className="text-xs px-2 py-0.5 bg-red-500 rounded-full">{user.role}</span>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">대시보드</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">관리자 대시보드</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "총 회원", value: counts.users, icon: "👥", color: "bg-blue-50 text-blue-600" },
                { label: "총 블로그", value: counts.blogs, icon: "🏠", color: "bg-green-50 text-green-600" },
                { label: "총 게시글", value: counts.articles, icon: "📝", color: "bg-purple-50 text-purple-600" },
                { label: "총 댓글", value: counts.comments, icon: "💬", color: "bg-orange-50 text-orange-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl ${s.color} mb-3`}>{s.icon}</span>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">회원 관리</h2>
            {loadingUsers ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 skeleton"></div>)}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-medium">ID</th>
                        <th className="text-left px-4 py-3 font-medium">사용자명</th>
                        <th className="text-left px-4 py-3 font-medium">이메일</th>
                        <th className="text-left px-4 py-3 font-medium">역할</th>
                        <th className="text-left px-4 py-3 font-medium">상태</th>
                        <th className="text-left px-4 py-3 font-medium">가입일</th>
                        <th className="text-left px-4 py-3 font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersList.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{u.id}</td>
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3 text-gray-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}
                              className="px-2 py-1 border rounded text-xs">
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {u.isActive ? "활성" : "비활성"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleUserActive(u.id, !u.isActive)}
                              className={`text-xs px-2 py-1 rounded ${u.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                              {u.isActive ? "비활성화" : "활성화"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* External publishing accounts */}
        {tab === "publish" && <PublishAccountManager />}

        {/* Settings */}
        {tab === "settings" && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-2xl font-bold">사이트 설정</h2>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <p className="text-sm text-gray-500">사이트 전반적인 설정을 관리합니다.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사이트 이름</label>
                <input type="text" defaultValue="BlogHub" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사이트 설명</label>
                <textarea defaultValue="프리미엄 멀티 블로그 플랫폼" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none h-20" />
              </div>
              <button className="px-5 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 text-sm">
                💾 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
