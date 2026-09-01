"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  todayViews: number;
  totalComments: number;
  subscribers: number;
  totalLikes: number;
  dailyViews: { date: string; count: number }[];
  popularArticles: { id: number; title: string; slug: string; viewCount: number; likeCount: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d.stats); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton"></div>)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "전체 게시글", value: stats?.totalArticles || 0, icon: "📝", color: "bg-blue-50 text-blue-600" },
    { label: "오늘 방문자", value: stats?.todayViews || 0, icon: "👁", color: "bg-green-50 text-green-600" },
    { label: "전체 조회수", value: stats?.totalViews || 0, icon: "📊", color: "bg-purple-50 text-purple-600" },
    { label: "구독자", value: stats?.subscribers || 0, icon: "👥", color: "bg-orange-50 text-orange-600" },
    { label: "전체 댓글", value: stats?.totalComments || 0, icon: "💬", color: "bg-pink-50 text-pink-600" },
    { label: "전체 좋아요", value: stats?.totalLikes || 0, icon: "❤️", color: "bg-red-50 text-red-600" },
  ];

  const maxView = Math.max(...(stats?.dailyViews?.map(d => d.count) || [1]), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/dashboard/write" className="bg-green-500 text-white px-5 py-2 rounded-xl font-medium hover:bg-green-600 transition-all text-sm">
          ✏️ 새 글 작성
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl ${s.color}`}>{s.icon}</span>
            </div>
            <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-4">📈 최근 7일 방문자</h3>
          {stats?.dailyViews && stats.dailyViews.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {stats.dailyViews.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.count}</span>
                  <div
                    className="w-full bg-green-400 rounded-t-lg transition-all hover:bg-green-500"
                    style={{ height: `${(d.count / maxView) * 120}px`, minHeight: "4px" }}
                  />
                  <span className="text-xs text-gray-400">{d.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">
              <p>아직 방문 데이터가 없습니다</p>
            </div>
          )}
        </div>

        {/* Popular */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-4">🔥 인기 게시글</h3>
          {stats?.popularArticles && stats.popularArticles.length > 0 ? (
            <div className="space-y-3">
              {stats.popularArticles.map((art, i) => (
                <div key={art.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{art.title}</p>
                    <p className="text-xs text-gray-400">👁 {art.viewCount} · ❤️ {art.likeCount}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">
              <p>아직 게시글이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
