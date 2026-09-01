"use client";

import { useEffect, useState } from "react";

export default function CommentsPage() {
  const [allComments, setAllComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll load comments from user's articles
    fetch("/api/auth/me").then(r => r.json()).then(async (d) => {
      if (!d.user?.blog) { setLoading(false); return; }
      const artRes = await fetch(`/api/articles?blog=${d.user.blog.slug}&status=published&limit=50`);
      const artData = await artRes.json();
      const arts = artData.articles || [];

      const cmts: any[] = [];
      for (const art of arts.slice(0, 20)) {
        const cr = await fetch(`/api/comments?articleId=${art.id}`);
        const cd = await cr.json();
        for (const c of (cd.comments || [])) {
          cmts.push({ ...c, articleTitle: art.title, articleId: art.id });
        }
      }
      cmts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllComments(cmts);
      setLoading(false);
    });
  }, []);

  const deleteComment = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const r = await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      setAllComments(allComments.map(c => c.id === id ? { ...c, isDeleted: true, content: "삭제된 댓글입니다." } : c));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">댓글 관리</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 skeleton"></div>)}</div>
      ) : allComments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
          댓글이 없습니다
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          {allComments.map((c) => (
            <div key={c.id} className="p-4 md:p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.authorName || "알 수 없음"}</span>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                    {c.isDeleted && <span className="text-xs text-red-400">삭제됨</span>}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{c.content}</p>
                  <p className="text-xs text-gray-400">📝 {c.articleTitle}</p>
                </div>
                {!c.isDeleted && (
                  <button onClick={() => deleteComment(c.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 flex-shrink-0">
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
