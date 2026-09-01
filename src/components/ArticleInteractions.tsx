"use client";

import { useState, useEffect } from "react";

interface Props {
  articleId: number;
  likeCount: number;
  currentUser: { id: number; username: string } | null;
}

export function ArticleInteractions({ articleId, likeCount: initialLikeCount, currentUser }: Props) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  useEffect(() => {
    if (currentUser) {
      fetch(`/api/likes?articleId=${articleId}`).then(r => r.json()).then(d => setLiked(d.liked));
    }
  }, [articleId, currentUser]);

  const handleLike = async () => {
    if (!currentUser) { window.location.href = "/auth/login"; return; }
    const r = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    const d = await r.json();
    setLiked(d.liked);
    setLikeCount(prev => d.liked ? prev + 1 : prev - 1);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다!");
  };

  return (
    <div className="flex items-center justify-center gap-4 my-6">
      <button onClick={handleLike}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${liked ? "bg-red-50 text-red-500 border-red-200" : "bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-500"} border shadow-sm`}>
        <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
        <span>좋아요 {likeCount}</span>
      </button>
      <button onClick={handleShare}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-600 border border-gray-200 font-medium hover:bg-gray-50 shadow-sm">
        <span>🔗</span> 공유
      </button>
    </div>
  );
}
