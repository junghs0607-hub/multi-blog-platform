"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Props {
  blog: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    profileImage: string | null;
    coverImage: string | null;
    theme: string | null;
    themeSettings: any;
    ownerName: string | null;
    ownerUsername: string | null;
    ownerAvatar: string | null;
    ownerBio: string | null;
  };
  subscriberCount: number;
  currentUser: any;
}

export function BlogHeader({ blog, subscriberCount, currentUser }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(subscriberCount);
  const ts = (blog.themeSettings || {}) as any;
  const isDark = blog.theme === "dark" || ts.darkMode;
  const primaryColor = ts.primaryColor || "#03c75a";

  // Check subscription status
  useEffect(() => {
    if (currentUser) {
      fetch(`/api/subscribe?blogId=${blog.id}`)
        .then(r => r.json())
        .then(d => {
          setSubscribed(d.subscribed || false);
        });
    }
  }, [blog.id, currentUser]);

  const handleSubscribe = async () => {
    if (!currentUser) { window.location.href = "/auth/login"; return; }
    const r = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId: blog.id }),
    });
    const d = await r.json();
    setSubscribed(d.subscribed);
    setSubCount(prev => d.subscribed ? prev + 1 : Math.max(0, prev - 1));
  };

  const displayImage = blog.profileImage || blog.ownerAvatar;

  return (
    <>
      {/* Nav */}
      <nav className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b sticky top-0 z-50`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/blog/${blog.slug}`} className="font-bold text-lg flex items-center gap-2" style={{ color: primaryColor }}>
            <span>📝</span>
            {blog.name}
          </Link>
          <div className="flex items-center gap-3">
            {currentUser && currentUser.username === blog.ownerUsername && (
              <Link href="/dashboard" className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} hover:text-green-600`}>관리</Link>
            )}
            <Link href="/" className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} hover:text-green-600`}>BlogHub</Link>
          </div>
        </div>
      </nav>

      {/* Cover */}
      <div
        className="relative h-48 md:h-72 overflow-hidden"
        style={{
          background: blog.coverImage
            ? undefined
            : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
        }}
      >
        {blog.coverImage && (
          <img 
            src={blog.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className={`absolute inset-0 ${blog.coverImage ? 'bg-gradient-to-t from-black/60 via-black/20 to-transparent' : 'bg-black/10'}`} />
      </div>

      {/* Profile */}
      <div className="max-w-5xl mx-auto px-4 -mt-20 md:-mt-24 relative z-10">
        <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} rounded-2xl p-6 shadow-xl border`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Profile Image */}
            <div 
              className="w-24 h-24 md:w-28 md:h-28 rounded-full flex-shrink-0 overflow-hidden border-4 border-white shadow-lg relative -mt-16 sm:-mt-20"
              style={{ backgroundColor: primaryColor + "20" }}
            >
              {displayImage ? (
                <img src={displayImage} alt={blog.ownerName || blog.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold" style={{ color: primaryColor }}>
                  {(blog.ownerName?.[0] || blog.name?.[0] || "B").toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl md:text-2xl font-bold ${isDark ? "text-white" : ""}`}>{blog.name}</h1>
              {blog.description && (
                <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"} line-clamp-2`}>{blog.description}</p>
              )}
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                <span className="flex items-center gap-1">
                  <span>👤</span> {blog.ownerName || blog.ownerUsername}
                </span>
                <span className="flex items-center gap-1">
                  <span>👥</span> 구독자 {subCount.toLocaleString()}명
                </span>
              </div>
            </div>

            {/* Subscribe Button */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              {(!currentUser || currentUser.username !== blog.ownerUsername) && (
                <button 
                  onClick={handleSubscribe}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                    subscribed 
                      ? `${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"} hover:bg-red-50 hover:text-red-500` 
                      : "text-white hover:opacity-90 shadow-lg"
                  }`}
                  style={!subscribed ? { backgroundColor: primaryColor } : {}}
                >
                  {subscribed ? "✓ 구독 중" : "+ 구독하기"}
                </button>
              )}
              {currentUser && currentUser.username === blog.ownerUsername && (
                <Link 
                  href="/dashboard/settings" 
                  className={`block w-full sm:w-auto text-center px-6 py-2.5 rounded-full font-medium text-sm ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"} hover:bg-gray-200`}
                >
                  ⚙️ 블로그 설정
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
