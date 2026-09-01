"use client";

import { useEffect, useState, useRef } from "react";

const themes = [
  { id: "basic", name: "Basic", desc: "깔끔한 기본 스킨", color: "#2563eb", preview: "🏠" },
  { id: "minimal", name: "Minimal", desc: "미니멀 & 심플", color: "#6b7280", preview: "✨" },
  { id: "magazine", name: "Magazine", desc: "매거진 레이아웃", color: "#dc2626", preview: "📰" },
  { id: "portfolio", name: "Portfolio", desc: "포트폴리오 스타일", color: "#7c3aed", preview: "💼" },
  { id: "photo", name: "Photo", desc: "사진 중심 갤러리", color: "#0891b2", preview: "📷" },
  { id: "dark", name: "Dark", desc: "다크 테마", color: "#1e293b", preview: "🌙" },
];

export default function SettingsPage() {
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    fetch("/api/blog/settings").then(r => r.json()).then(d => {
      setBlog(d.blog || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/blog/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });
      const d = await r.json();
      if (d.success) alert("저장되었습니다!");
      else alert(d.error || "저장 실패");
    } catch { alert("저장 실패"); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file: File, type: 'profile' | 'cover') => {
    if (type === 'profile') setUploadingProfile(true);
    else setUploadingCover(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        if (type === 'profile') {
          setBlog({ ...blog, profileImage: data.url });
        } else {
          setBlog({ ...blog, coverImage: data.url });
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('업로드 실패');
    } finally {
      if (type === 'profile') setUploadingProfile(false);
      else setUploadingCover(false);
    }
  };

  const handleFileSelect = (type: 'profile' | 'cover') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) uploadImage(file, type);
    };
    input.click();
  };

  if (loading) return <div className="h-96 skeleton rounded-2xl"></div>;

  const ts = (blog?.themeSettings || {}) as any;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">🎨 블로그 설정</h1>

      {/* Cover Image */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div 
          className="relative h-48 md:h-64 cursor-pointer group"
          style={{
            background: blog?.coverImage 
              ? `url(${blog.coverImage}) center/cover` 
              : `linear-gradient(135deg, ${ts.primaryColor || '#03c75a'}, ${ts.primaryColor || '#03c75a'}dd)`
          }}
          onClick={() => handleFileSelect('cover')}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all text-white text-center">
              <span className="text-4xl">📷</span>
              <p className="text-sm mt-2">클릭하여 커버 이미지 변경</p>
            </div>
          </div>
          {uploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white animate-pulse">업로드 중...</span>
            </div>
          )}
          {blog?.coverImage && (
            <button 
              onClick={(e) => { e.stopPropagation(); setBlog({ ...blog, coverImage: '' }); }}
              className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500"
            >
              ×
            </button>
          )}
        </div>

        {/* Profile & Basic Info */}
        <div className="p-6 -mt-16 relative">
          {/* Profile Image */}
          <div 
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg cursor-pointer overflow-hidden bg-gray-100 relative group"
            onClick={() => handleFileSelect('profile')}
          >
            {blog?.profileImage ? (
              <img src={blog.profileImage} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                {blog?.name?.[0] || '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-2xl">📷</span>
            </div>
            {uploadingProfile && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs animate-pulse">...</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">블로그 이름</label>
              <input 
                type="text" 
                value={blog?.name || ""}
                onChange={(e) => setBlog({ ...blog, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">블로그 소개</label>
              <textarea 
                value={blog?.description || ""}
                onChange={(e) => setBlog({ ...blog, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none h-24 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="블로그를 소개해주세요"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-lg">🎭 스킨 선택</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {themes.map(t => (
            <button key={t.id} onClick={() => setBlog({ ...blog, theme: t.id })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${blog?.theme === t.id ? "border-green-500 bg-green-50" : "border-gray-100 hover:border-gray-300"}`}>
              <div className="text-3xl mb-2">{t.preview}</div>
              <div className="font-medium text-sm">{t.name}</div>
              <div className="text-xs text-gray-400">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-lg">🎨 디자인 설정</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메인 색상</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={ts.primaryColor || "#03c75a"}
                onChange={(e) => setBlog({ ...blog, themeSettings: { ...ts, primaryColor: e.target.value } })}
                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" 
              />
              <div>
                <span className="text-sm font-mono text-gray-500">{ts.primaryColor || "#03c75a"}</span>
                <div className="flex gap-1 mt-1">
                  {['#03c75a', '#2563eb', '#7c3aed', '#dc2626', '#f59e0b', '#0891b2'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBlog({ ...blog, themeSettings: { ...ts, primaryColor: color } })}
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">레이아웃</label>
            <div className="flex gap-2">
              <button
                onClick={() => setBlog({ ...blog, themeSettings: { ...ts, layout: 'list' } })}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${ts.layout !== 'grid' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
              >
                <span className="text-xl">≡</span>
                <p className="text-xs mt-1">리스트</p>
              </button>
              <button
                onClick={() => setBlog({ ...blog, themeSettings: { ...ts, layout: 'grid' } })}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${ts.layout === 'grid' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
              >
                <span className="text-xl">⊞</span>
                <p className="text-xs mt-1">그리드</p>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">폰트</label>
          <select 
            value={ts.fontFamily || "default"}
            onChange={(e) => setBlog({ ...blog, themeSettings: { ...ts, fontFamily: e.target.value } })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          >
            <option value="default">기본 (시스템 폰트)</option>
            <option value="noto-sans">Noto Sans KR (고딕)</option>
            <option value="noto-serif">Noto Serif KR (명조)</option>
            <option value="nanum-gothic">나눔고딕</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <span className="font-medium">🌙 다크 모드</span>
            <p className="text-xs text-gray-500">블로그를 어두운 테마로 표시합니다</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={ts.darkMode || false}
              onChange={(e) => setBlog({ ...blog, themeSettings: { ...ts, darkMode: e.target.checked } })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg mb-4">👁 미리보기</h3>
        <div className={`rounded-xl overflow-hidden border ${ts.darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div 
            className="h-20"
            style={{
              background: blog?.coverImage 
                ? `url(${blog.coverImage}) center/cover` 
                : `linear-gradient(135deg, ${ts.primaryColor || '#03c75a'}, ${ts.primaryColor || '#03c75a'}dd)`
            }}
          />
          <div className="p-4 -mt-8">
            <div 
              className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden"
              style={{ backgroundColor: ts.primaryColor || '#03c75a' }}
            >
              {blog?.profileImage ? (
                <img src={blog.profileImage} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {blog?.name?.[0] || '?'}
                </div>
              )}
            </div>
            <h4 className={`font-bold mt-2 ${ts.darkMode ? 'text-white' : ''}`} style={{ color: ts.darkMode ? 'white' : undefined }}>
              {blog?.name || '블로그 이름'}
            </h4>
            <p className={`text-xs ${ts.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {blog?.description || '블로그 소개'}
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 disabled:opacity-50 shadow-lg shadow-green-500/20 transition-all"
      >
        {saving ? "저장 중..." : "💾 설정 저장"}
      </button>
    </div>
  );
}
