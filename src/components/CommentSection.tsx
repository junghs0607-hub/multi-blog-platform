"use client";

import { useState, useEffect } from "react";

interface Comment {
  id: number;
  content: string;
  parentId: number | null;
  isDeleted: boolean;
  createdAt: string;
  authorId: number;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
}

interface Props {
  articleId: number;
  currentUser: { id: number; username: string; displayName: string | null; avatarUrl: string | null } | null;
  isDark: boolean;
}

export function CommentSection({ articleId, currentUser, isDark }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comments?articleId=${articleId}`)
      .then(r => r.json())
      .then(d => { setComments(d.comments || []); setLoading(false); });
  }, [articleId]);

  const submitComment = async (content: string, parentId: number | null) => {
    if (!content.trim()) return;
    if (!currentUser) { window.location.href = "/auth/login"; return; }

    const r = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, content, parentId }),
    });
    const d = await r.json();
    if (d.comment) {
      const newC: Comment = {
        ...d.comment,
        authorName: currentUser.displayName || currentUser.username,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatarUrl,
      };
      setComments([...comments, newC]);
      setNewComment("");
      setReplyTo(null);
      setReplyContent("");
    }
  };

  const deleteComment = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const r = await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      setComments(comments.map(c => c.id === id ? { ...c, isDeleted: true, content: "삭제된 댓글입니다." } : c));
    }
  };

  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (parentId: number) => comments.filter(c => c.parentId === parentId);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return new Date(date).toLocaleDateString("ko-KR");
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? "ml-8 md:ml-12" : ""} animate-fade-in`}>
      <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : isReply ? "bg-gray-50" : "bg-white"} ${isReply ? "" : `border ${isDark ? "border-gray-700" : "border-gray-100"}`}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700 overflow-hidden">
            {comment.authorAvatar ? <img src={comment.authorAvatar} className="w-7 h-7 rounded-full object-cover" /> : (comment.authorName?.[0] || "?").toUpperCase()}
          </div>
          <span className="font-medium text-sm">{comment.authorName || "알 수 없음"}</span>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          {comment.isDeleted && <span className="text-xs text-red-400">(삭제됨)</span>}
        </div>
        <p className={`text-sm leading-relaxed ${comment.isDeleted ? "text-gray-400 italic" : ""}`}>{comment.content}</p>
        {!comment.isDeleted && (
          <div className="flex items-center gap-3 mt-2">
            {currentUser && !isReply && (
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs text-gray-400 hover:text-green-600">
                💬 답글
              </button>
            )}
            {currentUser && currentUser.id === comment.authorId && (
              <button onClick={() => deleteComment(comment.id)} className="text-xs text-gray-400 hover:text-red-500">삭제</button>
            )}
          </div>
        )}
      </div>

      {/* Reply form */}
      {replyTo === comment.id && (
        <div className="ml-8 md:ml-12 mt-2 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text" value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(replyContent, comment.id); }}
              placeholder="답글을 입력하세요..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              autoFocus
            />
            <button onClick={() => submitComment(replyContent, comment.id)}
              className="px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">
              답글
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {getReplies(comment.id).map(reply => (
        <CommentItem key={reply.id} comment={reply} isReply />
      ))}
    </div>
  );

  return (
    <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} rounded-2xl p-6 border shadow-sm`}>
      <h3 className="font-bold text-lg mb-4">💬 댓글 {comments.length > 0 && `(${comments.length})`}</h3>

      {/* Write comment */}
      {currentUser ? (
        <div className="flex gap-2 mb-6">
          <input
            type="text" value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitComment(newComment, null); }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm"
          />
          <button onClick={() => submitComment(newComment, null)}
            className="px-5 py-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">
            작성
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center">
          <a href="/auth/login" className="text-green-600 font-medium hover:underline">로그인</a>하고 댓글을 남겨보세요.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 skeleton"></div>
          <div className="h-16 skeleton"></div>
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-center text-gray-400 py-8">첫 번째 댓글을 남겨보세요!</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map(comment => <CommentItem key={comment.id} comment={comment} />)}
        </div>
      )}
    </div>
  );
}
