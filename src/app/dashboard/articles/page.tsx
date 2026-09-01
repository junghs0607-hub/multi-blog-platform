"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user);
        loadArticles(d.user.blog?.slug);
      }
    });
  }, []);

  const loadArticles = async (blogSlug?: string) => {
    if (!blogSlug) { setLoading(false); return; }
    const statuses = filter === "all" ? ["published", "draft", "scheduled", "private"] : [filter];
    let all: any[] = [];
    for (const s of statuses) {
      const r = await fetch(`/api/articles?blog=${blogSlug}&status=${s}&limit=100`);
      const d = await r.json();
      all = all.concat(d.articles || []);
    }
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setArticles(all);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.blog?.slug) {
      setLoading(true);
      loadArticles(user.blog.slug);
    }
  }, [filter, user?.blog?.slug]);

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const r = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      setArticles(articles.filter(a => a.id !== id));
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "published": return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">발행됨</span>;
      case "draft": return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">임시저장</span>;
      case "scheduled": return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">예약</span>;
      case "private": return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">비공개</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">게시글 관리</h1>
        <Link href="/dashboard/write" className="bg-green-500 text-white px-5 py-2 rounded-xl font-medium hover:bg-green-600 text-sm">
          ✏️ 새 글 작성
        </Link>
      </div>

      <div className="flex gap-2">
        {["all", "published", "draft", "scheduled", "private"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f ? "bg-green-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"}`}>
            {f === "all" ? "전체" : f === "published" ? "발행됨" : f === "draft" ? "임시저장" : f === "scheduled" ? "예약" : "비공개"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton"></div>)}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <p className="text-gray-400 text-lg">게시글이 없습니다</p>
          <Link href="/dashboard/write" className="mt-4 inline-block text-green-600 font-medium hover:underline">
            첫 번째 글을 작성하세요 →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {articles.map((art) => (
              <div key={art.id} className="p-4 md:p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                {art.thumbnailUrl && (
                  <img src={art.thumbnailUrl} className="w-20 h-14 rounded-lg object-cover hidden sm:block flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusLabel(art.status)}
                    {art.categoryName && <span className="text-xs text-gray-400">{art.categoryName}</span>}
                  </div>
                  <h3 className="font-medium truncate">{art.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{new Date(art.createdAt).toLocaleDateString("ko-KR")}</span>
                    <span>👁 {art.viewCount || 0}</span>
                    <span>❤️ {art.likeCount || 0}</span>
                    <span>💬 {art.commentCount || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/dashboard/write?edit=${art.id}`} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                    수정
                  </Link>
                  <button onClick={() => handleDelete(art.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
